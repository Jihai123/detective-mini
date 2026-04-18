import * as Phaser from 'phaser';
import { getCaseById } from '../../data/cases';
import type { CaseResult } from '../../domain/types';

type ResultSceneData = {
  caseId: string;
  result: CaseResult;
  elapsedSeconds: number;
  usedHints: number;
  usedExtraClues: number;
};

export class ResultScene extends Phaser.Scene {
  private payload!: ResultSceneData;

  constructor() {
    super('ResultScene');
  }

  init(data: ResultSceneData) {
    this.payload = data;
  }

  create() {
    const caseFile = getCaseById(this.payload.caseId);
    if (!caseFile) {
      throw new Error(`Case not found: ${this.payload.caseId}`);
    }

    this.cameras.main.setBackgroundColor('#0b1020');

    this.add.text(60, 40, '结案报告', {
      fontSize: '34px',
      color: '#f8fafc',
      fontStyle: 'bold'
    });

    this.add.text(60, 92, caseFile.title, {
      fontSize: '20px',
      color: '#93c5fd'
    });

    this.add
      .rectangle(60, 140, 620, 250, 0x111827, 1)
      .setOrigin(0, 0)
      .setStrokeStyle(1, 0x334155);

    this.add.text(84, 166, `总分：${this.payload.result.totalScore}`, {
      fontSize: '28px',
      color: '#f8fafc',
      fontStyle: 'bold'
    });

    this.add.text(84, 208, `评级：${this.payload.result.rating}`, {
      fontSize: '22px',
      color: '#fbbf24'
    });

    const summaryLines = [
      `谁实施了行为：${this.payload.result.correct.culprit ? '正确' : '错误'}`,
      `关键谎言识别：${this.payload.result.correct.lie ? '正确' : '错误'}`,
      `作案方式判断：${this.payload.result.correct.method ? '正确' : '错误'}`,
      `耗时：${this.payload.elapsedSeconds} 秒`,
      `使用提示：${this.payload.usedHints}`,
      `使用额外线索：${this.payload.usedExtraClues}`
    ];

    this.add.text(84, 252, summaryLines.join('\n'), {
      fontSize: '16px',
      color: '#cbd5e1',
      lineSpacing: 10
    });

    this.add
      .rectangle(720, 140, 640, 420, 0x111827, 1)
      .setOrigin(0, 0)
      .setStrokeStyle(1, 0x334155);

    this.add.text(744, 166, '真相复盘', {
      fontSize: '24px',
      color: '#f8fafc',
      fontStyle: 'bold'
    });

    this.add.text(
      744,
      210,
      caseFile.solution.reasoning
        .map((item, idx) => `${idx + 1}. ${item}`)
        .join('\n\n'),
      {
        fontSize: '15px',
        color: '#cbd5e1',
        wordWrap: { width: 590 },
        lineSpacing: 8
      }
    );

    const retryBtn = this.add
      .rectangle(60, 430, 150, 48, 0x2563eb, 1)
      .setOrigin(0, 0);
    retryBtn.setInteractive({ useHandCursor: true });

    this.add.text(110, 445, '重玩本案', {
      fontSize: '18px',
      color: '#ffffff'
    });

    retryBtn.on('pointerdown', () => {
      this.scene.start('CaseScene', { caseId: this.payload.caseId });
    });

    const menuBtn = this.add
      .rectangle(230, 430, 150, 48, 0x1f2937, 1)
      .setOrigin(0, 0);
    menuBtn.setStrokeStyle(1, 0x475569).setInteractive({ useHandCursor: true });

    this.add.text(280, 445, '返回列表', {
      fontSize: '18px',
      color: '#ffffff'
    });

    menuBtn.on('pointerdown', () => {
      this.scene.start('MenuScene');
    });
  }
}