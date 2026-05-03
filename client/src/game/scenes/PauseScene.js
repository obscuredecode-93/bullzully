/**
 * PauseScene — overlay scene that sits on top of GameScene.
 * GameScene is paused (update/physics frozen), PauseScene runs freely.
 *
 * Panels: Main → Help | Confirm Exit
 */
export default class PauseScene extends Phaser.Scene {
  constructor() {
    super('PauseScene');
  }

  init(data) {
    // Game state passed from GameScene so we can save on exit
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

  create() {
    const { width, height } = this.cameras.main;
    const cx = width / 2;
    const cy = height / 2;

    // ── Dark overlay ─────────────────────────────────────────────────────────
    const overlay = this.add.rectangle(cx, cy, width, height, 0x000000, 0);
    this.tweens.add({ targets: overlay, fillAlpha: 0.75, duration: 150 });

    // ── Build panels ─────────────────────────────────────────────────────────
    this._mainPanel    = this._buildMainPanel(cx, cy);
    this._helpPanel    = this._buildHelpPanel(cx, cy);
    this._confirmPanel = this._buildConfirmPanel(cx, cy);

    // Start with main panel visible, others hidden
    this._showPanel('main');

    // Fade-in the active panel
    this.tweens.add({ targets: this._mainPanel, alpha: { from: 0, to: 1 }, duration: 180 });

    // ESC navigates back or resumes
    this.input.keyboard.on('keydown-ESC', () => {
      if (this._helpPanel.visible || this._confirmPanel.visible) {
        this._showPanel('main');
      } else {
        this._resume();
      }
    });
  }

  // ─── PANEL SWITCHER ────────────────────────────────────────────────────────
  _showPanel(which) {
    this._mainPanel.setVisible(which === 'main');
    this._helpPanel.setVisible(which === 'help');
    this._confirmPanel.setVisible(which === 'confirm');
  }

  // ─── MAIN PANEL ───────────────────────────────────────────────────────────
  _buildMainPanel(cx, cy) {
    const c = this.add.container(cx, cy);

    // Panel background
    c.add(
      this.add.rectangle(0, 0, 380, 260, 0x0a0a0a, 0.96)
        .setStrokeStyle(2, 0xff4400)
    );

    // Title
    c.add(
      this.add.text(0, -95, 'PAUSED', {
        fontSize: '22px', color: '#ff4400',
        fontFamily: "'Press Start 2P'", stroke: '#000', strokeThickness: 5,
      }).setOrigin(0.5)
    );

    // Divider
    const div = this.add.graphics();
    div.lineStyle(1, 0xff4400, 0.4).lineBetween(-160, -60, 160, -60);
    c.add(div);

    // Buttons
    this._addBtn(c,   0, -25, 'RESUME',       () => this._resume());
    this._addBtn(c,   0,  30, 'HELP',          () => this._showPanel('help'));
    this._addBtn(c,   0,  85, 'EXIT TO MENU',  () => this._showPanel('confirm'));

    return c;
  }

  // ─── HELP PANEL ───────────────────────────────────────────────────────────
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
      { heading: 'MOVEMENT',  color: '#ffcc00', items: [
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
        fontSize: '6px', color,
        fontFamily: "'Press Start 2P'",
      }).setOrigin(0.5));
      y += 18;

      items.forEach(line => {
        c.add(this.add.text(0, y, line, {
          fontSize: '5px', color: '#cccccc',
          fontFamily: "'Press Start 2P'",
        }).setOrigin(0.5));
        y += 14;
      });
      y += 8;
    });

    // Goal line
    c.add(this.add.text(0, y + 2, 'GOAL: Defeat Bully Maguire in Canada!', {
      fontSize: '5px', color: '#ff4400',
      fontFamily: "'Press Start 2P'",
    }).setOrigin(0.5));

    // Back button
    this._addBtn(c, 0, 172, '< BACK', () => this._showPanel('main'), '#aaaaaa', '#ffcc00');

    return c;
  }

  // ─── CONFIRM EXIT PANEL ───────────────────────────────────────────────────
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
        fontSize: '6px', color: '#aaaaaa',
        fontFamily: "'Press Start 2P'",
      }).setOrigin(0.5)
    );

    this._addBtn(c, -90, 50, 'YES', () => this._exitToMenu(), '#ff4400', '#ff8888');
    this._addBtn(c,  90, 50, 'NO',  () => this._showPanel('main'));

    return c;
  }

  // ─── SHARED BUTTON HELPER ─────────────────────────────────────────────────
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

  // ─── ACTIONS ──────────────────────────────────────────────────────────────
  _resume() {
    this.scene.resume('GameScene');
    this.scene.stop();
  }

  async _exitToMenu() {
    // Save before leaving
    if (this._save.sessionId !== 'offline') {
      try {
        await fetch('/api/game/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(this._save),
        });
      } catch { /* offline — continue anyway */ }
    }

    this.scene.stop('HUDScene');
    this.scene.stop('GameScene');
    this.scene.stop('PauseScene');
    this.scene.start('MenuScene');
  }
}
