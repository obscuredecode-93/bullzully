/**
 * @fileoverview GameOverScene — shown when the player loses all lives or beats the game.
 *
 * Dual-purpose: handles both defeat and victory, switching layout based on `data.victory`.
 *
 * Defeat mode:
 *  - "POOKIE GIGMA FELL..." title in red.
 *  - Random epitaph line referencing game characters.
 *
 * Victory mode:
 *  - "CANADA FREED!" title in gold.
 *  - "Bully Maguire DEFEATED!" / "BULLZ of ZULLZ VANQUISHED FOREVER!" lines.
 *
 * Both modes show:
 *  - Final score and zones completed.
 *  - DOM-based name input for leaderboard submission (requires `dom: { createContainer: true }`
 *    in the Phaser game config — without it, `this.add.dom()` throws).
 *  - SUBMIT SCORE / PLAY AGAIN / LEADERBOARD navigation buttons.
 *
 * @module scenes/GameOverScene
 */

/**
 * GameOverScene — end screen for death (all lives lost) or game completion.
 */
export default class GameOverScene extends Phaser.Scene {
  constructor() {
    super('GameOverScene');
  }

  // ============================================================
  // INIT
  // ============================================================

  /**
   * Receives end-state data from GameScene or PauseScene.
   *
   * @param {object}  data
   * @param {number}  data.score           - Final score to display and submit.
   * @param {number}  data.zonesCompleted  - How many zones the player cleared.
   * @param {boolean} data.killedFinalBoss - Whether Bully Maguire was defeated.
   * @param {string}  data.sessionId       - Browser session (for reference).
   * @param {boolean} data.victory         - True for win screen, false for loss screen.
   */
  init(data) {
    this._score          = data.score          || 0;
    this._zonesCompleted = data.zonesCompleted || 0;
    this._killedFinalBoss = data.killedFinalBoss || false;
    this._sessionId      = data.sessionId      || 'unknown';
    this._victory        = data.victory        || false;
  }

  // ============================================================
  // CREATE
  // ============================================================

  /**
   * Builds the full end screen layout, branching on `_victory` for title/subtitle copy.
   *
   * The cave background at 40% alpha is reused for both outcomes — the dark
   * tone works for a funeral mood on defeat and a dramatic finale on victory.
   */
  create() {
    const { width, height } = this.cameras.main;
    const cx = width / 2;

    this.add.image(cx, height / 2, 'bg_cave').setAlpha(0.4);

    // ── Title (victory vs defeat) ─────────────────────────────────────────────
    const title      = this._victory ? 'CANADA FREED!'       : 'POOKIE GIGMA FELL...';
    const titleColor = this._victory ? '#ffcc00'              : '#ff2200';

    this.add.text(cx, 80, title, {
      fontSize: this._victory ? '14px' : '12px', color: titleColor,
      fontFamily: "'Press Start 2P'", stroke: '#000', strokeThickness: 5,
    }).setOrigin(0.5);

    if (this._victory) {
      // Victory subtitle — two lines for readability at small font sizes.
      this.add.text(cx, 110, 'Bully Maguire DEFEATED!', {
        fontSize: '6px', color: '#ffffff', fontFamily: "'Press Start 2P'",
      }).setOrigin(0.5);
      this.add.text(cx, 128, 'BULLZ of ZULLZ VANQUISHED FOREVER!', {
        fontSize: '5px', color: '#ffcc00', fontFamily: "'Press Start 2P'",
        stroke: '#000', strokeThickness: 1,
      }).setOrigin(0.5);
    } else {
      // Defeat: random epitaph from a pool — keeps replays feeling varied.
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

    // ── Score and stats ───────────────────────────────────────────────────────
    this.add.text(cx, 160, `FINAL SCORE: ${this._score}`, {
      fontSize: '10px', color: '#ffffff', fontFamily: "'Press Start 2P'",
      stroke: '#000', strokeThickness: 3,
    }).setOrigin(0.5);

    this.add.text(cx, 190, `Zones completed: ${this._zonesCompleted}`, {
      fontSize: '7px', color: '#aaaaaa', fontFamily: "'Press Start 2P'",
    }).setOrigin(0.5);

    // ── Leaderboard name input ────────────────────────────────────────────────
    // `this.add.dom()` requires `dom: { createContainer: true }` in Phaser config.
    // Without it, Phaser can't append the DOM element to the canvas container.
    this.add.text(cx, 240, 'Enter your name:', {
      fontSize: '7px', color: '#ffffff', fontFamily: "'Press Start 2P'",
    }).setOrigin(0.5);

    this._nameInput = this.add.dom(cx, 270).createFromHTML(
      `<input id="nameInput" type="text" maxlength="12" placeholder="POOKIE"
        style="background:#111;color:#fff;border:2px solid #ff4400;padding:6px;
               font-family:monospace;font-size:14px;text-align:center;width:180px;
               outline:none;" />`
    );

    // ── Navigation buttons ────────────────────────────────────────────────────
    this._submitBtn = this._createButton(cx, 320, 'SUBMIT SCORE', () => this._submitScore());
    this._createButton(cx, 360, 'PLAY AGAIN', () => {
      this.scene.stop();
      this.scene.start('MenuScene');
    });
    this._createButton(cx, 400, 'LEADERBOARD', () => {
      this.scene.start('LeaderboardScene', { fromGameOver: true, score: this._score });
    });

    // ── Status feedback text (below buttons) ──────────────────────────────────
    this._statusText = this.add.text(cx, 440, '', {
      fontSize: '6px', color: '#00ff00', fontFamily: "'Press Start 2P'",
    }).setOrigin(0.5);
  }

  // ============================================================
  // BUTTON FACTORY
  // ============================================================

  /**
   * Creates a styled interactive text button.
   *
   * @param {number}   x       - Horizontal centre.
   * @param {number}   y       - Vertical centre.
   * @param {string}   label   - Display text.
   * @param {Function} onClick - Click callback.
   * @returns {Phaser.GameObjects.Text}
   */
  _createButton(x, y, label, onClick) {
    const btn = this.add.text(x, y, label, {
      fontSize: '8px', color: '#ffffff', fontFamily: "'Press Start 2P'",
      stroke: '#000', strokeThickness: 3,
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    btn.on('pointerover', () => btn.setStyle({ color: '#ffcc00' }));
    btn.on('pointerout',  () => btn.setStyle({ color: '#ffffff' }));
    btn.on('pointerdown', onClick);
    return btn;
  }

  // ============================================================
  // SCORE SUBMISSION
  // ============================================================

  /**
   * Reads the name input, POSTs the score to `/api/scores`, and transitions
   * to LeaderboardScene on success.
   *
   * Name defaults to "POOKIE" if blank — ensures no empty name entries in the DB.
   * The name is trimmed to 12 characters to match the MongoDB schema's maxlength.
   *
   * Failure cases update `_statusText` with a contextual message so the player
   * knows the score wasn't saved without crashing the scene.
   */
  async _submitScore() {
    const nameInput = document.getElementById('nameInput');
    // Trim, cap at 12 chars, fall back to 'POOKIE' if empty after trim.
    const name = (nameInput?.value || 'POOKIE').trim().slice(0, 12) || 'POOKIE';

    this._statusText.setText('Submitting...');

    try {
      const resp = await fetch('/api/scores', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          playerName:      name,
          score:           this._score,
          zonesCompleted:  this._zonesCompleted,
          killedFinalBoss: this._killedFinalBoss,
        }),
      });

      if (resp.ok) {
        this._statusText.setText('Score submitted!').setStyle({ color: '#00ff00' });
        // Brief pause before navigating so the player can read the confirmation.
        this.time.delayedCall(1500, () => this.scene.start('LeaderboardScene'));
      } else {
        this._statusText.setText('Submit failed. Server offline?').setStyle({ color: '#ff4400' });
      }
    } catch {
      this._statusText.setText('Offline — score not saved').setStyle({ color: '#ff8800' });
    }
  }
}
