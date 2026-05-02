import { GAME_HEIGHT, ROOM_WIDTH } from '../../config';

/**
 * BrainrotSpreader — ranged enemy. Keeps distance, lobs brainrot particles at player.
 */
export default class BrainrotSpreader extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y) {
    super(scene, x, y, 'brainrot_spreader');
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.hp = 45;
    this.maxHp = 45;
    this.rangedDamage = 12;
    this.speed = 50;
    this.preferredRange = 260;  // stays ~260px from player
    this.attackRange = 320;
    this.attackCooldown = 0;
    this.attackCooldownMax = 2200;
    this.direction = 1;
    this.dead = false;
    this.score = 130;

    this.body.setSize(20, 26);
    this.setDepth(5);
    this._hpBar = scene.add.graphics().setDepth(10);
  }

  update(player, time) {
    if (this.dead || !this.active) return;

    this.attackCooldown = Math.max(0, this.attackCooldown - 16);
    this._updateHPBar();

    const dist = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);

    if (dist < this.attackRange) {
      // Maintain preferred distance
      const dir = player.x < this.x ? 1 : -1;
      if (dist < this.preferredRange) {
        // Back away
        this.setVelocityX(this.speed * dir);
      } else if (dist > this.preferredRange + 60) {
        // Move closer
        this.setVelocityX(this.speed * -dir);
      } else {
        this.setVelocityX(0);
      }

      // Fire projectile
      if (this.attackCooldown <= 0) {
        this._fireAtPlayer(player);
        this.attackCooldown = this.attackCooldownMax;
      }
    } else {
      // Wander
      this.setVelocityX(this.speed * 0.3 * this.direction);
      if (Math.random() < 0.01) this.direction *= -1;
    }

    this.setFlipX(player.x < this.x);
  }

  _fireAtPlayer(player) {
    // Lob 1–3 particles in a spread
    const count = Phaser.Math.Between(1, 3);
    for (let i = 0; i < count; i++) {
      const angle = Phaser.Math.Angle.Between(this.x, this.y, player.x, player.y);
      const spread = (i - Math.floor(count / 2)) * 0.15;

      const proj = this.scene.physics.add.image(this.x, this.y - 10, 'brainrot_particle');
      proj.setDepth(6);
      proj.body.setAllowGravity(false);
      proj.setData('damage', this.rangedDamage);
      proj.setData('isEnemyProjectile', true);

      const speed = 160 + Math.random() * 60;
      proj.setVelocity(
        Math.cos(angle + spread) * speed,
        Math.sin(angle + spread) * speed
      );

      // Destroy after 2.5s or on bounds
      this.scene.time.delayedCall(2500, () => { if (proj.active) proj.destroy(); });
      this.scene.enemyProjectiles.add(proj);
    }
  }

  takeDamage(amount) {
    if (this.dead) return;
    this.hp -= amount;
    this.scene.tweens.add({ targets: this, alpha: 0.3, duration: 80, yoyo: true });
    if (this.hp <= 0) this.die();
  }

  die() {
    if (this.dead) return;
    this.dead = true;
    this._hpBar.destroy();

    const burst = this.scene.add.image(this.x, this.y, 'death_burst').setDepth(15).setTint(0x00ff66);
    this.scene.tweens.add({
      targets: burst, alpha: 0, scaleX: 2, scaleY: 2, duration: 350,
      onComplete: () => burst.destroy(),
    });

    this.scene.events.emit('enemy-killed', { score: this.score, x: this.x, y: this.y });
    this.destroy();
  }

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
