import * as Phaser from 'phaser';
import { CASES } from '../../data/cases';
import type { CaseFile } from '../../domain/types';

export class MenuScene extends Phaser.Scene {
  constructor() {
    super('MenuScene');
  }

  create() {
    this.cameras.main.setBackgroundColor('#0b1020');

    this.add.text(60, 40, '妗ｆ瀹わ細渚︽帰鎺ㄧ悊灏忓眬', {
      fontSize: '32px',
      color: '#f8fafc',
      fontStyle: 'bold'
    });

    this.add.text(60, 88, '閫夋嫨涓€涓浠跺紑濮嬭皟鏌?, {
      fontSize: '18px',
      color: '#94a3b8'
    });

    let y = 150;

    CASES.forEach((caseFile) => {
      this.renderCaseCard(caseFile, y);
      y += 150;
    });
  }

  private renderCaseCard(caseFile: CaseFile, y: number) {
    const x = 60;
    const width = 760;
    const height = 118;

    const bg = this.add.rectangle(x, y, width, height, 0x111827, 1).setOrigin(0, 0);
    bg.setStrokeStyle(1, 0x334155);

    this.add.text(x + 20, y + 16, caseFile.title, {
      fontSize: '24px',
      color: '#f8fafc',
      fontStyle: 'bold'
    });

    this.add.text(x + 20, y + 50, `闅惧害锛?{caseFile.difficulty}`, {
      fontSize: '16px',
      color: '#38bdf8'
    });

    this.add.text(x + 20, y + 74, caseFile.intro.slice(0, 80) + '...', {
      fontSize: '14px',
      color: '#cbd5e1',
      wordWrap: { width: 520 }
    });

    const button = this.add.rectangle(x + width - 140, y + 34, 110, 44, 0x2563eb, 1).setOrigin(0, 0);
    button.setInteractive({ useHandCursor: true });

    this.add.text(x + width - 107, y + 46, '杩涘叆妗堜欢', {
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
