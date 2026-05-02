const mongoose = require('mongoose');

const GameStateSchema = new mongoose.Schema(
  {
    sessionId: { type: String, required: true, unique: true },
    playerName: { type: String, default: 'Pookie' },
    currentZone: { type: Number, default: 0 },
    currentRoom: { type: Number, default: 0 },
    lives: { type: Number, default: 3, min: 0, max: 3 },
    health: { type: Number, default: 100 },
    ammo: { type: Number, default: 10 },
    score: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('GameState', GameStateSchema);
