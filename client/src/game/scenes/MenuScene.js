/**
 * @fileoverview MenuScene — the main title screen.
 *
 * Layout (top to bottom):
 *  - "BULLZULLY" title + subtitle
 *  - Lore ticker (cycles 5 flavour lines every 2.4s)
 *  - Player sprite showcase (3× scale, centred)
 *  - PLAY, CONTINUE, LEADERBOARD buttons
 *  - Controls reference strip
 *  - Version tag (bottom-right)
 *
 * Session persistence:
 *  - Each browser gets a UUID stored in localStorage under 'bullzully_session'.
 *  - `_getSessionId()` generates the ID on first visit; subsequent visits reuse it.
 *  - CONTINUE calls `/api/game/load/:sessionId` and passes the save data directly
 *    to GameScene. If the server is offline or returns 404, it starts fresh.
 *
 * @module scenes/MenuScene
 */

import { API_BASE } from '../config';

/**
 * MenuScene — title screen with Play, Continue, and Leaderboard options.
 */
export default class MenuScene extends Phaser.Scene {
  constructor() {
    super('MenuScene');
  }

  // ============================================================
  // CREATE
  // ============================================================

  /**
   * Builds all title screen UI elements.
   * Greenpath background is shown at 50% alpha as an atmospheric backdrop.
   */
  create() {
    const { width, height } = this.cameras.main;
    const cx = width / 2;

    // Greenpath forest bg at half-alpha — sets the tone without obscuring text.
    this.add.image(cx, height / 2, 'bg_greenpath').setAlpha(0.5);

    // ── Title ────────────────────────────────────────────────────────────────
    this.add.text(cx, 70, 'BULLZULLY', {
      fontSize: '28px', color: '#ff4400',
      fontFamily: "'Press Start 2P'", stroke: '#000000', strokeThickness: 6,
    }).setOrigin(0.5);

    this.add.text(cx, 110, 'THE POOKIE GIGMA CHRONICLES', {
      fontSize: '7px', color: '#ffcc00',
      fontFamily: "'Press Start 2P'", stroke: '#000', strokeThickness: 3,
    }).setOrigin(0.5);

    this.add.text(cx, 138, 'Stop Bulladi Chuttar Lamdiya in Canada!', {
      fontSize: '5px', color: '#aaaaaa',
      fontFamily: "'Press Start 2P'",
    }).setOrigin(0.5);

    // ── Lore ticker ───────────────────────────────────────────────────────────
    // Cycles every 2.4s with a 200ms fade-out/in so it reads cleanly.
    // Uses cross-fade rather than an instant swap to avoid jarring cuts.
    const loreTicker = [
      'Defeat Chaasi Chuuma in the Dungeon!',
      'Face the BULLZ of ZULLZ — if you dare!',
      'Pookie Sigma stands in your way...',
      'ZULLZ of BULLZ: the final trial awaits!',
      'Mr. Magheiba will not forgive you.',
    ];
    const tickerText = this.add.text(cx, 155, loreTicker[0], {
      fontSize: '5px', color: '#ff6600',
      fontFamily: "'Press Start 2P'", stroke: '#000', strokeThickness: 1,
    }).setOrigin(0.5);

    let tickIdx = 0;
    this.time.addEvent({
      delay: 2400,
      loop: true,
      callback: () => {
        tickIdx = (tickIdx + 1) % loreTicker.length;
        this.tweens.add({
          targets: tickerText, alpha: 0, duration: 200,
          onComplete: () => {
            tickerText.setText(loreTicker[tickIdx]);
            this.tweens.add({ targets: tickerText, alpha: 1, duration: 200 });
          },
        });
      },
    });

    // ── Player sprite showcase ────────────────────────────────────────────────
    // y=240 leaves a 43px gap below the lore ticker so there's breathing room.
    // Scale 3 makes the 28×36px sprite visible without blur.
    this.add.image(cx, 240, 'player').setScale(3);

    // ── Navigation buttons ────────────────────────────────────────────────────
    // Shifted down to sit below the sprite (y ≥ 308).
    this._createButton(cx, 308, 'PLAY', () => {
      this.scene.start('GameScene', {
        zoneIndex: 0, lives: 3, score: 0, sessionId: this._getSessionId(),
      });
    });

    this._createButton(cx, 344, 'CONTINUE', () => this._loadGame());
    this._createButton(cx, 380, 'LEADERBOARD', () => this.scene.start('LeaderboardScene'));

    // ── Controls strip ────────────────────────────────────────────────────────
    this.add.text(cx, 420, 'WASD/ARROWS: Move   Z/SPACE: Jump', {
      fontSize: '5px', color: '#888888', fontFamily: "'Press Start 2P'",
    }).setOrigin(0.5);
    this.add.text(cx, 434, 'X: Melee   C: Ranged   V/SHIFT: BULLZ', {
      fontSize: '5px', color: '#888888', fontFamily: "'Press Start 2P'",
    }).setOrigin(0.5);

    // ── Version tag ───────────────────────────────────────────────────────────
    this.add.text(width - 10, height - 10, 'v1.0', {
      fontSize: '5px', color: '#444444', fontFamily: "'Press Start 2P'",
    }).setOrigin(1);
  }

  // ============================================================
  // BUTTON FACTORY
  // ============================================================

  /**
   * Creates a styled, interactive text button with hover/press colour changes.
   *
   * The PLAY button additionally binds the Enter key so the game can be started
   * from keyboard alone — important for players who don't reach for the mouse.
   *
   * The 80ms `delayedCall` on click gives the pressed colour time to render
   * before the scene transition resets everything.
   *
   * @param {number}   x       - Horizontal centre of the button.
   * @param {number}   y       - Vertical centre of the button.
   * @param {string}   label   - Button text (shown as `> LABEL <`).
   * @param {Function} onClick - Called when the button is pressed.
   * @returns {Phaser.GameObjects.Text} The created text object.
   */
  _createButton(x, y, label, onClick) {
    const btn = this.add.text(x, y, `> ${label} <`, {
      fontSize: '10px', color: '#ffffff',
      fontFamily: "'Press Start 2P'", stroke: '#000', strokeThickness: 3,
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    btn.on('pointerover',  () => btn.setStyle({ color: '#ffcc00' }));
    btn.on('pointerout',   () => btn.setStyle({ color: '#ffffff' }));
    btn.on('pointerdown', () => {
      btn.setStyle({ color: '#ff4400' });
      this.time.delayedCall(80, onClick);
    });

    // PLAY is the primary action — binding Enter makes it keyboard-accessible.
    if (label === 'PLAY') {
      const enter = this.input.keyboard.addKey('ENTER');
      enter.on('down', onClick);
    }

    return btn;
  }

  // ============================================================
  // SESSION MANAGEMENT
  // ============================================================

  /**
   * Returns the browser's persistent session ID, creating one if it doesn't exist.
   *
   * Format: `sess_<timestamp>_<6-char random>` — collision probability is negligible
   * for a game with a small simultaneous player count.
   *
   * @returns {string} Session ID.
   */
  _getSessionId() {
    let id = localStorage.getItem('bullzully_session');
    if (!id) {
      id = 'sess_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
      localStorage.setItem('bullzully_session', id);
    }
    return id;
  }

  // ============================================================
  // SAVE LOADING
  // ============================================================

  /**
   * Fetches the player's save from the server and starts GameScene with that data.
   *
   * Failure cases:
   *  - 404 / non-OK: no save found — show a brief message, then start fresh.
   *  - Network error (catch): server offline — show a brief message, then start fresh.
   *
   * In both failure cases the player still gets into the game rather than being
   * stuck on a broken Continue button.
   */
  async _loadGame() {
    const sessionId = this._getSessionId();
    try {
      const resp = await fetch(`${API_BASE}/game/load/${sessionId}`);
      if (!resp.ok) {
        this._showMsg('No save found. Starting fresh!');
        this.time.delayedCall(1200, () => {
          this.scene.start('GameScene', { zoneIndex: 0, lives: 3, score: 0, sessionId });
        });
        return;
      }
      const save = await resp.json();
      this.scene.start('GameScene', {
        zoneIndex:   save.currentZone || 0,
        currentRoom: save.currentRoom || 0,
        lives:       save.lives       ?? 3,
        score:       save.score       || 0,
        health:      save.health      || 100,
        ammo:        save.ammo        || 10,
        sessionId,
      });
    } catch {
      this._showMsg('Server offline. Starting fresh!');
      this.time.delayedCall(1200, () => {
        this.scene.start('GameScene', { zoneIndex: 0, lives: 3, score: 0, sessionId });
      });
    }
  }

  // ============================================================
  // FEEDBACK
  // ============================================================

  /**
   * Shows a transient message below the subtitle for 1s then fades it out.
   * Used to communicate save-load outcomes without blocking the UI.
   *
   * @param {string} msg - Text to display.
   */
  _showMsg(msg) {
    const cx = this.cameras.main.width / 2;
    const t = this.add.text(cx, 180, msg, {
      fontSize: '6px', color: '#ffaa00', fontFamily: "'Press Start 2P'",
      stroke: '#000', strokeThickness: 2,
    }).setOrigin(0.5).setDepth(20);
    // 800ms delay before fade — enough time to read the one-liner.
    this.tweens.add({ targets: t, alpha: 0, duration: 1000, delay: 800,
      onComplete: () => t.destroy() });
  }
}
