import { flashWhite, showDamageNumber, shakeOnDeath } from '../../utils/combatFX';

/**
 * MagheibaChaasi — mid boss of the cave dungeon. Pattern-based attacks.
 *
 * Phase 1 (100–60% HP): Stomp + ranged boulders
 * Phase 2 (60–30% HP): Adds charge attack
 * Phase 3 (<30% HP): Enraged — all attacks faster, summons 2 Pookie Sigmas
 */
export default class MagheibaChaasi extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y) {
    super(scene, x, y, 'magheiba_boss');
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.hp = 500;
    this.maxHp = 500;
    this.phase = 1;
    this.dead = false;
    this.score = 1000;

    this.attackTimer = 0;
    this.chargeTimer = 0;
    this.direction = -1; // faces player
    this.isAttacking = false;

    this.body.setSize(56, 58);
    this.body.setOffset(4, 4);
    this.setDepth(8);
    this.setScale(1);

    this._hpBar = scene.add.graphics().setDepth(15);

    // Name header: "MR. MAGHEIBA presents:"
    this._nameLabel = scene.add.text(scene.cameras.main.width / 2, 22,
      'MR. MAGHEIBA presents:', {
        fontSize: '5px', color: '#cc6600',
        fontFamily: "'Press Start 2P'", stroke: '#000', strokeThickness: 2,
      }).setScrollFactor(0).setOrigin(0.5).setDepth(20);

    this._phaseLabel = scene.add.text(scene.cameras.main.width / 2, 32,
      'CHAASI CHUUMA', {
        fontSize: '8px', color: '#ff8800',
        fontFamily: "'Press Start 2P'", stroke: '#000', strokeThickness: 3
      }).setScrollFactor(0).setOrigin(0.5).setDepth(20);

    this._initPhaseOne(scene);
  }

  _initPhaseOne(scene) {
    // Periodic stomp + boulder volley
    this._attackEvent = scene.time.addEvent({
      delay: 2200,
      loop: true,
      callback: () => {
        if (!this.dead && !this.isAttacking) this._stompAttack();
      },
    });
  }

  update(player, time) {
    if (this.dead || !this.active) return;
    this._updateHPBar();

    const pct = this.hp / this.maxHp;

    // Phase transitions
    if (pct < 0.6 && this.phase === 1) this._enterPhase2();
    if (pct < 0.3 && this.phase === 2) this._enterPhase3();

    // Face player
    this.direction = player.x < this.x ? -1 : 1;
    this.setFlipX(this.direction < 0);

    // Slow walk toward player
    if (!this.isAttacking) {
      const dist = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);
      if (dist > 120) {
        this.setVelocityX(this.direction * (this.phase >= 3 ? 65 : 45));
      } else {
        this.setVelocityX(0);
      }
    }
  }

  _stompAttack() {
    this.isAttacking = true;
    // Jump up then slam down
    this.setVelocityY(-300);

    this.scene.time.delayedCall(400, () => {
      if (!this.active) return;
      this.setVelocityY(500); // slam down

      this.scene.time.delayedCall(250, () => {
        if (!this.active) return;
        // Shockwave on landing
        this._createShockwave();
        // Throw boulders
        const count = this.phase >= 3 ? 4 : 2;
        for (let i = 0; i < count; i++) {
          this.scene.time.delayedCall(i * 180, () => this._throwBoulder());
        }
        this.isAttacking = false;
      });
    });
  }

  _throwBoulder() {
    if (!this.active || !this.scene.player?.active) return;
    const player = this.scene.player;
    const angle = Phaser.Math.Angle.Between(this.x, this.y - 20, player.x, player.y);
    const spread = (Math.random() - 0.5) * 0.4;

    const boulder = this.scene.physics.add.image(this.x, this.y - 30, 'enemy_bullet');
    boulder.setScale(2).setDepth(7);
    boulder.setData('damage', 18);
    boulder.setData('isEnemyProjectile', true);

    const speed = 240 + this.phase * 30;
    boulder.setVelocity(
      Math.cos(angle + spread) * speed,
      Math.sin(angle + spread) * speed
    );

    this.scene.time.delayedCall(2000, () => { if (boulder.active) boulder.destroy(); });
    this.scene.enemyProjectiles.add(boulder);
  }

  _createShockwave() {
    const sw = this.scene.add.image(this.x, this.body.bottom, 'shield_hit')
      .setScale(2).setDepth(14).setTint(0xff8800);
    this.scene.tweens.add({
      targets: sw, scaleX: 6, scaleY: 2, alpha: 0, duration: 500,
      onComplete: () => sw.destroy(),
    });

    // Damage player if close
    const player = this.scene.player;
    if (player) {
      const dist = Phaser.Math.Distance.Between(this.x, player.x, 0, 0);
      if (Math.abs(this.x - player.x) < 140) {
        player.takeDamage(12);
        player.setVelocity((player.x > this.x ? 1 : -1) * 220, -250);
      }
    }
  }

  _enterPhase2() {
    this.phase = 2;
    this._phaseLabel.setText('CHAASI CHUUMA — BULLZ of ZULLZ');

    // Flash
    this.setTint(0xff6600);
    this.scene.time.delayedCall(500, () => this.clearTint());

    // Add charge event
    this.scene.time.addEvent({
      delay: 4000,
      loop: true,
      callback: () => {
        if (!this.dead && !this.isAttacking) this._chargeAttack();
      },
    });

    this._showPhaseText('BULLZ of ZULLZ AWAKENS!\nCHARGE ACTIVATED!');
  }

  _enterPhase3() {
    this.phase = 3;
    this._phaseLabel.setText('CHAASI CHUUMA — ZULLZ of BULLZ');

    this.setTint(0xff0000);
    this.scene.cameras.main.shake(600, 0.012);

    // Speed up attack timer
    this._attackEvent.delay = 1500;

    // Summon 2 Pookie Sigmas
    this._summonMinions();
    this._showPhaseText('ZULLZ of BULLZ: FINAL FORM!\nPOOKIE SIGMA TO THE RESCUE!');
  }

  _chargeAttack() {
    if (!this.scene.player?.active) return;
    this.isAttacking = true;
    const dir = this.scene.player.x > this.x ? 1 : -1;

    this.setTint(0xffaa00);
    this.scene.time.delayedCall(300, () => {
      this.clearTint();
      this.setVelocityX(dir * 380);

      // Stop after 0.6s
      this.scene.time.delayedCall(600, () => {
        this.setVelocityX(0);
        this.isAttacking = false;
      });
    });
  }

  _summonMinions() {
    const PookieSigma = this.scene.enemyClasses?.PookieSigma;
    if (!PookieSigma) return;

    [-120, 120].forEach(offset => {
      const minion = new PookieSigma(this.scene, this.x + offset, this.y);
      this.scene.enemies.add(minion);
      this.scene.physics.add.collider(minion, this.scene.platformGroup);
    });
  }

  _showPhaseText(msg) {
    const text = this.scene.add.text(
      this.scene.cameras.main.width / 2,
      this.scene.cameras.main.height / 2,
      msg, {
        fontSize: '9px', color: '#ff4400',
        fontFamily: "'Press Start 2P'", stroke: '#000', strokeThickness: 4,
      }
    ).setScrollFactor(0).setOrigin(0.5).setDepth(25);

    this.scene.tweens.add({
      targets: text, y: text.y - 40, alpha: 0, duration: 1800,
      onComplete: () => text.destroy(),
    });
  }

  takeDamage(amount) {
    if (this.dead) return;
    this.hp -= amount;
    flashWhite(this.scene, this);
    showDamageNumber(this.scene, this.x, this.y - 30, amount);
    if (this.hp <= 0) this.die();
  }

  die() {
    if (this.dead) return;
    this.dead = true;
    this._hpBar.destroy();
    this._nameLabel.destroy();
    this._phaseLabel.destroy();
    this._attackEvent?.remove();

    this.scene.cameras.main.shake(800, 0.015);

    for (let i = 0; i < 5; i++) {
      this.scene.time.delayedCall(i * 120, () => {
        if (!this.scene) return;
        const fx = this.scene.add.image(
          this.x + Phaser.Math.Between(-40, 40),
          this.y + Phaser.Math.Between(-40, 40),
          'death_burst'
        ).setScale(2).setDepth(20);
        this.scene.tweens.add({ targets: fx, alpha: 0, scale: 4, duration: 500,
          onComplete: () => fx.destroy() });
      });
    }

    this.scene.events.emit('boss-killed', { score: this.score, bossType: 'MagheibaChaasi' });
    this.scene.time.delayedCall(600, () => this.destroy());
  }

  _updateHPBar() {
    const bar = this._hpBar;
    bar.clear();
    const pct = this.hp / this.maxHp;
    const bx = 200, by = 10, bw = 400, bh = 14;
    bar.fillStyle(0x220000).fillRect(bx, by, bw, bh);
    const color = pct > 0.6 ? 0xff8800 : pct > 0.3 ? 0xff4400 : 0xff0000;
    bar.fillStyle(color).fillRect(bx + 1, by + 1, Math.floor((bw - 2) * pct), bh - 2);
    bar.lineStyle(2, 0xffffff).strokeRect(bx, by, bw, bh);
  }
}
