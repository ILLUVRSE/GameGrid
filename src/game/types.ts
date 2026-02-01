export type MoveKey = 'neutral' | 'up' | 'down' | 'special';

export interface MoveData {
  frames: number[];
  active: { start: number; end: number };
  damage: number;
  baseKnockback: number;
  kbScaling: number;
  angle: number;
  stun: number;
}

export interface CharacterStats {
  speed: number;
  jumpForce: number;
  weight: number;
  gravity: number;
}

export interface CharacterData {
  id: string;
  displayName: string;
  spriteSheet: string;
  width: number;
  height: number;
  pivot: { x: number; y: number };
  stats: CharacterStats;
  moves: Record<MoveKey, MoveData>;
}

export interface PlayerSelection {
  playerId: number;
  characterId: string;
  color: number;
}
