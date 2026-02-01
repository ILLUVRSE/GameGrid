import Phaser from 'phaser';
import { BootScene } from './scenes/Boot';
import { PreloadScene } from './scenes/Preload';
import { MenuScene } from './scenes/Menu';
import { CharacterSelectScene } from './scenes/CharacterSelect';
import { StageSelectScene } from './scenes/StageSelect';
import { MatchScene } from './scenes/Match';
import { ResultsScene } from './scenes/Results';
import { GAME_HEIGHT, GAME_WIDTH } from './game/physics';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  parent: 'app',
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 0 },
      debug: false
    }
  },
  pixelArt: true,
  scene: [
    BootScene,
    PreloadScene,
    MenuScene,
    CharacterSelectScene,
    StageSelectScene,
    MatchScene,
    ResultsScene
  ]
};

new Phaser.Game(config);
