import { ROOM_WIDTH, ROOM_HEIGHT, TILE_SIZE, PLAYER_MAX_LIVES, PLAYER_MAX_AMMO } from '../config';
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

const ZONES = [Greenpath, DiscordVoid, MagheibaDungeon, Canada];
const ENEMY_CLASSES = { PookieSigma, DiscordGhoster, BrainrotSpreader, ZullbullyKnight };
const PICKUP_TEXTURES = {
  health: 'pickup_health',
  ammo:   'pickup_ammo',
  speed:  'pickup_speed',
  shield: 'pickup_shield',
};

export default class GameScene extends Phaser.Scene {
  constructor() {
    super('GameScene');
  }

  // ─── INIT ────────────────────────────────────────────────────────────────
  init(data) {
    this.currentZoneIndex  = data.zoneIndex    ?? 0;
    this.currentRoomIndex  = data.currentRoom  ?? 0;
    this.sessionId         = data.sessionId    || 'offline';
    this._initLives        = data.lives        ?? PLAYER_MAX_LIVES;
    this._initHealth       = data.health       ?? 100;
    this._initAmmo         = data.ammo         ?? PLAYER_MAX_AMMO;
    this._initScore        = data.score        ?? 0;
    this.zonesCompleted    = data.zonesCompleted ?? 0;
    this._rooms            = [];
    this._roomCleared      = false;
    this._transitioning    = false;
    this._bossActive       = false;
    this.boss              = null;
    this.player            = null;
    // Colliders added per-boss are stored here so we can remove them on room clear
    this._bossColliders    = [];
  }

  // ─── CREATE ──────────────────────────────────────────────────────────────
  create() {
    try {
      this._buildScene();
    } catch (err) {
      // Surface any startup error as visible on-screen text instead of a silent freeze
      console.error('[GameScene] create() failed:', err);
      this.add.text(
        this.cameras.main.width / 2,
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

  _buildScene() {
    this.physics.world.setBounds(0, 0, ROOM_WIDTH, ROOM_HEIGHT);
    this.enemyClasses = ENEMY_CLASSES;

    // Generate zone rooms
    const zoneConfig = ZONES[this.currentZoneIndex] || ZONES[0];
    this.zoneConfig = zoneConfig;
    const seed = Date.now() ^ (this.currentZoneIndex * 0x9e3779b9);
    this._rooms = new ProceduralGen(seed).generateZone(zoneConfig);

    // Background (parallax scroll factor)
    this.add.image(400, 240, zoneConfig.bgTileKey).setScrollFactor(0.2).setDepth(-5);

    // ── Physics groups ──────────────────────────────────────────────────────
    this.platformGroup    = this.physics.add.staticGroup();
    // FIX: use physics.add.group() so Phaser's arcade overlap detects enemies correctly
    this.enemies          = this.physics.add.group();
    this.pickups          = this.physics.add.staticGroup();
    this.playerProjectiles = this.physics.add.group();
    this.enemyProjectiles  = this.physics.add.group();

    // Player
    this.player = new Player(this, 120, 380);
    this.player.health = this._initHealth;
    this.player.lives  = this._initLives;
    this.player.ammo   = this._initAmmo;
    this.player.score  = this._initScore;

    // Camera
    this.cameras.main.setWorldBounds(0, 0, ROOM_WIDTH, ROOM_HEIGHT);
    this.cameras.main.startFollow(this.player, true, 0.08, 0.08);
    this.cameras.main.setFollowOffset(0, 60);

    // Colliders that apply to the whole session (not per-room)
    this._setupPermanentColliders();

    // Input
    this.cursors = this.input.keyboard.createCursorKeys();
    this.keys = this.input.keyboard.addKeys({
      A: Phaser.Input.Keyboard.KeyCodes.A,
      D: Phaser.Input.Keyboard.KeyCodes.D,
      W: Phaser.Input.Keyboard.KeyCodes.W,
      S: Phaser.Input.Keyboard.KeyCodes.S,
      Z: Phaser.Input.Keyboard.KeyCodes.Z,
      X: Phaser.Input.Keyboard.KeyCodes.X,
      C: Phaser.Input.Keyboard.KeyCodes.C,
      SPACE: Phaser.Input.Keyboard.KeyCodes.SPACE,
    });

    this._setupEvents();

    // Launch HUD in parallel
    this.scene.launch('HUDScene', {
      lives: this.player.lives,
      health: this.player.health,
      ammo:   this.player.ammo,
      score:  this.player.score,
      zoneName: zoneConfig.name,
    });
    this.events.emit('zone-changed', zoneConfig.name);

    this._loadRoom(this.currentRoomIndex);

    // ESC = quick-save
    this.input.keyboard.addKey('ESC').on('down', () => this._saveGame());
  }

  // ─── UPDATE ──────────────────────────────────────────────────────────────
  update(time) {
    if (!this.player || this.player.isDead) return;

    this.player.update(this.cursors, this.keys, time);

    this.enemies.getChildren().forEach(e => {
      if (e.active && e.update) e.update(this.player, time);
    });

    if (this.boss?.active && this.boss.update) {
      this.boss.update(this.player, time);
    }

    // Destroy out-of-bounds projectiles
    this.playerProjectiles.getChildren().forEach(p => {
      if (p.x < -32 || p.x > ROOM_WIDTH + 32) p.destroy();
    });
    this.enemyProjectiles.getChildren().forEach(p => {
      if (p.x < -32 || p.x > ROOM_WIDTH + 32 || p.y > ROOM_HEIGHT + 32) p.destroy();
    });

    // Walk through right-side door to advance room
    if (!this._transitioning && this._roomCleared && this.player.x > ROOM_WIDTH - 80) {
      this._goToNextRoom();
    }
  }

  // ─── PERMANENT COLLIDERS (survive room transitions) ──────────────────────
  _setupPermanentColliders() {
    // Player lands on platforms
    this.physics.add.collider(this.player, this.platformGroup);

    // Player melee hitbox hits enemies
    this.physics.add.overlap(
      this.player.getMeleeHitbox(),
      this.enemies,
      (hitbox, enemy) => {
        if (!hitbox.active || !enemy.active || !enemy.takeDamage) return;
        enemy.takeDamage(25);
        this._showHitSpark(enemy.x, enemy.y);
      }
    );

    // Player bullets hit enemies
    this.physics.add.overlap(
      this.playerProjectiles,
      this.enemies,
      (bullet, enemy) => {
        if (!bullet.active || !enemy.active) return;
        enemy.takeDamage(bullet.getData('damage') || 30);
        this._showHitSpark(bullet.x, bullet.y);
        bullet.destroy();
      }
    );

    // Player bullets destroyed by terrain
    this.physics.add.collider(
      this.playerProjectiles,
      this.platformGroup,
      (bullet) => bullet.destroy()
    );

    // Enemy projectiles hit player
    this.physics.add.overlap(
      this.player,
      this.enemyProjectiles,
      (player, proj) => {
        if (!proj.active) return;
        player.takeDamage(proj.getData('damage') || 15);
        proj.destroy();
      }
    );

    // Player collects pickups
    this.physics.add.overlap(
      this.player,
      this.pickups,
      (_pl, pickup) => this._collectPickup(pickup)
    );

    // Enemy bodies hurt player on contact
    this.physics.add.overlap(
      this.player,
      this.enemies,
      (player, enemy) => {
        if (!enemy.active || player.damageCooldown > 0) return;
        player.takeDamage(enemy.damage || 10);
      }
    );

    // Enemies land on platforms
    this.physics.add.collider(this.enemies, this.platformGroup);
  }

  // ─── PER-BOSS COLLIDERS (added when boss spawns, removed on clear) ───────
  _addBossColliders(boss) {
    this._bossColliders = [
      // Melee hits boss
      this.physics.add.overlap(
        this.player.getMeleeHitbox(),
        boss,
        (hitbox, b) => {
          if (!hitbox.active || !b.active) return;
          b.takeDamage(25);
          this._showHitSpark(b.x, b.y - 20);
        }
      ),
      // Bullets hit boss
      this.physics.add.overlap(
        this.playerProjectiles,
        boss,
        (bullet, b) => {
          if (!bullet.active || !b.active) return;
          b.takeDamage(bullet.getData('damage') || 30);
          this._showHitSpark(bullet.x, bullet.y);
          bullet.destroy();
        }
      ),
      // Boss lands on platforms
      this.physics.add.collider(boss, this.platformGroup),
    ];
  }

  _removeBossColliders() {
    this._bossColliders.forEach(c => {
      if (c) this.physics.world.removeCollider(c);
    });
    this._bossColliders = [];
  }

  // ─── ROOM LOADING ────────────────────────────────────────────────────────
  _loadRoom(roomIndex) {
    this._clearRoom();
    this._roomCleared = false;

    const room = this._rooms[roomIndex];
    if (!room) return;

    this.currentRoom      = room;
    this.currentRoomIndex = roomIndex;

    // Build static platforms
    room.platforms.forEach(p => this._buildPlatform(p.x, p.y, p.w, p.h));
    // No manual platformGroup.refresh() — each create() + refreshBody() call handles it

    // Door starts closed
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
        this._updateDoorState();
      });
    }

    // Move player to left edge on room transitions
    if (roomIndex > 0) {
      this.player.setPosition(80, ROOM_HEIGHT - 80);
    }
  }

  _buildPlatform(x, y, w, h) {
    const cellsW  = Math.ceil(w / TILE_SIZE);
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
      tile.refreshBody();
    }
  }

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

  // ─── SPAWNING ────────────────────────────────────────────────────────────
  _spawnEnemies(spawns) {
    if (!spawns?.length) return;
    spawns.forEach(spawn => {
      const EnemyClass = ENEMY_CLASSES[spawn.type];
      if (!EnemyClass) return;
      const enemy = new EnemyClass(this, spawn.x, spawn.y);
      this.enemies.add(enemy, true);  // true = also add to scene display list
    });
  }

  _spawnBoss(room) {
    const spawn = room.bossSpawn || { x: ROOM_WIDTH / 2, y: ROOM_HEIGHT - 100 };
    this._bossActive = true;

    this.boss = room.bossType === 'MagheibaChaasi'
      ? new MagheibaChaasi(this, spawn.x, spawn.y)
      : new BullyMaguire(this, spawn.x, spawn.y);

    // FIX: add boss colliders via proper Phaser objects, not fake groups
    this._addBossColliders(this.boss);

    this.cameras.main.shake(500, 0.01);
    this._showRoomMessage(
      room.bossType === 'BullyMaguire'
        ? 'BULLY MAGUIRE aka BULLADI!'
        : 'MR. MAGHEIBA: CHAASI CHUUMA!',
      '#ff4400'
    );
  }

  _spawnPickups(spawns) {
    if (!spawns?.length) return;
    spawns.forEach(spawn => {
      const texKey = PICKUP_TEXTURES[spawn.type] || 'pickup_health';
      const pickup = this.pickups.create(spawn.x, spawn.y, texKey);
      pickup.setData('type', spawn.type).setDepth(4);
      this.tweens.add({ targets: pickup, y: spawn.y - 8, duration: 900, yoyo: true, repeat: -1 });
    });
  }

  // ─── EVENTS ──────────────────────────────────────────────────────────────
  _setupEvents() {
    this.events.on('enemy-killed', ({ score, x, y }) => {
      this.player.addScore(score);
      this._floatScore(score, x, y);
      this._checkRoomClear();
    });

    this.events.on('boss-killed', ({ score, finalBoss, victoryText }) => {
      this.player.addScore(score);
      this.zonesCompleted++;
      this._removeBossColliders();

      if (finalBoss) {
        this._saveGame();
        this.time.delayedCall(3500, () => {
          if (victoryText?.active) victoryText.destroy();
          this.scene.stop('HUDScene');
          this.scene.start('GameOverScene', {
            score: this.player.score,
            zonesCompleted: this.zonesCompleted,
            killedFinalBoss: true,
            sessionId: this.sessionId,
            victory: true,
          });
        });
      } else {
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
          zonesCompleted: this.zonesCompleted,
          killedFinalBoss: false,
          sessionId: this.sessionId,
          victory: false,
        });
      });
    });
  }

  // ─── ROOM CLEAR LOGIC ────────────────────────────────────────────────────
  _checkRoomClear() {
    const alive = this.enemies.getChildren().filter(e => e.active && !e.dead);
    if (alive.length === 0 && !this._roomCleared && !this._bossActive) {
      this._roomCleared = true;
      this._openDoor();
      this._showRoomMessage('ROOM CLEARED!', '#00ff00');
      this._saveGame();
    }
  }

  _updateDoorState() {
    const hasEnemies = this.enemies.getChildren().some(e => e.active);
    if (!hasEnemies && !this._roomCleared) {
      this._roomCleared = true;
      this._openDoor();
    }
  }

  _openDoor() {
    if (!this._door || this._doorOpen) return;
    this._doorOpen    = true;
    this._roomCleared = true;
    this._door.setTexture('door_open');

    this.tweens.add({ targets: this._door, alpha: 0.7, duration: 400, yoyo: true, repeat: -1 });

    const arrow = this.add.text(ROOM_WIDTH - 32, 350, '→', {
      fontSize: '16px', color: '#ffcc00', fontFamily: "'Press Start 2P'",
    }).setOrigin(0.5).setDepth(15);
    this.tweens.add({ targets: arrow, x: arrow.x + 12, duration: 500, yoyo: true, repeat: -1 });
  }

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

  _goToNextZone() {
    const nextZone = this.currentZoneIndex + 1;
    this.zonesCompleted++;

    if (nextZone >= ZONES.length) {
      this.scene.stop('HUDScene');
      this.scene.start('GameOverScene', {
        score: this.player.score,
        zonesCompleted: this.zonesCompleted,
        victory: true, killedFinalBoss: true,
        sessionId: this.sessionId,
      });
      return;
    }

    this._showRoomMessage(`ZONE CLEAR!\nEntering: ${ZONES[nextZone].name}`, '#ffcc00');
    this._saveGame();

    this.time.delayedCall(1800, () => {
      this.scene.stop('HUDScene');
      this.scene.restart({
        zoneIndex: nextZone, currentRoom: 0,
        lives: this.player.lives, score: this.player.score,
        health: this.player.health, ammo: this.player.ammo,
        sessionId: this.sessionId, zonesCompleted: this.zonesCompleted,
      });
    });
  }

  // ─── PICKUPS ─────────────────────────────────────────────────────────────
  _collectPickup(pickup) {
    const type = pickup.getData('type');
    this.tweens.killTweensOf(pickup);
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

  // ─── VISUAL HELPERS ──────────────────────────────────────────────────────
  _showHitSpark(x, y) {
    const spark = this.add.image(x, y, 'hit_spark').setDepth(16).setScale(0.8);
    this.tweens.add({ targets: spark, alpha: 0, scale: 1.5, duration: 180,
      onComplete: () => spark.destroy() });
  }

  _floatScore(score, x, y) {
    const t = this.add.text(x, y - 20, `+${score}`, {
      fontSize: '7px', color: '#ffdd00', fontFamily: "'Press Start 2P'",
      stroke: '#000', strokeThickness: 2,
    }).setDepth(20).setOrigin(0.5);
    this.tweens.add({ targets: t, y: t.y - 35, alpha: 0, duration: 900,
      onComplete: () => t.destroy() });
    this.events.emit('score-changed', this.player.score);
  }

  _showFloatText(x, y, msg, color) {
    const t = this.add.text(x, y - 10, msg, {
      fontSize: '6px', color, fontFamily: "'Press Start 2P'",
      stroke: '#000', strokeThickness: 2,
    }).setDepth(20).setOrigin(0.5);
    this.tweens.add({ targets: t, y: t.y - 30, alpha: 0, duration: 1000,
      onComplete: () => t.destroy() });
  }

  _showRoomMessage(msg, color = '#ffffff') {
    // FIX: scrollFactor(0) objects use canvas coordinates — use width/2 not scrollX + width/2
    const cx = this.cameras.main.width / 2;
    msg.split('\n').forEach((line, i) => {
      const t = this.add.text(cx, 170 + i * 24, line, {
        fontSize: '10px', color, fontFamily: "'Press Start 2P'",
        stroke: '#000000', strokeThickness: 4,
      }).setScrollFactor(0).setDepth(25).setOrigin(0.5);
      this.tweens.add({ targets: t, y: t.y - 30, alpha: 0, duration: 1800, delay: 500,
        onComplete: () => t.destroy() });
    });
  }

  // ─── SAVE ────────────────────────────────────────────────────────────────
  async _saveGame() {
    if (this.sessionId === 'offline' || !this.player) return;
    try {
      await fetch('/api/game/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId:   this.sessionId,
          currentZone: this.currentZoneIndex,
          currentRoom: this.currentRoomIndex,
          lives:  this.player.lives,
          health: this.player.health,
          ammo:   this.player.ammo,
          score:  this.player.score,
        }),
      });
    } catch { /* server offline — silent */ }
  }

  shutdown() {
    this.events.off('enemy-killed');
    this.events.off('boss-killed');
    this.events.off('player-respawn');
    this.events.off('game-over');
  }
}
