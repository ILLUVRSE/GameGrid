import type Phaser from 'phaser';
import { MATCH_CONSTANTS } from './physics';
import type { CharacterData, MoveData, MoveKey } from './types';

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
  hitbox: Phaser.GameObjects.Rectangle;
  hitboxActive = false;
  queuedVelocity?: Phaser.Math.Vector2;

  constructor(scene: Phaser.Scene, x: number, y: number, playerId: number, data: CharacterData) {
    super(scene, x, y, data.spriteSheet, 0);
    this.playerId = playerId;
    this.data = data;

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setOrigin(0.5, 0.5);
    this.setScale(2);
    this.setSize(data.width * 0.6, data.height * 0.8);
    this.setOffset(data.width * 0.2, data.height * 0.2);
    this.setCollideWorldBounds(false);
    this.setBounce(0);
    this.setDragX(0);
    this.body.setMaxVelocity(600, 900);
    this.body.setGravityY(data.stats.gravity);

    this.hitbox = scene.add.rectangle(x, y, 20, 20, 0xff00ff, 0.3).setOrigin(0.5);
    scene.physics.add.existing(this.hitbox, true);
    this.hitbox.setVisible(false);
  }

  resetState(x: number, y: number) {
    this.setPosition(x, y);
    this.setVelocity(0, 0);
    this.damage = 0;
    this.jumpCount = MATCH_CONSTANTS.jumpCount;
    this.stunFrames = 0;
    this.hitstopFrames = 0;
    this.activeAttack = undefined;
    this.hitboxActive = false;
    this.hitbox.setVisible(false);
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

  updateAttack() {
    if (!this.activeAttack) {
      return;
    }
    const { move } = this.activeAttack;
    this.activeAttack.frame += 1;

    const isActive =
      this.activeAttack.frame >= move.active.start && this.activeAttack.frame <= move.active.end;

    this.hitboxActive = isActive;
    this.hitbox.setVisible(isActive);

    if (this.activeAttack.frame > move.frames.length + 6) {
      this.activeAttack = undefined;
      this.hitboxActive = false;
      this.hitbox.setVisible(false);
    }
  }

  updateHitbox() {
    if (!this.hitboxActive) {
      return;
    }
    const offsetX = 28 * this.facing;
    const offsetY = -6;
    this.hitbox.setPosition(this.x + offsetX, this.y + offsetY);
    (this.hitbox.body as Phaser.Physics.Arcade.StaticBody).updateFromGameObject();
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
}
