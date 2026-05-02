import { MELEE_DAMAGE } from '../../config';

/**
 * PookieSigma — basic melee enemy. Patrols platform, charges player on sight.
 */
export default class PookieSigma extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y) {
    super(scene, x, y, 'pookie_sigma');
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.hp = 50;
    this.maxHp = 50;
    this.damage = MELEE_DAMAGE * 0.6; // 15 damage
    this.speed = 70;
    this.chaseRange = 280;
    this.attackRange = 40;
    this.attackCooldown = 0;
    this.attackCooldownMax = 900;
    this.direction = 1;
    this.patrolTimer = 0;
    this.dead = false;
    this.score = 100;

    this.body.setGravityY(0);
    this.body.setSize(20, 28);
    this.body.setOffset(2, 2);
    this.setDepth(5);

    // HP bar
    this._hpBar = scene.add.graphics().setDepth(10);
  }

  update(player, time) {
    if (this.dead || !this.active) return;

    this.attackCooldown = Math.max(0, this.attackCooldown - 16);
    this._updateHPBar();

    const dist = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);

    if (dist < this.chaseRange) {
      // Chase player
      const dir = player.x < this.x ? -1 : 1;
      this.direction = dir;
      this.setVelocityX(this.speed * dir);

      // Attack if in range
      if (dist < this.attackRange && this.attackCooldown <= 0) {
        this._meleeAttack(player);
      }
    } else {
      // Patrol
      this.patrolTimer -= 16;
      if (this.patrolTimer <= 0) {
        this.direction *= -1;
        this.patrolTimer = Phaser.Math.Between(1500, 3000);
      }
      this.setVelocityX(this.speed * 0.4 * this.direction);
    }

    this.setFlipX(this.direction < 0);
  }

  _meleeAttack(player) {
    this.attackCooldown = this.attackCooldownMax;
    player.takeDamage(this.damage);
    // Tiny knockback on player
    const dir = player.x > this.x ? 1 : -1;
    player.setVelocityX(dir * 180);
  }

  takeDamage(amount) {
    if (this.dead) return;
    this.hp -= amount;

    // Flash red
    this.scene.tweens.add({
      targets: this,
      alpha: 0.3,
      duration: 80,
      yoyo: true,
    });

    if (this.hp <= 0) this.die();
  }

  die() {
    if (this.dead) return;
    this.dead = true;
    this._hpBar.destroy();

    // Death burst
    const burst = this.scene.add.image(this.x, this.y, 'death_burst').setDepth(15);
    this.scene.tweens.add({
      targets: burst,
      alpha: 0,
      scaleX: 2,
      scaleY: 2,
      duration: 300,
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
    bar.fillStyle(0xff2222).fillRect(this.x - 13, this.y - 21, Math.floor(26 * pct), 3);
  }

  destroy() {
    if (this._hpBar && this._hpBar.active) this._hpBar.destroy();
    super.destroy();
  }
}
