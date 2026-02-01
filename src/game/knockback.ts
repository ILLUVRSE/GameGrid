import Phaser from 'phaser';
import type { MoveData } from './types';

export const KNOCKBACK_CONFIG = {
  // Knockback scaling (0% -> base, 50% -> base * (1 + 0.5 * kbScaling), 150% -> base * (1 + 1.5 * kbScaling))
  baseMultiplier: 1,
  weightOffset: 40,
  randomAngleVariance: 6,
  gravityScale: 0.85,
  knockbackGravityFrames: 22,
  hitCooldownFrames: 16,
  minLaunchSpeed: 160,
  heavyHitSpeed: 480,
  cameraZoomAmount: 0.05,
  cameraZoomInMs: 110,
  cameraZoomOutMs: 140,
  shakeDuration: 140,
  shakeIntensity: 0.006
};

export const getKnockbackDirection = (angle: number, facing: number, variance: number) => {
  const angleDeg = (facing === 1 ? angle : 180 - angle) + variance;
  const rad = Phaser.Math.DegToRad(angleDeg);
  return new Phaser.Math.Vector2(Math.cos(rad), -Math.sin(rad));
};

export const calculateKnockbackMagnitude = (
  move: MoveData,
  damage: number,
  weight: number
) => {
  const damageScale = 1 + (damage / 100) * move.kbScaling;
  const weightScale = 100 / (weight + KNOCKBACK_CONFIG.weightOffset);
  return move.baseKnockback * damageScale * weightScale * KNOCKBACK_CONFIG.baseMultiplier;
};
