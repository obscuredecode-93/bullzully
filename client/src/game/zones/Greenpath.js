/**
 * @fileoverview Zone 0 configuration — Greenpath of BULLZ.
 *
 * The opening zone. Forest theme with a green/brown colour palette.
 * Enemy mix is heavy on Pookie Sigma (basic melee) to ease the player in,
 * with occasional ZullbullyKnight (armoured, guard mechanic) for variety.
 *
 * All zone configs are plain data objects — no logic lives here.
 * ProceduralGen consumes this config to generate a randomised set of rooms.
 *
 * @module zones/Greenpath
 */

/**
 * @typedef {Object} PlatformDef
 * @property {number} x - Left edge in world-space pixels.
 * @property {number} y - Top edge in world-space pixels.
 * @property {number} w - Width in pixels.
 * @property {number} h - Height in pixels (32 = ground, 16 = floating platform).
 */

/**
 * @typedef {Object} SpawnPoint
 * @property {number} x - World-space X of the spawn hint.
 * @property {number} y - World-space Y (usually ground level minus a few pixels).
 */

/**
 * @typedef {Object} RoomTemplate
 * @property {string}        id          - Unique identifier for debugging.
 * @property {PlatformDef[]} platforms   - Static collision geometry.
 * @property {SpawnPoint[]}  enemyZones  - Candidate positions for enemy spawns.
 * @property {SpawnPoint[]}  pickupZones - Candidate positions for item drops.
 * @property {boolean}       [isBossRoom] - If true, ProceduralGen routes this to the boss slot.
 * @property {{x,y}}         [bossSpawn]  - Where the boss sprite is created.
 */

/** @type {Object} Zone configuration consumed by ProceduralGen. */
export const Greenpath = {
  /** Zone index used by GameScene to look up the zone from the ZONES array. */
  index: 0,

  /** Display name shown in the HUD zone label. */
  name: 'GREENPATH OF BULLZ',

  // Colour palette — used by SpriteGenerator to tint background/platform tiles.
  bgColor:          0x0d2b0d, // Very dark forest green for the far background.
  skyColor:         0x1a4a1a, // Mid-green for the sky layer.
  platformColor:    0x5c3d1a, // Brown earth colour for the underside of platforms.
  platformTopColor: 0x2d8a2d, // Bright green for the grass top edge.

  /**
   * Keys must match texture names created in SpriteGenerator.backgrounds()
   * and SpriteGenerator.platforms(). Missing keys fall back to 'plat_greenpath'.
   */
  bgTileKey:   'bg_greenpath',
  platformKey: 'plat_greenpath',

  /**
   * Total rooms the zone generates. ProceduralGen picks templates randomly
   * until it has this many, cycling through the template list if needed.
   */
  roomCount: 6,

  hasMidBoss:   false, // No mid-boss in Greenpath — that's zone 2.
  hasFinalBoss: false,

  /**
   * Weighted enemy type pool. PookieSigma appears 3× more often than ZullbullyKnight,
   * keeping the opening zone accessible while still having variety.
   * ProceduralGen picks types randomly from this array for each spawn point.
   */
  enemyTypes: ['PookieSigma', 'PookieSigma', 'PookieSigma', 'ZullbullyKnight'],

  /** Min/max enemies per room; ProceduralGen picks a random value in this range. */
  enemiesPerRoom: { min: 3, max: 5 },

  /**
   * Hand-crafted room templates. ProceduralGen shuffles these and selects
   * `roomCount` rooms from the pool (repeating if needed).
   *
   * Platform coordinates use the world-space origin (0,0 = top-left of room).
   * Ground is always at y=448 with h=32, giving a floor at y=480 (bottom edge).
   * Floating platforms use h=16 for a thinner look.
   */
  roomTemplates: [
    {
      id: 'gp_1', // Gentle staircase — good for learning the jump arc.
      platforms: [
        { x: 0,    y: 448, w: 1920, h: 32 }, // Full-width ground.
        { x: 280,  y: 360, w: 128,  h: 16 },
        { x: 560,  y: 300, w: 160,  h: 16 },
        { x: 860,  y: 340, w: 120,  h: 16 },
        { x: 1100, y: 280, w: 200,  h: 16 },
        { x: 1450, y: 320, w: 140,  h: 16 },
        { x: 1700, y: 360, w: 120,  h: 16 },
      ],
      // y=410 places enemies just above the ground (448 - 32 height / 2 ≈ 416, nudged up).
      enemyZones: [
        { x: 300,  y: 410 }, { x: 700,  y: 410 }, { x: 1000, y: 410 },
        { x: 1300, y: 410 }, { x: 1600, y: 410 },
      ],
      // Pickups placed on top of mid-height platforms to reward platforming.
      pickupZones: [{ x: 580, y: 270 }, { x: 1120, y: 250 }],
    },
    {
      id: 'gp_2', // Ascending platforms, good rhythm.
      platforms: [
        { x: 0,    y: 448, w: 1920, h: 32 },
        { x: 200,  y: 340, w: 96,   h: 16 },
        { x: 420,  y: 280, w: 128,  h: 16 },
        { x: 680,  y: 220, w: 96,   h: 16 },
        { x: 900,  y: 300, w: 160,  h: 16 },
        { x: 1150, y: 360, w: 80,   h: 16 },
        { x: 1350, y: 280, w: 200,  h: 16 },
        { x: 1650, y: 340, w: 160,  h: 16 },
      ],
      enemyZones: [
        { x: 250,  y: 410 }, { x: 600,  y: 410 }, { x: 950,  y: 410 },
        { x: 1200, y: 410 }, { x: 1700, y: 410 },
      ],
      pickupZones: [{ x: 700, y: 190 }, { x: 1370, y: 250 }],
    },
    {
      id: 'gp_3', // Wide platforms, easier navigation.
      platforms: [
        { x: 0,    y: 448, w: 1920, h: 32 },
        { x: 160,  y: 380, w: 200,  h: 16 },
        { x: 500,  y: 320, w: 256,  h: 16 },
        { x: 850,  y: 260, w: 128,  h: 16 },
        { x: 1080, y: 320, w: 160,  h: 16 },
        { x: 1360, y: 380, w: 96,   h: 16 },
        { x: 1580, y: 300, w: 224,  h: 16 },
      ],
      enemyZones: [
        { x: 200,  y: 410 }, { x: 650,  y: 410 }, { x: 1100, y: 410 },
        { x: 1450, y: 410 }, { x: 1750, y: 410 },
      ],
      pickupZones: [{ x: 870, y: 230 }, { x: 1600, y: 270 }],
    },
    {
      id: 'gp_4', // Three ground segments with gaps — introduces pit hazards.
      platforms: [
        { x: 0,    y: 448, w: 640,  h: 32 }, // Left ground segment.
        { x: 700,  y: 448, w: 560,  h: 32 }, // Centre segment (gap left of it).
        { x: 1350, y: 448, w: 570,  h: 32 }, // Right segment (gap left of it).
        // Floating bridges over the gaps.
        { x: 320,  y: 350, w: 160,  h: 16 },
        { x: 600,  y: 280, w: 128,  h: 16 },
        { x: 900,  y: 330, w: 160,  h: 16 },
        { x: 1200, y: 270, w: 128,  h: 16 },
        { x: 1500, y: 340, w: 160,  h: 16 },
        { x: 1750, y: 390, w: 80,   h: 16 },
      ],
      enemyZones: [
        { x: 200,  y: 410 }, { x: 500,  y: 310 }, { x: 900,  y: 410 },
        { x: 1220, y: 240 }, { x: 1650, y: 410 },
      ],
      pickupZones: [{ x: 620, y: 250 }, { x: 1220, y: 240 }],
    },
  ],
};
