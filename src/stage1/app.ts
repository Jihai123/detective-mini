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

export class StageOneApp {
  private readonly root: HTMLElement;

  private readonly events = new EventTarget();

  private boardOpen = false;

  private loading = true;

  private primaryNotice = '';

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
        existingSave?.confrontation ?? { roundIndex: 0, mistakes: 0, lastFeedback: '完成调查后开始关键对质。', status: 'idle' },
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
      .map((id) => caseConfig.characters.find((c) => c.id === id)?.avatar)
      .filter((v): v is string => Boolean(v));
    return Promise.all([
      this.preloadImage(scene.background),
      this.preloadImage('/assets/cases/case-001/scenes/meeting_room.jpg'),
      this.preloadImage('/assets/cases/case-001/characters/linlan.png'),
      this.preloadImage('/assets/ui/icons/new-dot.svg'),
      ...chars.map((src) => this.preloadImage(src)),
    ]);
  }

  private preloadDeferredAssets(): void {
    const caseConfig = loadCaseConfig(this.state.caseId);
    const urls = [
      ...caseConfig.scenes.map((s) => s.background),
      ...caseConfig.characters.map((c) => c.portrait),
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

  private investigateHotspot(hotspotId: string): void {
    const caseConfig = loadCaseConfig(this.state.caseId);
    const scene = caseConfig.scenes.find((item) => item.id === this.state.currentSceneId);
    const hotspot = scene?.hotspots.find((item) => item.id === hotspotId);
    if (!scene || !hotspot) return;
    if (!this.evalCondition(hotspot.unlockCondition).ok) return;
    hotspot.onInteract.forEach((effect) => this.applyHotspotEffect(caseConfig.clues, hotspot, effect));
    this.evaluateFirstContradiction();
    this.emitEvent({ type: 'HOTSPOT_INVESTIGATED', timestamp: Date.now(), payload: { hotspotId } });
    this.state.updatedAt = Date.now();
    this.persistState();
    this.render();
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
    this.state.screen = 'confrontation';
    this.state.confrontation = { roundIndex: 0, mistakes: 0, status: 'ongoing', lastFeedback: '选择证据，逐轮击穿周岚防线。' };
    this.persistState();
    this.render();
  }

  private presentEvidence(evidenceId: string): void {
    const caseConfig = loadCaseConfig(this.state.caseId);
    const conf = caseConfig.confrontation;
    const round = conf.rounds[this.state.confrontation.roundIndex];
    if (!round || this.state.confrontation.status !== 'ongoing') return;

    if (evidenceId === round.correctEvidence) {
      const next = this.state.confrontation.roundIndex + 1;
      if (next >= conf.rounds.length) {
        this.state.confrontation = { ...this.state.confrontation, roundIndex: next, status: 'success', lastFeedback: conf.onSuccess };
        this.state.flags = { ...this.state.flags, 'confrontation-complete': true };
        this.state.objective = '对质完成，进入时间验证并提交结案归纳。';
        this.state.screen = 'deduction';
      } else {
        this.state.confrontation = { ...this.state.confrontation, roundIndex: next, lastFeedback: round.correctFeedback };
      }
    } else {
      const mistakes = this.state.confrontation.mistakes + 1;
      if (mistakes > conf.maxMistakes) {
        this.state.confrontation = { ...this.state.confrontation, mistakes, status: 'failed', lastFeedback: conf.onFail };
        this.state.flags = { ...this.state.flags, 'used-hint-or-fallback': true };
        this.state.overlay = 'hint';
        this.state.hintCount += 1;
        this.primaryNotice = '关键对质受挫：建议先补齐 camera-gap 与 shred-label 再回来。';
        this.state.screen = 'investigation';
        this.state.objective = '对质受挫，回调查区补证据后再战。';
      } else {
        this.state.confrontation = { ...this.state.confrontation, mistakes, lastFeedback: round.wrongFeedback };
        this.primaryNotice = '这次质证点偏了，换一个能直接冲击防线的证据。';
      }
    }

    this.emitEvent({ type: 'CONFRONTATION_PROGRESS', timestamp: Date.now(), payload: { round: `${this.state.confrontation.roundIndex}` } });
    this.persistState();
    this.render();
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
    return `<section class="scene-tabs">${caseConfig.scenes
      .map((scene) => {
        const unlocked = this.evalCondition(scene.unlockCondition).ok;
        return `<button class="ghost-btn ${scene.id === this.state.currentSceneId ? 'is-active' : ''}" data-scene-id="${scene.id}" ${unlocked ? '' : 'disabled'}>${scene.label}</button>`;
      })
      .join('')}</section>`;
  }

  private renderHotspots(): string {
    const caseConfig = loadCaseConfig(this.state.caseId);
    const scene = caseConfig.scenes.find((s) => s.id === this.state.currentSceneId);
    if (!scene) return '';
    return scene.hotspots
      .map((hotspot) => `<button class="hotspot" data-hotspot-id="${hotspot.id}" style="left:${hotspot.position.x}%;top:${hotspot.position.y}%;"><span>${hotspot.label}</span></button>`)
      .join('');
  }

  private getCharacterCardStatus(character: CharacterConfig): { hasNew: boolean; label: string } {
    const caseConfig = loadCaseConfig(this.state.caseId);
    const nodes = caseConfig.dialogueNodes.filter((n) => n.characterId === character.id);
    const hasNew = nodes.some((node) => !this.state.visitedDialogueNodes.includes(node.id));
    return { hasNew, label: hasNew ? '可追问 / 新内容' : '已读' };
  }

  private renderCharacterCards(): string {
    const caseConfig = loadCaseConfig(this.state.caseId);
    const scene = caseConfig.scenes.find((s) => s.id === this.state.currentSceneId);
    if (!scene) return '';
    const chars = scene.characterIds.map((id) => caseConfig.characters.find((c) => c.id === id)).filter((c): c is CharacterConfig => Boolean(c));
    return `<section class="character-dock">${chars
      .map((character) => {
        const status = this.getCharacterCardStatus(character);
        return `<button class="character-card" data-character-id="${character.id}"><img src="${character.avatar}" alt="${character.name}" onerror="this.src='/assets/cases/case-001/characters/linlan.png'" /><div><strong>${character.name}</strong><p>${character.role}</p><span class="card-status ${status.hasNew ? 'has-new' : ''}"><img src="/assets/ui/icons/new-dot.svg" alt="s" />${status.label}</span></div></button>`;
      })
      .join('')}</section>`;
  }

  private renderInspectOverlay(): string {
    if (this.state.overlay !== 'inspect' || !this.state.inspectCard) return '';
    const clue = this.state.inspectCard.clue;
    return `<section class="overlay"><div class="inspect-card"><h3>现场观察卡</h3><p class="inspect-from">来源：${clue?.source ?? this.state.inspectCard.hotspotLabel}</p>${clue?.image ? `<img class="inspect-image" src="${clue.image}" alt="${clue.title}" onerror="this.src='/assets/cases/case-001/scenes/meeting_room.jpg'" />` : ''}<h4>${clue?.title ?? '暂无新增线索'}</h4><p>${clue?.description ?? ''}</p><button data-close-overlay="true" class="primary-btn">继续调查</button></div></section>`;
  }

  private renderHintOverlay(): string {
    if (this.state.overlay !== 'hint') return '';
    return `<section class="overlay"><div class="inspect-card"><h3>回退提示</h3><p>关键证据不足，请补齐后重新进入关键对质。</p><button data-close-overlay="true" class="primary-btn">继续调查</button></div></section>`;
  }

  private renderOption(option: DialogueOption): string {
    const check = this.evalCondition(option.unlockCondition ?? option.condition);
    return `<button class="dialogue-option ${check.ok ? '' : 'is-locked'}" data-dialogue-to="${option.to}" ${check.ok ? '' : 'disabled'}>${option.label}${!check.ok && DEV_MODE ? `<small>未解锁：${check.missing.join(' / ')}</small>` : ''}</button>`;
  }

  private renderDialogueOverlay(): string {
    if (this.state.overlay !== 'dialogue' || !this.state.dialogueState) return '';
    const caseConfig = loadCaseConfig(this.state.caseId);
    const node = caseConfig.dialogueNodes.find((n) => n.id === this.state.dialogueState?.nodeId);
    const character = caseConfig.characters.find((c) => c.id === this.state.dialogueState?.characterId);
    if (!node || !character) return '';
    const line = node.lines[this.state.dialogueState.lineIndex] ?? '';
    const end = this.state.dialogueState.lineIndex >= node.lines.length - 1;
    return `<section class="overlay dialogue-overlay"><div class="dialogue-card emotion-${node.emotion}"><img class="portrait" src="${character.portrait}" alt="${character.name}" onerror="this.src='/assets/cases/case-001/characters/linlan.png'" /><div class="dialogue-main"><header><h3>${character.name}</h3><p>${character.role} · 情绪：${node.emotion}</p></header><article>${line}</article><div class="dialogue-controls">${end ? '<span>请选择追问：</span>' : '<button data-dialogue-next="true" class="ghost-btn">继续</button>'}<button data-close-overlay="true" class="ghost-btn">结束对话</button></div>${end ? `<div class="dialogue-options">${node.options.map((o) => this.renderOption(o)).join('')}</div>` : ''}</div></div></section>`;
  }

  private renderConfrontationBody(): string {
    const caseConfig = loadCaseConfig(this.state.caseId);
    const target = caseConfig.characters.find((c) => c.id === caseConfig.confrontation.target);
    const round = caseConfig.confrontation.rounds[this.state.confrontation.roundIndex];
    const remain = caseConfig.confrontation.maxMistakes - this.state.confrontation.mistakes;
    return `<section class="confrontation-shell"><h2>关键对质 / 目标：${target?.name ?? caseConfig.confrontation.target}</h2><p>回合 ${Math.min(this.state.confrontation.roundIndex + 1, caseConfig.confrontation.rounds.length)} / ${caseConfig.confrontation.rounds.length} ｜ 错误 ${this.state.confrontation.mistakes} ｜ 剩余容错 ${remain}</p><article class="defense-line">${round?.defense ?? '对质结束'}</article><p class="confront-feedback">${this.state.confrontation.lastFeedback}</p><h3>出示证据反驳</h3><div class="evidence-grid">${this.state.inventory
      .map((item) => `<button class="evidence-card" data-present-evidence="${item.id}"><strong>${item.title}</strong><small>${item.source}</small></button>`)
      .join('')}</div></section>`;
  }

  private renderDeductionBody(): string {
    const caseConfig = loadCaseConfig(this.state.caseId);
    return `
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
      <section class="screen-panel">
        <h2>结案报告</h2>
        <p>评级：<strong>${result.rating}</strong>（${result.score} 分）</p>
        <p>关键线索发现率：${result.clueRate}%</p>
        <p>时间验证完成：${result.timelineComplete ? '是' : '否'}</p>
        <p>是否触发提示/失败回退：${result.usedHintOrFallback ? '是' : '否'}</p>
        <h3>玩家结论 vs 正确真相</h3>
        <ul>
          <li>嫌疑人：${this.state.submission.suspect} / 正确：${correct.suspect}</li>
          <li>关键谎言：${this.state.submission.keyLie} / 正确：${correct.keyLie}</li>
          <li>实施方式：${this.state.submission.method} / 正确：${correct.method}</li>
          <li>最终去向：${this.state.submission.destination} / 正确：${correct.destination}</li>
        </ul>
        <button class="ghost-btn" data-screen="archive">返回档案室</button>
        <button class="primary-btn" data-restart-case="true">重开案件</button>
      </section>
      <section class="screen-panel">
        <h2>真相回放</h2>
        ${caseConfig.truthReplay
          .map((seg) => `<article class="replay-segment"><h3>${seg.timeAnchor} · ${seg.title}</h3><p>${seg.summary}</p><small>关联证据：${seg.evidenceIds.join(' / ')}</small></article>`)
          .join('')}
      </section>
    `;
  }

  private render(): void {
    if (this.loading) {
      this.root.innerHTML = `<main class="stage-shell"><section class="screen-panel"><h2>载入案件资源中…</h2><p>正在优先准备当前场景、角色与核心 UI。</p></section></main>`;
      return;
    }
    const caseConfig = loadCaseConfig(this.state.caseId);
    const updatedAt = new Date(this.state.updatedAt).toLocaleString('zh-CN', { hour12: false });

    this.root.innerHTML = `
      <main class="stage-shell">
        <header class="status-bar">
          <div class="status-left"><p class="status-kicker">单舞台侦探系统 / 阶段 6</p><h1>${caseConfig.title}</h1></div>
          <div class="status-right"><div><span>Screen</span><strong>${this.state.screen}</strong></div><div><span>Case</span><strong>${this.state.caseId}</strong></div><div><span>存档时间</span><strong>${updatedAt}</strong></div></div>
        </header>
        <section class="stage-main">
          <section class="visual-stage">
            <div class="screen-tag">SCREEN / ${this.state.screen.toUpperCase()}</div>
            ${this.getScreenBody(caseConfig.introLines, caseConfig.scenes.find((s) => s.id === this.state.currentSceneId)?.background ?? caseConfig.scenes[0].background)}
            ${this.renderInspectOverlay()}${this.renderDialogueOverlay()}${this.renderHintOverlay()}
          </section>
          <aside class="case-board ${this.boardOpen ? 'is-open' : ''}">
            <h2>案件板</h2>
            ${this.state.restoreNotice ? `<section><p>${this.state.restoreNotice}</p></section>` : ''}
            ${this.primaryNotice ? `<section><h3>提示</h3><p>${this.primaryNotice}</p></section>` : ''}
            <section><h3>当前 Objective</h3><p>${this.state.objective}</p></section>
            <section><h3>案发时段 / 地点</h3><p>${caseConfig.timeRange} · ${caseConfig.location}</p></section>
            <section><h3>第一处矛盾</h3><p>${this.state.contradictionMessage ?? '尚未成立'}</p></section>
            <section><h3>关键对质</h3><p>${this.state.flags['confrontation-complete'] ? '已完成' : '未完成'}</p>${this.state.flags['first-contradiction-found'] && !this.state.flags['confrontation-complete'] ? '<button class="primary-btn" data-start-confrontation="true">进入关键对质</button>' : ''}${this.state.flags['confrontation-complete'] && this.state.screen !== 'deduction' && this.state.screen !== 'result' ? '<button class="primary-btn" data-screen="deduction">进入时间验证与提交</button>' : ''}</section>
            ${DEV_MODE ? `<section><h3>DEV 事件</h3><ul class="event-feed">${this.state.eventFeed.map((evt) => `<li>${evt.type}</li>`).join('')}</ul></section>` : ''}
          </aside>
        </section>
        <footer class="interaction-bar"><div class="quick-actions"><button data-screen="archive" class="ghost-btn">archive</button><button data-screen="intro" class="ghost-btn">intro</button><button data-screen="investigation" class="ghost-btn">investigation</button><button data-toggle-board="true" class="ghost-btn">案件板</button></div><button data-next="true" class="primary-btn" ${this.state.screen === 'investigation' ? 'disabled' : ''}>推进到下一主屏</button></footer>
      </main>`;

    this.bindEvents();
  }

  private getScreenBody(introLines: string[], background: string): string {
    if (this.state.screen === 'archive') return `<div class="screen-panel"><h2>档案室入口</h2><p>选择 case-001 并完成完整结案闭环。</p></div>`;
    if (this.state.screen === 'intro') return `<div class="screen-panel"><h2>案件引导</h2><ul>${introLines.map((line) => `<li>${line}</li>`).join('')}</ul></div>`;
    if (this.state.screen === 'confrontation') return this.renderConfrontationBody();
    if (this.state.screen === 'deduction') return this.renderDeductionBody();
    if (this.state.screen === 'result') return this.renderResultBody();
    return `${this.renderSceneTabs()}<div class="investigation-stage" style="background-image:url('${background}'), url('/assets/cases/case-001/scenes/meeting_room.jpg')"><div class="hotspot-layer">${this.renderHotspots()}</div></div>${this.renderCharacterCards()}`;
  }

  private goNextScreen(): void {
    const i = SCREEN_SEQUENCE.indexOf(this.state.screen);
    const next = SCREEN_SEQUENCE[i + 1];
    if (next) this.setScreen(next);
  }

  private bindEvents(): void {
    this.root.querySelectorAll<HTMLButtonElement>('[data-screen]').forEach((button) => button.addEventListener('click', () => { const s = button.dataset.screen as Screen | undefined; if (s) this.setScreen(s); }));
    this.root.querySelectorAll<HTMLButtonElement>('[data-hotspot-id]').forEach((button) => button.addEventListener('click', () => button.dataset.hotspotId && this.investigateHotspot(button.dataset.hotspotId)));
    this.root.querySelectorAll<HTMLButtonElement>('[data-character-id]').forEach((button) => button.addEventListener('click', () => button.dataset.characterId && this.openDialogue(button.dataset.characterId)));
    this.root.querySelectorAll<HTMLButtonElement>('[data-dialogue-to]').forEach((button) => button.addEventListener('click', () => button.dataset.dialogueTo && this.jumpDialogueNode(button.dataset.dialogueTo)));
    const dialogueNext = this.root.querySelector<HTMLButtonElement>('[data-dialogue-next="true"]');
    if (dialogueNext) dialogueNext.addEventListener('click', () => this.advanceDialogueLine());
    const close = this.root.querySelector<HTMLButtonElement>('[data-close-overlay="true"]');
    if (close) close.addEventListener('click', () => this.closeOverlay());
    const next = this.root.querySelector<HTMLButtonElement>('[data-next="true"]');
    if (next) next.addEventListener('click', () => this.goNextScreen());
    this.root.querySelectorAll<HTMLButtonElement>('[data-scene-id]').forEach((button) => button.addEventListener('click', () => { const id = button.dataset.sceneId; if (!id) return; const scene = loadCaseConfig(this.state.caseId).scenes.find((s) => s.id === id); if (!scene || !this.evalCondition(scene.unlockCondition).ok) return; this.state.currentSceneId = scene.id; this.persistState(); this.render(); }));
    const startConf = this.root.querySelector<HTMLButtonElement>('[data-start-confrontation="true"]');
    if (startConf) startConf.addEventListener('click', () => this.startConfrontation());
    this.root.querySelectorAll<HTMLButtonElement>('[data-present-evidence]').forEach((button) => button.addEventListener('click', () => button.dataset.presentEvidence && this.presentEvidence(button.dataset.presentEvidence)));
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
