/**
 * @fileoverview Mongoose model for persisting a player's mid-run game state.
 *
 * Each browser session gets a unique sessionId (generated client-side and stored
 * in localStorage). The server upserts a GameState document keyed on that ID,
 * so the same player can resume across browser tabs or after refreshing.
 *
 * @module models/GameState
 */

const mongoose = require('mongoose');

/**
 * Schema definition for a saved game state.
 *
 * Fields:
 *  - sessionId    Unique browser-session identifier — the primary lookup key.
 *  - playerName   Cosmetic display name; defaults to 'Pookie' if never set.
 *  - currentZone  Zone index (0 = Greenpath … 3 = Canada).
 *  - currentRoom  Room index within the current zone (0-based).
 *  - lives        Remaining lives (clamped 0–3 by Mongoose validators).
 *  - health       Current HP at the time of saving (0–100).
 *  - ammo         Ranged-attack ammo remaining.
 *  - score        Cumulative score at the time of saving.
 *
 * The `timestamps: true` option adds createdAt and updatedAt fields
 * automatically, which is useful for debugging stale saves.
 */
const GameStateSchema = new mongoose.Schema(
  {
    /** Browser-local UUID that ties the save to a specific tab/user. */
    sessionId:   { type: String, required: true, unique: true },

    /** Display name chosen on the game-over screen; not required mid-run. */
    playerName:  { type: String, default: 'Pookie' },

    /** 0 = Greenpath, 1 = Discord Void, 2 = Magheiba Dungeon, 3 = Canada. */
    currentZone: { type: Number, default: 0 },

    /** Index into the procedurally-generated room list for the current zone. */
    currentRoom: { type: Number, default: 0 },

    /** Validated 0–3; the game starts with 3 lives and never goes above that. */
    lives:       { type: Number, default: 3, min: 0, max: 3 },

    /** Player HP at save time; the game restores this on Continue. */
    health:      { type: Number, default: 100 },

    /** Ranged-attack ammo count at save time. */
    ammo:        { type: Number, default: 10 },

    /** Running score total accumulated across all zones. */
    score:       { type: Number, default: 0 },
  },
  /**
   * `timestamps: true` adds Mongoose-managed createdAt and updatedAt fields.
   * updatedAt tracks the most recent save, which helps spot stale entries.
   */
  { timestamps: true }
);

module.exports = mongoose.model('GameState', GameStateSchema);
