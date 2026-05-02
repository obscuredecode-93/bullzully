import { MELEE_DAMAGE } from '../../config';

/**
 * DiscordGhoster — teleports randomly when taking damage or on a timer.
 * Ignores gravity, floats toward player.
 */
export default class DiscordGhoster extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y) {
    super(scene, x, y, 'discord_ghoster');
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.hp = 40;
    this.maxHp = 40;
    this.damage = MELEE_DAMAGE * 0.5; // 12.5
    this.speed = 55;
    this.chaseRange = 350;
    this.attackRange = 36;
    this.attackCooldown = 0;
    this.attackCooldownMax = 1200;
    this.teleportCooldown = 0;
    this.teleportCooldownMax = 3500;
    this.dead = false;
    this.score = 150;
    this.alpha = 0.85;

    this.body.setAllowGravity(false);  // Ghost — no gravity
    this.body.setSize(22, 28);
    this.setDepth(5);
    this._hpBar = scene.add.graphics().setDepth(10);
  }

  update(player, time) {
    if (this.dead || !this.active) return;

    this.attackCooldown = Math.max(0, this.attackCooldown - 16);
    this.teleportCooldown = Math.max(0, this.teleportCooldown - 16);
    this._updateHPBar();

    const dist = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);

    // Random teleport on cooldown
    if (this.teleportCooldown <= 0 && dist < this.chaseRange) {
      this._teleport(player);
      this.teleportCooldown = this.teleportCooldownMax;
      return;
    }

    if (dist < this.chaseRange) {
      // Float toward player
      const angle = Phaser.Math.Angle.Between(this.x, this.y, player.x, player.y);
      this.setVelocityX(Math.cos(angle) * this.speed);
      this.setVelocityY(Math.sin(angle) * this.speed);

      if (dist < this.attackRange && this.attackCooldown <= 0) {
        player.takeDamage(this.damage);
        this.attackCooldown = this.attackCooldownMax;
      }
    } else {
      // Hover in place with slight oscillation
      this.setVelocity(0, Math.sin(time * 0.002) * 20);
    }

    this.setFlipX(player.x < this.x);

    // Pulsing alpha for ghostly effect
    this.setAlpha(0.7 + Math.sin(time * 0.004) * 0.15);
  }

  _teleport(player) {
    const fx = this.scene.add.image(this.x, this.y, 'teleport_fx').setDepth(15);
    this.scene.tweens.add({
      targets: fx,
      alpha: 0, scaleX: 1.5, scaleY: 1.5,
      duration: 300,
      onComplete: () => fx.destroy(),
    });

    // Teleport to random spot near player
    const angle = Math.random() * Math.PI * 2;
    const dist = Phaser.Math.Between(120, 250);
    const newX = Phaser.Math.Clamp(player.x + Math.cos(angle) * dist, 50, 1870);
    const newY = Phaser.Math.Clamp(player.y + Math.sin(angle) * dist, 50, 420);

    this.setPosition(newX, newY);
    this.setVelocity(0, 0);

    const fx2 = this.scene.add.image(newX, newY, 'teleport_fx').setDepth(15);
    this.scene.tweens.add({
      targets: fx2,
      alpha: 0, scaleX: 1.5, scaleY: 1.5,
      duration: 300,
      onComplete: () => fx2.destroy(),
    });
  }

  takeDamage(amount) {
    if (this.dead) return;
    this.hp -= amount;

    // 40% chance to teleport when hit
    if (Math.random() < 0.4 && this.teleportCooldown <= 0) {
      const player = this.scene.player;
      if (player) {
        this._teleport(player);
        this.teleportCooldown = this.teleportCooldownMax * 0.5;
      }
    }

    this.scene.tweens.add({ targets: this, alpha: 0.2, duration: 80, yoyo: true });

    if (this.hp <= 0) this.die();
  }

  die() {
    if (this.dead) return;
    this.dead = true;
    this._hpBar.destroy();

    // Multiple teleport bursts on death
    for (let i = 0; i < 3; i++) {
      this.scene.time.delayedCall(i * 100, () => {
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

  _updateHPBar() {
    const bar = this._hpBar;
    bar.clear();
    if (this.hp >= this.maxHp) return;
    const pct = this.hp / this.maxHp;
    bar.fillStyle(0x000000).fillRect(this.x - 14, this.y - 22, 28, 5);
    bar.fillStyle(0x9933ff).fillRect(this.x - 13, this.y - 21, Math.floor(26 * pct), 3);
  }

  destroy() {
    if (this._hpBar && this._hpBar.active) this._hpBar.destroy();
    super.destroy();
  }
}
