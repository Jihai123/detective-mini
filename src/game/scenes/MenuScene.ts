import * as Phaser from 'phaser';
import { CASES } from '../../data/cases';
import type { CaseFile } from '../../domain/types';
import { readSaveData } from '../systems/ProgressStore';

const panelBg = 0x101826;
const panelStroke = 0x334155;

export class MenuScene extends Phaser.Scene {
  constructor() {
    super('MenuScene');
  }

  create() {
    const save = readSaveData();

    this.cameras.main.setBackgroundColor('#070b14');
    this.drawBackdrop();

    this.add.text(56, 34, '灰盒档案室', {
      fontSize: '38px',
      color: '#e2e8f0',
      fontStyle: 'bold'
    });

    this.add.text(56, 84, '调查台状态：二阶段原型 · 已接入存档与案件进度', {
      fontSize: '16px',
      color: '#7dd3fc'
    });

    this.add
      .rectangle(52, 118, 1336, 42, 0x0b1220, 0.92)
      .setOrigin(0, 0)
      .setStrokeStyle(1, 0x2d3d57);

    this.add.text(70, 131, '选择案件开始调查。未解锁案件将显示封存状态。', {
      fontSize: '14px',
      color: '#93c5fd'
    });

    let y = 182;
    CASES.forEach((caseFile, index) => {
      this.renderCaseCard(caseFile, y, index, save.caseProgress[caseFile.id]);
      y += 200;
    });
  }

  private drawBackdrop() {
    const g = this.add.graphics();
    g.fillStyle(0x0b1324, 0.5);
    g.fillRoundedRect(36, 20, 1368, 840, 14);
    g.lineStyle(2, 0x1f2d45, 1);
    g.strokeRoundedRect(36, 20, 1368, 840, 14);

    for (let i = 0; i < 7; i += 1) {
      const y = 170 + i * 100;
      g.lineStyle(1, 0x162135, 0.6);
      g.lineBetween(52, y, 1388, y);
    }
  }

  private renderCaseCard(
    caseFile: CaseFile,
    y: number,
    index: number,
    progress: { completed: boolean; highestScore: number; fastestSeconds: number | null; unlocked: boolean } | undefined
  ) {
    const x = 56;
    const width = 1328;
    const height = 172;
    const unlocked = progress?.unlocked ?? index === 0;
    const completed = progress?.completed ?? false;

    this.add
      .rectangle(x + 4, y + 4, width, height, 0x030712, 0.35)
      .setOrigin(0, 0);

    const bg = this.add.rectangle(x, y, width, height, panelBg, 0.95).setOrigin(0, 0);
    bg.setStrokeStyle(1, panelStroke);

    this.add.text(x + 20, y + 14, caseFile.title, {
      fontSize: '28px',
      color: '#f8fafc',
      fontStyle: 'bold'
    });

    const status = completed ? '已完成' : unlocked ? '未完成' : '未解锁';
    const statusColor = completed ? '#34d399' : unlocked ? '#fbbf24' : '#64748b';

    this.add.text(x + 20, y + 52, `状态：${status}  ｜  难度：${caseFile.difficulty}  ｜  编号：${caseFile.id}`, {
      fontSize: '14px',
      color: statusColor
    });

    this.add.text(x + 20, y + 76, caseFile.intro, {
      fontSize: '14px',
      color: '#cbd5e1',
      wordWrap: { width: 760 }
    });

    const scoreText = `最高分：${progress?.highestScore ?? 0}`;
    const fastestText = `最快时间：${progress?.fastestSeconds === null || progress?.fastestSeconds === undefined ? '--' : `${progress.fastestSeconds} 秒`}`;
    const unlockText = `解锁：${unlocked ? '是' : '否'}`;

    this.add.text(x + 820, y + 24, [scoreText, fastestText, unlockText].join('\n'), {
      fontSize: '15px',
      color: '#dbeafe',
      lineSpacing: 10
    });

    const buttonColor = unlocked ? 0x2563eb : 0x334155;
    const buttonLabel = unlocked ? '进入调查' : '封存中';
    const button = this.add
      .rectangle(x + width - 184, y + 54, 150, 54, buttonColor, 1)
      .setOrigin(0, 0)
      .setStrokeStyle(1, unlocked ? 0x60a5fa : 0x475569);

    button.setInteractive({ useHandCursor: unlocked });

    const label = this.add.text(x + width - 146, y + 72, buttonLabel, {
      fontSize: '20px',
      color: unlocked ? '#ffffff' : '#cbd5e1',
      fontStyle: 'bold'
    });

    if (unlocked) {
      button.on('pointerover', () => button.setFillStyle(0x1d4ed8));
      button.on('pointerout', () => button.setFillStyle(0x2563eb));
      button.on('pointerdown', () => {
        button.setFillStyle(0x1e40af);
        label.setColor('#bfdbfe');
        this.scene.start('CaseScene', { caseId: caseFile.id });
      });
    }
  }
}
