const express = require('express');
const router = express.Router();
const Score = require('../models/Score');

// POST /api/scores — submit a score
router.post('/', async (req, res) => {
  try {
    const { playerName, score, zonesCompleted, killedFinalBoss } = req.body;
    if (!playerName || score === undefined)
      return res.status(400).json({ error: 'playerName and score required' });

    const entry = await Score.create({
      playerName: String(playerName).slice(0, 20),
      score,
      zonesCompleted: zonesCompleted || 0,
      killedFinalBoss: !!killedFinalBoss,
    });
    res.json({ success: true, entry });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/scores — top leaderboard
router.get('/', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 10, 50);
    const scores = await Score.find().sort({ score: -1 }).limit(limit).lean();
    res.json(scores);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
