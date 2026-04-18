import * as Phaser from 'phaser';
import { getCaseById } from '../../data/cases';
import type { CaseFile, Clue, PlayerAnswers } from '../../domain/types';
import { HintSystem } from '../systems/HintSystem';
import { evaluateCase } from '../systems/ScoreSystem';

type CaseSceneData = {
  caseId: string;
};

type ClueCategory = 'all' | 'testimony' | 'physical' | 'record' | 'chat' | 'extra';

type SelectButtonRefs = {
  value: string;
  box: Phaser.GameObjects.Rectangle;
  label: Phaser.GameObjects.Text;
};

export class CaseScene extends Phaser.Scene {
  private caseFile!: CaseFile;
  private hintSystem!: HintSystem;

  private unlockedExtraClueIds = new Set<string>();
  private usedExtraClues = 0;
  private startTime = 0;

  private clueContainer!: Phaser.GameObjects.Container;
  private cluePageText!: Phaser.GameObjects.Text;
  private clueStatusText!: Phaser.GameObjects.Text;
  private hintText!: Phaser.GameObjects.Text;
  private summaryText!: Phaser.GameObjects.Text;
  private categoryText!: Phaser.GameObjects.Text;

  private culpritChoice?: string;
  private lieChoice?: string;
  private methodInputValue = '';

  private timelineSelections: Record<string, Record<string, string>> = {};

  private clueCategory: ClueCategory = 'all';
  private cluePage = 0;
  private readonly cluePageSize = 5;

  private culpritButtons: SelectButtonRefs[] = [];
  private lieButtons: SelectButtonRefs[] = [];

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
    this.clueCategory = 'all';
    this.cluePage = 0;
    this.timelineSelections = {};

    this.caseFile.suspects.forEach((suspect) => {
      this.timelineSelections[suspect.id] = {};
    });
  }

  create() {
    this.cameras.main.setBackgroundColor('#050912');
    this.drawBackdrop();

    this.renderHeader();
    this.renderLeftPanel();
    this.renderCenterPanel();
    this.renderRightPanel();
    this.renderBottomActions();

    this.refreshClueList();
    this.refreshSelectionStyles();
    this.refreshSummary();
  }

  private drawBackdrop() {
    const g = this.add.graphics();
    g.fillStyle(0x0b1324, 0.88);
    g.fillRoundedRect(24, 20, 1392, 858, 14);
    g.lineStyle(2, 0x1f2c44, 1);
    g.strokeRoundedRect(24, 20, 1392, 858, 14);

    g.lineStyle(1, 0x15213a, 0.7);
    g.lineBetween(26, 94, 1414, 94);
  }

  private renderHeader() {
    this.add.text(44, 32, this.caseFile.title, {
      fontSize: '33px',
      color: '#f8fafc',
      fontStyle: 'bold'
    });

    this.add.text(44, 68, `${this.caseFile.location} ｜ ${this.caseFile.incidentTime}`, {
      fontSize: '14px',
      color: '#7dd3fc'
    });

    const backBtn = this.makeButton(1248, 36, 150, 40, '返回档案室', 0x1f2937, true, () => {
      this.scene.start('MenuScene');
    });
    backBtn.border.setStrokeStyle(1, 0x475569);
  }

  private renderLeftPanel() {
    this.drawPanel(44, 114, 420, 744, '案件档案');

    this.add.text(62, 152, `调查导入`, {
      fontSize: '18px',
      color: '#e2e8f0',
      fontStyle: 'bold'
    });

    this.add.text(62, 180, `${this.caseFile.intro}\n\n背景：${this.caseFile.background}\n\n目标：${this.caseFile.objective}`, {
      fontSize: '13px',
      color: '#cbd5e1',
      wordWrap: { width: 386 },
      lineSpacing: 5
    });

    this.add.text(62, 350, '涉事人物', {
      fontSize: '18px',
      color: '#e2e8f0',
      fontStyle: 'bold'
    });

    let y = 382;
    this.caseFile.suspects.forEach((suspect) => {
      this.add.rectangle(62, y, 386, 112, 0x0d172a, 1).setOrigin(0, 0).setStrokeStyle(1, 0x2f425f);

      this.add.text(74, y + 8, `${suspect.name}｜${suspect.role}`, {
        fontSize: '16px',
        color: '#f8fafc',
        fontStyle: 'bold'
      });

      this.add.text(
        74,
        y + 34,
        `关系：${suspect.relation}\n当晚行为：${suspect.alibi}\n可疑点：${suspect.suspiciousPoint}\n动机：${suspect.motive}`,
        {
          fontSize: '12px',
          color: '#bfdbfe',
          lineSpacing: 3,
          wordWrap: { width: 360 }
        }
      );

      y += 122;
    });
  }

  private renderCenterPanel() {
    this.drawPanel(482, 114, 474, 744, '线索分拣台');

    this.categoryText = this.add.text(500, 152, '当前分类：全部', {
      fontSize: '13px',
      color: '#93c5fd'
    });

    this.clueStatusText = this.add.text(500, 172, '', {
      fontSize: '13px',
      color: '#fbbf24'
    });

    this.renderClueTabs();

    this.clueContainer = this.add.container(0, 0);

    this.cluePageText = this.add.text(500, 822, '', {
      fontSize: '13px',
      color: '#93c5fd'
    });

    this.makeButton(768, 812, 70, 30, '上一页', 0x1e293b, true, () => {
      if (this.cluePage > 0) {
        this.cluePage -= 1;
        this.refreshClueList();
      }
    });

    this.makeButton(848, 812, 70, 30, '下一页', 0x1e293b, true, () => {
      const totalPages = this.getTotalCluePages();
      if (this.cluePage < totalPages - 1) {
        this.cluePage += 1;
        this.refreshClueList();
      }
    });
  }

  private renderClueTabs() {
    const tabs: Array<{ key: ClueCategory; label: string }> = [
      { key: 'all', label: '全部' },
      { key: 'testimony', label: '证词' },
      { key: 'physical', label: '物证' },
      { key: 'record', label: '记录' },
      { key: 'chat', label: '监控/聊天' },
      { key: 'extra', label: '额外线索' }
    ];

    let x = 500;
    tabs.forEach((tab) => {
      const btn = this.add.rectangle(x, 198, 72, 30, 0x1e293b, 1).setOrigin(0, 0).setStrokeStyle(1, 0x475569);
      const text = this.add.text(x + 12, 206, tab.label, {
        fontSize: '13px',
        color: '#e2e8f0'
      });

      btn.setInteractive({ useHandCursor: true });
      btn.on('pointerover', () => btn.setFillStyle(0x334155));
      btn.on('pointerout', () => {
        btn.setFillStyle(this.clueCategory === tab.key ? 0x1d4ed8 : 0x1e293b);
      });
      btn.on('pointerdown', () => {
        this.clueCategory = tab.key;
        this.cluePage = 0;
        this.refreshClueList();
        tabs.forEach((item) => {
          const color = this.clueCategory === item.key ? '#bfdbfe' : '#e2e8f0';
          if (item.key === tab.key) {
            btn.setFillStyle(0x1d4ed8);
            text.setColor(color);
          }
        });
      });

      if (tab.key === 'all') {
        btn.setFillStyle(0x1d4ed8);
        text.setColor('#bfdbfe');
      }

      x += 76;
    });
  }

  private refreshClueList() {
    this.clueContainer.removeAll(true);

    const filtered = this.getFilteredClues();
    const totalPages = this.getTotalCluePages(filtered.length);
    this.cluePage = Math.min(this.cluePage, Math.max(0, totalPages - 1));

    const start = this.cluePage * this.cluePageSize;
    const pageClues = filtered.slice(start, start + this.cluePageSize);

    this.categoryText.setText(`当前分类：${this.getCategoryLabel(this.clueCategory)}`);
    this.clueStatusText.setText(
      `额外线索：${this.usedExtraClues}/${this.caseFile.extraClueBudget} ｜ 提示：${this.hintSystem.getUsedHintCount()}/${this.caseFile.hints.length}`
    );
    this.cluePageText.setText(`第 ${this.cluePage + 1} / ${Math.max(1, totalPages)} 页`);

    let y = 238;
    pageClues.forEach((clue) => {
      const isExtra = clue.unlockMode === 'extra';
      const border = clue.importance === 'high' ? 0xfbbf24 : 0x334155;
      const bg = isExtra ? 0x10203d : 0x0b1527;
      const box = this.add.rectangle(500, y, 438, 104, bg, 1).setOrigin(0, 0).setStrokeStyle(1, border);

      const tags = [this.getClueTypeLabel(clue.type)];
      if (isExtra) tags.push('已解锁额外');
      if (clue.importance === 'high') tags.push('高重要');

      const title = this.add.text(512, y + 8, `${clue.title}  [${tags.join(' / ')}]`, {
        fontSize: '14px',
        color: '#f8fafc',
        fontStyle: 'bold',
        wordWrap: { width: 410 }
      });

      const content = this.add.text(512, y + 36, clue.content, {
        fontSize: '12px',
        color: '#cbd5e1',
        wordWrap: { width: 410 },
        lineSpacing: 3
      });

      this.clueContainer.add([box, title, content]);
      y += 114;
    });

    if (pageClues.length === 0) {
      const empty = this.add.text(512, 276, '该分类暂无已公开线索。', {
        fontSize: '13px',
        color: '#94a3b8'
      });
      this.clueContainer.add(empty);
    }

    this.refreshSummary();
  }

  private renderRightPanel() {
    this.drawPanel(974, 114, 404, 744, '推理工作台');

    this.hintText = this.add.text(992, 150, '提示尚未使用。', {
      fontSize: '13px',
      color: '#fbbf24',
      wordWrap: { width: 368 }
    });

    let y = 190;
    const q1 = this.caseFile.questions.find((q) => q.id === 'q1');
    if (q1 && q1.type === 'single') {
      y = this.renderSingleQuestion(q1.prompt, q1.options, y, true);
    }

    const q2 = this.caseFile.questions.find((q) => q.id === 'q2');
    if (q2 && q2.type === 'single') {
      y = this.renderSingleQuestion(q2.prompt, q2.options, y + 8, false);
    }

    this.add.text(992, y + 8, '作案方式（点击输入，可清空）', {
      fontSize: '14px',
      color: '#e2e8f0',
      fontStyle: 'bold'
    });

    const inputBg = this.add.rectangle(992, y + 34, 368, 88, 0x0b1527, 1).setOrigin(0, 0).setStrokeStyle(1, 0x475569);
    const inputText = this.add.text(1002, y + 42, '点击输入你的推理...', {
      fontSize: '13px',
      color: '#94a3b8',
      wordWrap: { width: 350 }
    });

    inputBg.setInteractive({ useHandCursor: true });
    inputBg.on('pointerover', () => inputBg.setFillStyle(0x122037));
    inputBg.on('pointerout', () => inputBg.setFillStyle(0x0b1527));
    inputBg.on('pointerdown', () => {
      const result = window.prompt('请输入作案方式（留空可清空）：', this.methodInputValue || '');
      if (result !== null) {
        this.methodInputValue = result.trim();
        inputText.setText(this.methodInputValue || '点击输入你的推理...');
        inputText.setColor(this.methodInputValue ? '#f8fafc' : '#94a3b8');
        this.refreshSummary();
      }
    });

    this.add.text(992, y + 132, '时间线板（点击格子循环选择状态）', {
      fontSize: '14px',
      color: '#e2e8f0',
      fontStyle: 'bold'
    });

    this.renderTimelineBoard(y + 158);

    this.summaryText = this.add.text(992, 738, '', {
      fontSize: '12px',
      color: '#bfdbfe',
      wordWrap: { width: 368 },
      lineSpacing: 4
    });
  }

  private renderSingleQuestion(
    prompt: string,
    options: Array<{ label: string; value: string }>,
    y: number,
    isCulpritQuestion: boolean
  ): number {
    this.add.text(992, y, prompt, {
      fontSize: '14px',
      color: '#e2e8f0',
      fontStyle: 'bold'
    });

    let cursorY = y + 28;
    options.forEach((option) => {
      const btn = this.add.rectangle(992, cursorY, 368, 30, 0x1e293b, 1).setOrigin(0, 0).setStrokeStyle(1, 0x475569);
      const label = this.add.text(1004, cursorY + 7, option.label, {
        fontSize: '13px',
        color: '#e2e8f0'
      });

      btn.setInteractive({ useHandCursor: true });
      btn.on('pointerover', () => {
        if (!this.isSelectedValue(option.value, isCulpritQuestion)) {
          btn.setFillStyle(0x334155);
        }
      });
      btn.on('pointerout', () => {
        this.refreshSelectionStyles();
      });
      btn.on('pointerdown', () => {
        if (isCulpritQuestion) {
          this.culpritChoice = this.culpritChoice === option.value ? undefined : option.value;
        } else {
          this.lieChoice = this.lieChoice === option.value ? undefined : option.value;
        }
        this.refreshSelectionStyles();
        this.refreshSummary();
      });

      const refs: SelectButtonRefs = { value: option.value, box: btn, label };
      if (isCulpritQuestion) {
        this.culpritButtons.push(refs);
      } else {
        this.lieButtons.push(refs);
      }

      cursorY += 36;
    });

    return cursorY + 2;
  }

  private isSelectedValue(value: string, isCulpritQuestion: boolean): boolean {
    return isCulpritQuestion ? this.culpritChoice === value : this.lieChoice === value;
  }

  private refreshSelectionStyles() {
    this.culpritButtons.forEach((item) => {
      const selected = this.culpritChoice === item.value;
      item.box.setFillStyle(selected ? 0x1d4ed8 : 0x1e293b);
      item.box.setStrokeStyle(1, selected ? 0x93c5fd : 0x475569);
      item.label.setColor(selected ? '#dbeafe' : '#e2e8f0');
    });

    this.lieButtons.forEach((item) => {
      const selected = this.lieChoice === item.value;
      item.box.setFillStyle(selected ? 0x1d4ed8 : 0x1e293b);
      item.box.setStrokeStyle(1, selected ? 0x93c5fd : 0x475569);
      item.label.setColor(selected ? '#dbeafe' : '#e2e8f0');
    });
  }

  private renderTimelineBoard(startY: number) {
    const left = 992;
    const slotWidth = Math.max(88, Math.floor(272 / Math.max(1, this.caseFile.timelineSlots.length)));

    this.add.text(left, startY, '人物 / 时间', {
      fontSize: '12px',
      color: '#94a3b8'
    });

    this.caseFile.timelineSlots.forEach((slot, idx) => {
      this.add
        .text(left + 94 + idx * slotWidth, startY, slot.label, {
          fontSize: '11px',
          color: '#93c5fd',
          wordWrap: { width: slotWidth - 6 }
        })
        .setOrigin(0, 0);
    });

    let rowY = startY + 24;
    this.caseFile.suspects.forEach((suspect) => {
      this.add.text(left, rowY + 8, suspect.name, {
        fontSize: '12px',
        color: '#e2e8f0'
      });

      this.caseFile.timelineSlots.forEach((slot, idx) => {
        const x = left + 94 + idx * slotWidth;
        const cell = this.add.rectangle(x, rowY, slotWidth - 6, 28, 0x1e293b, 1).setOrigin(0, 0).setStrokeStyle(1, 0x475569);
        const cellText = this.add.text(x + 4, rowY + 7, '未填', {
          fontSize: '11px',
          color: '#94a3b8',
          wordWrap: { width: slotWidth - 14 }
        });

        const updateCell = () => {
          const selected = this.timelineSelections[suspect.id]?.[slot.id];
          if (!selected) {
            cell.setFillStyle(0x1e293b);
            cellText.setText('未填');
            cellText.setColor('#94a3b8');
            return;
          }

          cell.setFillStyle(0x1d4ed8);
          cellText.setText(selected);
          cellText.setColor('#dbeafe');
        };

        cell.setInteractive({ useHandCursor: true });
        cell.on('pointerdown', () => {
          const current = this.timelineSelections[suspect.id]?.[slot.id];
          const allOptions = [''].concat(slot.options);
          const idx = allOptions.indexOf(current ?? '');
          const nextValue = allOptions[(idx + 1) % allOptions.length];

          if (!this.timelineSelections[suspect.id]) {
            this.timelineSelections[suspect.id] = {};
          }

          if (nextValue) {
            this.timelineSelections[suspect.id][slot.id] = nextValue;
          } else {
            delete this.timelineSelections[suspect.id][slot.id];
          }

          updateCell();
          this.refreshSummary();
        });

        updateCell();
      });

      rowY += 34;
    });
  }

  private renderBottomActions() {
    const extraBtn = this.makeButton(482, 812, 150, 38, '额外线索', 0x2563eb, true, () => this.unlockNextExtraClue());
    const hintBtn = this.makeButton(642, 812, 116, 38, '使用提示', 0xf59e0b, true, () => {
      const hint = this.hintSystem.getNextHint();
      if (!hint) {
        this.hintText.setText('提示已用完。');
        return;
      }
      this.hintText.setText(`提示 ${hint.level}：${hint.text}`);
      this.refreshClueList();
    });

    const submitBtn = this.makeButton(1210, 812, 168, 38, '提交结论', 0x16a34a, true, () => this.submitCase());
    submitBtn.border.setStrokeStyle(1, 0x86efac);

    extraBtn.border.setStrokeStyle(1, 0x60a5fa);
    hintBtn.border.setStrokeStyle(1, 0xfcd34d);
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

  private refreshSummary() {
    if (!this.summaryText) {
      return;
    }

    const suspectName = this.caseFile.suspects.find((s) => s.id === this.culpritChoice)?.name ?? '未选择';
    const lieName = this.caseFile.clues.find((c) => c.id === this.lieChoice)?.title ?? '未选择';

    const totalCells = this.caseFile.suspects.length * this.caseFile.timelineSlots.length;
    const filledCells = this.caseFile.suspects.reduce((count, suspect) => {
      return count + Object.keys(this.timelineSelections[suspect.id] ?? {}).length;
    }, 0);

    this.summaryText.setText(
      [
        '当前判断摘要',
        `- 嫌疑人：${suspectName}`,
        `- 关键谎言：${lieName}`,
        `- 作案方式：${this.methodInputValue ? '已填写' : '未填写'}`,
        `- 时间线完成度：${filledCells}/${totalCells}`,
        '- 点击已选选项可取消，避免误提交。'
      ].join('\n')
    );
  }

  private submitCase() {
    const answers: PlayerAnswers = {
      culpritId: this.culpritChoice,
      keyLieClueId: this.lieChoice,
      methodAnswer: this.methodInputValue,
      timelineSelections: this.timelineSelections
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
      usedExtraClues: this.usedExtraClues,
      timelineSelections: this.timelineSelections
    });
  }

  private getFilteredClues(): Clue[] {
    const visibleClues = this.caseFile.clues.filter((clue) => {
      if (clue.unlockMode === 'initial') return true;
      return this.unlockedExtraClueIds.has(clue.id);
    });

    if (this.clueCategory === 'all') return visibleClues;

    return visibleClues.filter((clue) => {
      if (this.clueCategory === 'testimony') {
        return clue.type === 'testimony';
      }
      if (this.clueCategory === 'physical') {
        return clue.type === 'physical';
      }
      if (this.clueCategory === 'record') {
        return clue.type === 'timeline';
      }
      if (this.clueCategory === 'chat') {
        return clue.type === 'digital';
      }
      return clue.unlockMode === 'extra' || clue.type === 'extra';
    });
  }

  private getCategoryLabel(category: ClueCategory): string {
    if (category === 'testimony') return '证词';
    if (category === 'physical') return '物证';
    if (category === 'record') return '记录';
    if (category === 'chat') return '监控/聊天';
    if (category === 'extra') return '额外线索';
    return '全部';
  }

  private getClueTypeLabel(type: Clue['type']): string {
    if (type === 'testimony') return '证词';
    if (type === 'physical') return '物证';
    if (type === 'timeline') return '记录';
    if (type === 'digital') return '监控/聊天';
    if (type === 'extra') return '额外线索';
    return type;
  }

  private getTotalCluePages(totalCount?: number): number {
    const total = totalCount ?? this.getFilteredClues().length;
    return Math.max(1, Math.ceil(total / this.cluePageSize));
  }

  private drawPanel(x: number, y: number, w: number, h: number, title: string) {
    this.add.rectangle(x + 4, y + 4, w, h, 0x020712, 0.45).setOrigin(0, 0);
    this.add.rectangle(x, y, w, h, 0x101826, 0.95).setOrigin(0, 0).setStrokeStyle(1, 0x334155);
    this.add.text(x + 16, y + 14, title, {
      fontSize: '21px',
      color: '#f8fafc',
      fontStyle: 'bold'
    });
  }

  private makeButton(
    x: number,
    y: number,
    w: number,
    h: number,
    label: string,
    color: number,
    enabled: boolean,
    onClick: () => void
  ) {
    const button = this.add.rectangle(x, y, w, h, enabled ? color : 0x334155, 1).setOrigin(0, 0).setStrokeStyle(1, 0x475569);
    const text = this.add.text(x + 14, y + 10, label, {
      fontSize: '16px',
      color: enabled ? '#ffffff' : '#94a3b8',
      fontStyle: 'bold'
    });

    if (enabled) {
      button.setInteractive({ useHandCursor: true });
      button.on('pointerover', () => button.setFillStyle(Phaser.Display.Color.IntegerToColor(color).darken(8).color));
      button.on('pointerout', () => button.setFillStyle(color));
      button.on('pointerdown', () => {
        button.setFillStyle(Phaser.Display.Color.IntegerToColor(color).darken(16).color);
        onClick();
      });
      button.on('pointerup', () => button.setFillStyle(color));
    }

    return { border: button, label: text };
  }
}
