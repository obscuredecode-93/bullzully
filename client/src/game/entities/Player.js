import {
  PLAYER_SPEED, JUMP_VELOCITY, PLAYER_MAX_HEALTH,
  PLAYER_MAX_LIVES, PLAYER_MAX_AMMO, MELEE_DAMAGE,
  RANGED_DAMAGE, MELEE_DURATION_MS, PROJECTILE_SPEED,
} from '../config';

/**
 * Player — Pookie GiGma, the warrior.
 *
 * Controls: Arrow / WASD = move, Z / Space = jump, X = melee, C = ranged
 */
export default class Player extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y) {
    super(scene, x, y, 'player');
    scene.add.existing(this);
    scene.physics.add.existing(this);

    // Stats
    this.health = PLAYER_MAX_HEALTH;
    this.maxHealth = PLAYER_MAX_HEALTH;
    this.lives = PLAYER_MAX_LIVES;
    this.ammo = PLAYER_MAX_AMMO;
    this.score = 0;

    // State flags
    this.isAttacking = false;
    this.isJumping = false;
    this.facingRight = true;
    this.isDead = false;
    this.invincible = false;
    this.shielded = false;
    this.sigmaMode = false;  // speed boost

    // Cooldowns (ms)
    this.meleeCooldown = 0;
    this.meleeCooldownMax = 350;
    this.rangedCooldown = 0;
    this.rangedCooldownMax = 280;
    this.damageCooldown = 0;   // invincibility frames after hit

    // Physics
    this.body.setSize(20, 32);
    this.body.setOffset(4, 2);
    this.body.setMaxVelocityX(PLAYER_SPEED * 2);
    this.body.setDragX(800);
    this.setDepth(10);
    this.setScale(1);

    // Melee hitbox (invisible physics body used for overlap detection)
    this._meleeHitbox = scene.physics.add.image(x, y, 'melee_flash');
    this._meleeHitbox.body.setAllowGravity(false);
    this._meleeHitbox.setActive(false).setVisible(false);
    this._meleeHitbox.setDepth(11);

    // Shield visual overlay
    this._shieldGfx = scene.add.image(x, y, 'player_shield').setAlpha(0).setDepth(12);
  }

  // ─── UPDATE ─────────────────────────────────────────────────────────────
  update(cursors, keys, time) {
    if (this.isDead) return;

    this.meleeCooldown = Math.max(0, this.meleeCooldown - 16);
    this.rangedCooldown = Math.max(0, this.rangedCooldown - 16);
    this.damageCooldown = Math.max(0, this.damageCooldown - 16);

    if (!this.isAttacking) this._handleMovement(cursors, keys);
    this._handleActions(cursors, keys);
    this._syncHitboxAndShield();
  }

  _handleMovement(cursors, keys) {
    const left = cursors.left.isDown || keys.A.isDown;
    const right = cursors.right.isDown || keys.D.isDown;
    const jumpKey = Phaser.Input.Keyboard.JustDown(keys.Z) ||
                    Phaser.Input.Keyboard.JustDown(keys.SPACE) ||
                    Phaser.Input.Keyboard.JustDown(cursors.up);

    const speed = this.sigmaMode ? PLAYER_SPEED * 1.6 : PLAYER_SPEED;

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
      // Decelerate
      this.setVelocityX(this.body.velocity.x * 0.7);
      if (this.body.onFloor() && !this.isAttacking) this.setTexture('player');
    }

    if (jumpKey && this.body.onFloor()) {
      this.setVelocityY(JUMP_VELOCITY);
      this.isJumping = true;
      this.setTexture('player_jump');
    }

    if (this.body.onFloor() && this.isJumping) {
      this.isJumping = false;
    }

    // Leave sigma trail
    if (this.sigmaMode) {
      const trail = this.scene.add.image(this.x, this.y + 8, 'sigma_trail').setDepth(9);
      this.scene.tweens.add({ targets: trail, alpha: 0, duration: 200,
        onComplete: () => trail.destroy() });
    }
  }

  _handleActions(cursors, keys) {
    const meleeKey = Phaser.Input.Keyboard.JustDown(keys.X);
    const rangedKey = Phaser.Input.Keyboard.JustDown(keys.C);

    if (meleeKey && this.meleeCooldown <= 0) this._meleeAttack();
    if (rangedKey && this.rangedCooldown <= 0 && this.ammo > 0) this._rangedAttack();
  }

  // ─── MELEE ──────────────────────────────────────────────────────────────
  _meleeAttack() {
    this.isAttacking = true;
    this.meleeCooldown = this.meleeCooldownMax;
    this.setTexture('player_attack');
    this.setFlipX(!this.facingRight);

    // Position and activate hitbox
    const offsetX = this.facingRight ? 32 : -32;
    this._meleeHitbox.setPosition(this.x + offsetX, this.y);
    this._meleeHitbox.setActive(true).setVisible(true);
    this._meleeHitbox.body.reset(this.x + offsetX, this.y);
    this._meleeHitbox.body.setSize(48, 32);

    // Flash effect
    this.scene.tweens.add({
      targets: this._meleeHitbox,
      alpha: { from: 0.8, to: 0 },
      duration: MELEE_DURATION_MS * 0.7,
    });

    // Deactivate hitbox after duration
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
    bullet.setData('isPlayerProjectile', true);

    bullet.setVelocityX(this.facingRight ? PROJECTILE_SPEED : -PROJECTILE_SPEED);

    // Destroy on leaving room bounds or after timeout
    this.scene.time.delayedCall(1800, () => { if (bullet.active) bullet.destroy(); });
    this.scene.playerProjectiles.add(bullet);

    this.scene.events.emit('ammo-changed', this.ammo);
  }

  // ─── DAMAGE ─────────────────────────────────────────────────────────────
  takeDamage(amount) {
    if (this.isDead || this.invincible || this.damageCooldown > 0) return;

    if (this.shielded) {
      // Shield absorbs one hit
      this.shielded = false;
      this._shieldGfx.setAlpha(0);
      const hit = this.scene.add.image(this.x, this.y, 'shield_hit').setDepth(15);
      this.scene.tweens.add({ targets: hit, alpha: 0, scale: 2, duration: 300,
        onComplete: () => hit.destroy() });
      this.scene.cameras.main.shake(150, 0.005);
      return;
    }

    const actual = Math.max(0, amount);
    this.health -= actual;
    this.damageCooldown = 800; // 800ms invincibility

    // Damage flash
    this.scene.tweens.add({ targets: this, alpha: 0.2, duration: 80, yoyo: true, repeat: 3 });
    this.scene.cameras.main.shake(120, 0.006);

    // Red tint flash
    this.setTint(0xff4444);
    this.scene.time.delayedCall(150, () => this.clearTint());

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
      targets: this,
      alpha: 0,
      y: this.y - 40,
      duration: 800,
      onComplete: () => {
        if (this.lives > 0) {
          this.scene.events.emit('player-respawn');
        } else {
          this.scene.events.emit('game-over', {
            score: this.score,
            health: 0,
            lives: 0,
          });
        }
      },
    });
  }

  respawn(x, y) {
    this.isDead = false;
    this.health = this.maxHealth;
    this.invincible = true;
    this.damageCooldown = 0;
    this.setPosition(x, y);
    this.setAlpha(1);
    this.setVelocity(0, 0);

    // Brief invincibility after respawn
    this.scene.tweens.add({ targets: this, alpha: 0.4, duration: 200, yoyo: true, repeat: 6 });
    this.scene.time.delayedCall(1400, () => {
      this.invincible = false;
      this.alpha = 1;
    });

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
    // Shield expires after 10s if not hit
    this.scene.time.delayedCall(10000, () => {
      if (this.shielded) {
        this.shielded = false;
        this._shieldGfx.setAlpha(0);
      }
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

  getMeleeHitbox() {
    return this._meleeHitbox;
  }

  destroy() {
    if (this._meleeHitbox?.active) this._meleeHitbox.destroy();
    if (this._shieldGfx?.active) this._shieldGfx.destroy();
    super.destroy();
  }
}
