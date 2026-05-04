/**
 * @fileoverview SpriteGenerator — generates every game texture programmatically.
 *
 * Why no image files?
 *  - Zero HTTP requests: the game works offline and starts instantly.
 *  - All visual style lives in one file, easy to audit and tweak.
 *  - Phaser's `generateTexture()` bakes Graphics draw calls into a Canvas texture
 *    that gets cached exactly like a loaded PNG — no performance difference at runtime.
 *
 * Usage:
 *  Called once in BootScene.create() via `SpriteGenerator.createAll(scene)`.
 *  All textures are then available by key across every scene.
 *
 * Conventions:
 *  - Each section (player, enemies, bosses, …) is a method on the exported object.
 *  - Coordinates in each `drawFn` are relative to the top-left of the texture (0,0).
 *  - `px(scene, key, w, h, drawFn)` is the shared factory — creates a Graphics
 *    object off-screen, calls drawFn, generates the texture, then destroys the Graphics.
 *
 * @module utils/SpriteGenerator
 */

/**
 * Creates a named texture by drawing into a temporary off-screen Graphics object.
 *
 * The `add: false` flag keeps the Graphics object out of the scene display list —
 * it exists only to generate the texture, then gets destroyed immediately.
 *
 * @param {Phaser.Scene}     scene  - Active Phaser scene (provides renderer access).
 * @param {string}           key    - Texture cache key (used in all add.image / setTexture calls).
 * @param {number}           w      - Texture width in pixels.
 * @param {number}           h      - Texture height in pixels.
 * @param {function(Phaser.GameObjects.Graphics): void} drawFn - Drawing commands.
 */
function px(scene, key, w, h, drawFn) {
  const g = scene.make.graphics({ x: 0, y: 0, add: false });
  drawFn(g);
  g.generateTexture(key, w, h);
  g.destroy();
}

export const SpriteGenerator = {

  /**
   * Entry point — generates every texture in the correct order.
   * Order doesn't matter for correctness; grouping by category aids readability.
   *
   * @param {Phaser.Scene} scene - The BootScene (or any scene with a renderer).
   */
  createAll(scene) {
    this.player(scene);
    this.enemies(scene);
    this.bosses(scene);
    this.projectiles(scene);
    this.pickups(scene);
    this.platforms(scene);
    this.backgrounds(scene);
    this.ui(scene);
    this.effects(scene);
  },

  // ============================================================
  // PLAYER
  // ============================================================

  /**
   * Generates four player textures (idle, attack, jump, walk) and the shield overlay.
   *
   * All four body textures share the same silhouette — only the arm/leg positions
   * and sword placement differ, giving a simple pseudo-animation without a sprite sheet.
   *
   * Colour palette:
   *  - Skin:   0xf5c5a0 (warm tan)
   *  - Armour: 0x2d6e2d / 0x3d8e3d (forest green, lighter shine)
   *  - Sword:  0xc0c0c0 blade, 0x8b6914 guard
   *  - Hair:   0x3d1a00 (dark brown)
   *  - Boots:  0x3d2000 (dark brown)
   *
   * @param {Phaser.Scene} scene
   */
  player(scene) {
    // ── Idle / default 28×36 ──────────────────────────────────────────────────
    px(scene, 'player', 28, 36, (g) => {
      g.fillStyle(0x3d1a00); g.fillRect(7, 0, 14, 4);           // hair
      g.fillStyle(0xf5c5a0); g.fillRect(6, 4, 16, 10);          // face
      g.fillStyle(0x1a1a2e); g.fillRect(9, 7, 3, 3);            // eye L
      g.fillRect(16, 7, 3, 3);                                   // eye R
      g.fillStyle(0x2d6e2d); g.fillRect(5, 14, 18, 13);         // torso armor
      g.fillStyle(0x3d8e3d); g.fillRect(7, 15, 14, 5);          // armor highlight
      g.fillStyle(0xf5c5a0); g.fillRect(0, 14, 5, 10);          // arm L
      g.fillRect(23, 14, 5, 10);                                 // arm R
      g.fillStyle(0xc0c0c0); g.fillRect(24, 8, 3, 13);          // sword blade
      g.fillStyle(0x8b6914); g.fillRect(21, 15, 7, 3);          // sword guard
      g.fillStyle(0x1a3d1a); g.fillRect(6, 27, 7, 9);           // leg L
      g.fillRect(15, 27, 7, 9);                                  // leg R
      g.fillStyle(0x3d2000); g.fillRect(5, 33, 8, 3);           // boot L
      g.fillRect(14, 33, 8, 3);                                  // boot R
    });

    // ── Attack 40×36 (sword arm raised, extended horizontal slash) ───────────
    px(scene, 'player_attack', 40, 36, (g) => {
      g.fillStyle(0x3d1a00); g.fillRect(7, 0, 14, 4);
      g.fillStyle(0xf5c5a0); g.fillRect(6, 4, 16, 10);
      g.fillStyle(0x1a1a2e); g.fillRect(9, 7, 3, 3); g.fillRect(16, 7, 3, 3);
      g.fillStyle(0x2d6e2d); g.fillRect(5, 14, 18, 13);
      g.fillStyle(0x3d8e3d); g.fillRect(7, 15, 14, 5);
      g.fillStyle(0xf5c5a0); g.fillRect(0, 14, 5, 10);
      g.fillRect(23, 10, 5, 8);          // sword arm raised
      g.fillStyle(0xc0c0c0); g.fillRect(26, 0, 3, 22);  // vertical blade
      g.fillRect(28, 4, 10, 3);          // horizontal swing extension
      g.fillStyle(0x8b6914); g.fillRect(21, 13, 8, 3);
      g.fillStyle(0x1a3d1a); g.fillRect(6, 27, 7, 9); g.fillRect(15, 27, 7, 9);
      g.fillStyle(0x3d2000); g.fillRect(5, 33, 8, 3); g.fillRect(14, 33, 8, 3);
    });

    // ── Jump 28×36 (arms raised) ──────────────────────────────────────────────
    px(scene, 'player_jump', 28, 36, (g) => {
      g.fillStyle(0x3d1a00); g.fillRect(7, 0, 14, 4);
      g.fillStyle(0xf5c5a0); g.fillRect(6, 4, 16, 10);
      g.fillStyle(0x1a1a2e); g.fillRect(9, 7, 3, 3); g.fillRect(16, 7, 3, 3);
      g.fillStyle(0x2d6e2d); g.fillRect(5, 14, 18, 13);
      g.fillStyle(0x3d8e3d); g.fillRect(7, 15, 14, 5);
      g.fillStyle(0xf5c5a0); g.fillRect(0, 8, 5, 10); g.fillRect(23, 8, 5, 10); // arms up
      g.fillStyle(0xc0c0c0); g.fillRect(24, 4, 3, 13);
      g.fillStyle(0x8b6914); g.fillRect(21, 11, 7, 3);
      g.fillStyle(0x1a3d1a); g.fillRect(6, 27, 7, 7); g.fillRect(15, 27, 7, 7); // legs tucked
      g.fillStyle(0x3d2000); g.fillRect(5, 31, 8, 3); g.fillRect(14, 31, 8, 3);
    });

    // ── Walk frame 28×36 (legs offset for stride illusion) ───────────────────
    px(scene, 'player_walk', 28, 36, (g) => {
      g.fillStyle(0x3d1a00); g.fillRect(7, 0, 14, 4);
      g.fillStyle(0xf5c5a0); g.fillRect(6, 4, 16, 10);
      g.fillStyle(0x1a1a2e); g.fillRect(9, 7, 3, 3); g.fillRect(16, 7, 3, 3);
      g.fillStyle(0x2d6e2d); g.fillRect(5, 14, 18, 13);
      g.fillStyle(0x3d8e3d); g.fillRect(7, 15, 14, 5);
      g.fillStyle(0xf5c5a0); g.fillRect(0, 14, 5, 10); g.fillRect(23, 14, 5, 10);
      g.fillStyle(0xc0c0c0); g.fillRect(24, 8, 3, 13);
      g.fillStyle(0x8b6914); g.fillRect(21, 15, 7, 3);
      // Legs staggered vertically to suggest alternating stride.
      g.fillStyle(0x1a3d1a); g.fillRect(8, 27, 6, 12); g.fillRect(15, 27, 6, 8);
      g.fillStyle(0x3d2000); g.fillRect(7, 36, 8, 3); g.fillRect(14, 33, 8, 3);
    });

    // ── Shield overlay 28×36 (blue ellipse, rendered on top of player) ────────
    // Alpha 0 when inactive; set to 0.7 by Player.activateShield().
    px(scene, 'player_shield', 28, 36, (g) => {
      g.fillStyle(0x0066ff, 0.5); g.fillEllipse(14, 18, 30, 38);
      g.lineStyle(2, 0x00ccff); g.strokeEllipse(14, 18, 30, 38);
    });
  },

  // ============================================================
  // ENEMIES
  // ============================================================

  /**
   * Generates sprites for all four enemy types.
   *
   * Each enemy has a distinct colour palette and silhouette to be immediately
   * recognisable even at small canvas sizes:
   *  - PookieSigma:       red melee grunt (24×30)
   *  - DiscordGhoster:    purple floating ghost (26×34)
   *  - BrainrotSpreader:  yellow/green ranged thrower (24×28)
   *  - ZullbullyKnight:   blue/silver armoured tank (28×36)
   *
   * @param {Phaser.Scene} scene
   */
  enemies(scene) {
    // Pookie Sigma — aggressive red grunt with angry yellow eyes.
    px(scene, 'pookie_sigma', 24, 30, (g) => {
      g.fillStyle(0x1a0000); g.fillRect(4, 0, 16, 5);            // dark hair
      g.fillStyle(0xcc2200); g.fillRect(3, 5, 18, 12);           // red face
      g.fillStyle(0xffdd00); g.fillRect(5, 8, 5, 4);             // eye L (angry yellow)
      g.fillRect(14, 8, 5, 4);                                   // eye R
      g.fillStyle(0xff4400); g.fillRect(4, 17, 16, 8);           // torso
      g.fillStyle(0xaa1100); g.fillRect(0, 17, 4, 7);            // arm L
      g.fillRect(20, 17, 4, 7);                                  // arm R
      g.fillStyle(0x660000); g.fillRect(5, 25, 6, 5);            // leg L
      g.fillRect(13, 25, 6, 5);                                  // leg R
    });

    // Discord Ghoster — purple ghostly blob with cyan glowing eyes and wispy bottom.
    px(scene, 'discord_ghoster', 26, 34, (g) => {
      g.fillStyle(0x6600aa); g.fillEllipse(13, 12, 22, 22);      // body ellipse
      g.fillStyle(0x9933ff); g.fillEllipse(13, 10, 16, 16);      // highlight
      g.fillStyle(0x00ccff); g.fillRect(6, 7, 5, 5);             // eye L (cyan glow)
      g.fillRect(15, 7, 5, 5);
      g.fillStyle(0xffffff, 0.3); g.fillRect(8, 5, 4, 3);       // eye shine L
      g.fillRect(17, 5, 4, 3);
      // Three wispy tendrils hang below the body.
      g.fillStyle(0x6600aa); g.fillRect(4, 20, 5, 10);
      g.fillRect(11, 22, 4, 12);
      g.fillRect(17, 20, 5, 10);
      g.fillStyle(0x9933ff); g.fillRect(5, 21, 3, 8);
      g.fillRect(18, 21, 3, 8);
    });

    // Brainrot Spreader — toxic yellow/green thrower with orange mouth.
    px(scene, 'brainrot_spreader', 24, 28, (g) => {
      g.fillStyle(0x336600); g.fillRect(3, 0, 18, 6);            // messy hair
      g.fillStyle(0xccdd00); g.fillRect(2, 6, 20, 11);           // face
      g.fillStyle(0x00ff00); g.fillRect(4, 9, 5, 5);             // eye L
      g.fillRect(15, 9, 5, 5);
      g.fillStyle(0xff6600); g.fillRect(8, 14, 8, 3);            // wide orange mouth
      g.fillStyle(0x99cc00); g.fillRect(3, 17, 18, 7);           // body
      g.fillStyle(0xccdd00); g.fillRect(0, 16, 3, 8);            // arm L (throwing pose)
      g.fillRect(21, 17, 3, 7);
      g.fillStyle(0x556600); g.fillRect(5, 24, 6, 4);
      g.fillRect(13, 24, 6, 4);
    });

    // Zullbully Knight — blue/silver armour with shield on left arm and sword on right.
    px(scene, 'zullbully_knight', 28, 36, (g) => {
      g.fillStyle(0x334466); g.fillRect(4, 0, 20, 14);           // helmet
      g.fillStyle(0x4466aa); g.fillRect(6, 2, 16, 10);           // helmet shine
      g.fillStyle(0x222233); g.fillRect(8, 6, 5, 5);             // visor slit L
      g.fillRect(15, 6, 5, 5);
      g.fillStyle(0x445577); g.fillRect(3, 14, 22, 15);          // heavy torso plate
      g.fillStyle(0x5577aa); g.fillRect(5, 16, 18, 7);           // torso shine
      g.fillStyle(0x334466); g.fillRect(0, 13, 3, 12);           // arm L
      g.fillRect(25, 13, 3, 12);                                 // arm R
      // Large shield on left arm (extends beyond the sprite bounds intentionally).
      g.fillStyle(0x7799bb); g.fillRect(-4, 10, 8, 20);
      g.fillStyle(0xaabbcc); g.fillRect(-3, 11, 6, 18);
      g.fillStyle(0xffcc00); g.fillRect(-2, 18, 4, 4);           // gold shield emblem
      // Sword on right arm.
      g.fillStyle(0xdddddd); g.fillRect(26, 4, 4, 22);
      g.fillStyle(0x996600); g.fillRect(23, 17, 8, 3);
      g.fillStyle(0x334466); g.fillRect(5, 29, 8, 7);
      g.fillRect(15, 29, 8, 7);
      g.fillStyle(0x223355); g.fillRect(4, 33, 10, 3);
      g.fillRect(14, 33, 10, 3);
    });
  },

  // ============================================================
  // BOSSES
  // ============================================================

  /**
   * Generates sprites for both bosses and phase-related overlays.
   *
   * MagheibaChaasi (64×64): large cave troll; brown/dark body, glowing orange eyes.
   * BullyMaguire   (72×80): tall imposing figure in red Canadian regalia; gold maple leaf.
   * Phase overlays and the crown indicator are also generated here.
   *
   * @param {Phaser.Scene} scene
   */
  bosses(scene) {
    // MagheibaChaasi — cave troll mid-boss.
    px(scene, 'magheiba_boss', 64, 64, (g) => {
      g.fillStyle(0x3d2510); g.fillEllipse(32, 26, 52, 44);      // body
      g.fillStyle(0x5a3820); g.fillEllipse(32, 22, 40, 34);      // lighter highlight
      g.fillStyle(0xff8800); g.fillRect(12, 14, 12, 12);         // eye L glow
      g.fillRect(40, 14, 12, 12);
      g.fillStyle(0xff4400); g.fillRect(14, 16, 8, 8);
      g.fillRect(42, 16, 8, 8);
      g.fillStyle(0xffffff); g.fillRect(15, 17, 6, 6);           // eye pupil L
      g.fillRect(43, 17, 6, 6);
      g.fillStyle(0x3d2510); g.fillRect(18, 30, 28, 6);          // mouth
      g.fillStyle(0xffffff);                                      // teeth
      g.fillRect(20, 31, 4, 4); g.fillRect(26, 31, 4, 4);
      g.fillRect(32, 31, 4, 4); g.fillRect(38, 31, 4, 4);
      g.fillStyle(0x3d2510); g.fillRect(0, 30, 14, 20);          // arm L
      g.fillRect(50, 30, 14, 20);
      g.fillStyle(0x2a1a08); g.fillRect(4, 46, 12, 8);           // claw L
      g.fillRect(48, 46, 12, 8);
      g.fillStyle(0x3d2510); g.fillRect(14, 46, 12, 18);         // leg L
      g.fillRect(38, 46, 12, 18);
    });

    // BullyMaguire — final boss in red Canadian coat with gold maple leaf emblem.
    px(scene, 'bully_maguire_boss', 72, 80, (g) => {
      g.fillStyle(0xcc0000); g.fillRect(16, 0, 40, 24);          // cape/hat
      g.fillStyle(0xffffff); g.fillRect(18, 4, 36, 18);          // white inner
      g.fillStyle(0xcc0000); g.fillEllipse(36, 28, 28, 28);      // head
      g.fillStyle(0xf5c5a0); g.fillEllipse(36, 27, 22, 22);      // face
      g.fillStyle(0x000000); g.fillRect(28, 23, 5, 5);           // eye L
      g.fillRect(39, 23, 5, 5);
      g.fillStyle(0xffffff); g.fillRect(29, 24, 3, 3);           // eye shine L
      g.fillRect(40, 24, 3, 3);
      g.fillStyle(0xcc0000); g.fillRect(24, 33, 24, 6);          // hat brim / crown
      g.fillStyle(0xcc3300); g.fillRect(16, 38, 40, 26);         // red coat body
      g.fillStyle(0xffffff); g.fillRect(18, 39, 36, 24);         // white chest
      g.fillStyle(0xcc0000); g.fillRect(26, 39, 20, 24);         // coat centre stripe
      g.fillStyle(0xffcc00); g.fillRect(30, 42, 12, 12);         // gold maple leaf bg
      g.fillStyle(0xff0000); g.fillRect(32, 44, 8, 8);           // leaf centre red
      g.fillStyle(0xcc3300); g.fillRect(4, 38, 12, 20);          // arm L
      g.fillRect(56, 38, 12, 20);
      g.fillStyle(0x880000); g.fillRect(2, 56, 16, 8);           // fist L
      g.fillRect(54, 56, 16, 8);
      g.fillStyle(0x222233); g.fillRect(22, 64, 10, 16);         // leg L
      g.fillRect(40, 64, 10, 16);
      g.fillStyle(0x111122); g.fillRect(20, 74, 14, 6);          // boot L
      g.fillRect(38, 74, 14, 6);
    });

    // Phase 2 overlay — grey semi-transparent wash applied as a tint during damage reduction.
    // Separate texture so it can be composited on top of the boss without modifying the base.
    px(scene, 'zeus_phase2_overlay', 72, 80, (g) => {
      g.fillStyle(0x888888, 0.5); g.fillRect(0, 0, 72, 80);
      g.lineStyle(3, 0xaaaaaa); g.strokeRect(2, 2, 68, 76);
    });

    // Crown indicator (Phase 3 minion summon signal) — gold zig-zag crown shape.
    px(scene, 'zeus_crown', 24, 16, (g) => {
      g.fillStyle(0xffcc00);
      g.fillRect(0, 8, 24, 8);                  // base bar
      g.fillTriangle(0, 8, 4, 0, 8, 8);         // spike L
      g.fillTriangle(8, 8, 12, 0, 16, 8);       // spike centre
      g.fillTriangle(16, 8, 20, 0, 24, 8);      // spike R
    });
  },

  // ============================================================
  // PROJECTILES
  // ============================================================

  /**
   * Generates bullet and particle sprites for all projectile types.
   *
   * Colour coding:
   *  - Player bullet:      yellow/orange orb (friendly)
   *  - Enemy bullet:       red orb (hostile)
   *  - Brainrot particle:  toxic green (ranged enemy)
   *  - Boss bullet P1:     dark red + orange + yellow (multi-layer for depth)
   *  - Boss bullet P3:     red + white cross (high damage visual)
   *  - Melee flash:        white/yellow rectangle (hitbox visual)
   *
   * @param {Phaser.Scene} scene
   */
  projectiles(scene) {
    // Player bullet — glowing yellow-orange orb 12×12.
    px(scene, 'player_bullet', 12, 12, (g) => {
      g.fillStyle(0xffaa00); g.fillEllipse(6, 6, 12, 12);
      g.fillStyle(0xffffff); g.fillEllipse(4, 4, 5, 5); // specular highlight
    });

    // Enemy bullet — red orb 10×10 with lighter core.
    px(scene, 'enemy_bullet', 10, 10, (g) => {
      g.fillStyle(0xff2200); g.fillEllipse(5, 5, 10, 10);
      g.fillStyle(0xff8866); g.fillEllipse(3, 3, 4, 4);
    });

    // Brainrot particle — toxic green with swirl cross detail 14×14.
    px(scene, 'brainrot_particle', 14, 14, (g) => {
      g.fillStyle(0x00ff66); g.fillEllipse(7, 7, 14, 14);
      g.fillStyle(0xccff00); g.fillEllipse(5, 5, 6, 6);
      // Cross-hatch swirl to suggest toxicity.
      g.fillStyle(0x003300); g.fillRect(5, 6, 4, 2);
      g.fillRect(6, 4, 2, 6);
    });

    // Boss Phase 1 bullet — large threatening red orb 18×18 with three-layer glow.
    px(scene, 'boss_bullet_p1', 18, 18, (g) => {
      g.fillStyle(0xdd0000); g.fillEllipse(9, 9, 18, 18);
      g.fillStyle(0xff6600); g.fillEllipse(7, 7, 8, 8);
      g.fillStyle(0xffff00); g.fillEllipse(5, 5, 4, 4); // hot core
    });

    // Boss Phase 3 bullet — red with white cross (explosive visual) 20×20.
    px(scene, 'boss_bullet_p3', 20, 20, (g) => {
      g.fillStyle(0xcc0000); g.fillEllipse(10, 10, 20, 20);
      g.fillStyle(0xffffff); g.fillEllipse(6, 6, 10, 10);
      g.fillStyle(0xcc0000); g.fillRect(6, 9, 8, 2);    // horizontal bar
      g.fillRect(9, 6, 2, 8);                           // vertical bar
    });

    // Melee hitbox flash — wide horizontal bar, semi-transparent 48×32.
    // Visible during the swing window; fades via tween in Player._meleeAttack.
    px(scene, 'melee_flash', 48, 32, (g) => {
      g.fillStyle(0xffffff, 0.6); g.fillRect(0, 8, 48, 16);
      g.fillStyle(0xffdd00, 0.8); g.fillRect(4, 10, 40, 12);
    });
  },

  // ============================================================
  // PICKUPS
  // ============================================================

  /**
   * Generates sprites for all four pickup types.
   *
   * Each pickup has a distinct icon shape (not just colour) for accessibility:
   *  - Health:  red cross on dark background
   *  - Ammo:    yellow bullet with casing
   *  - Speed:   lightning bolt (sigma mode)
   *  - Shield:  blue shield with point and stripe
   *
   * @param {Phaser.Scene} scene
   */
  pickups(scene) {
    // Health orb — red cross 20×20.
    px(scene, 'pickup_health', 20, 20, (g) => {
      g.fillStyle(0x880000); g.fillRect(0, 0, 20, 20);
      g.fillStyle(0xff2222); g.fillRect(2, 2, 16, 16);
      g.fillStyle(0xffffff); g.fillRect(8, 4, 4, 12);  // vertical arm
      g.fillRect(4, 8, 12, 4);                         // horizontal arm
    });

    // Ammo — yellow bullet with brass casing 18×18.
    px(scene, 'pickup_ammo', 18, 18, (g) => {
      g.fillStyle(0x888800); g.fillRect(0, 0, 18, 18);
      g.fillStyle(0xffdd00); g.fillRect(2, 2, 14, 14);
      g.fillStyle(0xffaa00); g.fillRect(5, 3, 8, 8);   // bullet tip
      g.fillStyle(0x886600); g.fillRect(4, 11, 10, 5); // casing
    });

    // Sigma Mode — lightning bolt on yellow-green bg 20×20.
    px(scene, 'pickup_speed', 20, 20, (g) => {
      g.fillStyle(0x444400); g.fillRect(0, 0, 20, 20);
      g.fillStyle(0xffff00); g.fillRect(2, 2, 16, 16);
      g.fillStyle(0xffffff);
      // Two triangles forming a zig-zag lightning bolt.
      g.fillTriangle(12, 2, 6, 10, 10, 10);  // top half
      g.fillTriangle(10, 10, 14, 10, 8, 18); // bottom half
    });

    // Pookie Shield — blue shield with point and stripe 20×20.
    px(scene, 'pickup_shield', 20, 20, (g) => {
      g.fillStyle(0x003388); g.fillRect(0, 0, 20, 20);
      g.fillStyle(0x0055cc); g.fillRect(2, 2, 16, 16);
      g.fillStyle(0x4499ff); g.fillRect(4, 3, 12, 10);   // shield body
      g.fillStyle(0x0055cc); g.fillTriangle(4, 13, 16, 13, 10, 17); // shield point
      g.fillStyle(0x88ccff); g.fillRect(7, 5, 2, 6);     // decorative stripe
    });
  },

  // ============================================================
  // PLATFORMS
  // ============================================================

  /**
   * Generates platform and ground tiles for each of the four zones.
   *
   * Each zone gets two tile variants:
   *  - `plat_<zone>`:   16px-tall floating platform.
   *  - `ground_<zone>`: 32px-tall ground tile (taller, for the floor).
   *
   * Zone tile palettes:
   *  - Greenpath:   brown dirt + green grass
   *  - Discord Void: dark purple + bright purple glitch lines
   *  - Cave:         brown rock with crack details
   *  - Canada:       ice blue + white snow cap
   *
   * @param {Phaser.Scene} scene
   */
  platforms(scene) {
    // Greenpath platform 32×16.
    px(scene, 'plat_greenpath', 32, 16, (g) => {
      g.fillStyle(0x5c3d1a); g.fillRect(0, 4, 32, 12);   // dirt
      g.fillStyle(0x2d8a2d); g.fillRect(0, 0, 32, 6);    // grass layer
      g.fillStyle(0x40aa40); g.fillRect(0, 0, 32, 3);    // bright top
      g.fillStyle(0x4a3020); g.fillRect(0, 8, 32, 2);    // dirt seam
    });

    // Greenpath ground 32×32 (deeper dirt with root details).
    px(scene, 'ground_greenpath', 32, 32, (g) => {
      g.fillStyle(0x5c3d1a); g.fillRect(0, 4, 32, 28);
      g.fillStyle(0x2d8a2d); g.fillRect(0, 0, 32, 6);
      g.fillStyle(0x40aa40); g.fillRect(0, 0, 32, 3);
      g.fillStyle(0x4a3020); g.fillRect(0, 10, 32, 2);
      // Root details — irregular dark rectangles.
      g.fillStyle(0x3d2810); g.fillRect(4, 16, 6, 8);
      g.fillRect(18, 20, 5, 6);
    });

    // Discord Void platform 32×16 (dark with purple glitch scanlines).
    px(scene, 'plat_discordvoid', 32, 16, (g) => {
      g.fillStyle(0x1a0040); g.fillRect(0, 4, 32, 12);
      g.fillStyle(0x6600cc); g.fillRect(0, 0, 32, 5);    // purple top
      g.fillStyle(0x9933ff); g.fillRect(0, 0, 32, 2);    // bright edge
      // Glitch scanlines — cyan at low opacity.
      g.fillStyle(0x00ccff, 0.5); g.fillRect(4, 2, 8, 1);
      g.fillRect(18, 1, 6, 1);
    });

    // Cave platform 32×16 (rocky brown with crack details).
    px(scene, 'plat_cave', 32, 16, (g) => {
      g.fillStyle(0x3d2a1a); g.fillRect(0, 0, 32, 16);
      g.fillStyle(0x5a4030); g.fillRect(0, 0, 32, 5);    // lighter top
      // Crack details — darker irregular rectangles.
      g.fillStyle(0x2a1a0a); g.fillRect(2, 6, 4, 6);
      g.fillRect(14, 8, 5, 5);
      g.fillRect(24, 5, 4, 7);
    });

    // Canada platform 32×16 (snow on top, ice body).
    px(scene, 'plat_canada', 32, 16, (g) => {
      g.fillStyle(0x7ab8d0); g.fillRect(0, 5, 32, 11);   // ice body
      g.fillStyle(0xffffff); g.fillRect(0, 0, 32, 6);    // snow cap
      g.fillStyle(0xe0f0ff); g.fillRect(0, 0, 32, 3);    // bright snow top
      g.fillStyle(0x99ccdd); g.fillRect(0, 8, 32, 2);    // ice seam
    });
  },

  // ============================================================
  // BACKGROUNDS
  // ============================================================

  /**
   * Generates full-screen background textures (800×480) for each zone.
   *
   * These are rendered at scrollFactor 0.2 (parallax) so they drift slowly
   * behind the action. Each background sets the visual tone of its zone:
   *  - Greenpath:   dark green forest with tree silhouettes
   *  - Discord Void: near-black space with purple glitch artifacts
   *  - Cave:         dark brown with stalactites and ambient glow
   *  - Canada:       pale blue sky with mountains and snow
   *
   * Simulated gradients use horizontal colour bands (Phaser Graphics doesn't
   * support actual gradients, so multiple fillRect calls approximate the look).
   *
   * @param {Phaser.Scene} scene
   */
  backgrounds(scene) {
    // Greenpath — three dark-green bands + tree silhouettes.
    px(scene, 'bg_greenpath', 800, 480, (g) => {
      g.fillStyle(0x1a5c1a); g.fillRect(0, 0, 800, 160);
      g.fillStyle(0x1a4a1a); g.fillRect(0, 160, 800, 160);
      g.fillStyle(0x0d2b0d); g.fillRect(0, 320, 800, 160);
      g.fillStyle(0x0a200a);
      // Evenly spaced tree triangles with trunk rectangles.
      for (let x = 0; x < 800; x += 80) {
        g.fillTriangle(x + 40, 200, x + 10, 320, x + 70, 320);
        g.fillRect(x + 28, 320, 24, 40);
      }
    });

    // Discord Void — near-black with purple dots and cyan scanlines.
    px(scene, 'bg_discordvoid', 800, 480, (g) => {
      g.fillStyle(0x050010); g.fillRect(0, 0, 800, 480);
      g.fillStyle(0x0d0025); g.fillRect(0, 240, 800, 240);
      // Stars: deterministic positions via modulo to avoid randomness (no seeded RNG here).
      g.fillStyle(0x9933ff);
      for (let i = 0; i < 30; i++) {
        const x = (i * 127) % 800;
        const y = (i * 73) % 480;
        g.fillRect(x, y, 2, 2);
      }
      // Horizontal glitch scanlines — gives the void a digital-interference feel.
      g.fillStyle(0x00ccff, 0.3);
      g.fillRect(0, 120, 800, 2);
      g.fillRect(0, 260, 800, 1);
      g.fillRect(0, 380, 800, 2);
    });

    // Cave — almost black with stalactites hanging from the ceiling and warm glow patches.
    px(scene, 'bg_cave', 800, 480, (g) => {
      g.fillStyle(0x080504); g.fillRect(0, 0, 800, 480);
      g.fillStyle(0x120a06); g.fillRect(0, 200, 800, 280);
      g.fillStyle(0x3d2a1a);
      // Stalactites: triangles growing down from y=0, varying heights.
      for (let x = 0; x < 800; x += 64) {
        const h = 40 + (x % 80);
        g.fillTriangle(x + 8, 0, x + 56, 0, x + 32, h);
      }
      // Two ambient glow patches using large semi-transparent ellipses.
      g.fillStyle(0x220800, 0.5);
      g.fillEllipse(200, 300, 80, 80);
      g.fillEllipse(600, 200, 60, 60);
    });

    // Canada — pale blue sky, blue-grey mountains with white snow caps and snowflakes.
    px(scene, 'bg_canada', 800, 480, (g) => {
      g.fillStyle(0xc8e8f8); g.fillRect(0, 0, 800, 480);
      g.fillStyle(0xa0cce0); g.fillRect(0, 280, 800, 200); // lower sky (darker)
      // Mountains — three overlapping triangles.
      g.fillStyle(0x88aabb);
      g.fillTriangle(100, 280, 0, 480, 200, 480);
      g.fillTriangle(350, 200, 200, 480, 500, 480);
      g.fillTriangle(650, 240, 500, 480, 800, 480);
      // Snow caps on each mountain peak.
      g.fillStyle(0xffffff);
      g.fillTriangle(100, 280, 70, 340, 130, 340);
      g.fillTriangle(350, 200, 310, 270, 390, 270);
      g.fillTriangle(650, 240, 610, 300, 690, 300);
      // Snowflakes: deterministic positions to avoid randomness in texture generation.
      g.fillStyle(0xffffff);
      for (let i = 0; i < 40; i++) {
        const x = (i * 97) % 800;
        const y = (i * 61) % 280;
        g.fillRect(x, y, 3, 3);
      }
    });
  },

  // ============================================================
  // UI ELEMENTS
  // ============================================================

  /**
   * Generates HUD and door textures.
   *
   * HUD textures (hud_healthbg, hud_healthfill, hud_life) are created here
   * but the HP bar is actually redrawn each frame with Graphics in HUDScene —
   * these textures serve as fallback / reference references.
   *
   * Door textures are shown/swapped by GameScene._openDoor().
   *
   * @param {Phaser.Scene} scene
   */
  ui(scene) {
    // Health bar background container 202×20.
    px(scene, 'hud_healthbg', 202, 20, (g) => {
      g.fillStyle(0x220000); g.fillRect(0, 0, 202, 20);
      g.lineStyle(2, 0x880000); g.strokeRect(0, 0, 202, 20);
    });

    // Health bar fill (green, with highlight and shadow bands) 200×16.
    px(scene, 'hud_healthfill', 200, 16, (g) => {
      g.fillStyle(0x22cc22); g.fillRect(0, 0, 200, 16);
      g.fillStyle(0x44ff44); g.fillRect(0, 0, 200, 6);   // top highlight
      g.fillStyle(0x118811); g.fillRect(0, 12, 200, 4);  // bottom shadow
    });

    // Life icon — pixel-art heart shape 16×16.
    px(scene, 'hud_life', 16, 16, (g) => {
      g.fillStyle(0xff2222);
      // Heart built from overlapping rectangles — no curve support needed.
      g.fillRect(1, 4, 6, 10);
      g.fillRect(9, 4, 6, 10);
      g.fillRect(4, 2, 8, 12);
      g.fillRect(1, 10, 14, 4);
      g.fillRect(4, 14, 8, 2);
    });

    // Closed door — wooden door with two recessed panels and a handle 64×80.
    px(scene, 'door_closed', 64, 80, (g) => {
      g.fillStyle(0x442200); g.fillRect(0, 0, 64, 80);   // dark wood frame
      g.fillStyle(0x663300); g.fillRect(4, 4, 56, 72);   // lighter wood body
      g.fillStyle(0x442200); g.fillRect(10, 20, 18, 30); // panel L
      g.fillRect(36, 20, 18, 30);                        // panel R
      g.fillStyle(0xaa6600); g.fillRect(28, 38, 8, 8);   // handle
    });

    // Open door — dark passage with warm orange glow 64×80.
    px(scene, 'door_open', 64, 80, (g) => {
      g.fillStyle(0x442200); g.fillRect(0, 0, 64, 80);
      g.fillStyle(0x000000); g.fillRect(8, 4, 48, 72);   // void passage
      // Amber glow at low alpha suggests torchlight beyond.
      g.fillStyle(0xffaa00, 0.3); g.fillRect(8, 4, 48, 72);
      g.lineStyle(2, 0x663300); g.strokeRect(0, 0, 64, 80);
    });

    // Zone clear banner (unused in default flow but available) 400×60.
    px(scene, 'zone_clear_banner', 400, 60, (g) => {
      g.fillStyle(0x002200); g.fillRect(0, 0, 400, 60);
      g.lineStyle(3, 0x00ff00); g.strokeRect(2, 2, 396, 56);
    });
  },

  // ============================================================
  // EFFECTS
  // ============================================================

  /**
   * Generates transient visual effect textures (sparks, bursts, trails, glows).
   *
   * All effect images are created via `scene.add.image` and destroyed by tween
   * callbacks — they're not persistent game objects.
   *
   * @param {Phaser.Scene} scene
   */
  effects(scene) {
    // Hit spark — white cross with diagonal corners 16×16.
    // Used for melee and bullet hit feedback.
    px(scene, 'hit_spark', 16, 16, (g) => {
      g.fillStyle(0xffffff);
      g.fillRect(6, 0, 4, 16);   // vertical bar
      g.fillRect(0, 6, 16, 4);   // horizontal bar
      g.fillRect(2, 2, 4, 4);    // corner TL
      g.fillRect(10, 2, 4, 4);   // corner TR
      g.fillRect(2, 10, 4, 4);   // corner BL
      g.fillRect(10, 10, 4, 4);  // corner BR
    });

    // Death burst — three concentric ellipses (red outer, orange mid, white core) 24×24.
    px(scene, 'death_burst', 24, 24, (g) => {
      g.fillStyle(0xff4400); g.fillEllipse(12, 12, 24, 24);
      g.fillStyle(0xffaa00); g.fillEllipse(12, 12, 16, 16);
      g.fillStyle(0xffffff); g.fillEllipse(12, 12,  8,  8);
    });

    // Sigma mode trail — small yellow ellipse 8×8.
    // One spawned per frame during sigma mode; fades over 200ms.
    px(scene, 'sigma_trail', 8, 8, (g) => {
      g.fillStyle(0xffff00, 0.6); g.fillEllipse(4, 4, 8, 8);
    });

    // Shield hit ripple — two concentric cyan rings 32×32.
    // Plays when the player's shield absorbs a hit.
    px(scene, 'shield_hit', 32, 32, (g) => {
      g.lineStyle(3, 0x00aaff); g.strokeEllipse(16, 16, 32, 32);
      g.lineStyle(2, 0x0066ff); g.strokeEllipse(16, 16, 22, 22);
    });

    // Teleport effect — purple ellipse with white cross, used by DiscordGhoster 32×32.
    px(scene, 'teleport_fx', 32, 32, (g) => {
      g.fillStyle(0x6600aa, 0.4); g.fillEllipse(16, 16, 32, 32);
      g.lineStyle(2, 0x9933ff); g.strokeEllipse(16, 16, 32, 32);
      // White cross lines — the "flash" of teleportation.
      g.fillStyle(0xffffff, 0.6);
      g.fillRect(14, 0, 4, 32);
      g.fillRect(0, 14, 32, 4);
    });
  },
};
