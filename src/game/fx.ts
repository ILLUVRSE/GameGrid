import type Phaser from 'phaser';

export class HitFx {
  private scene: Phaser.Scene;
  private hitParticles?: Phaser.GameObjects.Particles.ParticleEmitterManager;
  private dustParticles?: Phaser.GameObjects.Particles.ParticleEmitterManager;
  private trailParticles?: Phaser.GameObjects.Particles.ParticleEmitterManager;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.createParticleTextures();
  }

  private createParticleTextures() {
    const textures = this.scene.textures;

    if (!textures.exists('hit-particle')) {
      const hitGfx = this.scene.add.graphics();
      hitGfx.fillStyle(0xffffff, 1);
      hitGfx.fillCircle(4, 4, 4);
      hitGfx.generateTexture('hit-particle', 8, 8);
      hitGfx.destroy();
    }

    if (!textures.exists('dust-particle')) {
      const dustGfx = this.scene.add.graphics();
      dustGfx.fillStyle(0xffffff, 1);
      dustGfx.fillRect(0, 0, 6, 3);
      dustGfx.generateTexture('dust-particle', 6, 3);
      dustGfx.destroy();
    }

    if (!textures.exists('dash-trail')) {
      const trailGfx = this.scene.add.graphics();
      trailGfx.fillStyle(0xffffff, 1);
      trailGfx.fillRect(0, 0, 10, 2);
      trailGfx.generateTexture('dash-trail', 10, 2);
      trailGfx.destroy();
    }

    this.hitParticles = this.scene.add.particles(0, 0, 'hit-particle', {
      lifespan: 240,
      speed: { min: 110, max: 240 },
      scale: { start: 0.9, end: 0 },
      quantity: 12,
      gravityY: 220
    });
    this.hitParticles.stop();

    this.dustParticles = this.scene.add.particles(0, 0, 'dust-particle', {
      lifespan: 260,
      speed: { min: 40, max: 120 },
      scale: { start: 1.2, end: 0 },
      quantity: 6,
      gravityY: -40,
      angle: { min: 200, max: 340 }
    });
    this.dustParticles.stop();

    this.trailParticles = this.scene.add.particles(0, 0, 'dash-trail', {
      lifespan: 180,
      speed: { min: 20, max: 60 },
      scale: { start: 1.1, end: 0 },
      quantity: 4,
      alpha: { start: 0.7, end: 0 },
      angle: { min: 160, max: 200 }
    });
    this.trailParticles.stop();
  }

  burst(x: number, y: number, tint: number) {
    if (!this.hitParticles) {
      return;
    }
    this.hitParticles.setTint(tint);
    this.hitParticles.emitParticleAt(x, y, 16);
  }

  landingDust(x: number, y: number, tint: number) {
    if (!this.dustParticles) {
      return;
    }
    this.dustParticles.setTint(tint);
    this.dustParticles.emitParticleAt(x, y, 10);
  }

  dashTrail(x: number, y: number, tint: number, facing: number, count = 6) {
    if (!this.trailParticles) {
      return;
    }
    const angle = facing === 1 ? 180 : 0;
    this.trailParticles.setTint(tint);
    this.trailParticles.setAngle({ min: angle - 15, max: angle + 15 });
    this.trailParticles.emitParticleAt(x, y, count);
  }

  flash(target: Phaser.GameObjects.Sprite, tint: number) {
    const originalTint = target.tintTopLeft;
    target.setTintFill(0xffffff);
    this.scene.time.delayedCall(60, () => {
      target.setTint(tint || originalTint);
      this.scene.time.delayedCall(80, () => {
        target.setTint(originalTint);
      });
    });
  }

  destroy() {
    this.hitParticles?.destroy();
    this.dustParticles?.destroy();
    this.trailParticles?.destroy();
  }
}
