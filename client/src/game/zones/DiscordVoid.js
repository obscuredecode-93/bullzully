/**
 * @fileoverview Zone 1 configuration — Discord Void.
 *
 * A dark purple, glitchy dimension. The dominant enemy is the DiscordGhoster,
 * which teleports when hit — rewarding persistent pressure over single big hits.
 * BrainrotSpreader introduces ranged combat, forcing the player to close distance.
 *
 * Platforms are intentionally narrow (80px wide vs Greenpath's 128–256px),
 * making foothold management harder and punishing missed jumps more harshly.
 *
 * @module zones/DiscordVoid
 */

/** @type {Object} Zone configuration consumed by ProceduralGen. */
export const DiscordVoid = {
  index: 1,
  name:  'DISCORD VOID',

  // Near-black purple palette gives a "corrupted cyberspace" feel.
  bgColor:          0x050010, // Almost black with a purple tint.
  skyColor:         0x0d0020, // Slightly lighter purple for the mid sky layer.
  platformColor:    0x1a0040, // Deep indigo underside.
  platformTopColor: 0x6600cc, // Vivid purple top — contrasts against the dark background.

  bgTileKey:   'bg_discordvoid',
  platformKey: 'plat_discordvoid',

  /**
   * 7 rooms — the longest zone. Extra rooms compensate for the trickier
   * enemy mix (DiscordGhosters are elusive) and narrower platforms.
   */
  roomCount: 7,

  hasMidBoss:   false,
  hasFinalBoss: false,

  /**
   * DiscordGhoster appears twice as often as the other types.
   * This makes teleportation the defining mechanic of this zone.
   */
  enemyTypes: ['DiscordGhoster', 'DiscordGhoster', 'PookieSigma', 'BrainrotSpreader'],

  /** Slightly more enemies than Greenpath to compensate for their evasiveness. */
  enemiesPerRoom: { min: 3, max: 6 },

  roomTemplates: [
    {
      id: 'dv_1',
      // Evenly spaced 80px platforms create a zigzag pattern across the room.
      // 80px is just wide enough to land on but unforgiving if you overshoot.
      platforms: [
        { x: 0,    y: 448, w: 1920, h: 32 }, // Ground.
        { x: 200,  y: 350, w: 80,   h: 16 },
        { x: 400,  y: 280, w: 80,   h: 16 },
        { x: 640,  y: 210, w: 80,   h: 16 },
        { x: 880,  y: 280, w: 80,   h: 16 },
        { x: 1120, y: 210, w: 80,   h: 16 },
        { x: 1360, y: 280, w: 80,   h: 16 },
        { x: 1600, y: 350, w: 80,   h: 16 },
      ],
      enemyZones: [
        { x: 350,  y: 410 }, { x: 700, y: 410 }, { x: 1000, y: 410 },
        { x: 1300, y: 410 }, { x: 1600, y: 410 },
        { x: 900,  y: 250 }, // Elevated spawn — enemies can attack from platforms.
      ],
      pickupZones: [{ x: 660, y: 180 }, { x: 1140, y: 180 }],
    },
    {
      id: 'dv_2',
      // Three ground segments with void gaps introduce immediate pit danger.
      platforms: [
        { x: 0,    y: 448, w: 480,  h: 32 }, // Left ground.
        { x: 560,  y: 448, w: 480,  h: 32 }, // Centre ground.
        { x: 1120, y: 448, w: 800,  h: 32 }, // Right ground (wider for boss staging).
        { x: 240,  y: 320, w: 160,  h: 16 },
        { x: 560,  y: 250, w: 128,  h: 16 },
        { x: 860,  y: 300, w: 96,   h: 16 },
        { x: 1100, y: 220, w: 160,  h: 16 },
        { x: 1400, y: 300, w: 128,  h: 16 },
        { x: 1680, y: 370, w: 128,  h: 16 },
      ],
      enemyZones: [
        { x: 200,  y: 410 }, { x: 720,  y: 410 }, { x: 1200, y: 410 },
        { x: 580,  y: 220 }, { x: 1120, y: 190 }, // Elevated spawns.
        { x: 1500, y: 410 },
      ],
      pickupZones: [{ x: 880, y: 270 }, { x: 1410, y: 270 }],
    },
    {
      id: 'dv_3',
      // Maximum platform density — a ladder of 10 tiny stepping stones.
      // Rewards players who can maintain altitude while fighting evasive ghosts.
      platforms: [
        { x: 0,    y: 448, w: 1920, h: 32 },
        { x: 160,  y: 380, w: 64,   h: 16 }, // Very narrow — 64px = 2 tile widths.
        { x: 340,  y: 310, w: 64,   h: 16 },
        { x: 520,  y: 240, w: 64,   h: 16 },
        { x: 700,  y: 170, w: 64,   h: 16 },
        { x: 880,  y: 240, w: 64,   h: 16 },
        { x: 1060, y: 310, w: 64,   h: 16 },
        { x: 1240, y: 240, w: 64,   h: 16 },
        { x: 1420, y: 170, w: 64,   h: 16 },
        { x: 1600, y: 240, w: 64,   h: 16 },
        { x: 1780, y: 310, w: 64,   h: 16 },
      ],
      enemyZones: [
        { x: 300,  y: 410 }, { x: 650,  y: 410 }, { x: 900,  y: 210 },
        { x: 1100, y: 410 }, { x: 1440, y: 140 }, // Near the top of the staircase.
        { x: 1700, y: 410 },
      ],
      pickupZones: [{ x: 720, y: 140 }, { x: 1440, y: 140 }],
    },
  ],
};
