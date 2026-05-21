'use strict';

const { TRACKED_USERNAMES, REFRESH_INTERVAL_HOURS, REFRESH_INTERVAL_MS } = require('./config');
const { readSnapshot } = require('./snapshotStore');
const { refreshTrackedUsers } = require('./refreshSnapshot');
const { formatDuration, log } = require('./logger');

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
    if (dueAt === 0) {
      log('DECISION', `${username} has no valid snapshot timestamp; refresh should run immediately`);
      return 0;
    }
    log('SCHEDULE', `${username} snapshot due at ${new Date(dueAt).toISOString()}`);
    if (dueAt < earliestDueAt) earliestDueAt = dueAt;
  }

  if (earliestDueAt === Infinity) return 0;
  return Math.max(0, earliestDueAt - now);
}

function startAutoRefreshScheduler({ usernames = TRACKED_USERNAMES } = {}) {
  let intervalId = null;
  let timeoutId = null;
  let refreshInFlight = false;

  if (usernames.length === 0) {
    log('WARN', 'Auto refresh scheduler enabled but no tracked users are configured');
  }

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
  if (initialDelay === 0) {
    log('DECISION', 'At least one snapshot is missing or stale; automatic refresh will run now');
  } else {
    log(
      'DECISION',
      `All snapshots are fresh; next automatic refresh runs in ${formatDuration(initialDelay)} at ${new Date(Date.now() + initialDelay).toISOString()}`
    );
  }
  log(
    'AUTOREFRESH',
    `Scheduler enabled | trackedUsers=${usernames.length} | intervalHours=${REFRESH_INTERVAL_HOURS} | firstRefreshIn=${formatDuration(initialDelay)}`
  );

  timeoutId = setTimeout(async () => {
    await runRefresh();
    log('SCHEDULE', `Recurring automatic refresh scheduled every ${REFRESH_INTERVAL_HOURS} hour(s)`);
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
