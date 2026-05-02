/**
 * LeaderboardScene — fetches and displays the top 10 high scores.
 */
export default class LeaderboardScene extends Phaser.Scene {
  constructor() {
    super('LeaderboardScene');
  }

  init(data) {
    this._fromGameOver = data?.fromGameOver || false;
  }

  async create() {
    const { width, height } = this.cameras.main;
    const cx = width / 2;

    this.add.image(cx, height / 2, 'bg_canada').setAlpha(0.3);

    this.add.text(cx, 20, 'HALL OF POOKIE SIGMA', {
      fontSize: '11px', color: '#ffcc00',
      fontFamily: "'Press Start 2P'", stroke: '#000', strokeThickness: 4,
    }).setOrigin(0.5);

    this.add.text(cx, 46, 'Warriors who faced the BULLZ of ZULLZ', {
      fontSize: '5px', color: '#ff8800', fontFamily: "'Press Start 2P'",
      stroke: '#000', strokeThickness: 1,
    }).setOrigin(0.5);

    // Headers
    this.add.text(60, 75, 'RANK', { fontSize: '6px', color: '#888888', fontFamily: "'Press Start 2P'" });
    this.add.text(130, 75, 'NAME', { fontSize: '6px', color: '#888888', fontFamily: "'Press Start 2P'" });
    this.add.text(370, 75, 'SCORE', { fontSize: '6px', color: '#888888', fontFamily: "'Press Start 2P'" });
    this.add.text(530, 75, 'ZONES', { fontSize: '6px', color: '#888888', fontFamily: "'Press Start 2P'" });

    // Divider
    const divider = this.add.graphics();
    divider.lineStyle(1, 0x444444).lineBetween(40, 87, width - 40, 87);

    const loadingText = this.add.text(cx, 200, 'Loading scores...', {
      fontSize: '7px', color: '#aaaaaa', fontFamily: "'Press Start 2P'",
    }).setOrigin(0.5);

    this.tweens.add({ targets: loadingText, alpha: 0, duration: 400, yoyo: true, repeat: -1 });

    try {
      const resp = await fetch('/api/scores?limit=10');
      if (!resp.ok) throw new Error('fetch failed');

      const scores = await resp.json();
      loadingText.destroy();
      this._renderScores(scores);
    } catch {
      loadingText.setText('Server offline — no scores available').setStyle({ color: '#ff8800' });
      this.tweens.killTweensOf(loadingText);
    }

    // Back button
    this._createButton(cx, height - 40, this._fromGameOver ? 'PLAY AGAIN' : 'BACK', () => {
      this.scene.start('MenuScene');
    });
  }

  _renderScores(scores) {
    if (!scores.length) {
      this.add.text(this.cameras.main.width / 2, 200, 'No scores yet!\nBe the first!', {
        fontSize: '7px', color: '#ffffff', fontFamily: "'Press Start 2P'", align: 'center',
      }).setOrigin(0.5);
      return;
    }

    const medals = ['🥇', '🥈', '🥉'];
    const rankColors = ['#ffcc00', '#cccccc', '#cc8844'];

    scores.forEach((entry, i) => {
      const y = 100 + i * 30;
      const color = i < 3 ? rankColors[i] : '#ffffff';
      const rank = i < 3 ? (medals[i] || `${i + 1}.`) : `${i + 1}.`;

      this.add.text(65, y, `${i + 1}.`, { fontSize: '7px', color, fontFamily: "'Press Start 2P'" });
      this.add.text(135, y, entry.playerName.toUpperCase().slice(0, 12), {
        fontSize: '7px', color, fontFamily: "'Press Start 2P'",
      });
      this.add.text(375, y, String(entry.score).padStart(8, '0'), {
        fontSize: '7px', color: '#ffdd00', fontFamily: "'Press Start 2P'",
      });
      this.add.text(535, y, String(entry.zonesCompleted), {
        fontSize: '7px', color: '#88ff88', fontFamily: "'Press Start 2P'",
      });
      if (entry.killedFinalBoss) {
        this.add.text(610, y, 'BOSS!', {
          fontSize: '5px', color: '#ff4400', fontFamily: "'Press Start 2P'",
        });
      }
    });
  }

  _createButton(x, y, label, onClick) {
    const btn = this.add.text(x, y, `[ ${label} ]`, {
      fontSize: '8px', color: '#ffffff', fontFamily: "'Press Start 2P'",
      stroke: '#000', strokeThickness: 3,
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    btn.on('pointerover', () => btn.setStyle({ color: '#ffcc00' }));
    btn.on('pointerout', () => btn.setStyle({ color: '#ffffff' }));
    btn.on('pointerdown', onClick);
    return btn;
  }
}
