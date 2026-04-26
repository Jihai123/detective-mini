import './style.css';
import { migrateLegacySave } from './stage1/saveStore';
import { CaseSelector } from './case-selector/case-selector';
import { StageOneApp } from './stage1/app';

const root = document.querySelector<HTMLElement>('#app');
if (!root) throw new Error('缺少 #app 容器，无法挂载侦探主舞台。');

try {
  migrateLegacySave();
} catch (e) {
  console.warn('[main] legacy save migration failed, treating as no prior save', e);
}

let selector: CaseSelector | null = null;
let app: StageOneApp | null = null;

function showSelector(): void {
  app?.dispose();
  app = null;
  selector = new CaseSelector({
    root,
    onSelect: (caseId) => {
      selector?.dispose();
      selector = null;
      app = new StageOneApp({ root, caseId, onExit: showSelector });
    },
  });
}

showSelector();
