import * as Phaser from 'phaser';
import { getCaseById } from '../../data/cases';
import { drawPanel, drawWorkbenchBackground, fadeInScene, makeButton } from './ui';

type BriefingData = { caseId: string };

export class BriefingScene extends Phaser.Scene {
  private caseId = '';

  constructor() {
    super('BriefingScene');
  }

  init(data: BriefingData) {
    this.caseId = data.caseId;
  }

  create() {
    const caseFile = getCaseById(this.caseId);
    if (!caseFile) throw new Error('Case not found');

    drawWorkbenchBackground(this);
    fadeInScene(this);

    drawPanel(this, 56, 48, 1328, 804, '案件导入 / BRIEFING');

    this.add.text(82, 94, caseFile.title, { fontSize: '34px', color: '#f8fafc', fontStyle: 'bold' });
    this.add.text(82, 138, `${caseFile.archiveMeta.location} ｜ ${caseFile.archiveMeta.incidentWindow}`, { fontSize: '15px', color: '#7dd3fc' });

    this.add.text(82, 182, caseFile.briefing.intro, { fontSize: '18px', color: '#e2e8f0', wordWrap: { width: 1220 }, lineSpacing: 6 });
    this.add.text(82, 258, `调查目标：${caseFile.briefing.objective}`, {
      fontSize: '16px',
      color: '#fde68a',
      wordWrap: { width: 1220 },
      lineSpacing: 4
    });

    let y = 312;
    caseFile.briefing.sections.forEach((section) => {
      this.add.rectangle(82, y, 1220, 126, 0x0b1424, 0.95).setOrigin(0, 0).setStrokeStyle(1, 0x334155);
      this.add.text(100, y + 14, section.headline, { fontSize: '22px', color: '#c4b5fd', fontStyle: 'bold' });
      this.add.text(100, y + 50, section.body, { fontSize: '15px', color: '#cbd5e1', wordWrap: { width: 1180 }, lineSpacing: 5 });
      y += 138;
    });

    this.add.text(82, 738, '主要涉事人员', { fontSize: '18px', color: '#93c5fd', fontStyle: 'bold' });
    this.add.text(82, 766, caseFile.suspects.map((s) => `${s.name}（${s.role}）`).join(' ｜ '), {
      fontSize: '14px',
      color: '#e2e8f0'
    });

    makeButton(this, 1182, 788, 186, 42, '开始调查', 0x16a34a, () => {
      this.scene.start('InvestigationScene', { caseId: caseFile.id, resetSession: true });
    });
    makeButton(this, 980, 788, 186, 42, '返回档案室', 0x1f2937, () => this.scene.start('ArchiveScene'));
  }
}
