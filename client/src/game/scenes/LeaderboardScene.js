/**
 * @fileoverview LeaderboardScene — fetches and displays the top 10 high scores.
 *
 * This is the only scene that uses `async create()` because it needs to fetch
 * scores from the server before rendering the table. Phaser supports async
 * `create()` — it starts the method and the scene becomes active immediately,
 * so the blinking "Loading..." text is visible while the fetch resolves.
 *
 * Table layout (px offsets tuned for 800px canvas width):
 *  - Col 1 (x=65):  Rank number.
 *  - Col 2 (x=135): Player name (uppercased, capped at 12 chars).
 *  - Col 3 (x=375): Score (zero-padded to 8 digits for alignment).
 *  - Col 4 (x=535): Zones completed.
 *  - Col 5 (x=610): "BOSS!" badge if `killedFinalBoss` is true.
 *
 * Failure handling:
 *  If the server is offline or returns an error, the loading spinner text
 *  changes to an offline message. The back button still works.
 *
 * @module scenes/LeaderboardScene
 */

import { API_BASE } from '../config';

/**
 * LeaderboardScene — shows the top-10 score table fetched from the server.
 */
export default class LeaderboardScene extends Phaser.Scene {
  constructor() {
    super('LeaderboardScene');
  }

  // ============================================================
  // INIT
  // ============================================================

  /**
   * @param {object}  [data]
   * @param {boolean} [data.fromGameOver] - True when navigated from GameOverScene;
   *                                        changes back button label to "PLAY AGAIN".
   */
  init(data) {
    this._fromGameOver = data?.fromGameOver || false;
  }

  // ============================================================
  // CREATE
  // ============================================================

  /**
   * Renders the static layout, fetches scores asynchronously, then either
   * renders the score rows or shows an offline fallback message.
   *
   * `async create()` is valid in Phaser 3 — the scene activates immediately
   * and the async work runs in the background while Phaser renders frames.
   */
  async create() {
    const { width, height } = this.cameras.main;
    const cx = width / 2;

    // Canada snow bg — thematically appropriate for the "Hall of fame".
    this.add.image(cx, height / 2, 'bg_canada').setAlpha(0.3);

    // ── Header ────────────────────────────────────────────────────────────────
    this.add.text(cx, 20, 'HALL OF POOKIE SIGMA', {
      fontSize: '11px', color: '#ffcc00',
      fontFamily: "'Press Start 2P'", stroke: '#000', strokeThickness: 4,
    }).setOrigin(0.5);

    this.add.text(cx, 46, 'Warriors who faced the BULLZ of ZULLZ', {
      fontSize: '5px', color: '#ff8800', fontFamily: "'Press Start 2P'",
      stroke: '#000', strokeThickness: 1,
    }).setOrigin(0.5);

    // ── Column headers ────────────────────────────────────────────────────────
    this.add.text(60,  75, 'RANK',  { fontSize: '6px', color: '#888888', fontFamily: "'Press Start 2P'" });
    this.add.text(130, 75, 'NAME',  { fontSize: '6px', color: '#888888', fontFamily: "'Press Start 2P'" });
    this.add.text(370, 75, 'SCORE', { fontSize: '6px', color: '#888888', fontFamily: "'Press Start 2P'" });
    this.add.text(530, 75, 'ZONES', { fontSize: '6px', color: '#888888', fontFamily: "'Press Start 2P'" });

    const divider = this.add.graphics();
    divider.lineStyle(1, 0x444444).lineBetween(40, 87, width - 40, 87);

    // ── Loading indicator ─────────────────────────────────────────────────────
    const loadingText = this.add.text(cx, 200, 'Loading scores...', {
      fontSize: '7px', color: '#aaaaaa', fontFamily: "'Press Start 2P'",
    }).setOrigin(0.5);
    // Blink repeat: -1 loops until killed.
    this.tweens.add({ targets: loadingText, alpha: 0, duration: 400, yoyo: true, repeat: -1 });

    // ── Fetch and render ──────────────────────────────────────────────────────
    try {
      const resp = await fetch(`${API_BASE}/scores?limit=10`);
      if (!resp.ok) throw new Error('fetch failed');

      const scores = await resp.json();
      loadingText.destroy();
      this._renderScores(scores);
    } catch {
      // Stop the blink tween so the static error message is readable.
      loadingText.setText('Server offline — no scores available').setStyle({ color: '#ff8800' });
      this.tweens.killTweensOf(loadingText);
    }

    // ── Back/Play Again button ────────────────────────────────────────────────
    // Label changes based on whether we came from GameOverScene.
    this._createButton(cx, height - 40, this._fromGameOver ? 'PLAY AGAIN' : 'BACK', () => {
      this.scene.start('MenuScene');
    });
  }

  // ============================================================
  // SCORE TABLE
  // ============================================================

  /**
   * Renders one row per score entry.
   *
   * Top-3 entries get gold/silver/bronze colours to match the medal podium convention.
   * Scores are zero-padded to 8 digits so all numbers align in the fixed-width column.
   * The "BOSS!" badge calls out the rare achievement of defeating the final boss.
   *
   * @param {Array<{playerName: string, score: number, zonesCompleted: number, killedFinalBoss: boolean}>} scores
   */
  _renderScores(scores) {
    if (!scores.length) {
      this.add.text(this.cameras.main.width / 2, 200, 'No scores yet!\nBe the first!', {
        fontSize: '7px', color: '#ffffff', fontFamily: "'Press Start 2P'", align: 'center',
      }).setOrigin(0.5);
      return;
    }

    const rankColors = ['#ffcc00', '#cccccc', '#cc8844']; // Gold, silver, bronze.

    scores.forEach((entry, i) => {
      const y     = 100 + i * 30;
      const color = i < 3 ? rankColors[i] : '#ffffff';

      this.add.text(65,  y, `${i + 1}.`, { fontSize: '7px', color, fontFamily: "'Press Start 2P'" });
      // Uppercase and cap at 12 chars to match the submission constraint.
      this.add.text(135, y, entry.playerName.toUpperCase().slice(0, 12), {
        fontSize: '7px', color, fontFamily: "'Press Start 2P'",
      });
      // Zero-padded score for visual column alignment.
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

  // ============================================================
  // BUTTON FACTORY
  // ============================================================

  /**
   * Creates a styled interactive navigation button.
   *
   * @param {number}   x       - Horizontal centre.
   * @param {number}   y       - Vertical centre.
   * @param {string}   label   - Display text (shown as `[ LABEL ]`).
   * @param {Function} onClick - Click callback.
   * @returns {Phaser.GameObjects.Text}
   */
  _createButton(x, y, label, onClick) {
    const btn = this.add.text(x, y, `[ ${label} ]`, {
      fontSize: '8px', color: '#ffffff', fontFamily: "'Press Start 2P'",
      stroke: '#000', strokeThickness: 3,
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    btn.on('pointerover', () => btn.setStyle({ color: '#ffcc00' }));
    btn.on('pointerout',  () => btn.setStyle({ color: '#ffffff' }));
    btn.on('pointerdown', onClick);
    return btn;
  }
}
