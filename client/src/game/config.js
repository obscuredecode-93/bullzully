import BootScene from './scenes/BootScene';
import MenuScene from './scenes/MenuScene';
import GameScene from './scenes/GameScene';
import HUDScene from './scenes/HUDScene';
import GameOverScene from './scenes/GameOverScene';
import LeaderboardScene from './scenes/LeaderboardScene';

export const GAME_WIDTH = 800;
export const GAME_HEIGHT = 480;
export const ROOM_WIDTH = 1920;
export const ROOM_HEIGHT = 480;
export const TILE_SIZE = 32;

// Physics tuning
export const PLAYER_SPEED = 180;
export const JUMP_VELOCITY = -430;
export const GRAVITY = 700;

// Combat
export const PLAYER_MAX_HEALTH = 100;
export const PLAYER_MAX_LIVES = 3;
export const PLAYER_MAX_AMMO = 15;
export const MELEE_DAMAGE = 25;
export const RANGED_DAMAGE = 30;
export const MELEE_DURATION_MS = 220;
export const PROJECTILE_SPEED = 420;

export const API_BASE = '/api';

export function createGameConfig(parent) {
  return {
    type: Phaser.AUTO,
    backgroundColor: '#000000',
    // Scale Manager — FIT keeps aspect ratio and fills the browser window
    scale: {
      parent,
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: GAME_WIDTH,
      height: GAME_HEIGHT,
    },
    // DOM plugin required by GameOverScene for the name-entry input
    dom: { createContainer: true },
    physics: {
      default: 'arcade',
      arcade: { gravity: { y: GRAVITY }, debug: false },
    },
    scene: [BootScene, MenuScene, GameScene, HUDScene, GameOverScene, LeaderboardScene],
    pixelArt: true,
    roundPixels: true,
  };
}
