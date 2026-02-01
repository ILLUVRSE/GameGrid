# PixelBrawl Content Guide

This guide explains how to add new characters, stages, and assets to PixelBrawl v0.1 using the content pack system.

## Content Pack Folder Layout

```
src/content/
  characters/*.json
  stages/*.json
  assets/manifest.json
  assets/ui/
  assets/sprites/
```

Drop new JSON files into the correct folder and restart the dev server. The game validates content at startup and logs any schema errors.

## Adding a Character

1. Copy `CHARACTER_TEMPLATE.json` and place it in `src/content/characters/`.
2. Update the fields (id, displayName, franchise, palette, stats, hurtbox, animations, moves, sfx/vfx keys, and ui portrait icon).
3. Add your sprite sheet to `src/content/assets/` and update `src/content/assets/manifest.json` with a new entry in `sprites`.
4. Optional: add a portrait icon under `assets/ui/` and register it in `manifest.json` under `ui`.
5. Restart the app. Validation errors will appear in the console if anything is missing.

### Character Asset Keys

* `spriteSheet`: Must match a key in `manifest.json` under `sprites`.
* `ui.portraitIcon`: Must match a key in `manifest.json` under `ui`.
* `sfx` / `vfx` keys: Should map to entries under `sfx` and `vfx`. Missing entries fall back to defaults.

## Adding a Stage

1. Copy `STAGE_TEMPLATE.json` and place it in `src/content/stages/`.
2. Update id, displayName, backgroundLayers, blastZones, spawnPoints, and platforms.
3. Restart the app. Validation errors will appear in the console if anything is missing.

## Validation Errors

Content is validated at startup. When something fails, the console logs detailed errors that point to the exact path.

Example:

```
[ContentValidation] Character JSON failed for .../characters/mystic.json:
moves.neutral.startupFrames: Number must be greater than or equal to 0
ui.portraitIcon: String must contain at least 1 character(s)
```

Fix the fields listed in the error log and restart.

## Quick: Add Your Next Franchise Character

1. Duplicate `CHARACTER_TEMPLATE.json` into `src/content/characters/` and rename it.
2. Update the id, displayName, franchise name, palette colors, and stats.
3. Define the four move timelines (startup, active, end lag) + hitboxes.
4. Add your sprite sheet + portrait icon paths to `src/content/assets/manifest.json`.
5. Restart and confirm the new fighter appears in Character Select.
