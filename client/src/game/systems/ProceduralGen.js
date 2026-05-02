/**
 * ProceduralGen — generates zone room sequences from templates.
 * Uses a seeded LCG random so the same seed produces the same layout.
 */

export class ProceduralGen {
  constructor(seed) {
    this._seed = seed || Date.now();
  }

  // Simple LCG RNG — deterministic per seed
  _rand() {
    this._seed = (this._seed * 1664525 + 1013904223) & 0xffffffff;
    return (this._seed >>> 0) / 0xffffffff;
  }

  _randInt(min, max) {
    return Math.floor(this._rand() * (max - min + 1)) + min;
  }

  _shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(this._rand() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  /**
   * Generate ordered list of room configs for a zone.
   * @param {object} zoneConfig - Zone definition from zones/*.js
   * @returns {object[]} Array of room configs ready to load
   */
  generateZone(zoneConfig) {
    const { roomCount, roomTemplates, hasMidBoss, hasFinalBoss,
            enemyTypes, enemiesPerRoom } = zoneConfig;

    // Separate boss room templates
    const bossTemplates = roomTemplates.filter(t => t.isBossRoom);
    const normalTemplates = roomTemplates.filter(t => !t.isBossRoom);

    // Pick normal rooms (roomCount - 1 if boss room exists)
    const bossRoom = hasMidBoss || hasFinalBoss ? bossTemplates[0] : null;
    const normalCount = bossRoom ? roomCount - 1 : roomCount;

    const shuffled = this._shuffle(normalTemplates);
    const selectedNormal = [];
    for (let i = 0; i < normalCount; i++) {
      selectedNormal.push(shuffled[i % shuffled.length]);
    }

    // Build room objects
    const rooms = selectedNormal.map((template, idx) => {
      return this._buildRoomConfig(template, zoneConfig, idx, false);
    });

    // Append boss room if present
    if (bossRoom) {
      rooms.push(this._buildBossRoomConfig(bossRoom, zoneConfig, hasFinalBoss));
    }

    return rooms;
  }

  _buildRoomConfig(template, zoneConfig, roomIdx, isBoss) {
    const { enemyTypes, enemiesPerRoom } = zoneConfig;
    const count = this._randInt(enemiesPerRoom.min, enemiesPerRoom.max);

    // Randomly assign enemy types to spawn zones
    const spawnZones = this._shuffle([...template.enemyZones]);
    const enemySpawns = spawnZones.slice(0, Math.min(count, spawnZones.length)).map(pos => ({
      x: pos.x + this._randInt(-30, 30),
      y: pos.y,
      type: enemyTypes[Math.floor(this._rand() * enemyTypes.length)],
    }));

    // Randomly pick 0–2 pickups
    const pickupCount = this._randInt(0, Math.min(2, template.pickupZones.length));
    const pickupZones = this._shuffle([...template.pickupZones]).slice(0, pickupCount);
    const pickupSpawns = pickupZones.map(pos => ({
      x: pos.x + this._randInt(-20, 20),
      y: pos.y,
      type: this._randomPickupType(),
    }));

    return {
      ...template,
      isBossRoom: false,
      enemySpawns,
      pickupSpawns,
      index: roomIdx,
      bgKey: zoneConfig.bgTileKey,
      platformKey: zoneConfig.platformKey,
      zoneColors: {
        bg: zoneConfig.bgColor,
        platform: zoneConfig.platformColor,
        platformTop: zoneConfig.platformTopColor,
      },
    };
  }

  _buildBossRoomConfig(template, zoneConfig, isFinalBoss) {
    const pickupSpawns = template.pickupZones.map(pos => ({
      x: pos.x,
      y: pos.y,
      type: this._randomPickupType(),
    }));

    return {
      ...template,
      isBossRoom: true,
      isFinalBoss,
      enemySpawns: [],
      pickupSpawns,
      index: 999,
      bgKey: zoneConfig.bgTileKey,
      platformKey: zoneConfig.platformKey,
      bossType: isFinalBoss ? 'BullyMaguire' : 'MagheibaChaasi',
      zoneColors: {
        bg: zoneConfig.bgColor,
        platform: zoneConfig.platformColor,
        platformTop: zoneConfig.platformTopColor,
      },
    };
  }

  _randomPickupType() {
    const types = ['health', 'ammo', 'speed', 'shield'];
    const weights = [0.4, 0.35, 0.15, 0.1];
    const r = this._rand();
    let cumulative = 0;
    for (let i = 0; i < types.length; i++) {
      cumulative += weights[i];
      if (r < cumulative) return types[i];
    }
    return 'health';
  }
}
