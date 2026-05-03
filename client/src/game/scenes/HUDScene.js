import { PLAYER_MAX_HEALTH, PLAYER_MAX_AMMO, GAME_WIDTH } from '../config';

/**
 * HUDScene — runs parallel to GameScene, renders fixed HUD elements.
 * Communicates via the GameScene's event emitter.
 */
export default class HUDScene extends Phaser.Scene {
  constructor() {
    super('HUDScene');
  }

  init(data) {
    this._lives = data.lives ?? 3;
    this._health = data.health ?? PLAYER_MAX_HEALTH;
    this._ammo = data.ammo ?? 10;
    this._score = data.score ?? 0;
    this._zoneName = data.zoneName ?? '';
  }

  create() {
    const { width } = this.cameras.main;

    // ─── Left side: Health bar ────────────────────────────────────────────
    this.add.text(8, 8, 'HP', {
      fontSize: '6px', color: '#00ff00', fontFamily: "'Press Start 2P'",
    });

    this._hpBg = this.add.graphics();
    this._hpFill = this.add.graphics();
    this._drawHealthBar();

    // ─── Right side: Lives (shifted left to make room for pause button) ─────
    this._lifeIcons = [];
    for (let i = 0; i < 3; i++) {
      this._lifeIcons.push(
        this.add.image(width - 76 - i * 22, 10, 'hud_life').setOrigin(1, 0)
      );
    }
    this._updateLives();

    // ─── Pause button (top-right corner) ─────────────────────────────────────
    const pauseBtn = this.add.text(width - 8, 8, '[ II ]', {
      fontSize: '7px', color: '#ffffff',
      fontFamily: "'Press Start 2P'", stroke: '#000', strokeThickness: 2,
    }).setOrigin(1, 0).setInteractive({ useHandCursor: true });

    pauseBtn.on('pointerover', () => pauseBtn.setStyle({ color: '#ffcc00' }));
    pauseBtn.on('pointerout',  () => pauseBtn.setStyle({ color: '#ffffff' }));
    pauseBtn.on('pointerdown', () => {
      const gameScene = this.scene.get('GameScene');
      if (gameScene && !gameScene.scene.isPaused()) {
        gameScene.events.emit('pause-requested');
      }
    });

    // ─── Center: Zone name ────────────────────────────────────────────────
    this._zoneText = this.add.text(width / 2, 6, this._zoneName, {
      fontSize: '5px', color: '#ffcc00', fontFamily: "'Press Start 2P'",
      stroke: '#000', strokeThickness: 2,
    }).setOrigin(0.5, 0);

    // ─── Left bottom area: Ammo ───────────────────────────────────────────
    this._ammoText = this.add.text(8, 30, `AMMO: ${this._ammo}`, {
      fontSize: '6px', color: '#ffdd00', fontFamily: "'Press Start 2P'",
    });

    // ─── Right bottom: Score ──────────────────────────────────────────────
    this._scoreText = this.add.text(width - 8, 30, `SC: ${this._score}`, {
      fontSize: '6px', color: '#ffffff', fontFamily: "'Press Start 2P'",
    }).setOrigin(1, 0);

    // ─── Dark top strip background ─────────────────────────────────────────
    const bg = this.add.graphics();
    bg.fillStyle(0x000000, 0.65);
    bg.fillRect(0, 0, width, 50);
    bg.setDepth(-1);

    // ─── BULLZ cooldown bar (bottom-left of screen) ──────────────────────
    const { height } = this.cameras.main;
    this._height = height;

    // Dark strip at bottom
    const bottomBg = this.add.graphics();
    bottomBg.fillStyle(0x000000, 0.65);
    bottomBg.fillRect(0, height - 24, 260, 24);
    bottomBg.setDepth(-1);

    this.add.text(8, height - 18, 'BULLZ:', {
      fontSize: '6px', color: '#ffcc00', fontFamily: "'Press Start 2P'",
    }).setDepth(1);

    this._bullzBarBg   = this.add.graphics().setDepth(1);
    this._bullzBarFill = this.add.graphics().setDepth(2);
    this._bullzTimer   = this.add.text(225, height - 12, '', {
      fontSize: '5px', color: '#888888', fontFamily: "'Press Start 2P'",
    }).setOrigin(0, 0.5).setDepth(3);

    // Tracked for ready-pulse detection
    this._wasBullzOnCooldown = false;

    this._drawBullzBar(0, false, false, 8000);

    // ─── Wire up to GameScene events ──────────────────────────────────────
    const gameScene = this.scene.get('GameScene');
    if (gameScene) {
      gameScene.events.on('health-changed', (v) => { this._health = v; this._drawHealthBar(); });
      gameScene.events.on('lives-changed', (v) => { this._lives = v; this._updateLives(); });
      gameScene.events.on('ammo-changed', (v) => { this._ammo = v; this._ammoText.setText(`AMMO: ${v}`); });
      gameScene.events.on('score-changed', (v) => { this._score = v; this._scoreText.setText(`SC: ${v}`); });
      gameScene.events.on('zone-changed', (name) => this._zoneText.setText(name));
    }
  }

  _drawHealthBar() {
    const pct = Math.max(0, this._health / PLAYER_MAX_HEALTH);
    const bx = 28, by = 8, bw = 180, bh = 14;

    this._hpBg.clear();
    this._hpBg.fillStyle(0x220000).fillRect(bx, by, bw, bh);
    this._hpBg.lineStyle(1, 0x880000).strokeRect(bx, by, bw, bh);

    this._hpFill.clear();
    const color = pct > 0.5 ? 0x22cc22 : pct > 0.25 ? 0xffaa00 : 0xff2222;
    this._hpFill.fillStyle(color).fillRect(bx + 1, by + 1, Math.floor((bw - 2) * pct), bh - 2);
    this._hpFill.fillStyle(0xffffff, 0.3).fillRect(bx + 1, by + 1, Math.floor((bw - 2) * pct), 4);
  }

  _updateLives() {
    this._lifeIcons.forEach((icon, i) => {
      icon.setAlpha(i < this._lives ? 1 : 0.2);
    });
  }

  // ─── Per-frame poll for BULLZ cooldown ───────────────────────────────────
  update() {
    const player = this.scene.get('GameScene')?.player;
    if (!player) return;

    const cooldown = player.bullzCooldown ?? 0;
    const ready    = cooldown <= 0;
    const active   = player.bullzActive ?? false;
    const pct      = ready ? 1 : 1 - cooldown / (player.bullzCooldownMax || 8000);

    this._drawBullzBar(pct, ready, active, cooldown);

    // Detect cooldown-complete transition → show "BULLZ READY" pulse
    if (this._wasBullzOnCooldown && ready && !active) {
      this._wasBullzOnCooldown = false;
      this._flashBullzReady();
    }
    if (!ready) this._wasBullzOnCooldown = true;
  }

  _drawBullzBar(pct, ready, active, cooldownMs) {
    const h = this._height || this.cameras.main.height;
    const bx = 60, bw = 160, bh = 10, by = h - 19;

    // Background track
    this._bullzBarBg.clear();
    this._bullzBarBg.fillStyle(0x110800).fillRect(bx, by, bw, bh);
    const borderCol = (ready || active) ? 0xffcc00 : 0x443300;
    this._bullzBarBg.lineStyle(1, borderCol).strokeRect(bx, by, bw, bh);

    // Fill
    this._bullzBarFill.clear();
    if (pct > 0) {
      const fillCol = active ? 0xffff44 : ready ? 0xffcc00 : 0x886600;
      const fillW = Math.floor((bw - 2) * pct);
      this._bullzBarFill.fillStyle(fillCol).fillRect(bx + 1, by + 1, fillW, bh - 2);
      // Shine when ready or active
      if (ready || active) {
        this._bullzBarFill.fillStyle(0xffffff, 0.4).fillRect(bx + 1, by + 1, fillW, 3);
      }
    }

    // Label
    if (active) {
      this._bullzTimer.setText('ACTIVE!').setStyle({ color: '#ffff44' });
    } else if (ready) {
      this._bullzTimer.setText('READY!').setStyle({ color: '#ffcc00' });
    } else {
      this._bullzTimer.setText(`${Math.ceil(cooldownMs / 1000)}s`).setStyle({ color: '#888888' });
    }
  }

  _flashBullzReady() {
    const cx = this.cameras.main.width / 2;
    const t = this.add.text(cx, this.cameras.main.height / 2 - 40, 'BULLZ READY!', {
      fontSize: '13px', color: '#ffcc00',
      fontFamily: "'Press Start 2P'", stroke: '#000', strokeThickness: 5,
    }).setOrigin(0.5).setDepth(28);

    this.tweens.add({
      targets: t,
      scaleX: 1.25, scaleY: 1.25,
      duration: 180, yoyo: true, repeat: 2,
      onComplete: () => {
        this.tweens.add({ targets: t, alpha: 0, duration: 400,
          onComplete: () => t.destroy() });
      },
    });
  }

  shutdown() {
    const gameScene = this.scene.get('GameScene');
    if (gameScene) {
      gameScene.events.off('health-changed');
      gameScene.events.off('lives-changed');
      gameScene.events.off('ammo-changed');
      gameScene.events.off('score-changed');
      gameScene.events.off('zone-changed');
    }
  }
}
