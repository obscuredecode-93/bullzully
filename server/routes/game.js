const express = require('express');
const router = express.Router();
const GameState = require('../models/GameState');

// POST /api/game/save
router.post('/save', async (req, res) => {
  try {
    const { sessionId, ...data } = req.body;
    if (!sessionId) return res.status(400).json({ error: 'sessionId required' });

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

// GET /api/game/load/:sessionId
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
