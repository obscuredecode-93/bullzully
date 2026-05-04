/**
 * @fileoverview Express application entry point for the BULLZULLY backend.
 *
 * Responsibilities:
 *  - Connects to MongoDB Atlas using the URI from the .env file
 *  - Mounts the /api/game and /api/scores route handlers
 *  - Provides a /api/health ping endpoint for uptime checks
 *
 * Environment variables (set in server/.env):
 *  - MONGODB_URI  MongoDB Atlas SRV connection string (required)
 *  - PORT         TCP port to listen on (default: 3001)
 *
 * @module server
 */

require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();

// =============================================================
// MIDDLEWARE
// =============================================================

/**
 * Allow requests from the Vite dev server (5173) and any CRA dev server (3000).
 * In production you would restrict this to your actual domain.
 */
app.use(cors({ origin: ['http://localhost:5173', 'http://localhost:3000'] }));

// Parse incoming JSON bodies so req.body is populated in route handlers.
app.use(express.json());

// =============================================================
// DATABASE CONNECTION
// =============================================================

const MONGO_URI = process.env.MONGODB_URI;

/**
 * Fail fast if the developer forgot to configure the Atlas URI.
 * The placeholder check prevents accidentally connecting to a malformed URI
 * and getting a cryptic DNS error instead of a clear message.
 */
if (!MONGO_URI || MONGO_URI.includes('YOUR_USER')) {
  console.error('ERROR: Set your Atlas URI in server/.env before starting.');
  process.exit(1);
}

mongoose
  .connect(MONGO_URI)
  .then(() => console.log('MongoDB Atlas connected'))
  // Exit the process on connection failure — the game server is useless without storage.
  .catch((err) => { console.error('MongoDB error:', err.message); process.exit(1); });

// =============================================================
// ROUTES
// =============================================================

/** Save/load game state endpoints (session-keyed, upserted per player). */
app.use('/api/game', require('./routes/game'));

/** High-score submission and leaderboard retrieval. */
app.use('/api/scores', require('./routes/scores'));

/**
 * Simple health-check endpoint.
 * Useful for confirming the server is reachable before the client attempts API calls.
 *
 * @route  GET /api/health
 * @returns {{ status: string, game: string }}
 */
app.get('/api/health', (_req, res) => res.json({ status: 'ok', game: 'BULLZULLY' }));

// =============================================================
// START
// =============================================================

/** Default to 3001 so it doesn't clash with the Vite dev server on 5173. */
const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`BULLZULLY server running on port ${PORT}`);
});
