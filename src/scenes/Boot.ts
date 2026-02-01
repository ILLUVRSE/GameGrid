import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../game/physics';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create() {
    this.scale.resize(GAME_WIDTH, GAME_HEIGHT);
    this.scene.start('Preload');
  }
}
