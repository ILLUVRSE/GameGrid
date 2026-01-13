export const ARENAS = [
  {
    id: "home",
    name: "Home Zone",
    twist: "Baseline",
    table: {
      fill: "#0c111e",
      line: "rgba(255,255,255,0.25)",
      accent: "rgba(67,217,173,0.45)",
    },
  },
  {
    id: "ridge",
    name: "Sky Ridge",
    twist: "Low Friction",
    table: {
      fill: "#0b182a",
      line: "rgba(200,230,255,0.3)",
      accent: "rgba(120,180,255,0.4)",
    },
    physics: { friction: 0.992, maxPuck: 1080 },
  },
  {
    id: "frost",
    name: "Frost Warden",
    twist: "Speed Ramps",
    table: {
      fill: "#0b1521",
      line: "rgba(170,220,255,0.35)",
      accent: "rgba(120,200,255,0.45)",
    },
    physics: { speedRamp: 0.015 },
  },
  {
    id: "flare",
    name: "Ember Gate",
    twist: "Burst Surges",
    table: {
      fill: "#1c0c0b",
      line: "rgba(255,180,120,0.35)",
      accent: "rgba(255,120,80,0.5)",
    },
    physics: { burstInterval: 10, burstDuration: 1.5, burstBoost: 1.3 },
  },
  {
    id: "quarry",
    name: "Iron Quarry",
    twist: "Dampened Bounce",
    table: {
      fill: "#101418",
      line: "rgba(210,210,210,0.3)",
      accent: "rgba(160,160,160,0.45)",
    },
    physics: { wallDamp: 0.84 },
  },
  {
    id: "dune",
    name: "Dune Split",
    twist: "Lateral Drift",
    table: {
      fill: "#1a140c",
      line: "rgba(255,210,150,0.32)",
      accent: "rgba(240,180,100,0.4)",
    },
    physics: { driftY: 18 },
  },
  {
    id: "delta",
    name: "Delta Basin",
    twist: "Micro Deflect",
    table: {
      fill: "#0b1a1c",
      line: "rgba(140,240,220,0.3)",
      accent: "rgba(120,220,210,0.4)",
    },
    physics: { wallJitter: 0.06 },
  },
  {
    id: "vault",
    name: "Vault Spire",
    twist: "Smaller Goals",
    table: {
      fill: "#0b0f18",
      line: "rgba(160,200,255,0.3)",
      accent: "rgba(120,180,255,0.45)",
    },
    physics: { goalScale: 0.82 },
  },
  {
    id: "bloom",
    name: "Bloom Core",
    twist: "Speed Regain",
    table: {
      fill: "#0b0d18",
      line: "rgba(190,120,255,0.3)",
      accent: "rgba(140,255,200,0.45)",
    },
    physics: { regenSpeed: 0.22, regenThreshold: 320 },
  },
  {
    id: "nexus",
    name: "Nexus Crown",
    twist: "Sharper Reactions",
    table: {
      fill: "#0a0a0e",
      line: "rgba(240,210,120,0.35)",
      accent: "rgba(240,190,90,0.5)",
    },
    ai: { reactionMult: 0.65 },
  },
];

export const arenaByZoneId = new Map(ARENAS.map((arena) => [arena.id, arena]));

export const getArena = (zoneId: string) => arenaByZoneId.get(zoneId) ?? ARENAS[0];
