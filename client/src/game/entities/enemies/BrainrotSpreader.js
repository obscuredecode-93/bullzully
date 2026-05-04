/**
 * @fileoverview BrainrotSpreader — the ranged enemy that forces the player to close distance.
 *
 * Design role: Introduces ranged combat and kiting. The BrainrotSpreader maintains
 * a preferred standoff distance (~260px) and fires brainrot particles in a 1–3-projectile
 * spread, making it dangerous from afar but relatively weak up close.
 *
 * Players must learn to dodge projectiles and sprint past the standoff zone to land hits.
 * In the cave dungeon (zone 2), the ceiling limits aerial approach angles.
 *
 * Movement behaviour:
 *  - If the player is CLOSER than preferredRange: back away.
 *  - If the player is FARTHER than preferredRange + 60px: move closer.
 *  - If the player is within the dead-zone (260–320px): stand still and shoot.
 *  - Outside attackRange (>320px): wander randomly.
 *
 * @module entities/enemies/BrainrotSpreader
 */

import { GAME_HEIGHT, ROOM_WIDTH } from '../../config';
import { flashWhite, showDamageNumber, shakeOnDeath } from '../../utils/combatFX';

/**
 * BrainrotSpreader — ranged enemy. Keeps distance, lobs brainrot particles at player.
 */
export default class BrainrotSpreader extends Phaser.Physics.Arcade.Sprite {
  /**
   * @param {Phaser.Scene} scene - The active GameScene.
   * @param {number}       x     - Spawn X.
   * @param {number}       y     - Spawn Y.
   */
  constructor(scene, x, y) {
    super(scene, x, y, 'brainrot_spreader');
    scene.add.existing(this);
    scene.physics.add.existing(this);

    // ── Combat stats ────────────────────────────────────────────────────────
    this.hp           = 45;
    this.maxHp        = 45;
    this.rangedDamage = 12; // Per projectile; a 3-spread burst deals up to 36 total.

    // ── Movement ────────────────────────────────────────────────────────────
    this.speed = 50; // Slow — the BrainrotSpreader relies on range, not agility.

    // ── AI ranges (px) ──────────────────────────────────────────────────────
    // Preferred standoff distance. The enemy actively maintains this gap.
    this.preferredRange = 260;
    // Maximum range at which it will shoot; beyond this it wanders.
    this.attackRange    = 320;

    // ── Cooldowns ───────────────────────────────────────────────────────────
    this.attackCooldown    = 0;
    this.attackCooldownMax = 2200; // 2.2s between bursts — long, but it fires 1–3 at once.

    // ── State ────────────────────────────────────────────────────────────────
    this.direction = 1;   // Used during wandering to avoid instant reversal.
    this.dead      = false;
    this.score     = 130;

    this.body.setSize(20, 26);
    this.setDepth(5);

    /** @type {Phaser.GameObjects.Graphics} */
    this._hpBar = scene.add.graphics().setDepth(10);
  }

  // ============================================================
  // AI UPDATE
  // ============================================================

  /**
   * Every frame: maintain standoff distance and fire when cooldown allows.
   *
   * @param {import('../Player').default} player - Player sprite.
   * @param {number} time - Phaser timestamp (unused).
   */
  update(player, time) {
    if (this.dead || !this.active) return;

    this.attackCooldown = Math.max(0, this.attackCooldown - 16);
    this._updateHPBar();

    const dist = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);

    if (dist < this.attackRange) {
      // ── WITHIN ATTACK RANGE: kite and shoot ─────────────────────────────
      // dir points AWAY from the player, so multiplying by it moves the enemy back.
      const dir = player.x < this.x ? 1 : -1;

      if (dist < this.preferredRange) {
        // Player is too close — back away.
        this.setVelocityX(this.speed * dir);
      } else if (dist > this.preferredRange + 60) {
        // Player is too far — move closer to stay in firing range.
        // Moving in the opposite direction (toward player) to close the gap.
        this.setVelocityX(this.speed * -dir);
      } else {
        // Player is in the sweet spot (~260–320px) — stop and shoot.
        this.setVelocityX(0);
      }

      if (this.attackCooldown <= 0) {
        this._fireAtPlayer(player);
        this.attackCooldown = this.attackCooldownMax;
      }
    } else {
      // ── OUT OF RANGE: random wander ──────────────────────────────────────
      this.setVelocityX(this.speed * 0.3 * this.direction);
      // 1% chance per frame to flip direction — creates erratic wandering without
      // a timer, so it doesn't sync up visually with other spreaders in the room.
      if (Math.random() < 0.01) this.direction *= -1;
    }

    // Always face the player so the sprite looks like it's targeting them.
    this.setFlipX(player.x < this.x);
  }

  // ============================================================
  // RANGED ATTACK
  // ============================================================

  /**
   * Fires 1–3 brainrot particles in a spread toward the player's current position.
   *
   * Spread is implemented by adding a fixed angular offset per particle so that
   * multi-shot bursts fan out evenly around the direct aim angle.
   *
   * NOTE: Projectiles are added to `this.scene.enemyProjectiles` so GameScene's
   * permanent overlap collider (player vs enemyProjectiles) handles damage detection.
   *
   * @param {import('../Player').default} player - Current player position used to calculate aim angle.
   */
  _fireAtPlayer(player) {
    // 1–3 projectiles per burst; higher counts happen randomly.
    const count = Phaser.Math.Between(1, 3);

    for (let i = 0; i < count; i++) {
      // Direct angle from enemy to player.
      const angle = Phaser.Math.Angle.Between(this.x, this.y, player.x, player.y);

      // Angular spread: centre particle is dead-on, flanking particles offset by ±0.15 rad (~8.6°).
      // When count = 1, spread = 0 (single accurate shot).
      const spread = (i - Math.floor(count / 2)) * 0.15;

      const proj = this.scene.physics.add.image(this.x, this.y - 10, 'brainrot_particle');
      proj.setDepth(6);
      proj.body.setAllowGravity(false); // Projectile must travel in a straight line.
      proj.setData('damage', this.rangedDamage);
      proj.setData('isEnemyProjectile', true);

      // Add slight speed randomness (160–220 px/s) so burst particles have slightly
      // different travel times, making them harder to dodge all at once.
      const speed = 160 + Math.random() * 60;
      proj.setVelocity(
        Math.cos(angle + spread) * speed,
        Math.sin(angle + spread) * speed
      );

      // Auto-destroy after 2.5s to prevent particles persisting off-screen.
      this.scene.time.delayedCall(2500, () => { if (proj.active) proj.destroy(); });

      // Register with the physics group so GameScene's collider detects player hits.
      this.scene.enemyProjectiles.add(proj);
    }
  }

  // ============================================================
  // COMBAT
  // ============================================================

  /**
   * @param {number} amount - Damage incoming (post-BULLZ-multiplier).
   */
  takeDamage(amount) {
    if (this.dead) return;
    this.hp -= amount;
    flashWhite(this.scene, this);
    showDamageNumber(this.scene, this.x, this.y - 10, amount);
    if (this.hp <= 0) this.die();
  }

  die() {
    if (this.dead) return;
    this.dead = true;
    shakeOnDeath(this.scene);
    this._hpBar.destroy();

    // Green/lime tint on death burst to match the brainrot colour theme.
    const burst = this.scene.add.image(this.x, this.y, 'death_burst').setDepth(15).setTint(0x00ff66);
    this.scene.tweens.add({
      targets: burst, alpha: 0, scaleX: 2, scaleY: 2, duration: 350,
      onComplete: () => burst.destroy(),
    });

    this.scene.events.emit('enemy-killed', { score: this.score, x: this.x, y: this.y });
    this.destroy();
  }

  // ============================================================
  // HUD
  // ============================================================

  /** Yellow-green HP bar matches the enemy's lime colour palette. */
  _updateHPBar() {
    const bar = this._hpBar;
    bar.clear();
    if (this.hp >= this.maxHp) return;
    const pct = this.hp / this.maxHp;
    bar.fillStyle(0x000000).fillRect(this.x - 14, this.y - 22, 28, 5);
    bar.fillStyle(0xccdd00).fillRect(this.x - 13, this.y - 21, Math.floor(26 * pct), 3);
  }

  destroy() {
    if (this._hpBar && this._hpBar.active) this._hpBar.destroy();
    super.destroy();
  }
}
