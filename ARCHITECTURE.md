# BULLZULLY — Architecture Reference

## Overview

BULLZULLY is a MERN-stack pixel-art side-scrolling roguelike.  
The client is a **React + Phaser 3** single-page application; the server is an **Express + MongoDB** REST API.

---

## Directory Structure

```
bullzully/
├── client/                        # Vite + React frontend
│   └── src/
│       ├── App.jsx                # React root; mounts Phaser canvas into #game-container
│       ├── main.jsx               # ReactDOM.createRoot entry point
│       └── game/
│           ├── config.js          # All shared constants (dimensions, speeds, damage)
│           ├── entities/
│           │   ├── Player.js      # Player sprite + input + BULLZ system
│           │   ├── enemies/
│           │   │   ├── PookieSigma.js       # Basic melee grunt
│           │   │   ├── DiscordGhoster.js    # Teleporting ghost (no gravity)
│           │   │   ├── BrainrotSpreader.js  # Kiting ranged enemy
│           │   │   └── ZullbullyKnight.js   # Armoured tank with charge
│           │   └── bosses/
│           │       ├── MagheibaChaasi.js    # Zone 2 mid-boss (3 phases)
│           │       └── ZeusTata.js          # Zone 3 final boss (exports BullyMaguire)
│           ├── scenes/
│           │   ├── BootScene.js        # Generates textures, title splash → MenuScene
│           │   ├── MenuScene.js        # Title screen: Play / Continue / Leaderboard
│           │   ├── GameScene.js        # Main gameplay orchestrator
│           │   ├── HUDScene.js         # Parallel HUD overlay (health, lives, BULLZ bar)
│           │   ├── PauseScene.js       # Overlay pause menu (Resume / Help / Exit)
│           │   ├── GameOverScene.js    # Win/lose screen with score submission
│           │   └── LeaderboardScene.js # Top-10 score table fetched from server
│           ├── systems/
│           │   └── ProceduralGen.js    # Seeded LCG RNG + Fisher-Yates room generator
│           ├── utils/
│           │   ├── SpriteGenerator.js  # Programmatic texture factory (no image files)
│           │   └── combatFX.js         # Shared hit effects (flashWhite, showDamageNumber, shakeOnDeath)
│           └── zones/
│               ├── Greenpath.js        # Zone 0: forest, PookieSigma-heavy, 6 rooms
│               ├── DiscordVoid.js      # Zone 1: dark void, DiscordGhoster-heavy, 7 rooms
│               ├── MagheibaDungeon.js  # Zone 2: cave, BrainrotSpreader-heavy, 5+boss rooms
│               └── Canada.js           # Zone 3: snow, all enemies, 6+boss rooms
└── server/
    ├── server.js              # Express entry point; validates Atlas URI, mounts routes
    ├── models/
    │   ├── GameState.js       # Mongoose schema: one document per sessionId (upserted)
    │   └── Score.js           # Append-only leaderboard entries; descending index on score
    └── routes/
        ├── game.js            # POST /api/game/save, GET /api/game/load/:sessionId
        └── scores.js          # POST /api/scores, GET /api/scores?limit=N
```

---

## Scene Lifecycle

```
BootScene (create textures)
    └── MenuScene (title screen)
            ├── PLAY    → GameScene + HUDScene (launched in parallel)
            ├── CONTINUE → fetch /api/game/load → GameScene + HUDScene
            └── LEADERBOARD → LeaderboardScene

GameScene ──── HUDScene (parallel, event-driven updates)
    │
    ├── ESC / pause button → PauseScene (overlay)
    │       ├── RESUME → resume GameScene, stop PauseScene
    │       ├── HELP   → help sub-panel
    │       └── EXIT   → save → stop HUDScene + GameScene → MenuScene
    │
    ├── all lives lost   → GameOverScene (defeat)
    └── final boss killed → GameOverScene (victory)

GameOverScene
    ├── SUBMIT → POST /api/scores → LeaderboardScene
    ├── PLAY AGAIN → MenuScene
    └── LEADERBOARD → LeaderboardScene
```

**Key rule:** `scene.launch()` runs a scene in parallel. `scene.start()` replaces the current scene. `scene.pause()` + `scene.resume()` freeze/unfreeze update loops without stopping the scene.

---

## Physics Architecture

Phaser 3 Arcade Physics is used throughout (lightest engine; adequate for a side-scroller).

### Physics groups

| Group | Type | Purpose |
|---|---|---|
| `platformGroup` | `staticGroup` | Floor and platform tiles |
| `enemies` | `physics.add.group()` | All live enemy sprites |
| `pickups` | `staticGroup` | Health/ammo/speed/shield pickups |
| `playerProjectiles` | `physics.add.group()` | Player bullet pool |
| `enemyProjectiles` | `physics.add.group()` | Enemy bullet pool |

**Critical:** `enemies` must be `physics.add.group()` (not `add.group()`). Plain `GameObjects.Group` lacks the `isParent` flag required by the arcade overlap system — all overlap callbacks will silently never fire if the wrong constructor is used.

### Permanent colliders (registered once, survive room transitions)

```
player       ↔  platformGroup       — player lands on floor
meleeHitbox  ↔  enemies             — melee swing hits enemies
playerProjectiles ↔ enemies         — bullets hit enemies
playerProjectiles ↔ platformGroup   — bullets destroyed on terrain
player       ↔  enemyProjectiles    — enemy shots hit player
player       ↔  pickups             — player collects items
player       ↔  enemies             — contact damage
enemies      ↔  platformGroup       — enemies land on floor
```

### Per-boss colliders (lifecycle: added on spawn, removed on room clear)

Because bosses are singleton sprites (not group members), they cannot share the permanent group-level colliders. The `_addBossColliders(boss)` / `_removeBossColliders()` pattern adds melee, bullet, and platform colliders for the specific boss instance and stores references so they can be removed cleanly.

---

## Procedural Generation

### Algorithm (`ProceduralGen.js`)

1. **Seed**: `Date.now() XOR (zoneIndex * 0x9e3779b9)` — same zone always produces the same layout within a session.
2. **RNG**: Glibc LCG — `state = (state * 1664525 + 1013904223) & 0xffffffff` — reproducible, fast, no dependencies.
3. **Room selection**: Zone config provides a pool of templates. Templates are split into `bossTemplates` and `normalTemplates`. Boss template is placed last. Normal rooms are chosen by modulo cycling through a Fisher-Yates shuffle of the templates.
4. **Enemy placement**: Each room draws from a weighted enemy type list. Positions are jittered by ±N px from a base grid.
5. **Pickup placement**: Each room gets 0–3 pickups drawn from a weighted type list.

### Zone config shape

```js
{
  name: 'Greenpath',
  bgTileKey: 'bg_greenpath',
  roomCount: 6,
  enemyTypes: [{ type: 'PookieSigma', weight: 3 }, ...],
  pickupTypes: [{ type: 'health', weight: 2 }, ...],
  templates: [
    { platforms: [...], isBossRoom: false },
    ...
  ],
}
```

---

## BULLZ Special Attack

The BULLZ system involves three layers:

1. **Player** (`Player.js`): owns `bullzCooldown`, `bullzActive`, `bullzMultiplier`. Activating BULLZ sets `bullzMultiplier = 3` for 2 seconds, then resets to 1.
2. **GameScene** (`GameScene.js`): all damage collider callbacks read `this.player?.bullzMultiplier ?? 1` and multiply outgoing damage by it. No conditional branching needed — multiplier of 1 is a no-op.
3. **HUDScene** (`HUDScene.js`): polls `player.bullzCooldown` each frame (not event-driven, to avoid 60 events/second). Draws a fill bar and fires a one-shot "BULLZ READY!" flash when the cooldown completes.

---

## Event System

GameScene is the event hub. All cross-entity communication flows through `this.events` (the scene emitter):

| Event | Emitter | Listener |
|---|---|---|
| `health-changed` | Player | HUDScene |
| `lives-changed` | Player | HUDScene |
| `ammo-changed` | Player | HUDScene |
| `score-changed` | Player / GameScene | HUDScene |
| `zone-changed` | GameScene | HUDScene |
| `enemy-killed` | Enemy (on die) | GameScene |
| `boss-killed` | Boss (on die) | GameScene |
| `player-respawn` | Player (on _die) | GameScene |
| `game-over` | Player (on _die) | GameScene |
| `bullz-activated` | Player | HUDScene |
| `pause-requested` | HUDScene pause button | GameScene |

This keeps entities decoupled — enemies don't need a reference to the HUD; HUDScene doesn't need a reference to Player (except for the per-frame BULLZ poll).

---

## Session Persistence

- **Session ID**: UUID stored in `localStorage` under `'bullzully_session'`. Generated on first visit: `sess_<timestamp>_<6-char-random>`.
- **Save payload**: `{ sessionId, currentZone, currentRoom, lives, health, ammo, score }`.
- **Save triggers**: room clear, zone transition, game-over, pause → exit.
- **Endpoint**: `POST /api/game/save` — MongoDB upsert via `findOneAndUpdate({ upsert: true })`.
- **Load**: `GET /api/game/load/:sessionId` — data passed directly to `GameScene` init.
- **Offline graceful degradation**: all save/load calls are wrapped in try/catch; failure is silent and the game continues.

---

## Sprite Generation

All textures are created at startup in `BootScene` by calling `SpriteGenerator.createAll(scene)`. Each texture is:

1. Drawn into a temporary `Phaser.GameObjects.Graphics` object (off-screen, `add: false`).
2. Baked into a texture cache entry via `g.generateTexture(key, w, h)`.
3. The Graphics object is destroyed immediately after.

The resulting textures are indistinguishable from loaded PNGs — they're used identically via `'textureKey'` strings in `add.image`, `add.sprite`, etc.

---

## Combat FX Utilities (`combatFX.js`)

Three shared functions imported by all six enemy/boss files:

| Function | Effect |
|---|---|
| `flashWhite(scene, sprite)` | Tints sprite `0xffffff` for 100ms, then clears |
| `showDamageNumber(scene, x, y, damage)` | Floats a red damage number upward, fades over 700ms |
| `shakeOnDeath(scene)` | `cameras.main.shake(200, 0.015)` |

These avoid duplication and ensure consistent hit feedback across all enemy types.

---

## Key Configuration Constants (`config.js`)

| Constant | Value | Purpose |
|---|---|---|
| `GAME_WIDTH` | 800 | Logical canvas width |
| `GAME_HEIGHT` | 480 | Logical canvas height |
| `ROOM_WIDTH` | 1920 | Scrollable room width |
| `ROOM_HEIGHT` | 480 | Room height (matches canvas) |
| `TILE_SIZE` | 32 | Platform tile unit |
| `GRAVITY` | 700 | World gravity (px/s²) |
| `PLAYER_SPEED` | 180 | Base horizontal speed (px/s) |
| `JUMP_VELOCITY` | -430 | Initial Y velocity on jump |
| `MELEE_DAMAGE` | 25 | Base player melee hit |
| `RANGED_DAMAGE` | 30 | Base player bullet hit |
| `PROJECTILE_SPEED` | 420 | Player bullet speed (px/s) |
| `MELEE_DURATION_MS` | 220 | Hitbox active window |
| `BULLZ_COOLDOWN_MS` | 8000 | BULLZ recharge time |
| `PLAYER_MAX_HEALTH` | 100 | Full HP value |
| `PLAYER_MAX_LIVES` | 3 | Starting lives |
| `PLAYER_MAX_AMMO` | 15 | Maximum ammo |

---

## Known Design Decisions & Gotchas

- **`physics.add.group()` vs `add.group()`**: Only physics groups have the `isParent` flag required for arcade overlap callbacks. Using `add.group()` for enemies silently disables all hit detection.

- **Boss fake-group crash**: Passing `{ getChildren: () => [boss] }` to `physics.add.overlap` throws a `TypeError` inside Phaser's world step because it expects a real `Group` or `Sprite`. Use `_addBossColliders(boss)` with real sprite references instead.

- **`setScrollFactor(0)` coordinate space**: Objects with `scrollFactor(0)` exist in screen-space. Their position must be set using camera pixel coordinates (`cameras.main.width / 2`), not world coordinates (`scrollX + width/2`). Using world coordinates causes elements to render far off-screen during camera scrolling.

- **`cameras.main.setWorldBounds` doesn't exist in Phaser 3**: Use `cameras.main.setBounds(x, y, w, h)` instead.

- **`dom: { createContainer: true }` required**: `this.add.dom()` in GameOverScene requires this flag in the Phaser game config. Without it, Phaser cannot append the DOM input element to the canvas container.

- **Async `create()` in LeaderboardScene**: Phaser 3 supports async `create()` — the scene activates immediately and the fetch runs in the background. The loading text is visible while scores are fetched.

- **HUDScene polling vs events for BULLZ**: The BULLZ cooldown ticks every frame — emitting an event at 60fps would flood the emitter. The HUD polls `player.bullzCooldown` directly in `update()` instead.
