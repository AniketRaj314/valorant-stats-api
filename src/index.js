require('dotenv').config();
const express = require('express');
const { version } = require('../package.json');

const valorantRouter = require('./routes/valorant');
const docsRouter = require('./routes/docs');
const { initAgentData } = require('./agentData');
const { initRankIcons } = require('./rankIcons');
const { initMapData } = require('./mapData');
const { log } = require('./logger');

const app = express();
const PORT = process.env.PORT || 3000;
const START_TIME = Date.now();

app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok', version, uptime: Math.floor((Date.now() - START_TIME) / 1000) });
});

// Auth middleware — only guards /valorant routes
const VALID_KEYS = new Set(
  (process.env.API_KEYS || '').split(',').map((k) => k.trim()).filter(Boolean)
);

app.use('/valorant', (req, res, next) => {
  if (VALID_KEYS.size === 0) return next(); // no keys configured → open (dev mode)
  const key = req.headers['x-api-key'];
  if (!key || !VALID_KEYS.has(key)) {
    return res.status(401).json({ error: 'Invalid or missing API key' });
  }
  next();
});

app.use('/valorant', valorantRouter);
app.use('/', docsRouter);

// 404 fallback
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

(async () => {
  log('INIT', 'Loading static data (agents, rank icons, maps)...');
  await Promise.all([initAgentData(), initRankIcons(), initMapData()]);
  log('INIT', 'Static data loaded');
  app.listen(PORT, () => {
    log('INIT', `Server listening on port ${PORT}`);
  });
})();
