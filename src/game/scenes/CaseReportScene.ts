import * as Phaser from 'phaser';
import { getCaseById } from '../../data/cases';
import type { CaseResult } from '../../domain/types';
import { clearCaseSession, getCaseSession } from '../systems/InvestigationSessionStore';
import { updateCaseCompletion } from '../systems/ProgressStore';
import { drawCaseSceneBackground, drawPanel, fadeInScene, makeButton } from './ui';

type SceneData = { caseId: string; result: CaseResult };

export class CaseReportScene extends Phaser.Scene {
  private payload!: SceneData;

  constructor() {
    super('CaseReportScene');
  }

  init(data: SceneData) {
    this.payload = data;
  }

  create() {
    const caseFile = getCaseById(this.payload.caseId);
    if (!caseFile) throw new Error('Case not found');
    const state = getCaseSession(caseFile);

    const save = updateCaseCompletion(caseFile.id, this.payload.result.totalScore, this.payload.result.elapsedSeconds, this.payload.result.rating);
    const progress = save.caseProgress[caseFile.id];

    drawCaseSceneBackground(this, caseFile, 'archive');
    fadeInScene(this);

    drawPanel(this, 48, 44, 420, 810, '结案评级');
    drawPanel(this, 482, 44, 910, 390, '你的结论 vs 标准答案');
    drawPanel(this, 482, 448, 910, 406, '真相复盘 / 标准时间线');

    this.add.text(74, 90, 'CASE REPORT', { fontSize: '24px', color: '#93c5fd', fontStyle: 'bold' });
    this.add.text(74, 130, caseFile.title, { fontSize: '20px', color: '#f8fafc', wordWrap: { width: 360 } });
    this.add.text(74, 190, `总分：${this.payload.result.totalScore}`, { fontSize: '34px', color: '#e2e8f0', fontStyle: 'bold' });
    this.add.text(74, 234, `评级：${this.payload.result.rating}`, { fontSize: '24px', color: '#fbbf24', fontStyle: 'bold' });
    this.add.text(
      74,
      278,
      [
        `嫌疑人：${this.payload.result.correct.culprit ? '正确' : '错误'}`,
        `关键谎言：${this.payload.result.correct.lie ? '正确' : '错误'}`,
        `作案方式：${this.payload.result.correct.method ? '正确' : '错误'}`,
        `时间线完成：${Math.round(this.payload.result.timelineCompletion * 100)}%`,
        `时间线准确：${Math.round(this.payload.result.timelineAccuracy * 100)}%`,
        '',
        `耗时：${this.payload.result.elapsedSeconds} 秒`,
        `最高分：${progress?.highestScore ?? 0}`,
        `最快：${progress?.fastestSeconds ?? '--'} 秒`,
        `最高评级：${progress?.highestRating ?? '-'}`
      ].join('\n'),
      { fontSize: '14px', color: '#dbeafe', lineSpacing: 6 }
    );

    this.add.text(
      504,
      90,
      [
        `你的嫌疑人：${caseFile.suspects.find((s) => s.id === state.culpritId)?.name ?? '未选'}  ｜  正确答案：${caseFile.suspects.find((s) => s.id === caseFile.solution.culpritId)?.name ?? '-'}`,
        `你的关键谎言：${caseFile.clues.find((c) => c.id === state.keyLieClueId)?.title ?? '未选'}`,
        `标准关键谎言：${caseFile.clues.find((c) => c.id === caseFile.solution.keyLieClueId)?.title ?? '-'}`,
        '',
        '你标记的关键证据：',
        ...caseFile.clues.filter((c) => state.selectedKeyEvidence.has(c.id)).map((c) => `- ${c.title}`),
        '',
        '标准证据链：',
        ...caseFile.solution.evidenceChain.map((id) => `- ${caseFile.clues.find((c) => c.id === id)?.title ?? id}`)
      ].join('\n'),
      { fontSize: '14px', color: '#e2e8f0', wordWrap: { width: 874 }, lineSpacing: 6 }
    );

    this.add.text(
      504,
      494,
      ['真相复盘：', ...caseFile.solution.truthSegments.map((item, index) => `${index + 1}. ${item}`), '', '标准时间线：', ...caseFile.solution.canonicalTimeline.map((item) => `- ${item}`)].join('\n'),
      { fontSize: '14px', color: '#cbd5e1', wordWrap: { width: 874 }, lineSpacing: 7 }
    );

    makeButton(this, 74, 786, 170, 40, '重开本案', 0x2563eb, () => {
      clearCaseSession(caseFile.id);
      this.scene.start('BriefingScene', { caseId: caseFile.id });
    });
    makeButton(this, 252, 786, 170, 40, '返回档案室', 0x1f2937, () => {
      clearCaseSession(caseFile.id);
      this.scene.start('ArchiveScene');
    });
  }
}
