/**
 * @fileoverview Procedural room generator for BULLZULLY zones.
 *
 * ProceduralGen takes a zone config (from zones/*.js) and produces an ordered
 * list of fully-configured room objects ready for GameScene to load one by one.
 *
 * ## How it works
 *
 * 1. A seed is passed in at construction time. The same seed always produces
 *    the same room sequence — useful for debugging a specific layout.
 *
 * 2. `generateZone()` separates the zone's room templates into "normal" and
 *    "boss" buckets, shuffles the normal templates, and selects `roomCount`
 *    rooms (repeating templates if there are fewer templates than rooms needed).
 *
 * 3. Each selected template is enriched with:
 *    - Randomised enemy spawns (type chosen from zone's `enemyTypes` pool,
 *      position jittered ±30px from the template's hint point)
 *    - Randomised pickup spawns (type drawn from a weighted probability table)
 *    - Zone colour metadata used by `_buildPlatform()` to select textures
 *
 * 4. The boss room (if the zone has one) is appended last with no enemy spawns.
 *
 * @module systems/ProceduralGen
 */

// ============================================================
// LCG CONSTANTS — Linear Congruential Generator
// ============================================================

/**
 * Multiplier and increment for the LCG RNG.
 * These are the same constants used by glibc's rand() implementation,
 * which is well-studied and produces a good distribution for game use.
 * Using an LCG (rather than Math.random) ensures the same seed always
 * gives the same sequence, making room layouts reproducible.
 */
const LCG_MULTIPLIER = 1664525;
const LCG_INCREMENT  = 1013904223;

export class ProceduralGen {
  /**
   * @param {number} [seed] - RNG seed. Defaults to Date.now() for a different
   *   layout each play session. Pass a fixed value to reproduce a specific run.
   */
  constructor(seed) {
    this._seed = seed || Date.now();
  }

  // ============================================================
  // RNG CORE
  // ============================================================

  /**
   * Advances the LCG state and returns a float in [0, 1).
   *
   * The `& 0xffffffff` masks to 32 bits (simulating C's unsigned int overflow).
   * `>>> 0` converts the signed 32-bit result to unsigned before dividing,
   * preventing negative numbers that would break probability calculations.
   *
   * @returns {number} Pseudo-random float in [0, 1).
   */
  _rand() {
    this._seed = (this._seed * LCG_MULTIPLIER + LCG_INCREMENT) & 0xffffffff;
    return (this._seed >>> 0) / 0xffffffff;
  }

  /**
   * Returns a random integer in the inclusive range [min, max].
   *
   * @param {number} min - Lower bound (inclusive).
   * @param {number} max - Upper bound (inclusive).
   * @returns {number}
   */
  _randInt(min, max) {
    return Math.floor(this._rand() * (max - min + 1)) + min;
  }

  /**
   * Fisher-Yates shuffle using the seeded RNG.
   * Returns a new array — the original is not mutated.
   *
   * @template T
   * @param {T[]} arr - Array to shuffle.
   * @returns {T[]} A new shuffled copy.
   */
  _shuffle(arr) {
    const a = [...arr];
    // Iterate from the end, swapping each element with a random earlier element.
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(this._rand() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  // ============================================================
  // PUBLIC API
  // ============================================================

  /**
   * Generate the full ordered room list for a zone.
   *
   * The returned array is consumed by GameScene._loadRoom() one room at a time
   * as the player progresses. Array index = room index in play order.
   *
   * @param {Object}   zoneConfig                    - Zone definition (see zones/*.js).
   * @param {number}   zoneConfig.roomCount           - Total rooms including boss room.
   * @param {Object[]} zoneConfig.roomTemplates       - Available layout templates.
   * @param {boolean}  zoneConfig.hasMidBoss          - Whether a mid-boss room exists.
   * @param {boolean}  zoneConfig.hasFinalBoss        - Whether a final-boss room exists.
   * @param {string[]} zoneConfig.enemyTypes          - Enemy type pool for spawning.
   * @param {{min,max}} zoneConfig.enemiesPerRoom     - Enemy count range per room.
   * @returns {Object[]} Ordered array of room config objects ready for GameScene.
   */
  generateZone(zoneConfig) {
    const { roomCount, roomTemplates, hasMidBoss, hasFinalBoss,
            enemyTypes, enemiesPerRoom } = zoneConfig;

    // Split templates into normal rooms and boss-specific rooms.
    const bossTemplates  = roomTemplates.filter(t => t.isBossRoom);
    const normalTemplates = roomTemplates.filter(t => !t.isBossRoom);

    // Boss room takes one slot, so normal rooms fill the remainder.
    const bossRoom    = hasMidBoss || hasFinalBoss ? bossTemplates[0] : null;
    const normalCount = bossRoom ? roomCount - 1 : roomCount;

    // Shuffle ensures the player doesn't see the same room order every run.
    const shuffled = this._shuffle(normalTemplates);

    // If we need more rooms than templates, cycle through with modulo.
    const selectedNormal = [];
    for (let i = 0; i < normalCount; i++) {
      selectedNormal.push(shuffled[i % shuffled.length]);
    }

    // Enrich each selected template with randomised spawns.
    const rooms = selectedNormal.map((template, idx) =>
      this._buildRoomConfig(template, zoneConfig, idx, false)
    );

    // Boss room is always last — the player must clear all normal rooms first.
    if (bossRoom) {
      rooms.push(this._buildBossRoomConfig(bossRoom, zoneConfig, hasFinalBoss));
    }

    return rooms;
  }

  // ============================================================
  // INTERNAL BUILDERS
  // ============================================================

  /**
   * Enrich a normal room template with randomised enemy and pickup spawns.
   *
   * @param {Object}  template   - Raw room template from the zone config.
   * @param {Object}  zoneConfig - Parent zone config (provides enemy pool, colours).
   * @param {number}  roomIdx    - 0-based position in the final room array.
   * @param {boolean} _isBoss    - Unused; kept for potential future differentiation.
   * @returns {Object} Fully-configured room object for GameScene.
   */
  _buildRoomConfig(template, zoneConfig, roomIdx, _isBoss) {
    const { enemyTypes, enemiesPerRoom } = zoneConfig;

    // Pick a random enemy count within the zone's defined range.
    const count = this._randInt(enemiesPerRoom.min, enemiesPerRoom.max);

    // Shuffle the template's hint positions so enemy placement varies each run.
    const spawnZones = this._shuffle([...template.enemyZones]);

    const enemySpawns = spawnZones
      // Never spawn more enemies than there are hint positions.
      .slice(0, Math.min(count, spawnZones.length))
      .map(pos => ({
        // Jitter X by ±30px so enemies aren't perfectly aligned.
        x:    pos.x + this._randInt(-30, 30),
        y:    pos.y,
        // Pick a random type from the zone's weighted pool.
        type: enemyTypes[Math.floor(this._rand() * enemyTypes.length)],
      }));

    // Spawn 0–2 pickups per room; more would trivialise resource management.
    const pickupCount = this._randInt(0, Math.min(2, template.pickupZones.length));
    const pickupZones = this._shuffle([...template.pickupZones]).slice(0, pickupCount);

    const pickupSpawns = pickupZones.map(pos => ({
      x:    pos.x + this._randInt(-20, 20), // Slight position variance.
      y:    pos.y,
      type: this._randomPickupType(),        // Drawn from weighted probability table.
    }));

    return {
      // Spread the template's platform and spawn-hint geometry verbatim.
      ...template,
      isBossRoom:  false,
      enemySpawns,
      pickupSpawns,
      index:       roomIdx,
      bgKey:       zoneConfig.bgTileKey,
      platformKey: zoneConfig.platformKey,
      // Colour metadata used by _buildPlatform() to select the right tile texture.
      zoneColors: {
        bg:          zoneConfig.bgColor,
        platform:    zoneConfig.platformColor,
        platformTop: zoneConfig.platformTopColor,
      },
    };
  }

  /**
   * Build the boss room config. Enemy spawns are empty — the boss IS the room.
   * Pickups are placed at all defined positions (boss fights deserve more healing).
   *
   * @param {Object}  template     - Boss room template (isBossRoom: true).
   * @param {Object}  zoneConfig   - Parent zone config.
   * @param {boolean} isFinalBoss  - True for Canada's Bully Maguire; false for mid-boss.
   * @returns {Object} Boss room config for GameScene.
   */
  _buildBossRoomConfig(template, zoneConfig, isFinalBoss) {
    // All pickup positions are used in boss rooms — the player needs resources.
    const pickupSpawns = template.pickupZones.map(pos => ({
      x:    pos.x,
      y:    pos.y,
      type: this._randomPickupType(),
    }));

    return {
      ...template,
      isBossRoom:  true,
      isFinalBoss,
      enemySpawns: [],  // No regular enemies in boss rooms.
      pickupSpawns,
      index:       999, // Sentinel value — boss room is always the last room.
      bgKey:       zoneConfig.bgTileKey,
      platformKey: zoneConfig.platformKey,
      // `bossType` tells GameScene which boss class to instantiate.
      bossType: isFinalBoss ? 'BullyMaguire' : 'MagheibaChaasi',
      zoneColors: {
        bg:          zoneConfig.bgColor,
        platform:    zoneConfig.platformColor,
        platformTop: zoneConfig.platformTopColor,
      },
    };
  }

  /**
   * Draw a random pickup type from a weighted probability table.
   *
   * Weights sum to 1.0. Health is most common (40%) because running out of HP
   * is the most common failure mode; shield is rarest (10%) because it's powerful.
   *
   * @returns {'health'|'ammo'|'speed'|'shield'}
   */
  _randomPickupType() {
    const types   = ['health', 'ammo',  'speed', 'shield'];
    const weights = [0.40,     0.35,    0.15,    0.10   ];
    // Walk the cumulative weight table until we exceed the random draw.
    const r = this._rand();
    let cumulative = 0;
    for (let i = 0; i < types.length; i++) {
      cumulative += weights[i];
      if (r < cumulative) return types[i];
    }
    // Fallback — should never be reached if weights sum to 1.0.
    return 'health';
  }
}
