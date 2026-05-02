// Zone 2: Magheiba Chaasi Chuuma Dungeon — cave theme, mid boss
export const MagheibaD​ungeon = {
  index: 2,
  name: 'MAGHEIBA DUNGEON',
  bgColor: 0x080504,
  skyColor: 0x1a0f0a,
  platformColor: 0x3d2a1a,
  platformTopColor: 0x5a4030,
  bgTileKey: 'bg_cave',
  platformKey: 'plat_cave',
  roomCount: 5, // last room is boss room
  hasMidBoss: true,
  hasFinalBoss: false,
  enemyTypes: ['BrainrotSpreader', 'ZullbullyKnight', 'PookieSigma', 'BrainrotSpreader'],
  enemiesPerRoom: { min: 3, max: 5 },
  roomTemplates: [
    {
      id: 'md_1',
      platforms: [
        { x: 0, y: 448, w: 1920, h: 32 },
        { x: 0, y: 0, w: 1920, h: 16 },   // ceiling stalactites base
        { x: 300, y: 200, w: 160, h: 16 },
        { x: 600, y: 300, w: 128, h: 16 },
        { x: 900, y: 240, w: 160, h: 16 },
        { x: 1200, y: 320, w: 96, h: 16 },
        { x: 1500, y: 260, w: 160, h: 16 },
        { x: 1750, y: 360, w: 128, h: 16 },
      ],
      enemyZones: [
        { x: 250, y: 410 }, { x: 600, y: 270 }, { x: 900, y: 410 },
        { x: 1250, y: 410 }, { x: 1600, y: 410 },
      ],
      pickupZones: [{ x: 920, y: 210 }, { x: 1520, y: 230 }],
    },
    {
      id: 'md_2',
      platforms: [
        { x: 0, y: 448, w: 1920, h: 32 },
        { x: 0, y: 0, w: 1920, h: 16 },
        { x: 200, y: 350, w: 240, h: 16 },
        { x: 550, y: 270, w: 200, h: 16 },
        { x: 850, y: 190, w: 160, h: 16 },
        { x: 1100, y: 270, w: 200, h: 16 },
        { x: 1400, y: 350, w: 240, h: 16 },
        { x: 1700, y: 270, w: 128, h: 16 },
      ],
      enemyZones: [
        { x: 300, y: 320 }, { x: 650, y: 240 }, { x: 950, y: 160 },
        { x: 1300, y: 410 }, { x: 1600, y: 320 },
      ],
      pickupZones: [{ x: 870, y: 160 }, { x: 1720, y: 240 }],
    },
    {
      id: 'md_3',
      platforms: [
        { x: 0, y: 448, w: 640, h: 32 },
        { x: 720, y: 448, w: 560, h: 32 },
        { x: 1380, y: 448, w: 540, h: 32 },
        { x: 0, y: 0, w: 1920, h: 16 },
        { x: 280, y: 340, w: 128, h: 16 },
        { x: 580, y: 270, w: 96, h: 16 },
        { x: 820, y: 330, w: 128, h: 16 },
        { x: 1080, y: 250, w: 160, h: 16 },
        { x: 1380, y: 310, w: 128, h: 16 },
        { x: 1680, y: 370, w: 128, h: 16 },
      ],
      enemyZones: [
        { x: 200, y: 410 }, { x: 600, y: 240 }, { x: 900, y: 410 },
        { x: 1150, y: 220 }, { x: 1700, y: 410 },
      ],
      pickupZones: [{ x: 600, y: 240 }, { x: 1100, y: 220 }],
    },
    // Boss room — wide open arena
    {
      id: 'md_boss',
      isBossRoom: true,
      platforms: [
        { x: 0, y: 448, w: 1920, h: 32 },
        { x: 0, y: 0, w: 1920, h: 16 },
        { x: 100, y: 380, w: 160, h: 16 },
        { x: 1660, y: 380, w: 160, h: 16 },
        { x: 700, y: 280, w: 160, h: 16 },
        { x: 1060, y: 280, w: 160, h: 16 },
      ],
      enemyZones: [],
      pickupZones: [{ x: 780, y: 250 }, { x: 1080, y: 250 }],
      bossSpawn: { x: 960, y: 380 },
    },
  ],
};
