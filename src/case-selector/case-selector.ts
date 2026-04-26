import { CASE_REGISTRY } from '../cases';
import type { CaseMeta } from '../cases/types';
import { getSaveKey } from '../stage1/saveStore';

export class CaseSelector {
  private readonly root: HTMLElement;
  private readonly onSelect: (caseId: string) => void;

  constructor({ root, onSelect }: { root: HTMLElement; onSelect: (caseId: string) => void }) {
    this.root = root;
    this.onSelect = onSelect;
    this.render();
    this.bindEvents();
  }

  dispose(): void {
    this.root.innerHTML = '';
  }

  private render(): void {
    const cards = CASE_REGISTRY
      .slice()
      .sort((a, b) => a.meta.order - b.meta.order)
      .map((def) => this.renderCard(def.meta))
      .join('');

    this.root.innerHTML = `
      <section class="archive-shell">
        <header class="archive-header">
          <h1>档案室 / CASE ARCHIVE</h1>
          <p>选择要调查的案件</p>
        </header>
        <section class="archive-grid">${cards}</section>
      </section>
    `;
  }

  private renderCard(meta: CaseMeta): string {
    if (!meta.unlocked) {
      return `
        <article class="case-card case-card-side case-card-locked" aria-disabled="true" title="敬请期待">
          <div class="case-card-content">
            <h3>${meta.title}</h3>
            <p class="case-tags">${this.difficultyLabel(meta.difficulty)}</p>
            <p class="case-summary">该档案尚未开放，请等待后续更新。</p>
            <span class="locked-tag">即将上线</span>
          </div>
        </article>
      `;
    }

    const isMain = meta.order === 1;
    const hasSave = !!localStorage.getItem(getSaveKey(meta.id));
    const btnLabel = hasSave ? '继续调查' : '开始调查';

    return `
      <article class="case-card ${isMain ? 'case-card-main' : 'case-card-side'}">
        ${isMain ? `<div class="case-card-cover" style="background-image:url('/assets/cases/${meta.id}/scenes/archive_cover.jpg')"></div>` : ''}
        <div class="case-card-content">
          ${isMain ? `<h2>${meta.title}</h2>` : `<h3>${meta.title}</h3>`}
          <p class="case-tags">${this.difficultyLabel(meta.difficulty)}</p>
          <button class="${isMain ? 'primary-btn archive-enter-btn' : 'ghost-btn'}" data-select-case="${meta.id}">${btnLabel}</button>
        </div>
      </article>
    `;
  }

  private difficultyLabel(difficulty: CaseMeta['difficulty']): string {
    const map: Record<CaseMeta['difficulty'], string> = {
      tutorial: '教学档案',
      normal: '标准难度',
      hard: '高难度',
    };
    return map[difficulty];
  }

  private bindEvents(): void {
    this.root.querySelectorAll<HTMLButtonElement>('[data-select-case]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const caseId = btn.dataset.selectCase;
        if (caseId) this.onSelect(caseId);
      });
    });
  }
}
