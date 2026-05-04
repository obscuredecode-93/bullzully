/**
 * @fileoverview Zone 3 configuration — Canada (Final Zone).
 *
 * The climactic snow-and-ice zone where Bully Maguire (Bulladi Chuttar Lamdiya)
 * has fled. This zone uses the full enemy roster — all four types appear — and
 * has the highest enemy count per room (4–7 vs 3–5 in earlier zones).
 *
 * The final boss arena is a wide-open stage with multiple elevation levels
 * to accommodate Bully Maguire's three-phase fight.
 *
 * @module zones/Canada
 */

/** @type {Object} Zone configuration consumed by ProceduralGen. */
export const Canada = {
  index: 3,
  name:  'CANADA (FINAL ZONE)',

  // Ice-and-snow palette — bright blues and white, a stark contrast to the cave.
  bgColor:          0xa0cce0, // Light steel blue sky.
  skyColor:         0xc8e8f8, // Pale ice-blue upper sky layer.
  platformColor:    0x7ab8d0, // Glacier blue for ice platform undersides.
  platformTopColor: 0xffffff, // Pure white snow on top of platforms.

  bgTileKey:   'bg_canada',
  platformKey: 'plat_canada',

  /**
   * 6 rooms — same count as Greenpath but with the full enemy roster and
   * a final boss room. The difficulty spike is in enemy count, not room count.
   */
  roomCount: 6,

  hasMidBoss:   false,
  hasFinalBoss: true, // BullyMaguire spawns in the final room.

  /**
   * All four enemy types appear in Canada, rewarding mastery of every combat mechanic
   * the player has learned across the previous three zones.
   */
  enemyTypes: ['PookieSigma', 'BrainrotSpreader', 'ZullbullyKnight', 'DiscordGhoster'],

  /** Up to 7 enemies per room — the highest density in the game. */
  enemiesPerRoom: { min: 4, max: 7 },

  roomTemplates: [
    {
      id: 'ca_1', // Symmetrical layout — mirrors the Greenpath style but more crowded.
      platforms: [
        { x: 0,    y: 448, w: 1920, h: 32 },
        { x: 250,  y: 370, w: 160,  h: 16 },
        { x: 550,  y: 300, w: 192,  h: 16 },
        { x: 850,  y: 240, w: 128,  h: 16 },
        { x: 1100, y: 300, w: 192,  h: 16 },
        { x: 1400, y: 370, w: 160,  h: 16 },
        { x: 1650, y: 300, w: 192,  h: 16 },
      ],
      enemyZones: [
        { x: 300,  y: 410 }, { x: 650,  y: 410 }, { x: 950,  y: 410 },
        { x: 1200, y: 410 }, { x: 1500, y: 410 }, { x: 1750, y: 410 },
        { x: 870,  y: 210 }, // Elevated centre spawn for aerial pressure.
      ],
      pickupZones: [{ x: 870, y: 210 }, { x: 1670, y: 270 }],
    },
    {
      id: 'ca_2', // Three-segment ground with complex elevated network.
      platforms: [
        { x: 0,    y: 448, w: 560,  h: 32 },
        { x: 640,  y: 448, w: 640,  h: 32 },
        { x: 1360, y: 448, w: 560,  h: 32 },
        { x: 200,  y: 340, w: 160,  h: 16 },
        { x: 480,  y: 270, w: 128,  h: 16 },
        { x: 780,  y: 200, w: 160,  h: 16 },
        { x: 1050, y: 270, w: 128,  h: 16 },
        { x: 1280, y: 340, w: 128,  h: 16 },
        { x: 1550, y: 270, w: 192,  h: 16 },
        { x: 1780, y: 340, w: 128,  h: 16 },
      ],
      enemyZones: [
        { x: 280,  y: 410 }, { x: 800,  y: 170 }, { x: 1060, y: 240 },
        { x: 1400, y: 410 }, { x: 1600, y: 240 }, { x: 200,  y: 310 },
        { x: 500,  y: 240 },
      ],
      pickupZones: [{ x: 800, y: 170 }, { x: 1570, y: 240 }],
    },
    {
      id: 'ca_3',
      // Ascending and descending staircase of very narrow (80px) ice ledges.
      // At this difficulty level the player should be comfortable with precise jumps.
      platforms: [
        { x: 0,    y: 448, w: 1920, h: 32 },
        { x: 160,  y: 390, w: 80,   h: 16 },
        { x: 320,  y: 340, w: 80,   h: 16 },
        { x: 480,  y: 280, w: 80,   h: 16 },
        { x: 640,  y: 220, w: 80,   h: 16 },
        { x: 800,  y: 160, w: 160,  h: 16 }, // Peak platform — wider to give a breather.
        { x: 1000, y: 220, w: 80,   h: 16 },
        { x: 1160, y: 280, w: 80,   h: 16 },
        { x: 1320, y: 340, w: 80,   h: 16 },
        { x: 1480, y: 280, w: 80,   h: 16 },
        { x: 1640, y: 220, w: 80,   h: 16 },
        { x: 1800, y: 160, w: 96,   h: 16 },
      ],
      enemyZones: [
        { x: 200,  y: 410 }, { x: 500,  y: 410 }, { x: 820,  y: 130 },
        { x: 1050, y: 190 }, { x: 1350, y: 410 }, { x: 1660, y: 190 },
        { x: 1820, y: 130 },
      ],
      pickupZones: [{ x: 820, y: 130 }, { x: 1820, y: 130 }],
    },
    // ── FINAL BOSS ARENA ────────────────────────────────────────────────────
    {
      id:         'ca_boss',
      isBossRoom: true,
      // Wide open arena with symmetrical flanking platforms.
      // Bully Maguire's Phase 3 summons minions — extra space lets the player
      // fight multiple enemies without being cornered.
      platforms: [
        { x: 0,    y: 448, w: 1920, h: 32 }, // Full-width ground.
        { x: 80,   y: 370, w: 200,  h: 16 }, // Left flank.
        { x: 1640, y: 370, w: 200,  h: 16 }, // Right flank.
        { x: 500,  y: 300, w: 200,  h: 16 }, // Left-centre elevation.
        { x: 1220, y: 300, w: 200,  h: 16 }, // Right-centre elevation.
        { x: 860,  y: 220, w: 200,  h: 16 }, // High centre — sniper perch.
      ],
      enemyZones: [], // No regular enemies; boss fills the room.
      pickupZones: [
        { x: 510,  y: 270 },
        { x: 1240, y: 270 },
        { x: 870,  y: 190 }, // Three pickups — Bully Maguire is a long fight.
      ],
      bossSpawn: { x: 960, y: 360 }, // Centre stage.
    },
  ],
};
