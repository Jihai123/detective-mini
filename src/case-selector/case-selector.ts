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
      <section class="directory-shell">
        <header class="directory-header">
          <h1>案件目录 / CASE DIRECTORY</h1>
          <p>选择要调查的案件</p>
        </header>
        <section class="directory-grid">${cards}</section>
      </section>
    `;
  }

  private renderCard(meta: CaseMeta): string {
    if (!meta.unlocked) {
      return `
        <article class="directory-card directory-card-locked" aria-disabled="true">
          <div class="directory-card-content">
            <h3>${meta.title}</h3>
            <p class="directory-tags">${this.difficultyLabel(meta.difficulty)}</p>
            <span class="directory-locked-tag"><svg width="10" height="12" viewBox="0 0 10 12" fill="none" aria-hidden="true"><rect x=".75" y="5.25" width="8.5" height="6.5" rx="1" stroke="currentColor" stroke-width="1.5"/><path d="M2.5 5V3a2.5 2.5 0 015 0v2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg> 即将上线</span>
          </div>
        </article>
      `;
    }

    const isMain = meta.order === 1;
    const hasSave = !!localStorage.getItem(getSaveKey(meta.id));
    const btnLabel = hasSave ? '继续调查' : '开始调查';

    return `
      <article class="directory-card${isMain ? ' directory-card-main' : ''}">
        ${isMain ? `<div class="directory-card-cover" style="background-image:url('/assets/cases/${meta.id}/scenes/archive_cover.jpg')"></div>` : ''}
        <div class="directory-card-content">
          ${isMain ? `<h2>${meta.title}</h2>` : `<h3>${meta.title}</h3>`}
          <p class="directory-tags">${this.difficultyLabel(meta.difficulty)}</p>
          <button class="primary-btn directory-enter-btn" data-select-case="${meta.id}">${btnLabel}</button>
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
