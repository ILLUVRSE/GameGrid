import Phaser from 'phaser';
import { characterList } from '../game/characters';

const ANIMATION_KEYS = ['idle', 'run', 'jump', 'fall', 'neutral', 'up', 'down', 'special', 'hit', 'ko'];

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super('Preload');
  }

  preload() {
    this.createPlaceholderSprites();
  }

  create() {
    this.createAnimations();
    this.scene.start('Menu');
  }

  private createPlaceholderSprites() {
    const colors = new Map([
      ['volt', 0x5ae3ff],
      ['forge', 0xff8a5b],
      ['nova', 0xc28bff],
      ['rizzle', 0xffd95a]
    ]);

    characterList.forEach((character) => {
      const width = character.width * 8;
      const height = character.height;
      const canvasTexture = this.textures.createCanvas(`${character.id}-canvas`, width, height);
      const context = canvasTexture.getContext();
      const color = colors.get(character.id) ?? 0xffffff;

      context.fillStyle = `#${color.toString(16).padStart(6, '0')}`;
      context.fillRect(0, 0, width, height);
      context.fillStyle = '#0b0f1a';
      context.font = '20px monospace';
      context.textAlign = 'center';
      context.textBaseline = 'middle';

      for (let frame = 0; frame < 8; frame += 1) {
        context.globalAlpha = 0.85 + frame * 0.02;
        context.fillText(character.displayName[0], frame * character.width + 24, 24);
      }

      canvasTexture.refresh();
      this.textures.addSpriteSheet(character.spriteSheet, canvasTexture.getSourceImage(), {
        frameWidth: character.width,
        frameHeight: character.height,
        endFrame: 7
      });
    });
  }

  private createAnimations() {
    characterList.forEach((character) => {
      ANIMATION_KEYS.forEach((key, index) => {
        const frames = this.anims.generateFrameNumbers(character.spriteSheet, {
          start: Math.max(0, index - 1),
          end: Math.min(7, index + 1)
        });
        this.anims.create({
          key: `${character.id}-${key}`,
          frames,
          frameRate: 10,
          repeat: -1
        });
      });
    });
  }
}
