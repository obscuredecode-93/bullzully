/**
 * @fileoverview HUDScene — the persistent heads-up display overlay.
 *
 * Architecture:
 *  HUDScene is launched in parallel with GameScene via `scene.launch('HUDScene', data)`.
 *  It has its own update loop (runs while GameScene runs or is paused) and communicates
 *  exclusively through GameScene's event emitter — no direct method calls on Player.
 *
 * Why a separate scene for the HUD?
 *  - Phaser cameras are per-scene. A HUD that lives inside GameScene would need
 *    `setScrollFactor(0)` on every element. A separate scene uses a fixed camera
 *    automatically — cleaner and avoids accidental world-space positioning bugs.
 *
 * Layout:
 *  - Top-left:   "HP" label + health bar (green→orange→red gradient).
 *  - Top-right:  Life icons (3 hearts, dim when lost) + pause button.
 *  - Top-centre: Zone name.
 *  - Mid-left:   Ammo counter.
 *  - Mid-right:  Score.
 *  - Bottom-left: BULLZ cooldown bar (polled each frame from player state).
 *
 * BULLZ bar design:
 *  The bar is polled in `update()` rather than event-driven because the cooldown
 *  ticks every frame — firing an event 60× per second would flood the emitter.
 *  A ready-flash fires once via `_wasBullzOnCooldown` state tracking.
 *
 * @module scenes/HUDScene
 */

import { PLAYER_MAX_HEALTH, PLAYER_MAX_AMMO, GAME_WIDTH } from '../config';

/**
 * HUDScene — runs in parallel with GameScene; renders all fixed HUD elements.
 * Listens to GameScene's event emitter for state changes.
 */
export default class HUDScene extends Phaser.Scene {
  constructor() {
    super('HUDScene');
  }

  // ============================================================
  // INIT
  // ============================================================

  /**
   * Receives initial player state from GameScene's `scene.launch` call.
   * Stored so `create()` can render the correct values before any events fire.
   *
   * @param {object} data
   * @param {number} data.lives    - Starting lives count.
   * @param {number} data.health   - Starting health.
   * @param {number} data.ammo     - Starting ammo.
   * @param {number} data.score    - Starting score (non-zero on CONTINUE).
   * @param {string} data.zoneName - Zone display name shown in the HUD centre.
   */
  init(data) {
    this._lives    = data.lives    ?? 3;
    this._health   = data.health   ?? PLAYER_MAX_HEALTH;
    this._ammo     = data.ammo     ?? 10;
    this._score    = data.score    ?? 0;
    this._zoneName = data.zoneName ?? '';
  }

  // ============================================================
  // CREATE
  // ============================================================

  /**
   * Builds every HUD element and wires up event listeners to GameScene.
   */
  create() {
    const { width } = this.cameras.main;

    // ── Health bar (top-left) ─────────────────────────────────────────────────
    this.add.text(8, 8, 'HP', {
      fontSize: '6px', color: '#00ff00', fontFamily: "'Press Start 2P'",
    });

    this._hpBg   = this.add.graphics();
    this._hpFill = this.add.graphics();
    this._drawHealthBar();

    // ── Life icons (top-right, offset left for pause button) ──────────────────
    this._lifeIcons = [];
    for (let i = 0; i < 3; i++) {
      this._lifeIcons.push(
        this.add.image(width - 76 - i * 22, 10, 'hud_life').setOrigin(1, 0)
      );
    }
    this._updateLives();

    // ── Pause button (top-right corner) ──────────────────────────────────────
    // Emits 'pause-requested' on GameScene's emitter rather than calling
    // scene.pause() directly — lets GameScene decide if pausing is allowed.
    const pauseBtn = this.add.text(width - 8, 8, '[ II ]', {
      fontSize: '7px', color: '#ffffff',
      fontFamily: "'Press Start 2P'", stroke: '#000', strokeThickness: 2,
    }).setOrigin(1, 0).setInteractive({ useHandCursor: true });

    pauseBtn.on('pointerover', () => pauseBtn.setStyle({ color: '#ffcc00' }));
    pauseBtn.on('pointerout',  () => pauseBtn.setStyle({ color: '#ffffff' }));
    pauseBtn.on('pointerdown', () => {
      const gameScene = this.scene.get('GameScene');
      if (gameScene && !gameScene.scene.isPaused()) {
        gameScene.events.emit('pause-requested');
      }
    });

    // ── Zone name (top-centre) ────────────────────────────────────────────────
    this._zoneText = this.add.text(width / 2, 6, this._zoneName, {
      fontSize: '5px', color: '#ffcc00', fontFamily: "'Press Start 2P'",
      stroke: '#000', strokeThickness: 2,
    }).setOrigin(0.5, 0);

    // ── Ammo counter (below HP bar) ───────────────────────────────────────────
    this._ammoText = this.add.text(8, 30, `AMMO: ${this._ammo}`, {
      fontSize: '6px', color: '#ffdd00', fontFamily: "'Press Start 2P'",
    });

    // ── Score (top-right, below life icons) ───────────────────────────────────
    this._scoreText = this.add.text(width - 8, 30, `SC: ${this._score}`, {
      fontSize: '6px', color: '#ffffff', fontFamily: "'Press Start 2P'",
    }).setOrigin(1, 0);

    // ── Dark top strip ─────────────────────────────────────────────────────────
    // Depth -1 so it renders behind text but above the game world camera.
    // 65% opacity: dark enough to read text, light enough to see the zone.
    const bg = this.add.graphics();
    bg.fillStyle(0x000000, 0.65);
    bg.fillRect(0, 0, width, 50);
    bg.setDepth(-1);

    // ── BULLZ cooldown bar (bottom-left) ─────────────────────────────────────
    const { height } = this.cameras.main;
    this._height = height;

    const bottomBg = this.add.graphics();
    bottomBg.fillStyle(0x000000, 0.65);
    bottomBg.fillRect(0, height - 24, 260, 24);
    bottomBg.setDepth(-1);

    this.add.text(8, height - 18, 'BULLZ:', {
      fontSize: '6px', color: '#ffcc00', fontFamily: "'Press Start 2P'",
    }).setDepth(1);

    this._bullzBarBg   = this.add.graphics().setDepth(1);
    this._bullzBarFill = this.add.graphics().setDepth(2);
    this._bullzTimer   = this.add.text(225, height - 12, '', {
      fontSize: '5px', color: '#888888', fontFamily: "'Press Start 2P'",
    }).setOrigin(0, 0.5).setDepth(3);

    // Tracks whether the cooldown was active last frame — used to fire the
    // "BULLZ READY!" pulse exactly once when it completes.
    this._wasBullzOnCooldown = false;

    this._drawBullzBar(0, false, false, 8000);

    // ── Wire GameScene event listeners ────────────────────────────────────────
    const gameScene = this.scene.get('GameScene');
    if (gameScene) {
      gameScene.events.on('health-changed', (v) => { this._health = v; this._drawHealthBar(); });
      gameScene.events.on('lives-changed',  (v) => { this._lives  = v; this._updateLives(); });
      gameScene.events.on('ammo-changed',   (v) => { this._ammo   = v; this._ammoText.setText(`AMMO: ${v}`); });
      gameScene.events.on('score-changed',  (v) => { this._score  = v; this._scoreText.setText(`SC: ${v}`); });
      gameScene.events.on('zone-changed', (name) => this._zoneText.setText(name));
    }
  }

  // ============================================================
  // HP BAR
  // ============================================================

  /**
   * Redraws the health bar.
   *
   * Colour transitions:
   *  - > 50% HP: green  (safe)
   *  - > 25% HP: orange (warning)
   *  - ≤ 25% HP: red    (critical)
   *
   * The white shine strip (top 4px of fill) adds a pixel-art highlight
   * without needing a separate texture.
   */
  _drawHealthBar() {
    const pct = Math.max(0, this._health / PLAYER_MAX_HEALTH);
    const bx = 28, by = 8, bw = 180, bh = 14;

    this._hpBg.clear();
    this._hpBg.fillStyle(0x220000).fillRect(bx, by, bw, bh);
    this._hpBg.lineStyle(1, 0x880000).strokeRect(bx, by, bw, bh);

    this._hpFill.clear();
    const color = pct > 0.5 ? 0x22cc22 : pct > 0.25 ? 0xffaa00 : 0xff2222;
    this._hpFill.fillStyle(color).fillRect(bx + 1, by + 1, Math.floor((bw - 2) * pct), bh - 2);
    // White shine strip — only visible when bar has some fill.
    this._hpFill.fillStyle(0xffffff, 0.3).fillRect(bx + 1, by + 1, Math.floor((bw - 2) * pct), 4);
  }

  // ============================================================
  // LIFE ICONS
  // ============================================================

  /**
   * Dims life icons for lost lives.
   * Alpha 0.2 (not 0) so the empty slots are still hinted at — the player
   * can see how many they started with.
   */
  _updateLives() {
    this._lifeIcons.forEach((icon, i) => {
      icon.setAlpha(i < this._lives ? 1 : 0.2);
    });
  }

  // ============================================================
  // UPDATE (per-frame BULLZ poll)
  // ============================================================

  /**
   * Polls the player's BULLZ cooldown state each frame.
   *
   * Polling (rather than events) is the right approach here because the
   * cooldown changes every frame — an event per tick would overwhelm the
   * emitter queue. The `_wasBullzOnCooldown` flag ensures `_flashBullzReady()`
   * fires only once per cooldown completion.
   */
  update() {
    const player = this.scene.get('GameScene')?.player;
    if (!player) return;

    const cooldown = player.bullzCooldown ?? 0;
    const ready    = cooldown <= 0;
    const active   = player.bullzActive   ?? false;
    // pct: 0 = empty (just used), 1 = full (ready).
    const pct = ready ? 1 : 1 - cooldown / (player.bullzCooldownMax || 8000);

    this._drawBullzBar(pct, ready, active, cooldown);

    // One-shot flash when cooldown completes.
    if (this._wasBullzOnCooldown && ready && !active) {
      this._wasBullzOnCooldown = false;
      this._flashBullzReady();
    }
    if (!ready) this._wasBullzOnCooldown = true;
  }

  // ============================================================
  // BULLZ BAR RENDERING
  // ============================================================

  /**
   * Redraws the BULLZ cooldown bar with appropriate colours for each state.
   *
   * Three visual states:
   *  - Recharging: dim orange fill, grey border, countdown label.
   *  - Ready:      gold fill with shine, gold border, "READY!" label.
   *  - Active:     bright yellow fill with shine, gold border, "ACTIVE!" label.
   *
   * @param {number}  pct       - Fill fraction 0–1.
   * @param {boolean} ready     - Whether the ability is off cooldown.
   * @param {boolean} active    - Whether BULLZ is currently active.
   * @param {number}  cooldownMs - Remaining cooldown in ms (for the countdown label).
   */
  _drawBullzBar(pct, ready, active, cooldownMs) {
    const h  = this._height || this.cameras.main.height;
    const bx = 60, bw = 160, bh = 10, by = h - 19;

    // Background track
    this._bullzBarBg.clear();
    this._bullzBarBg.fillStyle(0x110800).fillRect(bx, by, bw, bh);
    const borderCol = (ready || active) ? 0xffcc00 : 0x443300;
    this._bullzBarBg.lineStyle(1, borderCol).strokeRect(bx, by, bw, bh);

    // Fill
    this._bullzBarFill.clear();
    if (pct > 0) {
      const fillCol = active ? 0xffff44 : ready ? 0xffcc00 : 0x886600;
      const fillW   = Math.floor((bw - 2) * pct);
      this._bullzBarFill.fillStyle(fillCol).fillRect(bx + 1, by + 1, fillW, bh - 2);
      // Shine strip when powered up — matches the HP bar's shine pattern.
      if (ready || active) {
        this._bullzBarFill.fillStyle(0xffffff, 0.4).fillRect(bx + 1, by + 1, fillW, 3);
      }
    }

    // Label
    if (active) {
      this._bullzTimer.setText('ACTIVE!').setStyle({ color: '#ffff44' });
    } else if (ready) {
      this._bullzTimer.setText('READY!').setStyle({ color: '#ffcc00' });
    } else {
      // Show ceiling seconds (Math.ceil) so "0s" never appears while the bar isn't full.
      this._bullzTimer.setText(`${Math.ceil(cooldownMs / 1000)}s`).setStyle({ color: '#888888' });
    }
  }

  // ============================================================
  // READY FLASH
  // ============================================================

  /**
   * Shows a centred "BULLZ READY!" pulse when the cooldown completes.
   *
   * Scale punch (×1.25, yoyo×2) draws the eye without lasting long enough
   * to block gameplay reading. The text then fades out over 400ms.
   */
  _flashBullzReady() {
    const cx = this.cameras.main.width  / 2;
    const t  = this.add.text(cx, this.cameras.main.height / 2 - 40, 'BULLZ READY!', {
      fontSize: '13px', color: '#ffcc00',
      fontFamily: "'Press Start 2P'", stroke: '#000', strokeThickness: 5,
    }).setOrigin(0.5).setDepth(28);

    this.tweens.add({
      targets: t,
      scaleX: 1.25, scaleY: 1.25,
      duration: 180, yoyo: true, repeat: 2,
      onComplete: () => {
        this.tweens.add({ targets: t, alpha: 0, duration: 400,
          onComplete: () => t.destroy() });
      },
    });
  }

  // ============================================================
  // SHUTDOWN
  // ============================================================

  /**
   * Removes all event listeners when HUDScene stops.
   *
   * Failing to remove listeners would leave dangling callbacks that try to
   * update destroyed text objects after the scene restarts (e.g., on zone
   * transition where `scene.restart` is used).
   */
  shutdown() {
    const gameScene = this.scene.get('GameScene');
    if (gameScene) {
      gameScene.events.off('health-changed');
      gameScene.events.off('lives-changed');
      gameScene.events.off('ammo-changed');
      gameScene.events.off('score-changed');
      gameScene.events.off('zone-changed');
    }
  }
}
