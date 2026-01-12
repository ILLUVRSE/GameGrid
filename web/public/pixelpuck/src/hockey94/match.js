import {
  RINK_WIDTH,
  RINK_HEIGHT,
  GOAL_DEPTH,
  GOAL_WIDTH,
  PUCK_RADIUS,
  PLAYER_RADIUS,
  STICK_LENGTH,
  GOALIE_RADIUS,
  MAX_SPEED,
  ACCEL,
  FRICTION,
  clamp,
  normalize,
  createMatchState,
  resetPositions,
  applyActions,
  updateBots,
  advanceMatch,
} from "./sim.mjs";
import { COUNTRIES, FINAL_NODE } from "../data/countriesData.js";
import { buildGoalieModifiers, buildSkaterModifiers } from "./stats.js";

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

const createAudioManager = () => {
  let ctx = null;
  let humOsc = null;
  let humGain = null;
  let lastHitAt = 0;
  let lastSaveAt = 0;

  const ensureContext = () => {
    if (ctx) return ctx;
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    humOsc = ctx.createOscillator();
    humGain = ctx.createGain();
    humOsc.type = "sine";
    humGain.gain.value = 0;
    humOsc.connect(humGain).connect(ctx.destination);
    humOsc.start();
    return ctx;
  };

  const resume = () => {
    const audioCtx = ensureContext();
    if (audioCtx.state === "suspended") audioCtx.resume();
  };

  const playImpact = (intensity = 0.6) => {
    const audioCtx = ensureContext();
    const now = audioCtx.currentTime;
    if (now - lastHitAt < 0.08) return;
    lastHitAt = now;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = Math.random() < 0.5 ? "triangle" : "square";
    const base = 160 + Math.random() * 140;
    osc.frequency.setValueAtTime(base, now);
    gain.gain.setValueAtTime(0.12 * intensity, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
    osc.connect(gain).connect(audioCtx.destination);
    osc.start(now);
    osc.stop(now + 0.13);
  };

  const playSave = (intensity = 0.7) => {
    const audioCtx = ensureContext();
    const now = audioCtx.currentTime;
    if (now - lastSaveAt < 0.12) return;
    lastSaveAt = now;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(280, now);
    osc.frequency.exponentialRampToValueAtTime(140, now + 0.18);
    gain.gain.setValueAtTime(0.1 * intensity, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
    osc.connect(gain).connect(audioCtx.destination);
    osc.start(now);
    osc.stop(now + 0.22);
  };

  const playGoalHorn = (power = 0.7) => {
    const audioCtx = ensureContext();
    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(140, now);
    gain.gain.setValueAtTime(0.18 * power, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.9);
    osc.connect(gain).connect(audioCtx.destination);
    osc.start(now);
    osc.stop(now + 0.92);
  };

  const updatePuckHum = () => {
    if (!ctx || !humGain) return;
    humGain.gain.setTargetAtTime(0, ctx.currentTime, 0.05);
  };

  const stop = () => {
    if (!ctx) return;
    humGain?.gain.setValueAtTime(0, ctx.currentTime);
    ctx.close();
    ctx = null;
  };

  return { resume, playImpact, playSave, playGoalHorn, updatePuckHum, stop };
};

const INTERP_DELAY = 120;
const INPUT_ACTIVE_RATE = 1 / 30;
const INPUT_IDLE_RATE = 1 / 10;
const PING_INTERVAL_MS = 2000;

const formatCode = (code) => code.toString().padStart(5, "0");

const getDefaultServerUrl = () => {
  const protocol = window.location.protocol === "https:" ? "wss" : "ws";
  const hostname = window.location.hostname || "localhost";
  return `${protocol}://${hostname}:8080`;
};

const encodeButtons = (actions) =>
  (actions.shoot ? 1 : 0) |
  (actions.pass ? 2 : 0) |
  (actions.check ? 4 : 0) |
  (actions.switch ? 8 : 0);

class KeyboardInput {
  constructor() {
    this.keysDown = new Set();
    this.actionsPressed = {
      shoot: false,
      pass: false,
      check: false,
      switch: false,
    };
    this.onKeyDown = (event) => {
      const key = event.key;
      if (this.keysDown.has(key)) return;
      this.keysDown.add(key);
      if (key === "ArrowUp" || key === "ArrowDown" || key === "ArrowLeft" || key === "ArrowRight" || key === " ") {
        event.preventDefault();
      }
      if (key === " " || key === "Spacebar") this.actionsPressed.switch = true;
      if (key === "a" || key === "A") this.actionsPressed.pass = true;
      if (key === "s" || key === "S") this.actionsPressed.shoot = true;
      if (key === "c" || key === "C") this.actionsPressed.check = true;
    };
    this.onKeyUp = (event) => {
      if (
        event.key === "ArrowUp" ||
        event.key === "ArrowDown" ||
        event.key === "ArrowLeft" ||
        event.key === "ArrowRight" ||
        event.key === " "
      ) {
        event.preventDefault();
      }
      this.keysDown.delete(event.key);
    };
    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
  }

  getMove() {
    let x = 0;
    let y = 0;
    if (this.keysDown.has("ArrowUp")) y -= 1;
    if (this.keysDown.has("ArrowDown")) y += 1;
    if (this.keysDown.has("ArrowLeft")) x -= 1;
    if (this.keysDown.has("ArrowRight")) x += 1;
    if (x && y) {
      const norm = normalize(x, y);
      x = norm.x;
      y = norm.y;
    }
    return { x, y };
  }

  getActionsPressed() {
    return { ...this.actionsPressed };
  }

  getActionsHeld() {
    return {
      shoot: this.keysDown.has("s") || this.keysDown.has("S"),
      pass: this.keysDown.has("a") || this.keysDown.has("A"),
      check: this.keysDown.has("c") || this.keysDown.has("C"),
      switch: this.keysDown.has(" ") || this.keysDown.has("Spacebar"),
    };
  }

  clearActions() {
    this.actionsPressed.shoot = false;
    this.actionsPressed.pass = false;
    this.actionsPressed.check = false;
    this.actionsPressed.switch = false;
  }

  detach() {
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
  }
}

class TouchInput {
  constructor(container) {
    this.activeDirections = new Map();
    this.actionsPressed = {
      shoot: false,
      pass: false,
      check: false,
      switch: false,
    };
    this.actionsHeld = {
      shoot: false,
      pass: false,
      check: false,
      switch: false,
    };
    this.pad = container.querySelector(".touch-dpad");
    this.buttons = Array.from(container.querySelectorAll("[data-action]"));
    this.directionButtons = Array.from(container.querySelectorAll("[data-dir]"));
    this.handlers = [];
    if (this.pad) {
      this.pad.style.touchAction = "none";
    }
    this.bindButtons();
  }

  bindButtons() {
    this.directionButtons.forEach((button) => {
      const dir = button.getAttribute("data-dir");
      if (!dir) return;
      const onPress = (event) => {
        event.preventDefault();
        button.setPointerCapture(event.pointerId);
        this.activeDirections.set(event.pointerId, dir);
        button.classList.add("active");
      };
      const onRelease = (event) => {
        if (event.pointerId !== undefined) {
          this.activeDirections.delete(event.pointerId);
          button.releasePointerCapture(event.pointerId);
        }
        button.classList.remove("active");
      };
      button.addEventListener("pointerdown", onPress);
      button.addEventListener("pointerup", onRelease);
      button.addEventListener("pointercancel", onRelease);
      button.addEventListener("pointerout", onRelease);
      this.handlers.push(() => {
        button.removeEventListener("pointerdown", onPress);
        button.removeEventListener("pointerup", onRelease);
        button.removeEventListener("pointercancel", onRelease);
        button.removeEventListener("pointerout", onRelease);
      });
    });

    this.buttons.forEach((button) => {
      const action = button.getAttribute("data-action");
      if (!action) return;
      const onPress = (event) => {
        event.preventDefault();
        button.setPointerCapture(event.pointerId);
        this.actionsPressed[action] = true;
        this.actionsHeld[action] = true;
        button.classList.add("active");
      };
      const onRelease = (event) => {
        if (event.pointerId !== undefined) {
          button.releasePointerCapture(event.pointerId);
        }
        this.actionsHeld[action] = false;
        button.classList.remove("active");
      };
      button.addEventListener("pointerdown", onPress);
      button.addEventListener("pointerup", onRelease);
      button.addEventListener("pointercancel", onRelease);
      button.addEventListener("pointerout", onRelease);
      this.handlers.push(() => {
        button.removeEventListener("pointerdown", onPress);
        button.removeEventListener("pointerup", onRelease);
        button.removeEventListener("pointercancel", onRelease);
        button.removeEventListener("pointerout", onRelease);
      });
    });
  }

  getMove() {
    let x = 0;
    let y = 0;
    this.activeDirections.forEach((dir) => {
      if (dir === "up") y -= 1;
      if (dir === "down") y += 1;
      if (dir === "left") x -= 1;
      if (dir === "right") x += 1;
    });
    if (x && y) {
      const norm = normalize(x, y);
      x = norm.x;
      y = norm.y;
    }
    return { x, y };
  }

  hasMovement() {
    return this.activeDirections.size > 0;
  }

  getActionsPressed() {
    return { ...this.actionsPressed };
  }

  getActionsHeld() {
    return { ...this.actionsHeld };
  }

  clearActions() {
    this.actionsPressed.shoot = false;
    this.actionsPressed.pass = false;
    this.actionsPressed.check = false;
    this.actionsPressed.switch = false;
  }

  detach() {
    this.handlers.forEach((remove) => remove());
    this.handlers = [];
    this.activeDirections.clear();
  }
}

class InputManager {
  constructor(container) {
    this.keyboard = new KeyboardInput();
    this.touch = new TouchInput(container);
  }

  getState() {
    const touchMove = this.touch.getMove();
    const useTouch = this.touch.hasMovement();
    const keyboardMove = this.keyboard.getMove();
    const moveX = useTouch ? touchMove.x : keyboardMove.x;
    const moveY = useTouch ? touchMove.y : keyboardMove.y;
    const pressed = {
      shoot: this.touch.actionsPressed.shoot || this.keyboard.actionsPressed.shoot,
      pass: this.touch.actionsPressed.pass || this.keyboard.actionsPressed.pass,
      check: this.touch.actionsPressed.check || this.keyboard.actionsPressed.check,
      switch: this.touch.actionsPressed.switch || this.keyboard.actionsPressed.switch,
    };
    const held = {
      shoot: this.touch.actionsHeld.shoot || this.keyboard.getActionsHeld().shoot,
      pass: this.touch.actionsHeld.pass || this.keyboard.getActionsHeld().pass,
      check: this.touch.actionsHeld.check || this.keyboard.getActionsHeld().check,
      switch: this.touch.actionsHeld.switch || this.keyboard.getActionsHeld().switch,
    };
    return { moveX, moveY, pressed, held };
  }

  clearActions() {
    this.keyboard.clearActions();
    this.touch.clearActions();
  }

  detach() {
    this.keyboard.detach();
    this.touch.detach();
  }
}

const drawRink = (ctx, theme = {}, backgroundImage = null, goalScale = 1) => {
  const fill = theme.fill ?? "#0d1526";
  const line = theme.line ?? "rgba(255,255,255,0.12)";
  const accent = theme.accent ?? "rgba(84, 162, 255, 0.6)";
  const centerX = RINK_WIDTH / 2;
  const centerY = RINK_HEIGHT / 2;
  if (backgroundImage && backgroundImage.complete && backgroundImage.naturalWidth > 0) {
    ctx.drawImage(backgroundImage, 0, 0, RINK_WIDTH, RINK_HEIGHT);
  } else {
    const iceGradient = ctx.createLinearGradient(0, 0, RINK_WIDTH, RINK_HEIGHT);
    iceGradient.addColorStop(0, fill);
    iceGradient.addColorStop(0.45, "#10203d");
    iceGradient.addColorStop(1, "#0b1224");
    ctx.fillStyle = iceGradient;
    ctx.fillRect(0, 0, RINK_WIDTH, RINK_HEIGHT);
  }

  const iceGlow = ctx.createRadialGradient(centerX, centerY, 60, centerX, centerY, RINK_WIDTH * 0.9);
  iceGlow.addColorStop(0, "rgba(255,255,255,0.08)");
  iceGlow.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = iceGlow;
  ctx.fillRect(0, 0, RINK_WIDTH, RINK_HEIGHT);

  ctx.strokeStyle = "rgba(255,255,255,0.05)";
  ctx.lineWidth = 1;
  for (let x = -RINK_HEIGHT; x < RINK_WIDTH; x += 36) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x + RINK_HEIGHT, RINK_HEIGHT);
    ctx.stroke();
  }

  ctx.strokeStyle = "rgba(255,255,255,0.18)";
  ctx.lineWidth = 6;
  ctx.strokeRect(4, 4, RINK_WIDTH - 8, RINK_HEIGHT - 8);
  ctx.strokeStyle = line;
  ctx.lineWidth = 2;
  ctx.strokeRect(12, 12, RINK_WIDTH - 24, RINK_HEIGHT - 24);

  ctx.strokeStyle = accent;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(centerX, 12);
  ctx.lineTo(centerX, RINK_HEIGHT - 12);
  ctx.stroke();

  ctx.strokeStyle = "rgba(255, 84, 84, 0.6)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(RINK_WIDTH * 0.3, 12);
  ctx.lineTo(RINK_WIDTH * 0.3, RINK_HEIGHT - 12);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(RINK_WIDTH * 0.7, 12);
  ctx.lineTo(RINK_WIDTH * 0.7, RINK_HEIGHT - 12);
  ctx.stroke();

  const drawFaceoff = (x, y, radius) => {
    ctx.strokeStyle = "rgba(255, 84, 84, 0.4)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = "rgba(255, 84, 84, 0.18)";
    ctx.beginPath();
    ctx.arc(x, y, 6, 0, Math.PI * 2);
    ctx.fill();
  };

  const faceoffRadius = 42;
  const faceoffOffsetX = RINK_WIDTH * 0.27;
  const faceoffOffsetY = RINK_HEIGHT * 0.23;
  drawFaceoff(faceoffOffsetX, centerY - faceoffOffsetY, faceoffRadius);
  drawFaceoff(faceoffOffsetX, centerY + faceoffOffsetY, faceoffRadius);
  drawFaceoff(RINK_WIDTH - faceoffOffsetX, centerY - faceoffOffsetY, faceoffRadius);
  drawFaceoff(RINK_WIDTH - faceoffOffsetX, centerY + faceoffOffsetY, faceoffRadius);

  ctx.strokeStyle = "rgba(255,255,255,0.25)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(centerX, centerY, 70, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = "rgba(255,255,255,0.2)";
  ctx.beginPath();
  ctx.arc(centerX, centerY, 5, 0, Math.PI * 2);
  ctx.fill();

  const scaledGoalWidth = GOAL_WIDTH * goalScale;
  const goalTop = (RINK_HEIGHT - scaledGoalWidth) / 2;
  ctx.strokeStyle = "rgba(255,255,255,0.35)";
  ctx.lineWidth = 3;
  ctx.strokeRect(0, goalTop, GOAL_DEPTH + 6, scaledGoalWidth);
  ctx.strokeRect(RINK_WIDTH - GOAL_DEPTH - 6, goalTop, GOAL_DEPTH + 6, scaledGoalWidth);
  ctx.fillStyle = "rgba(255,255,255,0.08)";
  ctx.fillRect(0, goalTop, GOAL_DEPTH + 6, scaledGoalWidth);
  ctx.fillRect(RINK_WIDTH - GOAL_DEPTH - 6, goalTop, GOAL_DEPTH + 6, scaledGoalWidth);

  const creaseRadius = scaledGoalWidth * 0.34;
  ctx.strokeStyle = "rgba(84, 162, 255, 0.35)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(GOAL_DEPTH + 14, centerY, creaseRadius, Math.PI * 1.5, Math.PI * 0.5);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(RINK_WIDTH - GOAL_DEPTH - 14, centerY, creaseRadius, Math.PI * 0.5, Math.PI * 1.5);
  ctx.stroke();
};

const clampChannel = (value) => Math.max(0, Math.min(255, value));

const parseColor = (color) => {
  if (!color) return null;
  if (color.startsWith("#")) {
    const hex = color.replace("#", "");
    if (hex.length === 3) {
      const r = parseInt(hex[0] + hex[0], 16);
      const g = parseInt(hex[1] + hex[1], 16);
      const b = parseInt(hex[2] + hex[2], 16);
      return { r, g, b };
    }
    if (hex.length >= 6) {
      const r = parseInt(hex.slice(0, 2), 16);
      const g = parseInt(hex.slice(2, 4), 16);
      const b = parseInt(hex.slice(4, 6), 16);
      return { r, g, b };
    }
  }
  const match = color.match(/rgba?\(([^)]+)\)/);
  if (match) {
    const parts = match[1].split(",").map((part) => Number.parseFloat(part.trim()));
    if (parts.length >= 3) {
      return { r: parts[0], g: parts[1], b: parts[2] };
    }
  }
  return null;
};

const blendColor = (a, b, t) => {
  const c1 = parseColor(a);
  const c2 = parseColor(b);
  if (!c1 || !c2) return a;
  return `rgb(${clampChannel(c1.r + (c2.r - c1.r) * t)}, ${clampChannel(c1.g + (c2.g - c1.g) * t)}, ${clampChannel(
    c1.b + (c2.b - c1.b) * t,
  )})`;
};

const drawRoundedRect = (ctx, x, y, width, height, radius) => {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.arcTo(x + width, y, x + width, y + r, r);
  ctx.lineTo(x + width, y + height - r);
  ctx.arcTo(x + width, y + height, x + width - r, y + height, r);
  ctx.lineTo(x + r, y + height);
  ctx.arcTo(x, y + height, x, y + height - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
};

const drawPlayers = (ctx, players, controlledId, ownerId, power, rinkTheme = null, time = 0) => {
  players.forEach((player) => {
    const base = player.team === "home" ? "#43d9ad" : "#f6c453";
    const accent = rinkTheme?.accent ?? "#7aa2ff";
    const jersey = blendColor(base, accent, 0.15);
    const stripe = blendColor(base, accent, 0.45);
    const helmet = blendColor(base, "#ffffff", 0.2);
    const dirX = player.dirX || 1;
    const dirY = player.dirY || 0;
    const stickLength = STICK_LENGTH * 1.08;
    const torsoRadius = PLAYER_RADIUS * 0.88;
    const speed = Math.hypot(player.vx || 0, player.vy || 0);
    const stride = clamp(speed / 220, 0, 1);
    const stridePhase = time * 8 + player.id;
    const skateOffset = Math.sin(stridePhase) * 4 * stride;

    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.beginPath();
    ctx.ellipse(player.x + 2, player.y + 5, PLAYER_RADIUS * 1.05, PLAYER_RADIUS * 0.8, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "rgba(12,16,26,0.9)";
    ctx.beginPath();
    ctx.ellipse(
      player.x - torsoRadius * 0.35 + skateOffset,
      player.y + torsoRadius * 0.9,
      torsoRadius * 0.35,
      torsoRadius * 0.2,
      0,
      0,
      Math.PI * 2
    );
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(
      player.x + torsoRadius * 0.35 - skateOffset,
      player.y + torsoRadius * 0.9,
      torsoRadius * 0.35,
      torsoRadius * 0.2,
      0,
      0,
      Math.PI * 2
    );
    ctx.fill();

    ctx.fillStyle = helmet;
    ctx.beginPath();
    ctx.arc(player.x, player.y - torsoRadius * 0.55, PLAYER_RADIUS * 0.45, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(0,0,0,0.3)";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = jersey;
    ctx.beginPath();
    ctx.arc(player.x, player.y + torsoRadius * 0.05, torsoRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.25)";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.strokeStyle = stripe;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(player.x, player.y + torsoRadius * 0.15, torsoRadius * 0.7, Math.PI * 0.1, Math.PI * 0.9);
    ctx.stroke();

    ctx.fillStyle = "rgba(255,255,255,0.75)";
    ctx.font = "bold 9px \"Space Grotesk\", sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.strokeStyle = "rgba(0,0,0,0.45)";
    ctx.lineWidth = 2;
    const number = ((player.id ?? 0) % 99) + 1;
    const numberY = player.y + torsoRadius * 0.12;
    ctx.strokeText(String(number), player.x, numberY);
    ctx.fillText(String(number), player.x, numberY);

    if (player.id === ownerId) {
      ctx.strokeStyle = "rgba(255, 240, 140, 0.85)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(player.x, player.y, PLAYER_RADIUS + 6, 0, Math.PI * 2);
      ctx.stroke();
    }
    if (player.id === controlledId) {
      ctx.strokeStyle = "rgba(255,255,255,0.7)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(player.x, player.y, PLAYER_RADIUS + 4, 0, Math.PI * 2);
      ctx.stroke();
    }

    const stickWobble = Math.sin(stridePhase + 1.2) * 2 * stride;
    ctx.strokeStyle = "rgba(10,12,18,0.8)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(player.x + dirX * torsoRadius * 0.4, player.y + dirY * torsoRadius * 0.4);
    ctx.lineTo(player.x + dirX * stickLength + stickWobble, player.y + dirY * stickLength + stickWobble);
    ctx.stroke();
    ctx.strokeStyle = "rgba(210, 175, 120, 0.9)";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(player.x + dirX * stickLength + stickWobble, player.y + dirY * stickLength + stickWobble);
    ctx.lineTo(player.x + dirX * (stickLength + 8) + stickWobble, player.y + dirY * (stickLength + 8) + stickWobble);
    ctx.stroke();

    if (player.id === controlledId && power > 0) {
      const width = 34;
      const height = 5;
      const x = player.x - width / 2;
      const y = player.y + PLAYER_RADIUS + 9;
      ctx.fillStyle = "rgba(0,0,0,0.4)";
      ctx.fillRect(x, y, width, height);
      const powerGradient = ctx.createLinearGradient(x, y, x + width, y);
      powerGradient.addColorStop(0, "rgba(255, 232, 120, 0.95)");
      powerGradient.addColorStop(1, "rgba(255, 140, 80, 0.95)");
      ctx.fillStyle = powerGradient;
      ctx.fillRect(x, y, width * power, height);
    }
  });
};

const drawGoalies = (ctx, goalies, saveFlash = 0, rinkTheme = null, time = 0) => {
  if (!goalies) return;
  Object.values(goalies).forEach((goalie) => {
    const radius = goalie.r || GOALIE_RADIUS;
    const accent = rinkTheme?.accent ?? "#7aa2ff";
    const padColor = blendColor(goalie.team === "home" ? "#2dd4bf" : "#f97316", accent, 0.2);
    const pulse = Math.sin(time * 4 + goalie.x * 0.02) * 0.5 + 0.5;
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.beginPath();
    ctx.ellipse(goalie.x + 2, goalie.y + 4, radius * 1.05, radius * 0.8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = padColor;
    drawRoundedRect(ctx, goalie.x - radius * 1.1, goalie.y - radius * 0.1, radius * 0.6, radius * 1.4, 6);
    ctx.fill();
    drawRoundedRect(ctx, goalie.x + radius * 0.5, goalie.y - radius * 0.1, radius * 0.6, radius * 1.4, 6);
    ctx.fill();
    ctx.strokeStyle = `rgba(255,255,255,${0.15 + pulse * 0.2})`;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = goalie.team === "home" ? "#2dd4bf" : "#f97316";
    ctx.beginPath();
    ctx.arc(goalie.x, goalie.y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.25)";
    ctx.lineWidth = 2;
    ctx.stroke();
    if (saveFlash > 0) {
      ctx.strokeStyle = `rgba(255,255,255,${0.6 * saveFlash})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(goalie.x, goalie.y, radius + 6, 0, Math.PI * 2);
      ctx.stroke();
    }
  });
};

const drawPuck = (ctx, puck) => {
  ctx.fillStyle = "rgba(0,0,0,0.35)";
  ctx.beginPath();
  ctx.ellipse(puck.x + 2, puck.y + 3, PUCK_RADIUS * 1.1, PUCK_RADIUS * 0.85, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#f4f4f4";
  ctx.beginPath();
  ctx.arc(puck.x, puck.y, PUCK_RADIUS, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(0,0,0,0.35)";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.beginPath();
  ctx.arc(puck.x - 2, puck.y - 2, PUCK_RADIUS * 0.35, 0, Math.PI * 2);
  ctx.fill();
};

const interpolate = (a, b, t) => a + (b - a) * t;

  const interpolateSnapshot = (from, to, t) => {
    const players = from.players.map((player, index) => {
      const next = to.players[index] || player;
      return {
        ...player,
        x: interpolate(player.x, next.x, t),
        y: interpolate(player.y, next.y, t),
        vx: interpolate(player.vx ?? 0, next.vx ?? 0, t),
        vy: interpolate(player.vy ?? 0, next.vy ?? 0, t),
        dirX: interpolate(player.dirX, next.dirX, t),
        dirY: interpolate(player.dirY, next.dirY, t),
        shootCharge: interpolate(player.shootCharge ?? 0, next.shootCharge ?? 0, t),
        stamina: interpolate(player.stamina ?? 0, next.stamina ?? 0, t),
      };
    });
  const puck = {
    ...from.puck,
    x: interpolate(from.puck.x, to.puck.x, t),
    y: interpolate(from.puck.y, to.puck.y, t),
  };
  const goalies = from.goalies && to.goalies
    ? {
        home: {
          ...to.goalies.home,
          x: interpolate(from.goalies.home.x, to.goalies.home.x, t),
          y: interpolate(from.goalies.home.y, to.goalies.home.y, t),
        },
        away: {
          ...to.goalies.away,
          x: interpolate(from.goalies.away.x, to.goalies.away.x, t),
          y: interpolate(from.goalies.away.y, to.goalies.away.y, t),
        },
      }
    : to.goalies;
  return { ...to, players, puck, goalies, shotEvent: to.shotEvent || from.shotEvent };
};

const applyInputToPlayer = (player, input, dt) => {
  const dir = normalize(input.x, input.y);
  player.vx += dir.x * ACCEL * dt;
  player.vy += dir.y * ACCEL * dt;
  const speed = Math.hypot(player.vx, player.vy);
  if (speed > MAX_SPEED) {
    const scale = MAX_SPEED / speed;
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
};

const WATCH_PROFILE = {
  id: "watch",
  name: "Watch Mode",
  difficulty: 10,
  aiStyle: "Adaptive",
  flag: "WM",
};

const WATCH_PERIODS = 3;
const WATCH_PERIOD_SECONDS = 10 * 60;

const MODE_RULES = {
  solo: { scoreToWin: 5, mercyRule: true, timed: false },
  online: { scoreToWin: 5, mercyRule: true, timed: false },
  franchise: { scoreToWin: 5, mercyRule: true, timed: false },
  watch: { scoreToWin: 999, mercyRule: false, timed: true },
};

const renderHockey94Screen = ({ onBack, mode, config, onComplete }) => {
  const isOnline = mode === "online";
  const isWatch = mode === "watch";
  const isFranchise = mode === "franchise";
  const headerTitle = isOnline ? "Online Multiplayer" : isWatch ? "Watch Mode" : isFranchise ? "Franchise Match" : "Solo vs AI";
  const connectionTitle = isOnline ? "Host or Join" : isWatch ? "Watch Setup" : isFranchise ? "Match Setup" : "Match Setup";
  const connectionCopy = isOnline
    ? "Enter a 5-digit room code to join, or host to create one."
    : isWatch
      ? "Level 10 AI vs AI, three 10-minute periods."
      : isFranchise
        ? "Starting your franchise matchup."
        : "Pick a country and arena, then start a local 3v3 showdown.";
  const overlayCopy = isOnline
    ? "Share the room code to run it back."
    : isWatch
      ? "Watch session complete."
      : "Match complete. Ready to drop the puck again?";
  const setupBlock = isOnline
    ? `
    <div class="hockey94-connection" id="hockey94-connection">
      <div class="connection-card">
        <h3>${connectionTitle}</h3>
        <p>${connectionCopy}</p>
        <div class="button-row">
          <button class="primary" id="hockey94-host">Host Game</button>
        </div>
        <div class="join-row">
          <input id="hockey94-code" type="text" maxlength="5" inputmode="numeric" placeholder="12345" />
          <button class="secondary" id="hockey94-join">Join Game</button>
        </div>
        <div class="server-row">
          <label for="hockey94-server">Server</label>
          <input id="hockey94-server" type="text" />
        </div>
        <p class="connection-status" id="hockey94-status-text">Waiting for action.</p>
      </div>
    </div>
    <div class="hockey94-lobby" id="hockey94-lobby" hidden>
      <div class="lobby-header">
        <div>
          <p class="eyebrow">Room Code</p>
          <h3 id="hockey94-room-code">00000</h3>
        </div>
        <div class="lobby-count" id="hockey94-count">0/6</div>
      </div>
      <div class="player-grid" id="hockey94-players"></div>
      <div class="lobby-status" id="hockey94-lobby-status">Waiting for players...</div>
      <div class="button-row" id="hockey94-lobby-actions" hidden>
        <button class="primary" id="hockey94-start">Start Match</button>
      </div>
    </div>
  `
    : isFranchise
      ? ""
      : `
    <div class="hockey94-setup" id="hockey94-setup">
      <div class="connection-card">
        <h3>${connectionTitle}</h3>
        <p>${connectionCopy}</p>
        ${
          isWatch
            ? `
        <div class="setup-row">
          <label for="hockey94-arena">Arena</label>
          <select id="hockey94-arena"></select>
        </div>
        <p class="setup-preview" id="hockey94-preview">Arena: --</p>
        <div class="button-row">
          <button class="primary" id="hockey94-start-solo" disabled>Start Watch</button>
        </div>
        `
            : `
        <div class="setup-row">
          <label for="hockey94-country">Country</label>
          <select id="hockey94-country"></select>
        </div>
        <div class="setup-row">
          <label for="hockey94-arena">Arena</label>
          <select id="hockey94-arena"></select>
        </div>
        <p class="setup-preview" id="hockey94-preview">Country: -- | Arena: --</p>
        <div class="button-row">
          <button class="primary" id="hockey94-start-solo" disabled>Start Match</button>
        </div>
        `
        }
      </div>
    </div>
  `;
  const screen = document.createElement("section");
  screen.className = "screen hockey94-screen";
  screen.innerHTML = `
    <div class="hockey94-header">
      <div>
        <p class="eyebrow">3v3 Arcade Hockey</p>
        <h2>${headerTitle}</h2>
      </div>
      <div class="button-row">
        <button class="secondary" id="hockey94-back">Back to Modes</button>
      </div>
    </div>
    <div class="hockey94-meta" id="hockey94-meta" hidden></div>
    ${setupBlock}
    <div class="hockey94-hud" id="hockey94-hud" hidden>
      <div class="hud-pill">Team A <strong id="score-home">0</strong></div>
      <div class="hud-pill center" id="hockey94-status">Waiting...</div>
      <div class="hud-pill">Team B <strong id="score-away">0</strong></div>
    </div>
    <div class="hockey94-network" id="hockey94-network" hidden>Ping --</div>
    <div class="hockey94-card" id="hockey94-card" hidden>
      <canvas id="hockey94-canvas" width="${RINK_WIDTH}" height="${RINK_HEIGHT}"></canvas>
      <div class="hockey94-overlay" id="hockey94-overlay" style="display:none;">
        <div class="overlay-card">
          <h3 id="hockey94-result">Team A Wins</h3>
          <p id="hockey94-overlay-copy">${overlayCopy}</p>
          <div class="button-row">
            <button class="secondary" id="hockey94-exit">Back to Modes</button>
          </div>
        </div>
      </div>
    </div>
    <div class="hockey94-controls" id="hockey94-controls" hidden>
      <div><strong>Move</strong> Up / Down / Left / Right (Arrow Keys)</div>
      <div><strong>Switch Player</strong> Space</div>
      <div><strong>Pass</strong> A</div>
      <div><strong>Shoot</strong> S</div>
      <div><strong>Check / Take Puck / Defense</strong> C</div>
    </div>
  `;

  const canvas = screen.querySelector("#hockey94-canvas");
  if (!canvas) {
    throw new Error("Hockey94 canvas missing.");
  }
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Hockey94 canvas context unavailable.");
  }

  const hud = screen.querySelector("#hockey94-hud");
  const hudStatus = screen.querySelector("#hockey94-status");
  const scoreHome = screen.querySelector("#score-home");
  const scoreAway = screen.querySelector("#score-away");
  const overlay = screen.querySelector("#hockey94-overlay");
  const result = screen.querySelector("#hockey94-result");
  const meta = screen.querySelector("#hockey94-meta");
  const lobby = screen.querySelector("#hockey94-lobby");
  const lobbyStatus = screen.querySelector("#hockey94-lobby-status");
  const lobbyCount = screen.querySelector("#hockey94-count");
  const lobbyPlayers = screen.querySelector("#hockey94-players");
  const lobbyActions = screen.querySelector("#hockey94-lobby-actions");
  const lobbyStart = screen.querySelector("#hockey94-start");
  const roomCodeEl = screen.querySelector("#hockey94-room-code");
  const connectionPane = screen.querySelector("#hockey94-connection");
  const connectionStatus = screen.querySelector("#hockey94-status-text");
  const serverInput = screen.querySelector("#hockey94-server");
  const codeInput = screen.querySelector("#hockey94-code");
  const card = screen.querySelector("#hockey94-card");
  const controls = screen.querySelector("#hockey94-controls");
  const network = screen.querySelector("#hockey94-network");
  const touchControls = screen.querySelector(".hockey94-touch-overlay");
  const setupPane = screen.querySelector("#hockey94-setup");
  const countrySelect = screen.querySelector("#hockey94-country");
  const arenaSelect = screen.querySelector("#hockey94-arena");
  const setupPreview = screen.querySelector("#hockey94-preview");
  const soloStart = screen.querySelector("#hockey94-start-solo");

  const inputManager = new InputManager(screen);
  const isTouchDevice = "ontouchstart" in window || navigator.maxTouchPoints > 0;
  const audio = createAudioManager();

  const soloMatch = isOnline ? null : createMatchState();
  const homeSlots = soloMatch ? soloMatch.players.filter((player) => player.team === "home").map((player) => player.id) : [];
  let controlledIndex = 0;
  let rinkTheme = null;
  let backgroundImage = null;
  let selectedCountry = null;
  let selectedArena = null;
  let soloActive = false;
  let watchPeriod = 1;
  let watchClock = WATCH_PERIOD_SECONDS;
  let hasCompleted = false;
  let performanceTracker = { shotsFor: 0, shotsAgainst: 0 };
  let adaptTimer = 0;
  let lastScores = { home: 0, away: 0 };
  let scoreInitialized = false;
  let lastShotPower = 0.7;
  const unlockAudio = () => audio.resume();
  window.addEventListener("pointerdown", unlockAudio, { once: true });
  window.addEventListener("keydown", unlockAudio, { once: true });

  let socket = null;
  let roomCode = "";
  let playerId = isOnline ? null : homeSlots[controlledIndex] ?? 0;
  let token = null;
  let isHost = false;
  let isConnected = false;

  const applySkaterModifiers = (player, attributes) => {
    const modifiers = buildSkaterModifiers(attributes || {});
    player.statSpeedMult = modifiers.speedMult;
    player.statAccelMult = modifiers.accelMult;
    player.statCheckRangeMult = modifiers.checkRangeMult;
    player.speedMult = modifiers.speedMult;
    player.accelMult = modifiers.accelMult;
    player.shotPowerMult = modifiers.shotPowerMult;
    player.shotAccuracyMult = modifiers.shotAccuracyMult;
    player.passSpeedMult = modifiers.passSpeedMult;
    player.passAssistMult = modifiers.passAssistMult;
    player.checkRangeMult = modifiers.checkRangeMult;
    player.aiMistakeRateMult = modifiers.aiMistakeRateMult;
    player.staminaMult = modifiers.staminaMult;
  };

  const applyRosterModifiers = (match, roster = {}, config = {}) => {
    const homeSkaters = roster.homeSkaters || [];
    const awaySkaters = roster.awaySkaters || [];
    homeSkaters.forEach((skater, index) => {
      const player = match.players[index];
      if (!player) return;
      applySkaterModifiers(player, skater.attributes);
    });
    awaySkaters.forEach((skater, index) => {
      const player = match.players[index + 3];
      if (!player) return;
      applySkaterModifiers(player, skater.attributes);
    });
    if (config.homeGoalie || config.awayGoalie) {
      match.goalieModifiers = {
        home: buildGoalieModifiers(config.homeGoalie?.attributes || {}),
        away: buildGoalieModifiers(config.awayGoalie?.attributes || {}),
      };
    }
  };
  let snapshots = [];
  let lastSeq = 0;
  let timeOffset = 0;
  let lastAckSeq = 0;
  let lastSendAt = 0;
  let lastInputAt = 0;
  let lastPingAt = 0;
  let rtt = 0;
  let jitter = 0;
  let interpDelay = isOnline ? INTERP_DELAY : 0;
  let canSendInputs = false;
  const pendingInputs = [];

  if (serverInput && isOnline) serverInput.value = getDefaultServerUrl();

  if (soloMatch) {
    soloMatch.players.forEach((player) => {
      player.isBot = isWatch ? true : player.id !== playerId;
    });
    resetPositions(soloMatch);
  }

  const allCountries = soloMatch ? [...COUNTRIES, FINAL_NODE] : [];
  const arenaMap = new Map();
  allCountries.forEach((country) => {
    if (!arenaMap.has(country.arenaName)) arenaMap.set(country.arenaName, country);
  });
  const arenaOptions = Array.from(arenaMap.values());

  if (countrySelect) {
    countrySelect.innerHTML = `<option value="">Select Country</option>`;
    allCountries.forEach((country) => {
      const option = document.createElement("option");
      option.value = country.id;
      option.textContent = `${country.flag} ${country.name}`;
      countrySelect.appendChild(option);
    });
  }

  if (arenaSelect) {
    arenaSelect.innerHTML = `<option value="">Select Arena</option>`;
    arenaOptions.forEach((country) => {
      const option = document.createElement("option");
      option.value = country.arenaName;
      option.textContent = country.arenaName;
      arenaSelect.appendChild(option);
    });
  }

  const updateSetupPreview = () => {
    if (!soloMatch) return;
    const countryId = countrySelect?.value || "";
    const arenaName = arenaSelect?.value || "";
    selectedCountry = isWatch ? WATCH_PROFILE : allCountries.find((country) => country.id === countryId) || null;
    selectedArena = arenaOptions.find((country) => country.arenaName === arenaName) || null;
    if (setupPreview) {
      const arenaLabel = selectedArena ? selectedArena.arenaName : "--";
      if (isWatch) {
        setupPreview.textContent = `Arena: ${arenaLabel}`;
      } else {
        const countryLabel = selectedCountry ? selectedCountry.name : "--";
        setupPreview.textContent = `Country: ${countryLabel} | Arena: ${arenaLabel}`;
      }
    }
    if (soloStart) soloStart.disabled = !(selectedCountry && selectedArena);
  };

  countrySelect?.addEventListener("change", updateSetupPreview);
  arenaSelect?.addEventListener("change", updateSetupPreview);
  updateSetupPreview();

  if (isFranchise && soloMatch) {
    const arenaName = config?.arenaName;
    selectedArena = arenaOptions.find((country) => country.arenaName === arenaName) || arenaOptions[0] || null;
    selectedCountry = {
      id: "franchise_ai",
      name: config?.opponentName || "Opponent",
      difficulty: config?.difficulty ?? 7,
      aiStyle: config?.aiStyle ?? "Balanced",
      flag: "FR",
    };
    if (setupPreview) {
      const arenaLabel = selectedArena ? selectedArena.arenaName : "--";
      setupPreview.textContent = `Arena: ${arenaLabel}`;
    }
    if (soloStart) soloStart.disabled = !(selectedCountry && selectedArena);
  }

  const setView = (view) => {
    document.body.classList.toggle("match-active", view === "playing");
    document.body.classList.toggle("hockey94-active", view === "playing");
    document.documentElement.classList.toggle("match-active", view === "playing");
    if (connectionPane) connectionPane.hidden = view !== "connection";
    if (lobby) lobby.hidden = view !== "lobby";
    if (setupPane) setupPane.hidden = view !== "setup";
    if (hud) hud.hidden = view !== "playing";
    if (card) card.hidden = view !== "playing";
    if (controls) controls.hidden = view !== "playing" || isWatch;
    if (touchControls) touchControls.hidden = view !== "playing" || !isTouchDevice || isWatch;
    if (meta) meta.hidden = view !== "playing";
    if (network) network.hidden = !isOnline || view === "connection";
  };

  const updateLobby = (players, started) => {
    if (!lobbyPlayers) return;
    lobbyPlayers.innerHTML = "";
    players.forEach((player) => {
      const slot = document.createElement("div");
      slot.className = `player-slot ${player.team === "home" ? "team-home" : "team-away"}`;
      if (player.connected) slot.classList.add("connected");
      const teamIndex = (player.slot % 3) + 1;
      slot.textContent = `${player.team === "home" ? "Team A" : "Team B"} Player ${teamIndex}`;
      lobbyPlayers.appendChild(slot);
    });
    const connected = players.filter((player) => player.connected).length;
    if (lobbyCount) lobbyCount.textContent = `${connected}/6`;
    if (lobbyStatus) {
      lobbyStatus.textContent = started
        ? "Match starting..."
        : `Waiting for players... ${connected}/6`;
    }
    if (lobbyActions) lobbyActions.hidden = !isHost || started;
  };

  const setScores = (scores) => {
    if (!scores) return;
    if (scoreHome) scoreHome.textContent = scores.home;
    if (scoreAway) scoreAway.textContent = scores.away;
  };

  const buildBotProfile = (country) => {
    if (!country) return null;
    const difficulty = Number(country.difficulty || 5);
    const style = country.aiStyle || "Balanced";
    const diffBoost = clamp((difficulty - 5) / 10, -0.3, 0.3);
    const profiles = {
      Balanced: { passChance: 0.02, shootDistance: 220, defenseBias: 1, speedMult: 1, accelMult: 1 },
      Aggressive: { passChance: 0.012, shootDistance: 260, defenseBias: 0.92, speedMult: 1.05, accelMult: 1.08 },
      Defensive: { passChance: 0.03, shootDistance: 190, defenseBias: 1.08, speedMult: 0.95, accelMult: 0.96 },
      Trickster: { passChance: 0.04, shootDistance: 210, defenseBias: 1, speedMult: 1.02, accelMult: 1 },
      Adaptive: { passChance: 0.025, shootDistance: 230, defenseBias: 1, speedMult: 1.02, accelMult: 1.02 },
    };
    const base = profiles[style] || profiles.Balanced;
    return {
      passChance: Math.max(0.005, base.passChance * (1 + diffBoost * 0.6)),
      shootDistance: Math.max(160, base.shootDistance * (1 + diffBoost * 0.4)),
      defenseBias: clamp(base.defenseBias - diffBoost * 0.2, 0.85, 1.2),
      speedMult: clamp(base.speedMult + diffBoost * 0.25, 0.9, 1.2),
      accelMult: clamp(base.accelMult + diffBoost * 0.25, 0.9, 1.2),
      allowSprint: difficulty >= 6,
    };
  };

  const buildDifficultyProfile = (country) => {
    const difficulty = Number(country?.difficulty || 5);
    if (difficulty <= 3) {
      return {
        tier: "Easy",
        passAssist: 1.05,
        aiMistakeRate: 0.14,
        aiAggression: 0.85,
        aiCheckRangeMult: 0.85,
        goalie: { reaction: 0.14, speed: 360, radius: 24 },
      };
    }
    if (difficulty <= 6) {
      return {
        tier: "Normal",
        passAssist: 0.9,
        aiMistakeRate: 0.08,
        aiAggression: 1,
        aiCheckRangeMult: 1,
        goalie: { reaction: 0.2, speed: 420, radius: 22 },
      };
    }
    if (difficulty <= 8) {
      return {
        tier: "Hard",
        passAssist: 0.75,
        aiMistakeRate: 0.05,
        aiAggression: 1.08,
        aiCheckRangeMult: 1.05,
        goalie: { reaction: 0.22, speed: 460, radius: 21 },
      };
    }
    return {
      tier: "Elite",
      passAssist: 0.65,
      aiMistakeRate: 0.035,
      aiAggression: 1.16,
      aiCheckRangeMult: 1.12,
      goalie: { reaction: 0.24, speed: 490, radius: 20 },
    };
  };

  const updateMeta = () => {
    if (!meta || !selectedCountry || !selectedArena) return;
    if (isWatch) {
      meta.innerHTML = `
        <div class="hud-pill">Watch Mode: <strong>Level ${selectedCountry.difficulty} AI vs AI</strong></div>
        <div class="hud-pill">AI Style: <strong>${selectedCountry.aiStyle}</strong></div>
        <div class="hud-pill">Arena: <strong>${selectedArena.arenaName}</strong></div>
        <div class="hud-pill">Twist: <strong>${twistLabel(selectedArena.arenaTwist)}</strong></div>
      `;
      return;
    }
    meta.innerHTML = `
      <div class="hud-pill flag-pill">
        <span class="flag">${selectedCountry.flag}</span>
        <div>
          <strong>${selectedCountry.name}</strong>
          <span>Level ${selectedCountry.difficulty} · ${soloMatch?.difficulty ?? "Normal"}</span>
        </div>
      </div>
      <div class="hud-pill">AI Style: <strong>${selectedCountry.aiStyle}</strong></div>
      <div class="hud-pill">Arena: <strong>${selectedArena.arenaName}</strong></div>
      <div class="hud-pill">Twist: <strong>${twistLabel(selectedArena.arenaTwist)}</strong></div>
    `;
  };

  const buildSnapshotFromMatch = (match, now) => ({
    t: now,
    players: match.players.map((player) => ({
      id: player.id,
      team: player.team,
      x: player.x,
      y: player.y,
      vx: player.vx,
      vy: player.vy,
      dirX: player.dirX,
      dirY: player.dirY,
      seq: player.lastSeq,
      shootCharge: player.shootCharge,
      stamina: player.stamina,
    })),
    puck: {
      x: match.puck.x,
      y: match.puck.y,
      vx: match.puck.vx,
      vy: match.puck.vy,
      ownerId: match.puck.ownerId,
    },
    goalies: match.goalies
      ? {
          home: { ...match.goalies.home },
          away: { ...match.goalies.away },
        }
      : null,
    events: match.events ? { ...match.events } : null,
    physics: match.physics ? { ...match.physics } : null,
    shotEvent: match.shotEvent ? { ...match.shotEvent } : null,
    scores: match.scores,
    phase: match.phase === "goal" ? "playing" : match.phase,
  });

  const startSoloMatch = () => {
    if (!soloMatch || !selectedCountry || !selectedArena) return;
    const arenaTheme = selectedArena.arenaTheme?.table;
    rinkTheme = arenaTheme
      ? {
          fill: arenaTheme.fill,
          line: arenaTheme.line,
          accent: arenaTheme.accent,
        }
      : null;
    const backgroundSrc = selectedArena.arenaBackground || `Arenas/${selectedArena.name}.png`;
    backgroundImage = getArenaImage(backgroundSrc);
    soloMatch.botProfile = buildBotProfile(selectedCountry);
    soloMatch.physics = {
      wallDamp:
        selectedArena.arenaTwist === "HighBounceWalls"
          ? 1.05
          : selectedArena.arenaTwist === "HighFriction"
            ? 0.82
            : 0.9,
      wallJitter: selectedArena.arenaTwist === "MicroWallDeflections" ? 0.08 : 0,
      goalScale: selectedArena.arenaTwist === "SmallerGoals" ? 0.85 : 1,
    };
    const difficultyProfile = buildDifficultyProfile(selectedCountry);
    soloMatch.passAssist = difficultyProfile.passAssist;
    soloMatch.aiMistakeRate = difficultyProfile.aiMistakeRate;
    soloMatch.aiAggression = difficultyProfile.aiAggression;
    soloMatch.aiCheckRangeMult = difficultyProfile.aiCheckRangeMult;
    soloMatch.goalieProfile = {
      reaction: difficultyProfile.goalie.reaction,
      speed: difficultyProfile.goalie.speed,
      radius: difficultyProfile.goalie.radius,
    };
    soloMatch.difficulty = difficultyProfile.tier;
    performanceTracker = { shotsFor: 0, shotsAgainst: 0 };
    const rules = MODE_RULES[mode] || MODE_RULES.solo;
    soloMatch.rules = {
      scoreToWin: rules.scoreToWin,
      mercyRule: rules.mercyRule,
    };
    soloMatch.scores.home = 0;
    soloMatch.scores.away = 0;
    lastScores = { home: 0, away: 0 };
    scoreInitialized = false;
    adaptTimer = 0;
    soloMatch.phase = "playing";
    soloMatch.goalTimer = 0;
    soloMatch.accumulator = 0;
    resetPositions(soloMatch);
    controlledIndex = 0;
    playerId = isWatch ? null : homeSlots[controlledIndex] ?? 0;
    soloMatch.players.forEach((player) => {
      player.isBot = isWatch ? true : player.id !== playerId;
      player.moveX = 0;
      player.moveY = 0;
      player.allowSprint = isWatch ? true : !player.isBot;
    });
    if (isFranchise) {
      applyRosterModifiers(soloMatch, { homeSkaters: config?.homeSkaters, awaySkaters: config?.awaySkaters }, config);
      soloMatch.players.forEach((player) => {
        player.isBot = player.id !== playerId;
        player.allowSprint = !player.isBot;
      });
    }
    if (isWatch) {
      watchPeriod = 1;
      watchClock = WATCH_PERIOD_SECONDS;
    }
    soloActive = true;
    snapshots = [];
    pendingInputs.length = 0;
    if (overlay) overlay.style.display = "none";
    const now = performance.now();
    lastSoloSnapshotAt = now;
    pushSnapshot(buildSnapshotFromMatch(soloMatch, now));
    updateMeta();
    setView("playing");
  };

  const pushSnapshot = (state) => {
    const now = performance.now();
    if (!timeOffset) timeOffset = state.t - now;
    timeOffset = timeOffset * 0.95 + (state.t - now) * 0.05;
    if (playerId !== null) {
      const local = state.players.find((player) => player.id === playerId);
      if (local?.seq !== undefined) {
        lastAckSeq = local.seq;
        if (!canSendInputs) {
          lastSeq = lastAckSeq;
          canSendInputs = true;
        }
      }
    }
    snapshots.push(state);
    if (snapshots.length > 60) snapshots.shift();
  };

  const formatClock = (seconds) => {
    const total = Math.max(0, Math.ceil(seconds));
    const mins = Math.floor(total / 60);
    const secs = total % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const renderFrame = () => {
    if (!snapshots.length) return;
    const renderTime = performance.now() + timeOffset - interpDelay;
    let from = snapshots[0];
    let to = snapshots[snapshots.length - 1];
    for (let i = 0; i < snapshots.length - 1; i += 1) {
      if (snapshots[i].t <= renderTime && snapshots[i + 1].t >= renderTime) {
        from = snapshots[i];
        to = snapshots[i + 1];
        break;
      }
    }
    const span = to.t - from.t || 1;
    const t = clamp((renderTime - from.t) / span, 0, 1);
    const frame = interpolateSnapshot(from, to, t);
    if (frame.shotEvent?.quality !== undefined) {
      lastShotPower = clamp(frame.shotEvent.quality, 0.2, 1);
    }
    const puckSpeed = Math.hypot(frame.puck.vx || 0, frame.puck.vy || 0);
    audio.updatePuckHum(puckSpeed);
    if (frame.events?.hit) {
      audio.playImpact(clamp(frame.events.hit / 0.2, 0.2, 1));
    }
    if (frame.events?.save) {
      audio.playSave(clamp(frame.events.save / 0.25, 0.3, 1));
    }
    if (!scoreInitialized) {
      lastScores = { ...frame.scores };
      scoreInitialized = true;
    } else if (frame.scores.home !== lastScores.home || frame.scores.away !== lastScores.away) {
      audio.playGoalHorn(lastShotPower);
      lastScores = { ...frame.scores };
    }
    const goalScale = frame.physics?.goalScale ?? 1;
    drawRink(ctx, rinkTheme || undefined, backgroundImage, goalScale);
    if (playerId !== null) {
      const localIndex = frame.players.findIndex((player) => player.id === playerId);
      if (localIndex !== -1) {
        const base = frame.players[localIndex];
        const predicted = { ...base };
        const remaining = pendingInputs.filter((input) => input.seq > lastAckSeq);
        pendingInputs.length = 0;
        pendingInputs.push(...remaining);
        remaining.forEach((input) => {
          applyInputToPlayer(predicted, input, input.dt);
        });
        const dx = predicted.x - base.x;
        const dy = predicted.y - base.y;
        const dist = Math.hypot(dx, dy);
        if (dist > 24) {
          pendingInputs.length = 0;
          predicted.x = base.x;
          predicted.y = base.y;
          predicted.vx = base.vx;
          predicted.vy = base.vy;
        } else if (dist > 6) {
          predicted.x = base.x + dx * 0.6;
          predicted.y = base.y + dy * 0.6;
        }
        frame.players[localIndex] = predicted;
      }
    }
    const saveFlash = frame.events?.save ? clamp(frame.events.save / 0.25, 0, 1) : 0;
    const hitFlash = frame.events?.hit ? clamp(frame.events.hit / 0.2, 0, 1) : 0;
    const animTime = renderTime / 1000;
    ctx.save();
    if (hitFlash > 0.1) {
      const shake = hitFlash * 1.6;
      ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);
    }
    drawGoalies(ctx, frame.goalies, saveFlash, rinkTheme || undefined, animTime);
    const controlled = frame.players.find((player) => player.id === playerId);
    const power = clamp((controlled?.shootCharge || 0) / 1, 0, 1);
    drawPlayers(ctx, frame.players, playerId, frame.puck.ownerId, power, rinkTheme || undefined, animTime);
    drawPuck(ctx, frame.puck);
    ctx.restore();
    setScores(frame.scores);
    if (hudStatus) {
      if (isWatch) {
        const clock = formatClock(watchClock);
        const periodLabel = frame.phase === "finished" ? "Final" : `Timed · P${watchPeriod} ${clock}`;
        hudStatus.textContent = periodLabel;
      } else {
        hudStatus.textContent = frame.phase === "finished" ? "Final" : "First to 5";
      }
    }
    if (frame.phase === "finished" && overlay && result) {
      overlay.style.display = "flex";
      result.textContent = frame.scores.home > frame.scores.away ? "Team A Wins" : "Team B Wins";
      if (!hasCompleted) {
        hasCompleted = true;
        onComplete?.(frame.scores);
      }
    } else if (overlay) {
      overlay.style.display = "none";
    }
  };

  let lastFrameTime = performance.now();
  let lastSentInput = { x: 0, y: 0 };
  let lastSentHeld = 0;
  let lastSoloSnapshotAt = performance.now();
  const SOLO_SNAPSHOT_INTERVAL = 1000 / 30;

  const updateSoloMatch = (dt) => {
    if (!soloMatch || !soloActive) return;
    const now = performance.now();
    if (isWatch) {
      updateBots(soloMatch, (player) => player.isBot);
      if (soloMatch.phase === "playing") {
        applyActions(soloMatch, dt);
        watchClock = Math.max(0, watchClock - dt);
        if (watchClock <= 0) {
          if (watchPeriod < WATCH_PERIODS) {
            watchPeriod += 1;
            watchClock = WATCH_PERIOD_SECONDS;
            resetPositions(soloMatch);
            soloMatch.phase = "playing";
            soloMatch.goalTimer = 0;
          } else {
            soloMatch.phase = "finished";
          }
        }
      }
      advanceMatch(soloMatch, dt);
      if (now - lastSoloSnapshotAt >= SOLO_SNAPSHOT_INTERVAL) {
        pushSnapshot(buildSnapshotFromMatch(soloMatch, now));
        lastSoloSnapshotAt = now;
      }
      inputManager.clearActions();
      return;
    }
    const { moveX, moveY, pressed, held } = inputManager.getState();
    if (pressed.switch && homeSlots.length) {
      const nowMs = performance.now();
      if (!soloMatch.switchLockUntil || nowMs >= soloMatch.switchLockUntil) {
        const puck = soloMatch.puck;
        const targetX = puck.ownerId !== null ? soloMatch.players[puck.ownerId]?.x ?? puck.x : puck.x + puck.vx * 0.35;
        const targetY = puck.ownerId !== null ? soloMatch.players[puck.ownerId]?.y ?? puck.y : puck.y + puck.vy * 0.35;
        let bestId = playerId;
        let bestScore = Infinity;
        homeSlots.forEach((id) => {
          const player = soloMatch.players[id];
          if (!player) return;
          const dx = player.x - targetX;
          const dy = player.y - targetY;
          const dist = Math.hypot(dx, dy);
          const facing = player.dirX * (targetX - player.x) + player.dirY * (targetY - player.y);
          const score = dist - facing * 0.02;
          if (score < bestScore) {
            bestScore = score;
            bestId = id;
          }
        });
        playerId = bestId;
        controlledIndex = Math.max(0, homeSlots.indexOf(bestId));
        soloMatch.players.forEach((player) => {
          player.isBot = player.id !== playerId;
        });
        soloMatch.switchLockUntil = nowMs + 400;
      }
    }
    const clampedMove = {
      x: clamp(moveX, -1, 1),
      y: clamp(moveY, -1, 1),
    };
    const controlled = soloMatch.players[playerId];
    if (controlled) {
      controlled.moveX = clampedMove.x;
      controlled.moveY = clampedMove.y;
      controlled.shootHeld = held.shoot;
      controlled.actions.shoot = pressed.shoot;
      controlled.actions.pass = pressed.pass;
      controlled.actions.check = pressed.check;
      controlled.allowAutoFace = soloMatch.difficulty === "Easy";
    }
    updateBots(soloMatch, (player) => player.isBot);
    if (soloMatch.phase === "playing") {
      applyActions(soloMatch, dt);
    }
    if (soloMatch.shotEvent && soloMatch.shotEvent.timer > 0) {
      if (soloMatch.shotEvent.team === "home") {
        performanceTracker.shotsFor += 1;
      } else {
        performanceTracker.shotsAgainst += 1;
      }
      soloMatch.shotEvent = null;
    }
    const totalShots = performanceTracker.shotsFor + performanceTracker.shotsAgainst;
    if (totalShots >= 6 && soloMatch.aiAggression) {
      const edge = (performanceTracker.shotsFor - performanceTracker.shotsAgainst) / totalShots;
      soloMatch.aiAggression = clamp(soloMatch.aiAggression + edge * 0.08, 0.85, 1.2);
      performanceTracker = { shotsFor: 0, shotsAgainst: 0 };
    }
    adaptTimer += dt;
    if (adaptTimer >= 4) {
      adaptTimer = 0;
      const scoreDiff = soloMatch.scores.home - soloMatch.scores.away;
      const tilt = clamp(scoreDiff / 6, -0.25, 0.25);
      soloMatch.aiMistakeRate = clamp(soloMatch.aiMistakeRate - tilt * 0.12, 0.02, 0.2);
      soloMatch.aiCheckRangeMult = clamp(1 + tilt * 0.15, 0.85, 1.1);
      soloMatch.goalieProfile = {
        ...soloMatch.goalieProfile,
        reaction: clamp(soloMatch.goalieProfile.reaction + tilt * 0.03, 0.12, 0.28),
        speed: clamp(soloMatch.goalieProfile.speed + tilt * 30, 320, 520),
      };
    }
    advanceMatch(soloMatch, dt);
    if (now - lastSoloSnapshotAt >= SOLO_SNAPSHOT_INTERVAL) {
      pushSnapshot(buildSnapshotFromMatch(soloMatch, now));
      lastSoloSnapshotAt = now;
    }
    inputManager.clearActions();
  };

  const loop = (time) => {
    const dt = Math.min(0.05, (time - lastFrameTime) / 1000);
    lastFrameTime = time;
    if (isOnline) {
      if (isConnected && canSendInputs) {
        const now = performance.now();
        if (socket?.readyState === WebSocket.OPEN) {
          if (now - lastPingAt >= PING_INTERVAL_MS) {
            lastPingAt = now;
            socket.send(JSON.stringify({ type: "ping", time: now }));
          }

          const { moveX, moveY, pressed, held } = inputManager.getState();
          const buttons = encodeButtons(pressed);
          const heldButtons = encodeButtons(held);
          const clampedMove = {
            x: clamp(moveX, -1, 1),
            y: clamp(moveY, -1, 1),
          };
          const moved =
            Math.abs(clampedMove.x - lastSentInput.x) > 0.01 ||
            Math.abs(clampedMove.y - lastSentInput.y) > 0.01;
          const active = Math.hypot(clampedMove.x, clampedMove.y) > 0.01 || buttons > 0 || heldButtons > 0;
          const heldChanged = heldButtons !== lastSentHeld;
          const interval = (active ? INPUT_ACTIVE_RATE : INPUT_IDLE_RATE) * 1000;
          const shouldSend = buttons > 0 || heldChanged || moved || now - lastSendAt >= interval;

          if (shouldSend) {
            lastSeq += 1;
            const inputDt = Math.min(0.05, (now - (lastInputAt || now)) / 1000 || INPUT_ACTIVE_RATE);
            lastInputAt = now;
            socket.send(
              JSON.stringify({
                type: "input",
                seq: lastSeq,
                time: now,
                input: {
                  x: clampedMove.x,
                  y: clampedMove.y,
                  buttons,
                  held: heldButtons,
                },
              })
            );
        pendingInputs.push({ seq: lastSeq, x: clampedMove.x, y: clampedMove.y, dt: inputDt });
            lastSentInput = { x: clampedMove.x, y: clampedMove.y };
            lastSentHeld = heldButtons;
            lastSendAt = now;
            inputManager.clearActions();
          }
        }
      }
    } else {
      updateSoloMatch(dt);
    }
    renderFrame();
    requestAnimationFrame(loop);
  };

  const connectSocket = (url, payload) => {
    if (socket) socket.close();
    connectionStatus.textContent = "Connecting...";
    socket = new WebSocket(url);
    socket.addEventListener("open", () => {
      socket.send(JSON.stringify(payload));
    });
    socket.addEventListener("message", (event) => {
      let message;
      try {
        message = JSON.parse(event.data);
      } catch (error) {
        return;
      }
      if (message.type === "error") {
        connectionStatus.textContent = message.message || "Connection error.";
        return;
      }
      if (message.type === "room_created" || message.type === "room_joined") {
        roomCode = message.code;
        playerId = message.playerId;
        token = message.token;
        isHost = message.host === true;
        isConnected = true;
        snapshots = [];
        pendingInputs.length = 0;
        lastSeq = 0;
        lastAckSeq = 0;
        lastSentHeld = 0;
        canSendInputs = false;
        lastScores = { home: 0, away: 0 };
        scoreInitialized = false;
        if (overlay) overlay.style.display = "none";
        if (roomCodeEl) roomCodeEl.textContent = roomCode;
        if (connectionStatus) connectionStatus.textContent = `Joined room ${roomCode}.`;
        if (network) network.textContent = "Ping --";
        if (roomCode) {
          localStorage.setItem(`hockey94_token_${roomCode}`, token);
        }
        setView("lobby");
      }
      if (message.type === "lobby") {
        updateLobby(message.players, message.started);
        if (message.started) {
          setView("playing");
        }
      }
      if (message.type === "state") {
        pushSnapshot(message.state);
        if (message.state.phase === "playing") {
          setView("playing");
        }
      }
      if (message.type === "pong") {
        const now = performance.now();
        const sample = Math.max(0, now - Number(message.time || now));
        if (!rtt) rtt = sample;
        rtt = rtt * 0.8 + sample * 0.2;
        const delta = Math.abs(sample - rtt);
        jitter = jitter * 0.8 + delta * 0.2;
        interpDelay = clamp(Math.max(80, rtt * 2), 80, 200);
        if (network) {
          network.textContent = `Ping ${Math.round(rtt)}ms • Jitter ${Math.round(jitter)}ms`;
        }
      }
    });
    socket.addEventListener("close", () => {
      isConnected = false;
      canSendInputs = false;
      isHost = false;
      setView("connection");
      connectionStatus.textContent = "Disconnected from server.";
      if (network) network.textContent = "Ping --";
    });
  };

  if (isOnline) {
    screen.querySelector("#hockey94-host")?.addEventListener("click", () => {
      const url = serverInput?.value || getDefaultServerUrl();
      connectSocket(url, { type: "create_room", allowBots: true });
    });

    screen.querySelector("#hockey94-join")?.addEventListener("click", () => {
      const url = serverInput?.value || getDefaultServerUrl();
      const rawCode = codeInput?.value?.trim() || "";
      if (rawCode.length !== 5) {
        if (connectionStatus) connectionStatus.textContent = "Enter a 5-digit room code.";
        return;
      }
      const code = formatCode(rawCode);
      const savedToken = code ? localStorage.getItem(`hockey94_token_${code}`) : null;
      connectSocket(url, { type: "join_room", code, token: savedToken });
    });

    lobbyStart?.addEventListener("click", () => {
      if (!isHost || socket?.readyState !== WebSocket.OPEN) return;
      socket.send(JSON.stringify({ type: "start_match" }));
    });
  } else {
    soloStart?.addEventListener("click", startSoloMatch);
  }

  screen.querySelector("#hockey94-back")?.addEventListener("click", () => onBack?.());
  screen.querySelector("#hockey94-exit")?.addEventListener("click", () => onBack?.());

  if (isOnline) {
    setView("connection");
  } else if (isFranchise) {
    setView("playing");
    startSoloMatch();
  } else {
    setView("setup");
  }
  requestAnimationFrame(loop);

  const cleanup = () => {
    inputManager.detach();
    audio.stop();
    if (socket) socket.close();
  };

  return { element: screen, cleanup };
};

export const renderHockey94OnlineScreen = ({ onBack }) => renderHockey94Screen({ onBack, mode: "online" });

export const renderHockey94SoloScreen = ({ onBack }) => renderHockey94Screen({ onBack, mode: "solo" });

export const renderHockey94WatchScreen = ({ onBack }) => renderHockey94Screen({ onBack, mode: "watch" });

export const renderHockey94FranchiseScreen = ({ onBack, config, onComplete }) =>
  renderHockey94Screen({ onBack, mode: "franchise", config, onComplete });
