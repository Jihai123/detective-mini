import * as Phaser from 'phaser';
import { gameConfig } from './config';
import { BootScene } from './scenes/BootScene';
import { ArchiveScene } from './scenes/ArchiveScene';
import { BriefingScene } from './scenes/BriefingScene';
import { InvestigationScene } from './scenes/InvestigationScene';
import { ProfilesScene } from './scenes/ProfilesScene';
import { EvidenceBoardScene } from './scenes/EvidenceBoardScene';
import { TimelineScene } from './scenes/TimelineScene';
import { DeductionScene } from './scenes/DeductionScene';
import { CaseReportScene } from './scenes/CaseReportScene';

export class GameApp extends Phaser.Game {
  constructor() {
    super(gameConfig);

    this.scene.add('BootScene', BootScene, true);
    this.scene.add('ArchiveScene', ArchiveScene, false);
    this.scene.add('BriefingScene', BriefingScene, false);
    this.scene.add('InvestigationScene', InvestigationScene, false);
    this.scene.add('ProfilesScene', ProfilesScene, false);
    this.scene.add('EvidenceBoardScene', EvidenceBoardScene, false);
    this.scene.add('TimelineScene', TimelineScene, false);
    this.scene.add('DeductionScene', DeductionScene, false);
    this.scene.add('CaseReportScene', CaseReportScene, false);
  }
}
