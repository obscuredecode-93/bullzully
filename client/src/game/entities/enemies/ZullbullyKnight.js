/**
 * @fileoverview ZullbullyKnight — the armoured tank enemy of BULLZULLY.
 *
 * Design role: Teaches resource management and patience. The guard system
 * forces the player to spend 3 hits breaking armour before full damage applies.
 * After guard breaks, the knight can charge — punishing players who back off.
 *
 * Guard system:
 *  - `guarded = true`, `armorHits = 3` on spawn.
 *  - While guarded: each hit deals only 20% damage and decrements `armorHits`.
 *  - At `armorHits = 0`: guard breaks, knight becomes fully vulnerable.
 *  - The HP bar changes from blue (guarded) to red (vulnerable) as feedback.
 *  - The guard indicator above the HP bar shows remaining `armorHits` as blue blocks.
 *
 * Combat after guard break:
 *  - Charge attack unlocks: the knight dashes 300px toward the player at high speed.
 *  - The charge uses a Phaser tween on `x` (bypassing setVelocity) for smooth acceleration.
 *  - During the charge, a polling timer checks if the player is in the path.
 *
 * @module entities/enemies/ZullbullyKnight
 */

import { MELEE_DAMAGE } from '../../config';
import { flashWhite, showDamageNumber, shakeOnDeath } from '../../utils/combatFX';

/**
 * ZullbullyKnight — heavy armoured enemy. Takes 3 hits to break guard, then vulnerable.
 * Slow but hits hard.
 */
export default class ZullbullyKnight extends Phaser.Physics.Arcade.Sprite {
  /**
   * @param {Phaser.Scene} scene - The active GameScene.
   * @param {number}       x     - Spawn X.
   * @param {number}       y     - Spawn Y.
   */
  constructor(scene, x, y) {
    super(scene, x, y, 'zullbully_knight');
    scene.add.existing(this);
    scene.physics.add.existing(this);

    // ── Combat stats ────────────────────────────────────────────────────────
    this.hp       = 120;
    this.maxHp    = 120;
    this.armorHits = 3;    // Guard absorbs hits until this reaches 0.
    this.guarded   = true;
    // 140% of player melee — compensates for the slow speed and guard requirement.
    this.damage = MELEE_DAMAGE * 1.4; // = 35

    // ── Movement ────────────────────────────────────────────────────────────
    this.speed = 45; // Very slow — relies on the guard to absorb punishment while closing in.

    // ── AI ranges (px) ──────────────────────────────────────────────────────
    this.chaseRange  = 220;
    this.attackRange = 52; // Wider than PookieSigma to account for the knight's large sprite.

    // ── Cooldowns ───────────────────────────────────────────────────────────
    this.attackCooldown    = 0;
    this.attackCooldownMax = 1400; // 1.4s between standard melee hits.
    this.chargeCooldown    = 0;
    this.chargeCooldownMax = 5000; // 5s between charge attacks (once guard is broken).

    // ── State ────────────────────────────────────────────────────────────────
    this.isCharging = false; // True during the charge tween; blocks normal movement.
    this.direction  = 1;
    this.dead       = false;
    this.score      = 200; // Highest score among regular enemies — reflects the effort to kill.

    this.body.setSize(24, 34);
    this.setDepth(5);

    /** @type {Phaser.GameObjects.Graphics} HP bar. */
    this._hpBar = scene.add.graphics().setDepth(10);

    /** @type {Phaser.GameObjects.Graphics} Armour-hit indicator (blue blocks above HP bar). */
    this._guardIndicator = scene.add.graphics().setDepth(10);
  }

  // ============================================================
  // AI UPDATE
  // ============================================================

  /**
   * @param {import('../Player').default} player - Player sprite.
   * @param {number} time - Phaser timestamp.
   */
  update(player, time) {
    if (this.dead || !this.active) return;

    this.attackCooldown = Math.max(0, this.attackCooldown - 16);
    this.chargeCooldown = Math.max(0, this.chargeCooldown - 16);
    this._updateHPBar();
    this._updateGuardIndicator();

    const dist = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);

    // Charge is only available after the guard breaks, and only when in range.
    if (!this.guarded && this.chargeCooldown <= 0 && dist < 350) {
      this._startCharge(player);
      return; // Skip normal movement while initiating the charge.
    }

    // While the charge tween is running, physics is handled by the tween, not velocity.
    if (this.isCharging) return;

    if (dist < this.chaseRange) {
      // ── CHASE / ATTACK ───────────────────────────────────────────────────
      const dir = player.x < this.x ? -1 : 1;
      this.direction = dir;
      this.setVelocityX(this.speed * dir);

      if (dist < this.attackRange && this.attackCooldown <= 0) {
        player.takeDamage(this.damage);
        this.attackCooldown = this.attackCooldownMax;

        // Shockwave ring at hit location — signals that this was a heavy hit.
        const wave = this.scene.add.image(this.x, this.y, 'shield_hit').setDepth(14);
        this.scene.tweens.add({
          targets: wave, alpha: 0, scale: 2, duration: 300,
          onComplete: () => wave.destroy(),
        });
      }
    } else {
      // ── PATROL ───────────────────────────────────────────────────────────
      this.setVelocityX(this.speed * 0.3 * this.direction);
    }

    this.setFlipX(this.direction < 0);
  }

  // ============================================================
  // CHARGE ATTACK
  // ============================================================

  /**
   * Initiates the charge dash toward the player's current position.
   *
   * NOTE: The tween animates `this.x` directly rather than using setVelocityX.
   * This bypasses Phaser's velocity-drag system, giving a sharp acceleration
   * that feels heavier than a velocity-based push.
   *
   * A polling timer checks for player collision during the 400ms dash window
   * because the overlap system doesn't reliably catch fast-moving tweened objects.
   *
   * @param {import('../Player').default} player - Target for the charge direction.
   */
  _startCharge(player) {
    this.isCharging    = true;
    this.chargeCooldown = this.chargeCooldownMax;
    // Charge TOWARD the player (opposite of retreat direction).
    const dir = player.x < this.x ? -1 : 1;

    // Tween `x` by 300px over 400ms — fast enough to be dangerous, slow enough to dodge.
    this.scene.tweens.add({
      targets:  this,
      x:        this.x + dir * 300,
      duration: 400,
      ease:     'Power2',
      onComplete: () => { this.isCharging = false; },
    });

    // Poll for player proximity during the dash (every 50ms × 8 repeats = 400ms window).
    this.scene.time.addEvent({
      delay:  50,
      repeat: 7,
      callback: () => {
        if (!this.active || !this.scene.player?.active) return;
        const d = Phaser.Math.Distance.Between(
          this.x, this.y,
          this.scene.player.x, this.scene.player.y
        );
        // If within 50px of the player during the charge, deal 80% of normal damage.
        if (d < 50) {
          this.scene.player.takeDamage(this.damage * 0.8);
        }
      },
    });
  }

  // ============================================================
  // COMBAT
  // ============================================================

  /**
   * Handles both the guarded and unguarded damage cases.
   *
   * While guarded:
   *  - Only 20% of damage applies (the armour absorbs the rest).
   *  - A grey tint shows the "clink" of hitting metal.
   *  - On the 3rd hit, the guard breaks with a flash + "GUARD BROKEN!" text.
   *
   * While unguarded:
   *  - Full damage applies.
   *  - White flash via combatFX.flashWhite.
   *  - Damage number via combatFX.showDamageNumber.
   *
   * NOTE: We intentionally skip flashWhite during the guarded state because the
   * grey "clink" tint is more informative (it communicates "armour absorbed this").
   *
   * @param {number} amount - Incoming damage (post-BULLZ multiplier).
   */
  takeDamage(amount) {
    if (this.dead) return;

    if (this.guarded) {
      // Armour absorbs 80% of each hit while the guard holds.
      const reduced = Math.floor(amount * 0.2);
      this.hp -= reduced;
      this.armorHits--;

      // Grey tint ("clink") instead of white to distinguish armour from flesh hits.
      this.setTint(0x888888);
      this.scene.time.delayedCall(100, () => this.clearTint());

      if (this.armorHits <= 0) {
        // Guard breaks — enemy is now fully vulnerable.
        this.guarded = false;

        // Triple-blink to signal the state change clearly.
        this.scene.tweens.add({
          targets: this, alpha: 0.1, duration: 100, yoyo: true, repeat: 2,
        });

        // Floating "GUARD BROKEN!" text above the knight.
        const text = this.scene.add.text(this.x, this.y - 30, 'GUARD BROKEN!', {
          fontSize: '8px', color: '#ff8800', fontFamily: "'Press Start 2P'",
        }).setDepth(20);
        this.scene.tweens.add({
          targets: text, y: text.y - 30, alpha: 0, duration: 800,
          onComplete: () => text.destroy(),
        });
      }
    } else {
      // Unguarded — take full damage with standard hit feedback.
      this.hp -= amount;
      flashWhite(this.scene, this);
      showDamageNumber(this.scene, this.x, this.y - 10, amount);
    }

    if (this.hp <= 0) this.die();
  }

  die() {
    if (this.dead) return;
    this.dead = true;
    shakeOnDeath(this.scene);
    this._hpBar.destroy();
    this._guardIndicator.destroy();

    // Blue/steel tint on death burst to match the knight's armour colour.
    const burst = this.scene.add.image(this.x, this.y, 'death_burst').setDepth(15).setTint(0x4466aa);
    this.scene.tweens.add({
      targets: burst, alpha: 0, scaleX: 2.5, scaleY: 2.5, duration: 400,
      onComplete: () => burst.destroy(),
    });

    this.scene.events.emit('enemy-killed', { score: this.score, x: this.x, y: this.y });
    this.destroy();
  }

  // ============================================================
  // HUD
  // ============================================================

  /**
   * HP bar colour changes from blue (guarded) to red (vulnerable)
   * to give the player instant visual feedback on guard status.
   */
  _updateHPBar() {
    const bar = this._hpBar;
    bar.clear();
    if (this.hp >= this.maxHp) return;
    const pct   = this.hp / this.maxHp;
    const color = this.guarded ? 0x4466aa : 0xff2222;
    bar.fillStyle(0x000000).fillRect(this.x - 15, this.y - 24, 30, 5);
    bar.fillStyle(color).fillRect(this.x - 14, this.y - 23, Math.floor(28 * pct), 3);
  }

  /**
   * Draws one blue block per remaining armour hit above the HP bar.
   * Disappears entirely once the guard is broken.
   */
  _updateGuardIndicator() {
    const g = this._guardIndicator;
    g.clear();
    if (!this.guarded) return;
    g.fillStyle(0x4499ff, 0.5);
    // Each block is 7px wide with 2px gap (9px per block total).
    for (let i = 0; i < this.armorHits; i++) {
      g.fillRect(this.x - 10 + i * 9, this.y - 30, 7, 4);
    }
  }

  destroy() {
    if (this._hpBar           && this._hpBar.active)          this._hpBar.destroy();
    if (this._guardIndicator  && this._guardIndicator.active)  this._guardIndicator.destroy();
    super.destroy();
  }
}
