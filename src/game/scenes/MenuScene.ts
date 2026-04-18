import * as Phaser from 'phaser';
import { CASES } from '../../data/cases';
import type { CaseFile } from '../../domain/types';

export class MenuScene extends Phaser.Scene {
  constructor() {
    super('MenuScene');
  }

  create() {
    this.cameras.main.setBackgroundColor('#0b1020');

    this.add.text(60, 40, '档案室：侦探推理小局', {
      fontSize: '34px',
      color: '#f8fafc',
      fontStyle: 'bold'
    });

    this.add.text(60, 92, '选择一个案件开始调查（MVP 版本）', {
      fontSize: '18px',
      color: '#94a3b8'
    });

    let y = 150;
    CASES.forEach((caseFile) => {
      this.renderCaseCard(caseFile, y);
      y += 152;
    });
  }

  private renderCaseCard(caseFile: CaseFile, y: number) {
    const x = 60;
    const width = 820;
    const height = 122;

    const bg = this.add.rectangle(x, y, width, height, 0x111827, 1).setOrigin(0, 0);
    bg.setStrokeStyle(1, 0x334155);

    this.add.text(x + 20, y + 14, caseFile.title, {
      fontSize: '24px',
      color: '#f8fafc',
      fontStyle: 'bold'
    });

    this.add.text(x + 20, y + 50, `难度：${caseFile.difficulty}  ｜  案件ID：${caseFile.id}`, {
      fontSize: '14px',
      color: '#38bdf8'
    });

    this.add.text(x + 20, y + 74, caseFile.intro, {
      fontSize: '14px',
      color: '#cbd5e1',
      wordWrap: { width: 580 }
    });

    const button = this.add
      .rectangle(x + width - 146, y + 38, 118, 44, 0x2563eb, 1)
      .setOrigin(0, 0)
      .setInteractive({ useHandCursor: true });

    this.add.text(x + width - 113, y + 50, '进入案件', {
      fontSize: '18px',
      color: '#ffffff'
    });

    button.on('pointerover', () => button.setFillStyle(0x1d4ed8));
    button.on('pointerout', () => button.setFillStyle(0x2563eb));
    button.on('pointerdown', () => {
      this.scene.start('CaseScene', { caseId: caseFile.id });
    });
  }
}
