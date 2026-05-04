/**
 * @fileoverview PauseScene — overlay pause menu that freezes GameScene.
 *
 * Architecture:
 *  Launched via `scene.launch('PauseScene', data)` while GameScene is paused
 *  with `scene.pause('GameScene')`. PauseScene runs its own update loop freely
 *  (overlays don't inherit the paused state of their sibling scenes).
 *
 * Panel hierarchy:
 *  - Main panel:    RESUME / HELP / EXIT TO MENU
 *  - Help panel:    Full controls reference, enemy list, goal. < BACK button.
 *  - Confirm panel: "Exit to main menu?" with YES / NO.
 *
 * ESC key behaviour:
 *  - From help or confirm: returns to main panel.
 *  - From main:            resumes the game.
 *
 * Save on exit:
 *  When the player confirms exit, the current game state (passed in via `init`)
 *  is saved to the server before stopping all active scenes. If the server is
 *  offline the save silently fails — the player still exits cleanly.
 *
 * @module scenes/PauseScene
 */

/**
 * PauseScene — modal overlay pause menu with three panels.
 * GameScene is paused; this scene runs freely as an overlay.
 */
export default class PauseScene extends Phaser.Scene {
  constructor() {
    super('PauseScene');
  }

  // ============================================================
  // INIT
  // ============================================================

  /**
   * Receives the current game state snapshot from GameScene.
   * Used to construct the save payload if the player exits to menu.
   *
   * @param {object} data
   * @param {string} data.sessionId   - Browser session ID for the save endpoint.
   * @param {number} data.currentZone - Active zone index (0–3).
   * @param {number} data.currentRoom - Active room index within the zone.
   * @param {number} data.lives       - Remaining lives.
   * @param {number} data.health      - Current player health.
   * @param {number} data.ammo        - Current ammo count.
   * @param {number} data.score       - Current score.
   */
  init(data) {
    this._save = {
      sessionId:   data.sessionId   || 'offline',
      currentZone: data.currentZone ?? 0,
      currentRoom: data.currentRoom ?? 0,
      lives:       data.lives       ?? 3,
      health:      data.health      ?? 100,
      ammo:        data.ammo        ?? 10,
      score:       data.score       ?? 0,
    };
  }

  // ============================================================
  // CREATE
  // ============================================================

  /**
   * Builds the dark overlay and all three panels, then shows the main panel.
   * ESC key listener is set up here because it spans all panel states.
   */
  create() {
    const { width, height } = this.cameras.main;
    const cx = width  / 2;
    const cy = height / 2;

    // Animated fade-in to 75% opacity — subtle enough to still see the frozen game world.
    const overlay = this.add.rectangle(cx, cy, width, height, 0x000000, 0);
    this.tweens.add({ targets: overlay, fillAlpha: 0.75, duration: 150 });

    this._mainPanel    = this._buildMainPanel(cx, cy);
    this._helpPanel    = this._buildHelpPanel(cx, cy);
    this._confirmPanel = this._buildConfirmPanel(cx, cy);

    this._showPanel('main');
    // Fade-in the main panel independently of the overlay tween.
    this.tweens.add({ targets: this._mainPanel, alpha: { from: 0, to: 1 }, duration: 180 });

    // ESC navigation: back from sub-panels, resume from main.
    this.input.keyboard.on('keydown-ESC', () => {
      if (this._helpPanel.visible || this._confirmPanel.visible) {
        this._showPanel('main');
      } else {
        this._resume();
      }
    });
  }

  // ============================================================
  // PANEL SWITCHER
  // ============================================================

  /**
   * Shows exactly one panel and hides the others.
   * Using `setVisible` keeps all three containers allocated — no destroy/rebuild cycle.
   *
   * @param {'main' | 'help' | 'confirm'} which - Panel to make visible.
   */
  _showPanel(which) {
    this._mainPanel.setVisible(which === 'main');
    this._helpPanel.setVisible(which === 'help');
    this._confirmPanel.setVisible(which === 'confirm');
  }

  // ============================================================
  // MAIN PANEL
  // ============================================================

  /**
   * Builds the primary pause panel: title, divider, and three action buttons.
   *
   * All panels use `this.add.container` so child objects translate together
   * when the container is repositioned.
   *
   * @param {number} cx - Canvas centre X.
   * @param {number} cy - Canvas centre Y.
   * @returns {Phaser.GameObjects.Container}
   */
  _buildMainPanel(cx, cy) {
    const c = this.add.container(cx, cy);

    c.add(
      this.add.rectangle(0, 0, 380, 260, 0x0a0a0a, 0.96)
        .setStrokeStyle(2, 0xff4400)
    );

    c.add(
      this.add.text(0, -95, 'PAUSED', {
        fontSize: '22px', color: '#ff4400',
        fontFamily: "'Press Start 2P'", stroke: '#000', strokeThickness: 5,
      }).setOrigin(0.5)
    );

    // Divider below title — visual separator between header and buttons.
    const div = this.add.graphics();
    div.lineStyle(1, 0xff4400, 0.4).lineBetween(-160, -60, 160, -60);
    c.add(div);

    this._addBtn(c,   0, -25, 'RESUME',      () => this._resume());
    this._addBtn(c,   0,  30, 'HELP',         () => this._showPanel('help'));
    this._addBtn(c,   0,  85, 'EXIT TO MENU', () => this._showPanel('confirm'));

    return c;
  }

  // ============================================================
  // HELP PANEL
  // ============================================================

  /**
   * Builds the controls and enemy reference panel.
   *
   * Sections are generated from a data array so adding a new control/enemy
   * entry only requires one object literal — no layout arithmetic.
   *
   * @param {number} cx - Canvas centre X.
   * @param {number} cy - Canvas centre Y.
   * @returns {Phaser.GameObjects.Container}
   */
  _buildHelpPanel(cx, cy) {
    const c = this.add.container(cx, cy);

    c.add(
      this.add.rectangle(0, 0, 540, 390, 0x0a0a0a, 0.96)
        .setStrokeStyle(2, 0x00ccff)
    );

    c.add(
      this.add.text(0, -175, 'HELP & CONTROLS', {
        fontSize: '9px', color: '#00ccff',
        fontFamily: "'Press Start 2P'", stroke: '#000', strokeThickness: 3,
      }).setOrigin(0.5)
    );

    const div = this.add.graphics();
    div.lineStyle(1, 0x00ccff, 0.35).lineBetween(-240, -155, 240, -155);
    c.add(div);

    const sections = [
      { heading: 'MOVEMENT', color: '#ffcc00', items: [
        'WASD / Arrows — Move left & right',
        'Z / Space / Up — Jump',
      ]},
      { heading: 'COMBAT', color: '#ff8800', items: [
        'X — Melee attack  (short range)',
        'C — Ranged attack (uses ammo)',
      ]},
      { heading: 'OTHER', color: '#aaaaaa', items: [
        'ESC — Pause / Resume',
        'P   — Quick save',
      ]},
      { heading: 'ENEMIES', color: '#ff4444', items: [
        'Pookie Sigma · Discord Ghoster',
        'Brainrot Spreader · Zullbully Knight',
      ]},
      { heading: 'PICKUPS', color: '#00ff88', items: [
        'Health · Ammo · Pookie Shield',
        'Sigma Mode — speed boost (6s)',
      ]},
    ];

    let y = -130;
    sections.forEach(({ heading, color, items }) => {
      c.add(this.add.text(0, y, heading, {
        fontSize: '6px', color, fontFamily: "'Press Start 2P'",
      }).setOrigin(0.5));
      y += 18;

      items.forEach(line => {
        c.add(this.add.text(0, y, line, {
          fontSize: '5px', color: '#cccccc', fontFamily: "'Press Start 2P'",
        }).setOrigin(0.5));
        y += 14;
      });
      y += 8;
    });

    c.add(this.add.text(0, y + 2, 'GOAL: Defeat Bully Maguire in Canada!', {
      fontSize: '5px', color: '#ff4400', fontFamily: "'Press Start 2P'",
    }).setOrigin(0.5));

    this._addBtn(c, 0, 172, '< BACK', () => this._showPanel('main'), '#aaaaaa', '#ffcc00');

    return c;
  }

  // ============================================================
  // CONFIRM PANEL
  // ============================================================

  /**
   * Builds the exit-to-menu confirmation panel.
   * YES triggers `_exitToMenu()` which saves first. NO returns to main.
   *
   * @param {number} cx - Canvas centre X.
   * @param {number} cy - Canvas centre Y.
   * @returns {Phaser.GameObjects.Container}
   */
  _buildConfirmPanel(cx, cy) {
    const c = this.add.container(cx, cy);

    c.add(
      this.add.rectangle(0, 0, 460, 210, 0x0a0a0a, 0.96)
        .setStrokeStyle(2, 0xff8800)
    );

    c.add(
      this.add.text(0, -65, 'Exit to main menu?', {
        fontSize: '9px', color: '#ff8800',
        fontFamily: "'Press Start 2P'", stroke: '#000', strokeThickness: 3,
      }).setOrigin(0.5)
    );

    c.add(
      this.add.text(0, -25, 'Your progress will be saved.', {
        fontSize: '6px', color: '#aaaaaa', fontFamily: "'Press Start 2P'",
      }).setOrigin(0.5)
    );

    // YES is positioned left, NO right — natural "confirm/cancel" layout.
    this._addBtn(c, -90, 50, 'YES', () => this._exitToMenu(), '#ff4400', '#ff8888');
    this._addBtn(c,  90, 50, 'NO',  () => this._showPanel('main'));

    return c;
  }

  // ============================================================
  // BUTTON HELPER
  // ============================================================

  /**
   * Creates a text button with hover/active colour changes and adds it to a container.
   *
   * @param {Phaser.GameObjects.Container} container - Parent container.
   * @param {number}   x     - X relative to container centre.
   * @param {number}   y     - Y relative to container centre.
   * @param {string}   label - Button text.
   * @param {Function} onClick - Click callback.
   * @param {string}   [base='#ffffff']   - Default text colour.
   * @param {string}   [hover='#ffcc00']  - Hover text colour.
   * @returns {Phaser.GameObjects.Text}
   */
  _addBtn(container, x, y, label, onClick, base = '#ffffff', hover = '#ffcc00') {
    const btn = this.add.text(x, y, label, {
      fontSize: '10px', color: base,
      fontFamily: "'Press Start 2P'", stroke: '#000', strokeThickness: 3,
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    btn.on('pointerover', () => btn.setStyle({ color: hover }));
    btn.on('pointerout',  () => btn.setStyle({ color: base }));
    btn.on('pointerdown', onClick);
    container.add(btn);
    return btn;
  }

  // ============================================================
  // ACTIONS
  // ============================================================

  /**
   * Resumes GameScene and stops this overlay scene.
   * `scene.stop()` without arguments stops the currently running scene (PauseScene).
   */
  _resume() {
    this.scene.resume('GameScene');
    this.scene.stop();
  }

  /**
   * Saves game state to the server, then stops all active scenes and returns
   * to the main menu.
   *
   * Save is attempted only when `sessionId !== 'offline'` — prevents a 404
   * request during local development without a running server.
   *
   * The save failure is swallowed because it's more important to exit cleanly
   * than to block the player at the exit panel on a network error.
   */
  async _exitToMenu() {
    if (this._save.sessionId !== 'offline') {
      try {
        await fetch('/api/game/save', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify(this._save),
        });
      } catch { /* server offline — continue without saving */ }
    }

    // Stop all three active scenes before launching MenuScene.
    this.scene.stop('HUDScene');
    this.scene.stop('GameScene');
    this.scene.stop('PauseScene');
    this.scene.start('MenuScene');
  }
}
