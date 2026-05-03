import { flashWhite, showDamageNumber } from '../../utils/combatFX';

/**
 * BullyMaguire (Bulladi Chuttar Lamdiya) — final boss in Canada.
 *
 * Phase 1 (100–66%): Throws "brainrot is fentanyl" projectiles in patterns
 * Phase 2 (66–33%): Calls your attacks jokes — 50% damage reduction buff + taunts
 * Phase 3 (<33%):   Full Canada mode — summons Pookie Sigma minions constantly
 */
export default class BullyMaguire extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y) {
    super(scene, x, y, 'bully_maguire_boss');
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.hp = 800;
    this.maxHp = 800;
    this.phase = 1;
    this.dead = false;
    this.score = 5000;
    this.damageReduction = 0;  // Phase 2 sets to 0.5
    this.direction = -1;

    this.body.setSize(56, 74);
    this.body.setOffset(8, 4);
    this.setDepth(8);
    this.setScale(1);

    this._hpBar = scene.add.graphics().setDepth(15);
    this._nameLabel = scene.add.text(
      scene.cameras.main.width / 2, 22,
      'BULLY MAGUIRE aka BULLADI CHUTTAR LAMDIYA', {
        fontSize: '6px', color: '#cc0000',
        fontFamily: "'Press Start 2P'", stroke: '#000000', strokeThickness: 3,
      }
    ).setScrollFactor(0).setOrigin(0.5).setDepth(20);

    this._phaseLabel = scene.add.text(
      scene.cameras.main.width / 2, 36,
      'PHASE 1: FENTANYL RAIN', {
        fontSize: '5px', color: '#ff4400',
        fontFamily: "'Press Start 2P'", stroke: '#000', strokeThickness: 2,
      }
    ).setScrollFactor(0).setOrigin(0.5).setDepth(20);

    this._startPhase1();
  }

  _startPhase1() {
    // Periodic projectile spread
    this._p1Event = this.scene.time.addEvent({
      delay: 1800,
      loop: true,
      callback: () => { if (!this.dead) this._fentanylRain(); },
    });

    // Occasional dash
    this._dashEvent = this.scene.time.addEvent({
      delay: 4000,
      loop: true,
      callback: () => { if (!this.dead) this._dash(); },
    });
  }

  _fentanylRain() {
    if (!this.scene.player?.active) return;
    const player = this.scene.player;

    // 3-5 projectiles in a fan aimed at player
    const count = 3 + this.phase;
    const baseAngle = Phaser.Math.Angle.Between(this.x, this.y, player.x, player.y);

    for (let i = 0; i < count; i++) {
      const spread = ((i - Math.floor(count / 2)) / count) * 0.7;
      this.scene.time.delayedCall(i * 80, () => {
        if (!this.active || !this.scene.player?.active) return;

        const bullet = this.scene.physics.add.image(
          this.x + (this.direction * 30), this.y - 20,
          this.phase >= 3 ? 'boss_bullet_p3' : 'boss_bullet_p1'
        ).setDepth(7);

        bullet.setData('damage', this.phase >= 3 ? 22 : 18);
        bullet.setData('isEnemyProjectile', true);
        bullet.body.setAllowGravity(false);

        const spd = 200 + this.phase * 25;
        bullet.setVelocity(
          Math.cos(baseAngle + spread) * spd,
          Math.sin(baseAngle + spread) * spd
        );

        this.scene.time.delayedCall(3000, () => { if (bullet.active) bullet.destroy(); });
        this.scene.enemyProjectiles.add(bullet);
      });
    }
  }

  _dash() {
    if (!this.scene.player?.active) return;
    const dir = this.scene.player.x > this.x ? 1 : -1;
    this.setTint(0xffdddd);
    this.scene.time.delayedCall(200, () => {
      this.clearTint();
      this.setVelocityX(dir * 320);
      this.scene.time.delayedCall(500, () => this.setVelocityX(0));
    });
  }

  update(player, time) {
    if (this.dead || !this.active) return;
    this._updateHPBar();

    const pct = this.hp / this.maxHp;
    if (pct < 0.66 && this.phase === 1) this._enterPhase2();
    if (pct < 0.33 && this.phase === 2) this._enterPhase3();

    this.direction = player.x < this.x ? -1 : 1;
    this.setFlipX(this.direction < 0);

    // Slow approach
    const dist = Math.abs(this.x - player.x);
    if (dist > 180 && !this._dashing) {
      this.setVelocityX(this.direction * (55 + this.phase * 10));
    } else if (dist <= 180) {
      this.setVelocityX(0);
    }
  }

  _enterPhase2() {
    this.phase = 2;
    this.damageReduction = 0.5;
    this._phaseLabel.setText('PHASE 2: YOUR ATTACKS ARE JOKES LUL');
    this.scene.cameras.main.shake(400, 0.008);
    this.setTint(0x888888);

    // Taunt texts
    const taunts = [
      "lmaooo u call that an attack?",
      "bruh ratio",
      "skill issue fr",
      "gg ez no re",
      "I am the BULLZ of ZULLZ, you are nothing!",
      "Pookie Sigma hits harder than you lol",
      "ZULLZ of BULLZ cannot be stopped!",
      "even Chaasi Chuuma is disappointed",
    ];

    this._tauntEvent = this.scene.time.addEvent({
      delay: 3000,
      loop: true,
      callback: () => {
        if (this.dead) return;
        const t = taunts[Math.floor(Math.random() * taunts.length)];
        const text = this.scene.add.text(this.x, this.y - 50, t, {
          fontSize: '6px', color: '#aaaaaa',
          fontFamily: "'Press Start 2P'", stroke: '#000', strokeThickness: 2,
        }).setDepth(20).setOrigin(0.5);
        this.scene.tweens.add({
          targets: text, y: text.y - 25, alpha: 0, duration: 1200,
          onComplete: () => text.destroy(),
        });
      },
    });

    this._showPhaseText('PHASE 2: BULLZ of ZULLZ AWAKENS!\nDamage Reduction: 50%\nYour hits mean nothing!');
  }

  _enterPhase3() {
    this.phase = 3;
    this.damageReduction = 0;  // Damage reduction lifts — he's desperate now
    this.clearTint();
    this._phaseLabel.setText('PHASE 3: FULL CANADA MODE');

    this._tauntEvent?.remove();

    // Faster projectiles
    this._p1Event.delay = 1200;

    this.scene.cameras.main.shake(1000, 0.018);
    this.scene.cameras.main.flash(500, 204, 0, 0);

    // Periodic minion summons
    this._minionEvent = this.scene.time.addEvent({
      delay: 5000,
      loop: true,
      callback: () => { if (!this.dead) this._summonMinions(); },
    });

    this._summonMinions(); // Immediate first summon
    this._showPhaseText('PHASE 3: FULL CANADA MODE!\nZULLZ of BULLZ RISES!\nPOOKIE SIGMA: REPORT FOR DUTY!');
  }

  _summonMinions() {
    const PookieSigma = this.scene.enemyClasses?.PookieSigma;
    if (!PookieSigma) return;

    const spawnPoints = [
      { x: this.x - 200, y: 416 },
      { x: this.x + 200, y: 416 },
    ];

    spawnPoints.forEach(pos => {
      const clampedX = Phaser.Math.Clamp(pos.x, 60, 1860);
      const minion = new PookieSigma(this.scene, clampedX, pos.y);
      minion.hp = 30; // weaker summoned versions
      this.scene.enemies.add(minion);
      if (this.scene.platformGroup) {
        this.scene.physics.add.collider(minion, this.scene.platformGroup);
      }
      this.scene.physics.add.collider(minion, this.scene.enemies);
    });

    const txt = this.scene.add.text(
      this.x, this.y - 60, 'POOKIE SIGMA BACKUP!', {
        fontSize: '6px', color: '#ff0000',
        fontFamily: "'Press Start 2P'", stroke: '#fff', strokeThickness: 2,
      }
    ).setDepth(20).setOrigin(0.5);
    this.scene.tweens.add({
      targets: txt, y: txt.y - 30, alpha: 0, duration: 1000,
      onComplete: () => txt.destroy(),
    });
  }

  _showPhaseText(msg) {
    const lines = msg.split('\n');
    lines.forEach((line, i) => {
      const text = this.scene.add.text(
        this.scene.cameras.main.width / 2,
        this.scene.cameras.main.height / 2 - 20 + i * 20,
        line, {
          fontSize: '8px', color: '#ffcc00',
          fontFamily: "'Press Start 2P'", stroke: '#000', strokeThickness: 4,
        }
      ).setScrollFactor(0).setOrigin(0.5).setDepth(25);

      this.scene.tweens.add({
        targets: text, y: text.y - 50, alpha: 0, duration: 2500, delay: 500,
        onComplete: () => text.destroy(),
      });
    });
  }

  takeDamage(amount) {
    if (this.dead) return;

    const actual = Math.floor(amount * (1 - this.damageReduction));
    this.hp -= actual;

    if (this.damageReduction > 0) {
      // Show reduced damage indicator
      const txt = this.scene.add.text(this.x + Phaser.Math.Between(-20, 20), this.y - 40,
        `REDUCED: ${actual}`, {
          fontSize: '5px', color: '#888888', fontFamily: "'Press Start 2P'",
        }
      ).setDepth(20).setOrigin(0.5);
      this.scene.tweens.add({ targets: txt, y: txt.y - 20, alpha: 0, duration: 700,
        onComplete: () => txt.destroy() });
    }

    flashWhite(this.scene, this);
    // Show actual (post-reduction) damage number in boss colour
    showDamageNumber(this.scene, this.x, this.y - 40, actual);
    this.scene.tweens.add({ targets: this, alpha: 0.4, duration: 80, yoyo: true });
    if (this.hp <= 0) this.die();
  }

  die() {
    if (this.dead) return;
    this.dead = true;
    this._hpBar.destroy();
    this._nameLabel.destroy();
    this._phaseLabel.destroy();
    this._p1Event?.remove();
    this._dashEvent?.remove();
    this._tauntEvent?.remove();
    this._minionEvent?.remove();

    this.scene.cameras.main.shake(1500, 0.02);
    this.scene.cameras.main.flash(1000, 204, 0, 0);

    // Epic death sequence
    for (let i = 0; i < 8; i++) {
      this.scene.time.delayedCall(i * 150, () => {
        if (!this.scene) return;
        const fx = this.scene.add.image(
          this.x + Phaser.Math.Between(-50, 50),
          this.y + Phaser.Math.Between(-50, 50),
          'death_burst'
        ).setScale(2 + Math.random() * 2).setDepth(22).setTint(0xcc0000);
        this.scene.tweens.add({ targets: fx, alpha: 0, scale: 5, duration: 600,
          onComplete: () => fx.destroy() });
      });
    }

    const victoryText = this.scene.add.text(
      this.scene.cameras.main.width / 2,
      this.scene.cameras.main.height / 2,
      'BULLY MAGUIRE DEFEATED!\nBULLZ of ZULLZ VANQUISHED!\nCANADA IS FREE!', {
        fontSize: '8px', color: '#ffcc00', align: 'center',
        fontFamily: "'Press Start 2P'", stroke: '#000', strokeThickness: 4,
      }
    ).setScrollFactor(0).setOrigin(0.5).setDepth(30);

    this.scene.events.emit('boss-killed', {
      score: this.score,
      bossType: 'BullyMaguire',
      finalBoss: true,
      victoryText,
    });

    this.scene.time.delayedCall(1000, () => this.destroy());
  }

  _updateHPBar() {
    const bar = this._hpBar;
    bar.clear();
    const pct = this.hp / this.maxHp;
    const bx = 150, by = 10, bw = 500, bh = 16;
    bar.fillStyle(0x110000).fillRect(bx, by, bw, bh);
    const color = this.phase === 2 ? 0x888888 : this.phase === 3 ? 0xcc0000 : 0xff2222;
    bar.fillStyle(color).fillRect(bx + 1, by + 1, Math.floor((bw - 2) * pct), bh - 2);
    bar.fillStyle(0xffcc00).fillRect(bx + 1, by + 1, Math.floor((bw - 2) * pct), 5);
    bar.lineStyle(2, 0xffffff).strokeRect(bx, by, bw, bh);
  }
}
