import * as Phaser from 'phaser';
import { gameConfig } from './config';
import { BootScene } from './scenes/BootScene';
import { MenuScene } from './scenes/MenuScene';
import { CaseScene } from './scenes/CaseScene';
import { ResultScene } from './scenes/ResultScene';

export class GameApp extends Phaser.Game {
  constructor() {
    super(gameConfig);

    this.scene.add('BootScene', BootScene, true);
    this.scene.add('MenuScene', MenuScene, false);
    this.scene.add('CaseScene', CaseScene, false);
    this.scene.add('ResultScene', ResultScene, false);
  }
}
