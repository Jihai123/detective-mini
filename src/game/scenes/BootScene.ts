import * as Phaser from 'phaser';
import { CASES } from '../../data/cases';
import { validateCaseFile } from '../../domain/validators';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  preload() {
    this.load.image('bg-tutorial-001', '/case-art/tutorial-bg.svg');
    this.load.image('bg-case-001', '/case-art/case001-bg.svg');
  }

  create() {
    const errors = CASES.flatMap((caseFile) => validateCaseFile(caseFile));

    if (errors.length > 0) {
      this.cameras.main.setBackgroundColor('#0b1020');
      this.add.text(24, 24, '数据校验失败，无法启动：\n' + errors.join('\n'), {
        fontSize: '16px',
        color: '#fca5a5',
        wordWrap: { width: 1300 }
      });
      return;
    }

    this.scene.start('ArchiveScene');
  }
}
