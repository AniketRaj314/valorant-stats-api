require('dotenv').config();

const { REFRESH_INTERVAL_HOURS, TRACKED_USERNAMES } = require('./config');
const { refreshTrackedUsers } = require('./refreshSnapshot');
const { initAgentData } = require('./agentData');
const { initMapData } = require('./mapData');
const { initRankIcons } = require('./rankIcons');
const { log } = require('./logger');

(async () => {
  log(
    'CONFIG',
    `Manual refresh run starting | trackedUsers=${TRACKED_USERNAMES.length} | refreshIntervalHours=${REFRESH_INTERVAL_HOURS}`
  );
  if (TRACKED_USERNAMES.length === 0) {
    log('WARN', 'No tracked users configured; skipping refresh run');
    return;
  }
  log('INIT', 'Loading static data for snapshot refresh (agents, rank icons, maps)...');
  await Promise.all([initAgentData(), initRankIcons(), initMapData()]);
  log('INIT', 'Static data loaded for snapshot refresh');

  const results = await refreshTrackedUsers(TRACKED_USERNAMES, { continueOnError: true });
  const failed = results.filter((result) => !result.ok);
  log('REFRESH', `Manual refresh run finished | ok=${results.length - failed.length} | failed=${failed.length}`);
  if (failed.length > 0) {
    process.exitCode = 1;
  }
})();
