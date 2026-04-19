import './style.css';
import { StageOneApp } from './stage1/app';

const root = document.querySelector<HTMLElement>('#app');

if (!root) {
  throw new Error('缺少 #app 容器，无法挂载侦探主舞台。');
}

new StageOneApp(root, 'case-001');
