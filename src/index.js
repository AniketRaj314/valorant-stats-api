require('dotenv').config();
const express = require('express');
const { version } = require('../package.json');

const valorantRouter = require('./routes/valorant');
const docsRouter = require('./routes/docs');
const { ENABLE_AUTO_REFRESH, REFRESH_INTERVAL_HOURS, TRACKED_USERNAMES } = require('./config');
const { initAgentData } = require('./agentData');
const { initRankIcons } = require('./rankIcons');
const { initMapData } = require('./mapData');
const { startAutoRefreshScheduler } = require('./autoRefresh');
const { log } = require('./logger');

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const HOST = '0.0.0.0';
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
  log(
    'CONFIG',
    `Boot config | trackedUsers=${TRACKED_USERNAMES.length} | autoRefresh=${ENABLE_AUTO_REFRESH} | refreshIntervalHours=${REFRESH_INTERVAL_HOURS}`
  );
  if (VALID_KEYS.size === 0) {
    throw new Error('API_KEYS must be configured before starting the server');
  }
  if (TRACKED_USERNAMES.length === 0) {
    log('WARN', 'No tracked users configured; API will return 404 for all usernames until TRACKED_USERNAMES is set');
  } else {
    log('CONFIG', `Tracked usernames: ${TRACKED_USERNAMES.join(', ')}`);
  }
  log('INIT', 'Loading static data (agents, rank icons, maps)...');
  await Promise.all([initAgentData(), initRankIcons(), initMapData()]);
  log('INIT', 'Static data loaded');
  if (ENABLE_AUTO_REFRESH) {
    log('DECISION', 'Auto refresh is enabled; starting in-process scheduler');
    startAutoRefreshScheduler();
  } else {
    log('DECISION', 'Auto refresh is disabled; background scheduler will not start');
    log('AUTOREFRESH', 'Automatic refresh scheduler disabled');
  }
  app.listen(PORT, HOST, () => {
    log('INIT', `Server listening on ${HOST}:${PORT}`);
  });
})().catch((error) => {
  log('ERROR', `Fatal startup error: ${error.stack || error.message}`);
  process.exit(1);
});
