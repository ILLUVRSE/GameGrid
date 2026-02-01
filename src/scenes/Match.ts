import Phaser from 'phaser';
import { characterMap } from '../game/characters';
import { HitFx } from '../game/fx';
import { onMatchEnd, onMatchStart, onPlayerKO } from '../game/hooks';
import { InputManager } from '../game/inputManager';
import { Player } from '../game/player';
import { calculateKnockbackMagnitude, getKnockbackDirection, KNOCKBACK_CONFIG } from '../game/knockback';
import {
  GAME_HEIGHT,
  GAME_WIDTH,
  HUD_CONFIG,
  MATCH_CONSTANTS,
  PLATFORM_CONFIG,
  WORLD_BOUNDS
} from '../game/physics';
import type { MatchResult, MatchData } from '../game/hooks';
import type { CharacterData, MoveData, PlayerSelection } from '../game/types';
import { MatchHud } from '../game/ui';

const SPAWN_POINTS = [
  { x: 240, y: 200 },
  { x: 720, y: 200 },
  { x: 320, y: 140 },
  { x: 640, y: 140 }
];

export class MatchScene extends Phaser.Scene {
  private inputManager!: InputManager;
  private players: Player[] = [];
  private selections: PlayerSelection[] = [];
  private hitFx!: HitFx;
  private hud!: MatchHud;
  private debugMode = false;
  private debugGraphics?: Phaser.GameObjects.Graphics;
  private fpsText?: Phaser.GameObjects.Text;

  constructor() {
    super('Match');
  }

  create() {
    this.debugMode = Boolean(this.registry.get('debugMode'));
    this.inputManager = new InputManager(this);
    this.hitFx = new HitFx(this);

    this.cameras.main.setBounds(0, 0, GAME_WIDTH, GAME_HEIGHT);
    this.physics.world.setBounds(
      WORLD_BOUNDS.left,
      WORLD_BOUNDS.top,
      WORLD_BOUNDS.right - WORLD_BOUNDS.left,
      WORLD_BOUNDS.bottom - WORLD_BOUNDS.top
    );

    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x0f1324);

    this.selections = (this.registry.get('selections') as PlayerSelection[]) ?? [];
    if (this.selections.length === 0) {
      this.selections = [
        { playerId: 1, characterId: 'volt', color: 0x4cc9f0 },
        { playerId: 2, characterId: 'forge', color: 0xf72585 }
      ];
    }

    this.createPlayers();
    this.createPlatforms();
    this.hud = new MatchHud(this, this.selections);
    this.createDebugTools();

    onMatchStart({ playerIds: this.selections.map((s) => s.playerId) } as MatchData);

    this.events.once('shutdown', () => {
      this.inputManager?.destroy();
      this.hitFx?.destroy();
      this.players.forEach((player) => player.destroy());
      this.debugGraphics?.destroy();
      this.fpsText?.destroy();
    });
  }

  private createPlatforms() {
    const ground = this.add.rectangle(
      GAME_WIDTH / 2,
      GAME_HEIGHT - PLATFORM_CONFIG.groundHeight / 2,
      GAME_WIDTH - 140,
      PLATFORM_CONFIG.groundHeight,
      0x1b2440
    );
    const leftLedge = this.add.rectangle(160, GAME_HEIGHT - 130, 160, 26, 0x1f2c4c);
    const rightLedge = this.add.rectangle(GAME_WIDTH - 160, GAME_HEIGHT - 130, 160, 26, 0x1f2c4c);
    const centerPlatform = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT - 220, 240, 20, 0x222f52);

    const staticBodies = this.physics.add.staticGroup([ground, leftLedge, rightLedge]);
    staticBodies.refresh();

    const oneWayPlatforms = this.physics.add.staticGroup([centerPlatform]);
    oneWayPlatforms.refresh();

    this.physics.add.collider(this.players, staticBodies);

    this.players.forEach((player) => {
      this.physics.add.collider(player, oneWayPlatforms, undefined, (playerBody, platformBody) => {
        const body = playerBody as Phaser.Physics.Arcade.Body;
        const platform = platformBody as Phaser.Physics.Arcade.StaticBody;
        const isFalling = body.velocity.y >= 0;
        const playerBottom = body.y + body.height;
        return isFalling && playerBottom <= platform.y + 8;
      });
    });
  }

  private createPlayers() {
    this.players = this.selections.map((selection, index) => {
      const data = characterMap.get(selection.characterId) as CharacterData;
      const spawn = SPAWN_POINTS[index] ?? SPAWN_POINTS[0];
      const player = new Player(this, spawn.x, spawn.y, selection.playerId, data);
      player.setTint(selection.color);
      player.play(`${data.id}-idle`, true);
      return player;
    });
  }

  private createDebugTools() {
    if (!this.debugMode) {
      return;
    }
    this.debugGraphics = this.add.graphics();
    this.fpsText = this.add.text(GAME_WIDTH - 80, HUD_CONFIG.topMargin, 'FPS', {
      fontSize: '14px',
      color: '#ffffff'
    });
  }

  update(_time: number, delta: number) {
    this.players.forEach((player, index) => {
      this.updatePlayer(player, index, delta);
    });

    this.handleHits();
    this.checkKOs();
    this.updateDebug();
  }

  private updatePlayer(player: Player, index: number, delta: number) {
    const body = player.body as Phaser.Physics.Arcade.Body;
    const dt = delta / 1000;

    if (player.hitstopFrames > 0) {
      player.hitstopFrames -= 1;
      body.setVelocity(0, 0);
      if (player.hitstopFrames === 0 && player.queuedVelocity) {
        player.setVelocity(player.queuedVelocity.x, player.queuedVelocity.y);
        player.queuedVelocity = undefined;
      }
      return;
    }

    if (player.hitCooldownFrames > 0) {
      player.hitCooldownFrames -= 1;
    }

    if (player.knockbackFrames > 0) {
      player.knockbackFrames -= 1;
      if (player.knockbackFrames === 0) {
        body.setGravityY(player.data.stats.gravity);
      }
    }

    const grounded = body.blocked.down || body.touching.down;
    if (grounded) {
      if (!player.wasGrounded && player.lastFallSpeed > MATCH_CONSTANTS.landingDustMinSpeed) {
        this.hitFx.landingDust(player.x, body.y + body.height, player.tintTopLeft);
      }
      player.jumpCount = MATCH_CONSTANTS.jumpCount;
      player.coyoteFrames = MATCH_CONSTANTS.coyoteFrames;
      player.lastFallSpeed = 0;
    } else {
      if (player.coyoteFrames > 0) {
        player.coyoteFrames -= 1;
      }
      player.lastFallSpeed = Math.max(player.lastFallSpeed, body.velocity.y);
    }
    player.wasGrounded = grounded;

    if (player.stunFrames > 0) {
      player.stunFrames -= 1;
    }

    if (player.jumpBufferFrames > 0) {
      player.jumpBufferFrames -= 1;
    }

    const input = this.inputManager.getState(player.playerId);
    if (input.jumpPressed) {
      player.jumpBufferFrames = MATCH_CONSTANTS.jumpBufferFrames;
    }

    if (player.stunFrames === 0 && !player.activeAttack) {
      const direction = (input.left ? -1 : 0) + (input.right ? 1 : 0);
      const accel = grounded ? MATCH_CONSTANTS.groundAccel : MATCH_CONSTANTS.airAccel;
      const decel = grounded ? MATCH_CONSTANTS.groundDecel : MATCH_CONSTANTS.airDecel;
      const targetSpeed = direction * player.data.stats.speed;
      const rate = direction !== 0 ? accel : decel;
      const newVelocityX = Phaser.Math.MoveTowards(body.velocity.x, targetSpeed, rate * dt);
      body.setVelocityX(newVelocityX);

      if (direction !== 0) {
        player.facing = direction;
      }

      if (player.jumpBufferFrames > 0) {
        const canJump = grounded || player.coyoteFrames > 0 || player.jumpCount > 0;
        if (canJump) {
          body.setVelocityY(-player.data.stats.jumpForce);
          player.jumpCount = Math.max(0, player.jumpCount - 1);
          player.coyoteFrames = 0;
          player.jumpBufferFrames = 0;
        }
      }

      if (!grounded && input.down && body.velocity.y < MATCH_CONSTANTS.fastFallSpeed) {
        body.setVelocityY(MATCH_CONSTANTS.fastFallSpeed);
      }

      if (input.dashPressed && grounded) {
        body.setVelocityX(player.facing * MATCH_CONSTANTS.dashSpeed);
        this.hitFx.dashTrail(
          player.x - player.facing * 14,
          player.y,
          player.tintTopLeft,
          player.facing,
          MATCH_CONSTANTS.dashTrailBurst
        );
      }

      if (input.attackPressed) {
        const moveKey = input.up ? 'up' : input.down ? 'down' : 'neutral';
        player.startAttack(moveKey);
      }

      if (input.specialPressed) {
        player.startAttack('special');
      }
    }

    player.updateAttack();
    player.updateHitbox();

    const speed = Math.abs(body.velocity.x);
    if (!grounded) {
      player.play(`${player.data.id}-${body.velocity.y < 0 ? 'jump' : 'fall'}`, true);
    } else if (player.activeAttack) {
      player.play(`${player.data.id}-${player.activeAttack.moveKey}`, true);
    } else if (speed > 20) {
      player.play(`${player.data.id}-run`, true);
    } else {
      player.play(`${player.data.id}-idle`, true);
    }

    this.hud.updateDamage(index, player.damage);
  }

  private handleHits() {
    this.players.forEach((attacker) => {
      if (!attacker.hitboxActive || !attacker.activeAttack) {
        return;
      }

      this.players.forEach((defender) => {
        if (attacker === defender) {
          return;
        }
        if (attacker.activeAttack?.hitTargets.has(defender.playerId)) {
          return;
        }
        if (defender.hitCooldownFrames > 0) {
          return;
        }

        const hitboxBounds = attacker.hitbox.getBounds();
        const defenderBody = defender.body as Phaser.Physics.Arcade.Body;
        const defenderBounds = defenderBody.getBounds();

        if (Phaser.Geom.Intersects.RectangleToRectangle(hitboxBounds, defenderBounds)) {
          attacker.activeAttack?.hitTargets.add(defender.playerId);
          this.resolveHit(attacker, defender, attacker.activeAttack.move);
        }
      });
    });
  }

  private resolveHit(attacker: Player, defender: Player, move: MoveData) {
    defender.damage = Math.min(defender.damage + move.damage, MATCH_CONSTANTS.maxDamage);

    const angleVariance = Phaser.Math.Between(
      -KNOCKBACK_CONFIG.randomAngleVariance,
      KNOCKBACK_CONFIG.randomAngleVariance
    );

    const direction = getKnockbackDirection(move.angle, attacker.facing, angleVariance);
    const magnitude = Math.max(
      calculateKnockbackMagnitude(move, defender.damage, defender.data.stats.weight),
      KNOCKBACK_CONFIG.minLaunchSpeed
    );
    const velocity = direction.scale(magnitude);

    defender.queueVelocity(velocity.x, velocity.y);
    defender.applyStun(move.stun);
    defender.hitCooldownFrames = KNOCKBACK_CONFIG.hitCooldownFrames;
    defender.knockbackFrames = KNOCKBACK_CONFIG.knockbackGravityFrames;
    (defender.body as Phaser.Physics.Arcade.Body).setGravityY(
      defender.data.stats.gravity * KNOCKBACK_CONFIG.gravityScale
    );

    const hitstop = Phaser.Math.Clamp(
      MATCH_CONSTANTS.hitstopFrames + Math.floor(move.damage * MATCH_CONSTANTS.hitstopPerDamage),
      MATCH_CONSTANTS.hitstopFrames,
      MATCH_CONSTANTS.hitstopMax
    );

    attacker.applyHitstop(hitstop);
    defender.applyHitstop(hitstop);

    const shakeDirection = direction.clone().normalize();
    const shakeIntensity = Math.min(
      KNOCKBACK_CONFIG.shakeIntensity * (magnitude / KNOCKBACK_CONFIG.heavyHitSpeed),
      KNOCKBACK_CONFIG.shakeIntensity * 1.6
    );
    this.cameras.main.shake(KNOCKBACK_CONFIG.shakeDuration, {
      x: Math.abs(shakeDirection.x) * shakeIntensity,
      y: Math.abs(shakeDirection.y) * shakeIntensity
    });

    if (magnitude >= KNOCKBACK_CONFIG.heavyHitSpeed) {
      this.cameras.main.zoomTo(1 + KNOCKBACK_CONFIG.cameraZoomAmount, KNOCKBACK_CONFIG.cameraZoomInMs);
      this.time.delayedCall(KNOCKBACK_CONFIG.cameraZoomInMs, () => {
        this.cameras.main.zoomTo(1, KNOCKBACK_CONFIG.cameraZoomOutMs);
      });
    }

    this.hitFx.flash(defender, defender.tintTopLeft);
    this.hitFx.burst(defender.x, defender.y - 10, attacker.tintTopLeft);

    defender.play(`${defender.data.id}-hit`, true);
  }

  private checkKOs() {
    this.players.forEach((player, index) => {
      if (player.y > WORLD_BOUNDS.bottom || player.x < WORLD_BOUNDS.left || player.x > WORLD_BOUNDS.right) {
        player.stocks -= 1;
        onPlayerKO(player.playerId);
        this.hud.updateStocks(index, player.stocks);

        if (player.stocks <= 0) {
          player.setVisible(false);
          player.disableBody(true, true);
        } else {
          const spawn = SPAWN_POINTS[index] ?? SPAWN_POINTS[0];
          player.resetState(spawn.x, spawn.y);
        }
      }
    });

    const remaining = this.players.filter((player) => player.stocks > 0);
    if (remaining.length <= 1) {
      const results = this.players
        .map((player) => ({
          playerId: player.playerId,
          stocks: player.stocks,
          damage: player.damage
        }))
        .sort((a, b) => b.stocks - a.stocks)
        .map((player, index) => ({
          ...player,
          placement: index + 1
        }));

      onMatchEnd(results as MatchResult[]);
      this.registry.set('results', results);
      this.scene.start('Results');
    }
  }

  private updateDebug() {
    if (!this.debugMode || !this.debugGraphics || !this.fpsText) {
      return;
    }

    this.debugGraphics.clear();
    this.debugGraphics.lineStyle(1, 0x00ffcc, 0.8);

    this.players.forEach((player) => {
      const body = player.body as Phaser.Physics.Arcade.Body;
      this.debugGraphics.strokeRect(body.x, body.y, body.width, body.height);

      if (player.hitboxActive) {
        const hitbox = player.hitbox.getBounds();
        this.debugGraphics.lineStyle(1, 0xff00ff, 0.9);
        this.debugGraphics.strokeRect(hitbox.x, hitbox.y, hitbox.width, hitbox.height);
      }
    });

    this.fpsText.setText(`FPS: ${Math.floor(this.game.loop.actualFps)}`);
  }
}
