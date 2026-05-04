/**
 * @fileoverview BootScene — the very first scene that runs when the game starts.
 *
 * Responsibilities:
 *  1. Displays the game title and a "Generating world..." loading indicator.
 *  2. Runs rotating lore blurbs so the player can read character names while
 *     textures are generated (no server round-trip — generation is synchronous).
 *  3. Calls `SpriteGenerator.createAll(scene)` to create every game texture
 *     programmatically from Phaser Graphics calls — no external image files needed.
 *  4. Transitions to `MenuScene` after 1800ms, giving the title a moment to breathe.
 *
 * Why programmatic textures instead of loading assets?
 *  - Zero HTTP requests — the game works offline and loads instantly.
 *  - All visual style lives in JavaScript, making it easy to tweak per-entity.
 *  - Phaser's `generateTexture()` bakes the Graphics draw calls into a Canvas
 *    texture that gets cached and reused exactly like a loaded image.
 *
 * @module scenes/BootScene
 */

import { SpriteGenerator } from '../utils/SpriteGenerator';

/**
 * BootScene — generates all textures, shows title splash, then starts the menu.
 * No external assets are loaded; everything is drawn programmatically.
 */
export default class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  // ============================================================
  // CREATE
  // ============================================================

  /**
   * Builds the title splash, starts lore rotation, generates textures,
   * and schedules the transition to MenuScene.
   */
  create() {
    const cx = this.cameras.main.width  / 2;
    const cy = this.cameras.main.height / 2;

    // ── Title ────────────────────────────────────────────────────────────────
    this.add.text(cx, cy - 40, 'BULLZULLY', {
      fontSize: '24px', color: '#ff4400',
      fontFamily: "'Press Start 2P'", stroke: '#000', strokeThickness: 4,
    }).setOrigin(0.5);

    this.add.text(cx, cy, 'The Pookie GiGma Chronicles', {
      fontSize: '8px', color: '#ffffff',
      fontFamily: "'Press Start 2P'", stroke: '#000', strokeThickness: 2,
    }).setOrigin(0.5);

    const loading = this.add.text(cx, cy + 40, 'Generating world...', {
      fontSize: '7px', color: '#aaaaaa',
      fontFamily: "'Press Start 2P'",
    }).setOrigin(0.5);

    // ── Lore blurbs ───────────────────────────────────────────────────────────
    // Rotating character names introduce the cast while textures generate.
    // Each entry has its own colour so the palette hints at the zone theme.
    const loreLines = [
      { text: 'Pookie Sigma: Soldier of Chaos',     color: '#ff4400' },
      { text: 'Mr. Magheiba guards the dungeon...', color: '#cc6600' },
      { text: 'The BULLZ of ZULLZ stirs below...',  color: '#ff8800' },
      { text: 'Chaasi Chuuma lurks in darkness',    color: '#ff4400' },
      { text: 'ZULLZ of BULLZ cannot be stopped!',  color: '#ffcc00' },
    ];

    const loreText = this.add.text(cx, cy + 70, '', {
      fontSize: '5px', color: '#ff4400',
      fontFamily: "'Press Start 2P'", stroke: '#000', strokeThickness: 2,
    }).setOrigin(0.5);

    let loreIdx = 0;
    const showNextLore = () => {
      const entry = loreLines[loreIdx % loreLines.length];
      loreText.setText(entry.text).setStyle({ color: entry.color });
      // Fade-in each blurb so the transition feels intentional rather than a jump cut.
      this.tweens.add({ targets: loreText, alpha: { from: 0, to: 1 }, duration: 280 });
      loreIdx++;
    };
    showNextLore(); // Show first entry immediately; timer handles the rest.
    // `repeat: loreLines.length - 1` plays every entry exactly once in 1800ms.
    this.time.addEvent({ delay: 320, repeat: loreLines.length - 1, callback: showNextLore });

    // ── Loading blink ─────────────────────────────────────────────────────────
    // Classic blinking "loading" text — repeat: -1 loops indefinitely.
    this.tweens.add({ targets: loading, alpha: 0, duration: 400, yoyo: true, repeat: -1 });

    // ── Texture generation ────────────────────────────────────────────────────
    // Synchronous — completes before the delayedCall fires, so MenuScene always
    // has all textures available.
    SpriteGenerator.createAll(this);

    // ── Transition ────────────────────────────────────────────────────────────
    // 1800ms gives all 5 lore lines time to display once before the menu appears.
    this.time.delayedCall(1800, () => {
      this.scene.start('MenuScene');
    });
  }
}
