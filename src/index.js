require('dotenv').config();
const { ENABLE_AUTO_REFRESH, REFRESH_INTERVAL_HOURS, TRACKED_USERNAMES } = require('./config');
const { createApp } = require('./app');
const { initAgentData } = require('./agentData');
const { initRankIcons } = require('./rankIcons');
const { initMapData } = require('./mapData');
const { startAutoRefreshScheduler } = require('./autoRefresh');
const { log } = require('./logger');

const PORT = Number(process.env.PORT) || 3000;
const HOST = '0.0.0.0';

// Auth middleware — only guards stats routes
const VALID_KEYS = new Set(
  (process.env.API_KEYS || '').split(',').map((k) => k.trim()).filter(Boolean)
);
const app = createApp({ startTime: Date.now(), validKeys: [...VALID_KEYS] });

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
