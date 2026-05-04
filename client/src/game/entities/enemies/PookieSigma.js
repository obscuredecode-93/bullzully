/**
 * @fileoverview PookieSigma — the most basic enemy in BULLZULLY.
 *
 * Design role: Tutorial enemy. Simple patrol → chase → attack loop.
 * Players learn to dodge and counter-attack against this enemy before
 * facing more complex types.
 *
 * AI states:
 *  1. PATROL — walks back and forth at 40% speed, reversing direction on a timer.
 *  2. CHASE  — when the player enters `chaseRange`, sprints toward them at full speed.
 *  3. ATTACK — when within `attackRange`, deals melee damage and knocks the player back.
 *
 * @module entities/enemies/PookieSigma
 */

import { MELEE_DAMAGE } from '../../config';
import { flashWhite, showDamageNumber, shakeOnDeath } from '../../utils/combatFX';

/**
 * PookieSigma — basic melee enemy. Patrols platform, charges player on sight.
 *
 * Extends `Phaser.Physics.Arcade.Sprite` and relies on GameScene adding it
 * to the `enemies` physics group for platform collision and overlap detection.
 */
export default class PookieSigma extends Phaser.Physics.Arcade.Sprite {
  /**
   * @param {Phaser.Scene} scene - The active GameScene.
   * @param {number}       x     - Initial world-space X position.
   * @param {number}       y     - Initial world-space Y position.
   */
  constructor(scene, x, y) {
    super(scene, x, y, 'pookie_sigma');
    scene.add.existing(this);     // Register with the scene's display list.
    scene.physics.add.existing(this); // Give this sprite an Arcade physics body.

    // ── Combat stats ────────────────────────────────────────────────────────
    this.hp    = 50;
    this.maxHp = 50;

    // 60% of the player's base melee damage — punishing but not one-shot.
    this.damage = MELEE_DAMAGE * 0.6; // = 15

    // ── Movement ────────────────────────────────────────────────────────────
    this.speed = 70; // px/s during chase; patrol is speed * 0.4 = 28 px/s.

    // ── AI ranges (px) ──────────────────────────────────────────────────────
    this.chaseRange  = 280; // Sight range — starts chasing when player is within this.
    this.attackRange = 40;  // Melee reach — must be this close to deal damage.

    // ── Cooldowns ───────────────────────────────────────────────────────────
    this.attackCooldown    = 0;
    this.attackCooldownMax = 900; // 900ms between hits — fast but not overwhelming.

    // ── Patrol state ─────────────────────────────────────────────────────────
    this.direction   = 1;    // 1 = right, -1 = left.
    this.patrolTimer = 0;    // Countdown in ms; reverses direction at 0.

    // ── Lifecycle ────────────────────────────────────────────────────────────
    this.dead  = false;
    this.score = 100; // Added to player score via the 'enemy-killed' event.

    // NOTE: setGravityY(0) uses additional gravity on top of world gravity.
    // Setting it to 0 means PookieSigma is affected by world gravity normally.
    // (We don't want it to fly, unlike DiscordGhoster which disables gravity entirely.)
    this.body.setGravityY(0);
    this.body.setSize(20, 28);   // Hitbox smaller than sprite to feel fair.
    this.body.setOffset(2, 2);
    this.setDepth(5);            // Render above platforms (depth 0) and below HUD (depth 15+).

    /** @type {Phaser.GameObjects.Graphics} Drawn each frame above the sprite when damaged. */
    this._hpBar = scene.add.graphics().setDepth(10);
  }

  // ============================================================
  // AI UPDATE — called every frame by GameScene.update()
  // ============================================================

  /**
   * Main AI tick. Transitions between patrol, chase, and attack states.
   *
   * @param {import('../Player').default} player - The player sprite reference.
   * @param {number} time - Phaser's elapsed time in ms (unused here; available for future use).
   */
  update(player, time) {
    // Dead enemies must not update — their sprite is destroyed shortly after death.
    if (this.dead || !this.active) return;

    // Tick the attack cooldown every frame (~16ms per tick at 60fps).
    this.attackCooldown = Math.max(0, this.attackCooldown - 16);
    this._updateHPBar();

    const dist = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);

    if (dist < this.chaseRange) {
      // ── CHASE / ATTACK state ────────────────────────────────────────────
      const dir = player.x < this.x ? -1 : 1;
      this.direction = dir;
      this.setVelocityX(this.speed * dir);

      if (dist < this.attackRange && this.attackCooldown <= 0) {
        this._meleeAttack(player);
      }
    } else {
      // ── PATROL state ─────────────────────────────────────────────────────
      this.patrolTimer -= 16;
      if (this.patrolTimer <= 0) {
        // Reverse direction and reset the timer to a random interval.
        this.direction  *= -1;
        this.patrolTimer = Phaser.Math.Between(1500, 3000);
      }
      // Move at 40% speed while patrolling.
      this.setVelocityX(this.speed * 0.4 * this.direction);
    }

    // Flip the sprite to face the direction of movement.
    this.setFlipX(this.direction < 0);
  }

  // ============================================================
  // COMBAT
  // ============================================================

  /**
   * Deals damage and applies a small knockback to the player.
   * Knockback direction is away from the enemy, not from attack direction,
   * so the player is pushed back regardless of which side they approached from.
   *
   * @param {import('../Player').default} player - The player to damage.
   */
  _meleeAttack(player) {
    this.attackCooldown = this.attackCooldownMax;
    player.takeDamage(this.damage);

    // Knockback: push the player away from this enemy.
    const dir = player.x > this.x ? 1 : -1;
    player.setVelocityX(dir * 180); // 180px/s lateral push.
  }

  /**
   * Receive incoming damage. Called by GameScene's melee/ranged overlap callbacks.
   *
   * @param {number} amount - Raw damage to apply (may be multiplied by BULLZ mode).
   */
  takeDamage(amount) {
    if (this.dead) return;
    this.hp -= amount;
    flashWhite(this.scene, this);                          // Visual hit confirmation.
    showDamageNumber(this.scene, this.x, this.y - 10, amount); // Floating number.
    if (this.hp <= 0) this.die();
  }

  // ============================================================
  // DEATH
  // ============================================================

  /**
   * Triggers the death sequence: camera shake, burst FX, score event, then destroy.
   * The `dead` guard prevents double-death if multiple hits land in the same frame.
   */
  die() {
    if (this.dead) return;
    this.dead = true;
    shakeOnDeath(this.scene); // Sharp 200ms shake from combatFX.

    this._hpBar.destroy();

    // Expand a burst image outward, then remove it.
    const burst = this.scene.add.image(this.x, this.y, 'death_burst').setDepth(15);
    this.scene.tweens.add({
      targets: burst,
      alpha:   0,
      scaleX:  2,
      scaleY:  2,
      duration: 300,
      onComplete: () => burst.destroy(),
    });

    // Emit to GameScene so it can check room-clear condition and add score.
    this.scene.events.emit('enemy-killed', { score: this.score, x: this.x, y: this.y });
    this.destroy();
  }

  // ============================================================
  // HUD — per-frame HP bar rendered above the sprite
  // ============================================================

  /**
   * Redraws the HP bar above this enemy.
   * The bar is hidden when HP is full to reduce visual noise on undamaged enemies.
   */
  _updateHPBar() {
    const bar = this._hpBar;
    bar.clear();
    // Don't draw the bar until the enemy has taken at least one hit.
    if (this.hp >= this.maxHp) return;

    const pct = this.hp / this.maxHp;
    // Black background track.
    bar.fillStyle(0x000000).fillRect(this.x - 14, this.y - 22, 28, 5);
    // Red fill proportional to remaining HP.
    bar.fillStyle(0xff2222).fillRect(this.x - 13, this.y - 21, Math.floor(26 * pct), 3);
  }

  // ============================================================
  // CLEANUP
  // ============================================================

  /**
   * Override destroy to clean up the Graphics HP bar, which is not a child
   * of this sprite and won't be destroyed automatically when the sprite is.
   */
  destroy() {
    if (this._hpBar && this._hpBar.active) this._hpBar.destroy();
    super.destroy();
  }
}
