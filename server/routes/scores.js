/**
 * @fileoverview Express router for leaderboard score submission and retrieval.
 *
 * Scores are append-only — every completed run that reaches the game-over screen
 * can submit an entry. The leaderboard always returns the top N scores sorted
 * by total score descending.
 *
 * Mounted at: /api/scores
 *
 * @module routes/scores
 */

const express = require('express');
const router  = express.Router();
const Score   = require('../models/Score');

// ============================================================
// SUBMIT  —  POST /api/scores
// ============================================================

/**
 * Record a completed run's score on the leaderboard.
 *
 * Called from GameOverScene after the player enters their name.
 * Duplicate entries are allowed — the same player can appear multiple
 * times if they beat their own score.
 *
 * @route  POST /api/scores
 * @param  {Object}  req.body
 * @param  {string}  req.body.playerName      Display name (will be sliced to 20 chars server-side).
 * @param  {number}  req.body.score           Total score for the run.
 * @param  {number}  [req.body.zonesCompleted] Number of zones cleared.
 * @param  {boolean} [req.body.killedFinalBoss] Whether Bully Maguire was defeated.
 * @returns {{ success: boolean, entry: Score }}
 */
router.post('/', async (req, res) => {
  try {
    const { playerName, score, zonesCompleted, killedFinalBoss } = req.body;

    // Both fields are required to produce a meaningful leaderboard row.
    if (!playerName || score === undefined)
      return res.status(400).json({ error: 'playerName and score required' });

    const entry = await Score.create({
      // Slice server-side as a second layer of defence even if the client slices too.
      playerName:      String(playerName).slice(0, 20),
      score,
      zonesCompleted:  zonesCompleted  || 0,
      // !! coerces truthy/falsy values to a proper boolean for the schema.
      killedFinalBoss: !!killedFinalBoss,
    });
    res.json({ success: true, entry });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// LEADERBOARD  —  GET /api/scores
// ============================================================

/**
 * Return the top-N scores sorted by score descending.
 *
 * @route  GET /api/scores
 * @param  {string} [req.query.limit]  How many entries to return (default 10, max 50).
 * @returns {Score[]}  Array of Score documents ordered by score descending.
 */
router.get('/', async (req, res) => {
  try {
    // Cap at 50 to prevent accidentally dumping the entire collection.
    const limit = Math.min(parseInt(req.query.limit) || 10, 50);

    /**
     * .lean() returns plain JS objects instead of full Mongoose documents,
     * which is faster for read-only endpoints that don't need save/validate methods.
     */
    const scores = await Score.find().sort({ score: -1 }).limit(limit).lean();
    res.json(scores);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
