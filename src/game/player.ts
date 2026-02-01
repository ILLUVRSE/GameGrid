import type Phaser from 'phaser';
import { MATCH_CONSTANTS } from './physics';
import type { CharacterData, MoveData, MoveHitbox, MoveKey } from './types';

export interface AttackState {
  moveKey: MoveKey;
  move: MoveData;
  frame: number;
  hitTargets: Set<number>;
}

export class Player extends Phaser.Physics.Arcade.Sprite {
  readonly playerId: number;
  readonly data: CharacterData;
  damage = 0;
  stocks = 3;
  facing = 1;
  jumpCount = MATCH_CONSTANTS.jumpCount;
  stunFrames = 0;
  hitstopFrames = 0;
  activeAttack?: AttackState;
  hitboxes: Phaser.GameObjects.Rectangle[] = [];
  activeHitboxes: MoveHitbox[] = [];
  hitboxActive = false;
  queuedVelocity?: Phaser.Math.Vector2;
  coyoteFrames = 0;
  jumpBufferFrames = 0;
  hitCooldownFrames = 0;
  knockbackFrames = 0;
  wasGrounded = false;
  lastFallSpeed = 0;

  constructor(scene: Phaser.Scene, x: number, y: number, playerId: number, data: CharacterData) {
    super(scene, x, y, data.spriteSheet, 0);
    this.playerId = playerId;
    this.data = data;

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setOrigin(0.5, 0.5);
    this.setScale(2);
    this.setSize(data.hurtbox.width, data.hurtbox.height);
    this.setOffset(data.hurtbox.offsetX, data.hurtbox.offsetY);
    this.setCollideWorldBounds(false);
    this.setBounce(0);
    this.setDragX(0);
    this.body.setMaxVelocity(
      Math.max(data.stats.speed, MATCH_CONSTANTS.dashSpeed),
      data.stats.jump * 2.4
    );
    this.body.setGravityY(data.stats.gravity);
  }

  resetState(x: number, y: number) {
    this.setPosition(x, y);
    this.setVelocity(0, 0);
    this.damage = 0;
    this.jumpCount = MATCH_CONSTANTS.jumpCount;
    this.stunFrames = 0;
    this.hitstopFrames = 0;
    this.activeAttack = undefined;
    this.activeHitboxes = [];
    this.hitboxActive = false;
    this.setHitboxVisibility(false);
    this.coyoteFrames = 0;
    this.jumpBufferFrames = 0;
    this.hitCooldownFrames = 0;
    this.knockbackFrames = 0;
    this.wasGrounded = false;
    this.lastFallSpeed = 0;
  }

  startAttack(moveKey: MoveKey) {
    if (this.activeAttack) {
      return;
    }
    const move = this.data.moves[moveKey];
    this.activeAttack = {
      moveKey,
      move,
      frame: 0,
      hitTargets: new Set()
    };
    this.play(`${this.data.id}-${moveKey}`, true);
  }

  cancelAttack(moveKey: MoveKey) {
    this.activeAttack = undefined;
    this.activeHitboxes = [];
    this.hitboxActive = false;
    this.setHitboxVisibility(false);
    this.startAttack(moveKey);
  }

  updateAttack() {
    if (!this.activeAttack) {
      return;
    }
    const { move } = this.activeAttack;
    this.activeAttack.frame += 1;

    const lastActiveFrame = Math.max(...move.activeFrames.map((window) => window.endFrame));
    const totalFrames = lastActiveFrame + move.endLagFrames;

    const currentFrame = this.activeAttack.frame;
    const activeWindow = move.activeFrames.find(
      (window) => currentFrame >= window.startFrame && currentFrame <= window.endFrame
    );

    this.activeHitboxes = activeWindow?.hitboxes ?? [];
    this.hitboxActive = Boolean(activeWindow);
    this.setHitboxVisibility(this.hitboxActive);

    if (this.activeAttack.frame > totalFrames) {
      this.activeAttack = undefined;
      this.activeHitboxes = [];
      this.hitboxActive = false;
      this.setHitboxVisibility(false);
    }
  }

  updateHitboxes() {
    if (!this.hitboxActive) {
      return;
    }
    this.ensureHitboxCount(this.activeHitboxes.length);
    this.activeHitboxes.forEach((hitbox, index) => {
      const rect = this.hitboxes[index];
      const offsetX = hitbox.x * this.facing;
      const offsetY = hitbox.y;
      rect.setSize(hitbox.width, hitbox.height);
      rect.setPosition(this.x + offsetX, this.y + offsetY);
      rect.setVisible(true);
      const body = rect.body as Phaser.Physics.Arcade.StaticBody | undefined;
      body?.updateFromGameObject();
    });
    for (let i = this.activeHitboxes.length; i < this.hitboxes.length; i += 1) {
      this.hitboxes[i].setVisible(false);
    }
  }

  getActiveHitboxes() {
    return this.activeHitboxes.map((hitbox, index) => ({
      hitbox,
      bounds: this.hitboxes[index]?.getBounds()
    }));
  }

  applyStun(frames: number) {
    this.stunFrames = Math.max(this.stunFrames, frames);
  }

  applyHitstop(frames: number) {
    this.hitstopFrames = Math.max(this.hitstopFrames, frames);
  }

  queueVelocity(x: number, y: number) {
    this.queuedVelocity = new Phaser.Math.Vector2(x, y);
  }

  override destroy(fromScene?: boolean) {
    this.hitboxes.forEach((rect) => rect.destroy());
    super.destroy(fromScene);
  }

  private ensureHitboxCount(count: number) {
    for (let i = this.hitboxes.length; i < count; i += 1) {
      const rect = this.scene
        .add
        .rectangle(this.x, this.y, 20, 20, 0xff00ff, 0.3)
        .setOrigin(0.5);
      this.scene.physics.add.existing(rect, true);
      rect.setVisible(false);
      this.hitboxes.push(rect);
    }
  }

  private setHitboxVisibility(visible: boolean) {
    this.hitboxes.forEach((rect) => rect.setVisible(visible));
  }
}
