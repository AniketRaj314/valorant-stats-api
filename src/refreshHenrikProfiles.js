require('dotenv').config();

const { TRACKED_USERNAMES } = require('./config');
const { fetchHenrikProfile } = require('./henrikProfile');
const { initPlayerCardData } = require('./playerCardData');
const { initPlayerTitleData } = require('./playerTitleData');
const { mergeSnapshotData } = require('./snapshotStore');
const { log } = require('./logger');

async function refreshUserHenrikProfile(username) {
  log('PROFILE', `Starting Henrik profile refresh for ${username}`);
  const profile = await fetchHenrikProfile(username);
  const refreshedAt = new Date().toISOString();

  const snapshot = mergeSnapshotData(username, (previous) => ({
    username,
    status: previous.status ?? 'ok',
    lastRefreshedAt: previous.lastRefreshedAt ?? refreshedAt,
    sources: {
      ...(previous.sources ?? {}),
      henrik: {
        status: 'ok',
        lastRefreshedAt: refreshedAt,
      },
    },
    data: {
      ...(previous.data ?? {}),
      profile,
    },
  }));

  log('PROFILE', `Henrik profile refresh complete for ${username}`);
  return snapshot;
}

async function refreshHenrikProfiles(usernames, { continueOnError = true } = {}) {
  log('PROFILE', `Refreshing Henrik profiles for ${usernames.length} tracked user(s) | continueOnError=${continueOnError}`);
  const results = [];

  for (const username of usernames) {
    try {
      const snapshot = await refreshUserHenrikProfile(username);
      results.push({ username, ok: true, snapshot });
    } catch (err) {
      log('ERROR', `Henrik profile refresh failed for ${username}: ${err.message}`);
      results.push({ username, ok: false, error: err.message });
      if (!continueOnError) throw err;
    }
  }

  return results;
}

async function main() {
  log('PROFILE', `Manual Henrik profile refresh starting | trackedUsers=${TRACKED_USERNAMES.length}`);
  if (TRACKED_USERNAMES.length === 0) {
    log('WARN', 'No tracked users configured; skipping Henrik profile refresh');
    return;
  }

  log('INIT', 'Loading static data for Henrik profile refresh (player cards, player titles)...');
  await Promise.all([initPlayerCardData(), initPlayerTitleData()]);
  log('INIT', 'Static profile data loaded');
  await refreshHenrikProfiles(TRACKED_USERNAMES);
}

if (require.main === module) {
  main().catch((err) => {
    log('ERROR', err.stack || err.message);
    process.exitCode = 1;
  });
}

module.exports = { refreshHenrikProfiles, refreshUserHenrikProfile };
