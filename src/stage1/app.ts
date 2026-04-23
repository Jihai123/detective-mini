import { loadCaseConfig } from './caseLoader';
import { loadStageSave, saveStageState } from './saveStore';
import type {
  CharacterConfig,
  ClueConfig,
  ConditionExpr,
  ConditionResult,
  DialogueEffect,
  DialogueOption,
  HotspotConfig,
  HotspotEffect,
  InventoryClue,
  InventoryTestimony,
  ResultState,
  Screen,
  StageRuntimeState,
  StandardEvent,
  SubmissionState,
  TestimonyConfig,
  TimelineSlot,
} from './types';

const SCREEN_SEQUENCE: Screen[] = ['archive', 'intro', 'investigation'];
const ENGINE_EVENT_NAME = 'DETECTIVE_ENGINE_EVENT';
const DEV_MODE = window.location.search.includes('dev=1');

const AMBIENCE_TRACKS: Record<string, string> = {
  review_room: '/assets/cases/case-001/audio/room_loop.mp3',
  hallway_monitor: '/assets/cases/case-001/audio/hallway_loop.mp3',
  pantry_bin: '/assets/cases/case-001/audio/pantry_loop.mp3',
};
const UI_CLICK_AUDIO = '/assets/cases/case-001/audio/ui-click.mp3';
const CLUE_AUDIO = '/assets/cases/case-001/audio/clue-discovered.mp3';
const CONTRADICTION_AUDIO = '/assets/cases/case-001/audio/contradiction-hit.mp3';
const CONFRONT_SUCCESS_AUDIO = '/assets/cases/case-001/audio/confrontation-success.mp3';

export class StageOneApp {
  private readonly root: HTMLElement;

  private readonly events = new EventTarget();

  private boardOpen = false;

  private loading = true;

  private primaryNotice = '';

  private ambienceAudio: HTMLAudioElement | null = null;

  private ambienceSceneId: string | null = null;

  private sfxMuted = false;

  private state: StageRuntimeState;

  constructor(root: HTMLElement, initialCaseId: string) {
    this.root = root;
    const existingSave = loadStageSave();
    const caseConfig = loadCaseConfig(existingSave?.caseId ?? initialCaseId);
    const firstScene = caseConfig.scenes[0];

    this.state = {
      caseId: caseConfig.id,
      caseTitle: caseConfig.title,
      screen: existingSave?.screen ?? 'archive',
      overlay: existingSave?.overlay ?? null,
      updatedAt: existingSave?.timestamp ?? Date.now(),
      currentSceneId: existingSave?.currentSceneId ?? firstScene.id,
      objective: existingSave?.objective ?? caseConfig.initialObjective,
      flags: existingSave?.flags ?? {},
      inventory: existingSave?.inventory ?? [],
      testimonies: existingSave?.testimonies ?? [],
      visitedDialogueNodes: existingSave?.visitedDialogueNodes ?? [],
      inspectCard: null,
      dialogueState: existingSave?.dialogueState ?? null,
      restoreNotice: existingSave ? '已恢复上次进度。' : null,
      contradictionMessage: null,
      confrontation:
        existingSave?.confrontation ?? { roundIndex: 0, mistakesInCurrentRound: 0, roundResults: [], selectedSentenceId: null, lastFeedback: '完成调查后开始关键对质。', status: 'idle' },
      timeline:
        existingSave?.timeline ?? { selectedClueId: null, placements: {}, conflicts: [], completed: false },
      submission:
        existingSave?.submission ?? { suspect: '', keyLie: '', method: '', destination: '' },
      result: existingSave?.result ?? null,
      hintCount: existingSave?.hintCount ?? 0,
      wrongSubmissionCount: existingSave?.wrongSubmissionCount ?? 0,
      lastDiscoveryAt: existingSave?.lastDiscoveryAt ?? Date.now(),
      eventFeed: [],
    };

    this.events.addEventListener(ENGINE_EVENT_NAME, (evt) => {
      const detail = (evt as CustomEvent<StandardEvent>).detail;
      this.state = { ...this.state, eventFeed: [detail, ...this.state.eventFeed].slice(0, 8) };
      this.render();
    });

    this.preloadCriticalAssets().finally(() => {
      this.loading = false;
      this.persistState();
      this.render();
      this.preloadDeferredAssets();
      this.setupIdleHint();
    });
    (window as any).__app = this;
  }


  private playSfx(src: string, volume: number): void {
    if (this.sfxMuted) return;
    const audio = new Audio(src);
    audio.volume = volume;
    void audio.play().catch(() => {
      this.sfxMuted = true;
    });
  }

  private syncAmbienceForScene(sceneId: string): void {
    const track = AMBIENCE_TRACKS[sceneId];
    if (!track || this.ambienceSceneId === sceneId) return;

    const next = new Audio(track);
    next.loop = true;
    next.volume = 0;

    void next.play().then(() => {
      const prev = this.ambienceAudio;
      this.ambienceAudio = next;
      this.ambienceSceneId = sceneId;
      const fadeIn = window.setInterval(() => {
        if (!this.ambienceAudio || this.ambienceAudio !== next) {
          window.clearInterval(fadeIn);
          return;
        }
        next.volume = Math.min(0.22, next.volume + 0.03);
        if (next.volume >= 0.22) window.clearInterval(fadeIn);
      }, 90);
      if (prev) {
        const fadeOut = window.setInterval(() => {
          prev.volume = Math.max(0, prev.volume - 0.04);
          if (prev.volume <= 0.01) {
            window.clearInterval(fadeOut);
            prev.pause();
          }
        }, 70);
      }
    }).catch(() => {
      this.sfxMuted = true;
    });
  }

  private preloadImage(url: string): Promise<void> {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve();
      img.onerror = () => resolve();
      img.src = url;
    });
  }

  private preloadCriticalAssets(): Promise<void[]> {
    const caseConfig = loadCaseConfig(this.state.caseId);
    const scene = caseConfig.scenes.find((s) => s.id === this.state.currentSceneId) ?? caseConfig.scenes[0];
    const chars = scene.characterIds
      .map((id) => this.getCharacterVisual(caseConfig.characters.find((c) => c.id === id))?.avatar)
      .filter((v): v is string => Boolean(v));
    return Promise.all([
      this.preloadImage(this.getSceneBackground(scene.id, scene.background)),
      this.preloadImage('/assets/cases/case-001/scenes/review_room.jpg'),
      this.preloadImage('/assets/cases/case-001/scenes/hallway_monitor.jpg'),
      this.preloadImage('/assets/cases/case-001/scenes/pantry_bin.jpg'),
      this.preloadImage('/assets/cases/case-001/characters/zhoulan-avatar.png'),
      this.preloadImage('/assets/cases/case-001/characters/zhoulan-neutral.png'),
      this.preloadImage('/assets/cases/case-001/characters/chenxu-avatar.png'),
      this.preloadImage('/assets/cases/case-001/characters/chenxu-neutral.png'),
      this.preloadImage('/assets/ui/icons/icon-hotspot-target-marker.png'),
      this.preloadImage('/assets/ui/icons/new-dot.svg'),
      ...chars.map((src) => this.preloadImage(src)),
    ]);
  }

  private preloadDeferredAssets(): void {
    const caseConfig = loadCaseConfig(this.state.caseId);
    const urls = [
      ...caseConfig.scenes.map((s) => this.getSceneBackground(s.id, s.background)),
      ...caseConfig.characters.map((c) => this.getCharacterVisual(c)?.portrait ?? c.portrait),
      ...caseConfig.clues.map((c) => c.image).filter((v): v is string => Boolean(v)),
    ];
    setTimeout(() => {
      urls.forEach((url) => void this.preloadImage(url));
    }, 100);
  }

  private setupIdleHint(): void {
    window.setInterval(() => {
      const delta = Date.now() - this.state.lastDiscoveryAt;
      if (this.state.screen === 'investigation' && delta > 90000) {
        this.primaryNotice = '线索停滞较久：回到 desk / door_terminal 或与周岚复核口径。';
        this.state.hintCount += 1;
        this.state.lastDiscoveryAt = Date.now();
        this.persistState();
        this.render();
      }
    }, 15000);
  }

  private emitEvent(event: StandardEvent): void {
    this.events.dispatchEvent(new CustomEvent(ENGINE_EVENT_NAME, { detail: event }));
  }

  private persistState(): void {
    saveStageState({
      caseId: this.state.caseId,
      screen: this.state.screen,
      timestamp: this.state.updatedAt,
      overlay: this.state.overlay,
      objective: this.state.objective,
      currentSceneId: this.state.currentSceneId,
      flags: this.state.flags,
      inventory: this.state.inventory,
      testimonies: this.state.testimonies,
      visitedDialogueNodes: this.state.visitedDialogueNodes,
      dialogueState: this.state.dialogueState,
      confrontation: this.state.confrontation,
      timeline: this.state.timeline,
      submission: this.state.submission,
      result: this.state.result,
      hintCount: this.state.hintCount,
      wrongSubmissionCount: this.state.wrongSubmissionCount,
      lastDiscoveryAt: this.state.lastDiscoveryAt,
    });
  }

  private setScreen(screen: Screen): void {
    this.state = { ...this.state, screen, overlay: null, inspectCard: null, dialogueState: null, updatedAt: Date.now() };
    this.persistState();
    this.render();
  }

  private hasToken(token: string): boolean {
    if (token.startsWith('flag:')) return this.state.flags[token.slice(5)] === true;
    if (token.startsWith('clue:')) return this.state.inventory.some((clue) => clue.id === token.slice(5));
    if (token.startsWith('testimony:')) return this.state.testimonies.some((item) => item.id === token.slice(10));
    if (token.startsWith('node:')) return this.state.visitedDialogueNodes.includes(token.slice(5));
    return false;
  }

  private evalCondition(condition?: ConditionExpr): ConditionResult {
    if (!condition) return { ok: true, missing: [] };
    if (Array.isArray(condition)) {
      const missing = condition.filter((item) => !this.hasToken(item));
      return { ok: missing.length === 0, missing };
    }
    const list = 'op' in condition ? condition.conditions : condition.or;
    const ok = list.some((token) => this.hasToken(token));
    return { ok, missing: ok ? [] : list };
  }

  private findClue(caseClues: ClueConfig[], clueId: string): ClueConfig | undefined {
    return caseClues.find((clue) => clue.id === clueId);
  }

  private findTestimony(caseTestimonies: TestimonyConfig[], testimonyId: string): TestimonyConfig | undefined {
    return caseTestimonies.find((item) => item.id === testimonyId);
  }

  private applyHotspotEffect(caseClues: ClueConfig[], hotspot: HotspotConfig, effect: HotspotEffect): void {
    if (effect.type === 'setFlag') this.state.flags = { ...this.state.flags, [effect.flag]: effect.value };
    if (effect.type === 'setScene') this.state.currentSceneId = effect.sceneId;
    if (effect.type === 'updateObjective' && this.state.objective !== effect.objective) {
      this.state.objective = effect.objective;
      this.emitEvent({ type: 'OBJECTIVE_UPDATED', timestamp: Date.now(), payload: { objective: effect.objective } });
    }
    if (effect.type === 'openOverlay') {
      this.state.overlay = effect.overlay;
      this.state.inspectCard = { hotspotLabel: hotspot.label, clue: this.state.inventory[0] ?? null };
    }
    if (effect.type === 'addClue') {
      if (this.state.inventory.some((clue) => clue.id === effect.clueId)) return;
      const clue = this.findClue(caseClues, effect.clueId);
      if (!clue) return;
      const discovered: InventoryClue = { ...clue, discoveredAt: Date.now() };
      this.state.inventory = [discovered, ...this.state.inventory];
      this.state.lastDiscoveryAt = Date.now();
      this.emitEvent({ type: 'CLUE_DISCOVERED', timestamp: Date.now(), payload: { clueId: discovered.id } });
    }
  }

  private applyDialogueEffect(testimonies: TestimonyConfig[], effect: DialogueEffect): void {
    if (effect.type === 'setFlag') this.state.flags = { ...this.state.flags, [effect.flag]: effect.value };
    if (effect.type === 'updateObjective' && this.state.objective !== effect.objective) {
      this.state.objective = effect.objective;
      this.emitEvent({ type: 'OBJECTIVE_UPDATED', timestamp: Date.now(), payload: { objective: effect.objective } });
    }
    if (effect.type === 'addTestimony') {
      if (this.state.testimonies.some((item) => item.id === effect.testimonyId)) return;
      const testimony = this.findTestimony(testimonies, effect.testimonyId);
      if (!testimony) return;
      const record: InventoryTestimony = { ...testimony, discoveredAt: Date.now() };
      this.state.testimonies = [record, ...this.state.testimonies];
      this.state.lastDiscoveryAt = Date.now();
      this.emitEvent({ type: 'TESTIMONY_ADDED', timestamp: Date.now(), payload: { testimonyId: record.id } });
    }
  }

  private evaluateFirstContradiction(): void {
    if (this.state.flags['first-contradiction-found']) return;
    if (!this.state.inventory.some((c) => c.id === 'clue-envelope-opened')) return;
    if (!this.state.testimonies.some((t) => t.id === 'testimony-zhoulan-sealed')) return;
    this.state.flags = { ...this.state.flags, 'first-contradiction-found': true };
    this.state.objective = '第一处矛盾成立，继续补齐第二轮线索后发起关键对质。';
    this.state.contradictionMessage = '周岚“封存后未触碰”与封套二次开启痕迹冲突。';
    this.emitEvent({ type: 'CONTRADICTION_FOUND', timestamp: Date.now(), payload: { id: 'c1' } });
  }

  private investigateHotspot(hotspotId: string): boolean {
    const caseConfig = loadCaseConfig(this.state.caseId);
    const scene = caseConfig.scenes.find((item) => item.id === this.state.currentSceneId);
    const hotspot = scene?.hotspots.find((item) => item.id === hotspotId);
    if (!scene || !hotspot) return false;
    if (!this.evalCondition(hotspot.unlockCondition).ok) return false;
    const before = this.state.inventory.length;
    hotspot.onInteract.forEach((effect) => this.applyHotspotEffect(caseConfig.clues, hotspot, effect));
    this.evaluateFirstContradiction();
    this.emitEvent({ type: 'HOTSPOT_INVESTIGATED', timestamp: Date.now(), payload: { hotspotId } });
    this.state.updatedAt = Date.now();
    this.persistState();
    this.render();
    return this.state.inventory.length > before;
  }

  private openDialogue(characterId: string): void {
    const caseConfig = loadCaseConfig(this.state.caseId);
    const character = caseConfig.characters.find((item) => item.id === characterId);
    const entry = caseConfig.dialogueNodes.find((item) => item.id === character?.dialogueEntryNodeId);
    if (!character || !entry) return;
    this.state.overlay = 'dialogue';
    this.state.dialogueState = { characterId, nodeId: entry.id, lineIndex: 0 };
    this.applyDialogueNode(entry.id);
  }

  private applyDialogueNode(nodeId: string): void {
    const caseConfig = loadCaseConfig(this.state.caseId);
    const node = caseConfig.dialogueNodes.find((item) => item.id === nodeId);
    if (!node) return;
    if (!this.state.visitedDialogueNodes.includes(node.id)) this.state.visitedDialogueNodes.push(node.id);
    (node.effects ?? []).forEach((effect) => this.applyDialogueEffect(caseConfig.testimonies, effect));
    this.evaluateFirstContradiction();
    this.emitEvent({ type: 'DIALOGUE_NODE_REACHED', timestamp: Date.now(), payload: { nodeId } });
    this.persistState();
    this.render();
  }

  private jumpDialogueNode(nodeId: string): void {
    if (!this.state.dialogueState) return;
    const caseConfig = loadCaseConfig(this.state.caseId);
    const node = caseConfig.dialogueNodes.find((item) => item.id === nodeId);
    if (!node) return;
    const check = this.evalCondition(node.unlockCondition ?? node.condition);
    if (!check.ok) return;
    this.state.dialogueState = { ...this.state.dialogueState, nodeId: node.id, lineIndex: 0 };
    this.applyDialogueNode(node.id);
  }

  private advanceDialogueLine(): void {
    if (!this.state.dialogueState) return;
    const caseConfig = loadCaseConfig(this.state.caseId);
    const node = caseConfig.dialogueNodes.find((item) => item.id === this.state.dialogueState?.nodeId);
    if (!node) return;
    this.state.dialogueState = { ...this.state.dialogueState, lineIndex: Math.min(node.lines.length - 1, this.state.dialogueState.lineIndex + 1) };
    this.render();
  }

  private startConfrontation(): void {
    if (!this.state.flags['first-contradiction-found']) return;
    const caseConfig = loadCaseConfig(this.state.caseId);
    this.state.screen = 'confrontation';
    this.state.confrontation = {
      roundIndex: 0,
      mistakesInCurrentRound: 0,
      roundResults: caseConfig.confrontation.rounds.map(() => 'pending' as const),
      selectedSentenceId: null,
      status: 'ongoing',
      lastFeedback: '先点击周岚的某句证词，再出示证据驳斥。',
    };
    this.persistState();
    this.render();
  }

  private selectSentence(sentenceId: string): void {
    const caseConfig = loadCaseConfig(this.state.caseId);
    const round = caseConfig.confrontation.rounds[this.state.confrontation.roundIndex];
    if (!round || this.state.confrontation.status !== 'ongoing') return;
    const sentence = round.sentences.find((s) => s.id === sentenceId);
    if (!sentence) return;
    if (!sentence.contradictable) {
      this.state.confrontation = { ...this.state.confrontation, lastFeedback: '这句话暂时无从反驳，换一句试试。' };
      this.render();
      return;
    }
    this.state.confrontation = { ...this.state.confrontation, selectedSentenceId: sentenceId, lastFeedback: '已锁定这句证词——现在出示能驳斥它的证据。' };
    this.render();
  }

  private presentEvidence(evidenceId: string): void {
    const caseConfig = loadCaseConfig(this.state.caseId);
    const conf = caseConfig.confrontation;
    const round = conf.rounds[this.state.confrontation.roundIndex];
    if (!round || this.state.confrontation.status !== 'ongoing') return;

    const selectedId = this.state.confrontation.selectedSentenceId;
    if (!selectedId) {
      this.state.confrontation = { ...this.state.confrontation, lastFeedback: '请先点击周岚的一句证词，再出示证据驳斥。' };
      this.render();
      return;
    }

    const sentence = round.sentences.find((s) => s.id === selectedId);
    if (!sentence || !sentence.contradictable) {
      this.state.confrontation = { ...this.state.confrontation, selectedSentenceId: null, lastFeedback: '这句话无从反驳，请重新选择证词。' };
      this.render();
      return;
    }

    if (evidenceId === sentence.counterEvidenceId) {
      const newResults = [...this.state.confrontation.roundResults];
      newResults[this.state.confrontation.roundIndex] = 'won';
      const next = this.state.confrontation.roundIndex + 1;
      this.state.confrontation = {
        ...this.state.confrontation,
        roundIndex: next,
        mistakesInCurrentRound: 0,
        roundResults: newResults,
        selectedSentenceId: null,
        lastFeedback: round.onCorrectFeedback,
      };
      if (next >= conf.rounds.length) this.handleConfrontationEnd();
    } else {
      const mistakesInCurrentRound = this.state.confrontation.mistakesInCurrentRound + 1;
      if (mistakesInCurrentRound > conf.maxMistakesPerRound) {
        const newResults = [...this.state.confrontation.roundResults];
        newResults[this.state.confrontation.roundIndex] = 'lost';
        const next = this.state.confrontation.roundIndex + 1;
        this.state.confrontation = {
          ...this.state.confrontation,
          roundIndex: next,
          mistakesInCurrentRound: 0,
          roundResults: newResults,
          selectedSentenceId: null,
          lastFeedback: round.onRoundLost ?? round.onWrongFeedback,
        };
        if (next >= conf.rounds.length) this.handleConfrontationEnd();
      } else {
        this.state.confrontation = {
          ...this.state.confrontation,
          mistakesInCurrentRound,
          selectedSentenceId: null,
          lastFeedback: round.onWrongFeedback,
        };
      }
    }

    this.emitEvent({ type: 'CONFRONTATION_PROGRESS', timestamp: Date.now(), payload: { round: `${this.state.confrontation.roundIndex}` } });
    this.persistState();
    this.render();
  }

  private handleConfrontationEnd(): void {
    const caseConfig = loadCaseConfig(this.state.caseId);
    const conf = caseConfig.confrontation;
    const allLost = this.state.confrontation.roundResults.every((r) => r === 'lost');
    const lastRoundIndex = conf.rounds.length - 1;
    if (allLost) {
      this.state.confrontation = { ...this.state.confrontation, roundIndex: lastRoundIndex, status: 'allLost', lastFeedback: conf.onAllLost ?? '对质全部失败，回去补强证据。' };
      this.state.flags = { ...this.state.flags, 'used-hint-or-fallback': true };
      this.state.hintCount += 1;
      this.primaryNotice = '关键对质全线受挫：先补齐证据再回来。';
      this.state.screen = 'investigation';
      this.state.objective = '对质受挫，回调查区补证据后再战。';
    } else {
      this.state.confrontation = { ...this.state.confrontation, roundIndex: lastRoundIndex, status: 'success', lastFeedback: conf.onSuccess };
      this.state.flags = { ...this.state.flags, 'confrontation-complete': true };
      this.state.objective = '对质完成，进入时间验证并提交结案归纳。';
      this.state.screen = 'deduction';
    }
  }

  private selectTimelineClue(clueId: string): void {
    this.state.timeline.selectedClueId = clueId;
    this.render();
  }

  private placeTimeline(slot: TimelineSlot): void {
    if (!this.state.timeline.selectedClueId) return;
    this.state.timeline.placements = { ...this.state.timeline.placements, [slot.id]: this.state.timeline.selectedClueId };
    const conflicts = Object.entries(this.state.timeline.placements)
      .filter(([slotId, clueId]) => {
        const s = loadCaseConfig(this.state.caseId).timelineSlots.find((item) => item.id === slotId);
        return s ? s.expectedClueId !== clueId : false;
      })
      .map(([slotId]) => slotId);
    this.state.timeline.conflicts = conflicts;
    const completed = loadCaseConfig(this.state.caseId).timelineSlots.every((s) => this.state.timeline.placements[s.id] === s.expectedClueId);
    this.state.timeline.completed = completed;
    if (completed) this.state.objective = '时间链闭合完成，打开结案提交。';
    this.emitEvent({ type: 'TIMELINE_UPDATED', timestamp: Date.now(), payload: { completed: `${completed}` } });
    this.persistState();
    this.render();
  }

  private updateSubmission(field: keyof SubmissionState, value: string): void {
    this.state.submission = { ...this.state.submission, [field]: value };
    this.persistState();
    this.render();
  }

  private computeResult(): ResultState {
    const caseConfig = loadCaseConfig(this.state.caseId);
    const keyTotal = caseConfig.clues.filter((c) => c.isKey).length;
    const keyFound = this.state.inventory.filter((c) => c.isKey).length;
    const clueRate = keyTotal === 0 ? 0 : Math.round((keyFound / keyTotal) * 100);
    const sub = this.state.submission;
    const correct = caseConfig.submission.correct;
    const submissionCorrect = sub.suspect === correct.suspect && sub.keyLie === correct.keyLie && sub.method === correct.method && sub.destination === correct.destination;

    let score = 0;
    if (clueRate >= 100) score += 30;
    else if (clueRate >= 75) score += 20;
    if (this.state.flags['confrontation-complete']) score += 25;
    if (this.state.timeline.completed) score += 25;
    if (submissionCorrect) score += 20;
    if (this.state.flags['used-hint-or-fallback']) score -= 10;

    const rating: ResultState['rating'] = score >= 90 ? 'S' : score >= 75 ? 'A' : score >= 55 ? 'B' : 'F';
    return {
      rating,
      score,
      clueRate,
      timelineComplete: this.state.timeline.completed,
      usedHintOrFallback: Boolean(this.state.flags['used-hint-or-fallback']),
      submissionCorrect,
    };
  }

  private submitCaseConclusion(): void {
    const result = this.computeResult();
    if (!result.submissionCorrect) {
      this.state.wrongSubmissionCount += 1;
      if (this.state.wrongSubmissionCount >= 2) {
        this.primaryNotice = '提交偏差较多：优先核对“关键谎言”和“结论页去向”两项。';
        this.state.hintCount += 1;
      }
    }
    this.state.result = result;
    this.state.screen = 'result';
    this.state.overlay = null;
    this.emitEvent({ type: 'SUBMISSION_EVALUATED', timestamp: Date.now(), payload: { rating: result.rating } });
    this.persistState();
    this.render();
  }

  private restartCase(): void {
    localStorage.removeItem('detective-mini.stage1.save');
    window.location.reload();
  }

  private closeOverlay(): void {
    this.state.overlay = null;
    this.state.inspectCard = null;
    this.state.dialogueState = null;
    this.render();
  }

  private renderSceneTabs(): string {
    const caseConfig = loadCaseConfig(this.state.caseId);
    return `<section class="scene-switcher"><p>转场</p><div class="scene-switcher-list">${caseConfig.scenes
      .map((scene) => {
        const unlocked = this.evalCondition(scene.unlockCondition).ok;
        return `<button class="area-btn ${scene.id === this.state.currentSceneId ? 'is-active' : ''}" data-scene-id="${scene.id}" ${unlocked ? '' : 'disabled'}>${scene.label}</button>`;
      })
      .join('')}</div></section>`;
  }


  private getHotspotState(hotspotId: string): 'idle' | 'done' {
    const doneByHotspot: Record<string, string> = {
      desk: 'clue-envelope-opened',
      door_terminal: 'clue-doorlog-0728',
      monitor_node: 'clue-camera-gap-0731',
      recycle_bin: 'clue-shred-label',
    };
    const clueId = doneByHotspot[hotspotId];
    if (!clueId) return 'idle';
    return this.state.inventory.some((item) => item.id === clueId) ? 'done' : 'idle';
  }

  private renderHotspots(): string {
    const caseConfig = loadCaseConfig(this.state.caseId);
    const scene = caseConfig.scenes.find((s) => s.id === this.state.currentSceneId);
    if (!scene) return '';
    return scene.hotspots
      .map((hotspot) => {
        const unlocked = this.evalCondition(hotspot.unlockCondition).ok;
        const state = this.getHotspotState(hotspot.id);
        return `<button class="hotspot ${state === 'done' ? 'is-done' : ''} ${unlocked ? '' : 'is-locked'}" data-hotspot-id="${hotspot.id}" aria-label="${hotspot.label}" style="left:${hotspot.position.x}%;top:${hotspot.position.y}%;" ${unlocked ? '' : 'disabled'}><img src="/assets/ui/icons/icon-hotspot-target-marker.png" alt="" /><span>${hotspot.label}</span></button>`;
      })
      .join('');
  }

  private getCharacterCardStatus(character: CharacterConfig): { hasNew: boolean; label: string } {
    const caseConfig = loadCaseConfig(this.state.caseId);
    const nodes = caseConfig.dialogueNodes.filter((n) => n.characterId === character.id);
    const hasNew = nodes.some((node) => !this.state.visitedDialogueNodes.includes(node.id));
    return { hasNew, label: hasNew ? '可追问 / 新内容' : '已读' };
  }

  private getSceneBackground(_sceneId: string, fallback: string): string {
    return fallback;
  }

  private getCharacterVisual(character?: CharacterConfig): { avatar: string; portrait: string } | null {
    if (!character) return null;
    return { avatar: character.avatar, portrait: character.portrait };
  }

  private renderCharacterCards(): string {
    const caseConfig = loadCaseConfig(this.state.caseId);
    const scene = caseConfig.scenes.find((s) => s.id === this.state.currentSceneId);
    if (!scene) return '';
    const chars = scene.characterIds.map((id) => caseConfig.characters.find((c) => c.id === id)).filter((c): c is CharacterConfig => Boolean(c));
    return `<section class="character-dock-shell"><p class="character-dock-title">可追问人物</p><section class="character-dock">${chars
      .map((character) => {
        const status = this.getCharacterCardStatus(character);
        const visual = this.getCharacterVisual(character);
        return `<button class="character-card" data-character-id="${character.id}"><img src="${visual?.avatar ?? character.avatar}" alt="${character.name}" onerror="this.src='${character.avatar}'" /><div><strong>${character.name}</strong><p>点击进入追问</p><span class="card-status ${status.hasNew ? 'has-new' : ''}"><img src="/assets/ui/icons/new-dot.svg" alt="s" />${status.label}</span></div></button>`;
      })
      .join('')}</section></section>`;
  }

  private renderInspectOverlay(): string {
    if (this.state.overlay !== 'inspect' || !this.state.inspectCard) return '';
    const clue = this.state.inspectCard.clue;
    const impactLine = clue?.id === 'clue-envelope-opened'
      ? '封套完整性的说法已经站不住了。'
      : clue?.id === 'clue-doorlog-0728'
        ? '07:28 的进入行为可以直接压问口供。'
        : clue?.id === 'clue-camera-gap-0731'
          ? '关键时段被人为制造了视线盲区。'
          : '这份物证足够推动下一轮施压。';
    const actionLabel = clue?.id === 'clue-doorlog-0728' ? '记录线索' : clue?.id === 'clue-shred-label' ? '标记异常' : '收入证据';
    return `<section class="overlay"><div class="inspect-card"><p class="inspect-kicker">发现证据</p><div class="inspect-hero">${clue?.image ? `<img class="inspect-image" src="${clue.image}" alt="${clue.title}" onerror="this.src='/assets/cases/case-001/scenes/review_room.jpg'" />` : ''}</div><h3>${clue?.title ?? '暂无新增线索'}</h3><p class="inspect-judgement">${impactLine}</p><button data-close-overlay="true" class="primary-btn">${actionLabel}</button></div></section>`;
  }

  private renderHintOverlay(): string {
    if (this.state.overlay !== 'hint') return '';
    return `<section class="overlay"><div class="inspect-card"><h3>回退提示</h3><p>关键证据不足，请补齐后重新进入关键对质。</p><button data-close-overlay="true" class="primary-btn">继续调查</button></div></section>`;
  }

  private renderOption(option: DialogueOption): string {
    const check = this.evalCondition(option.unlockCondition ?? option.condition);
    return `<button class="dialogue-option ${check.ok ? '' : 'is-locked'}" data-dialogue-to="${option.to}" ${check.ok ? '' : 'disabled'}><span class="option-arrow">›</span><span><strong>${option.label}</strong></span>${!check.ok && DEV_MODE ? `<small>未解锁：${check.missing.join(' / ')}</small>` : ''}</button>`;
  }

  private renderDialogueOverlay(): string {
    if (this.state.overlay !== 'dialogue' || !this.state.dialogueState) return '';
    const caseConfig = loadCaseConfig(this.state.caseId);
    const node = caseConfig.dialogueNodes.find((n) => n.id === this.state.dialogueState?.nodeId);
    const character = caseConfig.characters.find((c) => c.id === this.state.dialogueState?.characterId);
    if (!node || !character) return '';
    const line = node.lines[this.state.dialogueState.lineIndex] ?? '';
    const end = this.state.dialogueState.lineIndex >= node.lines.length - 1;
    const visual = this.getCharacterVisual(character);
    return `<section class="overlay dialogue-overlay"><div class="dialogue-card interrogation-scene"><aside class="dialogue-actor"><img class="portrait" src="${visual?.portrait ?? character.portrait}" alt="${character.name}" onerror="this.src='${character.portrait}'" /><img class="avatar-badge" src="${visual?.avatar ?? character.avatar}" alt="${character.name}" onerror="this.src='${character.avatar}'" /></aside><div class="dialogue-main"><header><div><h3>${character.name}</h3><p>${character.role}</p></div><button data-close-overlay="true" class="ghost-btn subtle-btn">结束对话</button></header><article>${line}</article><div class="dialogue-controls">${end ? '<span>选择追问动作</span>' : '<button data-dialogue-next="true" class="ghost-btn">继续施压</button>'}</div>${end ? `<div class="dialogue-options">${node.options.slice(0, 3).map((o) => this.renderOption(o)).join('')}</div>` : ''}</div></div></section>`;
  }

  private renderConfrontationBody(): string {
    const caseConfig = loadCaseConfig(this.state.caseId);
    const target = caseConfig.characters.find((c) => c.id === caseConfig.confrontation.target);
    const conf = this.state.confrontation;
    const round = caseConfig.confrontation.rounds[conf.roundIndex];
    const totalRounds = caseConfig.confrontation.rounds.length;
    const remain = caseConfig.confrontation.maxMistakesPerRound - conf.mistakesInCurrentRound;

    const emotion = round?.enterEmotion ?? 'neutral';
    const portraitSrc = target?.emotionPortraits?.[emotion] ?? target?.portrait ?? '/assets/cases/case-001/characters/portrait-fallback.png';

    const hasSelection = conf.selectedSentenceId !== null;
    const evidenceList = this.state.inventory.filter((i) => i.isKey).slice(0, 4);

    const sentencesHtml = round
      ? round.sentences
          .map((s) => {
            const isSelected = conf.selectedSentenceId === s.id;
            const cls = isSelected ? 'testimony-sentence is-selected' : 'testimony-sentence';
            return `<button class="${cls}" data-select-sentence="${s.id}">${s.text}</button>`;
          })
          .join('')
      : '';

    const roundBadges = conf.roundResults
      .map((r, i) => {
        const active = i === conf.roundIndex && conf.status === 'ongoing';
        const cls = `round-badge is-${r}${active ? ' is-active' : ''}`;
        return `<span class="${cls}">${i + 1}</span>`;
      })
      .join('');

    const evidenceCardsHtml = evidenceList
      .map((item) => {
        const disabled = hasSelection ? '' : 'disabled';
        return `<button class="evidence-card" data-present-evidence="${item.id}" ${disabled}><strong>${item.title}</strong><small>${item.source.split(' / ')[0]}</small></button>`;
      })
      .join('');

    const evidenceHintText = hasSelection
      ? '选择一条证据反驳被选中的证词'
      : '先点击周岚的某句证词，再出示证据';

    return `<section class="confrontation-shell">
    <header class="confront-head">
      <div class="confront-head-left">
        <h2>关键对质</h2>
        <div class="round-progress">${roundBadges}</div>
      </div>
      <div class="confront-head-right">
        <p class="round-meta">回合 ${Math.min(conf.roundIndex + 1, totalRounds)} / ${totalRounds}</p>
        <p class="mistakes-meta">剩余容错 <strong>${Math.max(remain, 0)}</strong></p>
      </div>
    </header>
    <div class="confront-stage">
      <img src="${portraitSrc}" alt="${target?.name ?? '目标'}" class="confront-portrait" />
      <div class="testimony-panel">
        <h3 class="testimony-title">${target?.name ?? '证人'}的证词</h3>
        <div class="testimony-list">${sentencesHtml}</div>
      </div>
    </div>
    <p class="confront-feedback">${conf.lastFeedback}</p>
    <div class="evidence-section ${hasSelection ? 'is-active' : 'is-waiting'}">
      <h3 class="evidence-title">${evidenceHintText}</h3>
      <div class="evidence-grid">${evidenceCardsHtml}</div>
    </div>
  </section>`;
  }

  private renderDeductionBody(): string {
    const caseConfig = loadCaseConfig(this.state.caseId);
    return `
      <div class="screen-scrollable">
        <section class="screen-panel">
          <h2>时间验证</h2>
          <p>先点击关键线索，再点击时间槽位放置。错误槽位会显示冲突提示。</p>
          <div class="evidence-grid">
            ${this.state.inventory
              .filter((c) => c.isKey)
              .map((c) => `<button class="evidence-card ${this.state.timeline.selectedClueId === c.id ? 'is-active' : ''}" data-select-timeline-clue="${c.id}"><strong>${c.title}</strong><small>${c.id}</small></button>`)
              .join('')}
          </div>
          <div class="timeline-grid">
            ${caseConfig.timelineSlots
              .map((slot) => {
                const placed = this.state.timeline.placements[slot.id];
                const conflict = this.state.timeline.conflicts.includes(slot.id);
                return `<button class="timeline-slot ${conflict ? 'is-conflict' : ''}" data-place-slot="${slot.id}"><strong>${slot.label}</strong><small>${placed ?? '点击放置线索'}</small></button>`;
              })
              .join('')}
          </div>
          <p>${this.state.timeline.completed ? '行为链闭合完成。' : '尚未闭合关键行为链。'}</p>
        </section>
        <section class="screen-panel">
          <h2>结案归纳提交</h2>
          <p>以卡片化选择提交，不是普通表单。</p>
          ${this.renderSubmissionOptions('suspect', caseConfig.submission.suspects)}
          ${this.renderSubmissionOptions('keyLie', caseConfig.submission.keyLies)}
          ${this.renderSubmissionOptions('method', caseConfig.submission.methods)}
          ${this.renderSubmissionOptions('destination', caseConfig.submission.destinations)}
          <button class="primary-btn" data-submit-case="true" ${this.state.timeline.completed ? '' : 'disabled'}>提交结案归纳</button>
        </section>
      </div>
    `;
  }

  private renderSubmissionOptions(field: keyof SubmissionState, options: string[]): string {
    return `<div class="submission-group"><h3>${field}</h3><div class="evidence-grid">${options
      .map((opt) => `<button class="evidence-card ${this.state.submission[field] === opt ? 'is-active' : ''}" data-submission-field="${field}" data-submission-value="${opt}">${opt}</button>`)
      .join('')}</div></div>`;
  }

  private renderResultBody(): string {
    const caseConfig = loadCaseConfig(this.state.caseId);
    const result = this.state.result ?? this.computeResult();
    const correct = caseConfig.submission.correct;
    return `
      <div class="screen-scrollable">
        <section class="screen-panel result-shell">
          <h2>案件归档</h2>
          <div class="result-rating"><span>${result.rating}</span><small>${result.score} 分</small></div>
          <p class="result-truth">你已锁定真相核心：${correct.suspect}在会前拆封并转移结论页。</p>
          <div class="result-chain"><h3>证据链</h3><ol><li>封套二次开启痕迹</li><li>07:28 门禁进入</li><li>碎纸残片落点</li></ol></div>
          <div class="result-actions"><button class="ghost-btn" data-screen="archive">返回档案室</button><button class="primary-btn" data-restart-case="true">重开案件</button></div>
        </section>
        <section class="screen-panel">
          <h2>真相回放</h2>
          ${caseConfig.truthReplay
            .map((seg) => `<article class="replay-segment"><h3>${seg.timeAnchor} · ${seg.title}</h3><p>${seg.summary}</p></article>`)
            .join('')}
        </section>
      </div>
    `;
  }

  private getConfirmedAnomalies(): string[] {
    const anomalies: string[] = [];
    if (this.state.inventory.some((item) => item.id === 'clue-envelope-opened')) anomalies.push('封套存在二次开启痕迹');
    if (this.state.inventory.some((item) => item.id === 'clue-doorlog-0728')) anomalies.push('已掌握 07:28 门禁进入记录');
    if (this.state.inventory.some((item) => item.id === 'clue-camera-gap-0731')) anomalies.push('监控在 07:31 附近存在空窗');
    if (this.state.inventory.some((item) => item.id === 'clue-shred-label')) anomalies.push('碎纸桶发现结论页标签残片');
    return anomalies.slice(0, 3);
  }

  private getNextActions(): string[] {
    const actions: string[] = [];
    if (!this.state.flags['first-contradiction-found']) actions.push('追问周岚，确认“封存后未触碰”是否成立');
    if (this.state.flags['first-contradiction-found'] && !this.state.inventory.some((item) => item.id === 'clue-camera-gap-0731')) actions.push('前往走廊监控区补全 07:31 空档');
    if (this.state.flags['first-contradiction-found'] && !this.state.inventory.some((item) => item.id === 'clue-shred-label')) actions.push('检查茶水间回收桶，追索碎纸来源');
    if (this.state.flags['first-contradiction-found'] && !this.state.flags['confrontation-complete']) actions.push('证据足够后进入关键对质');
    return actions.slice(0, 2);
  }

  private renderInvestigationBody(background: string): string {
    const anomalies = this.getConfirmedAnomalies();
    const nextActions = this.getNextActions();
    return `
      ${this.renderSceneTabs()}
      <div class="investigation-layout">
        <div class="investigation-stage" style="background-image:url('${background}'), url('/assets/cases/case-001/scenes/review_room.jpg')"><div class="hotspot-layer">${this.renderHotspots()}</div></div>
        <aside class="pressure-panel">
          <section><h3>调查判断</h3><p>${this.state.objective}</p></section>
          <section><h3>已确认线索</h3><ul>${(anomalies.length ? anomalies : ['暂无已确认线索']).map((item) => `<li>${item}</li>`).join('')}</ul></section>
          <section><h3>下一步</h3><ul>${(nextActions.length ? nextActions : ['继续现场排查并形成可施压问题']).map((item) => `<li>${item}</li>`).join('')}</ul>
            ${this.state.flags['first-contradiction-found'] && !this.state.flags['confrontation-complete'] ? '<button class="primary-btn" data-start-confrontation="true">进入关键对质</button>' : ''}
            ${this.state.flags['confrontation-complete'] && this.state.screen !== 'deduction' && this.state.screen !== 'result' ? '<button class="primary-btn" data-screen="deduction">进入时间验证与提交</button>' : ''}
          </section>
        </aside>
      </div>
      ${this.renderCharacterCards()}
      ${DEV_MODE ? `<section class="dev-panel"><h3>DEV 事件</h3><ul class="event-feed">${this.state.eventFeed.map((evt) => `<li>${evt.type}</li>`).join('')}</ul></section>` : ''}
    `;
  }

  private renderArchiveBody(): string {
    const canContinue = this.state.screen !== 'archive' || this.state.inventory.length > 0 || this.state.testimonies.length > 0;
    return `
      <section class="archive-shell" style="background-image:url('/assets/cases/case-001/scenes/archive_cover.jpg'), url('/assets/cases/case-001/scenes/review_room.jpg')">
        <header class="archive-header">
          <h1>档案室 / CASE ARCHIVE</h1>
          <p>选择档案并进入调查</p>
        </header>
        <section class="archive-grid">
          <article class="case-card case-card-main">
            <div class="case-card-cover" style="background-image:url('/assets/cases/case-001/scenes/archive_cover.jpg')"></div>
            <div class="case-card-content">
              <h2>08:17 的空档</h2>
              <p class="case-tags">企业调查 / 资料失窃</p>
              <p class="case-meta">北港生物研发中心 6 层 · 07:20 - 08:22</p>
              <p class="case-risk">风险等级：HIGH · 难度：NORMAL</p>
              <p class="case-summary">评审会前，唯一纸质结论页失踪。</p>
              <button class="primary-btn archive-enter-btn" data-screen="intro">${canContinue ? '继续导入' : '导入案件'}</button>
            </div>
          </article>
          <article class="case-card case-card-side">
            <div class="case-card-content">
              <h3>评审室失页事件</h3>
              <p class="case-tags">教学档案</p>
              <p class="case-summary">快速体验调查流程与证据链收集方式。</p>
              <button class="ghost-btn" data-screen="intro">教学进入</button>
            </div>
          </article>
          <article class="case-card case-card-side case-card-locked" aria-disabled="true">
            <div class="case-card-content">
              <h3>封存中</h3>
              <p class="case-tags">封存案件</p>
              <p class="case-summary">该档案尚未开放，请等待后续更新。</p>
              <span class="locked-tag">权限锁定</span>
            </div>
          </article>
        </section>
      </section>
    `;
  }

  private renderIntroBody(): string {
    return `
      <div class="screen-scrollable">
        <section class="briefing-shell">
          <header class="briefing-header">
            <h1>08:17 的空档</h1>
            <p>北港生物研发中心 6 层 · 07:20 - 08:22</p>
          </header>
          <section class="briefing-layout">
            <article class="briefing-copy">
              <section>
                <h2>案件摘要</h2>
                <p>评审会开始前，唯一纸质结论页失踪。</p>
              </section>
              <section>
                <h2>接案简报</h2>
                <p>07:20 资料送达，08:00 前结论页失踪。</p><p>外部评委已在路上，你只有一轮窗口锁定接触链。</p>
              </section>
              <section>
                <h2>涉案人物概览</h2>
                <ul>
                  <li>周岚：行政助理，最后接触资料者</li>
                  <li>陈序：产品经理，提供侧面信息</li>
                </ul>
              </section>
              <section>
                <h2>当前调查目标</h2>
                <p>先确认谁在会前接触过结论页。</p>
              </section>
            </article>
            <aside class="briefing-visual" style="background-image:url('/assets/cases/case-001/scenes/archive_cover.jpg'), url('/assets/cases/case-001/scenes/review_room.jpg')">
              <div class="briefing-visual-overlay">
                <p>CASE-001 BRIEFING</p>
              </div>
            </aside>
          </section>
          <footer class="briefing-actions">
            <button class="ghost-btn" data-screen="archive">返回档案室</button>
            <button class="primary-btn briefing-enter-btn" data-screen="investigation">进入调查</button>
          </footer>
        </section>
      </div>
    `;
  }

  private render(): void {
    if (this.loading) {
      this.root.innerHTML = `<main class="stage-shell"><section class="screen-panel"><h2>载入案件资源中…</h2><p>正在优先准备当前场景、角色与核心 UI。</p></section></main>`;
      return;
    }
    const caseConfig = loadCaseConfig(this.state.caseId);
    const updatedAt = new Date(this.state.updatedAt).toLocaleString('zh-CN', { hour12: false });
    const archiveOrIntro = this.state.screen === 'archive' || this.state.screen === 'intro';
    if (this.state.screen === 'investigation') this.syncAmbienceForScene(this.state.currentSceneId);

    const savedScrollTop = this.root.querySelector<HTMLElement>('.screen-scrollable')?.scrollTop ?? 0;

    this.root.innerHTML = `
      <main class="stage-shell">
        ${archiveOrIntro ? '' : `<header class="status-bar">
          <div class="status-left"><h1>${caseConfig.title}</h1></div>
          <div class="status-middle"><p>北港生物研发中心 6 层 · 07:20 - 08:22</p></div>
          <div class="status-right"><div><span>当前目标</span><strong>${this.state.objective}</strong></div>${DEV_MODE ? `<div><span>Screen</span><strong>${this.state.screen}</strong></div><div><span>Case</span><strong>${this.state.caseId}</strong></div><div><span>存档时间</span><strong>${updatedAt}</strong></div>` : ''}</div>
        </header>`}
        <section class="stage-main">
          <section class="visual-stage">
            ${DEV_MODE ? `<div class="screen-tag">SCREEN / ${this.state.screen.toUpperCase()}</div>` : ''}
            ${this.getScreenBody(caseConfig.scenes.find((s) => s.id === this.state.currentSceneId)?.background ?? caseConfig.scenes[0].background)}
            ${this.renderInspectOverlay()}${this.renderDialogueOverlay()}${this.renderHintOverlay()}
          </section>
          ${DEV_MODE && !archiveOrIntro ? `<aside class="case-board ${this.boardOpen ? 'is-open' : ''}">
            <h2>案件板</h2>
            ${this.state.restoreNotice ? `<section><p>${this.state.restoreNotice}</p></section>` : ''}
            ${this.primaryNotice ? `<section><h3>提示</h3><p>${this.primaryNotice}</p></section>` : ''}
            <section><h3>当前 Objective</h3><p>${this.state.objective}</p></section>
            <section><h3>案发时段 / 地点</h3><p>${caseConfig.timeRange} · ${caseConfig.location}</p></section>
            <section><h3>第一处矛盾</h3><p>${this.state.contradictionMessage ?? '尚未成立'}</p></section>
            <section><h3>关键对质</h3><p>${this.state.flags['confrontation-complete'] ? '已完成' : '未完成'}</p>${this.state.flags['first-contradiction-found'] && !this.state.flags['confrontation-complete'] ? '<button class="primary-btn" data-start-confrontation="true">进入关键对质</button>' : ''}${this.state.flags['confrontation-complete'] && this.state.screen !== 'deduction' && this.state.screen !== 'result' ? '<button class="primary-btn" data-screen="deduction">进入时间验证与提交</button>' : ''}</section>
            ${DEV_MODE ? `<section><h3>DEV 事件</h3><ul class="event-feed">${this.state.eventFeed.map((evt) => `<li>${evt.type}</li>`).join('')}</ul></section>` : ''}
          </aside>` : ''}
        </section>
        ${DEV_MODE ? `<footer class="interaction-bar"><div class="quick-actions"><button data-screen="archive" class="ghost-btn">archive</button><button data-screen="intro" class="ghost-btn">intro</button><button data-screen="investigation" class="ghost-btn">investigation</button>${archiveOrIntro ? '' : '<button data-toggle-board="true" class="ghost-btn">案件板</button>'}</div><button data-next="true" class="primary-btn" ${this.state.screen === 'investigation' ? 'disabled' : ''}>推进到下一主屏</button></footer>` : ''}
      </main>`;

    this.bindEvents();

    if (savedScrollTop > 0) {
      const newScrollable = this.root.querySelector<HTMLElement>('.screen-scrollable');
      if (newScrollable) newScrollable.scrollTop = savedScrollTop;
    }
  }

  private getScreenBody(background: string): string {
    if (this.state.screen === 'archive') return this.renderArchiveBody();
    if (this.state.screen === 'intro') return this.renderIntroBody();
    if (this.state.screen === 'confrontation') return this.renderConfrontationBody();
    if (this.state.screen === 'deduction') return this.renderDeductionBody();
    if (this.state.screen === 'result') return this.renderResultBody();
    return this.renderInvestigationBody(this.getSceneBackground(this.state.currentSceneId, background));
  }

  private goNextScreen(): void {
    const i = SCREEN_SEQUENCE.indexOf(this.state.screen);
    const next = SCREEN_SEQUENCE[i + 1];
    if (next) this.setScreen(next);
  }

  private bindEvents(): void {
    this.root.querySelectorAll<HTMLButtonElement>('[data-screen]').forEach((button) => button.addEventListener('click', () => { const s = button.dataset.screen as Screen | undefined; if (s) { this.playSfx(UI_CLICK_AUDIO, 0.26); this.setScreen(s); } }));
    this.root.querySelectorAll<HTMLButtonElement>('[data-hotspot-id]').forEach((button) => { button.addEventListener('click', () => { if (!button.dataset.hotspotId) return; this.playSfx(UI_CLICK_AUDIO, 0.3); const discovered = this.investigateHotspot(button.dataset.hotspotId); if (discovered) this.playSfx(CLUE_AUDIO, 0.42); }); });
    this.root.querySelectorAll<HTMLButtonElement>('[data-character-id]').forEach((button) => button.addEventListener('click', () => button.dataset.characterId && this.openDialogue(button.dataset.characterId)));
    this.root.querySelectorAll<HTMLButtonElement>('[data-dialogue-to]').forEach((button) => button.addEventListener('click', () => button.dataset.dialogueTo && this.jumpDialogueNode(button.dataset.dialogueTo)));
    const dialogueNext = this.root.querySelector<HTMLButtonElement>('[data-dialogue-next="true"]');
    if (dialogueNext) dialogueNext.addEventListener('click', () => this.advanceDialogueLine());
    const close = this.root.querySelector<HTMLButtonElement>('[data-close-overlay="true"]');
    if (close) close.addEventListener('click', () => this.closeOverlay());
    const next = this.root.querySelector<HTMLButtonElement>('[data-next="true"]');
    if (next) next.addEventListener('click', () => this.goNextScreen());
    this.root.querySelectorAll<HTMLButtonElement>('[data-scene-id]').forEach((button) => button.addEventListener('click', () => { const id = button.dataset.sceneId; if (!id) return; const scene = loadCaseConfig(this.state.caseId).scenes.find((s) => s.id === id); if (!scene || !this.evalCondition(scene.unlockCondition).ok) return; this.playSfx(UI_CLICK_AUDIO, 0.28); this.state.currentSceneId = scene.id; this.persistState(); this.render(); }));
    const startConf = this.root.querySelector<HTMLButtonElement>('[data-start-confrontation="true"]');
    if (startConf) startConf.addEventListener('click', () => this.startConfrontation());
    this.root.querySelectorAll<HTMLButtonElement>('[data-present-evidence]').forEach((button) => button.addEventListener('click', () => { const evidenceId = button.dataset.presentEvidence; if (!evidenceId) return; const conf = this.state.confrontation; const round = loadCaseConfig(this.state.caseId).confrontation.rounds[conf.roundIndex]; const selectedSentence = round?.sentences.find((s) => s.id === conf.selectedSentenceId); const isCorrect = !!selectedSentence?.counterEvidenceId && evidenceId === selectedSentence.counterEvidenceId; this.playSfx(isCorrect ? CONFRONT_SUCCESS_AUDIO : CONTRADICTION_AUDIO, isCorrect ? 0.48 : 0.34); this.presentEvidence(evidenceId); }));
    this.root.querySelectorAll<HTMLButtonElement>('[data-select-sentence]').forEach((button) => button.addEventListener('click', () => button.dataset.selectSentence && this.selectSentence(button.dataset.selectSentence)));
    this.root.querySelectorAll<HTMLButtonElement>('[data-select-timeline-clue]').forEach((button) => button.addEventListener('click', () => button.dataset.selectTimelineClue && this.selectTimelineClue(button.dataset.selectTimelineClue)));
    this.root.querySelectorAll<HTMLButtonElement>('[data-place-slot]').forEach((button) => button.addEventListener('click', () => { const slot = loadCaseConfig(this.state.caseId).timelineSlots.find((s) => s.id === button.dataset.placeSlot); if (slot) this.placeTimeline(slot); }));
    this.root.querySelectorAll<HTMLButtonElement>('[data-submission-field]').forEach((button) => button.addEventListener('click', () => { const field = button.dataset.submissionField as keyof SubmissionState; const value = button.dataset.submissionValue; if (field && value) this.updateSubmission(field, value); }));
    const submit = this.root.querySelector<HTMLButtonElement>('[data-submit-case="true"]');
    if (submit) submit.addEventListener('click', () => this.submitCaseConclusion());
    const restart = this.root.querySelector<HTMLButtonElement>('[data-restart-case="true"]');
    if (restart) restart.addEventListener('click', () => this.restartCase());
    const toggleBoard = this.root.querySelector<HTMLButtonElement>('[data-toggle-board="true"]');
    if (toggleBoard) toggleBoard.addEventListener('click', () => {
      this.boardOpen = !this.boardOpen;
      this.render();
    });
  }
}
