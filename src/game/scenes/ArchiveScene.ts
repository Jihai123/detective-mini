import * as Phaser from 'phaser';
import { CASES } from '../../data/cases';
import type { CaseFile } from '../../domain/types';
import { readSaveData } from '../systems/ProgressStore';
import { drawPanel, drawWorkbenchBackground, fadeInScene, makeButton } from './ui';

export class ArchiveScene extends Phaser.Scene {
  constructor() {
    super('ArchiveScene');
  }

  create() {
    drawWorkbenchBackground(this);
    fadeInScene(this);

    const save = readSaveData();

    this.add.text(48, 38, '档案室终端 / CASE ARCHIVE', {
      fontSize: '34px',
      color: '#f8fafc',
      fontStyle: 'bold'
    });

    this.add.text(48, 80, '选择档案并进入导入简报。流程：导入 → 调查 → 档案/谈话 → 证据板 → 时间线 → 提交 → 报告', {
      fontSize: '14px',
      color: '#7dd3fc'
    });

    drawPanel(this, 42, 116, 1356, 744, '案件列表');

    let y = 164;
    CASES.forEach((caseFile, index) => {
      const progress = save.caseProgress[caseFile.id];
      const unlocked = progress?.unlocked ?? index === 0;
      this.renderCaseCard(caseFile, y, unlocked, progress?.highestScore ?? 0, progress?.highestRating ?? '-', progress?.fastestSeconds, progress?.completionCount ?? 0);
      y += 212;
    });
  }

  private renderCaseCard(
    caseFile: CaseFile,
    y: number,
    unlocked: boolean,
    bestScore: number,
    bestRating: string,
    fastest: number | null,
    completionCount: number
  ) {
    const x = 62;
    const w = 1316;
    const h = 190;

    this.add.rectangle(x, y, w, h, 0x0b1424, 0.96).setOrigin(0, 0).setStrokeStyle(1, unlocked ? 0x3b82f6 : 0x475569);
    this.add.text(x + 16, y + 14, caseFile.title, { fontSize: '28px', color: '#e2e8f0', fontStyle: 'bold' });
    this.add.text(x + 16, y + 50, caseFile.archiveSubtitle, { fontSize: '14px', color: '#93c5fd' });

    this.add.text(
      x + 16,
      y + 76,
      `类型：${caseFile.archiveMeta.type}  ｜  地点：${caseFile.archiveMeta.location}  ｜  时间：${caseFile.archiveMeta.incidentWindow}`,
      { fontSize: '14px', color: '#cbd5e1', wordWrap: { width: 920 } }
    );

    this.add.text(
      x + 16,
      y + 112,
      `威胁评级：${caseFile.archiveMeta.threatLevel.toUpperCase()}  ｜  难度：${caseFile.difficulty.toUpperCase()}  ｜  档案ID：${caseFile.id}`,
      { fontSize: '13px', color: '#fbbf24' }
    );

    this.add.text(
      x + 980,
      y + 24,
      [`状态：${unlocked ? '已解锁' : '封存'}`, `最高分：${bestScore}`, `最高评级：${bestRating}`, `最快时间：${fastest ?? '--'} 秒`, `完成次数：${completionCount}`].join('\n'),
      { fontSize: '14px', color: '#dbeafe', lineSpacing: 5 }
    );

    makeButton(this, x + 1120, y + 128, 168, 42, unlocked ? '进入导入页' : '未解锁', unlocked ? 0x2563eb : 0x334155, () => {
      this.scene.start('BriefingScene', { caseId: caseFile.id });
    }, !unlocked);
  }
}
