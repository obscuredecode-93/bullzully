const mongoose = require('mongoose');

const ScoreSchema = new mongoose.Schema({
  playerName: { type: String, required: true, trim: true, maxlength: 20 },
  score: { type: Number, required: true, min: 0 },
  zonesCompleted: { type: Number, default: 0 },
  killedFinalBoss: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

ScoreSchema.index({ score: -1 });

module.exports = mongoose.model('Score', ScoreSchema);
