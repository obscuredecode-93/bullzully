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

    // ─── Right side: Lives ───────────────────────────────────────────────
    this._lifeIcons = [];
    for (let i = 0; i < 3; i++) {
      this._lifeIcons.push(
        this.add.image(width - 12 - i * 22, 10, 'hud_life').setOrigin(1, 0)
      );
    }
    this._updateLives();

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
