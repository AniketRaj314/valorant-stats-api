require('dotenv').config();

const { TRACKED_USERNAMES } = require('./config');
const { refreshTrackedUsers } = require('./refreshSnapshot');
const { initAgentData } = require('./agentData');
const { initMapData } = require('./mapData');
const { initRankIcons } = require('./rankIcons');
const { log } = require('./logger');

(async () => {
  log('INIT', 'Loading static data for snapshot refresh (agents, rank icons, maps)...');
  await Promise.all([initAgentData(), initRankIcons(), initMapData()]);
  log('INIT', 'Static data loaded for snapshot refresh');

  const results = await refreshTrackedUsers(TRACKED_USERNAMES, { continueOnError: true });
  const failed = results.filter((result) => !result.ok);
  if (failed.length > 0) {
    process.exitCode = 1;
  }
})();
