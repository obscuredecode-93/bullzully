/**
 * GameOverScene — shown on death (all lives lost) or game completion.
 */
export default class GameOverScene extends Phaser.Scene {
  constructor() {
    super('GameOverScene');
  }

  init(data) {
    this._score = data.score || 0;
    this._zonesCompleted = data.zonesCompleted || 0;
    this._killedFinalBoss = data.killedFinalBoss || false;
    this._sessionId = data.sessionId || 'unknown';
    this._victory = data.victory || false;
  }

  create() {
    const { width, height } = this.cameras.main;
    const cx = width / 2;

    this.add.image(cx, height / 2, 'bg_cave').setAlpha(0.4);

    const title = this._victory
      ? 'CANADA FREED!'
      : 'POOKIE GIGMA FELL...';

    const titleColor = this._victory ? '#ffcc00' : '#ff2200';

    this.add.text(cx, 80, title, {
      fontSize: this._victory ? '14px' : '12px', color: titleColor,
      fontFamily: "'Press Start 2P'", stroke: '#000', strokeThickness: 5,
    }).setOrigin(0.5);

    if (this._victory) {
      this.add.text(cx, 110, 'Bully Maguire DEFEATED!', {
        fontSize: '6px', color: '#ffffff', fontFamily: "'Press Start 2P'",
      }).setOrigin(0.5);
      this.add.text(cx, 128, 'BULLZ of ZULLZ VANQUISHED FOREVER!', {
        fontSize: '5px', color: '#ffcc00', fontFamily: "'Press Start 2P'",
        stroke: '#000', strokeThickness: 1,
      }).setOrigin(0.5);
    } else {
      // Rotating epitaphs referencing game characters
      const epitaphs = [
        'Chaasi Chuuma laughs from afar...',
        'Even Pookie Sigma had more guts.',
        'The BULLZ of ZULLZ claims another soul.',
        'Mr. Magheiba sends his regards.',
        'ZULLZ of BULLZ: 1 — Pookie GiGma: 0',
        'Pookie Sigma is disappointed in you.',
      ];
      const epitaph = epitaphs[Math.floor(Math.random() * epitaphs.length)];
      this.add.text(cx, 120, epitaph, {
        fontSize: '5px', color: '#888888', fontFamily: "'Press Start 2P'",
        stroke: '#000', strokeThickness: 1,
      }).setOrigin(0.5);
    }

    this.add.text(cx, 160, `FINAL SCORE: ${this._score}`, {
      fontSize: '10px', color: '#ffffff', fontFamily: "'Press Start 2P'",
      stroke: '#000', strokeThickness: 3,
    }).setOrigin(0.5);

    this.add.text(cx, 190, `Zones completed: ${this._zonesCompleted}`, {
      fontSize: '7px', color: '#aaaaaa', fontFamily: "'Press Start 2P'",
    }).setOrigin(0.5);

    // Name input
    this.add.text(cx, 240, 'Enter your name:', {
      fontSize: '7px', color: '#ffffff', fontFamily: "'Press Start 2P'",
    }).setOrigin(0.5);

    // DOM input for name
    this._nameInput = this.add.dom(cx, 270).createFromHTML(
      `<input id="nameInput" type="text" maxlength="12" placeholder="POOKIE"
        style="background:#111;color:#fff;border:2px solid #ff4400;padding:6px;
               font-family:monospace;font-size:14px;text-align:center;width:180px;
               outline:none;" />`
    );

    this._submitBtn = this._createButton(cx, 320, 'SUBMIT SCORE', () => this._submitScore());
    this._createButton(cx, 360, 'PLAY AGAIN', () => {
      this.scene.stop();
      this.scene.start('MenuScene');
    });
    this._createButton(cx, 400, 'LEADERBOARD', () => {
      this.scene.start('LeaderboardScene', { fromGameOver: true, score: this._score });
    });

    this._statusText = this.add.text(cx, 440, '', {
      fontSize: '6px', color: '#00ff00', fontFamily: "'Press Start 2P'",
    }).setOrigin(0.5);
  }

  _createButton(x, y, label, onClick) {
    const btn = this.add.text(x, y, label, {
      fontSize: '8px', color: '#ffffff', fontFamily: "'Press Start 2P'",
      stroke: '#000', strokeThickness: 3,
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    btn.on('pointerover', () => btn.setStyle({ color: '#ffcc00' }));
    btn.on('pointerout', () => btn.setStyle({ color: '#ffffff' }));
    btn.on('pointerdown', onClick);
    return btn;
  }

  async _submitScore() {
    const nameInput = document.getElementById('nameInput');
    const name = (nameInput?.value || 'POOKIE').trim().slice(0, 12) || 'POOKIE';

    this._statusText.setText('Submitting...');

    try {
      const resp = await fetch('/api/scores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerName: name,
          score: this._score,
          zonesCompleted: this._zonesCompleted,
          killedFinalBoss: this._killedFinalBoss,
        }),
      });

      if (resp.ok) {
        this._statusText.setText('Score submitted!').setStyle({ color: '#00ff00' });
        this.time.delayedCall(1500, () => {
          this.scene.start('LeaderboardScene');
        });
      } else {
        this._statusText.setText('Submit failed. Server offline?').setStyle({ color: '#ff4400' });
      }
    } catch {
      this._statusText.setText('Offline — score not saved').setStyle({ color: '#ff8800' });
    }
  }
}
