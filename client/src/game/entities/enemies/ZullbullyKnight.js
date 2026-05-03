import { MELEE_DAMAGE } from '../../config';
import { flashWhite, showDamageNumber, shakeOnDeath } from '../../utils/combatFX';

/**
 * ZullbullyKnight — heavy armored enemy. Takes 3 hits to break guard, then vulnerable.
 * Slow but hits hard.
 */
export default class ZullbullyKnight extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y) {
    super(scene, x, y, 'zullbully_knight');
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.hp = 120;
    this.maxHp = 120;
    this.armorHits = 3;   // guard absorbs hits until this reaches 0
    this.guarded = true;
    this.damage = MELEE_DAMAGE * 1.4; // 35 damage
    this.speed = 45;
    this.chaseRange = 220;
    this.attackRange = 52;
    this.attackCooldown = 0;
    this.attackCooldownMax = 1400;
    this.chargeCooldown = 0;
    this.chargeCooldownMax = 5000;
    this.isCharging = false;
    this.direction = 1;
    this.dead = false;
    this.score = 200;

    this.body.setSize(24, 34);
    this.setDepth(5);
    this._hpBar = scene.add.graphics().setDepth(10);
    this._guardIndicator = scene.add.graphics().setDepth(10);
  }

  update(player, time) {
    if (this.dead || !this.active) return;

    this.attackCooldown = Math.max(0, this.attackCooldown - 16);
    this.chargeCooldown = Math.max(0, this.chargeCooldown - 16);
    this._updateHPBar();
    this._updateGuardIndicator();

    const dist = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);

    // Charge attack when guard is broken
    if (!this.guarded && this.chargeCooldown <= 0 && dist < 350) {
      this._startCharge(player);
      return;
    }

    if (this.isCharging) return; // velocity handled by charge tween

    if (dist < this.chaseRange) {
      const dir = player.x < this.x ? -1 : 1;
      this.direction = dir;
      this.setVelocityX(this.speed * dir);

      if (dist < this.attackRange && this.attackCooldown <= 0) {
        player.takeDamage(this.damage);
        this.attackCooldown = this.attackCooldownMax;
        // Shockwave effect
        const wave = this.scene.add.image(this.x, this.y, 'shield_hit').setDepth(14);
        this.scene.tweens.add({
          targets: wave, alpha: 0, scale: 2, duration: 300,
          onComplete: () => wave.destroy(),
        });
      }
    } else {
      // Patrol slowly
      this.setVelocityX(this.speed * 0.3 * this.direction);
    }

    this.setFlipX(this.direction < 0);
  }

  _startCharge(player) {
    this.isCharging = true;
    this.chargeCooldown = this.chargeCooldownMax;
    const dir = player.x < this.x ? -1 : 1;

    this.scene.tweens.add({
      targets: this,
      x: this.x + dir * 300,
      duration: 400,
      ease: 'Power2',
      onComplete: () => { this.isCharging = false; },
    });

    // Damage if player in path
    this.scene.time.addEvent({
      delay: 50,
      repeat: 7,
      callback: () => {
        if (!this.active || !this.scene.player?.active) return;
        const d = Phaser.Math.Distance.Between(this.x, this.y, this.scene.player.x, this.scene.player.y);
        if (d < 50) {
          this.scene.player.takeDamage(this.damage * 0.8);
        }
      },
    });
  }

  takeDamage(amount) {
    if (this.dead) return;

    if (this.guarded) {
      // Armor absorbs but shows clink
      const reduced = Math.floor(amount * 0.2);
      this.hp -= reduced;
      this.armorHits--;

      // Clink flash
      this.setTint(0x888888);
      this.scene.time.delayedCall(100, () => this.clearTint());

      if (this.armorHits <= 0) {
        this.guarded = false;
        // Guard break flash
        this.scene.tweens.add({ targets: this, alpha: 0.1, duration: 100, yoyo: true, repeat: 2 });
        const text = this.scene.add.text(this.x, this.y - 30, 'GUARD BROKEN!', {
          fontSize: '8px', color: '#ff8800', fontFamily: "'Press Start 2P'"
        }).setDepth(20);
        this.scene.tweens.add({ targets: text, y: text.y - 30, alpha: 0, duration: 800,
          onComplete: () => text.destroy() });
      }
    } else {
      // Full damage — white flash only when guard is broken
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

    const burst = this.scene.add.image(this.x, this.y, 'death_burst').setDepth(15).setTint(0x4466aa);
    this.scene.tweens.add({
      targets: burst, alpha: 0, scaleX: 2.5, scaleY: 2.5, duration: 400,
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
    const color = this.guarded ? 0x4466aa : 0xff2222;
    bar.fillStyle(0x000000).fillRect(this.x - 15, this.y - 24, 30, 5);
    bar.fillStyle(color).fillRect(this.x - 14, this.y - 23, Math.floor(28 * pct), 3);
  }

  _updateGuardIndicator() {
    const g = this._guardIndicator;
    g.clear();
    if (!this.guarded) return;
    g.fillStyle(0x4499ff, 0.5);
    for (let i = 0; i < this.armorHits; i++) {
      g.fillRect(this.x - 10 + i * 9, this.y - 30, 7, 4);
    }
  }

  destroy() {
    if (this._hpBar && this._hpBar.active) this._hpBar.destroy();
    if (this._guardIndicator && this._guardIndicator.active) this._guardIndicator.destroy();
    super.destroy();
  }
}
