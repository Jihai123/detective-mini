import * as Phaser from 'phaser';
import { getCaseById } from '../../data/cases';
import { getCaseAssetTextureKey } from '../systems/CaseAssetStore';
import { getCaseSession } from '../systems/InvestigationSessionStore';
import { addContainedImage, drawCaseSceneBackground, drawPanel, fadeInScene, makeButton } from './ui';

type SceneData = { caseId: string };

export class ProfilesScene extends Phaser.Scene {
  private caseId = '';

  constructor() {
    super('ProfilesScene');
  }

  init(data: SceneData) {
    this.caseId = data.caseId;
  }

  create() {
    const caseFile = getCaseById(this.caseId);
    if (!caseFile) throw new Error('Case not found');
    const state = getCaseSession(caseFile);

    drawCaseSceneBackground(this, caseFile, 'hallway');
    fadeInScene(this);

    drawPanel(this, 48, 44, 520, 810, '人物档案');
    drawPanel(this, 582, 44, 810, 810, '谈话片段');

    this.add.text(70, 90, caseFile.title, { fontSize: '26px', color: '#f8fafc', fontStyle: 'bold' });

    let y = 130;
    caseFile.suspects.forEach((s) => {
      this.add.rectangle(70, y, 476, 172, 0x0b1424, 0.78).setOrigin(0, 0).setStrokeStyle(1, 0x334155);
      this.add.rectangle(84, y + 16, 108, 140, 0x020617, 0.65).setOrigin(0, 0).setStrokeStyle(1, 0x334155);
      const portraitKey = s.portraitAsset ? getCaseAssetTextureKey(caseFile, 'characters', s.portraitAsset) : undefined;
      if (portraitKey && this.textures.exists(portraitKey)) {
        addContainedImage(this, 86, y + 18, 104, 136, portraitKey, 1);
      }

      this.add.text(202, y + 10, `${s.name}｜${s.role}`, { fontSize: '20px', color: '#e2e8f0', fontStyle: 'bold' });
      this.add.text(202, y + 44, `身份：${s.identity}\n关系：${s.relationToCase}\n当晚行为：${s.nightAction}\n可疑点：${s.suspiciousPoint}\n动机：${s.motive}`, {
        fontSize: '13px',
        color: '#cbd5e1',
        wordWrap: { width: 334 },
        lineSpacing: 4
      });
      y += 184;
    });

    this.add.text(604, 90, '已解锁谈话（按调查进度）', { fontSize: '18px', color: '#93c5fd', fontStyle: 'bold' });

    const unlocked = caseFile.conversations.filter((item) => state.unlockedConversations.has(item.id));
    const locked = caseFile.conversations.filter((item) => !state.unlockedConversations.has(item.id));

    let cy = 126;
    unlocked.forEach((conv) => {
      this.add.rectangle(604, cy, 766, 146, 0x111827, 0.8).setOrigin(0, 0).setStrokeStyle(1, 0x22c55e);
      const suspect = caseFile.suspects.find((s) => s.id === conv.suspectId);
      this.add.text(620, cy + 10, `${conv.title}｜${suspect?.name ?? '未知人物'}`, { fontSize: '18px', color: '#bbf7d0', fontStyle: 'bold' });
      this.add.text(620, cy + 44, conv.lines.map((line) => `- ${line}`).join('\n'), {
        fontSize: '14px',
        color: '#e2e8f0',
        wordWrap: { width: 736 },
        lineSpacing: 6
      });
      cy += 158;
    });

    if (unlocked.length === 0) {
      this.add.text(620, 140, '暂未解锁谈话。先前往场景调查热区。', { fontSize: '14px', color: '#fbbf24' });
    }

    if (locked.length > 0) {
      this.add.text(604, 690, `未解锁谈话：${locked.length} 条（继续调查可解锁）`, { fontSize: '14px', color: '#94a3b8' });
    }

    makeButton(this, 604, 744, 186, 40, '返回调查', 0x1f2937, () => this.scene.start('InvestigationScene', { caseId: caseFile.id }));
    makeButton(this, 798, 744, 186, 40, '线索归档板', 0x0ea5e9, () => this.scene.start('EvidenceBoardScene', { caseId: caseFile.id }));
    makeButton(this, 992, 744, 186, 40, '时间线板', 0x7c3aed, () => this.scene.start('TimelineScene', { caseId: caseFile.id }));
    makeButton(this, 1186, 744, 186, 40, '结案提交', 0x16a34a, () => this.scene.start('DeductionScene', { caseId: caseFile.id }));
  }
}
