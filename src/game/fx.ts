import type Phaser from 'phaser';

export class HitFx {
  private scene: Phaser.Scene;
  private particles?: Phaser.GameObjects.Particles.ParticleEmitterManager;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.createParticleTexture();
  }

  private createParticleTexture() {
    const gfx = this.scene.add.graphics();
    gfx.fillStyle(0xffffff, 1);
    gfx.fillCircle(4, 4, 4);
    gfx.generateTexture('hit-particle', 8, 8);
    gfx.destroy();

    this.particles = this.scene.add.particles(0, 0, 'hit-particle', {
      lifespan: 220,
      speed: { min: 80, max: 200 },
      scale: { start: 0.9, end: 0 },
      quantity: 10,
      gravityY: 200
    });
    this.particles.stop();
  }

  burst(x: number, y: number, tint: number) {
    if (!this.particles) {
      return;
    }
    this.particles.setTint(tint);
    this.particles.emitParticleAt(x, y, 14);
  }

  flash(target: Phaser.GameObjects.Sprite) {
    target.setTintFill(0xffffff);
    this.scene.time.delayedCall(80, () => {
      target.clearTint();
    });
  }
}
