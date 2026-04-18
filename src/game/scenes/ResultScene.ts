import * as Phaser from 'phaser';
import { getCaseById } from '../../data/cases';
import type { CaseResult } from '../../domain/types';
import { updateCaseCompletion } from '../systems/ProgressStore';

type ResultSceneData = {
  caseId: string;
  result: CaseResult;
  elapsedSeconds: number;
  usedHints: number;
  usedExtraClues: number;
  timelineSelections?: Record<string, Record<string, string>>;
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

    const save = updateCaseCompletion(this.payload.caseId, this.payload.result.totalScore, this.payload.elapsedSeconds);
    const progress = save.caseProgress[this.payload.caseId];

    this.cameras.main.setBackgroundColor('#050912');
    this.drawBackdrop();

    this.add.text(50, 34, '结案报告', {
      fontSize: '36px',
      color: '#f8fafc',
      fontStyle: 'bold'
    });

    this.add.text(50, 76, caseFile.title, {
      fontSize: '18px',
      color: '#7dd3fc'
    });

    this.drawPanel(50, 116, 460, 738, '判定概览');
    this.drawPanel(528, 116, 860, 498, '真相复盘');
    this.drawPanel(528, 628, 860, 226, '时间线核对');

    this.add.text(72, 164, `总分 ${this.payload.result.totalScore}`, {
      fontSize: '34px',
      color: '#f8fafc',
      fontStyle: 'bold'
    });

    this.add.text(72, 208, `评级 ${this.payload.result.rating}`, {
      fontSize: '22px',
      color: '#fbbf24'
    });

    const lines = [
      `嫌疑人判断：${this.payload.result.correct.culprit ? '正确' : '错误'}`,
      `关键谎言判断：${this.payload.result.correct.lie ? '正确' : '错误'}`,
      `作案方式判断：${this.payload.result.correct.method ? '正确' : '错误'}`,
      `耗时：${this.payload.elapsedSeconds} 秒`,
      `提示使用：${this.payload.usedHints}`,
      `额外线索：${this.payload.usedExtraClues}`,
      '',
      `存档状态：${progress?.completed ? '已完成' : '未完成'}`,
      `该案最高分：${progress?.highestScore ?? 0}`,
      `该案最快时间：${progress?.fastestSeconds ?? '--'} 秒`
    ];

    this.add.text(72, 250, lines.join('\n'), {
      fontSize: '15px',
      color: '#cbd5e1',
      lineSpacing: 7
    });

    const breakdown = this.payload.result.breakdown;
    this.add.text(
      72,
      526,
      `评分细则\n` +
        `- 锁定嫌疑人：${breakdown.culprit}\n` +
        `- 识别谎言：${breakdown.lie}\n` +
        `- 作案方式：${breakdown.method}\n` +
        `- 时间奖励：${breakdown.timeBonus}\n` +
        `- 提示奖励：${breakdown.hintBonus}\n` +
        `- 额外线索奖励：${breakdown.extraClueBonus}`,
      {
        fontSize: '14px',
        color: '#bfdbfe',
        lineSpacing: 6
      }
    );

    this.add.text(
      550,
      162,
      caseFile.solution.reasoning.map((item, idx) => `${idx + 1}. ${item}`).join('\n\n'),
      {
        fontSize: '15px',
        color: '#cbd5e1',
        lineSpacing: 8,
        wordWrap: { width: 820 }
      }
    );

    this.renderTimelineReview(caseFile);

    this.makeButton(70, 790, 156, 44, '重玩本案', 0x2563eb, () => {
      this.scene.start('CaseScene', { caseId: this.payload.caseId });
    });

    this.makeButton(242, 790, 156, 44, '返回档案室', 0x1f2937, () => {
      this.scene.start('MenuScene');
    }).setStrokeStyle(1, 0x475569);
  }

  private renderTimelineReview(caseFile: NonNullable<ReturnType<typeof getCaseById>>) {
    const expected = caseFile.solution.expectedTimeline;
    const selections = this.payload.timelineSelections ?? {};

    this.add.text(550, 664, '玩家填写：', {
      fontSize: '14px',
      color: '#93c5fd'
    });

    const playerLines = caseFile.suspects.map((suspect) => {
      const slotSummary = caseFile.timelineSlots
        .map((slot) => `${slot.label}:${selections[suspect.id]?.[slot.id] ?? '未填'}`)
        .join(' ｜ ');
      return `${suspect.name} -> ${slotSummary}`;
    });

    this.add.text(550, 690, playerLines.join('\n'), {
      fontSize: '12px',
      color: '#dbeafe',
      lineSpacing: 6,
      wordWrap: { width: 398 }
    });

    this.add.text(970, 664, '标准时间线：', {
      fontSize: '14px',
      color: '#fbbf24'
    });

    if (!expected) {
      this.add.text(970, 690, '本案未提供标准时间线。', {
        fontSize: '12px',
        color: '#94a3b8'
      });
      return;
    }

    const expectedLines = caseFile.suspects.map((suspect) => {
      const slotSummary = caseFile.timelineSlots
        .map((slot) => `${slot.label}:${expected[suspect.id]?.[slot.id] ?? '未知'}`)
        .join(' ｜ ');
      return `${suspect.name} -> ${slotSummary}`;
    });

    this.add.text(970, 690, expectedLines.join('\n'), {
      fontSize: '12px',
      color: '#fde68a',
      lineSpacing: 6,
      wordWrap: { width: 398 }
    });
  }

  private drawBackdrop() {
    const g = this.add.graphics();
    g.fillStyle(0x0b1324, 0.88);
    g.fillRoundedRect(24, 18, 1392, 860, 14);
    g.lineStyle(2, 0x1f2c44, 1);
    g.strokeRoundedRect(24, 18, 1392, 860, 14);
  }

  private drawPanel(x: number, y: number, w: number, h: number, title: string) {
    this.add.rectangle(x + 4, y + 4, w, h, 0x030712, 0.36).setOrigin(0, 0);
    this.add.rectangle(x, y, w, h, 0x101826, 0.95).setOrigin(0, 0).setStrokeStyle(1, 0x334155);
    this.add.text(x + 16, y + 14, title, {
      fontSize: '22px',
      color: '#f8fafc',
      fontStyle: 'bold'
    });
  }

  private makeButton(x: number, y: number, w: number, h: number, label: string, color: number, onClick: () => void) {
    const button = this.add.rectangle(x, y, w, h, color, 1).setOrigin(0, 0).setStrokeStyle(1, 0x60a5fa);
    this.add.text(x + 32, y + 12, label, {
      fontSize: '18px',
      color: '#ffffff',
      fontStyle: 'bold'
    });

    button.setInteractive({ useHandCursor: true });
    button.on('pointerover', () => button.setFillStyle(Phaser.Display.Color.IntegerToColor(color).darken(8).color));
    button.on('pointerout', () => button.setFillStyle(color));
    button.on('pointerdown', onClick);

    return button;
  }
}
