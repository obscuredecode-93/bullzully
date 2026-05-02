import { SpriteGenerator } from '../utils/SpriteGenerator';

/**
 * BootScene — creates all textures programmatically, then starts the menu.
 * No external assets are loaded.
 */
export default class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  create() {
    // Loading text
    const cx = this.cameras.main.width / 2;
    const cy = this.cameras.main.height / 2;

    const title = this.add.text(cx, cy - 40, 'BULLZULLY', {
      fontSize: '24px', color: '#ff4400',
      fontFamily: "'Press Start 2P'", stroke: '#000', strokeThickness: 4,
    }).setOrigin(0.5);

    const sub = this.add.text(cx, cy, 'The Pookie GiGma Chronicles', {
      fontSize: '8px', color: '#ffffff',
      fontFamily: "'Press Start 2P'", stroke: '#000', strokeThickness: 2,
    }).setOrigin(0.5);

    const loading = this.add.text(cx, cy + 40, 'Generating world...', {
      fontSize: '7px', color: '#aaaaaa',
      fontFamily: "'Press Start 2P'",
    }).setOrigin(0.5);

    // Rotating lore blurbs — each name appears clearly during load
    const loreLines = [
      { text: 'Pookie Sigma: Soldier of Chaos', color: '#ff4400' },
      { text: 'Mr. Magheiba guards the dungeon...', color: '#cc6600' },
      { text: 'The BULLZ of ZULLZ stirs below...', color: '#ff8800' },
      { text: 'Chaasi Chuuma lurks in darkness', color: '#ff4400' },
      { text: 'ZULLZ of BULLZ cannot be stopped!', color: '#ffcc00' },
    ];

    const loreText = this.add.text(cx, cy + 70, '', {
      fontSize: '5px', color: '#ff4400',
      fontFamily: "'Press Start 2P'", stroke: '#000', strokeThickness: 2,
    }).setOrigin(0.5);

    let loreIdx = 0;
    const showNextLore = () => {
      const entry = loreLines[loreIdx % loreLines.length];
      loreText.setText(entry.text).setStyle({ color: entry.color });
      this.tweens.add({ targets: loreText, alpha: { from: 0, to: 1 }, duration: 280 });
      loreIdx++;
    };
    showNextLore();
    this.time.addEvent({ delay: 320, repeat: loreLines.length - 1, callback: showNextLore });

    // Blink loading text
    this.tweens.add({ targets: loading, alpha: 0, duration: 400, yoyo: true, repeat: -1 });

    // Generate all textures
    SpriteGenerator.createAll(this);

    // Brief pause so user sees the title, then go to menu
    this.time.delayedCall(1800, () => {
      this.scene.start('MenuScene');
    });
  }
}
