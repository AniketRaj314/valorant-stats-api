const express = require('express');
const { MODULE_DEFINITIONS } = require('../scraper');
const { readSnapshot } = require('../snapshotStore');
const { REFRESH_INTERVAL_MS, isTrackedUsername } = require('../config');
const { log } = require('../logger');

const router = express.Router();

const VALID_PLAYLISTS = new Set(['competitive', 'unrated']);
const VALID_MODULES = new Set(Object.keys(MODULE_DEFINITIONS));

function applyModuleLimits(data, modulesBody) {
  const result = { ...data };
  for (const [mod, config] of Object.entries(modulesBody)) {
    if (config.limit && Array.isArray(result[mod])) {
      result[mod] = result[mod].slice(0, config.limit);
    }
  }
  return result;
}

function resolvedPlaylistFor(mod, modulesBody, topPlaylist) {
  if (mod === 'rank') return 'competitive';
  if (mod === 'totalPlaytime') return 'shared';
  return modulesBody[mod].playlist ?? topPlaylist;
}

function readModuleFromSnapshot(snapshot, mod, playlist) {
  if (mod === 'rank') return snapshot.data.competitive.rank;
  if (mod === 'totalPlaytime') return snapshot.data.shared.totalPlaytime;
  return snapshot.data[playlist]?.[mod];
}

function computeNextRefreshAt(cachedAt) {
  const cachedMs = Date.parse(cachedAt);
  if (Number.isNaN(cachedMs)) return null;
  return new Date(cachedMs + REFRESH_INTERVAL_MS).toISOString();
}

router.post('/stats/:username', async (req, res) => {
  const username = decodeURIComponent(req.params.username);
  const { playlist: topPlaylist = 'competitive', modules: modulesBody } = req.body ?? {};

  if (!isTrackedUsername(username)) {
    return res.status(404).json({ error: 'User not tracked' });
  }

  if (!modulesBody || typeof modulesBody !== 'object' || Array.isArray(modulesBody)) {
    return res.status(400).json({ error: 'modules is required and must be an object' });
  }

  if (!VALID_PLAYLISTS.has(topPlaylist)) {
    return res.status(400).json({
      error: `Invalid playlist "${topPlaylist}". Must be one of: ${[...VALID_PLAYLISTS].join(', ')}`,
    });
  }

  const requestedModules = Object.keys(modulesBody);
  const invalidModules = requestedModules.filter((m) => !VALID_MODULES.has(m));
  if (invalidModules.length > 0) {
    return res.status(400).json({
      error: `Invalid module(s): ${invalidModules.join(', ')}. Valid modules: ${[...VALID_MODULES].join(', ')}`,
    });
  }

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

  const snapshot = readSnapshot(username);
  if (!snapshot) {
    log('NOT FOUND', `Snapshot missing for tracked user ${username}`);
    return res.status(404).json({ error: 'Tracked user has no cached snapshot yet' });
  }

  const moduleDetails = requestedModules.map((mod) => {
    const rp = resolvedPlaylistFor(mod, modulesBody, topPlaylist);
    const lim = modulesBody[mod].limit;
    return `${mod}(source=${rp}${lim ? `,limit=${lim}` : ''})`;
  });
  log('REQUEST', `${username} | snapshot-only | modules=${moduleDetails.join(', ')}`);

  const data = {};
  for (const mod of requestedModules) {
    const playlist = resolvedPlaylistFor(mod, modulesBody, topPlaylist);
    const value = readModuleFromSnapshot(snapshot, mod, playlist);
    if (value === undefined || value === null) {
      return res.status(404).json({ error: `Cached data unavailable for module "${mod}"` });
    }
    data[mod] = value;
  }

  return res.json({
    username,
    playlist: topPlaylist,
    cachedAt: snapshot.lastRefreshedAt,
    nextRefreshAt: computeNextRefreshAt(snapshot.lastRefreshedAt),
    status: snapshot.status,
    data: applyModuleLimits(data, modulesBody),
  });
});

module.exports = router;
