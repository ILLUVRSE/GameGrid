import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../game/physics';
import type { MatchResult } from '../game/hooks';

export class ResultsScene extends Phaser.Scene {
  constructor() {
    super('Results');
  }

  create() {
    const results = (this.registry.get('results') as MatchResult[]) ?? [];

    this.add
      .text(GAME_WIDTH / 2, 80, 'Results', {
        fontSize: '36px',
        color: '#ffffff'
      })
      .setOrigin(0.5);

    results.forEach((result, index) => {
      this.add
        .text(GAME_WIDTH / 2, 160 + index * 40, `#${result.placement} - P${result.playerId}`, {
          fontSize: '20px',
          color: '#cfd6ff'
        })
        .setOrigin(0.5);
    });

    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT - 90, 'Press Enter for Rematch', {
        fontSize: '18px',
        color: '#ffffff'
      })
      .setOrigin(0.5);

    const keyboard = this.input.keyboard;
    if (keyboard) {
      keyboard.once('keydown-ENTER', () => {
        this.scene.start('CharacterSelect');
      });
    }
  }
}
