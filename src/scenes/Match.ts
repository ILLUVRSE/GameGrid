import Phaser from 'phaser';
import { characterRegistry, stageRegistry } from '../game/content';
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
  PLATFORM_CONFIG
} from '../game/physics';
import type { MatchResult, MatchData } from '../game/hooks';
import type { CharacterData, MoveData, MoveHitbox, PlayerSelection, StageData } from '../game/types';
import { MatchHud } from '../game/ui';

const DEFAULT_SPAWN_POINTS = [
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
  private stageData?: StageData;

  constructor() {
    super('Match');
  }

  create() {
    this.debugMode = Boolean(this.registry.get('debugMode'));
    this.inputManager = new InputManager(this);
    this.hitFx = new HitFx(this);

    this.stageData = this.resolveStage();
    const blastZones = this.stageData?.blastZones ?? {
      left: -200,
      right: 1160,
      top: -300,
      bottom: 900
    };

    this.cameras.main.setBounds(0, 0, GAME_WIDTH, GAME_HEIGHT);
    this.physics.world.setBounds(
      blastZones.left,
      blastZones.top,
      blastZones.right - blastZones.left,
      blastZones.bottom - blastZones.top
    );

    this.createBackground();

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

  private resolveStage() {
    const stages = stageRegistry.getAllStages();
    if (stages.length === 0) {
      return undefined;
    }
    const stageId = this.registry.get('stageId') as string | undefined;
    return stageRegistry.getStage(stageId ?? stages[0].id) ?? stages[0];
  }

  private createBackground() {
    const layers = this.stageData?.backgroundLayers ?? [{ color: '#0f1324' }];
    layers.forEach((layer, index) => {
      const colorValue = Number.parseInt(layer.color.replace('#', ''), 16);
      const rect = this.add.rectangle(
        GAME_WIDTH / 2,
        GAME_HEIGHT / 2,
        GAME_WIDTH,
        GAME_HEIGHT,
        colorValue
      );
      rect.setDepth(-10 - index);
    });
  }

  private createPlatforms() {
    const platforms = this.stageData?.platforms ?? [
      {
        type: 'solid',
        x: GAME_WIDTH / 2,
        y: GAME_HEIGHT - PLATFORM_CONFIG.groundHeight / 2,
        w: GAME_WIDTH - 140,
        h: PLATFORM_CONFIG.groundHeight,
        color: '#1b2440'
      }
    ];

    const staticBodies = this.physics.add.staticGroup();
    const oneWayPlatforms = this.physics.add.staticGroup();

    platforms.forEach((platform) => {
      const color = Number.parseInt((platform.color ?? '#1b2440').replace('#', ''), 16);
      const rect = this.add.rectangle(platform.x, platform.y, platform.w, platform.h, color);
      if (platform.type === 'oneWay') {
        oneWayPlatforms.add(rect);
      } else {
        staticBodies.add(rect);
      }
    });

    staticBodies.refresh();
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
    const spawnPoints = this.stageData?.spawnPoints ?? DEFAULT_SPAWN_POINTS;
    const fallbackCharacter = characterRegistry.getAllCharacters()[0];
    this.players = this.selections.map((selection, index) => {
      const data = (characterRegistry.getCharacter(selection.characterId) ?? fallbackCharacter) as CharacterData;
      const spawn = spawnPoints[index] ?? spawnPoints[0];
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

    const activeMove = player.activeAttack?.move;
    if (player.activeAttack && activeMove?.cancel?.allowSpecialCancel && input.specialPressed) {
      player.cancelAttack('special');
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
          body.setVelocityY(-player.data.stats.jump);
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
    player.updateHitboxes();

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

      const hitboxes = attacker.getActiveHitboxes();
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

        const defenderBody = defender.body as Phaser.Physics.Arcade.Body;
        const defenderBounds = defenderBody.getBounds();

        hitboxes.forEach(({ hitbox, bounds }) => {
          if (!bounds) {
            return;
          }
          if (Phaser.Geom.Intersects.RectangleToRectangle(bounds, defenderBounds)) {
            attacker.activeAttack?.hitTargets.add(defender.playerId);
            this.resolveHit(attacker, defender, hitbox, attacker.activeAttack.move);
          }
        });
      });
    });
  }

  private resolveHit(attacker: Player, defender: Player, hitbox: MoveHitbox, move: MoveData) {
    defender.damage = Math.min(defender.damage + hitbox.damage, MATCH_CONSTANTS.maxDamage);

    const angleVariance = Phaser.Math.Between(
      -KNOCKBACK_CONFIG.randomAngleVariance,
      KNOCKBACK_CONFIG.randomAngleVariance
    );

    const direction = getKnockbackDirection(hitbox.angle, attacker.facing, angleVariance);
    const magnitude = Math.max(
      calculateKnockbackMagnitude(hitbox, defender.damage, defender.data.stats.weight),
      KNOCKBACK_CONFIG.minLaunchSpeed
    );
    const velocity = direction.scale(magnitude);

    defender.queueVelocity(velocity.x, velocity.y);
    defender.applyStun(hitbox.stun);
    defender.hitCooldownFrames = KNOCKBACK_CONFIG.hitCooldownFrames;
    defender.knockbackFrames = KNOCKBACK_CONFIG.knockbackGravityFrames;
    (defender.body as Phaser.Physics.Arcade.Body).setGravityY(
      defender.data.stats.gravity * KNOCKBACK_CONFIG.gravityScale
    );

    const hitstop = Phaser.Math.Clamp(
      move.onHit.hitstopFrames,
      MATCH_CONSTANTS.hitstopFrames,
      MATCH_CONSTANTS.hitstopMax
    );

    attacker.applyHitstop(hitstop);
    defender.applyHitstop(hitstop);

    const shakeDirection = direction.clone().normalize();
    const shakeIntensity = move.onHit.shakeIntensity || KNOCKBACK_CONFIG.shakeIntensity;
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
    this.triggerHitParticles(move.onHit.particleKey, defender.x, defender.y - 10, attacker.tintTopLeft);

    defender.play(`${defender.data.id}-hit`, true);
  }

  private triggerHitParticles(particleKey: string, x: number, y: number, tint: number) {
    if (particleKey === 'vfx-hit-burst') {
      this.hitFx.burst(x, y, tint);
      return;
    }
    this.hitFx.burst(x, y, tint);
  }

  private checkKOs() {
    const blastZones = this.stageData?.blastZones ?? {
      left: -200,
      right: 1160,
      top: -300,
      bottom: 900
    };

    this.players.forEach((player, index) => {
      if (
        player.y > blastZones.bottom ||
        player.y < blastZones.top ||
        player.x < blastZones.left ||
        player.x > blastZones.right
      ) {
        player.stocks -= 1;
        onPlayerKO(player.playerId);
        this.hud.updateStocks(index, player.stocks);

        if (player.stocks <= 0) {
          player.setVisible(false);
          player.disableBody(true, true);
        } else {
          const spawnPoints = this.stageData?.spawnPoints ?? DEFAULT_SPAWN_POINTS;
          const spawn = spawnPoints[index] ?? spawnPoints[0];
          player.resetState(spawn.x, spawn.y);
        }
      }
    });

    const remainingPlayers = this.players.filter((player) => player.stocks > 0);
    if (remainingPlayers.length <= 1) {
      const results: MatchResult[] = this.players
        .map((player) => ({
          playerId: player.playerId,
          placement: player.stocks > 0 ? 1 : 2
        }))
        .sort((a, b) => a.placement - b.placement);
      this.registry.set('results', results);
      onMatchEnd({ winnerId: remainingPlayers[0]?.playerId ?? null } as MatchData);
      this.scene.start('Results');
    }
  }

  private updateDebug() {
    if (!this.debugMode || !this.debugGraphics) {
      return;
    }
    this.debugGraphics.clear();
    this.physics.world.drawDebug = this.debugMode;
    this.physics.world.drawDebug(this.debugGraphics);
    if (this.fpsText) {
      this.fpsText.setText(`FPS ${Math.round(this.game.loop.actualFps)}`);
    }
  }
}
