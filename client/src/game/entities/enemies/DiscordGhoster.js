/**
 * @fileoverview DiscordGhoster — the evasion-focused enemy of Discord Void.
 *
 * Design role: Teaches the player to commit to attacks rather than waiting.
 * Ghosts teleport randomly on a timer and have a 40% chance to teleport
 * reactively when hit, making them hard to stunlock.
 *
 * Unlike all other enemies, DiscordGhoster ignores gravity entirely —
 * it floats freely through the room and phases its alpha to create
 * a ghostly pulsing appearance.
 *
 * AI states:
 *  1. IDLE/HOVER — outside chase range, oscillates vertically in place.
 *  2. CHASE     — floats directly toward the player at `speed` px/s.
 *  3. ATTACK    — damages on contact when within `attackRange`.
 *  4. TELEPORT  — jumps to a random position near the player (see _teleport).
 *
 * @module entities/enemies/DiscordGhoster
 */

import { MELEE_DAMAGE } from '../../config';
import { flashWhite, showDamageNumber, shakeOnDeath } from '../../utils/combatFX';

/**
 * DiscordGhoster — teleports randomly when taking damage or on a timer.
 * Ignores gravity, floats toward the player.
 */
export default class DiscordGhoster extends Phaser.Physics.Arcade.Sprite {
  /**
   * @param {Phaser.Scene} scene - The active GameScene.
   * @param {number}       x     - Initial world-space X.
   * @param {number}       y     - Initial world-space Y.
   */
  constructor(scene, x, y) {
    super(scene, x, y, 'discord_ghoster');
    scene.add.existing(this);
    scene.physics.add.existing(this);

    // ── Combat stats ────────────────────────────────────────────────────────
    this.hp    = 40;
    this.maxHp = 40;
    // 50% of player melee — deals modest damage, but the teleport evasion makes it hard to finish off.
    this.damage = MELEE_DAMAGE * 0.5; // = 12.5

    // ── Movement ────────────────────────────────────────────────────────────
    this.speed = 55; // px/s in all directions (no gravity to fight against).

    // ── AI ranges (px) ──────────────────────────────────────────────────────
    this.chaseRange  = 350; // Long sight range — ghosts notice the player from far away.
    this.attackRange = 36;  // Very short contact range — player must be very close.

    // ── Cooldowns ───────────────────────────────────────────────────────────
    this.attackCooldown    = 0;
    this.attackCooldownMax = 1200; // 1.2s — slower than PookieSigma, but teleporting compensates.

    // Auto-teleport timer: teleports every 3.5s when in chase range.
    this.teleportCooldown    = 0;
    this.teleportCooldownMax = 3500;

    // ── Lifecycle ────────────────────────────────────────────────────────────
    this.dead  = false;
    this.score = 150; // More points than PookieSigma to reward tracking a evasive target.

    // NOTE: setAllowGravity(false) completely disables world gravity for this body.
    // This is different from setGravityY(0) — it opts out of gravity entirely.
    this.body.setAllowGravity(false);
    this.body.setSize(22, 28);
    this.setDepth(5);

    /** @type {Phaser.GameObjects.Graphics} */
    this._hpBar = scene.add.graphics().setDepth(10);
  }

  // ============================================================
  // AI UPDATE
  // ============================================================

  /**
   * Main AI tick. Handles teleport timer, chasing, attacking, and ghostly hover.
   *
   * @param {import('../Player').default} player - Player sprite.
   * @param {number} time - Phaser's elapsed timestamp in ms; used for alpha pulse.
   */
  update(player, time) {
    if (this.dead || !this.active) return;

    this.attackCooldown   = Math.max(0, this.attackCooldown   - 16);
    this.teleportCooldown = Math.max(0, this.teleportCooldown - 16);
    this._updateHPBar();

    const dist = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);

    // ── Auto-teleport ────────────────────────────────────────────────────────
    // When the teleport cooldown expires and the player is in range, teleport
    // and reset the cooldown. `return` prevents the chase logic from running
    // in the same frame (the ghost has just moved, so its velocity resets).
    if (this.teleportCooldown <= 0 && dist < this.chaseRange) {
      this._teleport(player);
      this.teleportCooldown = this.teleportCooldownMax;
      return;
    }

    if (dist < this.chaseRange) {
      // ── CHASE / CONTACT ATTACK ───────────────────────────────────────────
      // Float directly toward the player at constant speed using trig.
      const angle = Phaser.Math.Angle.Between(this.x, this.y, player.x, player.y);
      this.setVelocityX(Math.cos(angle) * this.speed);
      this.setVelocityY(Math.sin(angle) * this.speed);

      // Damage on contact; no separate animation — the ghost touches and hurts.
      if (dist < this.attackRange && this.attackCooldown <= 0) {
        player.takeDamage(this.damage);
        this.attackCooldown = this.attackCooldownMax;
      }
    } else {
      // ── IDLE HOVER ───────────────────────────────────────────────────────
      // Outside chase range, oscillate vertically using sine wave.
      // time * 0.002 gives a slow period (~3s per cycle) that looks natural.
      this.setVelocity(0, Math.sin(time * 0.002) * 20);
    }

    // Flip to always face the player.
    this.setFlipX(player.x < this.x);

    // Alpha pulse: oscillates between 0.55 and 0.85 for a ghostly translucent look.
    // time * 0.004 gives ~1.5s per pulse cycle.
    this.setAlpha(0.7 + Math.sin(time * 0.004) * 0.15);
  }

  // ============================================================
  // TELEPORT
  // ============================================================

  /**
   * Teleports this ghost to a random position near the player.
   *
   * Spawns a visual "poof" effect at the origin and destination.
   * The new position is clamped to keep the ghost within the room bounds (50–1870 X, 50–420 Y).
   *
   * @param {import('../Player').default} player - Used as the centre of the teleport radius.
   */
  _teleport(player) {
    // "Disappear" effect at current position.
    const fx = this.scene.add.image(this.x, this.y, 'teleport_fx').setDepth(15);
    this.scene.tweens.add({
      targets: fx,
      alpha: 0, scaleX: 1.5, scaleY: 1.5,
      duration: 300,
      onComplete: () => fx.destroy(),
    });

    // Choose a random angle and distance from the player.
    const angle = Math.random() * Math.PI * 2;
    const dist  = Phaser.Math.Between(120, 250); // Close enough to remain threatening.

    // Clamp within the room — prevents the ghost from teleporting into walls.
    const newX = Phaser.Math.Clamp(player.x + Math.cos(angle) * dist, 50, 1870);
    const newY = Phaser.Math.Clamp(player.y + Math.sin(angle) * dist, 50, 420);

    this.setPosition(newX, newY);
    this.setVelocity(0, 0); // Stop any movement so the ghost doesn't carry momentum.

    // "Appear" effect at new position.
    const fx2 = this.scene.add.image(newX, newY, 'teleport_fx').setDepth(15);
    this.scene.tweens.add({
      targets: fx2,
      alpha: 0, scaleX: 1.5, scaleY: 1.5,
      duration: 300,
      onComplete: () => fx2.destroy(),
    });
  }

  // ============================================================
  // COMBAT
  // ============================================================

  /**
   * Receive incoming damage, with a 40% reactive teleport chance.
   *
   * The reactive teleport uses half the normal cooldown so the ghost
   * can't be teleport-spammed to deny hits entirely.
   *
   * @param {number} amount - Damage to apply.
   */
  takeDamage(amount) {
    if (this.dead) return;
    this.hp -= amount;
    flashWhite(this.scene, this);
    showDamageNumber(this.scene, this.x, this.y - 10, amount);

    // 40% of the time, the ghost reacts to being hit by teleporting.
    // Only triggers if the auto-teleport is not already on cooldown.
    if (Math.random() < 0.4 && this.teleportCooldown <= 0) {
      const player = this.scene.player;
      if (player) {
        this._teleport(player);
        // Half cooldown for reactive teleport — punishes it less than the timed one.
        this.teleportCooldown = this.teleportCooldownMax * 0.5;
      }
    }

    // Brief alpha flash independent of the white tint, for extra feedback.
    this.scene.tweens.add({ targets: this, alpha: 0.2, duration: 80, yoyo: true });

    if (this.hp <= 0) this.die();
  }

  // ============================================================
  // DEATH
  // ============================================================

  /**
   * Death sequence: three staggered teleport-burst effects, then emit score event.
   */
  die() {
    if (this.dead) return;
    this.dead = true;
    shakeOnDeath(this.scene);
    this._hpBar.destroy();

    // Three staggered burst effects — more dramatic than a single pop.
    for (let i = 0; i < 3; i++) {
      this.scene.time.delayedCall(i * 100, () => {
        // Guard: scene may have transitioned before all bursts fire.
        if (!this.scene) return;
        const fx = this.scene.add.image(
          this.x + Phaser.Math.Between(-20, 20),
          this.y + Phaser.Math.Between(-20, 20),
          'teleport_fx'
        ).setDepth(15);
        this.scene.tweens.add({
          targets: fx, alpha: 0, scale: 2, duration: 250,
          onComplete: () => fx.destroy(),
        });
      });
    }

    this.scene.events.emit('enemy-killed', { score: this.score, x: this.x, y: this.y });
    this.destroy();
  }

  // ============================================================
  // HUD
  // ============================================================

  /** Redraws the HP bar (purple tint to match the ghost's colour theme). */
  _updateHPBar() {
    const bar = this._hpBar;
    bar.clear();
    if (this.hp >= this.maxHp) return;
    const pct = this.hp / this.maxHp;
    bar.fillStyle(0x000000).fillRect(this.x - 14, this.y - 22, 28, 5);
    // Purple bar — matches the ghost's visual palette.
    bar.fillStyle(0x9933ff).fillRect(this.x - 13, this.y - 21, Math.floor(26 * pct), 3);
  }

  destroy() {
    if (this._hpBar && this._hpBar.active) this._hpBar.destroy();
    super.destroy();
  }
}
