import { COUNTRIES } from "./data/countriesData.js";

const WIDTH = 900;
const HEIGHT = 520;
const GOAL_W = 220;
const PUCK_R = 12;
const PAD_R = 28;
const BASE_FRICTION = 0.995;
const BASE_PLAYER_SPEED = 680;
const BASE_PLAYER_ACCEL = 4200;
const BASE_AI_SPEED = 420;
const BASE_AI_ACCEL = 3600;
const MAX_PUCK = 950;
const INPUT_DEADZONE = 0.4;
const PADDLE_DAMPING = 0.985;
const PADDLE_DAMPING_IDLE = 0.7;
const SPIN_FORCE = 0.08;

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const randomRange = (min, max) => min + Math.random() * (max - min);

const TWISTS = {
  LowFriction: { friction: 0.992, maxPuck: 1080 },
  HighFriction: { friction: 0.986 },
  HeavierPuck: { puckMass: 1.25, wallDamp: 0.92 },
  HighBounceWalls: { wallDamp: 1.08 },
  SpinBoost: { spinBoost: 1.25, spinDecay: 0.965 },
  SideDrift: { driftY: 18 },
  SpeedBurstPeriodic: { burstInterval: 10, burstDuration: 1.35, burstBoost: 1.3, burstLabel: "SURGE" },
  AccelerationOverTime: { speedRamp: 0.015 },
  SmallerGoals: { goalScale: 0.82 },
  PrecisionMode: { wallJitter: 0, spinBoost: 0.85, spinDecay: 0.985, precisionMode: true },
  HigherMaxSpeed: { maxPuck: 1200 },
  FasterResets: { serveSpeed: 360, resetDelay: 0.55 },
  MicroWallDeflections: { wallJitter: 0.08 },
  HigherPaddleSpeed: { paddleSpeedMult: 1.12, paddleAccelMult: 1.08 },
  None: {},
};

const TWIST_LABELS = {
  LowFriction: "Low friction",
  HighFriction: "High friction",
  HeavierPuck: "Heavier puck",
  HighBounceWalls: "Higher wall bounce",
  SpinBoost: "Stronger spin",
  SideDrift: "Side drift",
  SpeedBurstPeriodic: "Periodic speed burst",
  AccelerationOverTime: "Puck accelerates over time",
  SmallerGoals: "Smaller goals",
  PrecisionMode: "Precision mode",
  HigherMaxSpeed: "Higher max speed",
  FasterResets: "Faster restarts",
  MicroWallDeflections: "Micro-deflection walls",
  HigherPaddleSpeed: "Higher paddle speed cap",
  None: "None",
};

const twistLabel = (twist) => TWIST_LABELS[twist] ?? twist;

const imageCache = new Map();

const getArenaImage = (src) => {
  if (!src) return null;
  if (imageCache.has(src)) return imageCache.get(src);
  const img = new Image();
  img.src = encodeURI(src);
  imageCache.set(src, img);
  return img;
};

const PERSONALITIES = {
  Balanced: { speed: 1, reaction: 1, accuracy: 1, chaseBias: 1 },
  Aggressive: { speed: 1.1, reaction: 0.88, accuracy: 1.05, chaseBias: 1.25 },
  Defensive: { speed: 0.95, reaction: 1.05, accuracy: 0.9, chaseBias: 0.75 },
  Trickster: { speed: 1, reaction: 0.95, accuracy: 1.2, chaseBias: 1.05 },
};

const getPersonality = (style) => {
  if (style === "Adaptive") {
    const styles = Object.values(PERSONALITIES);
    const blend = styles.reduce(
      (acc, item) => ({
        speed: acc.speed + item.speed,
        reaction: acc.reaction + item.reaction,
        accuracy: acc.accuracy + item.accuracy,
        chaseBias: acc.chaseBias + item.chaseBias,
      }),
      { speed: 0, reaction: 0, accuracy: 0, chaseBias: 0 }
    );
    const count = styles.length;
    return {
      speed: (blend.speed / count) * 1.02,
      reaction: (blend.reaction / count) * 0.98,
      accuracy: (blend.accuracy / count) * 1.02,
      chaseBias: blend.chaseBias / count,
    };
  }
  return PERSONALITIES[style] ?? PERSONALITIES.Balanced;
};

const predictPuckY = (puck, targetX) => {
  if (Math.abs(puck.vx) < 1) return puck.y;
  const t = (targetX - puck.x) / puck.vx;
  if (t <= 0) return puck.y;
  const travel = puck.y + puck.vy * t;
  const minY = PUCK_R;
  const maxY = HEIGHT - PUCK_R;
  const range = maxY - minY;
  const period = range * 2;
  let mod = ((travel - minY) % period + period) % period;
  if (mod > range) mod = period - mod;
  return minY + mod;
};

export const renderMatchScreen = (options) => {
  const { country, save, onComplete, practice } = options;
  const baseTwist = TWISTS[country.arenaTwist] ?? {};
  const sideDriftDirection = country.arenaTwist === "SideDrift" ? (Math.random() < 0.5 ? -1 : 1) : 0;
  const twist = {
    ...baseTwist,
    driftY: baseTwist.driftY ? baseTwist.driftY * sideDriftDirection : 0,
  };
  const personality = getPersonality(country.aiStyle);
  const theme = country.arenaTheme?.table ?? {
    fill: "#0c111e",
    line: "rgba(255,255,255,0.25)",
    accent: "rgba(120,200,255,0.45)",
  };
  const backgroundSrc = country.arenaBackground || `Arenas/${country.name}.png`;
  const backgroundImage = getArenaImage(backgroundSrc);

  const screen = document.createElement("section");
  screen.className = "screen";

  const hud = document.createElement("div");
  hud.className = "match-hud";
  hud.innerHTML = `
    <div class="hud-pill flag-pill">
      <span class="flag">${country.flag}</span>
      <div>
        <strong>${country.name}</strong>
        <span>${country.isChampion ? "Champion Match" : "Tournament Match"}</span>
      </div>
    </div>
    <div class="hud-pill">Twist: <strong>${twistLabel(country.arenaTwist)}</strong></div>
    <div class="hud-pill score" id="score">0 - 0</div>
    <div class="hud-pill" id="serve-status" style="display:none;">Serve</div>
    <div class="hud-pill burst-indicator" id="burst-indicator" style="display:none;">Speed Burst</div>
    <div class="hud-pill">First to 5</div>
  `;

  const card = document.createElement("div");
  card.className = "match-card";

  const canvas = document.createElement("canvas");
  canvas.id = "gameCanvas";
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  canvas.setAttribute("aria-label", "PixelPuck match table");

  const flash = document.createElement("div");
  flash.className = "flash";
  flash.textContent = "SURGE";

  const goalFlashLeft = document.createElement("div");
  goalFlashLeft.className = "goal-flash left";
  const goalFlashRight = document.createElement("div");
  goalFlashRight.className = "goal-flash right";

  const introCard = document.createElement("div");
  introCard.className = "match-intro-card";
  const driftHint =
    country.arenaTwist === "SideDrift"
      ? `<div class="intro-hint"><span>↕</span> Side drift ${sideDriftDirection > 0 ? "downward" : "upward"}</div>`
      : "";
  const burstHint =
    country.arenaTwist === "SpeedBurstPeriodic"
      ? `<div class="intro-hint"><span>⚡</span> Speed bursts every ~10s</div>`
      : "";
  introCard.innerHTML = `
    <div class="intro-flag">${country.flag}</div>
    <div class="intro-title">${country.name}</div>
    <div class="intro-subtitle">${country.arenaName}</div>
    <div class="intro-grid">
      <div><span>Arena Twist</span><strong>${twistLabel(country.arenaTwist)}</strong></div>
      <div><span>AI Style</span><strong>${country.aiStyle}</strong></div>
      <div><span>Format</span><strong>First to 5</strong></div>
    </div>
    <div class="intro-hints">
      ${driftHint}
      ${burstHint}
    </div>
    <button class="secondary intro-skip" type="button">Skip</button>
  `;

  const overlay = document.createElement("div");
  overlay.className = "match-overlay";
  overlay.style.display = "none";

  card.appendChild(canvas);
  card.appendChild(flash);
  card.appendChild(goalFlashLeft);
  card.appendChild(goalFlashRight);
  card.appendChild(introCard);
  card.appendChild(overlay);

  const layout = document.createElement("div");
  layout.className = "match-layout";
  layout.appendChild(hud);
  layout.appendChild(card);
  screen.appendChild(layout);

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return { element: screen, cleanup: () => undefined };
  }

  const equippedPowerUp = save.equippedPowerUp ?? null;
  let paddleRadiusBonus = 0;
  let paddleAccelMult = 1;
  let powerHitBoost = 1;
  let controlGrip = 1;
  let playerDamping = PADDLE_DAMPING;
  let playerIdleDamping = PADDLE_DAMPING_IDLE;

  switch (equippedPowerUp) {
    case "PaddleSizePlus10":
      paddleRadiusBonus = 0.1;
      paddleAccelMult = 0.92;
      break;
    case "PaddleAccelBoost":
      paddleAccelMult = 1.12;
      break;
    case "PowerHit":
      powerHitBoost = 1.08;
      break;
    case "ControlGrip":
      controlGrip = 0.7;
      break;
    case "StabilityCore":
      playerDamping = 0.99;
      playerIdleDamping = 0.82;
      break;
    default:
      break;
  }

  const playerSpeed = BASE_PLAYER_SPEED * (twist.paddleSpeedMult ?? 1);
  const playerAccel = BASE_PLAYER_ACCEL * paddleAccelMult * (twist.paddleAccelMult ?? 1);

  const friction = twist.friction ?? BASE_FRICTION;
  const baseMaxPuckSpeed = twist.maxPuck ?? MAX_PUCK;
  let maxPuckSpeed = baseMaxPuckSpeed;
  const wallDamp = twist.wallDamp ?? 1;
  const wallJitter = twist.wallJitter ?? 0;
  const driftY = twist.driftY ?? 0;
  const burstInterval = twist.burstInterval ?? 0;
  const burstDuration = twist.burstDuration ?? 0;
  const burstBoost = twist.burstBoost ?? 1;
  const speedRamp = twist.speedRamp ?? 0;
  const goalScale = twist.goalScale ?? 1;
  const spinBoost = twist.spinBoost ?? 1;
  const spinDecay = twist.spinDecay ?? 0.97;
  const serveSpeed = twist.serveSpeed ?? 320;
  const resetDelay = twist.resetDelay ?? 0.8;
  const puckMass = twist.puckMass ?? 1;
  const precisionFactor = twist.precisionMode ? 0.4 : 1;
  const burstIndicator = hud.querySelector("#burst-indicator");
  if (burstIndicator) {
    burstIndicator.style.display = burstInterval ? "inline-flex" : "none";
  }

  const centerY = HEIGHT / 2;
  const centerX = WIDTH / 2;
  const goalHeight = GOAL_W * goalScale;
  const goalTop = (HEIGHT - goalHeight) / 2;
  const goalBottom = goalTop + goalHeight;

  const basePlayerRadius = PAD_R * (1 + paddleRadiusBonus);
  const baseAiRadius = PAD_R * 0.95;

  const player = {
    x: WIDTH * 0.2,
    y: centerY,
    r: basePlayerRadius,
    vx: 0,
    vy: 0,
    pulse: 0,
  };

  const ai = {
    x: WIDTH * 0.8,
    y: centerY,
    r: baseAiRadius,
    vx: 0,
    vy: 0,
    pulse: 0,
  };

  const puck = {
    x: centerX,
    y: centerY,
    vx: 0,
    vy: 0,
    spin: 0,
  };

  let serveTimer = 0;
  let serveDir = 1;
  let aiShotOffset = randomRange(-60, 60) * precisionFactor;
  let aiShotClock = 0;
  let rallyTimer = 0;

  const launchServe = () => {
    puck.vx = serveDir * serveSpeed;
    puck.vy = randomRange(-120, 120);
    puck.spin = 0;
  };

  const updateServeStatus = () => {
    const status = hud.querySelector("#serve-status");
    if (!status) return;
    if (serveTimer > 0) {
      status.style.display = "inline-flex";
      status.textContent = `Serve in ${Math.max(0.1, serveTimer).toFixed(1)}s`;
    } else {
      status.style.display = "none";
    }
  };

  const scheduleServe = (towardPlayer, delay) => {
    player.x = WIDTH * 0.2;
    player.y = centerY;
    player.vx = 0;
    player.vy = 0;
    ai.x = WIDTH * 0.8;
    ai.y = centerY;
    ai.vx = 0;
    ai.vy = 0;
    serveDir = towardPlayer ? -1 : 1;
    puck.x = centerX;
    puck.y = centerY;
    puck.vx = 0;
    puck.vy = 0;
    puck.spin = 0;
    serveTimer = delay;
    rallyTimer = 0;
    maxPuckSpeed = baseMaxPuckSpeed;
    if (delay <= 0) launchServe();
    updateServeStatus();
  };

  scheduleServe(false, 0);

  let playerScore = 0;
  let aiScore = 0;
  let lastTime = performance.now();
  let rafId = 0;
  let running = true;
  let activePointerId = null;
  let lastPointerType = "mouse";
  let inputTarget = { x: player.x, y: player.y };
  let target = { x: player.x, y: player.y };
  let fingerOffsetPx = 0;
  let touchSmoothing = 0.22;
  let mouseSmoothing = 0.35;
  let screenShake = 0;

  const aiFactor = clamp((country.difficulty - 1) / 9, 0, 1);
  const aiSpeed = BASE_AI_SPEED * (1 + aiFactor * 0.5) * personality.speed * (twist.paddleSpeedMult ?? 1);
  const aiAccel = BASE_AI_ACCEL * (1 + aiFactor * 0.4) * personality.speed * (twist.paddleAccelMult ?? 1);
  let aiReaction = (0.32 - aiFactor * 0.2) * personality.reaction;
  const aiAccuracy = (70 - aiFactor * 45) * personality.accuracy * precisionFactor;
  const chaseBias = personality.chaseBias;

  let aiTarget = { x: ai.x, y: ai.y };
  let lastAiUpdate = 0;
  let stuckTimer = 0;
  let lastPuckPos = { x: puck.x, y: puck.y };
  let aiAggro = false;
  let cornerTimer = 0;
  let zoneHoldTime = 0;
  let lastZone = puck.x < centerX ? "player" : "ai";

  let burstActive = false;
  let burstEnd = 0;
  let nextBurst = burstInterval || 0;

  let audioCtx: AudioContext | null = null;
  let audioReady = false;
  let audioPrimed = false;
  let lastPaddleSound = 0;
  let lastWallSound = 0;
  let lastGoalSound = 0;

  const ensureAudio = async () => {
    if (!audioCtx) {
      const Ctx = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctx) return;
      audioCtx = new Ctx();
    }
    if (audioCtx.state === "suspended") {
      try {
        await audioCtx.resume();
      } catch {
        return;
      }
    }
    audioReady = audioCtx.state === "running";
    return audioReady;
  };

  const playTone = (freq: number, duration: number, type: OscillatorType, gainValue: number) => {
    if (!audioReady || !audioCtx || audioCtx.state !== "running") return;
    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(gainValue, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  };

  const playPaddleSound = (hitSpeed: number) => {
    if (!audioCtx) return;
    const now = audioCtx.currentTime;
    if (now - lastPaddleSound < 0.04) return;
    lastPaddleSound = now;
    const freq = clamp(220 + hitSpeed * 0.12, 220, 520);
    playTone(freq, 0.08, "triangle", 0.08);
  };

  const playWallSound = () => {
    if (!audioCtx) return;
    const now = audioCtx.currentTime;
    if (now - lastWallSound < 0.06) return;
    lastWallSound = now;
    playTone(160, 0.06, "square", 0.05);
  };

  const playGoalSound = () => {
    if (!audioCtx) return;
    const now = audioCtx.currentTime;
    if (now - lastGoalSound < 0.2) return;
    lastGoalSound = now;
    playTone(520, 0.16, "sawtooth", 0.12);
  };

  const getScreenTuning = () => {
    const minScreen = Math.min(window.innerWidth, window.innerHeight);
    const isSmall = minScreen < 720;
    return {
      isSmall,
      paddleScale: isSmall ? 1.08 : 1,
      puckSpeedScale: isSmall ? 0.92 : 1,
      offsetPx: clamp(minScreen * 0.14, 70, 120),
    };
  };

  const applyScreenTuning = () => {
    const tuning = getScreenTuning();
    maxPuckSpeed = baseMaxPuckSpeed * tuning.puckSpeedScale;
    fingerOffsetPx = tuning.offsetPx;
    player.r = basePlayerRadius * tuning.paddleScale;
    ai.r = baseAiRadius * tuning.paddleScale;
    touchSmoothing = tuning.isSmall ? 0.2 : 0.24;
    mouseSmoothing = tuning.isSmall ? 0.3 : 0.38;
  };

  applyScreenTuning();

  const updateScore = () => {
    const score = hud.querySelector("#score");
    if (score) score.textContent = `${playerScore} - ${aiScore}`;
  };

  const triggerGoalFeedback = (side) => {
    const score = hud.querySelector("#score");
    if (score) {
      score.classList.remove("score-bump");
      void score.offsetWidth;
      score.classList.add("score-bump");
    }
    const flashNode = side === "left" ? goalFlashLeft : goalFlashRight;
    flashNode.classList.add("active");
    window.setTimeout(() => flashNode.classList.remove("active"), 280);
  };

  const endMatch = (didWin) => {
    running = false;
    const newlyDefeated =
      !practice && didWin && !country.isFinal && !save.defeatedCountries.includes(country.id);
    const progress = save.defeatedCountries.length + (newlyDefeated ? 1 : 0);
    const winnerLabel = practice ? "Practice Complete" : didWin ? "Victory" : "Defeat";
    const resultDetails = practice
      ? "Back to the tournament map."
      : didWin
        ? "Winner: You"
        : `Winner: ${country.flag} ${country.name}`;
    const defeatedLine =
      !practice && didWin ? `<div class="result-line">Defeated: ${country.flag} ${country.name}</div>` : "";
    overlay.style.display = "grid";
    overlay.innerHTML = `
      <h3>${winnerLabel}</h3>
      <div class="result-line">${resultDetails}</div>
      ${defeatedLine}
      <div class="result-line">Progress: ${progress} / ${COUNTRIES.length}</div>
      <div class="button-row">
        <button id="return-map">Return to Map</button>
        ${practice ? "" : '<button class="secondary" id="rematch">Rematch</button>'}
      </div>
    `;
    overlay.querySelector("#return-map")?.addEventListener("click", () => onComplete(didWin));
    overlay.querySelector("#rematch")?.addEventListener("click", () => onComplete(didWin, { rematch: true }));
  };

  const updateInputTarget = (event) => {
    const rect = canvas.getBoundingClientRect();
    const offsetDir = player.x < centerX ? 1 : -1;
    const offsetWorld =
      (lastPointerType === "touch" ? fingerOffsetPx : 0) * (WIDTH / rect.width) * offsetDir;
    const x = ((event.clientX - rect.left) / rect.width) * WIDTH + offsetWorld;
    const y = ((event.clientY - rect.top) / rect.height) * HEIGHT;
    inputTarget.x = clamp(x, player.r, centerX - player.r);
    inputTarget.y = clamp(y, player.r, HEIGHT - player.r);
  };

  const handlePointerDown = (event) => {
    event.preventDefault();
    void ensureAudio().then((ready) => {
      if (ready && !audioPrimed) {
        audioPrimed = true;
        playTone(440, 0.04, "triangle", 0.03);
      }
    });
    lastPointerType = event.pointerType ?? "mouse";
    activePointerId = event.pointerId;
    canvas.setPointerCapture(event.pointerId);
    updateInputTarget(event);
  };

  const handlePointerMove = (event) => {
    if (event.pointerType === "mouse" && activePointerId === null) {
      lastPointerType = "mouse";
      updateInputTarget(event);
      return;
    }
    if (event.pointerId !== activePointerId) return;
    event.preventDefault();
    lastPointerType = event.pointerType ?? lastPointerType;
    updateInputTarget(event);
  };

  const handlePointerUp = (event) => {
    if (event.pointerId !== activePointerId) return;
    event.preventDefault();
    if (canvas.hasPointerCapture(event.pointerId)) {
      canvas.releasePointerCapture(event.pointerId);
    }
    activePointerId = null;
  };

  const handlePointerCancel = (event) => {
    if (event.pointerId !== activePointerId) return;
    event.preventDefault();
    if (canvas.hasPointerCapture(event.pointerId)) {
      canvas.releasePointerCapture(event.pointerId);
    }
    activePointerId = null;
  };

  canvas.addEventListener("pointerdown", handlePointerDown, { passive: false });
  canvas.addEventListener("pointermove", handlePointerMove, { passive: false });
  canvas.addEventListener("pointerup", handlePointerUp, { passive: false });
  canvas.addEventListener("pointercancel", handlePointerCancel, { passive: false });

  const flashBurst = (label, showIndicator = false) => {
    flash.textContent = label;
    flash.classList.add("active");
    window.setTimeout(() => flash.classList.remove("active"), 600);
    if (showIndicator && burstIndicator) {
      burstIndicator.classList.add("active");
      window.setTimeout(() => burstIndicator.classList.remove("active"), 900);
    }
  };

  const updatePaddle = (paddle, targetPos, maxSpeed, accel, dt, damping, idleDamping) => {
    const dx = targetPos.x - paddle.x;
    const dy = targetPos.y - paddle.y;
    const dist = Math.hypot(dx, dy);
    let desiredVx = 0;
    let desiredVy = 0;
    if (dist > INPUT_DEADZONE) {
      desiredVx = (dx / dist) * maxSpeed;
      desiredVy = (dy / dist) * maxSpeed;
    }

    const ax = desiredVx - paddle.vx;
    const ay = desiredVy - paddle.vy;
    const maxA = accel * dt;
    paddle.vx += clamp(ax, -maxA, maxA);
    paddle.vy += clamp(ay, -maxA, maxA);

    paddle.x += paddle.vx * dt;
    paddle.y += paddle.vy * dt;

    const drag = dist < 2 ? idleDamping : damping;
    paddle.vx *= drag;
    paddle.vy *= drag;
  };

  const clampPaddle = (paddle, minX, maxX, minY, maxY) => {
    if (paddle.x < minX) {
      paddle.x = minX;
      if (paddle.vx < 0) paddle.vx = 0;
    }
    if (paddle.x > maxX) {
      paddle.x = maxX;
      if (paddle.vx > 0) paddle.vx = 0;
    }
    if (paddle.y < minY) {
      paddle.y = minY;
      if (paddle.vy < 0) paddle.vy = 0;
    }
    if (paddle.y > maxY) {
      paddle.y = maxY;
      if (paddle.vy > 0) paddle.vy = 0;
    }
  };

  const collidePaddle = (paddle, isPlayer) => {
    const dx = puck.x - paddle.x;
    const dy = puck.y - paddle.y;
    const dist = Math.hypot(dx, dy);
    const minDist = PUCK_R + paddle.r;
    if (dist >= minDist || dist === 0) return;
    const nx = dx / dist;
    const ny = dy / dist;
    const relative = puck.vx * nx + puck.vy * ny;
    if (relative < 0) {
      puck.vx -= 2 * relative * nx;
      puck.vy -= 2 * relative * ny;
    } else {
      const kick = Math.hypot(paddle.vx, paddle.vy) * 0.08;
      puck.vx += nx * kick;
      puck.vy += ny * kick;
    }

    const hitSpeed = Math.hypot(paddle.vx, paddle.vy);
    const impact = clamp(hitSpeed / 900, 0, 0.35);
    const impulse = (hitSpeed * 0.35) / puckMass;
    puck.vx += nx * impulse * 0.05;
    puck.vy += ny * impulse * 0.05;
    const hitBoost = isPlayer && hitSpeed > 520 ? powerHitBoost : 1;
    puck.vx *= (1 + impact * (isPlayer ? 1.1 : 0.7)) * hitBoost;
    puck.vy *= (1 + impact * (isPlayer ? 1.1 : 0.7)) * hitBoost;

    const offset = dx * -ny + dy * nx;
    const spinControl = isPlayer ? controlGrip : 1;
    puck.spin += (offset / paddle.r) * 0.6 * (isPlayer ? 1 : 0.7) * spinBoost * spinControl;

    if (isPlayer) {
      paddle.pulse = clamp(paddle.pulse + 0.6, 0, 1);
      if (hitSpeed > 620) screenShake = Math.max(screenShake, 4);
    } else {
      paddle.pulse = clamp(paddle.pulse + 0.4, 0, 1);
    }
    playPaddleSound(hitSpeed);

    const overlap = minDist - dist + 0.6;
    puck.x += nx * overlap;
    puck.y += ny * overlap;
  };

  const clampPuckSpeed = () => {
    const speed = Math.hypot(puck.vx, puck.vy);
    if (speed > maxPuckSpeed) {
      const scale = maxPuckSpeed / speed;
      puck.vx *= scale;
      puck.vy *= scale;
    }
  };

  const update = (now) => {
    if (!running) return;
    const dt = Math.min(0.03, (now - lastTime) / 1000);
    lastTime = now;

    const timeElapsed = (now - startTime) / 1000;
    if (burstInterval && !burstActive && timeElapsed >= nextBurst) {
      burstActive = true;
      burstEnd = timeElapsed + burstDuration;
      nextBurst += burstInterval;
      puck.vx *= burstBoost;
      puck.vy *= burstBoost;
      flashBurst(twist.burstLabel ?? "SURGE", true);
    }
    if (burstActive && timeElapsed >= burstEnd) {
      burstActive = false;
    }
    if (burstIndicator) {
      burstIndicator.classList.toggle("active", burstActive);
    }

    aiShotClock += dt;
    if (aiShotClock > 1.8) {
      aiShotOffset = randomRange(-80, 80) * precisionFactor;
      aiShotClock = 0;
    }

    if (now - lastAiUpdate > aiReaction * 1000) {
      lastAiUpdate = now;
      const dangerRadius = 150;
      const inGoalLane = puck.y > goalTop - 30 && puck.y < goalBottom + 30;
      const puckBetweenGoalAndAi = puck.x > ai.x + 8;
      const nearGoal = puck.x > WIDTH - dangerRadius;
      const inDanger = inGoalLane && nearGoal && puckBetweenGoalAndAi;
      const inGoalClear = inGoalLane && puck.x > WIDTH - 120;
      const puckInAiZone = puck.x > centerX + 10;
      const slowPuck = Math.hypot(puck.vx, puck.vy) < 220;
      const chasing = puckInAiZone || puck.vx > 40 || slowPuck;
      const predicted = predictPuckY(puck, ai.x);
      const aimNoise = randomRange(-aiAccuracy, aiAccuracy) * 0.15;
      const aggression = personality === PERSONALITIES.Aggressive ? 1 : personality === PERSONALITIES.Defensive ? 0.7 : 0.9;
      if (inDanger) {
        aiTarget = {
          x: clamp(puck.x - 18, centerX + ai.r, WIDTH - ai.r),
          y: clamp(puck.y, ai.r, HEIGHT - ai.r),
        };
      } else if (inGoalClear) {
        aiTarget = {
          x: WIDTH - ai.r - 2,
          y: clamp(puck.y, ai.r, HEIGHT - ai.r),
        };
      } else if (puckInAiZone && slowPuck) {
        aiTarget = {
          x: clamp(puck.x - 18, centerX + ai.r, WIDTH - ai.r),
          y: clamp(puck.y, ai.r, HEIGHT - ai.r),
        };
      } else if (chasing) {
        const attackX = clamp(puck.x + (puckInAiZone ? -40 : 0), centerX + ai.r, WIDTH - ai.r);
        const offset =
          personality === PERSONALITIES.Trickster
            ? randomRange(-90, 90) * precisionFactor
            : aiShotOffset * (aggression + 0.2);
        aiTarget = {
          x: attackX,
          y: clamp(predicted + offset * chaseBias + aimNoise, ai.r, HEIGHT - ai.r),
        };
      } else {
        aiTarget = {
          x: centerX + 140 + 40 * (1 - aggression),
          y: clamp(predicted + randomRange(-60, 60) * precisionFactor + aimNoise, ai.r, HEIGHT - ai.r),
        };
      }
    }

    const dangerZone = puck.x > centerX + 60 && puck.y > goalTop - 50 && puck.y < goalBottom + 50;
    aiAggro = dangerZone && puck.x > ai.x - 20;
    const aiSpeedCurrent = aiAggro ? aiSpeed * 1.18 : aiSpeed;
    const aiAccelCurrent = aiAggro ? aiAccel * 1.25 : aiAccel;
    const step = 1 / 120;
    let remaining = dt;
    let scored = false;
    while (remaining > 0 && !scored) {
      const slice = Math.min(step, remaining);
      remaining -= slice;

      const smoothing = lastPointerType === "touch" ? touchSmoothing : mouseSmoothing;
      const lerp = 1 - Math.pow(1 - smoothing, slice * 60);
      target.x += (inputTarget.x - target.x) * lerp;
      target.y += (inputTarget.y - target.y) * lerp;

      updatePaddle(player, target, playerSpeed, playerAccel, slice, playerDamping, playerIdleDamping);
      clampPaddle(player, player.r, centerX - player.r, player.r, HEIGHT - player.r);
      updatePaddle(ai, aiTarget, aiSpeedCurrent, aiAccelCurrent, slice, PADDLE_DAMPING, PADDLE_DAMPING_IDLE);
      clampPaddle(ai, centerX + ai.r, WIDTH - ai.r, ai.r, HEIGHT - ai.r);

      if (serveTimer > 0) {
        serveTimer -= slice;
        if (serveTimer <= 0) launchServe();
        updateServeStatus();
        continue;
      }

      puck.x += puck.vx * slice;
      puck.y += puck.vy * slice;

      if (speedRamp) {
        rallyTimer += slice;
        maxPuckSpeed = baseMaxPuckSpeed * (1 + speedRamp * rallyTimer);
      }

      const frictionFactor = Math.pow(friction, slice * 60);
      puck.vx *= frictionFactor;
      puck.vy *= frictionFactor;

      if (driftY) {
        puck.vy += driftY * slice;
      }

      if (Math.abs(puck.spin) > 0.001) {
        const speed = Math.hypot(puck.vx, puck.vy);
        if (speed > 10) {
          const sx = -puck.vy / speed;
          const sy = puck.vx / speed;
          const force = puck.spin * SPIN_FORCE;
          puck.vx += sx * force;
          puck.vy += sy * force;
        }
        puck.spin *= Math.pow(spinDecay, slice * 60);
      }

      const speedNow = Math.hypot(puck.vx, puck.vy);
      const cornerZone = 60;
      const inCorner =
        (puck.x < cornerZone || puck.x > WIDTH - cornerZone) &&
        (puck.y < cornerZone || puck.y > HEIGHT - cornerZone);
      if (inCorner) {
        cornerTimer += slice;
      } else {
        cornerTimer = 0;
      }
      if (inCorner && speedNow < 140) {
        const dx = centerX - puck.x;
        const dy = centerY - puck.y;
        const dist = Math.hypot(dx, dy) || 1;
        const push = 240 * slice;
        puck.vx += (dx / dist) * push;
        puck.vy += (dy / dist) * push;
      }
      if (inCorner && cornerTimer > 0.6) {
        const dx = centerX - puck.x;
        const dy = centerY - puck.y;
        const dist = Math.hypot(dx, dy) || 1;
        puck.vx += (dx / dist) * 220 + randomRange(-80, 80) * precisionFactor;
        puck.vy += (dy / dist) * 180 + randomRange(-80, 80) * precisionFactor;
        puck.spin = 0;
        cornerTimer = 0;
      }

      if (puck.x > centerX + 60 && speedNow < 120) {
        puck.vx += randomRange(-120, -40) * precisionFactor;
        puck.vy += randomRange(-60, 60) * precisionFactor;
      }

      const moved = Math.hypot(puck.x - lastPuckPos.x, puck.y - lastPuckPos.y);
      if (moved < 0.4) {
        stuckTimer += slice;
      } else {
        stuckTimer = 0;
      }
      lastPuckPos = { x: puck.x, y: puck.y };
      const nearCorner =
        (puck.x < 40 || puck.x > WIDTH - 40) && (puck.y < 40 || puck.y > HEIGHT - 40);
      if (stuckTimer > 0.8 && nearCorner) {
        puck.vx = randomRange(-260, 260) * precisionFactor;
        puck.vy = randomRange(-200, 200) * precisionFactor;
        puck.spin = 0;
        stuckTimer = 0;
      }

      const currentZone = puck.x < centerX ? "player" : "ai";
      if (currentZone === lastZone) {
        zoneHoldTime += slice;
      } else {
        zoneHoldTime = 0;
        lastZone = currentZone;
      }
      if (zoneHoldTime > 15) {
        scheduleServe(currentZone === "player", 0.8);
        zoneHoldTime = 0;
        flashBurst("RESET");
        lastZone = puck.x < centerX ? "player" : "ai";
      }

      if (puck.y - PUCK_R <= 0) {
        puck.y = PUCK_R;
        puck.vy = Math.abs(puck.vy) * wallDamp;
        if (wallJitter) puck.vx += randomRange(-wallJitter, wallJitter) * 180;
        playWallSound();
      }

      if (puck.y + PUCK_R >= HEIGHT) {
        puck.y = HEIGHT - PUCK_R;
        puck.vy = -Math.abs(puck.vy) * wallDamp;
        if (wallJitter) puck.vx += randomRange(-wallJitter, wallJitter) * 180;
        playWallSound();
      }

      if (puck.x - PUCK_R <= 0) {
        if (puck.y > goalTop && puck.y < goalBottom) {
          aiScore += 1;
          updateScore();
          playGoalSound();
          if (aiScore >= 5) {
            endMatch(false);
            return;
          }
          triggerGoalFeedback("left");
          scheduleServe(true, resetDelay);
          scored = true;
        } else {
          puck.x = PUCK_R;
          puck.vx = Math.abs(puck.vx) * wallDamp;
          if (wallJitter) puck.vy += randomRange(-wallJitter, wallJitter) * 180;
          playWallSound();
        }
      }

      if (puck.x + PUCK_R >= WIDTH) {
        if (puck.y > goalTop && puck.y < goalBottom) {
          playerScore += 1;
          updateScore();
          playGoalSound();
          if (playerScore >= 5) {
            endMatch(true);
            return;
          }
          triggerGoalFeedback("right");
          scheduleServe(false, resetDelay);
          scored = true;
        } else {
          puck.x = WIDTH - PUCK_R;
          puck.vx = -Math.abs(puck.vx) * wallDamp;
          if (wallJitter) puck.vy += randomRange(-wallJitter, wallJitter) * 180;
          playWallSound();
        }
      }

      collidePaddle(player, true);
      collidePaddle(ai, false);
      clampPuckSpeed();
    }

    drawTable();

    rafId = requestAnimationFrame(update);
  };

  const drawPaddle = (paddle, colors) => {
    const pulse = paddle.pulse;
    paddle.pulse = Math.max(0, paddle.pulse - 0.04);

    ctx.save();
    ctx.globalAlpha = 0.9 + pulse * 0.2;
    ctx.shadowColor = colors.glow;
    ctx.shadowBlur = 14 + pulse * 18;

    ctx.fillStyle = colors.base;
    ctx.beginPath();
    ctx.arc(paddle.x, paddle.y, paddle.r, 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.strokeStyle = colors.ring;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(paddle.x, paddle.y, paddle.r - 4, 0, Math.PI * 2);
    ctx.stroke();

    ctx.restore();
  };

  const drawTable = () => {
    ctx.save();
    if (screenShake > 0.2) {
      ctx.translate(randomRange(-screenShake, screenShake), randomRange(-screenShake, screenShake));
      screenShake = Math.max(0, screenShake - 0.35);
    }

    ctx.clearRect(0, 0, WIDTH, HEIGHT);
    if (backgroundImage && backgroundImage.complete && backgroundImage.naturalWidth > 0) {
      ctx.drawImage(backgroundImage, 0, 0, WIDTH, HEIGHT);
    } else {
      ctx.fillStyle = theme.fill;
      ctx.fillRect(0, 0, WIDTH, HEIGHT);
    }

    ctx.strokeStyle = theme.line;
    ctx.lineWidth = 2;
    ctx.strokeRect(10, 10, WIDTH - 20, HEIGHT - 20);

    ctx.setLineDash([8, 8]);
    ctx.beginPath();
    ctx.moveTo(centerX, 20);
    ctx.lineTo(centerX, HEIGHT - 20);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.beginPath();
    ctx.arc(centerX, centerY, 60, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = theme.accent;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(10, goalTop);
    ctx.lineTo(10, goalBottom);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(WIDTH - 10, goalTop);
    ctx.lineTo(WIDTH - 10, goalBottom);
    ctx.stroke();

    drawPaddle(player, { base: "#2dd4bf", ring: "#a7f3d0", glow: "rgba(45,212,191,0.65)" });
    drawPaddle(ai, { base: "#f97316", ring: "#fdba74", glow: "rgba(249,115,22,0.6)" });

    ctx.fillStyle = "#f8fafc";
    ctx.beginPath();
    ctx.arc(puck.x, puck.y, PUCK_R, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  };

  const resizeCanvas = () => {
    if (!screen.isConnected) return;
    applyScreenTuning();
    const cardStyle = getComputedStyle(card);
    const layoutStyle = getComputedStyle(layout);
    const screenStyle = getComputedStyle(screen);
    const paddingX = parseFloat(cardStyle.paddingLeft) + parseFloat(cardStyle.paddingRight);
    const paddingY = parseFloat(cardStyle.paddingTop) + parseFloat(cardStyle.paddingBottom);
    const cardRect = card.getBoundingClientRect();
    const layoutRect = layout.getBoundingClientRect();
    const hudRect = hud.getBoundingClientRect();
    const gapY = parseFloat(layoutStyle.rowGap || layoutStyle.gap) || 0;
    const screenPadBottom = parseFloat(screenStyle.paddingBottom) || 0;
    const maxWidth = Math.max(100, cardRect.width - paddingX);
    const availableHeight =
      window.innerHeight - layoutRect.top - hudRect.height - gapY - screenPadBottom - 8;
    const maxHeight = Math.max(100, availableHeight - paddingY);
    const scale = Math.min(maxWidth / WIDTH, maxHeight / HEIGHT, 1);
    const targetWidth = Math.max(200, Math.floor(WIDTH * scale));
    const targetHeight = Math.max(120, Math.floor(HEIGHT * scale));
    canvas.style.width = `${targetWidth}px`;
    canvas.style.height = `${targetHeight}px`;
    const pixelRatio = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(WIDTH * pixelRatio);
    canvas.height = Math.round(HEIGHT * pixelRatio);
    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  };

  const hideIntro = () => {
    introCard.classList.add("hidden");
  };
  const introTimer = window.setTimeout(hideIntro, 1200);
  introCard.querySelector(".intro-skip")?.addEventListener("click", (event) => {
    event.stopPropagation();
    window.clearTimeout(introTimer);
    hideIntro();
  });
  introCard.addEventListener("click", () => {
    if (!introCard.classList.contains("hidden")) {
      window.clearTimeout(introTimer);
      hideIntro();
    }
  });

  const startTime = performance.now();
  rafId = requestAnimationFrame(update);
  document.body.classList.add("match-active");
  requestAnimationFrame(resizeCanvas);
  window.addEventListener("resize", resizeCanvas);

  return {
    element: screen,
    cleanup: () => {
      running = false;
      cancelAnimationFrame(rafId);
      window.removeEventListener("resize", resizeCanvas);
      document.body.classList.remove("match-active");
      canvas.removeEventListener("pointerdown", handlePointerDown);
      canvas.removeEventListener("pointermove", handlePointerMove);
      canvas.removeEventListener("pointerup", handlePointerUp);
      canvas.removeEventListener("pointercancel", handlePointerCancel);
      if (audioCtx && audioCtx.state !== "closed") {
        audioCtx.close().catch(() => undefined);
      }
    },
  };
};
