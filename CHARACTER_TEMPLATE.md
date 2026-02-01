# Character JSON Template

Use this template when adding new characters to `src/characters`.

```json
{
  "id": "newfighter",
  "displayName": "NewFighter",
  "spriteSheet": "newfighter",
  "width": 48,
  "height": 48,
  "pivot": { "x": 24, "y": 40 },
  "stats": {
    "speed": 200,
    "jumpForce": 420,
    "weight": 90,
    "gravity": 1200
  },
  "moves": {
    "neutral": {
      "frames": [0, 1, 2, 3],
      "active": { "start": 2, "end": 3 },
      "damage": 6,
      "baseKnockback": 120,
      "kbScaling": 0.9,
      "angle": 10,
      "stun": 8
    },
    "up": {
      "frames": [4, 5, 6],
      "active": { "start": 1, "end": 2 },
      "damage": 7,
      "baseKnockback": 140,
      "kbScaling": 1.0,
      "angle": 80,
      "stun": 10
    },
    "down": {
      "frames": [2, 3, 4],
      "active": { "start": 1, "end": 2 },
      "damage": 5,
      "baseKnockback": 110,
      "kbScaling": 0.85,
      "angle": -30,
      "stun": 7
    },
    "special": {
      "frames": [6, 7],
      "active": { "start": 1, "end": 1 },
      "damage": 9,
      "baseKnockback": 180,
      "kbScaling": 1.2,
      "angle": 25,
      "stun": 12
    }
  }
}
```

## Notes
- `spriteSheet` must match the Phaser texture key loaded in `PreloadScene`.
- `frames` refer to indices on the 48×48 sprite sheet grid.
- Adjust `angle` in degrees (0 = right, 90 = up, -90 = down).
