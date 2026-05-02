// Zone 0: Greenpath of BULLZ — forest theme
export const Greenpath = {
  index: 0,
  name: 'GREENPATH OF BULLZ',
  bgColor: 0x0d2b0d,
  skyColor: 0x1a4a1a,
  platformColor: 0x5c3d1a,
  platformTopColor: 0x2d8a2d,
  bgTileKey: 'bg_greenpath',
  platformKey: 'plat_greenpath',
  roomCount: 6,
  hasMidBoss: false,
  hasFinalBoss: false,
  enemyTypes: ['PookieSigma', 'PookieSigma', 'PookieSigma', 'ZullbullyKnight'],
  enemiesPerRoom: { min: 3, max: 5 },
  // Room templates: each defines platforms and spawn hint zones
  roomTemplates: [
    {
      id: 'gp_1',
      platforms: [
        { x: 0, y: 448, w: 1920, h: 32 },          // ground
        { x: 280, y: 360, w: 128, h: 16 },
        { x: 560, y: 300, w: 160, h: 16 },
        { x: 860, y: 340, w: 120, h: 16 },
        { x: 1100, y: 280, w: 200, h: 16 },
        { x: 1450, y: 320, w: 140, h: 16 },
        { x: 1700, y: 360, w: 120, h: 16 },
      ],
      enemyZones: [
        { x: 300, y: 410 }, { x: 700, y: 410 }, { x: 1000, y: 410 },
        { x: 1300, y: 410 }, { x: 1600, y: 410 },
      ],
      pickupZones: [{ x: 580, y: 270 }, { x: 1120, y: 250 }],
    },
    {
      id: 'gp_2',
      platforms: [
        { x: 0, y: 448, w: 1920, h: 32 },
        { x: 200, y: 340, w: 96, h: 16 },
        { x: 420, y: 280, w: 128, h: 16 },
        { x: 680, y: 220, w: 96, h: 16 },
        { x: 900, y: 300, w: 160, h: 16 },
        { x: 1150, y: 360, w: 80, h: 16 },
        { x: 1350, y: 280, w: 200, h: 16 },
        { x: 1650, y: 340, w: 160, h: 16 },
      ],
      enemyZones: [
        { x: 250, y: 410 }, { x: 600, y: 410 }, { x: 950, y: 410 },
        { x: 1200, y: 410 }, { x: 1700, y: 410 },
      ],
      pickupZones: [{ x: 700, y: 190 }, { x: 1370, y: 250 }],
    },
    {
      id: 'gp_3',
      platforms: [
        { x: 0, y: 448, w: 1920, h: 32 },
        { x: 160, y: 380, w: 200, h: 16 },
        { x: 500, y: 320, w: 256, h: 16 },
        { x: 850, y: 260, w: 128, h: 16 },
        { x: 1080, y: 320, w: 160, h: 16 },
        { x: 1360, y: 380, w: 96, h: 16 },
        { x: 1580, y: 300, w: 224, h: 16 },
      ],
      enemyZones: [
        { x: 200, y: 410 }, { x: 650, y: 410 }, { x: 1100, y: 410 },
        { x: 1450, y: 410 }, { x: 1750, y: 410 },
      ],
      pickupZones: [{ x: 870, y: 230 }, { x: 1600, y: 270 }],
    },
    {
      id: 'gp_4',
      platforms: [
        { x: 0, y: 448, w: 640, h: 32 },
        { x: 700, y: 448, w: 560, h: 32 },
        { x: 1350, y: 448, w: 570, h: 32 },
        // gaps in ground for challenge
        { x: 320, y: 350, w: 160, h: 16 },
        { x: 600, y: 280, w: 128, h: 16 },
        { x: 900, y: 330, w: 160, h: 16 },
        { x: 1200, y: 270, w: 128, h: 16 },
        { x: 1500, y: 340, w: 160, h: 16 },
        { x: 1750, y: 390, w: 80, h: 16 },
      ],
      enemyZones: [
        { x: 200, y: 410 }, { x: 500, y: 310 }, { x: 900, y: 410 },
        { x: 1220, y: 240 }, { x: 1650, y: 410 },
      ],
      pickupZones: [{ x: 620, y: 250 }, { x: 1220, y: 240 }],
    },
  ],
};
