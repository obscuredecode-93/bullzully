/**
 * MenuScene — title screen with Play, Continue, and Leaderboard options.
 */
export default class MenuScene extends Phaser.Scene {
  constructor() {
    super('MenuScene');
  }

  create() {
    const { width, height } = this.cameras.main;
    const cx = width / 2;

    this.add.image(cx, height / 2, 'bg_greenpath').setAlpha(0.5);

    // Title
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

    // Lore ticker — cycles through character names
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

    // Player sprite showcase — y=240 keeps 43px clear above the lore ticker
    this.add.image(cx, 240, 'player').setScale(3);

    // Menu options — shifted down to maintain breathing room below sprite
    this._createButton(cx, 308, 'PLAY', () => {
      this.scene.start('GameScene', {
        zoneIndex: 0, lives: 3, score: 0, sessionId: this._getSessionId(),
      });
    });

    this._createButton(cx, 344, 'CONTINUE', () => this._loadGame());
    this._createButton(cx, 380, 'LEADERBOARD', () => this.scene.start('LeaderboardScene'));

    // Controls
    this.add.text(cx, 420, 'WASD/ARROWS: Move   Z/SPACE: Jump', {
      fontSize: '5px', color: '#888888', fontFamily: "'Press Start 2P'",
    }).setOrigin(0.5);
    this.add.text(cx, 434, 'X: Melee   C: Ranged   V/SHIFT: BULLZ', {
      fontSize: '5px', color: '#888888', fontFamily: "'Press Start 2P'",
    }).setOrigin(0.5);

    // Version
    this.add.text(width - 10, height - 10, 'v1.0', {
      fontSize: '5px', color: '#444444', fontFamily: "'Press Start 2P'",
    }).setOrigin(1);
  }

  _createButton(x, y, label, onClick) {
    const btn = this.add.text(x, y, `> ${label} <`, {
      fontSize: '10px', color: '#ffffff',
      fontFamily: "'Press Start 2P'", stroke: '#000', strokeThickness: 3,
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    btn.on('pointerover', () => btn.setStyle({ color: '#ffcc00' }));
    btn.on('pointerout', () => btn.setStyle({ color: '#ffffff' }));
    btn.on('pointerdown', () => {
      btn.setStyle({ color: '#ff4400' });
      this.time.delayedCall(80, onClick);
    });

    // Keyboard: if this is PLAY, also bind Enter
    if (label === 'PLAY') {
      const enter = this.input.keyboard.addKey('ENTER');
      enter.on('down', onClick);
    }

    return btn;
  }

  _getSessionId() {
    let id = localStorage.getItem('bullzully_session');
    if (!id) {
      id = 'sess_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
      localStorage.setItem('bullzully_session', id);
    }
    return id;
  }

  async _loadGame() {
    const sessionId = this._getSessionId();
    try {
      const resp = await fetch(`/api/game/load/${sessionId}`);
      if (!resp.ok) {
        this._showMsg('No save found. Starting fresh!');
        this.time.delayedCall(1200, () => {
          this.scene.start('GameScene', { zoneIndex: 0, lives: 3, score: 0, sessionId });
        });
        return;
      }
      const save = await resp.json();
      this.scene.start('GameScene', {
        zoneIndex: save.currentZone || 0,
        currentRoom: save.currentRoom || 0,
        lives: save.lives ?? 3,
        score: save.score || 0,
        health: save.health || 100,
        ammo: save.ammo || 10,
        sessionId,
      });
    } catch {
      this._showMsg('Server offline. Starting fresh!');
      this.time.delayedCall(1200, () => {
        this.scene.start('GameScene', { zoneIndex: 0, lives: 3, score: 0, sessionId });
      });
    }
  }

  _showMsg(msg) {
    const cx = this.cameras.main.width / 2;
    const t = this.add.text(cx, 180, msg, {
      fontSize: '6px', color: '#ffaa00', fontFamily: "'Press Start 2P'",
      stroke: '#000', strokeThickness: 2,
    }).setOrigin(0.5).setDepth(20);
    this.tweens.add({ targets: t, alpha: 0, duration: 1000, delay: 800,
      onComplete: () => t.destroy() });
  }
}
