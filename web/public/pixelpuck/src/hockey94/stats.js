const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const normalizeStat = (value) => clamp((value - 50) / 50, 0, 1);

const lerp = (min, max, t) => min + (max - min) * t;

const buildSkaterModifiers = (attributes) => {
  const skating = normalizeStat(attributes?.skating ?? 60);
  const shooting = normalizeStat(attributes?.shooting ?? 60);
  const passing = normalizeStat(attributes?.passing ?? 60);
  const defense = normalizeStat(attributes?.defense ?? 60);
  const awareness = normalizeStat(attributes?.awareness ?? 60);
  const stamina = normalizeStat(attributes?.stamina ?? 60);
  return {
    speedMult: lerp(0.92, 1.12, skating),
    accelMult: lerp(0.92, 1.12, skating),
    shotPowerMult: lerp(0.9, 1.15, shooting),
    shotAccuracyMult: lerp(0.88, 1.12, shooting),
    passSpeedMult: lerp(0.9, 1.1, passing),
    passAssistMult: lerp(0.9, 1.1, passing),
    checkRangeMult: lerp(0.9, 1.12, defense),
    aiMistakeRateMult: lerp(1.05, 0.85, awareness),
    staminaMult: lerp(0.9, 1.1, stamina),
  };
};

const buildGoalieModifiers = (attributes) => {
  const reflexes = normalizeStat(attributes?.reflexes ?? 60);
  const positioning = normalizeStat(attributes?.positioning ?? 60);
  const recovery = normalizeStat(attributes?.recovery ?? 60);
  const puckHandling = normalizeStat(attributes?.puckHandling ?? 60);
  const stamina = normalizeStat(attributes?.stamina ?? 60);
  return {
    reactionMult: lerp(0.9, 1.15, reflexes),
    speedMult: lerp(0.92, 1.12, recovery),
    radiusMult: lerp(0.9, 1.08, positioning),
    puckControlMult: lerp(0.9, 1.08, puckHandling),
    staminaMult: lerp(0.9, 1.1, stamina),
  };
};

export { buildSkaterModifiers, buildGoalieModifiers };
