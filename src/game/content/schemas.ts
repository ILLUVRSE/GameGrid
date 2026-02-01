import { z } from 'zod';

const MoveHitboxSchema = z.object({
  x: z.number(),
  y: z.number(),
  width: z.number().positive(),
  height: z.number().positive(),
  damage: z.number().nonnegative(),
  baseKnockback: z.number().nonnegative(),
  kbScaling: z.number().nonnegative(),
  angle: z.number(),
  stun: z.number().nonnegative()
});

const MoveActiveWindowSchema = z.object({
  startFrame: z.number().int().nonnegative(),
  endFrame: z.number().int().nonnegative(),
  hitboxes: z.array(MoveHitboxSchema).min(1)
});

const MoveCancelSchema = z
  .object({
    allowJumpCancel: z.boolean().optional(),
    allowDashCancel: z.boolean().optional(),
    allowSpecialCancel: z.boolean().optional()
  })
  .optional();

const MoveOnHitSchema = z.object({
  hitstopFrames: z.number().int().nonnegative(),
  shakeIntensity: z.number().nonnegative(),
  particleKey: z.string()
});

const MoveDataSchema = z.object({
  startupFrames: z.number().int().nonnegative(),
  activeFrames: z.array(MoveActiveWindowSchema).min(1),
  endLagFrames: z.number().int().nonnegative(),
  cancel: MoveCancelSchema,
  onHit: MoveOnHitSchema
});

const AnimationSchema = z.object({
  startFrame: z.number().int().nonnegative(),
  endFrame: z.number().int().nonnegative(),
  frameRate: z.number().int().positive(),
  loop: z.boolean()
});

export const CharacterSchema = z.object({
  id: z.string().min(1),
  displayName: z.string().min(1),
  franchise: z.string().min(1),
  palette: z.object({
    primary: z.string().min(1),
    neon: z.string().min(1)
  }),
  spriteSheet: z.string().min(1),
  frameSize: z.object({
    width: z.number().int().positive(),
    height: z.number().int().positive()
  }),
  pivot: z.object({
    x: z.number(),
    y: z.number()
  }),
  stats: z.object({
    speed: z.number().positive(),
    jump: z.number().positive(),
    weight: z.number().positive(),
    gravity: z.number().positive()
  }),
  hurtbox: z.object({
    width: z.number().positive(),
    height: z.number().positive(),
    offsetX: z.number(),
    offsetY: z.number()
  }),
  animations: z.object({
    idle: AnimationSchema,
    run: AnimationSchema,
    jump: AnimationSchema,
    fall: AnimationSchema,
    neutral: AnimationSchema,
    up: AnimationSchema,
    down: AnimationSchema,
    special: AnimationSchema,
    hit: AnimationSchema,
    ko: AnimationSchema
  }),
  moves: z.object({
    neutral: MoveDataSchema,
    up: MoveDataSchema,
    down: MoveDataSchema,
    special: MoveDataSchema
  }),
  sfx: z.object({
    attack: z.string().min(1),
    special: z.string().min(1),
    ko: z.string().min(1)
  }),
  vfx: z.object({
    hit: z.string().min(1),
    dash: z.string().min(1),
    landing: z.string().min(1)
  }),
  ui: z.object({
    portraitIcon: z.string().min(1)
  })
});

export const StageSchema = z.object({
  id: z.string().min(1),
  displayName: z.string().min(1),
  backgroundLayers: z.array(
    z.object({
      color: z.string().min(1),
      scrollFactor: z.number().optional()
    })
  ),
  blastZones: z.object({
    top: z.number(),
    bottom: z.number(),
    left: z.number(),
    right: z.number()
  }),
  spawnPoints: z.array(
    z.object({
      x: z.number(),
      y: z.number()
    })
  ),
  platforms: z.array(
    z.object({
      type: z.enum(['solid', 'oneWay']),
      x: z.number(),
      y: z.number(),
      w: z.number().positive(),
      h: z.number().positive(),
      color: z.string().optional()
    })
  ),
  hazards: z
    .array(
      z.object({
        id: z.string().min(1),
        enabled: z.boolean()
      })
    )
    .optional()
});

export const AssetManifestSchema = z.object({
  sprites: z.record(
    z.object({
      path: z.string().min(1),
      type: z.string().optional(),
      frameWidth: z.number().int().positive().optional(),
      frameHeight: z.number().int().positive().optional()
    })
  ),
  ui: z.record(
    z.object({
      path: z.string().min(1),
      type: z.string().optional()
    })
  ),
  sfx: z.record(
    z.object({
      path: z.string().min(1)
    })
  ),
  vfx: z.record(
    z.object({
      path: z.string().min(1),
      type: z.string().optional()
    })
  )
});
