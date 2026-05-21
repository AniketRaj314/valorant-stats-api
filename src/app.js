const express = require('express');
const { version } = require('../package.json');

const valorantRouter = require('./routes/valorant');
const docsRouter = require('./routes/docs');

function createApp({ startTime = Date.now(), validKeys = [] } = {}) {
  const app = express();
  const VALID_KEYS = new Set(validKeys.map((key) => key.trim()).filter(Boolean));

  app.use(express.json());

  app.get('/valorant/health', (req, res) => {
    res.json({ status: 'ok', version, uptime: Math.floor((Date.now() - startTime) / 1000) });
  });

  // Auth middleware — only guards stats routes
  app.use('/valorant/stats', (req, res, next) => {
    const key = req.headers['x-api-key'];
    if (!key || !VALID_KEYS.has(key)) {
      return res.status(401).json({ error: 'Invalid or missing API key' });
    }
    next();
  });

  app.use('/valorant', valorantRouter);
  app.use('/valorant', docsRouter);

  app.use((req, res) => {
    res.status(404).json({ error: 'Not found' });
  });

  return app;
}

module.exports = { createApp };
