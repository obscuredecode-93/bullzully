/**
 * @fileoverview Express router for game-state persistence endpoints.
 *
 * These routes let the client save mid-run progress and restore it on Continue.
 * All state is keyed on `sessionId` — a UUID generated in the browser and stored
 * in localStorage. The server never creates session IDs; it only stores them.
 *
 * Mounted at: /api/game
 *
 * @module routes/game
 */

const express = require('express');
const router  = express.Router();
const GameState = require('../models/GameState');

// ============================================================
// SAVE  —  POST /api/game/save
// ============================================================

/**
 * Upsert the player's game state into MongoDB.
 *
 * The client calls this when:
 *  - A room is cleared
 *  - A zone transition begins
 *  - The player presses P (quick-save)
 *  - The player exits to menu via the Pause screen
 *
 * @route  POST /api/game/save
 * @param  {Object} req.body              Full game-state payload.
 * @param  {string} req.body.sessionId    Required — uniquely identifies the save slot.
 * @param  {number} [req.body.currentZone]
 * @param  {number} [req.body.currentRoom]
 * @param  {number} [req.body.lives]
 * @param  {number} [req.body.health]
 * @param  {number} [req.body.ammo]
 * @param  {number} [req.body.score]
 * @returns {{ success: boolean, state: GameState }}
 */
router.post('/save', async (req, res) => {
  try {
    const { sessionId, ...data } = req.body;

    // Reject requests without a session identifier — we have no way to key the upsert.
    if (!sessionId) return res.status(400).json({ error: 'sessionId required' });

    /**
     * findOneAndUpdate with `upsert: true` creates the document on first save
     * and updates it on subsequent saves — one call covers both cases.
     * `new: true` returns the updated document so the client can confirm what was saved.
     * `runValidators: true` ensures the schema constraints (e.g., lives 0–3) are enforced on update.
     */
    const state = await GameState.findOneAndUpdate(
      { sessionId },
      { ...data },
      { upsert: true, new: true, runValidators: true }
    );
    res.json({ success: true, state });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// LOAD  —  GET /api/game/load/:sessionId
// ============================================================

/**
 * Retrieve a previously saved game state by sessionId.
 *
 * Called by the MenuScene when the player clicks Continue.
 * Returns 404 if no save exists for the session, which the client
 * treats as "start fresh from zone 0".
 *
 * @route  GET /api/game/load/:sessionId
 * @param  {string} req.params.sessionId  The browser-local session UUID.
 * @returns {GameState|{ error: string }}
 */
router.get('/load/:sessionId', async (req, res) => {
  try {
    const state = await GameState.findOne({ sessionId: req.params.sessionId });
    if (!state) return res.status(404).json({ error: 'No save found' });
    res.json(state);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
