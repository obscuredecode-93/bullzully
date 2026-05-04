/**
 * @fileoverview Player — Pookie GiGma, the player-controlled warrior of BULLZULLY.
 *
 * Architecture notes:
 *  - Player is a `Phaser.Physics.Arcade.Sprite` that owns its own melee hitbox
 *    (`_meleeHitbox`) as a separate physics image. GameScene registers the
 *    permanent overlap between `_meleeHitbox` and `enemies`; the hitbox is only
 *    set active during the swing window, so enemies take damage once per melee.
 *  - The BULLZ multiplier (`bullzMultiplier`) lives on Player rather than in
 *    GameScene so that GameScene's collider callbacks can always read it from a
 *    single authoritative source (`this.player?.bullzMultiplier ?? 1`).
 *  - All state-change side effects (health changes, score changes, ammo changes)
 *    are broadcast through the scene event emitter so HUDScene stays in sync
 *    without needing a direct reference to the player.
 *
 * Controls:
 *  - Move:  Left/Right arrows or A/D
 *  - Jump:  Z, Space, or Up arrow
 *  - Melee: X
 *  - Range: C (consumes ammo)
 *  - BULLZ: V or Shift (8s cooldown)
 *
 * @module entities/Player
 */

import {
  PLAYER_SPEED, JUMP_VELOCITY, PLAYER_MAX_HEALTH,
  PLAYER_MAX_LIVES, PLAYER_MAX_AMMO, MELEE_DAMAGE,
  RANGED_DAMAGE, MELEE_DURATION_MS, PROJECTILE_SPEED,
} from '../config';

/**
 * Player sprite — Pookie GiGma, the player-controlled warrior.
 */
export default class Player extends Phaser.Physics.Arcade.Sprite {
  /**
   * @param {Phaser.Scene} scene - The active GameScene.
   * @param {number}       x     - Spawn X (world-space).
   * @param {number}       y     - Spawn Y (world-space).
   */
  constructor(scene, x, y) {
    super(scene, x, y, 'player');
    scene.add.existing(this);
    scene.physics.add.existing(this);

    // ── Combat stats ────────────────────────────────────────────────────────
    this.health    = PLAYER_MAX_HEALTH;
    this.maxHealth = PLAYER_MAX_HEALTH;
    this.lives     = PLAYER_MAX_LIVES;
    this.ammo      = PLAYER_MAX_AMMO;
    this.score     = 0;

    // ── State flags ──────────────────────────────────────────────────────────
    this.isAttacking = false;  // True during melee swing; blocks movement input.
    this.isJumping   = false;  // Cleared when body.onFloor() returns true.
    this.facingRight = true;
    this.isDead      = false;
    // Invincible: set true during respawn blink; prevents damage stacking.
    this.invincible  = false;
    this.shielded    = false;
    this.sigmaMode   = false;

    // ── Cooldowns (ms, ticked at ~16ms/frame in update) ─────────────────────
    this.meleeCooldown     = 0;
    this.meleeCooldownMax  = 350;   // 350ms between swings — fast enough to feel responsive.
    this.rangedCooldown    = 0;
    this.rangedCooldownMax = 280;   // Slightly faster than melee; limited by ammo anyway.
    // damageCooldown is the invincibility window after a hit (not a player-triggered cooldown).
    this.damageCooldown    = 0;

    // ── BULLZ special attack ─────────────────────────────────────────────────
    // bullzMultiplier is read by GameScene's collider callbacks, not recalculated there,
    // so there's a single authoritative value per frame.
    this.bullzCooldown    = 0;
    this.bullzCooldownMax = 8000;  // 8 seconds — strong enough to need a long gate.
    this.bullzActive      = false;
    this.bullzMultiplier  = 1;     // Becomes 3 for 2s during BULLZ; read in collider callbacks.
    this._bullzText       = null;  // Floating "BULLZ!" label above the player.
    this._bullzColorEvent = null;  // Phaser TimerEvent for rapid color cycling.

    // ── Physics body ────────────────────────────────────────────────────────
    this.body.setSize(20, 32);
    this.body.setOffset(4, 2);
    this.body.setMaxVelocityX(PLAYER_SPEED * 2); // Caps run speed under sigma/bullz boost.
    this.body.setDragX(800);  // Friction to prevent infinite sliding.
    this.setDepth(10);

    // ── Melee hitbox ─────────────────────────────────────────────────────────
    // Separate physics image used purely for overlap detection.
    // It starts inactive so it doesn't collide while not attacking.
    this._meleeHitbox = scene.physics.add.image(x, y, 'melee_flash');
    this._meleeHitbox.body.setAllowGravity(false);
    this._meleeHitbox.setActive(false).setVisible(false).setDepth(11);

    // ── Shield visual ────────────────────────────────────────────────────────
    // Always rendered at player position; alpha is 0 when not shielded.
    this._shieldGfx = scene.add.image(x, y, 'player_shield').setAlpha(0).setDepth(12);
  }

  // ============================================================
  // UPDATE
  // ============================================================

  /**
   * Main per-frame tick — decrement cooldowns, handle input, sync visuals.
   *
   * Movement is skipped while attacking so the player can't slide mid-swing.
   *
   * @param {Phaser.Types.Input.Keyboard.CursorKeys} cursors - Arrow key state.
   * @param {object} keys - Additional keys (A, D, Z, X, C, V, SPACE, SHIFT).
   * @param {number} time - Phaser scene timestamp (ms since game start).
   */
  update(cursors, keys, time) {
    if (this.isDead) return;

    this.meleeCooldown  = Math.max(0, this.meleeCooldown  - 16);
    this.rangedCooldown = Math.max(0, this.rangedCooldown - 16);
    this.damageCooldown = Math.max(0, this.damageCooldown - 16);
    if (this.bullzCooldown > 0) this.bullzCooldown = Math.max(0, this.bullzCooldown - 16);

    if (!this.isAttacking) this._handleMovement(cursors, keys);
    this._handleActions(cursors, keys);

    // Pin the BULLZ label directly above the player so it moves with them.
    if (this._bullzText?.active) this._bullzText.setPosition(this.x, this.y - 65);

    this._syncHitboxAndShield();
  }

  // ============================================================
  // MOVEMENT
  // ============================================================

  /**
   * Applies horizontal velocity and texture swaps from directional input.
   *
   * Speed is boosted 1.5× during sigmaMode or bullzActive — both abilities
   * use the same multiplier so there's no stacking logic needed.
   *
   * The sigma trail spawns a short-lived image each frame. Using an image
   * (not a particle system) keeps the effect atlas-free; it's destroyed
   * after 200ms via tween, so no manual cleanup is required.
   *
   * @param {Phaser.Types.Input.Keyboard.CursorKeys} cursors
   * @param {object} keys
   */
  _handleMovement(cursors, keys) {
    const left    = cursors.left.isDown  || keys.A.isDown;
    const right   = cursors.right.isDown || keys.D.isDown;
    // JustDown prevents jump from firing every frame while held.
    const jumpKey = Phaser.Input.Keyboard.JustDown(keys.Z)    ||
                    Phaser.Input.Keyboard.JustDown(keys.SPACE) ||
                    Phaser.Input.Keyboard.JustDown(cursors.up);

    const speed = (this.sigmaMode || this.bullzActive) ? PLAYER_SPEED * 1.5 : PLAYER_SPEED;

    if (left) {
      this.setVelocityX(-speed);
      this.facingRight = false;
      this.setFlipX(true);
      this.setTexture(this.body.onFloor() ? 'player_walk' : 'player_jump');
    } else if (right) {
      this.setVelocityX(speed);
      this.facingRight = true;
      this.setFlipX(false);
      this.setTexture(this.body.onFloor() ? 'player_walk' : 'player_jump');
    } else {
      // Multiply instead of zeroing to let the body's dragX ease it out naturally.
      this.setVelocityX(this.body.velocity.x * 0.7);
      if (this.body.onFloor() && !this.isAttacking) this.setTexture('player');
    }

    if (jumpKey && this.body.onFloor()) {
      this.setVelocityY(JUMP_VELOCITY);
      this.isJumping = true;
      this.setTexture('player_jump');
    }
    // Reset jump flag once grounded so future jumps register correctly.
    if (this.body.onFloor() && this.isJumping) this.isJumping = false;

    // Sigma trail: one image per frame — ephemeral, self-destroying.
    if (this.sigmaMode) {
      const trail = this.scene.add.image(this.x, this.y + 8, 'sigma_trail').setDepth(9);
      this.scene.tweens.add({ targets: trail, alpha: 0, duration: 200,
        onComplete: () => trail.destroy() });
    }
  }

  // ============================================================
  // ACTIONS
  // ============================================================

  /**
   * Reads attack key presses and delegates to the corresponding method.
   *
   * All three attacks require `JustDown` (not `isDown`) to prevent rapid-fire
   * from a held key — the cooldown alone isn't enough because JustDown fires
   * only once per keypress, avoiding a burst of attacks at cooldown reset.
   *
   * @param {Phaser.Types.Input.Keyboard.CursorKeys} cursors
   * @param {object} keys
   */
  _handleActions(cursors, keys) {
    if (Phaser.Input.Keyboard.JustDown(keys.X) && this.meleeCooldown <= 0)
      this._meleeAttack();

    if (Phaser.Input.Keyboard.JustDown(keys.C) && this.rangedCooldown <= 0 && this.ammo > 0)
      this._rangedAttack();

    // Two keys for BULLZ so both keyboard layouts feel natural (laptop vs desktop).
    const bullzKey = Phaser.Input.Keyboard.JustDown(keys.V) ||
                     Phaser.Input.Keyboard.JustDown(keys.SHIFT);
    if (bullzKey && this.bullzCooldown <= 0 && !this.bullzActive)
      this._bullzAttack();
  }

  // ============================================================
  // MELEE ATTACK
  // ============================================================

  /**
   * Activates the melee hitbox for one swing duration, with a flash tween.
   *
   * The hitbox is a separate physics image so GameScene's permanent overlap
   * collider (`getMeleeHitbox()` vs `enemies`) fires without any per-frame
   * proximity check. Setting it active/inactive is the only switch needed.
   *
   * `isAttacking` blocks movement during the swing so the player commits
   * to their position — prevents kiting into melee for free hits.
   */
  _meleeAttack() {
    this.isAttacking = true;
    this.meleeCooldown = this.meleeCooldownMax;
    this.setTexture('player_attack');
    this.setFlipX(!this.facingRight);

    // Place hitbox 32px in front of the player — wide enough to feel generous.
    const offsetX = this.facingRight ? 32 : -32;
    this._meleeHitbox.setPosition(this.x + offsetX, this.y);
    this._meleeHitbox.setActive(true).setVisible(true);
    this._meleeHitbox.body.reset(this.x + offsetX, this.y);
    this._meleeHitbox.body.setSize(48, 32);

    // Visual flash fades over 70% of the swing window so it disappears before the hitbox deactivates.
    this.scene.tweens.add({
      targets: this._meleeHitbox,
      alpha: { from: 0.8, to: 0 },
      duration: MELEE_DURATION_MS * 0.7,
    });

    this.scene.time.delayedCall(MELEE_DURATION_MS, () => {
      this._meleeHitbox.setActive(false).setVisible(false).setAlpha(1);
      this.isAttacking = false;
      this.setTexture(this.body.onFloor() ? 'player' : 'player_jump');
    });
  }

  // ============================================================
  // RANGED ATTACK
  // ============================================================

  /**
   * Fires a player bullet that travels horizontally until it exits the room or
   * hits an enemy or platform.
   *
   * Bullets are added to `scene.playerProjectiles` so GameScene's permanent
   * overlap colliders handle hit detection without per-bullet polling.
   * `setAllowGravity(false)` keeps them flying straight — no arc.
   *
   * The 1800ms self-destruct prevents lingering projectiles from accumulating
   * if the player fires at a wall and walks away.
   */
  _rangedAttack() {
    if (this.ammo <= 0) return;
    this.ammo--;
    this.rangedCooldown = this.rangedCooldownMax;

    const bullet = this.scene.physics.add.image(
      this.x + (this.facingRight ? 20 : -20),
      this.y - 4,
      'player_bullet'
    ).setDepth(9);

    bullet.body.setAllowGravity(false);
    bullet.setData('damage', RANGED_DAMAGE);
    bullet.setVelocityX(this.facingRight ? PROJECTILE_SPEED : -PROJECTILE_SPEED);

    this.scene.time.delayedCall(1800, () => { if (bullet.active) bullet.destroy(); });
    this.scene.playerProjectiles.add(bullet);
    // Notify HUD immediately so ammo display updates this frame.
    this.scene.events.emit('ammo-changed', this.ammo);
  }

  // ============================================================
  // BULLZ SPECIAL ATTACK
  // ============================================================

  /**
   * Activates the BULLZ mode: 2s of tripled damage output, speed boost, and
   * an initial knockback burst on all nearby enemies.
   *
   * Visual breakdown:
   *  - Gold screen flash (scrollFactor 0 rectangle, alpha 0 → 0.35 → 0).
   *  - "BULLZ!" floating text that color-cycles at 110ms/step.
   *  - 8-spark burst radiating outward (one image per spoke, destroyed via tween).
   *  - Camera shake for impact weight.
   *
   * The knockback loop uses `setVelocity` directly rather than takeDamage for
   * each enemy because we want the physics impulse without triggering death FX
   * on every nearby enemy (10 damage is minor; the main payoff is the triple
   * damage window that follows).
   */
  _bullzAttack() {
    this.bullzActive     = true;
    this.bullzCooldown   = this.bullzCooldownMax;
    this.bullzMultiplier = 3; // Read by GameScene collider callbacks for 2s.

    // ── Screen flash ─────────────────────────────────────────────────────────
    const { width, height } = this.scene.cameras.main;
    const overlay = this.scene.add
      .rectangle(width / 2, height / 2, width, height, 0xffcc00, 0)
      .setScrollFactor(0).setDepth(50);
    this.scene.tweens.add({
      targets: overlay, fillAlpha: 0.35,
      duration: 130, yoyo: true,
      onComplete: () => overlay.destroy(),
    });
    this.scene.cameras.main.shake(250, 0.018);

    // ── "BULLZ!" label above player ──────────────────────────────────────────
    this._bullzText = this.scene.add.text(this.x, this.y - 65, 'BULLZ!', {
      fontSize: '18px', color: '#ffcc00',
      fontFamily: "'Press Start 2P'", stroke: '#000000', strokeThickness: 5,
    }).setDepth(28).setOrigin(0.5);

    // Rapid color cycling — gold → white → orange — signals "powered up" state.
    let colorIdx = 0;
    const COLORS = [0xffcc00, 0xffffff, 0xff8800];
    this._bullzColorEvent = this.scene.time.addEvent({
      delay: 110, loop: true,
      callback: () => {
        if (!this._bullzText?.active) return;
        colorIdx = (colorIdx + 1) % COLORS.length;
        this._bullzText.setTint(COLORS[colorIdx]);
      },
    });

    // ── Radial spark burst (8 spokes evenly spaced) ──────────────────────────
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const spark = this.scene.add.image(this.x, this.y, 'hit_spark')
        .setDepth(22).setTint(0xffcc00).setScale(1.5);
      this.scene.tweens.add({
        targets: spark,
        x: this.x + Math.cos(angle) * 90,
        y: this.y + Math.sin(angle) * 90,
        alpha: 0, scale: 0,
        duration: 380, ease: 'Power2',
        onComplete: () => spark.destroy(),
      });
    }

    // ── Initial knockback pulse ───────────────────────────────────────────────
    // 160px radius — close enough to be meaningful, not so wide it trivialises rooms.
    const KNOCK_RANGE = 160;
    this.scene.enemies?.getChildren().forEach(enemy => {
      if (!enemy.active) return;
      const dist = Phaser.Math.Distance.Between(this.x, this.y, enemy.x, enemy.y);
      if (dist < KNOCK_RANGE) {
        const dir = enemy.x >= this.x ? 1 : -1;
        if (enemy.setVelocity) enemy.setVelocity(dir * 360, -220);
        if (enemy.takeDamage) enemy.takeDamage(10); // Minor chip — knockback is the real payoff.
      }
    });

    // Notify HUDScene to start rendering the "ACTIVE!" bar state.
    this.scene.events.emit('bullz-activated');

    // ── End after 2 seconds ───────────────────────────────────────────────────
    this.scene.time.delayedCall(2000, () => {
      this.bullzActive     = false;
      this.bullzMultiplier = 1;

      this._bullzColorEvent?.remove();
      this._bullzColorEvent = null;

      // Float the label away rather than instantly destroying it — softer landing.
      if (this._bullzText?.active) {
        this.scene.tweens.add({
          targets: this._bullzText,
          alpha: 0, y: this._bullzText.y - 20,
          duration: 350,
          onComplete: () => { this._bullzText?.destroy(); this._bullzText = null; },
        });
      }
    });
  }

  // ============================================================
  // DAMAGE
  // ============================================================

  /**
   * Applies incoming damage with shield check, invincibility check, and
   * an 800ms damage cooldown to prevent rapid stacking from overlapping enemies.
   *
   * Visual feedback on hit:
   *  - Red tint for 150ms (distinguishable from enemy grey/white tints).
   *  - Alpha blink × 3 for the brief invincibility window.
   *  - Strong 300ms camera shake to convey impact weight.
   *
   * @param {number} amount - Damage to apply (may be pre-multiplied by BULLZ).
   */
  takeDamage(amount) {
    if (this.isDead || this.invincible || this.damageCooldown > 0) return;

    if (this.shielded) {
      // Shield absorbs one hit completely, then breaks.
      this.shielded = false;
      this._shieldGfx.setAlpha(0);
      const hit = this.scene.add.image(this.x, this.y, 'shield_hit').setDepth(15);
      this.scene.tweens.add({ targets: hit, alpha: 0, scale: 2, duration: 300,
        onComplete: () => hit.destroy() });
      this.scene.cameras.main.shake(150, 0.005);
      return;
    }

    this.health -= Math.max(0, amount);
    this.damageCooldown = 800; // 800ms invulnerability window after a hit.

    this.setTint(0xff0000);
    this.scene.time.delayedCall(150, () => { if (this.active) this.clearTint(); });

    // Blink communicates that the player is temporarily invincible.
    this.scene.tweens.add({ targets: this, alpha: 0.2, duration: 80, yoyo: true, repeat: 3 });

    this.scene.cameras.main.shake(300, 0.02);

    this.scene.events.emit('health-changed', this.health);
    if (this.health <= 0) this._die();
  }

  // ============================================================
  // DEATH / RESPAWN
  // ============================================================

  /**
   * Triggers the death sequence: decrement lives, burst effect, float upward,
   * then emit either 'player-respawn' or 'game-over' depending on remaining lives.
   *
   * The 800ms tween before emitting gives the death burst time to play out
   * before the scene reacts.
   */
  _die() {
    if (this.isDead) return;
    this.isDead = true;
    this.lives--;
    // Small upward impulse so the player visually "flies back" on death.
    this.setVelocity(0, -200);

    this.scene.events.emit('lives-changed', this.lives);

    const burst = this.scene.add.image(this.x, this.y, 'death_burst')
      .setDepth(18).setScale(1.5);
    this.scene.tweens.add({ targets: burst, alpha: 0, scale: 3, duration: 600,
      onComplete: () => burst.destroy() });

    this.scene.tweens.add({
      targets: this, alpha: 0, y: this.y - 40, duration: 800,
      onComplete: () => {
        if (this.lives > 0) {
          this.scene.events.emit('player-respawn');
        } else {
          this.scene.events.emit('game-over', { score: this.score, health: 0, lives: 0 });
        }
      },
    });
  }

  /**
   * Resets the player at a new position after a life loss.
   *
   * `invincible = true` during the 1400ms blink window prevents the player
   * from being hit the instant they respawn — e.g., by an enemy standing on
   * the spawn point.
   *
   * @param {number} x - Respawn X (world-space).
   * @param {number} y - Respawn Y (world-space).
   */
  respawn(x, y) {
    this.isDead     = false;
    this.health     = this.maxHealth;
    this.invincible = true;
    this.damageCooldown = 0;
    this.setPosition(x, y);
    this.setAlpha(1);
    this.setVelocity(0, 0);

    // Seven blinks over 1400ms = two blinks per 400ms ≈ a visible, countable grace period.
    this.scene.tweens.add({ targets: this, alpha: 0.4, duration: 200, yoyo: true, repeat: 6 });
    this.scene.time.delayedCall(1400, () => { this.invincible = false; this.alpha = 1; });
    this.scene.events.emit('health-changed', this.health);
  }

  // ============================================================
  // PICKUPS
  // ============================================================

  /**
   * Adds health, capped at maxHealth.
   * @param {number} amount - HP to restore.
   */
  collectHealth(amount) {
    this.health = Math.min(this.maxHealth, this.health + amount);
    this.scene.events.emit('health-changed', this.health);
  }

  /**
   * Adds ammo, capped at PLAYER_MAX_AMMO.
   * @param {number} amount - Shots to add.
   */
  collectAmmo(amount) {
    this.ammo = Math.min(PLAYER_MAX_AMMO, this.ammo + amount);
    this.scene.events.emit('ammo-changed', this.ammo);
  }

  /**
   * Activates sigma mode for 6 seconds: 1.5× speed and a trail effect.
   * The timer is a simple delayedCall — no stackable duration logic needed
   * because sigma pickups are rare and the effect is cosmetically obvious.
   */
  activateSigmaMode() {
    this.sigmaMode = true;
    this.scene.time.delayedCall(6000, () => { this.sigmaMode = false; });
    const txt = this.scene.add.text(this.x, this.y - 40, 'SIGMA MODE!', {
      fontSize: '8px', color: '#ffff00', fontFamily: "'Press Start 2P'",
    }).setDepth(20).setOrigin(0.5);
    this.scene.tweens.add({ targets: txt, y: txt.y - 30, alpha: 0, duration: 900,
      onComplete: () => txt.destroy() });
  }

  /**
   * Equips the shield: absorbs the next hit entirely.
   *
   * The 10s fallback timer clears the shield if the player never takes damage —
   * prevents carrying it across rooms indefinitely.
   */
  activateShield() {
    this.shielded = true;
    this._shieldGfx.setAlpha(0.7);
    this.scene.time.delayedCall(10000, () => {
      if (this.shielded) { this.shielded = false; this._shieldGfx.setAlpha(0); }
    });
  }

  /**
   * Adds to the player score and broadcasts the new total.
   * @param {number} amount - Score to add.
   */
  addScore(amount) {
    this.score += amount;
    this.scene.events.emit('score-changed', this.score);
  }

  // ============================================================
  // HELPERS
  // ============================================================

  /**
   * Keeps the shield overlay and melee hitbox visually in sync each frame.
   * Called at the end of `update` so it runs after position has been set.
   */
  _syncHitboxAndShield() {
    if (this._shieldGfx) this._shieldGfx.setPosition(this.x, this.y);
  }

  /**
   * Returns the melee hitbox physics image used in GameScene's permanent
   * overlap collider. Exposing it via getter keeps the hitbox private while
   * still giving GameScene a reference at setup time.
   *
   * @returns {Phaser.Physics.Arcade.Image} The melee hitbox image.
   */
  getMeleeHitbox() { return this._meleeHitbox; }

  /**
   * Cleans up all owned child objects before the Phaser object pool reclaims
   * the sprite. The `?.remove()` / `?.destroy()` guards handle the case where
   * the player dies mid-BULLZ (color event and text may still be live).
   */
  destroy() {
    this._bullzColorEvent?.remove();
    if (this._bullzText?.active) this._bullzText.destroy();
    if (this._meleeHitbox?.active) this._meleeHitbox.destroy();
    if (this._shieldGfx?.active)  this._shieldGfx.destroy();
    super.destroy();
  }
}
