const RINK_WIDTH = 960;
const RINK_HEIGHT = 540;
const GOAL_DEPTH = 18;
const GOAL_WIDTH = Math.round(160 * 0.7);
const PUCK_RADIUS = 8;
const PLAYER_RADIUS = 14;
const STICK_LENGTH = 18;
const STICK_RADIUS = 22;
const MAX_SPEED = 300;
const ACCEL = 1500;
const FRICTION = 0.84;
const PUCK_FRICTION = 0.985;
const PUCK_MAX_SPEED = 720;
const SHOT_SPEED = 680;
const SHOT_CHARGE_TIME = 1.0;
const SHOT_CHARGE_MULT = 0.45;
const PASS_SPEED = 520;
const WRIST_SHOT_MULT = 0.88;
const SNAP_SHOT_MULT = 0.98;
const CHECK_RANGE = 28;
const CHECK_FORCE = 520;
const CHECK_STUN_TIME = 0.45;
const SCORE_TO_WIN = 5;
const SIM_STEP = 1 / 60;
const PICKUP_DELAY = 0.12;
const CHECK_RELEASE_DELAY = 0.22;
const SPRINT_MAX = 2.6;
const SPRINT_DRAIN = 1.4;
const SPRINT_RECOVER = 0.85;
const SPRINT_SPEED_MULT = 1.18;
const SPRINT_ACCEL_MULT = 1.12;
const GOALIE_RADIUS = 22;
const GOALIE_SPEED = 420;
const GOALIE_REACTION = 0.2;
const CHECK_COOLDOWN = 0.6;
const CHECK_STAMINA_COST = 0.55;
const GLANCE_RANGE = 32;
const PIN_TIME = 0.12;
const MERCY_DIFF = 6;
const MOMENTUM_DECAY = 0.25;
const MOMENTUM_PASS_BONUS = 0.035;
const MOMENTUM_SAVE_BONUS = 0.08;
const MOMENTUM_HIT_BONUS = 0.06;
const MOMENTUM_MAX = 0.6;

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const normalize = (x, y) => {
  const length = Math.hypot(x, y);
  if (!length) return { x: 0, y: 0 };
  return { x: x / length, y: y / length };
};

const applyAimError = (aimX, aimY, accuracyMult) => {
  const accuracy = clamp(accuracyMult ?? 1, 0.6, 1.2);
  const error = Math.max(0, (1 - accuracy) * 0.35);
  if (error <= 0) return { aimX, aimY };
  const jitterX = (Math.random() - 0.5) * error;
  const jitterY = (Math.random() - 0.5) * error;
  return { aimX: aimX + jitterX, aimY: aimY + jitterY };
};

const getGoalCenter = (team) => ({
  x: team === "home" ? GOAL_DEPTH : RINK_WIDTH - GOAL_DEPTH,
  y: RINK_HEIGHT / 2,
});

const getOppGoalCenter = (team) => getGoalCenter(team === "home" ? "away" : "home");

const getLaneOffset = (slot) => {
  const idx = slot % 3;
  if (idx === 0) return -60;
  if (idx === 1) return 0;
  return 60;
};

const findNearest = (players, x, y) => {
  let best = null;
  players.forEach((player) => {
    const dx = player.x - x;
    const dy = player.y - y;
    const dist = dx * dx + dy * dy;
    if (!best || dist < best.dist) best = { player, dist };
  });
  return best?.player || players[0];
};

const createPlayer = (slot) => ({
  id: slot,
  slot,
  team: slot < 3 ? "home" : "away",
  x: slot < 3 ? 220 : RINK_WIDTH - 220,
  y: RINK_HEIGHT / 2 + (slot % 3 === 0 ? -80 : slot % 3 === 1 ? 0 : 80),
  vx: 0,
  vy: 0,
  dirX: slot < 3 ? 1 : -1,
  dirY: 0,
  moveX: 0,
  moveY: 0,
  role: slot % 3 === 0 ? "defender" : slot % 3 === 1 ? "center" : "wing",
  stamina: SPRINT_MAX,
  sprintActive: false,
  checkCooldown: 0,
  stunTimer: 0,
  allowSprint: false,
  allowAutoFace: false,
  speedMult: 1,
  accelMult: 1,
  statSpeedMult: 1,
  statAccelMult: 1,
  statCheckRangeMult: 1,
  shotPowerMult: 1,
  shotAccuracyMult: 1,
  passSpeedMult: 1,
  passAssistMult: 1,
  checkRangeMult: 1,
  aiMistakeRateMult: 1,
  staminaMult: 1,
  bonusSpeedTimer: 0,
  bonusSpeedMult: 1,
  giveAndGoTimer: 0,
  shootHeld: false,
  lastShootHeld: false,
  shootCharge: 0,
  actions: {
    shoot: false,
    pass: false,
    check: false,
    switch: false,
  },
});

const createPuck = () => ({
  x: RINK_WIDTH / 2,
  y: RINK_HEIGHT / 2,
  vx: 0,
  vy: 0,
  ownerId: null,
  freeTimer: 0,
  pinTimer: 0,
});

const createGoalie = (team, radius = GOALIE_RADIUS) => ({
  team,
  x: team === "home" ? GOAL_DEPTH + radius + 6 : RINK_WIDTH - GOAL_DEPTH - radius - 6,
  y: RINK_HEIGHT / 2,
  r: radius,
  stance: "square",
  commitTimer: 0,
  commitTargetY: RINK_HEIGHT / 2,
  lastDesiredY: RINK_HEIGHT / 2,
  lastDir: 0,
});

const createMatchState = () => ({
  players: Array.from({ length: 6 }, (_, slot) => createPlayer(slot)),
  puck: createPuck(),
  goalies: {
    home: createGoalie("home"),
    away: createGoalie("away"),
  },
  scores: { home: 0, away: 0 },
  phase: "playing",
  goalTimer: 0,
  accumulator: 0,
  botProfile: null,
  passAssist: 0.85,
  shotEvent: null,
  rules: {
    scoreToWin: SCORE_TO_WIN,
    mercyRule: true,
  },
  physics: {
    wallDamp: 0.9,
    wallJitter: 0,
    goalScale: 1,
  },
  difficulty: "Normal",
  aiMistakeRate: 0.06,
  aiAggression: 1,
  aiCheckRangeMult: 1,
  teamAggression: { home: 1, away: 1 },
  teamDefenseBias: { home: 1, away: 1 },
  goalieProfile: {
    reaction: GOALIE_REACTION,
    speed: GOALIE_SPEED,
    radius: GOALIE_RADIUS,
  },
  momentum: { home: 0, away: 0 },
  passChain: { team: null, count: 0, timer: 0 },
  lastPass: null,
  lastShotTeam: null,
  lastShotTimer: 0,
  reboundWindow: { team: null, timer: 0 },
  events: {
    hit: 0,
    save: 0,
  },
});

const resetPositions = (match) => {
  match.players.forEach((player) => {
    player.x = player.team === "home" ? 220 : RINK_WIDTH - 220;
    player.y = RINK_HEIGHT / 2 + (player.slot % 3 === 0 ? -80 : player.slot % 3 === 1 ? 0 : 80);
    player.vx = 0;
    player.vy = 0;
    player.dirX = player.team === "home" ? 1 : -1;
    player.dirY = 0;
    player.stunTimer = 0;
    player.sprintActive = false;
    player.stamina = SPRINT_MAX;
    player.bonusSpeedTimer = 0;
    player.bonusSpeedMult = 1;
    player.giveAndGoTimer = 0;
    player.shootCharge = 0;
    player.shootHeld = false;
    player.lastShootHeld = false;
    player.actions.shoot = false;
    player.actions.pass = false;
    player.actions.check = false;
    player.actions.switch = false;
  });
  match.puck.x = RINK_WIDTH / 2;
  match.puck.y = RINK_HEIGHT / 2;
  match.puck.vx = 0;
  match.puck.vy = 0;
  match.puck.ownerId = null;
  match.puck.freeTimer = 0;
  match.puck.pinTimer = 0;
  match.shotEvent = null;
  if (match.passChain) {
    match.passChain.count = 0;
    match.passChain.timer = 0;
    match.passChain.team = null;
  }
  match.lastPass = null;
  match.lastShotTeam = null;
  match.lastShotTimer = 0;
  if (match.reboundWindow) {
    match.reboundWindow.timer = 0;
    match.reboundWindow.team = null;
  }
  if (match.events) {
    match.events.hit = 0;
    match.events.save = 0;
  }
  if (match.goalies) {
    const radius = match.goalieProfile?.radius ?? GOALIE_RADIUS;
    match.goalies.home = createGoalie("home", radius);
    match.goalies.away = createGoalie("away", radius);
  }
};

const releasePuck = (puck, dirX, dirY, speed, delay = PICKUP_DELAY, owner = null) => {
  const dir = normalize(dirX, dirY);
  puck.ownerId = null;
  puck.freeTimer = delay;
  const carry = owner ? 0.35 : 0;
  puck.vx = dir.x * speed + (owner?.vx || 0) * carry;
  puck.vy = dir.y * speed + (owner?.vy || 0) * carry;
};

const attachPossession = (puck, players, match) => {
  if (puck.ownerId !== null || puck.freeTimer > 0) return;
  const momentum = match?.momentum || { home: 0, away: 0 };
  let closest = null;
  players.forEach((player) => {
    const dx = player.x - puck.x;
    const dy = player.y - puck.y;
    const dist = Math.hypot(dx, dy);
    const momentumBias = 1 + clamp(momentum[player.team] || 0, -0.4, 0.4) * 0.08;
    const pickupRadius = STICK_RADIUS * momentumBias;
    if (dist <= pickupRadius && (!closest || dist < closest.dist)) {
      closest = { player, dist };
    }
  });
  if (closest) puck.ownerId = closest.player.id;
};

const positionPuckOnStick = (puck, players) => {
  if (puck.ownerId === null) return;
  const owner = players[puck.ownerId];
  if (!owner) return;
  const dir = normalize(owner.dirX, owner.dirY);
  puck.x = owner.x + dir.x * STICK_LENGTH;
  puck.y = owner.y + dir.y * STICK_LENGTH;
};

const handleCheck = (checker, puck, players, match) => {
  if (puck.ownerId === null) return false;
  const owner = players[puck.ownerId];
  if (!owner || owner.team === checker.team) return false;
  const dx = owner.x - checker.x;
  const dy = owner.y - checker.y;
  const checkRange = CHECK_RANGE * (checker.checkRangeMult ?? 1);
  if (Math.hypot(dx, dy) > checkRange) return false;
  const dir = normalize(dx, dy);
  const ownerDir = normalize(owner.dirX, owner.dirY);
  const impactDot = dir.x * ownerDir.x + dir.y * ownerDir.y;
  const rearHit = impactDot > 0.4;
  const sideHit = Math.abs(impactDot) < 0.2;
  puck.ownerId = null;
  puck.freeTimer = CHECK_RELEASE_DELAY;
  const force = rearHit ? CHECK_FORCE * 1.25 : CHECK_FORCE;
  const deflect = sideHit ? CHECK_FORCE * 0.6 : force;
  puck.vx = dir.x * deflect;
  puck.vy = dir.y * deflect;
  owner.vx += dir.x * 120;
  owner.vy += dir.y * 120;
  owner.stunTimer = Math.max(owner.stunTimer, rearHit ? CHECK_STUN_TIME * 1.3 : CHECK_STUN_TIME);
  if (match?.events) match.events.hit = Math.max(match.events.hit, 0.2);
  bumpMomentum(match, checker.team, MOMENTUM_HIT_BONUS);
  return true;
};

const pickPassTarget = (owner, players) => {
  let best = null;
  players.forEach((player) => {
    if (player.team !== owner.team || player.id === owner.id) return;
    const dx = player.x - owner.x;
    const dy = player.y - owner.y;
    const dist = dx * dx + dy * dy;
    if (!best || dist < best.dist) best = { player, dist };
  });
  return best?.player || null;
};

const updatePlayers = (match, dt) => {
  match.players.forEach((player) => {
    if (player.bonusSpeedTimer > 0) {
      player.bonusSpeedTimer = Math.max(0, player.bonusSpeedTimer - dt);
      if (player.bonusSpeedTimer <= 0) player.bonusSpeedMult = 1;
    }
    if (player.giveAndGoTimer > 0) {
      player.giveAndGoTimer = Math.max(0, player.giveAndGoTimer - dt);
    }
    if (player.stunTimer > 0) {
      player.stunTimer = Math.max(0, player.stunTimer - dt);
    }
    if (player.checkCooldown > 0) {
      player.checkCooldown = Math.max(0, player.checkCooldown - dt);
    }
    const length = Math.hypot(player.moveX, player.moveY);
    const dir =
      length > 1 ? { x: player.moveX / length, y: player.moveY / length } : { x: player.moveX, y: player.moveY };
    if (player.allowAutoFace && match?.puck) {
      const dx = match.puck.x - player.x;
      const dy = match.puck.y - player.y;
      if (Math.hypot(dx, dy) > 1) {
        const autoDir = normalize(dx, dy);
        if (length < 0.2) {
          player.dirX = autoDir.x;
          player.dirY = autoDir.y;
        }
      }
    }
    const wantsSprint = player.allowSprint && length > 0.75 && player.stamina > 0;
    player.sprintActive = wantsSprint;
    const staminaMult = player.staminaMult ?? 1;
    if (player.sprintActive) {
      player.stamina = Math.max(0, player.stamina - (SPRINT_DRAIN / staminaMult) * dt);
    } else {
      player.stamina = Math.min(SPRINT_MAX, player.stamina + SPRINT_RECOVER * staminaMult * dt);
    }
    const staminaFactor = clamp(player.stamina / SPRINT_MAX, 0, 1);
    const accelFactor = 0.7 + 0.3 * staminaFactor;
    const burst = player.bonusSpeedTimer > 0 ? player.bonusSpeedMult : 1;
    const sprintSpeed = player.sprintActive ? SPRINT_SPEED_MULT : 1;
    const sprintAccel = player.sprintActive ? SPRINT_ACCEL_MULT : 1;
    const stunScale = player.stunTimer > 0 ? 0.25 : 1;
    const accelMult = player.accelMult ?? 1;
    player.vx += dir.x * ACCEL * accelMult * sprintAccel * stunScale * accelFactor * burst * dt;
    player.vy += dir.y * ACCEL * accelMult * sprintAccel * stunScale * accelFactor * burst * dt;
    const speed = Math.hypot(player.vx, player.vy);
    const speedMult = player.speedMult ?? 1;
    const maxSpeed = MAX_SPEED * speedMult * sprintSpeed * burst * (player.stunTimer > 0 ? 0.45 : 1);
    if (speed > maxSpeed) {
      const scale = maxSpeed / speed;
      player.vx *= scale;
      player.vy *= scale;
    }
    player.x += player.vx * dt;
    player.y += player.vy * dt;
    player.vx *= FRICTION;
    player.vy *= FRICTION;
    player.x = clamp(player.x, PLAYER_RADIUS + 4, RINK_WIDTH - PLAYER_RADIUS - 4);
    player.y = clamp(player.y, PLAYER_RADIUS + 4, RINK_HEIGHT - PLAYER_RADIUS - 4);
    if (Math.abs(dir.x) + Math.abs(dir.y) > 0.01) {
      player.dirX = dir.x;
      player.dirY = dir.y;
    }
  });
};

const updatePuck = (puck, dt, players) => {
  if (puck.ownerId !== null) return;
  if (puck.freeTimer > 0) puck.freeTimer = Math.max(0, puck.freeTimer - dt);
  if (puck.pinTimer > 0) {
    puck.pinTimer = Math.max(0, puck.pinTimer - dt);
    puck.vx *= 0.5;
    puck.vy *= 0.5;
  }
  puck.x += puck.vx * dt;
  puck.y += puck.vy * dt;
  puck.vx *= PUCK_FRICTION;
  puck.vy *= PUCK_FRICTION;
  if (players) {
    players.forEach((player) => {
      const dx = puck.x - player.x;
      const dy = puck.y - player.y;
      const dist = Math.hypot(dx, dy);
      if (dist > STICK_RADIUS && dist < GLANCE_RANGE) {
        const nx = dx / (dist || 1);
        const ny = dy / (dist || 1);
        puck.vx += nx * 8 * dt;
        puck.vy += ny * 8 * dt;
      }
    });
  }
  const speed = Math.hypot(puck.vx, puck.vy);
  if (speed > PUCK_MAX_SPEED) {
    const scale = PUCK_MAX_SPEED / speed;
    puck.vx *= scale;
    puck.vy *= scale;
  }
};

const bumpMomentum = (match, team, amount) => {
  if (!match?.momentum) return;
  const opp = team === "home" ? "away" : "home";
  match.momentum[team] = clamp((match.momentum[team] || 0) + amount, -MOMENTUM_MAX, MOMENTUM_MAX);
  match.momentum[opp] = clamp((match.momentum[opp] || 0) - amount * 0.5, -MOMENTUM_MAX, MOMENTUM_MAX);
};

const decayMomentum = (match, dt) => {
  if (!match?.momentum) return;
  ["home", "away"].forEach((team) => {
    const value = match.momentum[team] || 0;
    if (value > 0) {
      match.momentum[team] = Math.max(0, value - MOMENTUM_DECAY * dt);
    } else if (value < 0) {
      match.momentum[team] = Math.min(0, value + MOMENTUM_DECAY * dt);
    }
  });
};

const updateTacticsAfterGoal = (match) => {
  if (!match?.teamAggression || !match?.teamDefenseBias) return;
  const diff = match.scores.home - match.scores.away;
  if (diff === 0) {
    match.teamAggression.home = 1;
    match.teamAggression.away = 1;
    match.teamDefenseBias.home = 1;
    match.teamDefenseBias.away = 1;
    return;
  }
  const leader = diff > 0 ? "home" : "away";
  const trailer = diff > 0 ? "away" : "home";
  match.teamAggression[leader] = 0.92;
  match.teamAggression[trailer] = 1.12;
  match.teamDefenseBias[leader] = 0.88;
  match.teamDefenseBias[trailer] = 1.05;
};

const updateGoalies = (match, dt) => {
  if (!match.goalies) return;
  const goalTop = (RINK_HEIGHT - GOAL_WIDTH) / 2;
  const goalBottom = goalTop + GOAL_WIDTH;
  const targetY = match.puck.y;
  const shotEvent = match.shotEvent;
  const goalieProfile = match.goalieProfile || { reaction: GOALIE_REACTION, speed: GOALIE_SPEED, radius: GOALIE_RADIUS };
  ["home", "away"].forEach((side) => {
    const goalie = match.goalies[side];
    let reaction = goalieProfile.reaction;
    let speed = goalieProfile.speed;
    const modifiers = match.goalieModifiers?.[side];
    if (modifiers) {
      reaction *= modifiers.reactionMult ?? 1;
      speed *= modifiers.speedMult ?? 1;
      goalie.r = (goalieProfile.radius ?? goalie.r) * (modifiers.radiusMult ?? 1);
    } else if (goalieProfile.radius) {
      goalie.r = goalieProfile.radius;
    }
    const clampY = (y) => clamp(y, goalTop + (goalie.r || GOALIE_RADIUS), goalBottom - (goalie.r || GOALIE_RADIUS));
    let desired = clampY(targetY);
    if (shotEvent && shotEvent.timer > 0 && shotEvent.team !== goalie.team) {
      const quality = shotEvent.quality || 0;
      const delay = 0.06 + quality * 0.18;
      reaction = Math.max(0.04, goalieProfile.reaction - delay);
      speed = goalieProfile.speed * (quality > 0.7 ? 0.85 : quality < 0.25 ? 1.08 : 1);
      const shotTarget = clampY(shotEvent.targetY ?? targetY);
      if (shotEvent.fake) {
        goalie.commitTimer = Math.max(goalie.commitTimer, 0.22);
        goalie.commitTargetY = clampY(shotTarget + (shotTarget < RINK_HEIGHT / 2 ? -18 : 18));
        goalie.stance = shotTarget < RINK_HEIGHT / 2 ? "cheatLeft" : "cheatRight";
      }
      if (goalie.commitTimer <= 0) {
        desired = shotTarget;
      }
    } else {
      const offset = targetY - RINK_HEIGHT / 2;
      if (Math.abs(offset) > 48) {
        goalie.stance = offset < 0 ? "cheatLeft" : "cheatRight";
      } else {
        goalie.stance = "square";
      }
      const stanceBias = goalie.stance === "cheatLeft" ? -12 : goalie.stance === "cheatRight" ? 12 : 0;
      desired = clampY(targetY + stanceBias);
    }
    if (goalie.commitTimer > 0) {
      goalie.commitTimer = Math.max(0, goalie.commitTimer - dt);
      desired = goalie.commitTargetY;
    }
    const desiredDir = Math.sign(desired - goalie.y);
    const reversal = desiredDir !== 0 && goalie.lastDir !== 0 && desiredDir !== goalie.lastDir;
    if (reversal && Math.abs(desired - goalie.lastDesiredY) > 12) {
      reaction *= 0.55;
      speed *= 0.65;
    }
    goalie.y = goalie.y * (1 - reaction) + desired * reaction;
    const dy = desired - goalie.y;
    const step = clamp(dy, -speed * dt, speed * dt);
    goalie.y = clampY(goalie.y + step);
    goalie.lastDesiredY = desired;
    goalie.lastDir = desiredDir;
  });
};

const handleGoalieCollision = (match) => {
  if (!match.goalies || match.puck.ownerId !== null) return;
  const puck = match.puck;
  const goalieProfile = match.goalieProfile || { radius: GOALIE_RADIUS };
  Object.entries(match.goalies).forEach(([side, goalie]) => {
    const modifiers = match.goalieModifiers?.[side];
    const radiusMult = modifiers?.radiusMult ?? 1;
    goalie.r = (goalieProfile.radius ?? goalie.r) * radiusMult;
    const dx = puck.x - goalie.x;
    const dy = puck.y - goalie.y;
    const dist = Math.hypot(dx, dy);
    const minDist = goalie.r + PUCK_RADIUS;
    if (dist > 0 && dist < minDist) {
      const nx = dx / dist;
      const ny = dy / dist;
      puck.x = goalie.x + nx * (minDist + 1);
      puck.y = goalie.y + ny * (minDist + 1);
      const dot = puck.vx * nx + puck.vy * ny;
      const speed = Math.hypot(puck.vx, puck.vy);
      const reboundBoost = speed > 520 ? 1.12 : 0.92;
      const randomKick = speed > 520 ? 0.22 : 0.12;
      const jitterX = (Math.random() - 0.5) * randomKick;
      const jitterY = (Math.random() - 0.5) * randomKick;
      puck.vx = (puck.vx - 2 * dot * nx) * 0.86 * reboundBoost + jitterX * speed * 0.2;
      puck.vy = (puck.vy - 2 * dot * ny) * 0.86 * reboundBoost + jitterY * speed * 0.2;
      puck.freeTimer = Math.max(puck.freeTimer, 0.08);
      if (match.events) match.events.save = Math.max(match.events.save, 0.25);
      bumpMomentum(match, goalie.team, MOMENTUM_SAVE_BONUS);
      if (match.lastShotTeam && match.lastShotTimer > 0 && match.reboundWindow) {
        match.reboundWindow.team = match.lastShotTeam;
        match.reboundWindow.timer = 0.8;
      }
    }
  });
};

const handlePuckWalls = (match) => {
  const puck = match.puck;
  const goalScale = match.physics?.goalScale ?? 1;
  const scaledGoalWidth = GOAL_WIDTH * goalScale;
  const goalTop = (RINK_HEIGHT - scaledGoalWidth) / 2;
  const goalBottom = goalTop + scaledGoalWidth;
  if (puck.x - PUCK_RADIUS <= GOAL_DEPTH) {
    if (puck.y >= goalTop && puck.y <= goalBottom) {
      match.scores.away += 1;
      match.phase = "goal";
      match.goalTimer = 1.1;
      updateTacticsAfterGoal(match);
      resetPositions(match);
      return;
    }
    puck.x = GOAL_DEPTH + PUCK_RADIUS;
    puck.vx = Math.abs(puck.vx) * (match.physics?.wallDamp ?? 0.9);
  }
  if (puck.x + PUCK_RADIUS >= RINK_WIDTH - GOAL_DEPTH) {
    if (puck.y >= goalTop && puck.y <= goalBottom) {
      match.scores.home += 1;
      match.phase = "goal";
      match.goalTimer = 1.1;
      updateTacticsAfterGoal(match);
      resetPositions(match);
      return;
    }
    puck.x = RINK_WIDTH - GOAL_DEPTH - PUCK_RADIUS;
    puck.vx = -Math.abs(puck.vx) * (match.physics?.wallDamp ?? 0.9);
  }
  if (puck.y - PUCK_RADIUS <= 4) {
    puck.y = 4 + PUCK_RADIUS;
    puck.vy = Math.abs(puck.vy) * (match.physics?.wallDamp ?? 0.9);
  }
  if (puck.y + PUCK_RADIUS >= RINK_HEIGHT - 4) {
    puck.y = RINK_HEIGHT - 4 - PUCK_RADIUS;
    puck.vy = -Math.abs(puck.vy) * (match.physics?.wallDamp ?? 0.9);
  }
  const wallJitter = match.physics?.wallJitter ?? 0;
  if (wallJitter > 0 && (puck.x < 10 || puck.x > RINK_WIDTH - 10 || puck.y < 10 || puck.y > RINK_HEIGHT - 10)) {
    puck.vx += (Math.random() - 0.5) * wallJitter * 80;
    puck.vy += (Math.random() - 0.5) * wallJitter * 80;
  }
  if (puck.ownerId === null && puck.freeTimer <= 0) {
    const nearWall =
      puck.x - PUCK_RADIUS <= 6 ||
      puck.x + PUCK_RADIUS >= RINK_WIDTH - 6 ||
      puck.y - PUCK_RADIUS <= 6 ||
      puck.y + PUCK_RADIUS >= RINK_HEIGHT - 6;
    if (nearWall) {
      const pinningPlayer = match.players.find(
        (player) => Math.hypot(player.x - puck.x, player.y - puck.y) < STICK_RADIUS + 8
      );
      if (pinningPlayer) {
        puck.pinTimer = PIN_TIME;
      }
    }
  }
  const nearLeftPost = Math.abs(puck.x - GOAL_DEPTH) < PUCK_RADIUS * 1.5;
  const nearRightPost = Math.abs(puck.x - (RINK_WIDTH - GOAL_DEPTH)) < PUCK_RADIUS * 1.5;
  const nearTopPost = Math.abs(puck.y - goalTop) < PUCK_RADIUS * 1.2;
  const nearBottomPost = Math.abs(puck.y - goalBottom) < PUCK_RADIUS * 1.2;
  if ((nearLeftPost || nearRightPost) && (nearTopPost || nearBottomPost)) {
    puck.vx *= -0.9;
    puck.vy *= 0.85;
  }
};

const applyActions = (match, dt) => {
  match.players.forEach((player) => {
    const momentum = match.momentum ? match.momentum[player.team] || 0 : 0;
    if (player.actions.check && player.checkCooldown <= 0 && player.stamina > CHECK_STAMINA_COST) {
      if (handleCheck(player, match.puck, match.players, match)) {
        player.checkCooldown = CHECK_COOLDOWN;
        player.stamina = Math.max(0, player.stamina - CHECK_STAMINA_COST);
      }
    }
    if (match.puck.ownerId === player.id) {
      if (player.actions.pass) {
        const teammates = match.players.filter((item) => item.team === player.team);
        const opponents = match.players.filter((item) => item.team !== player.team);
        const mistakeRate = (match.aiMistakeRate ?? 0) * (player.aiMistakeRateMult ?? 1);
        const target =
          pickSmartPassTarget(player, teammates, opponents, mistakeRate) || pickPassTarget(player, match.players);
        if (target) {
          const dx = target.x - player.x;
          const dy = target.y - player.y;
          const dist = Math.hypot(dx, dy);
          const passSpeed = PASS_SPEED * (1 + momentum * 0.06) * (player.passSpeedMult ?? 1);
          const leadTime = dist / passSpeed;
          const leadX = target.x + target.vx * leadTime * 0.8;
          const leadY = target.y + target.vy * leadTime * 0.8;
          const assistBase = (match.passAssist ?? 0.85) * (player.passAssistMult ?? 1);
          const assist = clamp(assistBase + momentum * 0.04, 0.55, 0.98);
          const inLane = hasClearLane(player, target, opponents);
          const errMag = inLane ? (1 - assist) * 12 : (1 - assist) * 24;
          const offsetX = (Math.random() - 0.5) * errMag;
          const offsetY = (Math.random() - 0.5) * errMag;
          const dirX = leadX + offsetX - player.x;
          const dirY = leadY + offsetY - player.y;
          const oneTouch = Math.hypot(target.vx, target.vy) < 8;
          const saucerDelay = inLane ? 0.12 : 0.18;
          const delay = (oneTouch ? 0.04 : saucerDelay) * (1 - momentum * 0.1);
          releasePuck(match.puck, dirX, dirY, passSpeed, delay, player);
          const lastPass = match.lastPass;
          if (
            lastPass &&
            lastPass.team === player.team &&
            lastPass.timer > 0 &&
            lastPass.fromId === target.id &&
            lastPass.toId === player.id
          ) {
            if (target.giveAndGoTimer > 0) {
              target.bonusSpeedTimer = 0.6;
              target.bonusSpeedMult = 1.08;
              target.giveAndGoTimer = 0;
            }
          }
          player.giveAndGoTimer = 0.7;
          const backdoor =
            Math.abs(player.y - RINK_HEIGHT / 2) > 24 &&
            Math.abs(target.y - RINK_HEIGHT / 2) > 24 &&
            Math.sign(player.y - RINK_HEIGHT / 2) !== Math.sign(target.y - RINK_HEIGHT / 2) &&
            (player.team === "home" ? player.x > RINK_WIDTH * 0.55 : player.x < RINK_WIDTH * 0.45);
          match.lastPass = {
            team: player.team,
            fromId: player.id,
            toId: target.id,
            timer: 0.8,
            oneTouch,
            backdoor,
          };
          if (match.passChain) {
            if (match.passChain.team === player.team && match.passChain.timer > 0) {
              match.passChain.count += 1;
            } else {
              match.passChain.team = player.team;
              match.passChain.count = 1;
            }
            match.passChain.timer = 1.1;
            if (match.passChain.count >= 2) {
              bumpMomentum(match, player.team, MOMENTUM_PASS_BONUS);
            }
          }
        }
      }
      if (player.shootHeld) {
        player.shootCharge = Math.min(SHOT_CHARGE_TIME, player.shootCharge + dt);
      }
      const released = player.lastShootHeld && !player.shootHeld;
      if (player.actions.shoot && !player.shootHeld) {
        const moveDir = normalize(player.moveX, player.moveY);
        const goalX = player.team === "home" ? RINK_WIDTH - 10 : 10;
        const goalY = RINK_HEIGHT / 2;
        const baseDir = normalize(goalX - player.x, goalY - player.y);
        const snapBias = Math.hypot(moveDir.x, moveDir.y) > 0.2 ? 0.4 : 0.15;
        const moveAim = Math.hypot(moveDir.x, moveDir.y) > 0.6;
        let aimX = (moveAim ? moveDir.x : baseDir.x) + player.dirX * 0.25;
        let aimY = (moveAim ? moveDir.y : baseDir.y) + player.dirY * 0.25;
        const staminaFactor = clamp(player.stamina / SPRINT_MAX, 0, 1);
        let bonus = 0;
        if (match.lastPass && match.lastPass.team === player.team && match.lastPass.toId === player.id && match.lastPass.timer > 0) {
          if (match.lastPass.oneTouch) bonus += 0.08;
          if (match.lastPass.backdoor) bonus += 0.1;
        }
        if (match.reboundWindow && match.reboundWindow.team === player.team && match.reboundWindow.timer > 0) {
          bonus += 0.07;
          match.reboundWindow.timer = 0;
        }
        bonus = clamp(bonus, 0, 0.15);
        aimX = aimX * (1 - bonus) + baseDir.x * bonus;
        aimY = aimY * (1 - bonus) + baseDir.y * bonus;
        ({ aimX, aimY } = applyAimError(aimX, aimY, player.shotAccuracyMult));
        const shotSpeed =
          SHOT_SPEED * SNAP_SHOT_MULT * (0.85 + staminaFactor * 0.15) * (player.shotPowerMult ?? 1);
        releasePuck(match.puck, aimX, aimY, shotSpeed, 0.1, player);
        const aimDir = normalize(aimX, aimY);
        const goalLineX = player.team === "home" ? RINK_WIDTH - GOAL_DEPTH : GOAL_DEPTH;
        const t = (goalLineX - player.x) / (aimDir.x || 1);
        const targetY = player.y + aimDir.y * t;
        const quality = clamp((0.65 + bonus) * (player.shotAccuracyMult ?? 1), 0.15, 1);
        match.shotEvent = { team: player.team, timer: 0.4, quality, targetY };
        match.lastShotTeam = player.team;
        match.lastShotTimer = 0.9;
        player.shootCharge = 0;
      } else if (released && player.shootCharge > 0) {
        const chargeRatio = clamp(player.shootCharge / SHOT_CHARGE_TIME, 0, 1);
        if (chargeRatio < 0.18) {
          const goalX = player.team === "home" ? RINK_WIDTH - 10 : 10;
          const goalY = RINK_HEIGHT / 2;
          const baseDir = normalize(goalX - player.x, goalY - player.y);
          const moveDir = normalize(player.moveX, player.moveY);
          const moveAim = Math.hypot(moveDir.x, moveDir.y) > 0.6;
          let aimX = (moveAim ? moveDir.x : baseDir.x) + player.dirX * 0.35 + moveDir.x * 0.2;
          let aimY = (moveAim ? moveDir.y : baseDir.y) + player.dirY * 0.35 + moveDir.y * 0.2;
          ({ aimX, aimY } = applyAimError(aimX, aimY, player.shotAccuracyMult));
          const aimDir = normalize(aimX, aimY);
          const goalLineX = player.team === "home" ? RINK_WIDTH - GOAL_DEPTH : GOAL_DEPTH;
          const t = (goalLineX - player.x) / (aimDir.x || 1);
          const targetY = player.y + aimDir.y * t;
          match.shotEvent = { team: player.team, timer: 0.25, quality: 0.2, fake: true, targetY };
          player.shootCharge = 0;
        } else {
          const goalX = player.team === "home" ? RINK_WIDTH - 10 : 10;
          const goalY = RINK_HEIGHT / 2;
          const baseDir = normalize(goalX - player.x, goalY - player.y);
          const moveDir = normalize(player.moveX, player.moveY);
          const moveAim = Math.hypot(moveDir.x, moveDir.y) > 0.6;
          let aimX = (moveAim ? moveDir.x : baseDir.x) + player.dirX * 0.35 + moveDir.x * 0.2;
          let aimY = (moveAim ? moveDir.y : baseDir.y) + player.dirY * 0.35 + moveDir.y * 0.2;
          const staminaFactor = clamp(player.stamina / SPRINT_MAX, 0, 1);
          let bonus = 0;
          if (match.lastPass && match.lastPass.team === player.team && match.lastPass.toId === player.id && match.lastPass.timer > 0) {
            if (match.lastPass.oneTouch) bonus += 0.08;
            if (match.lastPass.backdoor) bonus += 0.1;
          }
          if (match.reboundWindow && match.reboundWindow.team === player.team && match.reboundWindow.timer > 0) {
            bonus += 0.07;
            match.reboundWindow.timer = 0;
          }
          bonus = clamp(bonus, 0, 0.15);
          aimX = aimX * (1 - bonus) + baseDir.x * bonus;
          aimY = aimY * (1 - bonus) + baseDir.y * bonus;
          ({ aimX, aimY } = applyAimError(aimX, aimY, player.shotAccuracyMult));
          const shotSpeed =
            chargeRatio < 0.35
              ? SHOT_SPEED * WRIST_SHOT_MULT
              : SHOT_SPEED * (1 + chargeRatio * SHOT_CHARGE_MULT);
          const staminaShot = shotSpeed * (0.85 + staminaFactor * 0.15) * (player.shotPowerMult ?? 1);
          const quality = clamp(
            (chargeRatio * 0.9 + Math.abs(baseDir.x) * 0.1 + bonus) * (player.shotAccuracyMult ?? 1),
            0.15,
            1
          );
          releasePuck(match.puck, aimX, aimY, staminaShot, 0.12, player);
          const aimDir = normalize(aimX, aimY);
          const goalLineX = player.team === "home" ? RINK_WIDTH - GOAL_DEPTH : GOAL_DEPTH;
          const t = (goalLineX - player.x) / (aimDir.x || 1);
          const targetY = player.y + aimDir.y * t;
          match.shotEvent = { team: player.team, timer: 0.5, quality, targetY };
          match.lastShotTeam = player.team;
          match.lastShotTimer = 0.9;
          player.shootCharge = 0;
        }
      }
    } else {
      player.shootCharge = 0;
    }
    player.lastShootHeld = player.shootHeld;
    player.actions.shoot = false;
    player.actions.pass = false;
    player.actions.check = false;
    player.actions.switch = false;
  });
};

const hasClearLane = (owner, target, opponents) => {
  if (!target || !opponents.length) return true;
  const ax = owner.x;
  const ay = owner.y;
  const bx = target.x;
  const by = target.y;
  const abx = bx - ax;
  const aby = by - ay;
  const abLenSq = abx * abx + aby * aby || 1;
  const buffer = 26;
  return opponents.every((opponent) => {
    const apx = opponent.x - ax;
    const apy = opponent.y - ay;
    const t = clamp((apx * abx + apy * aby) / abLenSq, 0, 1);
    const closestX = ax + abx * t;
    const closestY = ay + aby * t;
    const dx = opponent.x - closestX;
    const dy = opponent.y - closestY;
    return dx * dx + dy * dy > buffer * buffer;
  });
};

const pickSmartPassTarget = (owner, teammates, opponents, mistakeRate = 0) => {
  let best = null;
  if (Math.random() < mistakeRate) {
    return teammates.find((player) => player.id !== owner.id) || null;
  }
  teammates.forEach((player) => {
    if (player.id === owner.id) return;
    const toGoal = player.team === "home" ? player.x : RINK_WIDTH - player.x;
    const ownerToGoal = owner.team === "home" ? owner.x : RINK_WIDTH - owner.x;
    if (toGoal <= ownerToGoal + 12) return;
    if (!hasClearLane(owner, player, opponents)) return;
    const dist = (player.x - owner.x) ** 2 + (player.y - owner.y) ** 2;
    if (!best || dist < best.dist) best = { player, dist };
  });
  return best?.player || null;
};

const updateBots = (match, shouldControl) => {
  const profile = match.botProfile || {};
  const passChance = profile.passChance ?? 0.02;
  const shootDistance = profile.shootDistance ?? 220;
  const checkRange = (profile.checkRange ?? CHECK_RANGE) * (match.aiCheckRangeMult ?? 1);
  const defenseBias = profile.defenseBias ?? 1;
  const mistakeRate = match.aiMistakeRate ?? 0.06;
  const aggressionBase = match.aiAggression ?? 1;
  match.players.forEach((player) => {
    if (!shouldControl(player)) return;
    const teamAggression = match.teamAggression?.[player.team] ?? 1;
    const teamDefenseBias = match.teamDefenseBias?.[player.team] ?? 1;
    const aggression = aggressionBase * teamAggression;
    const defenseBiasTeam = defenseBias * teamDefenseBias;
    const owner = match.puck.ownerId !== null ? match.players[match.puck.ownerId] : null;
    const teammates = match.players.filter((item) => item.team === player.team);
    const opponents = match.players.filter((item) => item.team !== player.team);
    const chaser = findNearest(teammates, match.puck.x, match.puck.y);
    let targetX = player.x;
    let targetY = player.y;

    player.actions.shoot = false;
    player.actions.pass = false;
    player.actions.check = false;
    player.speedMult = (profile.speedMult ?? 1) * (player.statSpeedMult ?? 1);
    player.accelMult = (profile.accelMult ?? 1) * (player.statAccelMult ?? 1);
    player.allowSprint = Boolean(profile.allowSprint);

    if (owner && owner.id === player.id) {
      const goal = getOppGoalCenter(player.team);
      targetX = goal.x;
      targetY = goal.y;
      const toGoal = Math.hypot(goal.x - player.x, goal.y - player.y);
      if (toGoal < shootDistance * aggression) {
        if (player.shootCharge >= SHOT_CHARGE_TIME * 0.5 || toGoal < shootDistance * 0.75) {
          player.shootHeld = false;
        } else {
          player.shootHeld = true;
        }
      } else {
        player.shootHeld = Math.random() < 0.2;
      }
      if (!player.shootHeld && Math.random() < passChance) {
        const target = pickSmartPassTarget(player, teammates, opponents, mistakeRate);
        if (target) {
          player.actions.pass = true;
        }
      }
      if (!player.shootHeld && Math.random() < 0.1) {
        player.actions.shoot = true;
      }
    } else if (owner && owner.team === player.team) {
      const laneOffset = getLaneOffset(player.slot);
      const bias = player.team === "home" ? 120 : -120;
      const roleBias = player.role === "defender" ? -40 : player.role === "wing" ? 40 : 0;
      const spread = player.role === "wing" ? 1.05 : player.role === "defender" ? 0.9 : 1;
      targetX = clamp(match.puck.x + bias + roleBias, 120, RINK_WIDTH - 120);
      targetY = clamp(match.puck.y + laneOffset * spread, 80, RINK_HEIGHT - 80);
      player.shootHeld = false;
    } else if (!owner || owner.team !== player.team) {
      if (player === chaser) {
        targetX = match.puck.x;
        targetY = match.puck.y;
        if (owner && owner.team !== player.team) {
          const dx = owner.x - player.x;
          const dy = owner.y - player.y;
          const range = checkRange * (player.statCheckRangeMult ?? 1);
          if (Math.hypot(dx, dy) <= range) player.actions.check = true;
        }
      } else {
        const behindNet = match.puck.x < 120 || match.puck.x > RINK_WIDTH - 120;
        if (behindNet && player.role === "wing") {
          targetX = player.team === "home" ? 140 : RINK_WIDTH - 140;
          targetY = clamp(match.puck.y, 80, RINK_HEIGHT - 80);
        }
        const defenseXBase = player.team === "home" ? 180 : RINK_WIDTH - 180;
        const defenseX = player.team === "home"
          ? defenseXBase * defenseBiasTeam
          : RINK_WIDTH - defenseXBase * defenseBiasTeam;
        const roleLane = player.role === "defender" ? -30 : player.role === "wing" ? 30 : 0;
        const laneOffset = getLaneOffset(player.slot);
        if (!behindNet || player.role !== "wing") {
          targetX = clamp(defenseX, 120, RINK_WIDTH - 120);
          const spacing = player.role === "center" ? 0.75 : 0.6;
          targetY = clamp(match.puck.y + laneOffset * spacing + roleLane, 80, RINK_HEIGHT - 80);
        }
      }
      player.shootHeld = false;
    }

    const move = normalize(targetX - player.x, targetY - player.y);
    player.moveX = move.x;
    player.moveY = move.y;
  });
};

const advanceMatch = (match, dt) => {
  match.accumulator += dt;
  if (match.shotEvent && match.shotEvent.timer > 0) {
    match.shotEvent.timer = Math.max(0, match.shotEvent.timer - dt);
  }
  if (match.lastPass && match.lastPass.timer > 0) {
    match.lastPass.timer = Math.max(0, match.lastPass.timer - dt);
  }
  if (match.passChain && match.passChain.timer > 0) {
    match.passChain.timer = Math.max(0, match.passChain.timer - dt);
    if (match.passChain.timer === 0) match.passChain.count = 0;
  }
  if (match.lastShotTimer > 0) {
    match.lastShotTimer = Math.max(0, match.lastShotTimer - dt);
    if (match.lastShotTimer === 0) match.lastShotTeam = null;
  }
  if (match.reboundWindow && match.reboundWindow.timer > 0) {
    match.reboundWindow.timer = Math.max(0, match.reboundWindow.timer - dt);
  }
  decayMomentum(match, dt);
  if (match.events) {
    match.events.hit = Math.max(0, match.events.hit - dt);
    match.events.save = Math.max(0, match.events.save - dt);
  }
  while (match.accumulator >= SIM_STEP) {
    if (match.phase === "playing") {
      updatePlayers(match, SIM_STEP);
      attachPossession(match.puck, match.players, match);
      positionPuckOnStick(match.puck, match.players);
      updatePuck(match.puck, SIM_STEP, match.players);
      updateGoalies(match, SIM_STEP);
      handleGoalieCollision(match);
      handlePuckWalls(match);
      const scoreToWin = match.rules?.scoreToWin ?? SCORE_TO_WIN;
      if (match.scores.home >= scoreToWin || match.scores.away >= scoreToWin) {
        match.phase = "finished";
      }
      if (match.rules?.mercyRule) {
        const diff = Math.abs(match.scores.home - match.scores.away);
        if (diff >= MERCY_DIFF) {
          match.phase = "finished";
        }
      }
    } else if (match.phase === "goal") {
      match.goalTimer -= SIM_STEP;
      if (match.goalTimer <= 0) {
        match.phase = "playing";
      }
    }
    match.accumulator -= SIM_STEP;
  }
};

export {
  RINK_WIDTH,
  RINK_HEIGHT,
  GOAL_DEPTH,
  GOAL_WIDTH,
  PUCK_RADIUS,
  PLAYER_RADIUS,
  STICK_LENGTH,
  STICK_RADIUS,
  MAX_SPEED,
  ACCEL,
  FRICTION,
  PUCK_FRICTION,
  PUCK_MAX_SPEED,
  SHOT_SPEED,
  PASS_SPEED,
  CHECK_RANGE,
  CHECK_FORCE,
  CHECK_STUN_TIME,
  SCORE_TO_WIN,
  SIM_STEP,
  GOALIE_RADIUS,
  clamp,
  normalize,
  createMatchState,
  createPlayer,
  createPuck,
  resetPositions,
  applyActions,
  updateBots,
  advanceMatch,
};
