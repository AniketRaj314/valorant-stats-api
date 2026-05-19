const { scrapeStats } = require('./scraper');
const { writeSnapshot, readSnapshot } = require('./snapshotStore');
const { log } = require('./logger');

async function refreshUserSnapshot(username) {
  log('REFRESH', `Starting snapshot refresh for ${username}`);

  const [
    competitiveRank,
    competitiveAgents,
    competitiveMaps,
    sharedPlaytime,
    unratedAgents,
    unratedMaps,
  ] = await Promise.all([
    scrapeStats(username, 'competitive', ['rank']),
    scrapeStats(username, 'competitive', ['agents']),
    scrapeStats(username, 'competitive', ['maps']),
    scrapeStats(username, 'competitive', ['totalPlaytime']),
    scrapeStats(username, 'unrated', ['agents']),
    scrapeStats(username, 'unrated', ['maps']),
  ]);

  const snapshot = {
    username,
    status: 'ok',
    lastRefreshedAt: new Date().toISOString(),
    data: {
      competitive: {
        rank: competitiveRank?.rank ?? null,
        agents: competitiveAgents?.agents ?? [],
        maps: competitiveMaps?.maps ?? [],
      },
      unrated: {
        agents: unratedAgents?.agents ?? [],
        maps: unratedMaps?.maps ?? [],
      },
      shared: {
        totalPlaytime: sharedPlaytime?.totalPlaytime ?? null,
      },
    },
  };

  writeSnapshot(username, snapshot);
  log('REFRESH', `Snapshot refresh complete for ${username}`);
  return snapshot;
}

async function refreshTrackedUsers(usernames, { continueOnError = true } = {}) {
  const results = [];

  for (const username of usernames) {
    try {
      const snapshot = await refreshUserSnapshot(username);
      results.push({ username, ok: true, snapshot });
    } catch (err) {
      log('ERROR', `Snapshot refresh failed for ${username}: ${err.message}`);

      const previous = readSnapshot(username);
      if (previous) {
        previous.status = 'stale';
        previous.lastRefreshError = err.message;
        previous.lastRefreshAttemptAt = new Date().toISOString();
        writeSnapshot(username, previous);
      }

      const result = { username, ok: false, error: err.message };
      results.push(result);
      if (!continueOnError) throw err;
    }
  }

  return results;
}

module.exports = { refreshUserSnapshot, refreshTrackedUsers };
