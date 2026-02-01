export type MoveKey = 'neutral' | 'up' | 'down' | 'special';

export interface MoveHitbox {
  x: number;
  y: number;
  width: number;
  height: number;
  damage: number;
  baseKnockback: number;
  kbScaling: number;
  angle: number;
  stun: number;
}

export interface MoveActiveWindow {
  startFrame: number;
  endFrame: number;
  hitboxes: MoveHitbox[];
}

export interface MoveCancelRules {
  allowJumpCancel?: boolean;
  allowDashCancel?: boolean;
  allowSpecialCancel?: boolean;
}

export interface MoveOnHit {
  hitstopFrames: number;
  shakeIntensity: number;
  particleKey: string;
}

export interface MoveData {
  startupFrames: number;
  activeFrames: MoveActiveWindow[];
  endLagFrames: number;
  cancel?: MoveCancelRules;
  onHit: MoveOnHit;
}

export interface CharacterStats {
  speed: number;
  jump: number;
  weight: number;
  gravity: number;
}

export interface CharacterPalette {
  primary: string;
  neon: string;
}

export interface HurtboxData {
  width: number;
  height: number;
  offsetX: number;
  offsetY: number;
}

export interface AnimationDefinition {
  startFrame: number;
  endFrame: number;
  frameRate: number;
  loop: boolean;
}

export type AnimationKey =
  | 'idle'
  | 'run'
  | 'jump'
  | 'fall'
  | 'neutral'
  | 'up'
  | 'down'
  | 'special'
  | 'hit'
  | 'ko';

export interface CharacterData {
  id: string;
  displayName: string;
  franchise: string;
  palette: CharacterPalette;
  spriteSheet: string;
  frameSize: { width: number; height: number };
  pivot: { x: number; y: number };
  stats: CharacterStats;
  hurtbox: HurtboxData;
  animations: Record<AnimationKey, AnimationDefinition>;
  moves: Record<MoveKey, MoveData>;
  sfx: {
    attack: string;
    special: string;
    ko: string;
  };
  vfx: {
    hit: string;
    dash: string;
    landing: string;
  };
  ui: {
    portraitIcon: string;
  };
}

export interface PlayerSelection {
  playerId: number;
  characterId: string;
  color: number;
}

export interface StageBackgroundLayer {
  color: string;
  scrollFactor?: number;
}

export interface StageBlastZones {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

export type StagePlatformType = 'solid' | 'oneWay';

export interface StagePlatform {
  type: StagePlatformType;
  x: number;
  y: number;
  w: number;
  h: number;
  color?: string;
}

export interface StageData {
  id: string;
  displayName: string;
  backgroundLayers: StageBackgroundLayer[];
  blastZones: StageBlastZones;
  spawnPoints: Array<{ x: number; y: number }>;
  platforms: StagePlatform[];
  hazards?: Array<{ id: string; enabled: boolean }>;
}

export interface AssetManifestEntry {
  path: string;
  type?: string;
  frameWidth?: number;
  frameHeight?: number;
}

export interface AssetManifest {
  sprites: Record<string, AssetManifestEntry>;
  ui: Record<string, AssetManifestEntry>;
  sfx: Record<string, AssetManifestEntry>;
  vfx: Record<string, AssetManifestEntry>;
}
