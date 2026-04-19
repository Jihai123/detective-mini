import * as Phaser from 'phaser';
import { getCaseById } from '../../data/cases';
import { getCaseAssetTextureKey } from '../systems/CaseAssetStore';
import { fadeInScene, makeButton } from './ui';

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

    this.cameras.main.setBackgroundColor('#020617');
    const bgKey = getCaseAssetTextureKey(caseFile, 'scenes', 'main');
    if (bgKey && this.textures.exists(bgKey)) {
      const bg = this.add.image(720, 450, bgKey).setAlpha(0.94);
      const source = this.textures.get(bgKey).getSourceImage() as { width: number; height: number };
      bg.setScale(Math.max(1440 / source.width, 900 / source.height));
    } else {
      this.add.rectangle(0, 0, 1440, 900, 0x020617, 1).setOrigin(0, 0);
    }

    this.add.rectangle(0, 0, 1440, 900, 0x020617, 0.48).setOrigin(0, 0);
    this.add.rectangle(80, 80, 1280, 740, 0x020617, 0.52).setOrigin(0, 0).setStrokeStyle(1, 0x64748b, 0.85);
    this.add.rectangle(80, 80, 1280, 160, 0x020617, 0.4).setOrigin(0, 0);

    this.add.text(108, 112, '案件导入 / CASE BRIEFING', { fontSize: '24px', color: '#93c5fd', fontStyle: 'bold' });
    this.add.text(108, 148, caseFile.title, { fontSize: '42px', color: '#f8fafc', fontStyle: 'bold' });
    this.add.text(108, 202, `${caseFile.archiveMeta.location} ｜ ${caseFile.archiveMeta.incidentWindow}`, { fontSize: '15px', color: '#c4b5fd' });

    this.add.text(108, 272, caseFile.briefing.intro, { fontSize: '19px', color: '#e2e8f0', wordWrap: { width: 1220 }, lineSpacing: 8 });
    this.add.text(108, 356, `调查目标：${caseFile.briefing.objective}`, {
      fontSize: '17px',
      color: '#fde68a',
      wordWrap: { width: 1220 },
      lineSpacing: 6
    });

    let y = 420;
    caseFile.briefing.sections.forEach((section) => {
      this.add.rectangle(108, y, 980, 102, 0x020617, 0.58).setOrigin(0, 0).setStrokeStyle(1, 0x475569);
      this.add.text(126, y + 14, section.headline, { fontSize: '22px', color: '#bfdbfe', fontStyle: 'bold' });
      this.add.text(126, y + 48, section.body, { fontSize: '14px', color: '#e2e8f0', wordWrap: { width: 942 }, lineSpacing: 6 });
      y += 114;
    });

    this.add.rectangle(1110, 420, 226, 216, 0x020617, 0.58).setOrigin(0, 0).setStrokeStyle(1, 0x475569);
    this.add.text(1124, 440, '涉案角色', { fontSize: '18px', color: '#93c5fd', fontStyle: 'bold' });
    this.add.text(1124, 472, caseFile.suspects.map((s) => `• ${s.name}\n  ${s.role}`).join('\n'), {
      fontSize: '14px',
      color: '#e2e8f0',
      lineSpacing: 8,
      wordWrap: { width: 198 }
    });

    makeButton(this, 1042, 760, 294, 44, '进入主调查场景', 0x16a34a, () => {
      this.scene.start('InvestigationScene', { caseId: caseFile.id, resetSession: true });
    });
    makeButton(this, 892, 760, 138, 44, '返回档案室', 0x1f2937, () => this.scene.start('ArchiveScene'));

    fadeInScene(this);
  }
}
