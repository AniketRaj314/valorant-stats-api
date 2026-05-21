'use strict';

const { TRACKED_USERNAMES, REFRESH_INTERVAL_MS } = require('./config');
const { readSnapshot } = require('./snapshotStore');
const { refreshTrackedUsers } = require('./refreshSnapshot');
const { log } = require('./logger');

function computeSnapshotDueAt(snapshot) {
  if (!snapshot?.lastRefreshedAt) return 0;
  const refreshedMs = Date.parse(snapshot.lastRefreshedAt);
  if (Number.isNaN(refreshedMs)) return 0;
  return refreshedMs + REFRESH_INTERVAL_MS;
}

function computeNextAutoRefreshDelay(usernames = TRACKED_USERNAMES, now = Date.now()) {
  let earliestDueAt = Infinity;

  for (const username of usernames) {
    const snapshot = readSnapshot(username);
    const dueAt = computeSnapshotDueAt(snapshot);
    if (dueAt === 0) return 0;
    if (dueAt < earliestDueAt) earliestDueAt = dueAt;
  }

  if (earliestDueAt === Infinity) return 0;
  return Math.max(0, earliestDueAt - now);
}

function startAutoRefreshScheduler({ usernames = TRACKED_USERNAMES } = {}) {
  let intervalId = null;
  let timeoutId = null;
  let refreshInFlight = false;

  const runRefresh = async () => {
    if (refreshInFlight) {
      log('AUTOREFRESH', 'Skipping refresh because a previous refresh is still running');
      return;
    }

    refreshInFlight = true;
    try {
      log('AUTOREFRESH', `Starting automatic refresh for ${usernames.join(', ')}`);
      const results = await refreshTrackedUsers(usernames, { continueOnError: true });
      const failed = results.filter((result) => !result.ok);
      if (failed.length > 0) {
        log('AUTOREFRESH', `Automatic refresh completed with ${failed.length} failure(s)`);
      } else {
        log('AUTOREFRESH', 'Automatic refresh completed successfully');
      }
    } catch (err) {
      log('ERROR', `Automatic refresh failed: ${err.message}`);
    } finally {
      refreshInFlight = false;
    }
  };

  const initialDelay = computeNextAutoRefreshDelay(usernames);
  log('AUTOREFRESH', `Scheduler enabled; first refresh in ${Math.round(initialDelay / 1000)}s`);

  timeoutId = setTimeout(async () => {
    await runRefresh();
    intervalId = setInterval(runRefresh, REFRESH_INTERVAL_MS);
  }, initialDelay);

  return {
    stop() {
      if (timeoutId) clearTimeout(timeoutId);
      if (intervalId) clearInterval(intervalId);
    },
  };
}

module.exports = {
  computeNextAutoRefreshDelay,
  computeSnapshotDueAt,
  startAutoRefreshScheduler,
};
