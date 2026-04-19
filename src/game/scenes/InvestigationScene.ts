import * as Phaser from 'phaser';
import { getCaseById } from '../../data/cases';
import type { EvidenceCategory } from '../../domain/types';
import { getCaseAssetTextureKey } from '../systems/CaseAssetStore';
import { getCaseSession, startCaseSession } from '../systems/InvestigationSessionStore';
import { evaluateCase } from '../systems/ScoreSystem';
import { addContainedImage, fadeInScene, makeButton } from './ui';

type InvestigationData = { caseId: string; resetSession?: boolean };
type BottomTab = 'suspects' | 'evidence' | 'timeline' | 'submit';

const CATEGORY_NAME: Record<EvidenceCategory, string> = {
  testimony: '证词',
  physical: '物证',
  record: '记录',
  surveillance: '监控',
  extra: '补充'
};

const HOTSPOT_POSITIONS: Record<string, { x: number; y: number }> = {
  'c1-h1': { x: 462, y: 248 },
  'c1-h2': { x: 760, y: 222 },
  'c1-h3': { x: 954, y: 324 },
  'c1-h4': { x: 616, y: 432 },
  'c1-h5': { x: 832, y: 476 }
};

export class InvestigationScene extends Phaser.Scene {
  private caseId = '';
  private activeTab: BottomTab = 'suspects';
  private selectedSuspectId = '';
  private focusHotspotId = '';

  private bgImage?: Phaser.GameObjects.Image;
  private tabContent?: Phaser.GameObjects.Container;

  constructor() {
    super('InvestigationScene');
  }

  init(data: InvestigationData) {
    this.caseId = data.caseId;
    const caseFile = getCaseById(this.caseId);
    if (!caseFile) throw new Error('Case not found');
    if (data.resetSession) startCaseSession(caseFile);
    this.selectedSuspectId = caseFile.suspects[0]?.id ?? '';
    this.focusHotspotId = '';
  }

  create() {
    const caseFile = getCaseById(this.caseId);
    if (!caseFile) throw new Error('Case not found');

    this.drawImmersiveBackground(caseFile, 'main');
    fadeInScene(this);

    this.add.rectangle(24, 18, 1392, 864, 0x020617, 0.22).setOrigin(0, 0).setStrokeStyle(1, 0x334155, 0.9);

    this.add.rectangle(36, 32, 1020, 540, 0x020617, 0.22).setOrigin(0, 0).setStrokeStyle(1, 0x64748b, 0.35);
    this.add.rectangle(1070, 32, 334, 820, 0x020617, 0.62).setOrigin(0, 0).setStrokeStyle(1, 0x475569, 0.9);
    this.add.rectangle(36, 590, 1020, 262, 0x020617, 0.66).setOrigin(0, 0).setStrokeStyle(1, 0x475569, 0.9);

    this.add.text(56, 48, `${caseFile.title} ｜ 主调查场景`, { fontSize: '24px', color: '#f8fafc', fontStyle: 'bold' });
    this.add.text(56, 82, `地点：${caseFile.archiveMeta.location}  ·  时间窗：${caseFile.archiveMeta.incidentWindow}`, {
      fontSize: '14px',
      color: '#93c5fd'
    });
    this.add.text(56, 108, `当前目标：${caseFile.briefing.objective}`, {
      fontSize: '13px',
      color: '#fef08a',
      wordWrap: { width: 980 }
    });

    this.add.rectangle(50, 140, 990, 412, 0x020617, 0.24).setOrigin(0, 0);
    this.add.text(64, 150, '点击场景热点调查，解锁观察、对话与物证。', { fontSize: '13px', color: '#cbd5e1' });

    this.renderHotspots(caseFile.id);
    this.renderRightBoard(caseFile.id);
    this.renderBottomTabs(caseFile.id);
    this.renderTabContent(caseFile.id);
  }

  private drawImmersiveBackground(caseFile: NonNullable<ReturnType<typeof getCaseById>>, sceneAsset: string): void {
    const requested = getCaseAssetTextureKey(caseFile, 'scenes', sceneAsset);
    const fallback = getCaseAssetTextureKey(caseFile, 'scenes', 'main');
    const key = requested && this.textures.exists(requested) ? requested : fallback && this.textures.exists(fallback) ? fallback : undefined;

    this.cameras.main.setBackgroundColor('#020617');
    if (!key) {
      this.add.rectangle(0, 0, 1440, 900, 0x020617, 1).setOrigin(0, 0);
      return;
    }

    if (!this.bgImage) {
      this.bgImage = this.add.image(720, 450, key).setAlpha(0.92);
    } else {
      this.bgImage.setTexture(key).setVisible(true);
    }

    const source = this.textures.get(key).getSourceImage() as { width: number; height: number };
    const scale = Math.max(1440 / source.width, 900 / source.height);
    this.bgImage.setScale(scale);

    this.add.rectangle(0, 0, 1440, 900, 0x020617, 0.44).setOrigin(0, 0);
  }

  private renderHotspots(caseId: string): void {
    const caseFile = getCaseById(caseId);
    if (!caseFile) return;
    const state = getCaseSession(caseFile);

    caseFile.hotspots.forEach((hotspot, index) => {
      const pos = HOTSPOT_POSITIONS[hotspot.id] ?? { x: 460 + index * 90, y: 250 + (index % 2) * 88 };
      const inspected = state.discoveredHotspots.has(hotspot.id);
      const root = this.add.container(pos.x, pos.y);

      const pulse = this.add.circle(0, 0, 24, inspected ? 0x22c55e : 0xf59e0b, inspected ? 0.18 : 0.26);
      const halo = this.add.circle(0, 0, 14, inspected ? 0x22c55e : 0xf8fafc, inspected ? 0.46 : 0.88).setStrokeStyle(1, 0xffffff, 0.65);
      const center = this.add.rectangle(0, 0, 12, 12, inspected ? 0x22c55e : 0xfacc15, 1).setAngle(45);
      const labelBg = this.add.rectangle(0, 38, 184, 28, 0x020617, 0.54).setStrokeStyle(1, 0x64748b, 0.6);
      const label = this.add.text(-84, 28, hotspot.label, { fontSize: '12px', color: inspected ? '#86efac' : '#f8fafc' });

      root.add([pulse, halo, center, labelBg, label]);
      labelBg.setInteractive({ useHandCursor: true });
      halo.setInteractive({ useHandCursor: true });

      this.tweens.add({ targets: pulse, scale: 1.6, alpha: 0.04, duration: 1300, yoyo: false, repeat: -1, ease: 'Sine.InOut' });

      const hoverIn = () => {
        halo.setStrokeStyle(2, 0xffffff, 1);
        labelBg.setFillStyle(0x0f172a, 0.78);
      };
      const hoverOut = () => {
        halo.setStrokeStyle(1, 0xffffff, 0.65);
        labelBg.setFillStyle(0x020617, 0.54);
      };
      const investigate = () => {
        state.discoveredHotspots.add(hotspot.id);
        hotspot.clueIds.forEach((id) => state.discoveredClues.add(id));
        hotspot.conversationIds.forEach((id) => state.unlockedConversations.add(id));
        this.focusHotspotId = hotspot.id;

        const hintColor = hotspot.conversationIds.length > 0 ? '#86efac' : '#fcd34d';
        this.showObservationCard(
          hotspot.label,
          `${hotspot.description}\n\n${hotspot.discoveryText}\n\n解锁线索 ${hotspot.clueIds.length} 条 · 解锁对话 ${hotspot.conversationIds.length} 条`,
          hintColor
        );

        if (hotspot.sceneAsset) {
          this.drawImmersiveBackground(caseFile, hotspot.sceneAsset);
        }
        this.time.delayedCall(1200, () => {
          this.scene.restart({ caseId: caseFile.id });
        });
      };

      [halo, labelBg].forEach((target) => {
        target.on('pointerover', hoverIn);
        target.on('pointerout', hoverOut);
        target.on('pointerdown', investigate);
      });
    });
  }

  private showObservationCard(title: string, body: string, accent: string): void {
    const overlay = this.add.container(90, 186);
    const bg = this.add.rectangle(0, 0, 820, 250, 0x020617, 0.92).setOrigin(0, 0).setStrokeStyle(2, Phaser.Display.Color.HexStringToColor(accent).color, 0.9);
    const titleText = this.add.text(22, 18, `观察结果｜${title}`, { fontSize: '20px', color: accent, fontStyle: 'bold' });
    const bodyText = this.add.text(22, 54, body, { fontSize: '15px', color: '#e2e8f0', wordWrap: { width: 776 }, lineSpacing: 6 });
    const close = this.add.text(744, 18, '关闭', { fontSize: '15px', color: '#fca5a5', fontStyle: 'bold' }).setInteractive({ useHandCursor: true });
    close.on('pointerdown', () => overlay.destroy());
    overlay.add([bg, titleText, bodyText, close]);
  }

  private renderRightBoard(caseId: string): void {
    const caseFile = getCaseById(caseId);
    if (!caseFile) return;
    const state = getCaseSession(caseFile);

    this.add.text(1088, 52, '调查板 / LOG', { fontSize: '20px', color: '#f8fafc', fontStyle: 'bold' });
    const clueCounterText = this.add.text(1088, 88, '', { fontSize: '13px', color: '#93c5fd', lineSpacing: 6 });

    const latestHotspot = caseFile.hotspots.find((hotspot) => hotspot.id === this.focusHotspotId) ?? null;
    const latestText = latestHotspot
      ? `最近调查：${latestHotspot.label}\n${latestHotspot.discoveryText}`
      : '最近调查：尚未触发。先点击场景中的热点。';

    this.add.text(1088, 158, latestText, {
      fontSize: '13px',
      color: latestHotspot ? '#fde68a' : '#cbd5e1',
      wordWrap: { width: 302 },
      lineSpacing: 6
    });

    const discoveredClues = caseFile.clues.filter((clue) => state.discoveredClues.has(clue.id));
    const clueList = discoveredClues.length === 0 ? '尚无线索' : discoveredClues.map((item) => `• ${item.title}`).join('\n');

    this.add.text(1088, 300, '已发现线索', { fontSize: '15px', color: '#a5b4fc', fontStyle: 'bold' });
    this.add.text(1088, 324, clueList, { fontSize: '12px', color: '#e2e8f0', wordWrap: { width: 302 }, lineSpacing: 5 });

    this.add.text(1088, 520, '当前目标', { fontSize: '15px', color: '#a5b4fc', fontStyle: 'bold' });
    const missing = caseFile.hotspots.filter((h) => !state.discoveredHotspots.has(h.id));
    this.add.text(1088, 548, missing.length === 0 ? '全部热点已调查，进入证据归纳与提交阶段。' : missing.slice(0, 3).map((h) => `- 调查 ${h.label}`).join('\n'), {
      fontSize: '12px',
      color: '#e2e8f0',
      wordWrap: { width: 302 },
      lineSpacing: 5
    });

    clueCounterText.setText([
      `热点进度：${state.discoveredHotspots.size}/${caseFile.hotspots.length}`,
      `线索进度：${state.discoveredClues.size}/${caseFile.clues.length}`,
      `对话解锁：${state.unlockedConversations.size}/${caseFile.conversations.length}`
    ]);
  }

  private renderBottomTabs(caseId: string): void {
    const tabs: Array<{ id: BottomTab; label: string }> = [
      { id: 'suspects', label: '人物对话' },
      { id: 'evidence', label: '证据板' },
      { id: 'timeline', label: '时间线' },
      { id: 'submit', label: '提交结论' }
    ];

    let x = 58;
    tabs.forEach((tab) => {
      makeButton(this, x, 602, 130, 36, tab.label, this.activeTab === tab.id ? 0x1d4ed8 : 0x334155, () => {
        this.activeTab = tab.id;
        this.renderTabContent(caseId);
      });
      x += 140;
    });

    makeButton(this, 56, 810, 120, 32, '返回导入', 0x1f2937, () => this.scene.start('BriefingScene', { caseId }));
  }

  private renderTabContent(caseId: string): void {
    this.tabContent?.destroy();
    this.tabContent = this.add.container(52, 646);

    if (this.activeTab === 'suspects') this.buildSuspectPanel(caseId);
    if (this.activeTab === 'evidence') this.buildEvidencePanel(caseId);
    if (this.activeTab === 'timeline') this.buildTimelinePanel(caseId);
    if (this.activeTab === 'submit') this.buildSubmitPanel(caseId);
  }

  private buildSuspectPanel(caseId: string): void {
    const caseFile = getCaseById(caseId);
    if (!caseFile || !this.tabContent) return;
    const state = getCaseSession(caseFile);

    this.tabContent.add(this.add.rectangle(0, 0, 996, 198, 0x020617, 0.4).setOrigin(0, 0).setStrokeStyle(1, 0x475569));

    let x = 16;
    caseFile.suspects.forEach((suspect) => {
      const active = suspect.id === this.selectedSuspectId;
      makeButton(this, 52 + x, 652, 120, 30, suspect.name, active ? 0x2563eb : 0x1f2937, () => {
        this.selectedSuspectId = suspect.id;
        this.renderTabContent(caseId);
      });
      x += 128;
    });

    const suspect = caseFile.suspects.find((s) => s.id === this.selectedSuspectId) ?? caseFile.suspects[0];
    const portrait = suspect?.portraitAsset ? getCaseAssetTextureKey(caseFile, 'characters', suspect.portraitAsset) : undefined;
    this.tabContent.add(this.add.rectangle(14, 42, 180, 144, 0x020617, 0.74).setOrigin(0, 0).setStrokeStyle(1, 0x64748b));
    if (portrait && this.textures.exists(portrait)) {
      this.tabContent.add(addContainedImage(this, 18, 46, 172, 136, portrait, 1));
    }

    if (!suspect) return;
    this.tabContent.add(this.add.text(208, 46, `${suspect.name}｜${suspect.role}`, { fontSize: '18px', color: '#f8fafc', fontStyle: 'bold' }));
    this.tabContent.add(
      this.add.text(208, 74, `${suspect.identity}\n${suspect.relationToCase}\n可疑点：${suspect.suspiciousPoint}`, {
        fontSize: '13px',
        color: '#cbd5e1',
        wordWrap: { width: 326 },
        lineSpacing: 5
      })
    );

    this.tabContent.add(this.add.rectangle(552, 42, 428, 144, 0x020617, 0.62).setOrigin(0, 0).setStrokeStyle(1, 0x64748b));
    const unlocked = caseFile.conversations.filter((conv) => conv.suspectId === suspect.id && state.unlockedConversations.has(conv.id));
    const locked = caseFile.conversations.filter((conv) => conv.suspectId === suspect.id && !state.unlockedConversations.has(conv.id));

    const convoText = unlocked.length
      ? unlocked.map((conv) => `【${conv.title}】\n${conv.lines.map((line) => `- ${line}`).join('\n')}`).join('\n\n')
      : '暂无已解锁问询记录。继续调查热点以触发新的对话片段。';

    this.tabContent.add(this.add.text(566, 48, '审讯记录', { fontSize: '15px', color: '#a5b4fc', fontStyle: 'bold' }));
    this.tabContent.add(this.add.text(566, 74, convoText, { fontSize: '12px', color: '#e2e8f0', wordWrap: { width: 400 }, lineSpacing: 4 }));
    if (locked.length) {
      this.tabContent.add(this.add.text(566, 168, `未解锁片段 ${locked.length} 条（由调查进度触发）`, { fontSize: '11px', color: '#fcd34d' }));
    }
  }

  private buildEvidencePanel(caseId: string): void {
    const caseFile = getCaseById(caseId);
    if (!caseFile || !this.tabContent) return;
    const state = getCaseSession(caseFile);
    const discovered = caseFile.clues.filter((clue) => state.discoveredClues.has(clue.id));

    this.tabContent.add(this.add.rectangle(0, 0, 996, 198, 0x020617, 0.4).setOrigin(0, 0).setStrokeStyle(1, 0x475569));
    this.tabContent.add(this.add.text(14, 10, '案件板（多选关键证据，点击可取消）', { fontSize: '14px', color: '#a5b4fc' }));

    let y = 34;
    discovered.slice(0, 3).forEach((clue) => {
      const selected = state.selectedKeyEvidence.has(clue.id);
      const card = this.add.rectangle(14, y, 592, 46, selected ? 0x1d4ed8 : 0x111827, 0.96).setOrigin(0, 0).setStrokeStyle(1, selected ? 0x7dd3fc : 0x475569);
      const text = this.add.text(24, y + 7, `[${CATEGORY_NAME[clue.category]}] ${clue.title}\n${clue.summary}`, {
        fontSize: '11px',
        color: '#e2e8f0',
        wordWrap: { width: 572 }
      });
      card.setInteractive({ useHandCursor: true }).on('pointerdown', () => {
        if (state.selectedKeyEvidence.has(clue.id)) state.selectedKeyEvidence.delete(clue.id);
        else state.selectedKeyEvidence.add(clue.id);
        this.renderTabContent(caseId);
      });
      this.tabContent?.add([card, text]);
      y += 52;
    });

    const selectedItems = caseFile.clues.filter((clue) => state.selectedKeyEvidence.has(clue.id));
    const supportOrConflict = this.describeEvidenceRelation(selectedItems);
    this.tabContent.add(this.add.rectangle(620, 34, 362, 152, 0x0f172a, 0.88).setOrigin(0, 0).setStrokeStyle(1, 0x475569));
    this.tabContent.add(this.add.text(632, 42, `已标记关键证据：${selectedItems.length}`, { fontSize: '13px', color: '#93c5fd', fontStyle: 'bold' }));
    this.tabContent.add(
      this.add.text(
        632,
        64,
        selectedItems.length === 0 ? '尚未标记关键证据。' : `${selectedItems.map((item) => `• ${item.title}`).join('\n')}\n\n关系：${supportOrConflict}`,
        { fontSize: '11px', color: '#e2e8f0', wordWrap: { width: 338 }, lineSpacing: 4 }
      )
    );
  }

  private describeEvidenceRelation(selectedItems: Array<{ relatedSuspectIds: string[] }>): string {
    if (selectedItems.length < 2) return '至少选中两条证据后展示“支撑/冲突”关系。';
    const suspectFrequency = new Map<string, number>();
    selectedItems.forEach((item) => {
      item.relatedSuspectIds.forEach((id) => suspectFrequency.set(id, (suspectFrequency.get(id) ?? 0) + 1));
    });
    const strong = Array.from(suspectFrequency.entries()).filter(([, count]) => count >= 2);
    if (strong.length > 0) return `支撑：${strong.map(([id]) => id).join('、')} 的嫌疑链条。`;
    return '冲突：当前证据指向人物分散，需要重新组合。';
  }

  private buildTimelinePanel(caseId: string): void {
    const caseFile = getCaseById(caseId);
    if (!caseFile || !this.tabContent) return;
    const state = getCaseSession(caseFile);

    this.tabContent.add(this.add.rectangle(0, 0, 996, 198, 0x020617, 0.4).setOrigin(0, 0).setStrokeStyle(1, 0x475569));
    this.tabContent.add(this.add.text(14, 10, '时间线推理工具（点击格子循环切换）', { fontSize: '14px', color: '#a5b4fc' }));

    const columnW = 188;
    caseFile.timelineSlots.forEach((slot, index) => {
      this.tabContent?.add(this.add.text(140 + index * columnW, 30, slot.label, { fontSize: '11px', color: '#93c5fd' }));
    });

    let rowY = 52;
    caseFile.suspects.forEach((suspect) => {
      this.tabContent?.add(this.add.text(14, rowY + 10, suspect.name, { fontSize: '12px', color: '#e2e8f0' }));
      caseFile.timelineSlots.forEach((slot, col) => {
        const x = 140 + col * columnW;
        const selected = state.timelineSelections[suspect.id]?.[slot.id] ?? '';
        const isConflict = selected.length > 0 && this.isTimelineConflict(caseId, suspect.id, slot.id, selected);
        const cell = this.add.rectangle(x, rowY, 176, 34, isConflict ? 0x7f1d1d : selected ? 0x1d4ed8 : 0x0f172a, 1).setOrigin(0, 0).setStrokeStyle(1, isConflict ? 0xfda4af : 0x475569);
        const text = this.add.text(x + 6, rowY + 9, selected || '未填', { fontSize: '11px', color: '#e2e8f0', wordWrap: { width: 164 } });
        cell.setInteractive({ useHandCursor: true }).on('pointerdown', () => {
          const cycle = [''].concat(slot.options);
          const current = state.timelineSelections[suspect.id]?.[slot.id] ?? '';
          const next = cycle[(cycle.indexOf(current) + 1) % cycle.length];
          if (next) state.timelineSelections[suspect.id][slot.id] = next;
          else delete state.timelineSelections[suspect.id][slot.id];
          this.renderTabContent(caseId);
        });
        this.tabContent?.add([cell, text]);
      });
      rowY += 44;
    });

    const total = caseFile.timelineSlots.length * caseFile.suspects.length;
    const filled = caseFile.suspects.reduce((sum, suspect) => sum + Object.keys(state.timelineSelections[suspect.id] ?? {}).length, 0);
    const conflicts = this.countTimelineConflicts(caseId);
    this.tabContent.add(this.add.text(14, 178, `完成度：${filled}/${total} ｜ 冲突项：${conflicts}（红色）`, { fontSize: '12px', color: conflicts ? '#fca5a5' : '#86efac' }));
  }

  private isTimelineConflict(caseId: string, suspectId: string, slotId: string, value: string): boolean {
    const caseFile = getCaseById(caseId);
    if (!caseFile) return false;
    const expected = caseFile.solution.expectedTimeline[suspectId]?.[slotId];
    if (!expected) return false;
    return expected !== value;
  }

  private countTimelineConflicts(caseId: string): number {
    const caseFile = getCaseById(caseId);
    if (!caseFile) return 0;
    const state = getCaseSession(caseFile);
    let count = 0;
    caseFile.suspects.forEach((suspect) => {
      caseFile.timelineSlots.forEach((slot) => {
        const value = state.timelineSelections[suspect.id]?.[slot.id];
        if (value && this.isTimelineConflict(caseId, suspect.id, slot.id, value)) count += 1;
      });
    });
    return count;
  }

  private buildSubmitPanel(caseId: string): void {
    const caseFile = getCaseById(caseId);
    if (!caseFile || !this.tabContent) return;
    const state = getCaseSession(caseFile);

    this.tabContent.add(this.add.rectangle(0, 0, 996, 198, 0x020617, 0.4).setOrigin(0, 0).setStrokeStyle(1, 0x475569));
    this.tabContent.add(this.add.text(14, 10, '提交结论（在主场景内完成）', { fontSize: '14px', color: '#a5b4fc' }));

    let x = 14;
    caseFile.suspects.forEach((suspect) => {
      makeButton(this, 52 + x, 684, 102, 30, suspect.name, state.culpritId === suspect.id ? 0xdc2626 : 0x1f2937, () => {
        state.culpritId = state.culpritId === suspect.id ? undefined : suspect.id;
        this.renderTabContent(caseId);
      });
      x += 110;
    });

    const discovered = caseFile.clues.filter((clue) => state.discoveredClues.has(clue.id));
    const lieOptions = discovered.slice(0, 3);
    let lx = 14;
    lieOptions.forEach((clue) => {
      makeButton(this, 52 + lx, 720, 218, 30, clue.title.slice(0, 12), state.keyLieClueId === clue.id ? 0x0ea5e9 : 0x1f2937, () => {
        state.keyLieClueId = state.keyLieClueId === clue.id ? undefined : clue.id;
        this.renderTabContent(caseId);
      });
      lx += 226;
    });

    makeButton(this, 52 + 14, 756, 214, 30, '编辑作案方式', 0x7c3aed, () => {
      const result = window.prompt('输入作案方式推理（留空可清空）', state.methodTheory);
      if (result !== null) {
        state.methodTheory = result.trim();
        this.renderTabContent(caseId);
      }
    });

    const total = caseFile.timelineSlots.length * caseFile.suspects.length;
    const filled = caseFile.suspects.reduce((sum, suspect) => sum + Object.keys(state.timelineSelections[suspect.id] ?? {}).length, 0);
    const summary = [
      `锁定嫌疑人：${caseFile.suspects.find((suspect) => suspect.id === state.culpritId)?.name ?? '未选'}`,
      `关键谎言：${caseFile.clues.find((clue) => clue.id === state.keyLieClueId)?.title ?? '未选'}`,
      `关键证据：${state.selectedKeyEvidence.size} 条`,
      `时间线完成：${filled}/${total}`,
      `冲突项：${this.countTimelineConflicts(caseId)}`,
      `作案方式：${state.methodTheory ? '已填写' : '未填写'}`
    ].join('\n');

    this.tabContent.add(this.add.rectangle(362, 42, 620, 144, 0x0f172a, 0.88).setOrigin(0, 0).setStrokeStyle(1, 0x475569));
    this.tabContent.add(this.add.text(376, 52, summary, { fontSize: '12px', color: '#e2e8f0', lineSpacing: 6 }));

    makeButton(this, 52 + 818, 804, 180, 36, '提交并生成结案报告', 0x16a34a, () => {
      const result = evaluateCase({ caseFile, state });
      this.scene.start('CaseReportScene', { caseId: caseFile.id, result });
    });
  }
}
