require('dotenv').config();

const { TRACKED_USERNAMES } = require('./config');
const { refreshTrackedUsers } = require('./refreshSnapshot');

(async () => {
  const results = await refreshTrackedUsers(TRACKED_USERNAMES, { continueOnError: true });
  const failed = results.filter((result) => !result.ok);
  if (failed.length > 0) {
    process.exitCode = 1;
  }
})();
