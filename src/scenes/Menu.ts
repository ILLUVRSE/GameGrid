import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../game/physics';

export class MenuScene extends Phaser.Scene {
  private debugMode = false;
  private debugText?: Phaser.GameObjects.Text;

  constructor() {
    super('Menu');
  }

  create() {
    this.add
      .text(GAME_WIDTH / 2, 120, 'PixelBrawl v0.1', {
        fontSize: '40px',
        color: '#ffffff'
      })
      .setOrigin(0.5);

    this.add
      .text(GAME_WIDTH / 2, 190, 'Local Platform Fighter Prototype', {
        fontSize: '18px',
        color: '#9aa4ff'
      })
      .setOrigin(0.5);

    this.debugText = this.add
      .text(GAME_WIDTH / 2, 280, 'Debug: OFF (Press D to toggle)', {
        fontSize: '18px',
        color: '#ffffff'
      })
      .setOrigin(0.5);

    this.add
      .text(GAME_WIDTH / 2, 340, 'Press Enter to Start', {
        fontSize: '20px',
        color: '#ffffff'
      })
      .setOrigin(0.5);

    this.add
      .text(
        GAME_WIDTH / 2,
        GAME_HEIGHT - 80,
        'P1: A/D move, W jump, J attack, K special, Shift dash',
        {
          fontSize: '14px',
          color: '#b0b6ff'
        }
      )
      .setOrigin(0.5);

    this.add
      .text(
        GAME_WIDTH / 2,
        GAME_HEIGHT - 50,
        'P2: Arrows move/jump, Num1 attack, Num2 special, Num0 dash',
        {
          fontSize: '14px',
          color: '#b0b6ff'
        }
      )
      .setOrigin(0.5);

    const keyboard = this.input.keyboard;
    if (keyboard) {
      keyboard.on('keydown-D', () => {
        this.debugMode = !this.debugMode;
        this.registry.set('debugMode', this.debugMode);
        this.debugText?.setText(`Debug: ${this.debugMode ? 'ON' : 'OFF'} (Press D to toggle)`);
      });

      keyboard.on('keydown-ENTER', () => {
        this.registry.set('debugMode', this.debugMode);
        this.scene.start('CharacterSelect');
      });
    }
  }
}
