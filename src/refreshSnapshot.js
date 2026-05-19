const { scrapeStats } = require('./scraper');
const { writeSnapshot, readSnapshot } = require('./snapshotStore');
const { log } = require('./logger');

const REFRESH_STEPS = [
  { key: 'competitiveRank', playlist: 'competitive', modules: ['rank'] },
  { key: 'competitiveAgents', playlist: 'competitive', modules: ['agents'] },
  { key: 'competitiveMaps', playlist: 'competitive', modules: ['maps'] },
  { key: 'sharedPlaytime', playlist: 'competitive', modules: ['totalPlaytime'] },
  { key: 'unratedAgents', playlist: 'unrated', modules: ['agents'] },
  { key: 'unratedMaps', playlist: 'unrated', modules: ['maps'] },
];

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function refreshUserSnapshot(username) {
  log('REFRESH', `Starting snapshot refresh for ${username}`);
  const staggerMs = parseInt(process.env.REFRESH_STAGGER_MS || '5000', 10);
  const results = {};

  for (const [index, step] of REFRESH_STEPS.entries()) {
    if (index > 0 && staggerMs > 0) {
      log('REFRESH', `Waiting ${staggerMs}ms before ${step.modules.join(',')} (${step.playlist})`);
      await delay(staggerMs);
    }
    results[step.key] = await scrapeStats(username, step.playlist, step.modules);
  }

  const snapshot = {
    username,
    status: 'ok',
    lastRefreshedAt: new Date().toISOString(),
    data: {
      competitive: {
        rank: results.competitiveRank?.rank ?? null,
        agents: results.competitiveAgents?.agents ?? [],
        maps: results.competitiveMaps?.maps ?? [],
      },
      unrated: {
        agents: results.unratedAgents?.agents ?? [],
        maps: results.unratedMaps?.maps ?? [],
      },
      shared: {
        totalPlaytime: results.sharedPlaytime?.totalPlaytime ?? null,
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
