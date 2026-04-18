import * as Phaser from 'phaser';
import { getCaseById } from '../../data/cases';
import { evaluateCase } from '../systems/ScoreSystem';
import { getCaseSession } from '../systems/InvestigationSessionStore';
import { drawCaseSceneBackground, drawPanel, fadeInScene, makeButton } from './ui';

type SceneData = { caseId: string };

export class DeductionScene extends Phaser.Scene {
  private caseId = '';

  constructor() {
    super('DeductionScene');
  }

  init(data: SceneData) {
    this.caseId = data.caseId;
  }

  create() {
    const caseFile = getCaseById(this.caseId);
    if (!caseFile) throw new Error('Case not found');
    const state = getCaseSession(caseFile);

    drawCaseSceneBackground(this, caseFile, 'archive');
    fadeInScene(this);

    drawPanel(this, 48, 44, 1344, 810, '结案提交 / FINAL DEDUCTION');

    this.add.text(72, 90, '确认你的判断后再提交。你可以回到前页继续调整。', { fontSize: '15px', color: '#93c5fd' });

    this.add.text(72, 132, '锁定嫌疑人', { fontSize: '18px', color: '#e2e8f0', fontStyle: 'bold' });
    let sx = 72;
    caseFile.suspects.forEach((suspect) => {
      const selected = state.culpritId === suspect.id;
      const btn = this.add.rectangle(sx, 164, 220, 38, selected ? 0x1d4ed8 : 0x1f2937, 1).setOrigin(0, 0).setStrokeStyle(1, 0x475569);
      this.add.text(sx + 10, 176, suspect.name, { fontSize: '15px', color: '#e2e8f0' });
      btn.setInteractive({ useHandCursor: true });
      btn.on('pointerdown', () => {
        state.culpritId = state.culpritId === suspect.id ? undefined : suspect.id;
        this.scene.restart({ caseId: caseFile.id });
      });
      sx += 232;
    });

    this.add.text(72, 224, '关键谎言线索', { fontSize: '18px', color: '#e2e8f0', fontStyle: 'bold' });

    const discoveredClues = caseFile.clues.filter((clue) => state.discoveredClues.has(clue.id));
    let y = 256;
    discoveredClues.slice(0, 6).forEach((clue) => {
      const selected = state.keyLieClueId === clue.id;
      const row = this.add.rectangle(72, y, 860, 46, selected ? 0x1d4ed8 : 0x0f172a, 1).setOrigin(0, 0).setStrokeStyle(1, selected ? 0x7dd3fc : 0x334155);
      this.add.text(84, y + 14, `${clue.title} (${clue.category})`, { fontSize: '14px', color: '#e2e8f0', wordWrap: { width: 832 } });
      row.setInteractive({ useHandCursor: true });
      row.on('pointerdown', () => {
        state.keyLieClueId = state.keyLieClueId === clue.id ? undefined : clue.id;
        this.scene.restart({ caseId: caseFile.id });
      });
      y += 54;
    });

    this.add.text(72, 596, '作案方式文本', { fontSize: '18px', color: '#e2e8f0', fontStyle: 'bold' });
    const theoryBox = this.add.rectangle(72, 628, 860, 108, 0x0f172a, 1).setOrigin(0, 0).setStrokeStyle(1, 0x334155);
    const theoryText = this.add.text(86, 646, state.methodTheory || '点击输入你的作案方式推理（支持修改/清空）', {
      fontSize: '14px',
      color: state.methodTheory ? '#f8fafc' : '#94a3b8',
      wordWrap: { width: 828 },
      lineSpacing: 5
    });
    theoryBox.setInteractive({ useHandCursor: true });
    theoryBox.on('pointerdown', () => {
      const result = window.prompt('输入作案方式推理（留空可清空）', state.methodTheory);
      if (result !== null) {
        state.methodTheory = result.trim();
        this.scene.restart({ caseId: caseFile.id });
      }
    });

    const keyEvidence = caseFile.clues.filter((clue) => state.selectedKeyEvidence.has(clue.id));
    const totalTimeline = caseFile.timelineSlots.length * caseFile.suspects.length;
    const filledTimeline = caseFile.suspects.reduce((sum, suspect) => sum + Object.keys(state.timelineSelections[suspect.id] ?? {}).length, 0);

    drawPanel(this, 958, 132, 414, 604, '提交前摘要');
    this.add.text(
      976,
      176,
      [
        `嫌疑人：${caseFile.suspects.find((s) => s.id === state.culpritId)?.name ?? '未选择'}`,
        `关键谎言：${caseFile.clues.find((c) => c.id === state.keyLieClueId)?.title ?? '未选择'}`,
        `关键证据：${keyEvidence.length} 条`,
        `时间线完成度：${filledTimeline}/${totalTimeline}`,
        `作案方式：${state.methodTheory ? '已填写' : '未填写'}`,
        '',
        '证据摘要：',
        ...(keyEvidence.length === 0 ? ['- 暂无'] : keyEvidence.map((item) => `- ${item.title}`))
      ].join('\n'),
      { fontSize: '14px', color: '#e2e8f0', lineSpacing: 6, wordWrap: { width: 378 } }
    );

    makeButton(this, 72, 786, 170, 40, '返回时间线', 0x1f2937, () => this.scene.start('TimelineScene', { caseId: caseFile.id }));
    makeButton(this, 250, 786, 170, 40, '返回证据板', 0x0ea5e9, () => this.scene.start('EvidenceBoardScene', { caseId: caseFile.id }));
    makeButton(this, 1202, 786, 170, 40, '确认提交', 0x16a34a, () => {
      const result = evaluateCase({ caseFile, state });
      this.scene.start('CaseReportScene', { caseId: caseFile.id, result });
    });

    this.add.existing(theoryText);
  }
}
