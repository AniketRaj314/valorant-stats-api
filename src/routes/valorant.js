const express = require('express');
const { scrapeStats, MODULE_DEFINITIONS } = require('../scraper');
const { readModuleCache, writeModuleCache, isFresh } = require('../cache');
const { log } = require('../logger');

const router = express.Router();

function applyModuleLimits(data, modulesBody) {
  const result = { ...data };
  for (const [mod, config] of Object.entries(modulesBody)) {
    if (config.limit && Array.isArray(result[mod])) {
      result[mod] = result[mod].slice(0, config.limit);
    }
  }
  return result;
}

const VALID_PLAYLISTS = new Set(['competitive', 'unrated']);
const VALID_MODULES = new Set(Object.keys(MODULE_DEFINITIONS));

router.post('/stats/:username', async (req, res) => {
  const username = decodeURIComponent(req.params.username);
  const { playlist: topPlaylist = 'competitive', modules: modulesBody } = req.body ?? {};

  // Validate modules
  if (!modulesBody || typeof modulesBody !== 'object' || Array.isArray(modulesBody)) {
    return res.status(400).json({ error: 'modules is required and must be an object' });
  }

  // Validate top-level playlist
  if (!VALID_PLAYLISTS.has(topPlaylist)) {
    return res.status(400).json({
      error: `Invalid playlist "${topPlaylist}". Must be one of: ${[...VALID_PLAYLISTS].join(', ')}`,
    });
  }

  // Validate module names
  const requestedModules = Object.keys(modulesBody);
  const invalidModules = requestedModules.filter((m) => !VALID_MODULES.has(m));
  if (invalidModules.length > 0) {
    return res.status(400).json({
      error: `Invalid module(s): ${invalidModules.join(', ')}. Valid modules: ${[...VALID_MODULES].join(', ')}`,
    });
  }

  // Validate per-module config
  for (const [mod, config] of Object.entries(modulesBody)) {
    if (config.playlist !== undefined && !VALID_PLAYLISTS.has(config.playlist)) {
      return res.status(400).json({
        error: `Invalid playlist "${config.playlist}" for module "${mod}". Must be one of: ${[...VALID_PLAYLISTS].join(', ')}`,
      });
    }
    if (config.limit !== undefined && (!Number.isInteger(config.limit) || config.limit < 1)) {
      return res.status(400).json({ error: `limit for ${mod} must be a positive integer` });
    }
  }

  // Resolve playlist per module
  function resolvedPlaylistFor(mod) {
    return modulesBody[mod].playlist ?? MODULE_DEFINITIONS[mod].playlist ?? topPlaylist;
  }

  const moduleDetails = requestedModules.map((m) => {
    const rp = resolvedPlaylistFor(m);
    const lim = modulesBody[m].limit;
    return `${m}(playlist=${rp}${lim ? `,limit=${lim}` : ''})`;
  });
  log('REQUEST', `${username} | modules=${moduleDetails.join(', ')}`);

  // 1. Check each module's cache independently
  const fresh = {}, stale = {}, miss = [];
  for (const mod of requestedModules) {
    const resolvedPlaylist = resolvedPlaylistFor(mod);
    const cached = readModuleCache(username, resolvedPlaylist, mod);
    if (cached && isFresh(cached.cachedAt)) {
      fresh[mod] = cached;
    } else if (cached) {
      stale[mod] = cached;
    } else {
      miss.push(mod);
    }
  }

  const freshMods = Object.keys(fresh);
  const staleMods = Object.keys(stale);
  log('CACHE', `${username} — Fresh: [${freshMods.join(',') || 'none'}] | Stale: [${staleMods.join(',') || 'none'}] | Miss: [${miss.join(',') || 'none'}]`);

  // Helper: merge module cache entries into a single data object
  function mergeData(entries) {
    return Object.values(entries).reduce((acc, entry) => Object.assign(acc, entry.data), {});
  }

  function oldestCachedAt(entries) {
    return Object.values(entries)
      .map((e) => e.cachedAt)
      .sort()[0];
  }

  // Helper: group modules by resolved playlist and scrape in parallel
  async function scrapeByPlaylist(mods) {
    const groups = {};
    for (const mod of mods) {
      const rp = resolvedPlaylistFor(mod);
      (groups[rp] ??= []).push(mod);
    }
    const results = await Promise.all(
      Object.entries(groups).map(([rp, groupMods]) => scrapeStats(username, rp, groupMods))
    );
    const valid = results.filter(Boolean);
    if (valid.length === 0) return null;
    return Object.assign({}, ...valid);
  }

  // 2. All fresh — return immediately
  if (miss.length === 0 && staleMods.length === 0) {
    const cachedAt = oldestCachedAt(fresh);
    log('RESPONSE', `OK for ${username} — all modules fresh (cachedAt=${cachedAt})`);
    return res.json({ username, playlist: topPlaylist, cachedAt, data: applyModuleLimits(mergeData(fresh), modulesBody) });
  }

  // 3. All stale, no miss — return stale + background refresh
  if (miss.length === 0) {
    const cachedAt = oldestCachedAt(stale);
    log('CACHE', `All stale for ${username} (cachedAt=${cachedAt}) — returning stale, refreshing in background`);

    res.json({ username, playlist: topPlaylist, cachedAt, stale: true, data: applyModuleLimits(mergeData(stale), modulesBody) });

    // Background refresh (fire and forget)
    scrapeByPlaylist(staleMods)
      .then((freshData) => {
        if (freshData) {
          for (const mod of staleMods) {
            if (mod in freshData) {
              const resolvedPlaylist = resolvedPlaylistFor(mod);
              writeModuleCache(username, resolvedPlaylist, mod, freshData[mod]);
              log('CACHE', `Background refresh complete for ${username} — ${mod}`);
            }
          }
        }
      })
      .catch((err) => {
        log('ERROR', `Background refresh failed for ${username}: ${err.message}`);
      });

    return;
  }

  // 4. Any miss — scrape all non-fresh (stale + miss) synchronously
  const toScrape = [...miss, ...staleMods];
  log('CACHE', `Scraping [${toScrape.join(',')}] for ${username}`);

  let rawData;
  try {
    rawData = await scrapeByPlaylist(toScrape);
  } catch (err) {
    log('ERROR', `Scrape failed for ${username}: ${err.message}`);
    return res.status(502).json({ error: `Failed to fetch stats: ${err.message}` });
  }

  if (!rawData) {
    log('NOT FOUND', `No data returned for ${username}`);
    return res.status(404).json({ error: 'Profile not found or no data available' });
  }

  // Check that requested modules returned something meaningful
  if (requestedModules.includes('agents') && Array.isArray(rawData.agents) && rawData.agents.length === 0) {
    log('NOT FOUND', `Empty agents array for ${username}`);
    return res.status(404).json({ error: 'Profile not found or no data available' });
  }

  // Write per-module cache for each scraped module
  let scrapedCachedAt;
  for (const mod of toScrape) {
    if (mod in rawData) {
      const resolvedPlaylist = resolvedPlaylistFor(mod);
      scrapedCachedAt = writeModuleCache(username, resolvedPlaylist, mod, rawData[mod]);
    }
  }

  // Merge fresh cached data with newly scraped data
  const mergedData = { ...mergeData(fresh), ...rawData };
  const allCachedAts = [...freshMods.map((m) => fresh[m].cachedAt), scrapedCachedAt].filter(Boolean);
  const cachedAt = allCachedAts.sort()[0];

  log('RESPONSE', `OK for ${username} — ${requestedModules.join(',')} (cachedAt=${cachedAt})`);
  return res.json({ username, playlist: topPlaylist, cachedAt, data: applyModuleLimits(mergedData, modulesBody) });
});

module.exports = router;
