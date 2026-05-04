/**
 * @fileoverview BullyMaguire — the final boss of BULLZULLY (Canada, Zone 3).
 *
 * Formerly known as "Zeus Tata aka Bulladi Chuttar Lamdiya". Renamed to Bully Maguire.
 * This is the most mechanically complex fight in the game, with three phases that
 * each fundamentally change the combat dynamic.
 *
 * Phase 1 (100–66% HP) — "FENTANYL RAIN":
 *   Fires a fan of 4 (3 + phase) projectiles every 1.8s aimed at the player.
 *   Dashes toward the player every 4s with a 200ms red-tint telegraph.
 *   Walks at 65px/s toward the player.
 *
 * Phase 2 (66–33% HP) — "YOUR ATTACKS ARE JOKES":
 *   `damageReduction = 0.5` — all incoming damage is halved.
 *   Fires taunts at the player from a pool of 8 strings every 3s.
 *   HP bar turns grey to visually communicate the damage reduction.
 *   Projectile count increases to 5 per volley.
 *
 * Phase 3 (<33% HP) — "FULL CANADA MODE":
 *   Damage reduction drops to 0 — he's desperate and vulnerable.
 *   Projectile fire rate increases (1800ms → 1200ms).
 *   Summons 2 weakened Pookie Sigma minions every 5s.
 *   First summon is immediate. Screen flashes red.
 *
 * @module entities/bosses/ZeusTata
 */

import { flashWhite, showDamageNumber } from '../../utils/combatFX';

/**
 * BullyMaguire (Bulladi Chuttar Lamdiya) — final boss in Canada.
 *
 * Phase 1 (100–66%): Throws "brainrot is fentanyl" projectiles in patterns.
 * Phase 2 (66–33%): Calls your attacks jokes — 50% damage reduction buff + taunts.
 * Phase 3 (<33%):   Full Canada mode — summons Pookie Sigma minions constantly.
 */
export default class BullyMaguire extends Phaser.Physics.Arcade.Sprite {
  /**
   * @param {Phaser.Scene} scene - The active GameScene.
   * @param {number}       x     - Boss spawn X.
   * @param {number}       y     - Boss spawn Y.
   */
  constructor(scene, x, y) {
    super(scene, x, y, 'bully_maguire_boss');
    scene.add.existing(this);
    scene.physics.add.existing(this);

    // ── Stats ─────────────────────────────────────────────────────────────────
    this.hp    = 800; // 60% more HP than the mid-boss (500) — this is the final challenge.
    this.maxHp = 800;
    this.phase = 1;
    this.dead  = false;
    this.score = 5000; // 5× the mid-boss score — defeating him is a major achievement.

    /**
     * Phase 2 sets this to 0.5. All `takeDamage` calls multiply `amount` by
     * `(1 - damageReduction)` before subtracting HP. Phase 3 resets it to 0.
     */
    this.damageReduction = 0;

    this.direction = -1; // Updated every frame to face the player.

    this.body.setSize(56, 74);
    this.body.setOffset(8, 4);
    this.setDepth(8);

    // ── Boss HUD elements (screen-fixed, not world-space) ─────────────────────
    /** @type {Phaser.GameObjects.Graphics} Wide HP bar spanning most of the screen width. */
    this._hpBar = scene.add.graphics().setDepth(15);

    /**
     * Primary name label — stays visible for the entire fight.
     * NOTE: setScrollFactor(0) = screen-space, so it doesn't move with the camera.
     * @type {Phaser.GameObjects.Text}
     */
    this._nameLabel = scene.add.text(
      scene.cameras.main.width / 2, 22,
      'BULLY MAGUIRE aka BULLADI CHUTTAR LAMDIYA', {
        fontSize: '6px', color: '#cc0000',
        fontFamily: "'Press Start 2P'", stroke: '#000000', strokeThickness: 3,
      }
    ).setScrollFactor(0).setOrigin(0.5).setDepth(20);

    /**
     * Phase label — updates text on each phase transition.
     * @type {Phaser.GameObjects.Text}
     */
    this._phaseLabel = scene.add.text(
      scene.cameras.main.width / 2, 36,
      'PHASE 1: FENTANYL RAIN', {
        fontSize: '5px', color: '#ff4400',
        fontFamily: "'Press Start 2P'", stroke: '#000', strokeThickness: 2,
      }
    ).setScrollFactor(0).setOrigin(0.5).setDepth(20);

    this._startPhase1();
  }

  // ============================================================
  // PHASE 1 SETUP
  // ============================================================

  /**
   * Starts the two recurring Phase 1 attack timers.
   * Both timer references are stored so they can be cleaned up on death.
   */
  _startPhase1() {
    // Projectile fan — fires every 1.8s in Phase 1 (reduced to 1.2s in Phase 3).
    this._p1Event = this.scene.time.addEvent({
      delay: 1800, loop: true,
      callback: () => { if (!this.dead) this._fentanylRain(); },
    });

    // Dash — fires every 4s as a positional pressure tool.
    this._dashEvent = this.scene.time.addEvent({
      delay: 4000, loop: true,
      callback: () => { if (!this.dead) this._dash(); },
    });
  }

  // ============================================================
  // PROJECTILE VOLLEY
  // ============================================================

  /**
   * Fires a fan of `3 + phase` projectiles spread around the aim angle to the player.
   *
   * Projectiles are staggered by 80ms each so they don't all spawn at the same instant.
   * The spread formula ensures the leftmost and rightmost projectiles are always ±0.35 rad
   * regardless of count, so the fan coverage stays consistent across phases.
   *
   * Phase 3 uses the red 'boss_bullet_p3' texture instead of 'boss_bullet_p1'.
   */
  _fentanylRain() {
    if (!this.scene.player?.active) return;
    const player = this.scene.player;

    // Count = 4 in Phase 1, 5 in Phase 2, 6 in Phase 3.
    const count     = 3 + this.phase;
    const baseAngle = Phaser.Math.Angle.Between(this.x, this.y, player.x, player.y);

    for (let i = 0; i < count; i++) {
      // Spread: evenly distributes projectiles across a ±0.35 rad arc.
      const spread = ((i - Math.floor(count / 2)) / count) * 0.7;

      // Stagger each projectile by 80ms to create a visible "spray" effect.
      this.scene.time.delayedCall(i * 80, () => {
        if (!this.active || !this.scene.player?.active) return;

        const bullet = this.scene.physics.add.image(
          this.x + (this.direction * 30), // Spawn from the direction the boss is facing.
          this.y - 20,
          this.phase >= 3 ? 'boss_bullet_p3' : 'boss_bullet_p1'
        ).setDepth(7);

        bullet.setData('damage', this.phase >= 3 ? 22 : 18); // Phase 3 hits harder.
        bullet.setData('isEnemyProjectile', true);
        bullet.body.setAllowGravity(false); // Projectiles travel in straight lines.

        // Speed scales with phase so later phases are harder to dodge.
        const spd = 200 + this.phase * 25; // Phase 1=225, Phase 2=250, Phase 3=275.
        bullet.setVelocity(
          Math.cos(baseAngle + spread) * spd,
          Math.sin(baseAngle + spread) * spd
        );

        // Auto-destroy after 3s to prevent off-screen projectile accumulation.
        this.scene.time.delayedCall(3000, () => { if (bullet.active) bullet.destroy(); });
        this.scene.enemyProjectiles.add(bullet);
      });
    }
  }

  // ============================================================
  // DASH ATTACK
  // ============================================================

  /**
   * A telegraphed horizontal dash:
   *  1. Red-pink tint for 200ms (wind-up signal).
   *  2. Dash at 320px/s for 500ms in the player's current direction.
   *
   * The 200ms telegraph is intentionally short — skilled players can dodge,
   * but new players will be caught.
   */
  _dash() {
    if (!this.scene.player?.active) return;
    const dir = this.scene.player.x > this.x ? 1 : -1;

    this.setTint(0xffdddd); // Pale pink telegraph.
    this.scene.time.delayedCall(200, () => {
      this.clearTint();
      this.setVelocityX(dir * 320);
      this.scene.time.delayedCall(500, () => this.setVelocityX(0));
    });
  }

  // ============================================================
  // MAIN UPDATE
  // ============================================================

  /**
   * Per-frame: check phase transitions, face the player, slow approach.
   *
   * @param {import('../Player').default} player - Player sprite.
   * @param {number} time - Phaser elapsed time (unused).
   */
  update(player, time) {
    if (this.dead || !this.active) return;
    this._updateHPBar();

    const pct = this.hp / this.maxHp;
    if (pct < 0.66 && this.phase === 1) this._enterPhase2();
    if (pct < 0.33 && this.phase === 2) this._enterPhase3();

    this.direction = player.x < this.x ? -1 : 1;
    this.setFlipX(this.direction < 0);

    // Slow approach — bully Maguire isn't fast, but the projectiles do the work.
    const dist = Math.abs(this.x - player.x);
    if (dist > 180 && !this._dashing) {
      // Speed increases slightly each phase: 65, 75, 85 px/s.
      this.setVelocityX(this.direction * (55 + this.phase * 10));
    } else if (dist <= 180) {
      this.setVelocityX(0); // Stop at a comfortable firing distance.
    }
  }

  // ============================================================
  // PHASE TRANSITIONS
  // ============================================================

  /**
   * Phase 2: Apply 50% damage reduction, start taunting, update HUD label.
   * The grey tint on the sprite communicates the damage reduction to the player visually.
   */
  _enterPhase2() {
    this.phase           = 2;
    this.damageReduction = 0.5; // All hits now deal half damage.
    this._phaseLabel.setText('PHASE 2: YOUR ATTACKS ARE JOKES LUL');
    this.scene.cameras.main.shake(400, 0.008);

    // Grey tint persists for the entire Phase 2 to signal the damage reduction.
    this.setTint(0x888888);

    // Taunts are drawn from this pool randomly every 3s.
    const taunts = [
      "lmaooo u call that an attack?",
      "bruh ratio",
      "skill issue fr",
      "gg ez no re",
      "I am the BULLZ of ZULLZ, you are nothing!",
      "Pookie Sigma hits harder than you lol",
      "ZULLZ of BULLZ cannot be stopped!",
      "even Chaasi Chuuma is disappointed",
    ];

    this._tauntEvent = this.scene.time.addEvent({
      delay: 3000, loop: true,
      callback: () => {
        if (this.dead) return;
        const t    = taunts[Math.floor(Math.random() * taunts.length)];
        const text = this.scene.add.text(this.x, this.y - 50, t, {
          fontSize: '6px', color: '#aaaaaa',
          fontFamily: "'Press Start 2P'", stroke: '#000', strokeThickness: 2,
        }).setDepth(20).setOrigin(0.5);
        this.scene.tweens.add({
          targets: text, y: text.y - 25, alpha: 0, duration: 1200,
          onComplete: () => text.destroy(),
        });
      },
    });

    this._showPhaseText('PHASE 2: BULLZ of ZULLZ AWAKENS!\nDamage Reduction: 50%\nYour hits mean nothing!');
  }

  /**
   * Phase 3: Remove damage reduction (vulnerable again), speed up projectiles,
   * start summoning Pookie Sigma minions every 5s.
   */
  _enterPhase3() {
    this.phase           = 3;
    this.damageReduction = 0; // Reduction drops — desperation makes him reckless.
    this.clearTint();         // Remove the grey Phase 2 tint.
    this._phaseLabel.setText('PHASE 3: FULL CANADA MODE');

    this._tauntEvent?.remove(); // Stop taunting — he's past words now.

    // Reduce projectile interval from 1800ms to 1200ms.
    this._p1Event.delay = 1200;

    // Strong shake + red camera flash for a dramatic Phase 3 entrance.
    this.scene.cameras.main.shake(1000, 0.018);
    this.scene.cameras.main.flash(500, 204, 0, 0); // 204,0,0 = dark red tint.

    // Recurring minion spawns every 5s.
    this._minionEvent = this.scene.time.addEvent({
      delay: 5000, loop: true,
      callback: () => { if (!this.dead) this._summonMinions(); },
    });

    this._summonMinions(); // Immediate first summon on entering Phase 3.
    this._showPhaseText('PHASE 3: FULL CANADA MODE!\nZULLZ of BULLZ RISES!\nPOOKIE SIGMA: REPORT FOR DUTY!');
  }

  // ============================================================
  // MINION SUMMON (Phase 3)
  // ============================================================

  /**
   * Spawns two weakened Pookie Sigma minions 200px to each side of the boss.
   * Summoned minions have 30 HP (vs 50 for regular Pookie Sigmas) to keep
   * the fight fair while still adding pressure.
   *
   * NOTE: Minion positions are clamped to [60, 1860] so they can't spawn
   * inside the room boundary walls.
   */
  _summonMinions() {
    const PookieSigma = this.scene.enemyClasses?.PookieSigma;
    if (!PookieSigma) return;

    const spawnPoints = [
      { x: this.x - 200, y: 416 }, // Left flank.
      { x: this.x + 200, y: 416 }, // Right flank.
    ];

    spawnPoints.forEach(pos => {
      const clampedX = Phaser.Math.Clamp(pos.x, 60, 1860);
      const minion   = new PookieSigma(this.scene, clampedX, pos.y);
      minion.hp = 30; // Weaker than a standalone Pookie Sigma.
      this.scene.enemies.add(minion);
      if (this.scene.platformGroup) {
        this.scene.physics.add.collider(minion, this.scene.platformGroup);
      }
      this.scene.physics.add.collider(minion, this.scene.enemies);
    });

    // Announce the summon with a floating text above the boss.
    const txt = this.scene.add.text(
      this.x, this.y - 60, 'POOKIE SIGMA BACKUP!', {
        fontSize: '6px', color: '#ff0000',
        fontFamily: "'Press Start 2P'", stroke: '#fff', strokeThickness: 2,
      }
    ).setDepth(20).setOrigin(0.5);
    this.scene.tweens.add({
      targets: txt, y: txt.y - 30, alpha: 0, duration: 1000,
      onComplete: () => txt.destroy(),
    });
  }

  // ============================================================
  // PHASE TEXT OVERLAY
  // ============================================================

  /**
   * Displays a multi-line centred announcement that floats up over 2.5s.
   * Each line is a separate text object so they can have independent positions.
   *
   * @param {string} msg - Newline-separated announcement text.
   */
  _showPhaseText(msg) {
    const lines = msg.split('\n');
    lines.forEach((line, i) => {
      const text = this.scene.add.text(
        this.scene.cameras.main.width  / 2,
        this.scene.cameras.main.height / 2 - 20 + i * 20,
        line, {
          fontSize: '8px', color: '#ffcc00',
          fontFamily: "'Press Start 2P'", stroke: '#000', strokeThickness: 4,
        }
      ).setScrollFactor(0).setOrigin(0.5).setDepth(25);

      // 500ms delay before fading so the player has time to read it.
      this.scene.tweens.add({
        targets: text, y: text.y - 50, alpha: 0, duration: 2500, delay: 500,
        onComplete: () => text.destroy(),
      });
    });
  }

  // ============================================================
  // COMBAT
  // ============================================================

  /**
   * Apply damage with Phase 2 damage reduction applied.
   *
   * `actual` is the post-reduction value — this is what the HP bar reflects
   * and what the floating damage number shows (so the player can see the reduction).
   *
   * @param {number} amount - Raw incoming damage (post-BULLZ multiplier from GameScene).
   */
  takeDamage(amount) {
    if (this.dead) return;

    // Apply damage reduction: 0 in Phase 1/3, 0.5 in Phase 2.
    const actual = Math.floor(amount * (1 - this.damageReduction));
    this.hp -= actual;

    // In Phase 2, display "REDUCED: X" to explain why hits seem weak.
    if (this.damageReduction > 0) {
      const txt = this.scene.add.text(
        this.x + Phaser.Math.Between(-20, 20), this.y - 40,
        `REDUCED: ${actual}`, {
          fontSize: '5px', color: '#888888', fontFamily: "'Press Start 2P'",
        }
      ).setDepth(20).setOrigin(0.5);
      this.scene.tweens.add({ targets: txt, y: txt.y - 20, alpha: 0, duration: 700,
        onComplete: () => txt.destroy() });
    }

    flashWhite(this.scene, this);
    // Show the ACTUAL (post-reduction) damage number, not the raw input.
    showDamageNumber(this.scene, this.x, this.y - 40, actual);

    // Brief alpha flash — gives tactile confirmation the hit landed even when tinted grey.
    this.scene.tweens.add({ targets: this, alpha: 0.4, duration: 80, yoyo: true });

    if (this.hp <= 0) this.die();
  }

  // ============================================================
  // DEATH
  // ============================================================

  /**
   * Epic 8-burst death sequence. Emits 'boss-killed' with `finalBoss: true`
   * so GameScene triggers the victory screen instead of opening a door.
   *
   * The `victoryText` is created here and passed to GameScene in the event payload
   * so GameScene can destroy it once the GameOverScene transition completes.
   */
  die() {
    if (this.dead) return;
    this.dead = true;

    // Remove all HUD elements and timer events immediately.
    this._hpBar.destroy();
    this._nameLabel.destroy();
    this._phaseLabel.destroy();
    this._p1Event?.remove();
    this._dashEvent?.remove();
    this._tauntEvent?.remove();
    this._minionEvent?.remove();

    // Maximum shake (1500ms, 0.02 intensity) — the strongest in the game.
    this.scene.cameras.main.shake(1500, 0.02);
    // Red flash to punctuate the boss dying.
    this.scene.cameras.main.flash(1000, 204, 0, 0);

    // 8 explosion bursts at random offsets, staggered 150ms apart.
    for (let i = 0; i < 8; i++) {
      this.scene.time.delayedCall(i * 150, () => {
        if (!this.scene) return;
        const fx = this.scene.add.image(
          this.x + Phaser.Math.Between(-50, 50),
          this.y + Phaser.Math.Between(-50, 50),
          'death_burst'
        )
          .setScale(2 + Math.random() * 2) // Random scale 2×–4×.
          .setDepth(22)
          .setTint(0xcc0000);

        this.scene.tweens.add({ targets: fx, alpha: 0, scale: 5, duration: 600,
          onComplete: () => fx.destroy() });
      });
    }

    // Victory text — centred, screen-fixed, depth 30 (above everything).
    const victoryText = this.scene.add.text(
      this.scene.cameras.main.width  / 2,
      this.scene.cameras.main.height / 2,
      'BULLY MAGUIRE DEFEATED!\nBULLZ of ZULLZ VANQUISHED!\nCANADA IS FREE!', {
        fontSize: '8px', color: '#ffcc00', align: 'center',
        fontFamily: "'Press Start 2P'", stroke: '#000', strokeThickness: 4,
      }
    ).setScrollFactor(0).setOrigin(0.5).setDepth(30);

    // Emit with `finalBoss: true` so GameScene navigates to the victory screen.
    this.scene.events.emit('boss-killed', {
      score:      this.score,
      bossType:   'BullyMaguire',
      finalBoss:  true,
      victoryText, // GameScene destroys this before starting GameOverScene.
    });

    this.scene.time.delayedCall(1000, () => this.destroy());
  }

  // ============================================================
  // HUD
  // ============================================================

  /**
   * Redraws the boss HP bar at the top-centre of the screen.
   *
   * Bar colour reflects phase:
   *  - Phase 1: Red (0xff2222)
   *  - Phase 2: Grey (0x888888) — signals damage reduction
   *  - Phase 3: Dark red (0xcc0000) — desperate and enraged
   *
   * A gold shine strip at the top of the fill makes the bar feel premium.
   */
  _updateHPBar() {
    const bar = this._hpBar;
    bar.clear();

    const pct = this.hp / this.maxHp;
    const bx = 150, by = 10, bw = 500, bh = 16;

    // Almost-black background track.
    bar.fillStyle(0x110000).fillRect(bx, by, bw, bh);

    // Phase-dependent fill colour.
    const color = this.phase === 2 ? 0x888888
                : this.phase === 3 ? 0xcc0000
                : 0xff2222;
    bar.fillStyle(color).fillRect(bx + 1, by + 1, Math.floor((bw - 2) * pct), bh - 2);

    // Gold shine strip (5px from top of the fill).
    bar.fillStyle(0xffcc00).fillRect(bx + 1, by + 1, Math.floor((bw - 2) * pct), 5);

    // White border for visibility against any background.
    bar.lineStyle(2, 0xffffff).strokeRect(bx, by, bw, bh);
  }
}
