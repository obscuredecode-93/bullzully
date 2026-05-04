/**
 * @fileoverview GameScene — the main gameplay scene.
 *
 * Responsibilities:
 *  1. Initialises the physics world, player, and all physics groups.
 *  2. Generates zone rooms via ProceduralGen and loads them one at a time.
 *  3. Manages the lifecycle of enemies, bosses, pickups, and projectiles per room.
 *  4. Owns all permanent and per-boss physics colliders.
 *  5. Handles room-clear detection, door mechanics, and zone/room transitions.
 *  6. Coordinates save-game calls and scene transitions to GameOverScene.
 *
 * Scene communication model:
 *  - HUDScene listens to GameScene's event emitter for state changes.
 *  - PauseScene receives a state snapshot via `scene.launch` data.
 *  - Player emits events on the GameScene emitter; GameScene routes them.
 *
 * Physics group design:
 *  - `this.enemies` MUST be `physics.add.group()` (not `add.group()`).
 *    Plain GameObjects.Group lacks the `isParent` flag that Phaser's arcade
 *    overlap system requires — using it causes all enemy overlap callbacks to
 *    silently never fire.
 *  - Boss colliders are added/removed per-boss via `_addBossColliders` /
 *    `_removeBossColliders` because passing a custom fake-group object to
 *    `physics.add.overlap` throws a TypeError at runtime.
 *
 * Room transition flow:
 *  player.x > ROOM_WIDTH - 80  →  _goToNextRoom()  →  _loadRoom(next)
 *                               OR _goToNextZone()  →  scene.restart(nextZoneData)
 *
 * @module scenes/GameScene
 */

import { ROOM_WIDTH, ROOM_HEIGHT, TILE_SIZE, PLAYER_MAX_LIVES, PLAYER_MAX_AMMO, API_BASE } from '../config';
import { ProceduralGen } from '../systems/ProceduralGen';
import Player from '../entities/Player';
import PookieSigma from '../entities/enemies/PookieSigma';
import DiscordGhoster from '../entities/enemies/DiscordGhoster';
import BrainrotSpreader from '../entities/enemies/BrainrotSpreader';
import ZullbullyKnight from '../entities/enemies/ZullbullyKnight';
import MagheibaChaasi from '../entities/bosses/MagheibaChaasi';
import BullyMaguire from '../entities/bosses/ZeusTata';
import { Greenpath } from '../zones/Greenpath';
import { DiscordVoid } from '../zones/DiscordVoid';
import { MagheibaDungeon } from '../zones/MagheibaDungeon';
import { Canada } from '../zones/Canada';

// Zone configs indexed by zoneIndex (0–3).
const ZONES = [Greenpath, DiscordVoid, MagheibaDungeon, Canada];

// Map from spawn type strings (stored in room data) to constructor classes.
const ENEMY_CLASSES = { PookieSigma, DiscordGhoster, BrainrotSpreader, ZullbullyKnight };

// Maps pickup type strings to their texture keys.
const PICKUP_TEXTURES = {
  health: 'pickup_health',
  ammo:   'pickup_ammo',
  speed:  'pickup_speed',
  shield: 'pickup_shield',
};

/**
 * GameScene — main gameplay scene. Manages rooms, enemies, bosses, and transitions.
 */
export default class GameScene extends Phaser.Scene {
  constructor() {
    super('GameScene');
  }

  // ============================================================
  // INIT
  // ============================================================

  /**
   * Receives data from MenuScene (new game) or from scene.restart (zone transition).
   *
   * `cursors` and `keys` are null-initialised here so `update()` can guard
   * against them being undefined if `_buildScene()` throws before keyboard setup.
   *
   * @param {object} data
   * @param {number} data.zoneIndex      - Starting zone (0–3).
   * @param {number} [data.currentRoom]  - Starting room within the zone (0-based).
   * @param {string} [data.sessionId]    - Browser session ID for save calls.
   * @param {number} [data.lives]        - Starting lives.
   * @param {number} [data.health]       - Starting health.
   * @param {number} [data.ammo]         - Starting ammo.
   * @param {number} [data.score]        - Starting score (carries over from previous zones).
   * @param {number} [data.zonesCompleted] - Total zones cleared so far.
   */
  init(data) {
    this.currentZoneIndex = data.zoneIndex    ?? 0;
    this.currentRoomIndex = data.currentRoom  ?? 0;
    this.sessionId        = data.sessionId    || 'offline';
    this._initLives       = data.lives        ?? PLAYER_MAX_LIVES;
    this._initHealth      = data.health       ?? 100;
    this._initAmmo        = data.ammo         ?? PLAYER_MAX_AMMO;
    this._initScore       = data.score        ?? 0;
    this.zonesCompleted   = data.zonesCompleted ?? 0;

    this._rooms       = [];
    this._roomCleared = false;
    this._transitioning = false;
    this._bossActive  = false;
    this.boss         = null;
    this.player       = null;

    // Safe null defaults — update() checks these before reading.
    this.cursors = null;
    this.keys    = null;

    // Colliders added when a boss spawns; removed on room clear or boss death.
    this._bossColliders = [];

    // BULLZ combo tracking: consecutive kills within 3s chain the bonus charge.
    this._killCombo    = 0;
    this._lastKillTime = 0;
  }

  // ============================================================
  // CREATE
  // ============================================================

  /**
   * Wraps `_buildScene()` in a try/catch so startup errors surface as visible
   * on-screen text rather than silently freezing on a black screen.
   *
   * Without this wrapper, a single thrown error in create() leaves the game in
   * an unrecoverable black-screen state — nothing to click, no console visible
   * to non-developer players.
   */
  create() {
    try {
      this._buildScene();
    } catch (err) {
      console.error('[GameScene] create() failed:', err);
      this.add.text(
        this.cameras.main.width  / 2,
        this.cameras.main.height / 2,
        `STARTUP ERROR:\n${err.message}\n\nCheck browser console.`,
        {
          fontSize: '8px', color: '#ff4444', align: 'center',
          fontFamily: 'monospace', stroke: '#000', strokeThickness: 3,
          wordWrap: { width: 700 },
        }
      ).setOrigin(0.5).setScrollFactor(0).setDepth(100);
    }
  }

  /**
   * The actual scene setup — called by `create()` inside a try/catch.
   *
   * IMPORTANT: `cursors` and `keys` are set up FIRST (before colliders, player
   * creation, or any other throwable code). This ensures `update()` always has
   * valid input references even if the rest of setup fails partway through.
   */
  _buildScene() {
    this.physics.world.setBounds(0, 0, ROOM_WIDTH, ROOM_HEIGHT);
    this.enemyClasses = ENEMY_CLASSES;

    // ── Zone + procedural generation ──────────────────────────────────────────
    const zoneConfig = ZONES[this.currentZoneIndex] || ZONES[0];
    this.zoneConfig  = zoneConfig;
    // XOR-based seed: different zone means different layout even at the same timestamp.
    const seed = Date.now() ^ (this.currentZoneIndex * 0x9e3779b9);
    this._rooms = new ProceduralGen(seed).generateZone(zoneConfig);

    // Background with parallax scroll factor — moves at 20% of camera speed.
    this.add.image(400, 240, zoneConfig.bgTileKey).setScrollFactor(0.2).setDepth(-5);

    // ── Physics groups ────────────────────────────────────────────────────────
    this.platformGroup     = this.physics.add.staticGroup();
    // FIX: physics.add.group() required — plain add.group() breaks arcade overlap.
    this.enemies           = this.physics.add.group();
    this.pickups           = this.physics.add.staticGroup();
    this.playerProjectiles = this.physics.add.group();
    this.enemyProjectiles  = this.physics.add.group();

    // ── Input (initialised FIRST to guarantee availability in update) ─────────
    this.cursors = this.input.keyboard.createCursorKeys();
    this.keys    = this.input.keyboard.addKeys({
      A: Phaser.Input.Keyboard.KeyCodes.A,
      D: Phaser.Input.Keyboard.KeyCodes.D,
      W: Phaser.Input.Keyboard.KeyCodes.W,
      S: Phaser.Input.Keyboard.KeyCodes.S,
      Z: Phaser.Input.Keyboard.KeyCodes.Z,
      X: Phaser.Input.Keyboard.KeyCodes.X,
      C: Phaser.Input.Keyboard.KeyCodes.C,
      V: Phaser.Input.Keyboard.KeyCodes.V,
      SPACE: Phaser.Input.Keyboard.KeyCodes.SPACE,
      SHIFT: Phaser.Input.Keyboard.KeyCodes.SHIFT,
    });

    // ── Player ────────────────────────────────────────────────────────────────
    this.player = new Player(this, 120, 380);
    this.player.health = this._initHealth;
    this.player.lives  = this._initLives;
    this.player.ammo   = this._initAmmo;
    this.player.score  = this._initScore;

    // ── Camera ────────────────────────────────────────────────────────────────
    this.cameras.main.setBounds(0, 0, ROOM_WIDTH, ROOM_HEIGHT);
    // lerp 0.08: slightly laggy follow — softer than snapping, reveals more of
    // what's ahead of the player.
    this.cameras.main.startFollow(this.player, true, 0.08, 0.08);
    // Offset 60px downward so the player is shown in the upper half of the
    // screen, giving more visibility below (where most threats are).
    this.cameras.main.setFollowOffset(0, 60);

    this._setupPermanentColliders();
    this._setupEvents();

    // ── HUD ───────────────────────────────────────────────────────────────────
    // Launch in parallel (not start) so it runs alongside GameScene.
    this.scene.launch('HUDScene', {
      lives:    this.player.lives,
      health:   this.player.health,
      ammo:     this.player.ammo,
      score:    this.player.score,
      zoneName: zoneConfig.name,
    });
    this.events.emit('zone-changed', zoneConfig.name);

    this._loadRoom(this.currentRoomIndex);

    // ── Keyboard shortcuts ────────────────────────────────────────────────────
    this.input.keyboard.addKey('ESC').on('down', () => this._triggerPause());
    this.input.keyboard.addKey('P').on('down',   () => this._saveGame());

    // HUD pause button emits this event rather than calling scene.pause() directly.
    this.events.on('pause-requested', () => this._triggerPause());
  }

  // ============================================================
  // UPDATE
  // ============================================================

  /**
   * Per-frame update: player input, enemy AI, projectile culling, and room exit check.
   *
   * Guards `!this.cursors || !this.keys` prevent crashes if create() threw before
   * keyboard setup completed (see _buildScene comment on init order).
   *
   * @param {number} time - Phaser scene timestamp in ms.
   */
  update(time) {
    if (!this.player || this.player.isDead || !this.cursors || !this.keys) return;

    this.player.update(this.cursors, this.keys, time);

    // Pit fall detection: instantly kill the player if they drop below the room floor.
    // fallDeath() bypasses the damage-cooldown invincibility window so it always fires.
    if (!this.player.isDead && this.player.y > ROOM_HEIGHT + 80) {
      this.cameras.main.shake(200, 0.015);
      this.player.fallDeath();
    }

    // Enemy AI — each enemy drives its own state machine.
    this.enemies.getChildren().forEach(e => {
      if (e.active && e.update) e.update(this.player, time);
    });

    if (this.boss?.active && this.boss.update) {
      this.boss.update(this.player, time);
    }

    // Cull out-of-bounds projectiles — prevents accumulation on long rooms.
    // +32 buffer avoids premature destruction at the very edge.
    this.playerProjectiles.getChildren().forEach(p => {
      if (p.x < -32 || p.x > ROOM_WIDTH + 32) p.destroy();
    });
    this.enemyProjectiles.getChildren().forEach(p => {
      if (p.x < -32 || p.x > ROOM_WIDTH + 32 || p.y > ROOM_HEIGHT + 32) p.destroy();
    });

    // Door exit: player walks through the right edge after the room is cleared.
    if (!this._transitioning && this._roomCleared && this.player.x > ROOM_WIDTH - 80) {
      this._goToNextRoom();
    }
  }

  // ============================================================
  // PERMANENT COLLIDERS
  // ============================================================

  /**
   * Sets up all colliders that persist across room transitions.
   *
   * These are registered once in `_buildScene` and never removed. The physics
   * groups (enemies, playerProjectiles, etc.) are cleared and repopulated each
   * room — the colliders automatically apply to whatever children are in the
   * groups at the time of each overlap check.
   *
   * Why permanent colliders for enemies but per-boss colliders for bosses?
   *  - Enemies live in `this.enemies` (a group), so one group-level collider covers all.
   *  - Bosses are singleton sprites, not group members. Passing a single sprite to
   *    `physics.add.overlap` is valid; passing a fake group-like object is not —
   *    it causes a TypeError inside Phaser's world step.
   */
  _setupPermanentColliders() {
    // Player lands on platforms.
    this.physics.add.collider(this.player, this.platformGroup);

    // Player melee hits enemies — damage scaled by BULLZ multiplier.
    this.physics.add.overlap(
      this.player.getMeleeHitbox(),
      this.enemies,
      (hitbox, enemy) => {
        if (!hitbox.active || !enemy.active || !enemy.takeDamage) return;
        const dmg = Math.floor(25 * (this.player?.bullzMultiplier ?? 1));
        enemy.takeDamage(dmg);
        this._showHitSpark(enemy.x, enemy.y);
        this.cameras.main.shake(150, 0.01);
      }
    );

    // Player bullets hit enemies.
    this.physics.add.overlap(
      this.playerProjectiles,
      this.enemies,
      (bullet, enemy) => {
        if (!bullet.active || !enemy.active) return;
        const base = bullet.getData('damage') || 30;
        enemy.takeDamage(Math.floor(base * (this.player?.bullzMultiplier ?? 1)));
        this._showHitSpark(bullet.x, bullet.y);
        bullet.destroy();
      }
    );

    // Player bullets destroyed on terrain contact.
    this.physics.add.collider(
      this.playerProjectiles,
      this.platformGroup,
      (bullet) => bullet.destroy()
    );

    // Enemy projectiles hit player.
    this.physics.add.overlap(
      this.player,
      this.enemyProjectiles,
      (player, proj) => {
        if (!proj.active) return;
        player.takeDamage(proj.getData('damage') || 15);
        proj.destroy();
      }
    );

    // Player collects pickups on contact.
    this.physics.add.overlap(
      this.player,
      this.pickups,
      (_pl, pickup) => this._collectPickup(pickup)
    );

    // Enemy bodies deal contact damage — damageCooldown prevents rapid stacking.
    this.physics.add.overlap(
      this.player,
      this.enemies,
      (player, enemy) => {
        if (!enemy.active || player.damageCooldown > 0) return;
        player.takeDamage(enemy.damage || 10);
      }
    );

    // Enemies land on platforms (so they don't fall through the floor).
    this.physics.add.collider(this.enemies, this.platformGroup);
  }

  // ============================================================
  // PER-BOSS COLLIDERS
  // ============================================================

  /**
   * Registers melee, bullet, and platform colliders for a specific boss sprite.
   *
   * Called when a boss spawns. Stored in `_bossColliders` so they can be
   * cleaned up with `_removeBossColliders` on room clear or boss death.
   *
   * This pattern avoids passing boss sprites directly to the permanent colliders
   * (which would require knowing the boss object at scene setup time, before it spawns).
   *
   * @param {Phaser.Physics.Arcade.Sprite} boss - The spawned boss instance.
   */
  _addBossColliders(boss) {
    this._bossColliders = [
      // Melee hits boss.
      this.physics.add.overlap(
        this.player.getMeleeHitbox(),
        boss,
        (hitbox, b) => {
          if (!hitbox.active || !b.active) return;
          b.takeDamage(Math.floor(25 * (this.player?.bullzMultiplier ?? 1)));
          this._showHitSpark(b.x, b.y - 20);
          this.cameras.main.shake(150, 0.01);
        }
      ),
      // Bullets hit boss.
      this.physics.add.overlap(
        this.playerProjectiles,
        boss,
        (bullet, b) => {
          if (!bullet.active || !b.active) return;
          const base = bullet.getData('damage') || 30;
          b.takeDamage(Math.floor(base * (this.player?.bullzMultiplier ?? 1)));
          this._showHitSpark(bullet.x, bullet.y);
          bullet.destroy();
        }
      ),
      // Boss lands on platforms.
      this.physics.add.collider(boss, this.platformGroup),
    ];
  }

  /**
   * Removes all per-boss colliders from the physics world.
   * Called before spawning the next boss or when transitioning rooms.
   */
  _removeBossColliders() {
    this._bossColliders.forEach(c => {
      if (c) this.physics.world.removeCollider(c);
    });
    this._bossColliders = [];
  }

  // ============================================================
  // ROOM LOADING
  // ============================================================

  /**
   * Clears the current room and builds the next one from the generated room data.
   *
   * Boss rooms delay enemy spawning by 1500ms to show the boss intro message
   * before the encounter starts. Normal rooms delay by 600ms for the room
   * number message to display.
   *
   * Players are repositioned to the left edge (x=80) on all rooms after the
   * first — walking out of the right-side door should deposit them at the left.
   *
   * @param {number} roomIndex - Index into `this._rooms`.
   */
  _loadRoom(roomIndex) {
    this._clearRoom();
    this._roomCleared = false;

    const room = this._rooms[roomIndex];
    if (!room) return;

    this.currentRoom      = room;
    this.currentRoomIndex = roomIndex;

    // Build platform tiles from room layout data.
    room.platforms.forEach(p => this._buildPlatform(p.x, p.y, p.w, p.h));

    // Door starts closed; opened when the room is cleared.
    this._door     = this.add.image(ROOM_WIDTH - 32, 384, 'door_closed').setDepth(5);
    this._doorOpen = false;

    if (room.isBossRoom) {
      this._showRoomMessage('BOSS INCOMING!', '#ff4400');
      this.time.delayedCall(1500, () => this._spawnBoss(room));
    } else {
      this._showRoomMessage(`ROOM ${roomIndex + 1} / ${this._rooms.length}`, '#ffffff');
      this.time.delayedCall(600, () => {
        this._spawnEnemies(room.enemySpawns);
        this._spawnPickups(room.pickupSpawns);
        this._updateDoorState(); // Open immediately if room spawns zero enemies.
      });
    }

    if (roomIndex > 0) {
      this.player.setPosition(80, ROOM_HEIGHT - 80);
    }
  }

  /**
   * Builds one platform from tile-sized images in a static physics group.
   *
   * Tiles are 32px wide; `Math.ceil(w / TILE_SIZE)` ensures partial tiles at
   * the end of a platform are still created. Each tile calls `refreshBody()`
   * after `setDisplaySize` so the physics body matches the visual size.
   *
   * The ground vs platform texture is chosen by the zone suffix so each zone
   * gets its own art style automatically.
   *
   * @param {number} x - Left edge of the platform (world-space px).
   * @param {number} y - Top edge of the platform.
   * @param {number} w - Platform width in px.
   * @param {number} h - Platform height in px (≥32 = ground tile, <32 = platform tile).
   */
  _buildPlatform(x, y, w, h) {
    const cellsW   = Math.ceil(w / TILE_SIZE);
    const isGround = h >= 32;
    const suffix   = this.zoneConfig.bgTileKey.replace('bg_', '');
    const key      = isGround ? `ground_${suffix}` : `plat_${suffix}`;
    const useKey   = this.textures.exists(key) ? key : `plat_${suffix}`;

    for (let i = 0; i < cellsW; i++) {
      const tileX = x + i * TILE_SIZE + TILE_SIZE / 2;
      const tileY = y + h / 2;
      const tile  = this.platformGroup.create(tileX, tileY, useKey);
      tile.setDisplaySize(TILE_SIZE, h);
      tile.body.setSize(TILE_SIZE, h);
      tile.refreshBody(); // Required after setDisplaySize on static bodies.
    }
  }

  /**
   * Destroys all room-scoped objects: platforms, enemies, pickups, projectiles, boss.
   * Called before loading each new room to avoid leftover state.
   *
   * Enemies are destroyed individually (e.destroy() runs cleanup code such as
   * HP bar removal) before the group is cleared. The group is then cleared without
   * destroying again (`clear(false, false)`) to avoid double-destroy.
   */
  _clearRoom() {
    this.platformGroup.clear(true, true);

    this.enemies.getChildren().forEach(e => { if (e.active) e.destroy(); });
    this.enemies.clear(false, false);

    this.pickups.clear(true, true);
    this.playerProjectiles.clear(true, true);
    this.enemyProjectiles.clear(true, true);

    this._removeBossColliders();
    if (this.boss?.active) this.boss.destroy();
    this.boss        = null;
    this._bossActive = false;

    if (this._door) { this._door.destroy(); this._door = null; }
  }

  // ============================================================
  // SPAWNING
  // ============================================================

  /**
   * Instantiates enemies from the room's spawn list using the class map.
   *
   * Unknown spawn types are silently skipped — this prevents a bad zone config
   * from crashing the room load.
   *
   * @param {Array<{type: string, x: number, y: number}>} spawns
   */
  _spawnEnemies(spawns) {
    if (!spawns?.length) return;
    spawns.forEach(spawn => {
      const EnemyClass = ENEMY_CLASSES[spawn.type];
      if (!EnemyClass) return;
      const enemy = new EnemyClass(this, spawn.x, spawn.y);
      // `true` = also add to scene display list (equivalent to scene.add.existing).
      this.enemies.add(enemy, true);
    });
  }

  /**
   * Spawns the boss for a boss room, adds per-boss colliders, and announces it.
   *
   * Boss type is determined by `room.bossType` string — currently 'MagheibaChaasi'
   * or 'BullyMaguire'. Default fallback is BullyMaguire.
   *
   * @param {object} room - Room data object with `bossSpawn` and `bossType` fields.
   */
  _spawnBoss(room) {
    const spawn = room.bossSpawn || { x: ROOM_WIDTH / 2, y: ROOM_HEIGHT - 100 };
    this._bossActive = true;

    this.boss = room.bossType === 'MagheibaChaasi'
      ? new MagheibaChaasi(this, spawn.x, spawn.y)
      : new BullyMaguire(this, spawn.x, spawn.y);

    // Per-boss colliders added here — cannot be in permanent colliders because
    // the boss sprite doesn't exist at scene setup time.
    this._addBossColliders(this.boss);

    this.cameras.main.shake(500, 0.01);
    this._showRoomMessage(
      room.bossType === 'BullyMaguire'
        ? 'BULLY MAGUIRE aka BULLADI!'
        : 'MR. MAGHEIBA: CHAASI CHUUMA!',
      '#ff4400'
    );
  }

  /**
   * Creates bobbing pickup sprites from the room's pickup spawn list.
   *
   * The `yoyo: true, repeat: -1` tween creates an infinite hover animation.
   * Pickups are added to a staticGroup so overlap detection works but gravity
   * doesn't apply (static bodies are unaffected by gravity).
   *
   * @param {Array<{type: string, x: number, y: number}>} spawns
   */
  _spawnPickups(spawns) {
    if (!spawns?.length) return;
    spawns.forEach(spawn => {
      const texKey = PICKUP_TEXTURES[spawn.type] || 'pickup_health';
      const pickup = this.pickups.create(spawn.x, spawn.y, texKey);
      pickup.setData('type', spawn.type).setDepth(4);
      // Hover 8px up and back — slow enough to be legible as a pickup cue.
      this.tweens.add({ targets: pickup, y: spawn.y - 8, duration: 900, yoyo: true, repeat: -1 });
    });
  }

  // ============================================================
  // EVENTS
  // ============================================================

  /**
   * Registers all inter-system event listeners on the scene emitter.
   *
   * These events are emitted by Player, enemies, and bosses:
   *  - 'enemy-killed':   enemy died → award score, check room clear.
   *  - 'boss-killed':    boss died → award score, handle final boss vs mid-boss flow.
   *  - 'player-respawn': player lost a life but has lives left → respawn.
   *  - 'game-over':      player lost all lives → show GameOverScene.
   */
  _setupEvents() {
    this.events.on('enemy-killed', ({ score, x, y }) => {
      this.player.addScore(score);
      this._floatScore(score, x, y);

      // ── BULLZ charge on kill ──────────────────────────────────────────────
      // Kills within 3s of each other build a combo that escalates the bonus.
      // Combo caps at 5 to prevent a full charge from a single packed room.
      const now = this.time.now;
      if (now - this._lastKillTime < 3000) {
        this._killCombo = Math.min(this._killCombo + 1, 5);
      } else {
        this._killCombo = 1; // New chain starts.
      }
      this._lastKillTime = now;
      // Base 80 units (8%) + 25 per combo level above 1, max 300 per kill.
      const killBonus = 80 + (this._killCombo - 1) * 25;
      this.player?.addBullzCharge(Math.min(killBonus, 300));

      this._checkRoomClear();
    });

    this.events.on('boss-killed', ({ score, finalBoss, victoryText }) => {
      this.player.addScore(score);
      this.zonesCompleted++;
      this._removeBossColliders();

      if (finalBoss) {
        // Final boss (BullyMaguire) — save then transition to victory GameOverScene.
        this._saveGame();
        this.time.delayedCall(3500, () => {
          if (victoryText?.active) victoryText.destroy();
          this.scene.stop('HUDScene');
          this.scene.start('GameOverScene', {
            score:           this.player.score,
            zonesCompleted:  this.zonesCompleted,
            killedFinalBoss: true,
            sessionId:       this.sessionId,
            victory:         true,
          });
        });
      } else {
        // Mid-boss — open the door after a brief delay for the death FX to play.
        this.time.delayedCall(2000, () => this._openDoor());
      }
    });

    this.events.on('player-respawn', () => this.player.respawn(120, 380));

    this.events.on('game-over', ({ score }) => {
      this._saveGame();
      this.time.delayedCall(1200, () => {
        this.scene.stop('HUDScene');
        this.scene.start('GameOverScene', {
          score,
          zonesCompleted:  this.zonesCompleted,
          killedFinalBoss: false,
          sessionId:       this.sessionId,
          victory:         false,
        });
      });
    });
  }

  // ============================================================
  // ROOM CLEAR
  // ============================================================

  /**
   * Checks whether all enemies are dead. Called whenever an enemy dies.
   * Saves the game automatically on room clear as a checkpoint.
   */
  _checkRoomClear() {
    const alive = this.enemies.getChildren().filter(e => e.active && !e.dead);
    if (alive.length === 0 && !this._roomCleared && !this._bossActive) {
      this._roomCleared = true;
      this._openDoor();
      this._showRoomMessage('ROOM CLEARED!', '#00ff00');
      this._saveGame();
    }
  }

  /**
   * Opens the door immediately if the room has no enemies (empty spawn list).
   * Called once after spawning to handle zero-enemy rooms.
   */
  _updateDoorState() {
    const hasEnemies = this.enemies.getChildren().some(e => e.active);
    if (!hasEnemies && !this._roomCleared) {
      this._roomCleared = true;
      this._openDoor();
    }
  }

  /**
   * Switches the door to its open texture, starts a pulsing tween, and adds
   * an animated arrow to draw the player toward the exit.
   */
  _openDoor() {
    if (!this._door || this._doorOpen) return;
    this._doorOpen    = true;
    this._roomCleared = true;
    this._door.setTexture('door_open');

    // Pulsing alpha on the door — repeat: -1 = forever.
    this.tweens.add({ targets: this._door, alpha: 0.7, duration: 400, yoyo: true, repeat: -1 });

    const arrow = this.add.text(ROOM_WIDTH - 32, 350, '→', {
      fontSize: '16px', color: '#ffcc00', fontFamily: "'Press Start 2P'",
    }).setOrigin(0.5).setDepth(15);
    // Slide arrow left and right to guide the player's eye.
    this.tweens.add({ targets: arrow, x: arrow.x + 12, duration: 500, yoyo: true, repeat: -1 });
  }

  /**
   * Initiates the room-transition fade sequence.
   *
   * The 400ms fadeOut gives the player a visual cue that something is happening.
   * `_transitioning` flag prevents multiple triggers from the player hovering at the exit.
   */
  _goToNextRoom() {
    if (this._transitioning) return;
    this._transitioning = true;

    this.cameras.main.fadeOut(400);
    this.time.delayedCall(400, () => {
      const next = this.currentRoomIndex + 1;
      if (next >= this._rooms.length) {
        this._goToNextZone();
      } else {
        this._loadRoom(next);
        this._transitioning = false;
        this.cameras.main.fadeIn(300);
      }
    });
  }

  /**
   * Advances to the next zone by restarting the scene with the new zone index.
   *
   * `scene.restart(data)` destroys and recreates GameScene — this resets all
   * physics groups and event listeners cleanly without a full page reload.
   * Player stats (lives, score, health, ammo) are passed through the restart data.
   *
   * If the next zone index exceeds the ZONES array, the game is won.
   */
  _goToNextZone() {
    const nextZone = this.currentZoneIndex + 1;
    this.zonesCompleted++;

    if (nextZone >= ZONES.length) {
      this.scene.stop('HUDScene');
      this.scene.start('GameOverScene', {
        score:           this.player.score,
        zonesCompleted:  this.zonesCompleted,
        victory:         true,
        killedFinalBoss: true,
        sessionId:       this.sessionId,
      });
      return;
    }

    this._showRoomMessage(`ZONE CLEAR!\nEntering: ${ZONES[nextZone].name}`, '#ffcc00');
    this._saveGame();

    this.time.delayedCall(1800, () => {
      this.scene.stop('HUDScene');
      this.scene.restart({
        zoneIndex:       nextZone,
        currentRoom:     0,
        lives:           this.player.lives,
        score:           this.player.score,
        health:          this.player.health,
        ammo:            this.player.ammo,
        sessionId:       this.sessionId,
        zonesCompleted:  this.zonesCompleted,
      });
    });
  }

  // ============================================================
  // PICKUPS
  // ============================================================

  /**
   * Handles all pickup collection logic — removes the pickup, shows a spark,
   * and calls the appropriate Player method for the pickup type.
   *
   * The spark tween is colour-coded by type so the player can identify pickups
   * by colour even before reading the floating text.
   *
   * @param {Phaser.GameObjects.Image} pickup - The collected pickup sprite.
   */
  _collectPickup(pickup) {
    const type = pickup.getData('type');
    this.tweens.killTweensOf(pickup); // Stop hover tween before destroying.
    pickup.destroy();

    const sparkColors = { health: 0xff2222, ammo: 0xffdd00, speed: 0xffff00, shield: 0x0066ff };
    const spark = this.add.image(pickup.x, pickup.y, 'hit_spark')
      .setDepth(18).setTint(sparkColors[type] || 0xffffff);
    this.tweens.add({ targets: spark, alpha: 0, scale: 2, duration: 300,
      onComplete: () => spark.destroy() });

    switch (type) {
      case 'health': this.player.collectHealth(35);
        this._showFloatText(pickup.x, pickup.y, '+35 HP', '#22cc22'); break;
      case 'ammo':   this.player.collectAmmo(8);
        this._showFloatText(pickup.x, pickup.y, '+8 AMMO', '#ffdd00'); break;
      case 'speed':  this.player.activateSigmaMode();
        this._showFloatText(pickup.x, pickup.y, 'SIGMA MODE!', '#ffff00'); break;
      case 'shield': this.player.activateShield();
        this._showFloatText(pickup.x, pickup.y, 'SHIELDED!', '#0099ff'); break;
    }
  }

  // ============================================================
  // VISUAL HELPERS
  // ============================================================

  /**
   * Shows a short-lived spark image at the given position.
   * Used for melee and bullet hit feedback.
   *
   * @param {number} x - World-space X.
   * @param {number} y - World-space Y.
   */
  _showHitSpark(x, y) {
    const spark = this.add.image(x, y, 'hit_spark').setDepth(16).setScale(0.8);
    this.tweens.add({ targets: spark, alpha: 0, scale: 1.5, duration: 180,
      onComplete: () => spark.destroy() });
  }

  /**
   * Floats a "+N" score label upward from an enemy kill position.
   * Also re-emits 'score-changed' so HUDScene updates immediately.
   *
   * @param {number} score - Points to display.
   * @param {number} x     - World-space X (enemy position).
   * @param {number} y     - World-space Y.
   */
  _floatScore(score, x, y) {
    const t = this.add.text(x, y - 20, `+${score}`, {
      fontSize: '7px', color: '#ffdd00', fontFamily: "'Press Start 2P'",
      stroke: '#000', strokeThickness: 2,
    }).setDepth(20).setOrigin(0.5);
    this.tweens.add({ targets: t, y: t.y - 35, alpha: 0, duration: 900,
      onComplete: () => t.destroy() });
    this.events.emit('score-changed', this.player.score);
  }

  /**
   * Shows a contextual pickup label (e.g., "+35 HP") that floats upward and fades.
   *
   * @param {number} x     - World-space X.
   * @param {number} y     - World-space Y.
   * @param {string} msg   - Text to show.
   * @param {string} color - CSS hex colour string.
   */
  _showFloatText(x, y, msg, color) {
    const t = this.add.text(x, y - 10, msg, {
      fontSize: '6px', color, fontFamily: "'Press Start 2P'",
      stroke: '#000', strokeThickness: 2,
    }).setDepth(20).setOrigin(0.5);
    this.tweens.add({ targets: t, y: t.y - 30, alpha: 0, duration: 1000,
      onComplete: () => t.destroy() });
  }

  /**
   * Shows a centred room message (e.g., "ROOM 1 / 5", "BOSS INCOMING!", "ROOM CLEARED!").
   *
   * Uses `setScrollFactor(0)` so the text is in screen-space (not world-space).
   * IMPORTANT: For scrollFactor-0 objects, positions must use camera pixel coords
   * (`cameras.main.width / 2`), NOT world coords (`scrollX + width/2`).
   * Using world coords causes the text to appear far off-screen during camera scrolling.
   *
   * Supports multi-line messages via '\n' split — each line fades individually.
   *
   * @param {string} msg             - Message text (use '\n' for multi-line).
   * @param {string} [color='#ffffff'] - Text colour.
   */
  _showRoomMessage(msg, color = '#ffffff') {
    // FIX: scrollFactor(0) objects use canvas coordinates — width/2, not scrollX + width/2.
    const cx = this.cameras.main.width / 2;
    msg.split('\n').forEach((line, i) => {
      const t = this.add.text(cx, 170 + i * 24, line, {
        fontSize: '10px', color, fontFamily: "'Press Start 2P'",
        stroke: '#000000', strokeThickness: 4,
      }).setScrollFactor(0).setDepth(25).setOrigin(0.5);
      // 500ms delay before fading so the player has time to read it.
      this.tweens.add({ targets: t, y: t.y - 30, alpha: 0, duration: 1800, delay: 500,
        onComplete: () => t.destroy() });
    });
  }

  // ============================================================
  // PAUSE
  // ============================================================

  /**
   * Pauses GameScene and launches PauseScene as an overlay.
   *
   * Guards against double-pausing (e.g., ESC pressed twice rapidly) and
   * pausing during a room transition (which could corrupt the transition state).
   */
  _triggerPause() {
    if (this.scene.isPaused('GameScene') || this._transitioning) return;

    this.scene.pause('GameScene');
    this.scene.launch('PauseScene', {
      sessionId:   this.sessionId,
      currentZone: this.currentZoneIndex,
      currentRoom: this.currentRoomIndex,
      lives:       this.player?.lives   ?? 3,
      health:      this.player?.health  ?? 100,
      ammo:        this.player?.ammo    ?? 10,
      score:       this.player?.score   ?? 0,
    });
  }

  // ============================================================
  // SAVE
  // ============================================================

  /**
   * POSTs the current game state to the server.
   *
   * Called on: room clear, zone transition, game-over, and pause-to-menu.
   * Silently swallows errors — the game continues whether or not the save succeeds.
   * `sessionId === 'offline'` check prevents a network request during local
   * development without a running Express server.
   */
  async _saveGame() {
    if (this.sessionId === 'offline' || !this.player) return;
    try {
      await fetch(`${API_BASE}/game/save`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          sessionId:   this.sessionId,
          currentZone: this.currentZoneIndex,
          currentRoom: this.currentRoomIndex,
          lives:       this.player.lives,
          health:      this.player.health,
          ammo:        this.player.ammo,
          score:       this.player.score,
        }),
      });
    } catch { /* server offline — no save, game continues */ }
  }

  // ============================================================
  // SHUTDOWN
  // ============================================================

  /**
   * Removes all scene-level event listeners when GameScene stops.
   *
   * Without this, restarting GameScene (on zone transition) would accumulate
   * duplicate listeners on the same emitter, firing the callbacks multiple times
   * per event.
   */
  shutdown() {
    this.events.off('enemy-killed');
    this.events.off('boss-killed');
    this.events.off('player-respawn');
    this.events.off('game-over');
  }
}
