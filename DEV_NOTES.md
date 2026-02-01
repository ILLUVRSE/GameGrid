# PixelBrawl v0.1 Tuning Notes

## Movement Tuning
- Movement constants live in `src/game/physics.ts` under `MATCH_CONSTANTS`:
  - `groundAccel`, `airAccel`, `groundDecel`, `airDecel`
  - `coyoteFrames`, `jumpBufferFrames`
  - `fastFallSpeed`, `dashSpeed`, `landingDustMinSpeed`
- Per-character movement stats live in each character JSON file (`src/characters/*.json`) under `stats`:
  - `speed`, `jumpForce`, `gravity`, `weight`

## Knockback Tuning
- Knockback settings live in `src/game/knockback.ts` in `KNOCKBACK_CONFIG`.
- The scaling formula is in `calculateKnockbackMagnitude` in the same file.

## Hitstop, Camera, and FX
- Hitstop scaling is controlled by `hitstopFrames`, `hitstopPerDamage`, and `hitstopMax` in `src/game/physics.ts`.
- Screen shake and zoom settings are in `src/game/knockback.ts` (`shakeDuration`, `shakeIntensity`, `heavyHitSpeed`, `cameraZoomAmount`).
- Hit flash, hit burst, dash trail, and landing dust effects are in `src/game/fx.ts`.
