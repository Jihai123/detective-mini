import * as Phaser from 'phaser';
import { getCaseById } from '../../data/cases';
import type { CaseFile, PlayerAnswers } from '../../domain/types';
import { HintSystem } from '../systems/HintSystem';
import { evaluateCase } from '../systems/ScoreSystem';

type CaseSceneData = {
  caseId: string;
};

export class CaseScene extends Phaser.Scene {
  private caseFile!: CaseFile;
  private hintSystem!: HintSystem;

  private unlockedExtraClueIds = new Set<string>();
  private usedExtraClues = 0;
  private startTime = 0;

  private clueContainer!: Phaser.GameObjects.Container;
  private hintText!: Phaser.GameObjects.Text;
  private extraInfoText!: Phaser.GameObjects.Text;

  private culpritChoice?: string;
  private lieChoice?: string;
  private methodInputValue = '';

  constructor() {
    super('CaseScene');
  }

  init(data: CaseSceneData) {
    const found = getCaseById(data.caseId);
    if (!found) {
      throw new Error(`Case not found: ${data.caseId}`);
    }

    this.caseFile = found;
    this.hintSystem = new HintSystem(this.caseFile);
    this.unlockedExtraClueIds = new Set<string>();
    this.usedExtraClues = 0;
    this.culpritChoice = undefined;
    this.lieChoice = undefined;
    this.methodInputValue = '';
    this.startTime = Date.now();
  }

  create() {
    this.cameras.main.setBackgroundColor('#0b1020');

    this.renderHeader();
    this.renderLeftPanel();
    this.renderCenterPanel();
    this.renderRightPanel();
    this.renderBottomActions();

    this.refreshClueList();
  }

  private renderHeader() {
    this.add.text(40, 24, this.caseFile.title, {
      fontSize: '30px',
      color: '#f8fafc',
      fontStyle: 'bold'
    });

    this.add.text(40, 64, this.caseFile.objective, {
      fontSize: '16px',
      color: '#cbd5e1'
    });

    const backBtn = this.add
      .rectangle(1270, 24, 120, 38, 0x1f2937, 1)
      .setOrigin(0, 0);
    backBtn.setStrokeStyle(1, 0x475569).setInteractive({ useHandCursor: true });

    this.add.text(1305, 33, '返回列表', {
      fontSize: '16px',
      color: '#e2e8f0'
    });

    backBtn.on('pointerdown', () => {
      this.scene.start('MenuScene');
    });
  }

  private renderLeftPanel() {
    this.add
      .rectangle(40, 110, 360, 650, 0x111827, 1)
      .setOrigin(0, 0)
      .setStrokeStyle(1, 0x334155);

    this.add.text(60, 130, '案件简介', {
      fontSize: '22px',
      color: '#f8fafc',
      fontStyle: 'bold'
    });

    this.add.text(60, 170, this.caseFile.intro, {
      fontSize: '15px',
      color: '#cbd5e1',
      wordWrap: { width: 320 }
    });

    this.add.text(60, 270, '嫌疑人', {
      fontSize: '22px',
      color: '#f8fafc',
      fontStyle: 'bold'
    });

    let y = 310;

    this.caseFile.suspects.forEach((suspect) => {
      this.add
        .rectangle(60, y, 320, 96, 0x0f172a, 1)
        .setOrigin(0, 0)
        .setStrokeStyle(1, 0x334155);

      this.add.text(74, y + 10, `${suspect.name}｜${suspect.role}`, {
        fontSize: '18px',
        color: '#f8fafc',
        fontStyle: 'bold'
      });

      this.add.text(74, y + 38, suspect.profile, {
        fontSize: '13px',
        color: '#cbd5e1',
        wordWrap: { width: 292 }
      });

      this.add.text(74, y + 68, `动机：${suspect.motive}`, {
        fontSize: '12px',
        color: '#fca5a5',
        wordWrap: { width: 292 }
      });

      y += 110;
    });
  }

  private renderCenterPanel() {
    this.add
      .rectangle(430, 110, 500, 650, 0x111827, 1)
      .setOrigin(0, 0)
      .setStrokeStyle(1, 0x334155);

    this.add.text(450, 130, '线索区', {
      fontSize: '22px',
      color: '#f8fafc',
      fontStyle: 'bold'
    });

    this.extraInfoText = this.add.text(450, 164, '', {
      fontSize: '14px',
      color: '#93c5fd'
    });

    this.clueContainer = this.add.container(0, 0);
  }

  private refreshClueList() {
    this.clueContainer.removeAll(true);

    const visibleClues = this.caseFile.clues.filter((clue) => {
      if (clue.unlockMode === 'initial') return true;
      return this.unlockedExtraClueIds.has(clue.id);
    });

    this.extraInfoText.setText(
      `额外线索：${this.usedExtraClues}/${this.caseFile.extraClueBudget}　提示：${this.hintSystem.getUsedHintCount()}/3`
    );

    let y = 200;

    visibleClues.forEach((clue, index) => {
      const box = this.add
        .rectangle(450, y, 460, 82, 0x0f172a, 1)
        .setOrigin(0, 0);
      box.setStrokeStyle(1, 0x334155);

      const title = this.add.text(
        464,
        y + 10,
        `${index + 1}. ${clue.title} [${clue.type}]`,
        {
          fontSize: '16px',
          color: '#f8fafc',
          fontStyle: 'bold'
        }
      );

      const content = this.add.text(464, y + 36, clue.content, {
        fontSize: '12px',
        color: '#cbd5e1',
        wordWrap: { width: 430 }
      });

      this.clueContainer.add([box, title, content]);
      y += 92;
    });
  }

  private renderRightPanel() {
    this.add
      .rectangle(960, 110, 440, 650, 0x111827, 1)
      .setOrigin(0, 0)
      .setStrokeStyle(1, 0x334155);

    this.add.text(980, 130, '推理与结论', {
      fontSize: '22px',
      color: '#f8fafc',
      fontStyle: 'bold'
    });

    this.hintText = this.add.text(980, 170, '提示尚未使用', {
      fontSize: '14px',
      color: '#fbbf24',
      wordWrap: { width: 390 }
    });

    this.renderQuestionSelectors();
  }

  private renderQuestionSelectors() {
    const q1 = this.caseFile.questions.find((q) => q.id === 'q1');
    const q2 = this.caseFile.questions.find((q) => q.id === 'q2');

    let y = 230;

    if (q1 && q1.type === 'single') {
      this.add.text(980, y, q1.prompt, {
        fontSize: '16px',
        color: '#e2e8f0',
        fontStyle: 'bold'
      });
      y += 38;

      q1.options.forEach((option) => {
        const btn = this.add
          .rectangle(980, y, 180, 34, 0x1e293b, 1)
          .setOrigin(0, 0);
        btn.setStrokeStyle(1, 0x475569).setInteractive({ useHandCursor: true });

        const label = this.add.text(992, y + 8, option.label, {
          fontSize: '14px',
          color: '#f8fafc'
        });

        btn.on('pointerdown', () => {
          this.culpritChoice = option.value;
          label.setColor('#93c5fd');
        });

        y += 42;
      });
    }

    y += 16;

    if (q2 && q2.type === 'single') {
      this.add.text(980, y, q2.prompt, {
        fontSize: '16px',
        color: '#e2e8f0',
        fontStyle: 'bold'
      });
      y += 38;

      q2.options.forEach((option) => {
        const btn = this.add
          .rectangle(980, y, 260, 34, 0x1e293b, 1)
          .setOrigin(0, 0);
        btn.setStrokeStyle(1, 0x475569).setInteractive({ useHandCursor: true });

        const label = this.add.text(992, y + 8, option.label, {
          fontSize: '14px',
          color: '#f8fafc'
        });

        btn.on('pointerdown', () => {
          this.lieChoice = option.value;
          label.setColor('#93c5fd');
        });

        y += 42;
      });
    }

    y += 20;

    this.add.text(980, y, '作案方式（点击输入）', {
      fontSize: '16px',
      color: '#e2e8f0',
      fontStyle: 'bold'
    });

    y += 38;

    const inputBg = this.add
      .rectangle(980, y, 360, 140, 0x0f172a, 1)
      .setOrigin(0, 0);
    inputBg.setStrokeStyle(1, 0x475569).setInteractive({ useHandCursor: true });

    const inputText = this.add.text(992, y + 12, '点击这里输入你的推理...', {
      fontSize: '14px',
      color: '#94a3b8',
      wordWrap: { width: 336 }
    });

    inputBg.on('pointerdown', () => {
      const result = window.prompt('请输入你的推理：', this.methodInputValue || '');
      if (result !== null) {
        this.methodInputValue = result.trim();
        inputText.setText(this.methodInputValue || '点击这里输入你的推理...');
        inputText.setColor(this.methodInputValue ? '#f8fafc' : '#94a3b8');
      }
    });
  }

  private renderBottomActions() {
    const extraBtn = this.add
      .rectangle(430, 790, 170, 48, 0x2563eb, 1)
      .setOrigin(0, 0);
    extraBtn.setInteractive({ useHandCursor: true });

    this.add.text(460, 805, '请求额外线索', {
      fontSize: '18px',
      color: '#ffffff'
    });

    extraBtn.on('pointerdown', () => this.unlockNextExtraClue());

    const hintBtn = this.add
      .rectangle(620, 790, 140, 48, 0xf59e0b, 1)
      .setOrigin(0, 0);
    hintBtn.setInteractive({ useHandCursor: true });

    this.add.text(665, 805, '使用提示', {
      fontSize: '18px',
      color: '#111827'
    });

    hintBtn.on('pointerdown', () => {
      const hint = this.hintSystem.getNextHint();
      if (!hint) {
        this.hintText.setText('提示已用完。');
        return;
      }
      this.hintText.setText(`提示 ${hint.level}：${hint.text}`);
      this.refreshClueList();
    });

    const submitBtn = this.add
      .rectangle(1240, 790, 160, 48, 0x16a34a, 1)
      .setOrigin(0, 0);
    submitBtn.setInteractive({ useHandCursor: true });

    this.add.text(1285, 805, '提交结论', {
      fontSize: '18px',
      color: '#ffffff'
    });

    submitBtn.on('pointerdown', () => this.submitCase());
  }

  private unlockNextExtraClue() {
    if (this.usedExtraClues >= this.caseFile.extraClueBudget) {
      this.hintText.setText('额外线索次数已用完。');
      return;
    }

    const nextExtraClue = this.caseFile.clues.find(
      (clue) => clue.unlockMode === 'extra' && !this.unlockedExtraClueIds.has(clue.id)
    );

    if (!nextExtraClue) {
      this.hintText.setText('没有更多额外线索可解锁。');
      return;
    }

    this.unlockedExtraClueIds.add(nextExtraClue.id);
    this.usedExtraClues += 1;
    this.hintText.setText(`已解锁额外线索：${nextExtraClue.title}`);
    this.refreshClueList();
  }

  private submitCase() {
    const answers: PlayerAnswers = {
      culpritId: this.culpritChoice,
      keyLieClueId: this.lieChoice,
      methodAnswer: this.methodInputValue
    };

    const elapsedSeconds = Math.floor((Date.now() - this.startTime) / 1000);

    const result = evaluateCase({
      caseFile: this.caseFile,
      answers,
      usedHints: this.hintSystem.getUsedHintCount(),
      usedExtraClues: this.usedExtraClues,
      elapsedSeconds
    });

    this.scene.start('ResultScene', {
      caseId: this.caseFile.id,
      result,
      elapsedSeconds,
      usedHints: this.hintSystem.getUsedHintCount(),
      usedExtraClues: this.usedExtraClues
    });
  }
}