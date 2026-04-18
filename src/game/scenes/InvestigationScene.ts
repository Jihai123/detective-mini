import * as Phaser from 'phaser';
import { getCaseById } from '../../data/cases';
import { getCaseSession, startCaseSession } from '../systems/InvestigationSessionStore';
import { drawPanel, drawWorkbenchBackground, fadeInScene, makeButton } from './ui';

type InvestigationData = { caseId: string; resetSession?: boolean };

export class InvestigationScene extends Phaser.Scene {
  private caseId = '';

  constructor() {
    super('InvestigationScene');
  }

  init(data: InvestigationData) {
    this.caseId = data.caseId;
    const caseFile = getCaseById(this.caseId);
    if (!caseFile) throw new Error('Case not found');
    if (data.resetSession) startCaseSession(caseFile);
  }

  create() {
    const caseFile = getCaseById(this.caseId);
    if (!caseFile) throw new Error('Case not found');
    const state = getCaseSession(caseFile);

    drawWorkbenchBackground(this);
    fadeInScene(this);

    drawPanel(this, 48, 44, 980, 810, '场景调查 / INVESTIGATION');
    drawPanel(this, 1042, 44, 350, 810, '调查日志');

    this.add.text(70, 90, caseFile.title, { fontSize: '28px', color: '#f8fafc', fontStyle: 'bold' });
    this.add.text(70, 126, '点击热区收集观察信息。先调查，再归档。', { fontSize: '14px', color: '#7dd3fc' });

    const bgKey = caseFile.id === 'tutorial-001' ? 'bg-tutorial-001' : caseFile.id === 'case-001' ? 'bg-case-001' : undefined;
    if (bgKey && this.textures.exists(bgKey)) {
      this.add.image(530, 430, bgKey).setDisplaySize(920, 520).setAlpha(0.45);
    }
    this.add.rectangle(70, 170, 920, 520, 0x0f172a, 0.55).setOrigin(0, 0).setStrokeStyle(1, 0x334155);
    this.add.text(92, 188, `场景：${caseFile.archiveMeta.location}`, { fontSize: '16px', color: '#c4b5fd' });

    const detailBox = this.add.rectangle(70, 704, 920, 130, 0x0b1424, 1).setOrigin(0, 0).setStrokeStyle(1, 0x3b82f6);
    const detailText = this.add.text(88, 722, '选择热区后显示观察结果。', {
      fontSize: '14px',
      color: '#dbeafe',
      wordWrap: { width: 884 },
      lineSpacing: 5
    });

    const positions = [
      { x: 120, y: 260 },
      { x: 430, y: 240 },
      { x: 730, y: 300 },
      { x: 240, y: 470 },
      { x: 620, y: 500 }
    ];

    const progressHotspotText = this.add.text(1060, 100, '', { fontSize: '14px', color: '#fbbf24' });
    const progressClueText = this.add.text(1060, 124, '', { fontSize: '14px', color: '#93c5fd' });
    const linesText = this.add.text(1060, 170, '', { fontSize: '13px', color: '#cbd5e1', lineSpacing: 6, wordWrap: { width: 310 } });
    const refreshLog = () => {
      progressHotspotText.setText(`热区进度：${state.discoveredHotspots.size}/${caseFile.hotspots.length}`);
      progressClueText.setText(`已发现线索：${state.discoveredClues.size}/${caseFile.clues.length}`);
      linesText.setText(
        caseFile.hotspots.map((hotspot) => `${state.discoveredHotspots.has(hotspot.id) ? '✔' : '·'} ${hotspot.label} / ${hotspot.region}`).join('\n')
      );
    };
    refreshLog();

    caseFile.hotspots.forEach((hotspot, index) => {
      const p = positions[index % positions.length];
      const discovered = state.discoveredHotspots.has(hotspot.id);
      const marker = this.add.circle(p.x, p.y, 26, discovered ? 0x22c55e : 0x38bdf8, discovered ? 0.9 : 0.7).setStrokeStyle(2, 0xe2e8f0, 0.9);
      const label = this.add.text(p.x + 34, p.y - 10, hotspot.label, { fontSize: '14px', color: '#e2e8f0' });

      marker.setInteractive({ useHandCursor: true });
      marker.on('pointerover', () => marker.setScale(1.1));
      marker.on('pointerout', () => marker.setScale(1));
      marker.on('pointerdown', () => {
        state.discoveredHotspots.add(hotspot.id);
        hotspot.clueIds.forEach((id) => state.discoveredClues.add(id));
        hotspot.conversationIds.forEach((id) => state.unlockedConversations.add(id));
        marker.setFillStyle(0x22c55e, 0.95);

        detailBox.setStrokeStyle(1, 0x22c55e);
        detailText.setText(
          `${hotspot.label}（${hotspot.region}）\n${hotspot.description}\n\n发现：${hotspot.discoveryText}\n解锁线索：${hotspot.clueIds.length} 条，谈话：${hotspot.conversationIds.length} 条`
        );
        refreshLog();
      });
      this.add.existing(label);
    });

    makeButton(this, 1060, 690, 312, 40, '人物档案与谈话', 0x2563eb, () => this.scene.start('ProfilesScene', { caseId: caseFile.id }));
    makeButton(this, 1060, 740, 312, 40, '线索归档板', 0x0ea5e9, () => this.scene.start('EvidenceBoardScene', { caseId: caseFile.id }));
    makeButton(this, 1060, 790, 152, 40, '导入页', 0x1f2937, () => this.scene.start('BriefingScene', { caseId: caseFile.id }));
    makeButton(this, 1220, 790, 152, 40, '时间线板', 0x7c3aed, () => this.scene.start('TimelineScene', { caseId: caseFile.id }));
  }
}
