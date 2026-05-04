/**
 * @fileoverview Mongoose model for leaderboard high-score entries.
 *
 * Unlike GameState (which is mutable and session-keyed), Score documents are
 * immutable records appended after each run ends. Multiple entries per player
 * are allowed — the leaderboard always sorts by score descending.
 *
 * @module models/Score
 */

const mongoose = require('mongoose');

/**
 * Schema for a single leaderboard entry submitted at the end of a run.
 *
 * Fields:
 *  - playerName      Display name entered on the game-over screen (max 20 chars).
 *  - score           Total score for the run.
 *  - zonesCompleted  How many zones the player cleared (0–4).
 *  - killedFinalBoss Whether the player defeated Bully Maguire in Canada.
 *  - createdAt       Timestamp of submission (auto-set; not updatable).
 */
const ScoreSchema = new mongoose.Schema({
  /** Trimmed to prevent leading/trailing whitespace in display; capped at 20. */
  playerName:      { type: String, required: true, trim: true, maxlength: 20 },

  /** Must be non-negative; the game never produces negative scores. */
  score:           { type: Number, required: true, min: 0 },

  /** Zones 1–4; used on the leaderboard to show depth of run. */
  zonesCompleted:  { type: Number, default: 0 },

  /** Unlocks a 'BOSS!' badge on the leaderboard row. */
  killedFinalBoss: { type: Boolean, default: false },

  /** Set once on insert; using Date.now (not Date.now()) so Mongoose calls it at insert time. */
  createdAt:       { type: Date, default: Date.now },
});

/**
 * Descending index on `score` so MongoDB can serve sorted leaderboard queries
 * efficiently without a full-collection sort.
 */
ScoreSchema.index({ score: -1 });

module.exports = mongoose.model('Score', ScoreSchema);
