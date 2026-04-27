import { loadCaseConfig } from './caseLoader';
import { getSaveKey, loadStageSave, saveStageState } from './saveStore';
import type {
  CharacterConfig,
  ClueConfig,
  ClueInterpretationChoice,
  ClueRuntimeState,
  ConfrontationRound,
  ConfrontationState,
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
  StageCaseConfig,
  StageRuntimeState,
  StandardEvent,
  SubmissionState,
  TestimonyConfig,
  TestimonySentence,
  TimelineSlot,
} from './types';

const SCREEN_SEQUENCE: Screen[] = ['archive', 'intro', 'investigation'];
const ENGINE_EVENT_NAME = 'DETECTIVE_ENGINE_EVENT';
const DEV_MODE = window.location.search.includes('dev=1');

// T2.6-B: fallback feedback strings when sentence.responses and round-level text are absent
const FEEDBACK_DEFAULTS = {
  irrelevant: '这条证据暂时无法推进——换个角度试试。',
  partial: '这个角度有些道理，但还不足以击穿这句话。',
  misread: '你的解读方向偏了——这条证据的意义另有所指。',
} as const;

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

  private interpretingClueId: string | null = null;

  private pendingInterpretTier: 'canonical' | 'partial' | 'misread' | null = null;

  // T2.6-B: controls accuse-suspect dialog visibility
  private accuseDialogOpen = false;

  private primaryNotice = '';

  private ambienceAudio: HTMLAudioElement | null = null;

  private ambienceSceneId: string | null = null;

  private sfxMuted = false;

  private state: StageRuntimeState;

  private readonly onExit?: () => void;

  private idleHintTimer: ReturnType<typeof setInterval> | null = null;

  constructor({ root, caseId, onExit }: { root: HTMLElement; caseId: string; onExit?: () => void }) {
    this.root = root;
    this.onExit = onExit;
    const existingSave = loadStageSave(caseId);
    const caseConfig = loadCaseConfig(existingSave?.caseId ?? caseId);
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
      interpretations: existingSave?.interpretations ?? [],
      // T2.6-B: runtime fields restored from save or initialised fresh
      confrontationBySuspect: existingSave?.confrontationBySuspect ?? {},
      currentSuspectId: existingSave?.currentSuspectId ?? null,
      clueRuntimeStates: existingSave?.clueRuntimeStates ?? [],
    };

    this.events.addEventListener(ENGINE_EVENT_NAME, (evt) => {
      const detail = (evt as CustomEvent<StandardEvent>).detail;
      this.state = { ...this.state, eventFeed: [detail, ...this.state.eventFeed].slice(0, 8) };
      this.render();
    });

    this.preloadCriticalAssets().finally(() => {
      this.loading = false;
      this.initClueRuntimeStates(); // T2.6-B: supplement save entries with all case clues
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
    this.idleHintTimer = window.setInterval(() => {
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

  dispose(): void {
    if (this.idleHintTimer !== null) {
      window.clearInterval(this.idleHintTimer);
      this.idleHintTimer = null;
    }
    if (this.ambienceAudio) {
      this.ambienceAudio.pause();
      this.ambienceAudio = null;
    }
    this.root.innerHTML = '';
  }

  private emitEvent(event: StandardEvent): void {
    this.events.dispatchEvent(new CustomEvent(ENGINE_EVENT_NAME, { detail: event }));
  }

  private persistState(): void {
    saveStageState(this.state.caseId, {
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
      interpretations: this.state.interpretations,
      // T2.6-B
      confrontationBySuspect: this.state.confrontationBySuspect,
      currentSuspectId: this.state.currentSuspectId,
      clueRuntimeStates: this.state.clueRuntimeStates,
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
      // Ensure a clueRuntimeState entry exists for the newly collected clue
      if (!this.state.clueRuntimeStates.some((rs) => rs.clueId === clue.id)) {
        this.state.clueRuntimeStates = [...this.state.clueRuntimeStates, { clueId: clue.id, discoverable: true, currentLayer: 0 }];
      }
      // Recompute unlock gates for all locked clues now that inventory changed
      const caseConfig = loadCaseConfig(this.state.caseId);
      this.recomputeUnlockStates(caseConfig);
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
    if (!this.canEnterConfrontation()) {
      this.primaryNotice = '还有线索未发现或未解读，请先在证据库完成调查与解读';
      this.render();
      return;
    }

    const caseConfig = loadCaseConfig(this.state.caseId);
    const suspects = caseConfig.confrontation.suspects;
    const allSuspectIds = suspects?.length ? suspects.map((s) => s.suspectId) : [caseConfig.confrontation.target];
    const firstId = allSuspectIds[0];

    // Build / repair confrontationBySuspect: create fresh entries for allLost suspects,
    // leave ongoing/success suspects untouched (player can resume).
    const dict: Record<string, ConfrontationState> = { ...this.state.confrontationBySuspect };
    for (const sid of allSuspectIds) {
      const existing = dict[sid];
      if (!existing || existing.status === 'allLost') {
        const sc = suspects?.find((s) => s.suspectId === sid);
        const rounds = sc?.rounds ?? caseConfig.confrontation.rounds;
        dict[sid] = { roundIndex: 0, mistakesInCurrentRound: 0, roundResults: rounds.map(() => 'pending' as const), selectedSentenceId: null, status: 'ongoing', lastFeedback: '审视证人的每一句话。找出自相矛盾的那一句。' };
      }
    }

    this.state.confrontationBySuspect = dict;
    this.state.currentSuspectId = firstId;
    this.state.confrontation = { ...dict[firstId] };
    this.state.screen = 'confrontation';
    this.persistState();
    this.render();
  }

  private advanceToNextPlayableRound(): void {
    const caseConfig = loadCaseConfig(this.state.caseId);
    const rounds = this.getRoundsForCurrentSuspect(caseConfig);

    while (
      this.state.confrontation.roundIndex < rounds.length &&
      this.state.confrontation.roundResults[this.state.confrontation.roundIndex] === 'lost'
    ) {
      this.state.confrontation.roundIndex++;
      this.state.confrontation.mistakesInCurrentRound = 0;
      this.state.confrontation.selectedSentenceId = null;
    }

    if (this.state.confrontation.roundIndex >= rounds.length) {
      this.handleConfrontationEnd();
    }
  }

  private selectSentence(sentenceId: string): void {
    const caseConfig = loadCaseConfig(this.state.caseId);
    const rounds = this.getRoundsForCurrentSuspect(caseConfig);
    const round = rounds[this.state.confrontation.roundIndex];
    if (!round || this.state.confrontation.status !== 'ongoing') return;
    const sentence = round.sentences.find((s) => s.id === sentenceId);
    if (!sentence) return;
    if (!sentence.contradictable) {
      this.state.confrontation = { ...this.state.confrontation, lastFeedback: '这句话听起来没问题……' };
      this.render();
      return;
    }
    this.state.confrontation = { ...this.state.confrontation, selectedSentenceId: sentenceId, lastFeedback: '这一句有问题。用证据证明她在说谎。' };
    this.render();
  }

  // T2.6-B: 4-outcome attack dispatch.
  // canonical→won(advance) | partial→draw(advance) | misread→quota++(advance+lost only when exhausted) | irrelevant→no effect
  private presentEvidence(evidenceId: string): void {
    const caseConfig = loadCaseConfig(this.state.caseId);
    const rounds = this.getRoundsForCurrentSuspect(caseConfig);
    const round = rounds[this.state.confrontation.roundIndex];
    if (!round || this.state.confrontation.status !== 'ongoing') return;

    const selectedId = this.state.confrontation.selectedSentenceId;
    if (!selectedId) {
      this.state.confrontation = { ...this.state.confrontation, lastFeedback: '先找出她哪句话有问题——证据才能派上用场。' };
      this.render();
      return;
    }

    const sentence = round.sentences.find((s) => s.id === selectedId);
    if (!sentence || !sentence.contradictable) {
      this.state.confrontation = { ...this.state.confrontation, selectedSentenceId: null, lastFeedback: '这句话听起来没问题……换一句看看。' };
      this.render();
      return;
    }

    const outcome = this.resolveOutcome(evidenceId, selectedId, caseConfig);
    const feedback = this.getFeedback(round, sentence, outcome);
    const mistakesBefore = this.state.confrontation.mistakesInCurrentRound;
    console.log(`[T2.6-B] presentEvidence: evidence=${evidenceId} sentence=${selectedId} outcome=${outcome} mistakesBefore=${mistakesBefore}`);

    if (outcome === 'irrelevant') {
      // No round change, no mistake consumed
      console.log(`[inventory] irrelevant early-return: mistakesInCurrentRound stays ${mistakesBefore}`);
      this.state.confrontation = { ...this.state.confrontation, selectedSentenceId: null, lastFeedback: feedback };
      this.syncSuspectState();
      this.emitEvent({ type: 'CONFRONTATION_PROGRESS', timestamp: Date.now(), payload: { outcome, round: `${this.state.confrontation.roundIndex}` } });
      this.persistState();
      this.render();
      return;
    }

    if (outcome === 'misread') {
      const newMistakes = mistakesBefore + 1;
      const suspectConf = this.getConfForCurrentSuspect(caseConfig);
      if (newMistakes >= suspectConf.maxMistakesPerRound) {
        // quota exhausted → mark round lost and advance
        const newResults = [...this.state.confrontation.roundResults];
        newResults[this.state.confrontation.roundIndex] = 'lost';
        console.log(`[inventory] misread quota exhausted: mistakes=${newMistakes}/${suspectConf.maxMistakesPerRound} → round lost, advancing`);
        this.state.confrontation = {
          ...this.state.confrontation,
          roundIndex: this.state.confrontation.roundIndex + 1,
          mistakesInCurrentRound: 0,
          roundResults: newResults,
          selectedSentenceId: null,
          lastFeedback: feedback,
          lostByMisread: true,
        };
        this.advanceToNextPlayableRound();
      } else {
        // quota not yet exhausted → accumulate, stay in round
        console.log(`[inventory] misread within quota: mistakes=${newMistakes}/${suspectConf.maxMistakesPerRound} → stay in round`);
        this.state.confrontation = {
          ...this.state.confrontation,
          mistakesInCurrentRound: newMistakes,
          selectedSentenceId: null,
          lastFeedback: feedback,
        };
      }
    } else {
      // canonical or partial → advance round immediately, reset mistakes for new round
      const newResults = [...this.state.confrontation.roundResults];
      newResults[this.state.confrontation.roundIndex] = outcome === 'canonical' ? 'won' : 'draw';
      console.log(`[inventory] ${outcome}: roundResult=${newResults[this.state.confrontation.roundIndex]} mistakesInCurrentRound reset 0 (was ${mistakesBefore})`);
      this.state.confrontation = {
        ...this.state.confrontation,
        roundIndex: this.state.confrontation.roundIndex + 1,
        mistakesInCurrentRound: 0,
        roundResults: newResults,
        selectedSentenceId: null,
        lastFeedback: feedback,
      };
      this.advanceToNextPlayableRound();
    }
    this.syncSuspectState();
    this.emitEvent({ type: 'CONFRONTATION_PROGRESS', timestamp: Date.now(), payload: { outcome, round: `${this.state.confrontation.roundIndex}` } });
    this.persistState();
    this.render();
  }

  // D1: success → status='success' only, no auto-transition to deduction.
  // D2: hasMajorityWin = wonCount >= 1 && (wonCount + drawCount) > lostCount
  private handleConfrontationEnd(): void {
    const caseConfig = loadCaseConfig(this.state.caseId);
    const suspectConf = this.getConfForCurrentSuspect(caseConfig);
    const rounds = this.getRoundsForCurrentSuspect(caseConfig);
    const roundResults = this.state.confrontation.roundResults;
    const wonCount = roundResults.filter((r) => r === 'won').length;
    const drawCount = roundResults.filter((r) => r === 'draw').length;
    const lostCount = roundResults.filter((r) => r === 'lost').length;
    const hasMajorityWin = wonCount >= 1 && (wonCount + drawCount) > lostCount;
    console.log(`[T2.6-B] handleConfrontationEnd: suspect=${this.state.currentSuspectId} won=${wonCount} draw=${drawCount} lost=${lostCount} hasMajorityWin=${hasMajorityWin}`);

    if (!hasMajorityWin) {
      this.state.confrontation = {
        ...this.state.confrontation,
        status: 'allLost',
        lastFeedback: suspectConf.onAllLost ?? '对质未能充分击穿证人的防线——或许证据还没有收集齐全。',
      };
      this.syncSuspectState();
      this.state.flags = { ...this.state.flags, 'used-hint-or-fallback': true };
      this.state.hintCount += 1;
      // All rounds exhausted with no majority win → go directly to failure result screen.
      this.state.result = this.computeResult();
      this.state.screen = 'result';
      this.state.overlay = null;
      this.emitEvent({ type: 'SUBMISSION_EVALUATED', timestamp: Date.now(), payload: { rating: this.state.result.rating } });
      return;
    }

    // D1: set success, no auto-jump; player uses "准备指认" button
    const hasLost = roundResults.some((r) => r === 'lost');
    const lastRound = rounds[rounds.length - 1];
    const lastRoundWon = roundResults[rounds.length - 1] === 'won';
    const finalFeedback = hasLost
      ? '你击穿了她最核心的谎言，但有些细节没能拿下。'
      : (lastRoundWon ? `${lastRound.onCorrectFeedback}\n\n${suspectConf.onSuccess}` : suspectConf.onSuccess);

    this.state.confrontation = { ...this.state.confrontation, status: 'success', lastFeedback: finalFeedback };
    this.syncSuspectState();
    this.state.flags = { ...this.state.flags, 'confrontation-complete': true };
    this.state.objective = '对质成功——点击"准备指认"选择嫌疑人并进入结案阶段。';
    this.primaryNotice = '证据似乎已经足够，你可以指认凶手了。';
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

  // T2.6-B: evaluates endingMatrix rules in order, returns first matching endingKey.
  private resolveEnding(result: ResultState): string {
    const caseConfig = loadCaseConfig(this.state.caseId);
    const matrix = caseConfig.endingMatrix;
    if (!matrix) return 'default';
    for (const rule of matrix.rules) {
      if (rule.when.minScore !== undefined && result.score < rule.when.minScore) continue;
      if (rule.when.submissionCorrect !== undefined && result.submissionCorrect !== rule.when.submissionCorrect) continue;
      return rule.endingKey;
    }
    return matrix.fallback;
  }

  private submitCaseConclusion(): void {
    const result = this.computeResult();
    const endingKey = this.resolveEnding(result);
    // Path-3 mental-sim console output
    console.log(`[T2.6-B] resolveEnding: score=${result.score} submissionCorrect=${result.submissionCorrect} → endingKey=${endingKey}`);
    if (!result.submissionCorrect) {
      this.state.wrongSubmissionCount += 1;
      if (this.state.wrongSubmissionCount >= 2) {
        this.primaryNotice = '提交偏差较多：优先核对”关键谎言”和”结论页去向”两项。';
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
    localStorage.removeItem(getSaveKey(this.state.caseId));
    window.location.reload();
  }

  private closeOverlay(): void {
    this.state.overlay = null;
    this.state.inspectCard = null;
    this.state.dialogueState = null;
    this.render();
  }

  private setInterpretation(clueId: string, tier: 'canonical' | 'partial' | 'misread'): void {
    const existing = this.state.interpretations.findIndex((c) => c.clueId === clueId);
    const choice: ClueInterpretationChoice = { clueId, selectedTier: tier, chosenAt: Date.now() };
    if (existing >= 0) {
      const updated = [...this.state.interpretations];
      updated[existing] = choice;
      this.state.interpretations = updated;
    } else {
      this.state.interpretations = [...this.state.interpretations, choice];
    }
    this.persistState();
  }

  private getInterpretationForClue(clueId: string): ClueInterpretationChoice | null {
    return this.state.interpretations.find((c) => c.clueId === clueId) ?? null;
  }

  private isClueInterpreted(clueId: string): boolean {
    return this.state.interpretations.some((c) => c.clueId === clueId);
  }

  private canEnterConfrontation(): boolean {
    const caseConfig = loadCaseConfig(this.state.caseId);
    const keyClues = caseConfig.clues.filter((c) => c.isKey);
    return keyClues.every((c) =>
      this.state.inventory.some((i) => i.id === c.id) &&
      this.isClueInterpreted(c.id)
    );
  }

  private clueIdHash(clueId: string): number {
    return clueId.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  }

  private getInterpretOptions(clue: ClueConfig): Array<{ tier: 'canonical' | 'partial' | 'misread'; label: string }> {
    const all: Array<{ tier: 'canonical' | 'partial' | 'misread'; label: string }> = [
      { tier: 'canonical', label: clue.interpretations.canonical.label },
      ...(clue.interpretations.partial ? [{ tier: 'partial' as const, label: clue.interpretations.partial.label }] : []),
      ...(clue.interpretations.misread ? [{ tier: 'misread' as const, label: clue.interpretations.misread.label }] : []),
    ];
    return this.clueIdHash(clue.id) % 2 === 1 ? [...all].reverse() : all;
  }

  // ── T2.6-B unlock / layer runtime ─────────────────────────────────────

  // Called once at startup (after state is populated from save).
  // Supplements saved clueRuntimeStates (which only cover collected clues from
  // migration) with entries for ALL case clues.  Entries already present are
  // left unchanged so existing layer progress is never reset.
  private initClueRuntimeStates(): void {
    const caseConfig = loadCaseConfig(this.state.caseId);
    const existing = new Map(this.state.clueRuntimeStates.map((rs) => [rs.clueId, rs]));
    for (const clue of caseConfig.clues) {
      if (existing.has(clue.id)) continue;
      let discoverable = true;
      const req = clue.unlockRequirement;
      if (req) {
        if (req.requiredClueIds?.length) {
          discoverable = req.requiredClueIds.every((id) => this.state.inventory.some((i) => i.id === id));
        }
        if (discoverable && req.requiredInterpretations?.length) {
          discoverable = req.requiredInterpretations.every((r) =>
            this.state.interpretations.some((i) => i.clueId === r.clueId && i.selectedTier === r.tier)
          );
        }
      }
      existing.set(clue.id, { clueId: clue.id, discoverable, currentLayer: 0 });
    }
    this.state.clueRuntimeStates = Array.from(existing.values());
  }

  // Scans all locked clues and promotes discoverable=true if their
  // unlockRequirement is now satisfied.  Called after every clue collection.
  private recomputeUnlockStates(caseConfig: StageCaseConfig): void {
    let changed = false;
    this.state.clueRuntimeStates = this.state.clueRuntimeStates.map((rs): ClueRuntimeState => {
      if (rs.discoverable) return rs;
      const clue = caseConfig.clues.find((c) => c.id === rs.clueId);
      if (!clue?.unlockRequirement) return rs;
      const req = clue.unlockRequirement;
      let now = true;
      if (req.requiredClueIds?.length) {
        now = req.requiredClueIds.every((id) => this.state.inventory.some((i) => i.id === id));
      }
      if (now && req.requiredInterpretations?.length) {
        now = req.requiredInterpretations.every((r) =>
          this.state.interpretations.some((i) => i.clueId === r.clueId && i.selectedTier === r.tier)
        );
      }
      if (now) {
        // Path-1 mental-sim console output
        console.log(`[T2.6-B] unlock recompute: clueId=${rs.clueId} discoverable: false→true`);
        changed = true;
        return { ...rs, discoverable: true };
      }
      return rs;
    });
    if (changed) this.persistState();
  }

  // Advances a collected clue's discoveryLayer by 1 (up to max).
  private advanceLayer(clueId: string): void {
    const caseConfig = loadCaseConfig(this.state.caseId);
    const clueDef = caseConfig.clues.find((c) => c.id === clueId);
    if (!clueDef?.discoveryLayers?.length) return;
    const maxLayer = clueDef.discoveryLayers.length - 1;
    this.state.clueRuntimeStates = this.state.clueRuntimeStates.map((rs) => {
      if (rs.clueId !== clueId || rs.currentLayer >= maxLayer) return rs;
      console.log(`[T2.6-B] advanceLayer: clueId=${clueId} layer ${rs.currentLayer}→${rs.currentLayer + 1}`);
      return { ...rs, currentLayer: rs.currentLayer + 1 };
    });
    this.persistState();
    this.render();
  }

  // ── T2.6-B multi-suspect confrontation helpers ────────────────────────

  // Returns the rounds array for the current suspect; falls back to legacy rounds.
  private getRoundsForCurrentSuspect(caseConfig: StageCaseConfig): ConfrontationRound[] {
    const sid = this.state.currentSuspectId;
    if (sid && caseConfig.confrontation.suspects?.length) {
      const s = caseConfig.confrontation.suspects.find((x) => x.suspectId === sid);
      if (s) return s.rounds;
    }
    return caseConfig.confrontation.rounds;
  }

  private getConfForCurrentSuspect(caseConfig: StageCaseConfig): { maxMistakesPerRound: number; onAllLost?: string; onSuccess: string } {
    const sid = this.state.currentSuspectId;
    if (sid && caseConfig.confrontation.suspects?.length) {
      const s = caseConfig.confrontation.suspects.find((x) => x.suspectId === sid);
      if (s) return s;
    }
    return caseConfig.confrontation;
  }

  // Writes flat confrontation state back into confrontationBySuspect dict.
  private syncSuspectState(): void {
    if (!this.state.currentSuspectId) return;
    this.state.confrontationBySuspect = {
      ...this.state.confrontationBySuspect,
      [this.state.currentSuspectId]: { ...this.state.confrontation },
    };
  }

  // outcome ∈ {canonical, partial, misread, irrelevant}
  private resolveOutcome(evidenceId: string, sentenceId: string, caseConfig: StageCaseConfig): 'canonical' | 'partial' | 'misread' | 'irrelevant' {
    const clue = caseConfig.clues.find((c) => c.id === evidenceId);
    if (!clue) { console.log(`[inventory] resolveOutcome: clue ${evidenceId} not found → irrelevant`); return 'irrelevant'; }
    const interp = this.getInterpretationForClue(evidenceId);
    if (!interp) { console.log(`[inventory] resolveOutcome: no interpretation for ${evidenceId} → irrelevant`); return 'irrelevant'; }
    const tierData = clue.interpretations[interp.selectedTier];
    if (!tierData) { console.log(`[inventory] resolveOutcome: tier ${interp.selectedTier} data missing for ${evidenceId} → irrelevant`); return 'irrelevant'; }
    const hits = tierData.attacksTestimonyIds.includes(sentenceId);
    console.log(`[inventory] resolveOutcome: evidence=${evidenceId} tier=${interp.selectedTier} attacksIds=${JSON.stringify(tierData.attacksTestimonyIds)} sentence=${sentenceId} hits=${hits} → ${hits ? interp.selectedTier : 'irrelevant'}`);
    if (hits) return interp.selectedTier;
    return 'irrelevant';
  }

  // 4-level fallback feedback: sentence.responses → round-level → global defaults
  private getFeedback(round: ConfrontationRound, sentence: TestimonySentence, outcome: 'canonical' | 'partial' | 'misread' | 'irrelevant'): string {
    if (outcome === 'canonical') return round.onCorrectFeedback;
    if (outcome === 'partial') return sentence.responses?.partial ?? round.onCorrectFeedback ?? FEEDBACK_DEFAULTS.partial;
    if (outcome === 'misread') return sentence.responses?.misread ?? round.onRoundLost ?? round.onWrongFeedback ?? FEEDBACK_DEFAULTS.misread;
    // irrelevant
    return sentence.responses?.irrelevant ?? round.onWrongFeedback ?? FEEDBACK_DEFAULTS.irrelevant;
  }

  private canAccuse(): boolean {
    return Object.values(this.state.confrontationBySuspect).some((conf) =>
      conf.roundResults.some((r) => r === 'won' || r === 'draw')
    );
  }

  private switchSuspect(suspectId: string): void {
    if (this.state.currentSuspectId === suspectId) return;
    this.syncSuspectState();
    const prev = this.state.currentSuspectId;
    const caseConfig = loadCaseConfig(this.state.caseId);
    if (!this.state.confrontationBySuspect[suspectId]) {
      const rounds = this.getRoundsForCurrentSuspect(caseConfig); // temp: borrow helper before setting new id
      const suspectConf = caseConfig.confrontation.suspects?.find((s) => s.suspectId === suspectId);
      const newRounds = suspectConf?.rounds ?? caseConfig.confrontation.rounds;
      this.state.confrontationBySuspect = {
        ...this.state.confrontationBySuspect,
        [suspectId]: { roundIndex: 0, mistakesInCurrentRound: 0, roundResults: newRounds.map(() => 'pending' as const), selectedSentenceId: null, status: 'ongoing', lastFeedback: '审视证人的每一句话。找出自相矛盾的那一句。' },
      };
      void rounds; // suppress unused warning
    }
    this.state.currentSuspectId = suspectId;
    this.state.confrontation = { ...this.state.confrontationBySuspect[suspectId] };
    // Path-2 mental-sim: suspect state preserved; Path-5: interpretations untouched
    console.log(`[T2.6-B] switchSuspect: ${prev}→${suspectId}. prev roundResults=${JSON.stringify(this.state.confrontationBySuspect[prev ?? '']?.roundResults)}`);
    console.log(`[T2.6-B] interpretations after switchSuspect (unchanged): ${this.state.interpretations.length} entries`);
    this.persistState();
    this.render();
  }

  private openAccuseDialog(): void {
    this.accuseDialogOpen = true;
    this.render();
  }

  private confirmAccuse(suspectId: string): void {
    // Path-6 mental-sim output
    console.log(`[T2.6-B] accuseDialog: selected suspectId=${suspectId}`);
    this.accuseDialogOpen = false;
    this.state.screen = 'deduction';
    this.state.overlay = null;
    this.persistState();
    this.render();
  }

  private openInterpretOverlay(clueId: string): void {
    const existing = this.getInterpretationForClue(clueId);
    this.interpretingClueId = clueId;
    this.pendingInterpretTier = existing?.selectedTier ?? null;
    this.state.overlay = 'interpret';
    this.render();
  }

  private closeInterpretOverlay(): void {
    this.interpretingClueId = null;
    this.pendingInterpretTier = null;
    this.state.overlay = null;
    this.render();
  }

  private selectInterpretTier(tier: 'canonical' | 'partial' | 'misread'): void {
    this.pendingInterpretTier = tier;
    this.render();
  }

  private confirmInterpret(): void {
    if (!this.interpretingClueId || !this.pendingInterpretTier) return;
    this.setInterpretation(this.interpretingClueId, this.pendingInterpretTier);
    this.primaryNotice = '解读已记录';
    this.interpretingClueId = null;
    this.pendingInterpretTier = null;
    this.state.overlay = null;
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

  private renderClueCards(): string {
    const caseConfig = loadCaseConfig(this.state.caseId);
    // Discovered clues in inventory
    const discoveredHtml = this.state.inventory
      .map((clue) => {
        const interpreted = this.isClueInterpreted(clue.id);
        const clueDef = caseConfig.clues.find((c) => c.id === clue.id);
        const layers = clueDef?.discoveryLayers ?? [];
        const rs = this.state.clueRuntimeStates.find((r) => r.clueId === clue.id);
        const currentLayer = rs?.currentLayer ?? 0;
        const hasMoreLayers = layers.length > 1 && currentLayer < layers.length - 1;
        const layerBadge = layers.length > 1 ? `<span class="layer-progress">L${currentLayer + 1}/${layers.length}</span>` : '';
        const deepenBtn = hasMoreLayers ? `<button class="clue-deepen-btn" data-deepen-clue="${clue.id}">深入交互</button>` : '';
        return `<div class="clue-evidence-row"><button class="clue-evidence-card" data-open-interpret="${clue.id}"><span class="clue-evidence-title">${clue.title}</span>${layerBadge}<span class="clue-badge ${interpreted ? 'is-interpreted' : ''}">${interpreted ? '已解读' : '未解读'}</span></button>${deepenBtn}</div>`;
      })
      .join('');
    // Locked clues: in case config, not collected, and discoverable=false
    const lockedHtml = caseConfig.clues
      .filter((c) => {
        if (this.state.inventory.some((i) => i.id === c.id)) return false;
        const rs = this.state.clueRuntimeStates.find((r) => r.clueId === c.id);
        return rs ? !rs.discoverable : false;
      })
      .map((c) => `<div class="clue-locked-card" title="收集所需前置证据后自动解锁"><span class="clue-lock-icon"></span><span class="clue-evidence-title">${c.title}</span></div>`)
      .join('');
    if (!discoveredHtml && !lockedHtml) return '<p>暂无收集证据</p>';
    return discoveredHtml + lockedHtml;
  }

  private renderInterpretOverlay(): string {
    if (this.state.overlay !== 'interpret' || !this.interpretingClueId) return '';
    const caseConfig = loadCaseConfig(this.state.caseId);
    const clue = caseConfig.clues.find((c) => c.id === this.interpretingClueId);
    if (!clue) return '';
    const rs = this.state.clueRuntimeStates.find((r) => r.clueId === clue.id);
    const layerIdx = rs?.currentLayer ?? 0;
    const description = clue.discoveryLayers?.[layerIdx]?.description ?? clue.discoveryLayers?.[0]?.description ?? clue.description;
    const options = this.getInterpretOptions(clue);
    // Path-4 mental-sim console output
    console.log(`[T2.6-B] renderInterpretOverlay: clueId=${clue.id} options=${options.length} layer=${layerIdx}`);
    const optionsHtml = options
      .map((opt) => {
        const isSelected = this.pendingInterpretTier === opt.tier;
        return `<button class="interpret-option ${isSelected ? 'is-selected' : ''}" data-interpret-tier="${opt.tier}">${opt.label}</button>`;
      })
      .join('');
    return `<section class="overlay interpret-overlay"><div class="interpret-card"><header class="interpret-header"><button class="ghost-btn interpret-back-btn" data-close-interpret="true">← 返回</button><h3 class="interpret-clue-title">${clue.title}</h3></header><p class="interpret-description">${description}</p><div class="interpret-options-list">${optionsHtml}</div><button class="primary-btn interpret-confirm-btn" data-confirm-interpret="true" ${this.pendingInterpretTier ? '' : 'disabled'}>确认解读</button></div></section>`;
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
    const conf = this.state.confrontation;
    const rounds = this.getRoundsForCurrentSuspect(caseConfig);
    const round = rounds[conf.roundIndex];
    const totalRounds = rounds.length;
    const suspectConf = this.getConfForCurrentSuspect(caseConfig);
    const suspects = caseConfig.confrontation.suspects ?? [];
    const currentChar = caseConfig.characters.find((c) => c.id === (this.state.currentSuspectId ?? caseConfig.confrontation.target));

    const emotion = round?.enterEmotion ?? 'neutral';
    const portraitSrc = currentChar?.emotionPortraits?.[emotion] ?? currentChar?.portrait ?? '/assets/cases/case-001/characters/portrait-fallback.png';

    // Suspect tabs (shown even for single suspect to establish the UI affordance)
    const suspectTabsHtml = suspects.length > 0
      ? `<div class="suspect-tabs">${suspects.map((s) => {
          const ch = caseConfig.characters.find((c) => c.id === s.suspectId);
          const active = s.suspectId === this.state.currentSuspectId;
          return `<button class="suspect-tab${active ? ' is-active' : ''}" data-switch-suspect="${s.suspectId}">${ch?.name ?? s.suspectId}</button>`;
        }).join('')}</div>`
      : '';

    const hasSelection = conf.selectedSentenceId !== null;
    type EvidenceDisplay = { id: string; title: string; source: string };
    const clueEvidence: EvidenceDisplay[] = this.state.inventory
      .filter((i) => this.isClueInterpreted(i.id))
      .map((i) => ({ id: i.id, title: i.title, source: i.source.split(' / ')[0] }));
    const testimonyEvidence: EvidenceDisplay[] = this.state.testimonies.map((t) => {
      const char = caseConfig.characters.find((c) => c.id === t.sourceCharacterId);
      return { id: t.id, title: t.title, source: char ? `${char.name}的证词` : '证词' };
    });
    const evidenceList: EvidenceDisplay[] = [...clueEvidence, ...testimonyEvidence];

    const sentencesHtml = round
      ? round.sentences
          .map((s) => {
            const isSelected = conf.selectedSentenceId === s.id;
            return `<button class="testimony-sentence${isSelected ? ' is-selected' : ''}" data-select-sentence="${s.id}">${s.text}</button>`;
          })
          .join('')
      : '';

    const roundBadges = conf.roundResults
      .map((r, i) => {
        const active = i === conf.roundIndex && conf.status === 'ongoing';
        return `<span class="round-badge is-${r}${active ? ' is-active' : ''}">${i + 1}</span>`;
      })
      .join('');

    const evidenceCardsHtml = evidenceList
      .map((item) => {
        return `<button class="evidence-card" data-present-evidence="${item.id}" ${hasSelection ? '' : 'disabled'}><strong>${item.title}</strong><small>${item.source}</small></button>`;
      })
      .join('');

    const evidenceHintText = hasSelection ? '选择一条证据反驳被选中的证词' : `先点击${currentChar?.name ?? '证人'}的某句证词，再出示证据`;

    const accusable = this.canAccuse();
    const successNotice = conf.status === 'success' || this.primaryNotice.includes('指认')
      ? `<p class="confront-success-notice">证据似乎已经足够，你可以指认凶手了。</p>` : '';

    const remain = suspectConf.maxMistakesPerRound - conf.mistakesInCurrentRound;

    return `<div class="screen-scrollable"><section class="confrontation-shell">
    <header class="confront-head">
      <div class="confront-head-left">
        <h2>关键对质</h2>
        <div class="round-progress">${roundBadges}</div>
        ${suspectTabsHtml}
      </div>
      <div class="confront-head-right">
        <p class="round-meta">回合 ${Math.min(conf.roundIndex + 1, totalRounds)} / ${totalRounds}</p>
        <p class="mistakes-meta">剩余容错 <strong>${Math.max(remain, 0)}</strong></p>
      </div>
    </header>
    ${successNotice}
    <div class="confront-stage">
      <img src="${portraitSrc}" alt="${currentChar?.name ?? '目标'}" class="confront-portrait" />
      <div class="testimony-panel">
        <h3 class="testimony-title">${currentChar?.name ?? '证人'}的证词</h3>
        <div class="testimony-list">${sentencesHtml}</div>
      </div>
    </div>
    <p class="confront-feedback">${conf.lastFeedback.replace(/\n/g, '<br>')}</p>
    <div class="evidence-section ${hasSelection ? 'is-active' : 'is-waiting'}">
      <h3 class="evidence-title">${evidenceHintText}</h3>
      <div class="evidence-grid">${evidenceCardsHtml}</div>
    </div>
    <div class="accuse-row">
      <button class="accuse-btn${accusable ? ' is-ready' : ''}" data-open-accuse-dialog="true" ${accusable ? '' : 'disabled'}>准备指认</button>
    </div>
  </section></div>`;
  }

  private renderAccuseDialog(): string {
    if (!this.accuseDialogOpen) return '';
    const caseConfig = loadCaseConfig(this.state.caseId);
    const suspects = caseConfig.confrontation.suspects ?? [];
    const suspectButtons = suspects.length > 0
      ? suspects.map((s) => {
          const ch = caseConfig.characters.find((c) => c.id === s.suspectId);
          return `<button class="accuse-suspect-btn primary-btn" data-confirm-accuse="${s.suspectId}">${ch?.name ?? s.suspectId}</button>`;
        }).join('')
      : `<button class="accuse-suspect-btn primary-btn" data-confirm-accuse="${caseConfig.confrontation.target}">${caseConfig.characters.find((c) => c.id === caseConfig.confrontation.target)?.name ?? caseConfig.confrontation.target}</button>`;
    return `<div class="accuse-dialog-overlay"><div class="accuse-dialog"><h3>指认嫌疑人</h3><p>你认为谁是本案的关键人物？</p><div class="accuse-suspects">${suspectButtons}</div><button class="ghost-btn" data-close-accuse-dialog="true">取消</button></div></div>`;
  }

  private renderDeductionBody(): string {
    const caseConfig = loadCaseConfig(this.state.caseId);
    const wipBanner = `<div class="wip-banner">⚙️ 推理阶段的交互玩法即将升级（T2-T3），当前仅展示核心数据。</div>`;
    return `
      <div class="screen-scrollable">
        <div class="deduction-top-bar"><button class="ghost-btn" data-screen="investigation">返回调查</button></div>
        ${wipBanner}
        <section class="screen-panel">
          <h2>时间验证</h2>
          <p class="deduction-guide">1. 从上方线索中点击选中（高亮表示已选）<br>2. 点击对应时间的槽位放置线索<br>3. 错误放置会显示 ✗，可重新点击换正确的线索</p>
          <div class="evidence-grid">
            ${this.state.inventory
              .filter((c) => c.isKey)
              .map((c) => `<button class="evidence-card ${this.state.timeline.selectedClueId === c.id ? 'is-selected' : ''}" data-select-timeline-clue="${c.id}"><strong>${c.title}</strong></button>`)
              .join('')}
          </div>
          <div class="timeline-grid">
            ${caseConfig.timelineSlots
              .map((slot) => {
                const placedClueId = this.state.timeline.placements[slot.id];
                const placedClue = placedClueId ? this.state.inventory.find((c) => c.id === placedClueId) : null;
                const isConflict = this.state.timeline.conflicts.includes(slot.id);
                let slotStatus: string;
                if (!placedClue) {
                  slotStatus = '（待放置）';
                } else if (isConflict) {
                  slotStatus = `✗ ${placedClue.title} — 证据不符`;
                } else {
                  slotStatus = `✓ ${placedClue.title}`;
                }
                const statusCls = !placedClue ? '' : isConflict ? 'is-conflict' : 'is-ok';
                return `<button class="timeline-slot ${isConflict ? 'is-conflict' : ''}" data-place-slot="${slot.id}"><strong>${slot.label}</strong><small class="timeline-slot-status ${statusCls}">${slotStatus}</small></button>`;
              })
              .join('')}
          </div>
          <p>${(() => {
            const totalSlots = caseConfig.timelineSlots.length;
            const placedCount = Object.keys(this.state.timeline.placements).length;
            const conflictCount = this.state.timeline.conflicts.length;
            if (placedCount < totalSlots) return `已放置 ${placedCount} / ${totalSlots} 条证据`;
            if (conflictCount > 0) return `⚠ 有 ${conflictCount} 处证据不符，请调整`;
            return '✓ 时间线已完整闭合';
          })()}</p>
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
    const FIELD_LABELS: Record<keyof SubmissionState, string> = {
      suspect: '嫌疑人',
      keyLie: '关键谎言',
      method: '作案手法',
      destination: '赃物去向',
    };
    const label = FIELD_LABELS[field];
    return `<div class="submission-group"><h3>${label}</h3><div class="evidence-grid">${options
      .map((opt) => `<button class="evidence-card ${this.state.submission[field] === opt ? 'is-selected' : ''}" data-submission-field="${field}" data-submission-value="${opt.replace(/"/g, '&quot;')}">${opt}</button>`)
      .join('')}</div></div>`;
  }

  private renderResultBody(): string {
    const caseConfig = loadCaseConfig(this.state.caseId);
    const result = this.state.result ?? this.computeResult();
    // T2.6-B: data-driven ending text via endingMatrix
    const endingKey = this.resolveEnding(result);
    const ending = caseConfig.endings?.[endingKey];
    const endingTitle = ending?.title ?? '案件归档';
    const endingBody = ending?.body ?? `你已锁定真相核心：${caseConfig.submission.correct.suspect}在会前拆封并转移结论页。`;
    return `
      <div class="screen-scrollable">
        <section class="screen-panel result-shell">
          <h2>${endingTitle}</h2>
          <div class="result-rating"><span>${result.rating}</span><small>${result.score} 分</small></div>
          <p class="result-truth">${endingBody}</p>
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

  private getNextActions(): string[] {
    const actions: string[] = [];
    if (!this.state.flags['first-contradiction-found']) actions.push('追问周岚，确认“封存后未触碰”是否成立');
    if (this.state.flags['first-contradiction-found'] && !this.state.inventory.some((item) => item.id === 'clue-camera-gap-0731')) actions.push('前往走廊监控区补全 07:31 空档');
    if (this.state.flags['first-contradiction-found'] && !this.state.inventory.some((item) => item.id === 'clue-shred-label')) actions.push('检查茶水间回收桶，追索碎纸来源');
    if (this.state.flags['first-contradiction-found'] && !this.state.flags['confrontation-complete']) actions.push('证据足够后进入关键对质');
    return actions.slice(0, 2);
  }

  private renderInvestigationBody(background: string): string {
    const nextActions = this.getNextActions();
    const canStartConfrontation = this.state.flags['first-contradiction-found'];
    const chenxuWitnessCollected = this.state.testimonies.some((t) => t.id === 'testimony-chenxu-witness');
    return `<div class="screen-scrollable">
      ${this.renderSceneTabs()}
      <div class="investigation-layout">
        <div class="investigation-stage" style="background-image:url('${background}'), url('/assets/cases/case-001/scenes/review_room.jpg')"><div class="hotspot-layer">${this.renderHotspots()}</div></div>
        <aside class="pressure-panel">
          <section><h3>调查判断</h3><p>${this.state.objective}</p></section>
          <section class="clue-cards-section"><h3>证据库</h3>${this.renderClueCards()}</section>
          <section><h3>下一步</h3><ul>${(nextActions.length ? nextActions : ['继续现场排查并形成可施压问题']).map((item) => `<li>${item}</li>`).join('')}</ul>
            ${canStartConfrontation && !chenxuWitnessCollected ? '<p class="confrontation-hint">⚠ 证据可能尚未齐全：尝试再次追问陈序，或继续探索其他场景。</p>' : ''}
            ${this.state.flags['first-contradiction-found'] && !this.state.flags['confrontation-complete'] ? `<button class="primary-btn" data-start-confrontation="true" ${this.canEnterConfrontation() ? '' : 'disabled'}>进入关键对质</button>` : ''}
            ${this.state.flags['confrontation-complete'] && this.state.screen !== 'deduction' && this.state.screen !== 'result' ? '<button class="primary-btn" data-screen="deduction">进入时间验证与提交</button>' : ''}
          </section>
        </aside>
      </div>
      ${this.renderCharacterCards()}
      ${DEV_MODE ? `<section class="dev-panel"><h3>DEV 事件</h3><ul class="event-feed">${this.state.eventFeed.map((evt) => `<li>${evt.type}</li>`).join('')}</ul></section>` : ''}
    </div>`;
  }

  private renderArchiveBody(): string {
    const canContinue = this.state.screen !== 'archive' || this.state.inventory.length > 0 || this.state.testimonies.length > 0;
    return `
      <section class="archive-shell" style="background-image:url('/assets/cases/case-001/scenes/archive_cover.jpg'), url('/assets/cases/case-001/scenes/review_room.jpg')">
        <header class="archive-header">
          <div>
            <h1>档案室 / CASE ARCHIVE</h1>
            <p>选择档案并进入调查</p>
          </div>
          ${this.onExit ? '<button class="ghost-btn subtle-btn" data-exit-to-selector="true">← 返回选择</button>' : ''}
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
            ${this.renderInspectOverlay()}${this.renderDialogueOverlay()}${this.renderHintOverlay()}${this.renderInterpretOverlay()}${this.renderAccuseDialog()}
          </section>
          ${DEV_MODE && !archiveOrIntro ? `<aside class="case-board ${this.boardOpen ? 'is-open' : ''}">
            <h2>案件板</h2>
            ${this.state.restoreNotice ? `<section><p>${this.state.restoreNotice}</p></section>` : ''}
            ${this.primaryNotice ? `<section><h3>提示</h3><p>${this.primaryNotice}</p></section>` : ''}
            <section><h3>当前 Objective</h3><p>${this.state.objective}</p></section>
            <section><h3>案发时段 / 地点</h3><p>${caseConfig.timeRange} · ${caseConfig.location}</p></section>
            <section><h3>第一处矛盾</h3><p>${this.state.contradictionMessage ?? '尚未成立'}</p></section>
            <section><h3>关键对质</h3><p>${this.state.flags['confrontation-complete'] ? '已完成' : '未完成'}</p>${this.state.flags['first-contradiction-found'] && !this.state.flags['confrontation-complete'] ? `<button class="primary-btn" data-start-confrontation="true" ${this.canEnterConfrontation() ? '' : 'disabled'}>进入关键对质</button>` : ''}${this.state.flags['confrontation-complete'] && this.state.screen !== 'deduction' && this.state.screen !== 'result' ? '<button class="primary-btn" data-screen="deduction">进入时间验证与提交</button>' : ''}</section>
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
    this.root.querySelectorAll<HTMLButtonElement>('[data-present-evidence]').forEach((button) => button.addEventListener('click', () => { const evidenceId = button.dataset.presentEvidence; if (!evidenceId) return; const caseConf = loadCaseConfig(this.state.caseId); const outcome = this.resolveOutcome(evidenceId, this.state.confrontation.selectedSentenceId ?? '', caseConf); this.playSfx(outcome === 'canonical' ? CONFRONT_SUCCESS_AUDIO : CONTRADICTION_AUDIO, outcome === 'canonical' ? 0.48 : 0.34); this.presentEvidence(evidenceId); }));
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
    this.root.querySelectorAll<HTMLButtonElement>('[data-open-interpret]').forEach((btn) =>
      btn.addEventListener('click', () => { const id = btn.dataset.openInterpret; if (id) this.openInterpretOverlay(id); })
    );
    this.root.querySelectorAll<HTMLButtonElement>('[data-interpret-tier]').forEach((btn) =>
      btn.addEventListener('click', () => { const tier = btn.dataset.interpretTier as 'canonical' | 'partial' | 'misread'; if (tier) this.selectInterpretTier(tier); })
    );
    const confirmInterpret = this.root.querySelector<HTMLButtonElement>('[data-confirm-interpret="true"]');
    if (confirmInterpret) confirmInterpret.addEventListener('click', () => this.confirmInterpret());
    const closeInterpret = this.root.querySelector<HTMLButtonElement>('[data-close-interpret="true"]');
    if (closeInterpret) closeInterpret.addEventListener('click', () => this.closeInterpretOverlay());
    const exitToSelector = this.root.querySelector<HTMLButtonElement>('[data-exit-to-selector="true"]');
    if (exitToSelector) exitToSelector.addEventListener('click', () => this.onExit?.());
    // T2.6-B: layer deep-dive
    this.root.querySelectorAll<HTMLButtonElement>('[data-deepen-clue]').forEach((btn) =>
      btn.addEventListener('click', () => { const id = btn.dataset.deepenClue; if (id) this.advanceLayer(id); })
    );
    // T2.6-B: suspect switching
    this.root.querySelectorAll<HTMLButtonElement>('[data-switch-suspect]').forEach((btn) =>
      btn.addEventListener('click', () => { const id = btn.dataset.switchSuspect; if (id) this.switchSuspect(id); })
    );
    // T2.6-B: accuse dialog
    const openAccuse = this.root.querySelector<HTMLButtonElement>('[data-open-accuse-dialog="true"]');
    if (openAccuse) openAccuse.addEventListener('click', () => this.openAccuseDialog());
    const closeAccuse = this.root.querySelector<HTMLButtonElement>('[data-close-accuse-dialog="true"]');
    if (closeAccuse) closeAccuse.addEventListener('click', () => { this.accuseDialogOpen = false; this.render(); });
    this.root.querySelectorAll<HTMLButtonElement>('[data-confirm-accuse]').forEach((btn) =>
      btn.addEventListener('click', () => { const id = btn.dataset.confirmAccuse; if (id) this.confirmAccuse(id); })
    );
  }
}
