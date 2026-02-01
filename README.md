# PixelBrawl v0.1

**Developer note:** Tune knockback and feel inside `src/game/physics.ts` (`KNOCKBACK_CONSTANTS`, `MATCH_CONSTANTS`) and the per-move values inside `src/characters/*.json`. Replace placeholder sprites by swapping the textures generated in `PreloadScene` with real sprite sheets that match the 48×48 frame size and animation naming conventions. 【See `src/scenes/Preload.ts` for how textures are generated.】

PixelBrawl v0.1 is a local multiplayer (2–4 players) browser-based platform fighter prototype built with Phaser 3 + TypeScript + Vite.

## Features
- Local multiplayer on one keyboard (2–4 players).
- Jump + double jump, air control, and fast fall.
- Neutral / Up / Down / Special attacks with active frames, hitboxes, and hitstop.
- Damage percent + knockback physics + KO detection.
- Character select, match HUD, results screen.
- Debug overlay (hitboxes/hurtboxes + FPS).

## Setup
```bash
npm install
npm run dev
```

Open: http://localhost:5173

## Controls
- **P1:** A/D move, W jump, J attack, K special, Shift dash
- **P2:** ←/→ move, ↑ jump, Num1 attack, Num2 special, Num0 dash
- **P3:** F/H move, T jump, Y attack, U special, R dash
- **P4:** J/L move, I jump, O attack, P special, ; dash

## Gameplay Notes
- Press **D** on the Menu to toggle debug visuals (hitboxes/hurtboxes, FPS).
- Character Select: move to choose, Attack to lock, Special (P1) to start with 2+ players ready.

## Animation Conventions
Each character uses the animation keys:
`idle`, `run`, `jump`, `fall`, `neutral`, `up`, `down`, `special`, `hit`, `ko`.

## Assets
Placeholder sprites are generated programmatically, with SVG references in `src/assets/sprites/`. Replace them with sprite sheets named to match each character's `spriteSheet` key and a 48×48 frame grid.

## Future Features
- Online multiplayer hooks (see `src/game/hooks.ts`).
- Matchmaking and netcode.
- Full animation replacement.
- Additional characters and stages.

## Runbook
```bash
npm install
npm run dev -- --host 0.0.0.0 --port 5173
```
