import {
  PLAYER_SPEED, JUMP_VELOCITY, PLAYER_MAX_HEALTH,
  PLAYER_MAX_LIVES, PLAYER_MAX_AMMO, MELEE_DAMAGE,
  RANGED_DAMAGE, MELEE_DURATION_MS, PROJECTILE_SPEED,
} from '../config';

/**
 * Player — Pookie GiGma, the warrior.
 *
 * Controls: Arrow / WASD = move, Z / Space = jump, X = melee, C = ranged
 *           V / SHIFT = BULLZ special attack
 */
export default class Player extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y) {
    super(scene, x, y, 'player');
    scene.add.existing(this);
    scene.physics.add.existing(this);

    // Stats
    this.health    = PLAYER_MAX_HEALTH;
    this.maxHealth = PLAYER_MAX_HEALTH;
    this.lives     = PLAYER_MAX_LIVES;
    this.ammo      = PLAYER_MAX_AMMO;
    this.score     = 0;

    // State flags
    this.isAttacking  = false;
    this.isJumping    = false;
    this.facingRight  = true;
    this.isDead       = false;
    this.invincible   = false;
    this.shielded     = false;
    this.sigmaMode    = false;

    // Standard cooldowns (ms — ticked each update at ~16ms/frame)
    this.meleeCooldown    = 0;
    this.meleeCooldownMax = 350;
    this.rangedCooldown   = 0;
    this.rangedCooldownMax = 280;
    this.damageCooldown   = 0;

    // ── BULLZ special attack ─────────────────────────────────────────────────
    this.bullzCooldown    = 0;
    this.bullzCooldownMax = 8000;   // 8 seconds between uses
    this.bullzActive      = false;
    this.bullzMultiplier  = 1;      // GameScene multiplies damage by this
    this._bullzText       = null;   // floating "BULLZ!" text
    this._bullzColorEvent = null;

    // Physics
    this.body.setSize(20, 32);
    this.body.setOffset(4, 2);
    this.body.setMaxVelocityX(PLAYER_SPEED * 2);
    this.body.setDragX(800);
    this.setDepth(10);

    // Melee hitbox (used for overlap detection only)
    this._meleeHitbox = scene.physics.add.image(x, y, 'melee_flash');
    this._meleeHitbox.body.setAllowGravity(false);
    this._meleeHitbox.setActive(false).setVisible(false).setDepth(11);

    // Shield visual
    this._shieldGfx = scene.add.image(x, y, 'player_shield').setAlpha(0).setDepth(12);
  }

  // ─── UPDATE ─────────────────────────────────────────────────────────────
  update(cursors, keys, time) {
    if (this.isDead) return;

    this.meleeCooldown  = Math.max(0, this.meleeCooldown  - 16);
    this.rangedCooldown = Math.max(0, this.rangedCooldown - 16);
    this.damageCooldown = Math.max(0, this.damageCooldown - 16);
    if (this.bullzCooldown > 0) this.bullzCooldown = Math.max(0, this.bullzCooldown - 16);

    if (!this.isAttacking) this._handleMovement(cursors, keys);
    this._handleActions(cursors, keys);

    // Keep BULLZ text pinned above the player
    if (this._bullzText?.active) this._bullzText.setPosition(this.x, this.y - 65);

    this._syncHitboxAndShield();
  }

  // ─── MOVEMENT ───────────────────────────────────────────────────────────
  _handleMovement(cursors, keys) {
    const left    = cursors.left.isDown  || keys.A.isDown;
    const right   = cursors.right.isDown || keys.D.isDown;
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
      this.setVelocityX(this.body.velocity.x * 0.7);
      if (this.body.onFloor() && !this.isAttacking) this.setTexture('player');
    }

    if (jumpKey && this.body.onFloor()) {
      this.setVelocityY(JUMP_VELOCITY);
      this.isJumping = true;
      this.setTexture('player_jump');
    }
    if (this.body.onFloor() && this.isJumping) this.isJumping = false;

    // Sigma trail
    if (this.sigmaMode) {
      const trail = this.scene.add.image(this.x, this.y + 8, 'sigma_trail').setDepth(9);
      this.scene.tweens.add({ targets: trail, alpha: 0, duration: 200,
        onComplete: () => trail.destroy() });
    }
  }

  // ─── ACTIONS ────────────────────────────────────────────────────────────
  _handleActions(cursors, keys) {
    if (Phaser.Input.Keyboard.JustDown(keys.X) && this.meleeCooldown <= 0)
      this._meleeAttack();

    if (Phaser.Input.Keyboard.JustDown(keys.C) && this.rangedCooldown <= 0 && this.ammo > 0)
      this._rangedAttack();

    // V or SHIFT = BULLZ special
    const bullzKey = Phaser.Input.Keyboard.JustDown(keys.V) ||
                     Phaser.Input.Keyboard.JustDown(keys.SHIFT);
    if (bullzKey && this.bullzCooldown <= 0 && !this.bullzActive)
      this._bullzAttack();
  }

  // ─── MELEE ──────────────────────────────────────────────────────────────
  _meleeAttack() {
    this.isAttacking = true;
    this.meleeCooldown = this.meleeCooldownMax;
    this.setTexture('player_attack');
    this.setFlipX(!this.facingRight);

    const offsetX = this.facingRight ? 32 : -32;
    this._meleeHitbox.setPosition(this.x + offsetX, this.y);
    this._meleeHitbox.setActive(true).setVisible(true);
    this._meleeHitbox.body.reset(this.x + offsetX, this.y);
    this._meleeHitbox.body.setSize(48, 32);

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

  // ─── RANGED ─────────────────────────────────────────────────────────────
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
    this.scene.events.emit('ammo-changed', this.ammo);
  }

  // ─── BULLZ SPECIAL ATTACK ───────────────────────────────────────────────
  _bullzAttack() {
    this.bullzActive     = true;
    this.bullzCooldown   = this.bullzCooldownMax;
    this.bullzMultiplier = 3;

    // ── Golden screen flash ──────────────────────────────────────────────
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

    // ── "BULLZ!" text above player ─────────────────────────────────────
    this._bullzText = this.scene.add.text(this.x, this.y - 65, 'BULLZ!', {
      fontSize: '18px', color: '#ffcc00',
      fontFamily: "'Press Start 2P'", stroke: '#000000', strokeThickness: 5,
    }).setDepth(28).setOrigin(0.5);

    // Rapid color cycling: gold → white → orange
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

    // ── Particle burst (8 sparks radiate outward) ───────────────────────
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

    // ── Knockback all nearby enemies ────────────────────────────────────
    const KNOCK_RANGE = 160;
    this.scene.enemies?.getChildren().forEach(enemy => {
      if (!enemy.active) return;
      const dist = Phaser.Math.Distance.Between(this.x, this.y, enemy.x, enemy.y);
      if (dist < KNOCK_RANGE) {
        const dir = enemy.x >= this.x ? 1 : -1;
        if (enemy.setVelocity) enemy.setVelocity(dir * 360, -220);
        if (enemy.takeDamage) enemy.takeDamage(10);
      }
    });

    // Signal HUD that BULLZ is active
    this.scene.events.emit('bullz-activated');

    // ── End after 2 seconds ─────────────────────────────────────────────
    this.scene.time.delayedCall(2000, () => {
      this.bullzActive     = false;
      this.bullzMultiplier = 1;

      this._bullzColorEvent?.remove();
      this._bullzColorEvent = null;

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

  // ─── DAMAGE ─────────────────────────────────────────────────────────────
  takeDamage(amount) {
    if (this.isDead || this.invincible || this.damageCooldown > 0) return;

    if (this.shielded) {
      this.shielded = false;
      this._shieldGfx.setAlpha(0);
      const hit = this.scene.add.image(this.x, this.y, 'shield_hit').setDepth(15);
      this.scene.tweens.add({ targets: hit, alpha: 0, scale: 2, duration: 300,
        onComplete: () => hit.destroy() });
      this.scene.cameras.main.shake(150, 0.005);
      return;
    }

    this.health -= Math.max(0, amount);
    this.damageCooldown = 800;

    // Strong red flash (150ms)
    this.setTint(0xff0000);
    this.scene.time.delayedCall(150, () => { if (this.active) this.clearTint(); });

    // Punchy invincibility blink
    this.scene.tweens.add({ targets: this, alpha: 0.2, duration: 80, yoyo: true, repeat: 3 });

    // Strong screen shake on player hit
    this.scene.cameras.main.shake(300, 0.02);

    this.scene.events.emit('health-changed', this.health);
    if (this.health <= 0) this._die();
  }

  _die() {
    if (this.isDead) return;
    this.isDead = true;
    this.lives--;
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

  respawn(x, y) {
    this.isDead     = false;
    this.health     = this.maxHealth;
    this.invincible = true;
    this.damageCooldown = 0;
    this.setPosition(x, y);
    this.setAlpha(1);
    this.setVelocity(0, 0);

    this.scene.tweens.add({ targets: this, alpha: 0.4, duration: 200, yoyo: true, repeat: 6 });
    this.scene.time.delayedCall(1400, () => { this.invincible = false; this.alpha = 1; });
    this.scene.events.emit('health-changed', this.health);
  }

  // ─── PICKUPS ────────────────────────────────────────────────────────────
  collectHealth(amount) {
    this.health = Math.min(this.maxHealth, this.health + amount);
    this.scene.events.emit('health-changed', this.health);
  }

  collectAmmo(amount) {
    this.ammo = Math.min(PLAYER_MAX_AMMO, this.ammo + amount);
    this.scene.events.emit('ammo-changed', this.ammo);
  }

  activateSigmaMode() {
    this.sigmaMode = true;
    this.scene.time.delayedCall(6000, () => { this.sigmaMode = false; });
    const txt = this.scene.add.text(this.x, this.y - 40, 'SIGMA MODE!', {
      fontSize: '8px', color: '#ffff00', fontFamily: "'Press Start 2P'",
    }).setDepth(20).setOrigin(0.5);
    this.scene.tweens.add({ targets: txt, y: txt.y - 30, alpha: 0, duration: 900,
      onComplete: () => txt.destroy() });
  }

  activateShield() {
    this.shielded = true;
    this._shieldGfx.setAlpha(0.7);
    this.scene.time.delayedCall(10000, () => {
      if (this.shielded) { this.shielded = false; this._shieldGfx.setAlpha(0); }
    });
  }

  addScore(amount) {
    this.score += amount;
    this.scene.events.emit('score-changed', this.score);
  }

  // ─── HELPERS ────────────────────────────────────────────────────────────
  _syncHitboxAndShield() {
    if (this._shieldGfx) this._shieldGfx.setPosition(this.x, this.y);
  }

  getMeleeHitbox() { return this._meleeHitbox; }

  destroy() {
    this._bullzColorEvent?.remove();
    if (this._bullzText?.active) this._bullzText.destroy();
    if (this._meleeHitbox?.active) this._meleeHitbox.destroy();
    if (this._shieldGfx?.active)  this._shieldGfx.destroy();
    super.destroy();
  }
}
