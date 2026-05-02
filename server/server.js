require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();

app.use(cors({ origin: ['http://localhost:5173', 'http://localhost:3000'] }));
app.use(express.json());

const MONGO_URI = process.env.MONGODB_URI;
if (!MONGO_URI || MONGO_URI.includes('YOUR_USER')) {
  console.error('ERROR: Set your Atlas URI in server/.env before starting.');
  process.exit(1);
}

mongoose
  .connect(MONGO_URI)
  .then(() => console.log('MongoDB Atlas connected'))
  .catch((err) => { console.error('MongoDB error:', err.message); process.exit(1); });

app.use('/api/game', require('./routes/game'));
app.use('/api/scores', require('./routes/scores'));
app.get('/api/health', (_req, res) => res.json({ status: 'ok', game: 'BULLZULLY' }));

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`BULLZULLY server running on port ${PORT}`);
});
