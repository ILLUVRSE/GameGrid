export const GAME_WIDTH = 960;
export const GAME_HEIGHT = 540;
export const WORLD_BOUNDS = {
  left: -200,
  right: 1160,
  top: -300,
  bottom: 900
};

export const MATCH_CONSTANTS = {
  maxDamage: 300,
  hitstopFrames: 5,
  hitstopPerDamage: 0.15,
  hitstopMax: 12,
  screenShake: 120,
  // Movement feel tuning (frames at 60fps, acceleration is px/s^2).
  coyoteFrames: 8,
  jumpBufferFrames: 8,
  fastFallSpeed: 640,
  groundAccel: 2000,
  airAccel: 1200,
  groundDecel: 2200,
  airDecel: 1400,
  dashSpeed: 520,
  dashTrailBurst: 4,
  landingDustMinSpeed: 260,
  jumpCount: 2
};

export const PLATFORM_CONFIG = {
  groundHeight: 60,
  oneWayHeight: 20
};

export const HUD_CONFIG = {
  topMargin: 12,
  itemSpacing: 14
};
