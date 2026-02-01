import Phaser from 'phaser';
import { assetRegistry, characterRegistry } from '../game/content';
import type { AnimationKey } from '../game/types';

const ANIMATION_KEYS: AnimationKey[] = [
  'idle',
  'run',
  'jump',
  'fall',
  'neutral',
  'up',
  'down',
  'special',
  'hit',
  'ko'
];

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super('Preload');
  }

  preload() {
    this.loadAssets();
  }

  create() {
    this.createPlaceholderSprites();
    this.createPlaceholderPortraits();
    this.createAnimations();
    this.scene.start('Menu');
  }

  private loadAssets() {
    characterRegistry.getAllCharacters().forEach((character) => {
      const spriteAsset = assetRegistry.getSpriteSheet(character.spriteSheet);
      if (spriteAsset?.url) {
        this.load.spritesheet(character.spriteSheet, spriteAsset.url, {
          frameWidth: spriteAsset.frameWidth ?? character.frameSize.width,
          frameHeight: spriteAsset.frameHeight ?? character.frameSize.height
        });
      } else if (spriteAsset) {
        // eslint-disable-next-line no-console
        console.warn(`[ContentAssets] Missing sprite sheet asset for ${character.spriteSheet}`);
      }

      const uiAsset = assetRegistry.getUiIcon(character.ui.portraitIcon);
      if (uiAsset?.url) {
        this.load.image(character.ui.portraitIcon, uiAsset.url);
      } else if (uiAsset) {
        // eslint-disable-next-line no-console
        console.warn(`[ContentAssets] Missing UI icon asset for ${character.ui.portraitIcon}`);
      }
    });

    const fallbackUi = assetRegistry.getFallbackUiIcon();
    if (fallbackUi?.url) {
      this.load.image('ui-portrait-default', fallbackUi.url);
    } else if (fallbackUi) {
      // eslint-disable-next-line no-console
      console.warn('[ContentAssets] Missing fallback UI portrait asset.');
    }
  }

  private createPlaceholderSprites() {
    characterRegistry.getAllCharacters().forEach((character) => {
      if (this.textures.exists(character.spriteSheet)) {
        return;
      }

      const width = character.frameSize.width * 8;
      const height = character.frameSize.height;
      const canvasTexture = this.textures.createCanvas(`${character.id}-canvas`, width, height);
      const context = canvasTexture.getContext();
      const primary = character.palette.primary.replace('#', '');
      const neon = character.palette.neon.replace('#', '');

      context.fillStyle = `#${primary}`;
      context.fillRect(0, 0, width, height);
      context.fillStyle = `#${neon}`;
      context.font = '20px monospace';
      context.textAlign = 'center';
      context.textBaseline = 'middle';

      for (let frame = 0; frame < 8; frame += 1) {
        context.globalAlpha = 0.85 + frame * 0.02;
        context.fillText(character.displayName[0], frame * character.frameSize.width + 24, 24);
      }

      canvasTexture.refresh();
      this.textures.addSpriteSheet(character.spriteSheet, canvasTexture.getSourceImage(), {
        frameWidth: character.frameSize.width,
        frameHeight: character.frameSize.height,
        endFrame: 7
      });
    });
  }

  private createPlaceholderPortraits() {
    characterRegistry.getAllCharacters().forEach((character) => {
      if (this.textures.exists(character.ui.portraitIcon)) {
        return;
      }

      const canvasTexture = this.textures.createCanvas(`${character.id}-portrait`, 64, 64);
      const context = canvasTexture.getContext();
      const primary = character.palette.primary.replace('#', '');
      const neon = character.palette.neon.replace('#', '');

      context.fillStyle = `#${primary}`;
      context.fillRect(0, 0, 64, 64);
      context.strokeStyle = `#${neon}`;
      context.lineWidth = 4;
      context.strokeRect(4, 4, 56, 56);
      context.fillStyle = '#0b0f1a';
      context.font = '24px monospace';
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      context.fillText(character.displayName[0], 32, 34);

      canvasTexture.refresh();
      this.textures.addImage(character.ui.portraitIcon, canvasTexture.getSourceImage());
    });

    if (!this.textures.exists('ui-portrait-default')) {
      const canvasTexture = this.textures.createCanvas('ui-portrait-default', 64, 64);
      const context = canvasTexture.getContext();
      context.fillStyle = '#1a2035';
      context.fillRect(0, 0, 64, 64);
      context.fillStyle = '#2b3557';
      context.fillRect(6, 6, 52, 52);
      context.fillStyle = '#9aa4ff';
      context.fillRect(16, 16, 32, 32);
      canvasTexture.refresh();
      this.textures.addImage('ui-portrait-default', canvasTexture.getSourceImage());
    }
  }

  private createAnimations() {
    characterRegistry.getAllCharacters().forEach((character) => {
      ANIMATION_KEYS.forEach((key) => {
        const animation = character.animations[key];
        if (!animation) {
          return;
        }
        const frames = this.anims.generateFrameNumbers(character.spriteSheet, {
          start: animation.startFrame,
          end: animation.endFrame
        });
        this.anims.create({
          key: `${character.id}-${key}`,
          frames,
          frameRate: animation.frameRate,
          repeat: animation.loop ? -1 : 0
        });
      });
    });
  }
}
