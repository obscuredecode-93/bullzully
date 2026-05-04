/**
 * @fileoverview MagheibaChaasi — the mid-boss of the Magheiba Dungeon (Zone 2).
 *
 * Presented by "MR. MAGHEIBA", this pattern-based cave troll tests the player's
 * mastery of all mechanics learned so far. Three phases escalate the challenge:
 *
 * Phase 1 (100–60% HP):
 *   Stomps every 2.2s. Each stomp: jump up → slam down → shockwave → 2 boulders.
 *
 * Phase 2 (60–30% HP):
 *   Adds a charge dash every 4s. Phase label updates to "BULLZ of ZULLZ".
 *   Walk speed remains the same; the player must deal with both timers simultaneously.
 *
 * Phase 3 (<30% HP):
 *   Stomp timer accelerates (2200ms → 1500ms). Summons 2 Pookie Sigma minions.
 *   Phase label updates to "ZULLZ of BULLZ". Walk speed increases to 65px/s.
 *
 * @module entities/bosses/MagheibaChaasi
 */

import { flashWhite, showDamageNumber } from '../../utils/combatFX';

/**
 * MagheibaChaasi — mid boss of the cave dungeon. Pattern-based attacks.
 *
 * Phase 1 (100–60% HP): Stomp + ranged boulders.
 * Phase 2 (60–30% HP): Adds charge attack. "BULLZ of ZULLZ AWAKENS!"
 * Phase 3 (<30% HP):   Enraged — faster attacks, summons Pookie Sigmas. "ZULLZ of BULLZ"
 */
export default class MagheibaChaasi extends Phaser.Physics.Arcade.Sprite {
  /**
   * @param {Phaser.Scene} scene - The active GameScene.
   * @param {number}       x     - Boss spawn X.
   * @param {number}       y     - Boss spawn Y.
   */
  constructor(scene, x, y) {
    super(scene, x, y, 'magheiba_boss');
    scene.add.existing(this);
    scene.physics.add.existing(this);

    // ── HP & scoring ─────────────────────────────────────────────────────────
    this.hp    = 500; // Mid-boss has 500 HP vs regular enemies' 40–120.
    this.maxHp = 500;
    this.phase = 1;
    this.dead  = false;
    this.score = 1000; // 5-10× more than regular enemies.

    // ── State tracking ────────────────────────────────────────────────────────
    this.attackTimer  = 0;
    this.chargeTimer  = 0;
    this.direction    = -1;     // Negative = facing left initially; updated in update().
    this.isAttacking  = false;  // Prevents overlapping attack sequences.

    // Large hitbox to match the 64×64 sprite.
    this.body.setSize(56, 58);
    this.body.setOffset(4, 4);
    this.setDepth(8); // Renders above regular enemies (depth 5).

    // ── Boss HP bar (wider than regular enemy bars, displayed at top of screen) ──
    /** @type {Phaser.GameObjects.Graphics} Full-width boss HP bar at the top of the screen. */
    this._hpBar = scene.add.graphics().setDepth(15);

    // NOTE: setScrollFactor(0) pins these labels to screen-space so they stay
    // at the top even as the camera follows the player through the room.

    /** @type {Phaser.GameObjects.Text} Presenter subtitle ("MR. MAGHEIBA presents:"). */
    this._nameLabel = scene.add.text(scene.cameras.main.width / 2, 22,
      'MR. MAGHEIBA presents:', {
        fontSize: '5px', color: '#cc6600',
        fontFamily: "'Press Start 2P'", stroke: '#000', strokeThickness: 2,
      }).setScrollFactor(0).setOrigin(0.5).setDepth(20);

    /** @type {Phaser.GameObjects.Text} Boss name / phase indicator. */
    this._phaseLabel = scene.add.text(scene.cameras.main.width / 2, 32,
      'CHAASI CHUUMA', {
        fontSize: '8px', color: '#ff8800',
        fontFamily: "'Press Start 2P'", stroke: '#000', strokeThickness: 3
      }).setScrollFactor(0).setOrigin(0.5).setDepth(20);

    this._initPhaseOne(scene);
  }

  // ============================================================
  // PHASE 1 SETUP
  // ============================================================

  /**
   * Starts the recurring stomp attack timer.
   * The timer reference is stored so it can be accelerated in Phase 3.
   *
   * @param {Phaser.Scene} scene - The scene to create the time event on.
   */
  _initPhaseOne(scene) {
    // 2200ms between stomps — gives the player time to reposition.
    this._attackEvent = scene.time.addEvent({
      delay: 2200,
      loop:  true,
      callback: () => {
        // Guard: don't stack attacks if a previous stomp is still resolving.
        if (!this.dead && !this.isAttacking) this._stompAttack();
      },
    });
  }

  // ============================================================
  // MAIN UPDATE
  // ============================================================

  /**
   * Per-frame logic: check phase transitions and slowly walk toward the player.
   *
   * @param {import('../Player').default} player - Player sprite.
   * @param {number} time - Phaser elapsed time (unused).
   */
  update(player, time) {
    if (this.dead || !this.active) return;

    this._updateHPBar();

    const pct = this.hp / this.maxHp;

    // Phase transition thresholds — each can only fire once due to the phase guards.
    if (pct < 0.6 && this.phase === 1) this._enterPhase2();
    if (pct < 0.3 && this.phase === 2) this._enterPhase3();

    // Always face the player.
    this.direction = player.x < this.x ? -1 : 1;
    this.setFlipX(this.direction < 0);

    // Move toward the player while not in a stomp/charge animation.
    if (!this.isAttacking) {
      const dist = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);
      if (dist > 120) {
        // Phase 3 walk speed (65) is faster than Phases 1/2 (45).
        this.setVelocityX(this.direction * (this.phase >= 3 ? 65 : 45));
      } else {
        this.setVelocityX(0); // Stop when in melee range — the attack timer handles damage.
      }
    }
  }

  // ============================================================
  // STOMP ATTACK
  // ============================================================

  /**
   * Jump-and-slam sequence:
   *  1. Apply upward velocity (-300).
   *  2. After 400ms (apex), apply downward slam velocity (+500).
   *  3. After another 250ms (landing), create shockwave and throw boulders.
   *
   * Uses nested delayedCalls rather than a state machine to keep the code linear.
   */
  _stompAttack() {
    this.isAttacking = true;
    this.setVelocityY(-300); // Jump — negative Y is upward in Phaser.

    this.scene.time.delayedCall(400, () => {
      if (!this.active) return;
      this.setVelocityY(500); // Slam down faster than gravity would normally allow.

      this.scene.time.delayedCall(250, () => {
        if (!this.active) return;
        this._createShockwave();

        // Phase 3 fires 4 boulders instead of 2. Boulders are staggered 180ms apart
        // so they don't all fire in the exact same frame (avoids a single-frame spike).
        const count = this.phase >= 3 ? 4 : 2;
        for (let i = 0; i < count; i++) {
          this.scene.time.delayedCall(i * 180, () => this._throwBoulder());
        }

        this.isAttacking = false; // Resume walking after the attack resolves.
      });
    });
  }

  // ============================================================
  // BOULDER PROJECTILE
  // ============================================================

  /**
   * Fires a scaled-up enemy bullet aimed at the player's current position,
   * with random spread so consecutive boulders don't travel in identical paths.
   *
   * Boulders are added to `this.scene.enemyProjectiles` so GameScene's
   * permanent overlap collider handles player damage detection.
   */
  _throwBoulder() {
    if (!this.active || !this.scene.player?.active) return;

    const player = this.scene.player;
    // Aim from slightly above the centre of the boss (y - 20) for a natural throw arc.
    const angle  = Phaser.Math.Angle.Between(this.x, this.y - 20, player.x, player.y);
    // ±0.2 rad (≈11.5°) random spread to make consecutive boulders harder to dodge.
    const spread = (Math.random() - 0.5) * 0.4;

    const boulder = this.scene.physics.add.image(this.x, this.y - 30, 'enemy_bullet');
    boulder.setScale(2).setDepth(7); // setScale(2) makes boulders visually 2× bullet size.
    boulder.setData('damage', 18);
    boulder.setData('isEnemyProjectile', true);

    // Speed scales with phase: Phase 1 = 270, Phase 2 = 300, Phase 3 = 330.
    const speed = 240 + this.phase * 30;
    boulder.setVelocity(
      Math.cos(angle + spread) * speed,
      Math.sin(angle + spread) * speed
    );

    // Auto-destroy after 2s — prevents accumulation of off-screen boulders.
    this.scene.time.delayedCall(2000, () => { if (boulder.active) boulder.destroy(); });
    this.scene.enemyProjectiles.add(boulder);
  }

  // ============================================================
  // SHOCKWAVE (landing impact)
  // ============================================================

  /**
   * Creates a wide horizontal shockwave image that radiates outward on landing.
   * Also damages the player if they are within 140px of the impact point.
   *
   * The shockwave is a visual-only object; actual damage is calculated separately
   * (not through the physics system) because the timing is tied to the tween.
   */
  _createShockwave() {
    // Spawn at the bottom of the body (ground level) rather than the centre.
    const sw = this.scene.add.image(this.x, this.body.bottom, 'shield_hit')
      .setScale(2).setDepth(14).setTint(0xff8800);

    // Expand horizontally 3× in each direction, fade out over 500ms.
    this.scene.tweens.add({
      targets: sw, scaleX: 6, scaleY: 2, alpha: 0, duration: 500,
      onComplete: () => sw.destroy(),
    });

    const player = this.scene.player;
    if (player && Math.abs(this.x - player.x) < 140) {
      // Slam damage + upward knockback to push the player off a platform.
      player.takeDamage(12);
      player.setVelocity((player.x > this.x ? 1 : -1) * 220, -250);
    }
  }

  // ============================================================
  // PHASE TRANSITIONS
  // ============================================================

  /**
   * Transition to Phase 2: add charge attack, update label.
   * Fires once when HP drops below 60%.
   */
  _enterPhase2() {
    this.phase = 2;
    this._phaseLabel.setText('CHAASI CHUUMA — BULLZ of ZULLZ');

    // Orange tint flash to signal the transition.
    this.setTint(0xff6600);
    this.scene.time.delayedCall(500, () => this.clearTint());

    // Add a separate recurring charge event on top of the existing stomp timer.
    this.scene.time.addEvent({
      delay: 4000, loop: true,
      callback: () => { if (!this.dead && !this.isAttacking) this._chargeAttack(); },
    });

    this._showPhaseText('BULLZ of ZULLZ AWAKENS!\nCHARGE ACTIVATED!');
  }

  /**
   * Transition to Phase 3: speed up attacks, summon minions, update label.
   * Fires once when HP drops below 30%.
   */
  _enterPhase3() {
    this.phase = 3;
    this._phaseLabel.setText('CHAASI CHUUMA — ZULLZ of BULLZ');

    this.setTint(0xff0000); // Full red — maximum threat signal.
    this.scene.cameras.main.shake(600, 0.012);

    // Reduce stomp interval from 2200ms to 1500ms for the enraged phase.
    this._attackEvent.delay = 1500;

    this._summonMinions();
    this._showPhaseText('ZULLZ of BULLZ: FINAL FORM!\nPOOKIE SIGMA TO THE RESCUE!');
  }

  // ============================================================
  // CHARGE ATTACK (Phase 2+)
  // ============================================================

  /**
   * A 300ms wind-up (orange tint) followed by a 600ms lateral dash at 380px/s.
   * The wind-up gives a skilled player time to jump over the charge.
   */
  _chargeAttack() {
    if (!this.scene.player?.active) return;
    this.isAttacking = true;
    const dir = this.scene.player.x > this.x ? 1 : -1;

    this.setTint(0xffaa00); // Yellow-orange = wind-up telegraph.
    this.scene.time.delayedCall(300, () => {
      this.clearTint();
      this.setVelocityX(dir * 380); // Fast dash velocity.
      this.scene.time.delayedCall(600, () => {
        this.setVelocityX(0);
        this.isAttacking = false;
      });
    });
  }

  // ============================================================
  // MINION SUMMON (Phase 3)
  // ============================================================

  /**
   * Spawns two weakened PookieSigma minions flanking the boss.
   *
   * NOTE: `this.scene.enemyClasses` is populated by GameScene before boss spawn,
   * providing a reference to the PookieSigma class without a circular import.
   */
  _summonMinions() {
    const PookieSigma = this.scene.enemyClasses?.PookieSigma;
    if (!PookieSigma) return;

    // Spawn one minion on each side at ±120px.
    [-120, 120].forEach(offset => {
      const minion = new PookieSigma(this.scene, this.x + offset, this.y);
      this.scene.enemies.add(minion);
      // Minions need platform collision — GameScene's group collider only applies
      // to pre-existing enemies; new additions need their own collider.
      this.scene.physics.add.collider(minion, this.scene.platformGroup);
    });
  }

  // ============================================================
  // PHASE TEXT OVERLAY
  // ============================================================

  /**
   * Displays a centred, screen-fixed phase announcement that floats up and fades.
   *
   * NOTE: setScrollFactor(0) is critical here — without it the text would be
   * placed in world-space and scroll off-screen with the camera.
   *
   * @param {string} msg - Message to display (newlines are split across lines).
   */
  _showPhaseText(msg) {
    const text = this.scene.add.text(
      this.scene.cameras.main.width  / 2,
      this.scene.cameras.main.height / 2,
      msg, {
        fontSize: '9px', color: '#ff4400',
        fontFamily: "'Press Start 2P'", stroke: '#000', strokeThickness: 4,
      }
    ).setScrollFactor(0).setOrigin(0.5).setDepth(25);

    this.scene.tweens.add({
      targets: text, y: text.y - 40, alpha: 0, duration: 1800,
      onComplete: () => text.destroy(),
    });
  }

  // ============================================================
  // COMBAT
  // ============================================================

  /**
   * @param {number} amount - Incoming damage (already multiplied by BULLZ if active).
   */
  takeDamage(amount) {
    if (this.dead) return;
    this.hp -= amount;
    flashWhite(this.scene, this);
    // Boss damage numbers appear higher (y - 30) since the boss sprite is larger.
    showDamageNumber(this.scene, this.x, this.y - 30, amount);
    if (this.hp <= 0) this.die();
  }

  // ============================================================
  // DEATH
  // ============================================================

  /**
   * Epic death sequence: 5 staggered explosion bursts, then emits 'boss-killed'
   * so GameScene can open the door and trigger the zone transition.
   *
   * The destroy() call is delayed 600ms to let the last burst play before the
   * sprite is removed from the scene.
   */
  die() {
    if (this.dead) return;
    this.dead = true;

    // Clean up all HUD and timer references immediately.
    this._hpBar.destroy();
    this._nameLabel.destroy();
    this._phaseLabel.destroy();
    this._attackEvent?.remove();

    // Stronger shake for mid-boss death than regular enemy deaths (0.015 vs 0.015 shared).
    this.scene.cameras.main.shake(800, 0.015);

    // 5 burst effects at random offsets, staggered 120ms apart.
    for (let i = 0; i < 5; i++) {
      this.scene.time.delayedCall(i * 120, () => {
        if (!this.scene) return;
        const fx = this.scene.add.image(
          this.x + Phaser.Math.Between(-40, 40),
          this.y + Phaser.Math.Between(-40, 40),
          'death_burst'
        ).setScale(2).setDepth(20);
        this.scene.tweens.add({ targets: fx, alpha: 0, scale: 4, duration: 500,
          onComplete: () => fx.destroy() });
      });
    }

    // Notify GameScene so it can open the door and award score.
    this.scene.events.emit('boss-killed', { score: this.score, bossType: 'MagheibaChaasi' });

    // Wait before destroying so the last burst effect can play.
    this.scene.time.delayedCall(600, () => this.destroy());
  }

  // ============================================================
  // HUD
  // ============================================================

  /**
   * Draws the wide boss HP bar at the top-centre of the screen.
   * Colour shifts from orange (healthy) → dark orange (phase 2) → red (phase 3).
   *
   * NOTE: This is called every frame. The Graphics object is cleared and redrawn
   * rather than using a mask/crop because the bar needs to track exact pixel widths.
   */
  _updateHPBar() {
    const bar = this._hpBar;
    bar.clear();

    const pct = this.hp / this.maxHp;
    const bx = 200, by = 10, bw = 400, bh = 14;

    // Dark red background track.
    bar.fillStyle(0x220000).fillRect(bx, by, bw, bh);

    // Fill colour indicates phase: orange → dark orange → red.
    const color = pct > 0.6 ? 0xff8800 : pct > 0.3 ? 0xff4400 : 0xff0000;
    bar.fillStyle(color).fillRect(bx + 1, by + 1, Math.floor((bw - 2) * pct), bh - 2);

    // White border to make the bar stand out against any background.
    bar.lineStyle(2, 0xffffff).strokeRect(bx, by, bw, bh);
  }
}
