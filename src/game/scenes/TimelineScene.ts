import * as Phaser from 'phaser';
import { getCaseById } from '../../data/cases';
import { getCaseSession } from '../systems/InvestigationSessionStore';
import { drawPanel, drawWorkbenchBackground, fadeInScene, makeButton } from './ui';

type SceneData = { caseId: string };

export class TimelineScene extends Phaser.Scene {
  private caseId = '';

  constructor() {
    super('TimelineScene');
  }

  init(data: SceneData) {
    this.caseId = data.caseId;
  }

  create() {
    const caseFile = getCaseById(this.caseId);
    if (!caseFile) throw new Error('Case not found');
    const state = getCaseSession(caseFile);

    drawWorkbenchBackground(this);
    fadeInScene(this);

    drawPanel(this, 48, 44, 1344, 810, '时间线推理板 / TIMELINE BOARD');
    this.add.text(74, 88, '横轴=时间，纵轴=人物。点击格子循环选择地点/行为，再次循环可清空。', { fontSize: '14px', color: '#93c5fd' });

    const startX = 74;
    const startY = 140;
    const nameWidth = 160;
    const cellW = Math.floor((1200 - nameWidth) / caseFile.timelineSlots.length);

    this.add.rectangle(startX, startY, nameWidth, 48, 0x1f2937, 1).setOrigin(0, 0).setStrokeStyle(1, 0x475569);
    this.add.text(startX + 12, startY + 14, '人物 / 时间', { fontSize: '14px', color: '#e2e8f0' });

    caseFile.timelineSlots.forEach((slot, idx) => {
      const x = startX + nameWidth + idx * cellW;
      this.add.rectangle(x, startY, cellW, 48, 0x1f2937, 1).setOrigin(0, 0).setStrokeStyle(1, 0x475569);
      this.add.text(x + 10, startY + 14, slot.label, { fontSize: '13px', color: '#c4b5fd', wordWrap: { width: cellW - 16 } });
    });

    let rowY = startY + 50;
    caseFile.suspects.forEach((suspect) => {
      this.add.rectangle(startX, rowY, nameWidth, 62, 0x0b1424, 1).setOrigin(0, 0).setStrokeStyle(1, 0x334155);
      this.add.text(startX + 10, rowY + 22, suspect.name, { fontSize: '14px', color: '#e2e8f0' });

      caseFile.timelineSlots.forEach((slot, idx) => {
        const x = startX + nameWidth + idx * cellW;
        const cell = this.add.rectangle(x, rowY, cellW, 62, 0x0f172a, 1).setOrigin(0, 0).setStrokeStyle(1, 0x334155);
        const text = this.add.text(x + 8, rowY + 18, '', { fontSize: '12px', color: '#94a3b8', wordWrap: { width: cellW - 16 } });

        const refreshCell = () => {
          const value = state.timelineSelections[suspect.id]?.[slot.id];
          if (!value) {
            cell.setFillStyle(0x0f172a);
            text.setText('未填');
            text.setColor('#94a3b8');
            return;
          }
          cell.setFillStyle(0x1d4ed8);
          text.setText(value);
          text.setColor('#dbeafe');
        };

        refreshCell();
        cell.setInteractive({ useHandCursor: true });
        cell.on('pointerdown', () => {
          const all = [''].concat(slot.options);
          const current = state.timelineSelections[suspect.id]?.[slot.id] ?? '';
          const next = all[(all.indexOf(current) + 1) % all.length];
          if (next) {
            state.timelineSelections[suspect.id][slot.id] = next;
          } else {
            delete state.timelineSelections[suspect.id][slot.id];
          }
          refreshCell();
          refreshProgress();
        });
      });

      rowY += 64;
    });

    const progressText = this.add.text(74, 690, '', { fontSize: '15px', color: '#fbbf24' });
    const refreshProgress = () => {
      const total = caseFile.timelineSlots.length * caseFile.suspects.length;
      const filled = caseFile.suspects.reduce((sum, suspect) => sum + Object.keys(state.timelineSelections[suspect.id] ?? {}).length, 0);
      progressText.setText(`时间线完成度：${filled}/${total}`);
    };
    refreshProgress();

    this.add.text(74, 724, '提示：点击格子可重填；循环到空值即为取消。', { fontSize: '13px', color: '#94a3b8' });

    makeButton(this, 74, 786, 170, 40, '返回调查', 0x1f2937, () => this.scene.start('InvestigationScene', { caseId: caseFile.id }));
    makeButton(this, 252, 786, 170, 40, '人物谈话', 0x2563eb, () => this.scene.start('ProfilesScene', { caseId: caseFile.id }));
    makeButton(this, 430, 786, 170, 40, '线索归档', 0x0ea5e9, () => this.scene.start('EvidenceBoardScene', { caseId: caseFile.id }));
    makeButton(this, 608, 786, 170, 40, '结案提交', 0x16a34a, () => this.scene.start('DeductionScene', { caseId: caseFile.id }));
  }
}
