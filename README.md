# BULLZULLY: The Pookie GiGma Chronicles

A MERN stack pixel art side-scrolling roguelike game.

## Prerequisites

- Node.js 18+
- MongoDB (local `mongodb://localhost:27017` or Atlas URI)

## Quick Start

### 1. Install Server

```bash
cd server
npm install
cp .env.example .env
# Edit .env to set your MONGODB_URI if needed
npm run dev
```

Server runs on http://localhost:3001

### 2. Install Client

```bash
cd client
npm install
npm run dev
```

Client runs on http://localhost:5173 — open this in your browser.

## Controls

| Key | Action |
|-----|--------|
| WASD / Arrow Keys | Move left/right |
| Z / Space / Up | Jump |
| X | Melee attack |
| C | Ranged attack |
| ESC | Save game |

## Architecture

```
bullzully/
├── server/                  # Express + MongoDB backend
│   ├── models/              # Mongoose schemas
│   ├── routes/              # REST endpoints
│   └── server.js
└── client/                  # React + Phaser.js frontend
    └── src/
        └── game/
            ├── scenes/      # Phaser scenes (Boot/Menu/Game/HUD/GameOver/Leaderboard)
            ├── entities/    # Player, enemies, bosses
            ├── zones/       # Zone configs (Greenpath, DiscordVoid, Dungeon, Canada)
            ├── systems/     # ProceduralGen
            └── utils/       # SpriteGenerator (all art is procedural — no image files)
```

## API Endpoints

| Method | URL | Description |
|--------|-----|-------------|
| POST | /api/game/save | Save current game state |
| GET | /api/game/load/:sessionId | Load saved game |
| POST | /api/scores | Submit high score |
| GET | /api/scores?limit=10 | Get leaderboard |

## Zones

1. **Greenpath of BULLZ** — Forest, Pookie Sigma enemies
2. **Discord Void** — Dark purple, Discord Ghosters teleport
3. **Magheiba Dungeon** — Cave, mid boss Magheiba Chaasi Chuuma
4. **Canada** — Snow, final boss Bully Maguire (Bulladi Chuttar Lamdiya) 3-phase fight

## Enemy Types

- **Pookie Sigma** — basic melee, chases player
- **Discord Ghoster** — floats, teleports when hit
- **Brainrot Spreader** — ranged, lobs toxic particles
- **Zullbully Knight** — armored (3 hits to break guard), charges

## Pickups

- ❤️ **Health** — restores 35 HP
- 🔵 **Ammo** — +8 ranged shots
- ⚡ **Sigma Mode** — speed boost for 6 seconds
- 🛡️ **Pookie Shield** — absorbs one hit
