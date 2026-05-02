/**
 * SpriteGenerator — creates all game textures programmatically using Phaser Graphics.
 * No external image files needed. Each entity type has a static createTexture() call.
 */

function px(scene, key, w, h, drawFn) {
  const g = scene.make.graphics({ x: 0, y: 0, add: false });
  drawFn(g);
  g.generateTexture(key, w, h);
  g.destroy();
}

export const SpriteGenerator = {
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

  // ─── PLAYER ───────────────────────────────────────────────────────────────
  player(scene) {
    // Idle / walk sprite 28×36
    px(scene, 'player', 28, 36, (g) => {
      g.fillStyle(0x3d1a00); g.fillRect(7, 0, 14, 4);           // hair
      g.fillStyle(0xf5c5a0); g.fillRect(6, 4, 16, 10);          // face
      g.fillStyle(0x1a1a2e); g.fillRect(9, 7, 3, 3);            // eye L
      g.fillRect(16, 7, 3, 3);                                   // eye R
      g.fillStyle(0x2d6e2d); g.fillRect(5, 14, 18, 13);         // torso armor
      g.fillStyle(0x3d8e3d); g.fillRect(7, 15, 14, 5);          // armor shine
      g.fillStyle(0xf5c5a0); g.fillRect(0, 14, 5, 10);          // arm L
      g.fillRect(23, 14, 5, 10);                                 // arm R
      g.fillStyle(0xc0c0c0); g.fillRect(24, 8, 3, 13);          // sword blade
      g.fillStyle(0x8b6914); g.fillRect(21, 15, 7, 3);          // sword guard
      g.fillStyle(0x1a3d1a); g.fillRect(6, 27, 7, 9);           // leg L
      g.fillRect(15, 27, 7, 9);                                  // leg R
      g.fillStyle(0x3d2000); g.fillRect(5, 33, 8, 3);           // boot L
      g.fillRect(14, 33, 8, 3);                                  // boot R
    });

    // Attack sprite 40×36 (arm extended forward)
    px(scene, 'player_attack', 40, 36, (g) => {
      g.fillStyle(0x3d1a00); g.fillRect(7, 0, 14, 4);
      g.fillStyle(0xf5c5a0); g.fillRect(6, 4, 16, 10);
      g.fillStyle(0x1a1a2e); g.fillRect(9, 7, 3, 3); g.fillRect(16, 7, 3, 3);
      g.fillStyle(0x2d6e2d); g.fillRect(5, 14, 18, 13);
      g.fillStyle(0x3d8e3d); g.fillRect(7, 15, 14, 5);
      g.fillStyle(0xf5c5a0); g.fillRect(0, 14, 5, 10);
      g.fillRect(23, 10, 5, 8); // arm raised for swing
      g.fillStyle(0xc0c0c0); g.fillRect(26, 0, 3, 22); // extended blade
      g.fillRect(28, 4, 10, 3); // horizontal swing
      g.fillStyle(0x8b6914); g.fillRect(21, 13, 8, 3);
      g.fillStyle(0x1a3d1a); g.fillRect(6, 27, 7, 9); g.fillRect(15, 27, 7, 9);
      g.fillStyle(0x3d2000); g.fillRect(5, 33, 8, 3); g.fillRect(14, 33, 8, 3);
    });

    // Jump sprite
    px(scene, 'player_jump', 28, 36, (g) => {
      g.fillStyle(0x3d1a00); g.fillRect(7, 0, 14, 4);
      g.fillStyle(0xf5c5a0); g.fillRect(6, 4, 16, 10);
      g.fillStyle(0x1a1a2e); g.fillRect(9, 7, 3, 3); g.fillRect(16, 7, 3, 3);
      g.fillStyle(0x2d6e2d); g.fillRect(5, 14, 18, 13);
      g.fillStyle(0x3d8e3d); g.fillRect(7, 15, 14, 5);
      g.fillStyle(0xf5c5a0); g.fillRect(0, 8, 5, 10); g.fillRect(23, 8, 5, 10);
      g.fillStyle(0xc0c0c0); g.fillRect(24, 4, 3, 13);
      g.fillStyle(0x8b6914); g.fillRect(21, 11, 7, 3);
      g.fillStyle(0x1a3d1a); g.fillRect(6, 27, 7, 7); g.fillRect(15, 27, 7, 7);
      g.fillStyle(0x3d2000); g.fillRect(5, 31, 8, 3); g.fillRect(14, 31, 8, 3);
    });

    // Walk frame 2 (legs swapped)
    px(scene, 'player_walk', 28, 36, (g) => {
      g.fillStyle(0x3d1a00); g.fillRect(7, 0, 14, 4);
      g.fillStyle(0xf5c5a0); g.fillRect(6, 4, 16, 10);
      g.fillStyle(0x1a1a2e); g.fillRect(9, 7, 3, 3); g.fillRect(16, 7, 3, 3);
      g.fillStyle(0x2d6e2d); g.fillRect(5, 14, 18, 13);
      g.fillStyle(0x3d8e3d); g.fillRect(7, 15, 14, 5);
      g.fillStyle(0xf5c5a0); g.fillRect(0, 14, 5, 10); g.fillRect(23, 14, 5, 10);
      g.fillStyle(0xc0c0c0); g.fillRect(24, 8, 3, 13);
      g.fillStyle(0x8b6914); g.fillRect(21, 15, 7, 3);
      g.fillStyle(0x1a3d1a); g.fillRect(8, 27, 6, 12); g.fillRect(15, 27, 6, 8);
      g.fillStyle(0x3d2000); g.fillRect(7, 36, 8, 3); g.fillRect(14, 33, 8, 3);
    });

    // Player shield (overlay)
    px(scene, 'player_shield', 28, 36, (g) => {
      g.fillStyle(0x0066ff, 0.5); g.fillEllipse(14, 18, 30, 38);
      g.lineStyle(2, 0x00ccff); g.strokeEllipse(14, 18, 30, 38);
    });
  },

  // ─── ENEMIES ──────────────────────────────────────────────────────────────
  enemies(scene) {
    // Pookie Sigma — basic red melee enemy 24×30
    px(scene, 'pookie_sigma', 24, 30, (g) => {
      g.fillStyle(0x1a0000); g.fillRect(4, 0, 16, 5);            // dark hair
      g.fillStyle(0xcc2200); g.fillRect(3, 5, 18, 12);           // red face/head
      g.fillStyle(0xffdd00); g.fillRect(5, 8, 5, 4);             // eye L angry
      g.fillRect(14, 8, 5, 4);                                   // eye R angry
      g.fillStyle(0xff4400); g.fillRect(4, 17, 16, 8);           // torso
      g.fillStyle(0xaa1100); g.fillRect(0, 17, 4, 7);            // arm L
      g.fillRect(20, 17, 4, 7);                                  // arm R
      g.fillStyle(0x660000); g.fillRect(5, 25, 6, 5);            // leg L
      g.fillRect(13, 25, 6, 5);                                  // leg R
    });

    // Discord Ghoster — purple ghost enemy 26×34
    px(scene, 'discord_ghoster', 26, 34, (g) => {
      g.fillStyle(0x6600aa); g.fillEllipse(13, 12, 22, 22);      // body
      g.fillStyle(0x9933ff); g.fillEllipse(13, 10, 16, 16);      // lighter highlight
      g.fillStyle(0x00ccff); g.fillRect(6, 7, 5, 5);             // eye L glow
      g.fillRect(15, 7, 5, 5);                                   // eye R glow
      g.fillStyle(0xffffff, 0.3); g.fillRect(8, 5, 4, 3);       // eye shine L
      g.fillRect(17, 5, 4, 3);                                   // eye shine R
      // Wispy bottom
      g.fillStyle(0x6600aa); g.fillRect(4, 20, 5, 10);
      g.fillRect(11, 22, 4, 12);
      g.fillRect(17, 20, 5, 10);
      g.fillStyle(0x9933ff); g.fillRect(5, 21, 3, 8);
      g.fillRect(18, 21, 3, 8);
    });

    // Brainrot Spreader — yellow/green ranged enemy 24×28
    px(scene, 'brainrot_spreader', 24, 28, (g) => {
      g.fillStyle(0x336600); g.fillRect(3, 0, 18, 6);            // messy hair
      g.fillStyle(0xccdd00); g.fillRect(2, 6, 20, 11);           // face
      g.fillStyle(0x00ff00); g.fillRect(4, 9, 5, 5);             // eyes
      g.fillRect(15, 9, 5, 5);
      g.fillStyle(0xff6600); g.fillRect(8, 14, 8, 3);            // mouth
      g.fillStyle(0x99cc00); g.fillRect(3, 17, 18, 7);           // body
      g.fillStyle(0xccdd00); g.fillRect(0, 16, 3, 8);            // arm throwing
      g.fillRect(21, 17, 3, 7);
      g.fillStyle(0x556600); g.fillRect(5, 24, 6, 4);
      g.fillRect(13, 24, 6, 4);
    });

    // Zullbully Knight — armored blue/silver 28×36
    px(scene, 'zullbully_knight', 28, 36, (g) => {
      g.fillStyle(0x334466); g.fillRect(4, 0, 20, 14);           // helmet
      g.fillStyle(0x4466aa); g.fillRect(6, 2, 16, 10);           // helmet shine
      g.fillStyle(0x222233); g.fillRect(8, 6, 5, 5);             // visor slit L
      g.fillRect(15, 6, 5, 5);                                   // visor slit R
      g.fillStyle(0x445577); g.fillRect(3, 14, 22, 15);          // heavy armor torso
      g.fillStyle(0x5577aa); g.fillRect(5, 16, 18, 7);           // torso shine
      g.fillStyle(0x334466); g.fillRect(0, 13, 3, 12);           // arm L
      g.fillRect(25, 13, 3, 12);                                 // arm R
      // Large shield on left arm
      g.fillStyle(0x7799bb); g.fillRect(-4, 10, 8, 20);
      g.fillStyle(0xaabbcc); g.fillRect(-3, 11, 6, 18);
      g.fillStyle(0xffcc00); g.fillRect(-2, 18, 4, 4);           // shield emblem
      // Sword on right
      g.fillStyle(0xdddddd); g.fillRect(26, 4, 4, 22);
      g.fillStyle(0x996600); g.fillRect(23, 17, 8, 3);
      g.fillStyle(0x334466); g.fillRect(5, 29, 8, 7);            // leg L
      g.fillRect(15, 29, 8, 7);
      g.fillStyle(0x223355); g.fillRect(4, 33, 10, 3);
      g.fillRect(14, 33, 10, 3);
    });
  },

  // ─── BOSSES ───────────────────────────────────────────────────────────────
  bosses(scene) {
    // Magheiba Chaasi Chuuma — cave troll mid boss 64×64
    px(scene, 'magheiba_boss', 64, 64, (g) => {
      g.fillStyle(0x3d2510); g.fillEllipse(32, 26, 52, 44);      // body
      g.fillStyle(0x5a3820); g.fillEllipse(32, 22, 40, 34);      // lighter body
      g.fillStyle(0xff8800); g.fillRect(12, 14, 12, 12);         // eye L glow
      g.fillRect(40, 14, 12, 12);
      g.fillStyle(0xff4400); g.fillRect(14, 16, 8, 8);
      g.fillRect(42, 16, 8, 8);
      g.fillStyle(0xffffff); g.fillRect(15, 17, 6, 6);
      g.fillRect(43, 17, 6, 6);
      g.fillStyle(0x3d2510); g.fillRect(18, 30, 28, 6);          // mouth
      g.fillStyle(0xffffff); g.fillRect(20, 31, 4, 4);           // teeth
      g.fillRect(26, 31, 4, 4);
      g.fillRect(32, 31, 4, 4);
      g.fillRect(38, 31, 4, 4);
      g.fillStyle(0x3d2510); g.fillRect(0, 30, 14, 20);          // arm L
      g.fillRect(50, 30, 14, 20);                                // arm R
      g.fillStyle(0x2a1a08); g.fillRect(4, 46, 12, 8);           // claw L
      g.fillRect(48, 46, 12, 8);                                 // claw R
      g.fillStyle(0x3d2510); g.fillRect(14, 46, 12, 18);         // leg L
      g.fillRect(38, 46, 12, 18);
    });

    // Bully Maguire / Bulladi — final boss 72×80, 3 phases via tint
    px(scene, 'bully_maguire_boss', 72, 80, (g) => {
      // Base form — tall imposing figure
      g.fillStyle(0xcc0000); g.fillRect(16, 0, 40, 24);          // cape/hat (Canada red)
      g.fillStyle(0xffffff); g.fillRect(18, 4, 36, 18);          // white inner
      g.fillStyle(0xcc0000); g.fillEllipse(36, 28, 28, 28);      // head
      g.fillStyle(0xf5c5a0); g.fillEllipse(36, 27, 22, 22);      // face
      g.fillStyle(0x000000); g.fillRect(28, 23, 5, 5);           // eye L
      g.fillRect(39, 23, 5, 5);                                  // eye R
      g.fillStyle(0xffffff); g.fillRect(29, 24, 3, 3);
      g.fillRect(40, 24, 3, 3);
      g.fillStyle(0xcc0000); g.fillRect(24, 33, 24, 6);          // crown/hat brim
      g.fillStyle(0xcc3300); g.fillRect(16, 38, 40, 26);         // body red coat
      g.fillStyle(0xffffff); g.fillRect(18, 39, 36, 24);         // white chest
      g.fillStyle(0xcc0000); g.fillRect(26, 39, 20, 24);         // tie/belt
      g.fillStyle(0xffcc00); g.fillRect(30, 42, 12, 12);         // maple leaf gold emblem
      g.fillStyle(0xff0000); g.fillRect(32, 44, 8, 8);           // leaf center
      g.fillStyle(0xcc3300); g.fillRect(4, 38, 12, 20);          // arm L
      g.fillRect(56, 38, 12, 20);                                // arm R
      g.fillStyle(0x880000); g.fillRect(2, 56, 16, 8);           // fist L
      g.fillRect(54, 56, 16, 8);                                 // fist R
      g.fillStyle(0x222233); g.fillRect(22, 64, 10, 16);         // leg L
      g.fillRect(40, 64, 10, 16);
      g.fillStyle(0x111122); g.fillRect(20, 74, 14, 6);
      g.fillRect(38, 74, 14, 6);
    });

    // Phase 2 overlay — gray damage reduction aura
    px(scene, 'zeus_phase2_overlay', 72, 80, (g) => {
      g.fillStyle(0x888888, 0.5); g.fillRect(0, 0, 72, 80);
      g.lineStyle(3, 0xaaaaaa); g.strokeRect(2, 2, 68, 76);
    });

    // Phase 3 minion indicator
    px(scene, 'zeus_crown', 24, 16, (g) => {
      g.fillStyle(0xffcc00);
      g.fillRect(0, 8, 24, 8);
      g.fillTriangle(0, 8, 4, 0, 8, 8);
      g.fillTriangle(8, 8, 12, 0, 16, 8);
      g.fillTriangle(16, 8, 20, 0, 24, 8);
    });
  },

  // ─── PROJECTILES ──────────────────────────────────────────────────────────
  projectiles(scene) {
    // Player bullet — glowing yellow orb 12×12
    px(scene, 'player_bullet', 12, 12, (g) => {
      g.fillStyle(0xffaa00); g.fillEllipse(6, 6, 12, 12);
      g.fillStyle(0xffffff); g.fillEllipse(4, 4, 5, 5);
    });

    // Enemy bullet — red orb 10×10
    px(scene, 'enemy_bullet', 10, 10, (g) => {
      g.fillStyle(0xff2200); g.fillEllipse(5, 5, 10, 10);
      g.fillStyle(0xff8866); g.fillEllipse(3, 3, 4, 4);
    });

    // Brainrot particle — toxic green swirl 14×14
    px(scene, 'brainrot_particle', 14, 14, (g) => {
      g.fillStyle(0x00ff66); g.fillEllipse(7, 7, 14, 14);
      g.fillStyle(0xccff00); g.fillEllipse(5, 5, 6, 6);
      g.fillStyle(0x003300); g.fillRect(5, 6, 4, 2); // swirl detail
      g.fillRect(6, 4, 2, 6);
    });

    // Boss phase 1 projectile — "brainrot is fentanyl" red orb 18×18
    px(scene, 'boss_bullet_p1', 18, 18, (g) => {
      g.fillStyle(0xdd0000); g.fillEllipse(9, 9, 18, 18);
      g.fillStyle(0xff6600); g.fillEllipse(7, 7, 8, 8);
      g.fillStyle(0xffff00); g.fillEllipse(5, 5, 4, 4);
    });

    // Boss phase 3 summon burst 20×20
    px(scene, 'boss_bullet_p3', 20, 20, (g) => {
      g.fillStyle(0xcc0000); g.fillEllipse(10, 10, 20, 20);
      g.fillStyle(0xffffff); g.fillEllipse(6, 6, 10, 10);
      g.fillStyle(0xcc0000); g.fillRect(6, 9, 8, 2);
      g.fillRect(9, 6, 2, 8);
    });

    // Melee hitbox visual flash 48×32
    px(scene, 'melee_flash', 48, 32, (g) => {
      g.fillStyle(0xffffff, 0.6); g.fillRect(0, 8, 48, 16);
      g.fillStyle(0xffdd00, 0.8); g.fillRect(4, 10, 40, 12);
    });
  },

  // ─── PICKUPS ──────────────────────────────────────────────────────────────
  pickups(scene) {
    // Health orb — red cross 20×20
    px(scene, 'pickup_health', 20, 20, (g) => {
      g.fillStyle(0x880000); g.fillRect(0, 0, 20, 20);
      g.fillStyle(0xff2222); g.fillRect(2, 2, 16, 16);
      g.fillStyle(0xffffff); g.fillRect(8, 4, 4, 12);  // cross vertical
      g.fillRect(4, 8, 12, 4);                         // cross horizontal
    });

    // Ammo — yellow bullet 18×18
    px(scene, 'pickup_ammo', 18, 18, (g) => {
      g.fillStyle(0x888800); g.fillRect(0, 0, 18, 18);
      g.fillStyle(0xffdd00); g.fillRect(2, 2, 14, 14);
      g.fillStyle(0xffaa00); g.fillRect(5, 3, 8, 8);  // bullet tip
      g.fillStyle(0x886600); g.fillRect(4, 11, 10, 5); // casing
    });

    // Sigma Mode speed boost — lightning bolt 20×20
    px(scene, 'pickup_speed', 20, 20, (g) => {
      g.fillStyle(0x444400); g.fillRect(0, 0, 20, 20);
      g.fillStyle(0xffff00); g.fillRect(2, 2, 16, 16);
      g.fillStyle(0xffffff);
      // Lightning bolt shape
      g.fillTriangle(12, 2, 6, 10, 10, 10);  // top bolt
      g.fillTriangle(10, 10, 14, 10, 8, 18); // bottom bolt
    });

    // Pookie Shield — blue shield 20×20
    px(scene, 'pickup_shield', 20, 20, (g) => {
      g.fillStyle(0x003388); g.fillRect(0, 0, 20, 20);
      g.fillStyle(0x0055cc); g.fillRect(2, 2, 16, 16);
      g.fillStyle(0x4499ff); g.fillRect(4, 3, 12, 10);   // shield top
      g.fillStyle(0x0055cc); g.fillTriangle(4, 13, 16, 13, 10, 17); // shield point
      g.fillStyle(0x88ccff); g.fillRect(7, 5, 2, 6);
    });
  },

  // ─── PLATFORMS ────────────────────────────────────────────────────────────
  platforms(scene) {
    // Greenpath platform tile 32×16
    px(scene, 'plat_greenpath', 32, 16, (g) => {
      g.fillStyle(0x5c3d1a); g.fillRect(0, 4, 32, 12);   // dirt
      g.fillStyle(0x2d8a2d); g.fillRect(0, 0, 32, 6);    // grass top
      g.fillStyle(0x40aa40); g.fillRect(0, 0, 32, 3);    // bright grass
      g.fillStyle(0x4a3020); g.fillRect(0, 8, 32, 2);    // dirt line
    });

    // Greenpath ground tile 32×32
    px(scene, 'ground_greenpath', 32, 32, (g) => {
      g.fillStyle(0x5c3d1a); g.fillRect(0, 4, 32, 28);
      g.fillStyle(0x2d8a2d); g.fillRect(0, 0, 32, 6);
      g.fillStyle(0x40aa40); g.fillRect(0, 0, 32, 3);
      g.fillStyle(0x4a3020); g.fillRect(0, 10, 32, 2);
      g.fillStyle(0x3d2810); g.fillRect(4, 16, 6, 8);
      g.fillRect(18, 20, 5, 6);
    });

    // Discord Void platform 32×16
    px(scene, 'plat_discordvoid', 32, 16, (g) => {
      g.fillStyle(0x1a0040); g.fillRect(0, 4, 32, 12);
      g.fillStyle(0x6600cc); g.fillRect(0, 0, 32, 5);
      g.fillStyle(0x9933ff); g.fillRect(0, 0, 32, 2);
      // glitch lines
      g.fillStyle(0x00ccff, 0.5); g.fillRect(4, 2, 8, 1);
      g.fillRect(18, 1, 6, 1);
    });

    // Cave platform 32×16
    px(scene, 'plat_cave', 32, 16, (g) => {
      g.fillStyle(0x3d2a1a); g.fillRect(0, 0, 32, 16);
      g.fillStyle(0x5a4030); g.fillRect(0, 0, 32, 5);
      g.fillStyle(0x2a1a0a); g.fillRect(2, 6, 4, 6);
      g.fillRect(14, 8, 5, 5);
      g.fillRect(24, 5, 4, 7);
    });

    // Canada platform (snow/ice) 32×16
    px(scene, 'plat_canada', 32, 16, (g) => {
      g.fillStyle(0x7ab8d0); g.fillRect(0, 5, 32, 11);   // ice
      g.fillStyle(0xffffff); g.fillRect(0, 0, 32, 6);    // snow top
      g.fillStyle(0xe0f0ff); g.fillRect(0, 0, 32, 3);    // bright snow
      g.fillStyle(0x99ccdd); g.fillRect(0, 8, 32, 2);    // ice line
    });
  },

  // ─── BACKGROUNDS ──────────────────────────────────────────────────────────
  backgrounds(scene) {
    // Greenpath sky bg 800×480
    px(scene, 'bg_greenpath', 800, 480, (g) => {
      // Sky gradient (simulated with bands)
      g.fillStyle(0x1a5c1a); g.fillRect(0, 0, 800, 160);
      g.fillStyle(0x1a4a1a); g.fillRect(0, 160, 800, 160);
      g.fillStyle(0x0d2b0d); g.fillRect(0, 320, 800, 160);
      // Trees silhouette
      g.fillStyle(0x0a200a);
      for (let x = 0; x < 800; x += 80) {
        g.fillTriangle(x + 40, 200, x + 10, 320, x + 70, 320);
        g.fillRect(x + 28, 320, 24, 40);
      }
    });

    // Discord Void bg 800×480
    px(scene, 'bg_discordvoid', 800, 480, (g) => {
      g.fillStyle(0x050010); g.fillRect(0, 0, 800, 480);
      g.fillStyle(0x0d0025); g.fillRect(0, 240, 800, 240);
      // "Stars" and glitch artifacts
      g.fillStyle(0x9933ff);
      for (let i = 0; i < 30; i++) {
        const x = (i * 127) % 800;
        const y = (i * 73) % 480;
        g.fillRect(x, y, 2, 2);
      }
      g.fillStyle(0x00ccff, 0.3);
      g.fillRect(0, 120, 800, 2);
      g.fillRect(0, 260, 800, 1);
      g.fillRect(0, 380, 800, 2);
    });

    // Cave bg 800×480
    px(scene, 'bg_cave', 800, 480, (g) => {
      g.fillStyle(0x080504); g.fillRect(0, 0, 800, 480);
      g.fillStyle(0x120a06); g.fillRect(0, 200, 800, 280);
      // Stalactites from top
      g.fillStyle(0x3d2a1a);
      for (let x = 0; x < 800; x += 64) {
        const h = 40 + (x % 80);
        g.fillTriangle(x + 8, 0, x + 56, 0, x + 32, h);
      }
      // Glow orbs
      g.fillStyle(0x220800, 0.5);
      g.fillEllipse(200, 300, 80, 80);
      g.fillEllipse(600, 200, 60, 60);
    });

    // Canada snow bg 800×480
    px(scene, 'bg_canada', 800, 480, (g) => {
      g.fillStyle(0xc8e8f8); g.fillRect(0, 0, 800, 480);
      g.fillStyle(0xa0cce0); g.fillRect(0, 280, 800, 200);
      // Mountains
      g.fillStyle(0x88aabb);
      g.fillTriangle(100, 280, 0, 480, 200, 480);
      g.fillTriangle(350, 200, 200, 480, 500, 480);
      g.fillTriangle(650, 240, 500, 480, 800, 480);
      // Snow caps
      g.fillStyle(0xffffff);
      g.fillTriangle(100, 280, 70, 340, 130, 340);
      g.fillTriangle(350, 200, 310, 270, 390, 270);
      g.fillTriangle(650, 240, 610, 300, 690, 300);
      // Snowflakes
      g.fillStyle(0xffffff);
      for (let i = 0; i < 40; i++) {
        const x = (i * 97) % 800;
        const y = (i * 61) % 280;
        g.fillRect(x, y, 3, 3);
      }
    });
  },

  // ─── UI ELEMENTS ──────────────────────────────────────────────────────────
  ui(scene) {
    // Health bar background 200×18
    px(scene, 'hud_healthbg', 202, 20, (g) => {
      g.fillStyle(0x220000); g.fillRect(0, 0, 202, 20);
      g.lineStyle(2, 0x880000); g.strokeRect(0, 0, 202, 20);
    });

    // Health bar fill 200×16
    px(scene, 'hud_healthfill', 200, 16, (g) => {
      g.fillStyle(0x22cc22); g.fillRect(0, 0, 200, 16);
      g.fillStyle(0x44ff44); g.fillRect(0, 0, 200, 6);
      g.fillStyle(0x118811); g.fillRect(0, 12, 200, 4);
    });

    // Life icon — heart 16×16
    px(scene, 'hud_life', 16, 16, (g) => {
      g.fillStyle(0xff2222);
      g.fillRect(1, 4, 6, 10);
      g.fillRect(9, 4, 6, 10);
      g.fillRect(4, 2, 8, 12);
      g.fillRect(1, 10, 14, 4);
      g.fillRect(4, 14, 8, 2);
    });

    // Door closed 64×80
    px(scene, 'door_closed', 64, 80, (g) => {
      g.fillStyle(0x442200); g.fillRect(0, 0, 64, 80);
      g.fillStyle(0x663300); g.fillRect(4, 4, 56, 72);
      g.fillStyle(0x442200); g.fillRect(10, 20, 18, 30); // panel L
      g.fillRect(36, 20, 18, 30);                        // panel R
      g.fillStyle(0xaa6600); g.fillRect(28, 38, 8, 8);   // handle
    });

    // Door open 64×80
    px(scene, 'door_open', 64, 80, (g) => {
      g.fillStyle(0x442200); g.fillRect(0, 0, 64, 80);
      g.fillStyle(0x000000); g.fillRect(8, 4, 48, 72);   // dark passage
      g.fillStyle(0xffaa00, 0.3); g.fillRect(8, 4, 48, 72); // glow
      g.lineStyle(2, 0x663300); g.strokeRect(0, 0, 64, 80);
    });

    // Zone clear banner 400×60
    px(scene, 'zone_clear_banner', 400, 60, (g) => {
      g.fillStyle(0x002200); g.fillRect(0, 0, 400, 60);
      g.lineStyle(3, 0x00ff00); g.strokeRect(2, 2, 396, 56);
    });
  },

  // ─── EFFECTS ──────────────────────────────────────────────────────────────
  effects(scene) {
    // Hit spark 16×16
    px(scene, 'hit_spark', 16, 16, (g) => {
      g.fillStyle(0xffffff); g.fillRect(6, 0, 4, 16);
      g.fillRect(0, 6, 16, 4);
      g.fillRect(2, 2, 4, 4);
      g.fillRect(10, 2, 4, 4);
      g.fillRect(2, 10, 4, 4);
      g.fillRect(10, 10, 4, 4);
    });

    // Death burst 24×24
    px(scene, 'death_burst', 24, 24, (g) => {
      g.fillStyle(0xff4400); g.fillEllipse(12, 12, 24, 24);
      g.fillStyle(0xffaa00); g.fillEllipse(12, 12, 16, 16);
      g.fillStyle(0xffffff); g.fillEllipse(12, 12, 8, 8);
    });

    // Sigma mode trail 8×8
    px(scene, 'sigma_trail', 8, 8, (g) => {
      g.fillStyle(0xffff00, 0.6); g.fillEllipse(4, 4, 8, 8);
    });

    // Shield hit ripple 32×32
    px(scene, 'shield_hit', 32, 32, (g) => {
      g.lineStyle(3, 0x00aaff);
      g.strokeEllipse(16, 16, 32, 32);
      g.lineStyle(2, 0x0066ff);
      g.strokeEllipse(16, 16, 22, 22);
    });

    // Teleport effect (discord ghoster) 32×32
    px(scene, 'teleport_fx', 32, 32, (g) => {
      g.fillStyle(0x6600aa, 0.4); g.fillEllipse(16, 16, 32, 32);
      g.lineStyle(2, 0x9933ff); g.strokeEllipse(16, 16, 32, 32);
      g.fillStyle(0xffffff, 0.6);
      g.fillRect(14, 0, 4, 32);
      g.fillRect(0, 14, 32, 4);
    });
  },
};
