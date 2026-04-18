import * as Phaser from 'phaser';
import { getCaseById } from '../../data/cases';
import type { EvidenceCategory } from '../../domain/types';
import { getCaseSession } from '../systems/InvestigationSessionStore';
import { drawCaseSceneBackground, drawPanel, fadeInScene, makeButton } from './ui';

type SceneData = { caseId: string };

const categoryDefs: Array<{ key: 'all' | EvidenceCategory; label: string }> = [
  { key: 'all', label: '全部' },
  { key: 'testimony', label: '证词' },
  { key: 'physical', label: '物证' },
  { key: 'record', label: '记录' },
  { key: 'surveillance', label: '监控/聊天' },
  { key: 'extra', label: '额外' }
];

export class EvidenceBoardScene extends Phaser.Scene {
  private caseId = '';
  private selectedCategory: 'all' | EvidenceCategory = 'all';
  private page = 0;

  constructor() {
    super('EvidenceBoardScene');
  }

  init(data: SceneData) {
    this.caseId = data.caseId;
  }

  create() {
    const caseFile = getCaseById(this.caseId);
    if (!caseFile) throw new Error('Case not found');
    const state = getCaseSession(caseFile);

    drawCaseSceneBackground(this, caseFile, 'archive');
    fadeInScene(this);

    drawPanel(this, 48, 44, 852, 810, '线索归档 / EVIDENCE BOARD');
    drawPanel(this, 914, 44, 478, 420, '线索详情');
    drawPanel(this, 914, 476, 478, 378, '关键证据摘要');

    const discovered = caseFile.clues.filter((clue) => state.discoveredClues.has(clue.id));

    let x = 70;
    categoryDefs.forEach((category) => {
      const active = this.selectedCategory === category.key;
      const btn = this.add.rectangle(x, 92, 78, 30, active ? 0x2563eb : 0x1f2937, 1).setOrigin(0, 0).setStrokeStyle(1, 0x475569);
      const t = this.add.text(x + 10, 100, category.label, { fontSize: '13px', color: active ? '#dbeafe' : '#e2e8f0' });
      btn.setInteractive({ useHandCursor: true });
      btn.on('pointerdown', () => {
        this.selectedCategory = category.key;
        this.page = 0;
        this.scene.restart({ caseId: caseFile.id });
      });
      this.add.existing(t);
      x += 84;
    });

    const filtered = discovered.filter((clue) => this.selectedCategory === 'all' || clue.category === this.selectedCategory);
    const pageSize = 5;
    const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
    const currentPage = Math.min(this.page, totalPages - 1);
    const pageItems = filtered.slice(currentPage * pageSize, currentPage * pageSize + pageSize);

    const detailTitle = this.add.text(934, 94, '点击线索卡查看详情', { fontSize: '16px', color: '#93c5fd' });
    const detailBody = this.add.text(934, 130, '', {
      fontSize: '14px',
      color: '#e2e8f0',
      wordWrap: { width: 438 },
      lineSpacing: 6
    });

    let y = 138;
    pageItems.forEach((clue) => {
      const selected = state.selectedKeyEvidence.has(clue.id);
      const card = this.add.rectangle(70, y, 808, 126, selected ? 0x113268 : 0x0b1424, 0.98).setOrigin(0, 0).setStrokeStyle(1, selected ? 0x38bdf8 : 0x334155);
      this.add.text(86, y + 10, `${clue.title} [${clue.category}]`, { fontSize: '17px', color: '#f8fafc', fontStyle: 'bold' });
      this.add.text(86, y + 42, clue.summary, {
        fontSize: '14px',
        color: '#cbd5e1',
        wordWrap: { width: 760 },
        lineSpacing: 4
      });

      const tag = this.add.text(704, y + 92, selected ? '已标记关键证据（点击取消）' : '点击标记关键证据', {
        fontSize: '12px',
        color: selected ? '#7dd3fc' : '#94a3b8'
      });

      card.setInteractive({ useHandCursor: true });
      card.on('pointerdown', () => {
        if (state.selectedKeyEvidence.has(clue.id)) {
          state.selectedKeyEvidence.delete(clue.id);
        } else {
          state.selectedKeyEvidence.add(clue.id);
        }
        detailTitle.setText(clue.title);
        detailBody.setText(`${clue.detail}\n\n关联人物：${clue.relatedSuspectIds.join(' / ')}\n来源热区：${clue.discoveredBy}`);
        tag.setText(state.selectedKeyEvidence.has(clue.id) ? '已标记关键证据（点击取消）' : '点击标记关键证据');
        card.setFillStyle(state.selectedKeyEvidence.has(clue.id) ? 0x113268 : 0x0b1424);
        card.setStrokeStyle(1, state.selectedKeyEvidence.has(clue.id) ? 0x38bdf8 : 0x334155);
        this.scene.restart({ caseId: caseFile.id });
      });
      y += 136;
    });

    if (pageItems.length === 0) {
      this.add.text(86, 154, '当前分类暂无已发现线索。请先回调查场景解锁热区。', { fontSize: '14px', color: '#fbbf24' });
    }

    const pageText = this.add.text(70, 822, `第 ${currentPage + 1} / ${totalPages} 页`, { fontSize: '13px', color: '#93c5fd' });
    pageText.setText(`第 ${currentPage + 1} / ${totalPages} 页  ｜  已发现：${discovered.length}/${caseFile.clues.length}`);

    makeButton(this, 760, 816, 56, 32, '◀', 0x1f2937, () => {
      this.page = Math.max(0, currentPage - 1);
      this.scene.restart({ caseId: caseFile.id });
    }, currentPage <= 0);
    makeButton(this, 822, 816, 56, 32, '▶', 0x1f2937, () => {
      this.page = Math.min(totalPages - 1, currentPage + 1);
      this.scene.restart({ caseId: caseFile.id });
    }, currentPage >= totalPages - 1);

    this.refreshSummary(caseFile.id);

    makeButton(this, 934, 804, 150, 38, '返回调查', 0x1f2937, () => this.scene.start('InvestigationScene', { caseId: caseFile.id }));
    makeButton(this, 1092, 804, 150, 38, '时间线板', 0x7c3aed, () => this.scene.start('TimelineScene', { caseId: caseFile.id }));
    makeButton(this, 1250, 804, 130, 38, '结案提交', 0x16a34a, () => this.scene.start('DeductionScene', { caseId: caseFile.id }));
  }

  private refreshSummary(caseId: string): void {
    const caseFile = getCaseById(caseId);
    if (!caseFile) return;
    const state = getCaseSession(caseFile);
    const selected = caseFile.clues.filter((clue) => state.selectedKeyEvidence.has(clue.id));

    this.add.rectangle(934, 526, 438, 258, 0x0b1424, 1).setOrigin(0, 0).setStrokeStyle(1, 0x334155);
    this.add.text(946, 538, `已标记关键证据：${selected.length}`, { fontSize: '15px', color: '#93c5fd' });
    this.add.text(
      946,
      570,
      selected.length === 0 ? '尚未标记。建议先标记能形成“时间+路径+动机”的证据。' : selected.map((item) => `• ${item.title}\n  ${item.summary}`).join('\n\n'),
      { fontSize: '13px', color: '#e2e8f0', wordWrap: { width: 414 }, lineSpacing: 5 }
    );
  }
}
