/**
 * @fileoverview Central configuration for the BULLZULLY Phaser game.
 *
 * This module exports:
 *  1. Game-world constants (canvas size, room dimensions, physics values, combat tuning)
 *  2. `createGameConfig(parent)` — the Phaser.Game config object factory
 *
 * Keeping all magic numbers here means they can be tweaked in one place and
 * immediately affect every system that imports them.
 *
 * @module game/config
 */

import BootScene        from './scenes/BootScene';
import MenuScene        from './scenes/MenuScene';
import GameScene        from './scenes/GameScene';
import HUDScene         from './scenes/HUDScene';
import PauseScene       from './scenes/PauseScene';
import GameOverScene    from './scenes/GameOverScene';
import LeaderboardScene from './scenes/LeaderboardScene';

// ============================================================
// CANVAS / WORLD DIMENSIONS
// ============================================================

/** Logical canvas width in pixels. Phaser Scale Manager scales this to fill the screen. */
export const GAME_WIDTH  = 800;

/** Logical canvas height in pixels. */
export const GAME_HEIGHT = 480;

/**
 * Width of a single room in world-space pixels.
 * Rooms are wider than the viewport so the camera scrolls horizontally.
 * 1920 = exactly 60 tiles × 32 px/tile, which fits nicely on a 1080p display at 2× scale.
 */
export const ROOM_WIDTH  = 1920;

/** Room height matches the canvas height — no vertical scrolling. */
export const ROOM_HEIGHT = 480;

/** Size of one platform tile in pixels. Used by ProceduralGen and GameScene. */
export const TILE_SIZE   = 32;

// ============================================================
// PHYSICS TUNING
// ============================================================

/**
 * Horizontal movement speed in px/s.
 * The BULLZ special attack and Sigma Mode multiply this by 1.5.
 */
export const PLAYER_SPEED    = 180;

/**
 * Vertical impulse applied when the player jumps (negative = upward in Phaser).
 * -430 reaches roughly 3 tile-heights at GRAVITY = 700.
 */
export const JUMP_VELOCITY   = -430;

/**
 * Downward acceleration applied to all dynamic bodies in px/s².
 * 700 keeps the game feeling snappy without floaty jumps.
 */
export const GRAVITY         = 700;

// ============================================================
// COMBAT TUNING
// ============================================================

/** Maximum HP. Pickups restore 35 HP; the bar turns orange below 50 and red below 25. */
export const PLAYER_MAX_HEALTH  = 100;

/** Starting lives count; also the hard cap — never goes above 3. */
export const PLAYER_MAX_LIVES   = 3;

/** Maximum ammo; ammo pickups add 8 up to this cap. */
export const PLAYER_MAX_AMMO    = 15;

/** Base melee damage per swing. Multiplied by bullzMultiplier (1 or 3) in GameScene. */
export const MELEE_DAMAGE       = 25;

/** Base ranged damage per bullet. Also multiplied by bullzMultiplier. */
export const RANGED_DAMAGE      = 30;

/**
 * How long the melee hitbox stays active in milliseconds.
 * The hitbox visual fades over 70% of this window, then deactivates.
 */
export const MELEE_DURATION_MS  = 220;

/** Horizontal speed of player bullets in px/s. */
export const PROJECTILE_SPEED   = 420;

// ============================================================
// API
// ============================================================

/**
 * Base path for all backend API calls.
 * Vite proxies `/api` → `http://localhost:3001` during development,
 * so the same path works in both dev and production.
 */
export const API_BASE = '/api';

// ============================================================
// PHASER GAME CONFIG FACTORY
// ============================================================

/**
 * Builds the Phaser.Game configuration object.
 *
 * Separated into a factory function (rather than a bare object) so that
 * the `parent` div ID can be passed at runtime from React's `useEffect`,
 * ensuring the DOM element exists before Phaser tries to attach the canvas.
 *
 * @param {string} parent - ID of the DOM element Phaser should mount the canvas into.
 * @returns {Phaser.Types.Core.GameConfig} Ready-to-pass config for `new Phaser.Game(config)`.
 */
export function createGameConfig(parent) {
  return {
    /**
     * Phaser.AUTO lets Phaser choose WebGL if available, falling back to Canvas.
     * WebGL is preferred for performance and shader effects.
     */
    type: Phaser.AUTO,

    backgroundColor: '#000000',

    /**
     * Scale Manager configuration.
     * FIT mode scales the 800×480 logical canvas to fill the browser window
     * while preserving the 5:3 aspect ratio — resulting in letterboxing on
     * 16:9 screens or pillarboxing on taller viewports.
     * CENTER_BOTH centres the canvas both horizontally and vertically.
     */
    scale: {
      parent,
      mode:       Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width:      GAME_WIDTH,
      height:     GAME_HEIGHT,
    },

    /**
     * The DOM plugin is required because GameOverScene uses `this.add.dom()`
     * to create a native HTML <input> for the player's name.
     * Without `createContainer: true`, Phaser throws on GameOverScene startup.
     */
    dom: { createContainer: true },

    /**
     * Arcade Physics — the lightest of Phaser's three physics engines.
     * Chosen over Matter.js because the game only needs AABB collision,
     * not realistic rigid-body simulation.
     * `debug: false` hides physics body outlines; set to true to visualise hitboxes.
     */
    physics: {
      default: 'arcade',
      arcade:  { gravity: { y: GRAVITY }, debug: false },
    },

    /**
     * Scene list is ORDER-DEPENDENT — Phaser starts the first scene automatically.
     * BootScene must be first so textures are generated before any other scene runs.
     *
     * Scene flow:
     *   Boot → Menu → Game + HUD (parallel) → GameOver / Pause / Leaderboard
     */
    scene: [
      BootScene,
      MenuScene,
      GameScene,
      HUDScene,
      PauseScene,
      GameOverScene,
      LeaderboardScene,
    ],

    /**
     * pixelArt: true disables texture smoothing so pixel sprites render crisp.
     * roundPixels: true snaps sprites to integer pixel positions, preventing
     * sub-pixel blurring during camera movement.
     */
    pixelArt:    true,
    roundPixels: true,
  };
}
