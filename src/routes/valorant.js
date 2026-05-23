const express = require('express');
const { MODULE_DEFINITIONS } = require('../scraper');
const { readSnapshot } = require('../snapshotStore');
const { REFRESH_INTERVAL_MS, isTrackedUsername } = require('../config');
const { log } = require('../logger');

const router = express.Router();

const VALID_PLAYLISTS = new Set(['competitive', 'unrated']);
const VALID_MODULES = new Set([...Object.keys(MODULE_DEFINITIONS), 'profile']);

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

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
  if (mod === 'profile') return 'profile';
  if (mod === 'rank') return 'competitive';
  if (mod === 'totalPlaytime') return 'shared';
  return modulesBody[mod].playlist ?? topPlaylist;
}

function readModuleFromSnapshot(snapshot, mod, playlist) {
  if (mod === 'profile') return snapshot.data.profile;
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
  let username;
  try {
    username = decodeURIComponent(req.params.username);
  } catch {
    log('DECISION', `Request rejected because username path segment is not valid URL encoding: ${req.params.username}`);
    return res.status(400).json({ error: 'username must be valid URL-encoded text' });
  }
  const { playlist: topPlaylist = 'competitive', modules: modulesBody } = req.body ?? {};
  log('REQUEST', `${username} | incoming stats request`);

  if (!isTrackedUsername(username)) {
    log('DECISION', `${username} is not in TRACKED_USERNAMES; returning 404`);
    return res.status(404).json({ error: 'User not tracked' });
  }

  if (!isPlainObject(modulesBody)) {
    log('DECISION', `${username} request rejected because modules payload is missing or invalid`);
    return res.status(400).json({ error: 'modules is required and must be an object' });
  }

  if (!VALID_PLAYLISTS.has(topPlaylist)) {
    log('DECISION', `${username} request rejected because playlist=${topPlaylist} is invalid`);
    return res.status(400).json({
      error: `Invalid playlist "${topPlaylist}". Must be one of: ${[...VALID_PLAYLISTS].join(', ')}`,
    });
  }

  const requestedModules = Object.keys(modulesBody);
  const invalidModules = requestedModules.filter((m) => !VALID_MODULES.has(m));
  if (invalidModules.length > 0) {
    log('DECISION', `${username} request rejected because modules are invalid: ${invalidModules.join(', ')}`);
    return res.status(400).json({
      error: `Invalid module(s): ${invalidModules.join(', ')}. Valid modules: ${[...VALID_MODULES].join(', ')}`,
    });
  }

  for (const [mod, config] of Object.entries(modulesBody)) {
    if (!isPlainObject(config)) {
      log('DECISION', `${username} request rejected because module ${mod} config is not an object`);
      return res.status(400).json({ error: `module "${mod}" must be an object` });
    }
    if (config.playlist !== undefined && !VALID_PLAYLISTS.has(config.playlist)) {
      log('DECISION', `${username} request rejected because module ${mod} has invalid playlist=${config.playlist}`);
      return res.status(400).json({
        error: `Invalid playlist "${config.playlist}" for module "${mod}". Must be one of: ${[...VALID_PLAYLISTS].join(', ')}`,
      });
    }
    if (config.limit !== undefined && (!Number.isInteger(config.limit) || config.limit < 1)) {
      log('DECISION', `${username} request rejected because module ${mod} has invalid limit=${config.limit}`);
      return res.status(400).json({ error: `limit for ${mod} must be a positive integer` });
    }
  }

  const snapshot = readSnapshot(username);
  if (!snapshot) {
    log('NOT_FOUND', `Snapshot missing for tracked user ${username}`);
    return res.status(404).json({ error: 'Tracked user has no cached snapshot yet' });
  }

  const moduleDetails = requestedModules.map((mod) => {
    const rp = resolvedPlaylistFor(mod, modulesBody, topPlaylist);
    const lim = modulesBody[mod].limit;
    return `${mod}(source=${rp}${lim ? `,limit=${lim}` : ''})`;
  });
  log('REQUEST', `${username} | snapshot-only | modules=${moduleDetails.join(', ')}`);
  const nextRefreshAt = computeNextRefreshAt(snapshot.lastRefreshedAt);
  log(
    'DECISION',
    `${username} | snapshot status=${snapshot.status} | cachedAt=${snapshot.lastRefreshedAt} | nextRefreshAt=${nextRefreshAt ?? 'unknown'}`
  );

  const data = {};
  for (const mod of requestedModules) {
    const playlist = resolvedPlaylistFor(mod, modulesBody, topPlaylist);
    const value = readModuleFromSnapshot(snapshot, mod, playlist);
    if (value === undefined || value === null) {
      log('DECISION', `${username} | module ${mod} missing from cached snapshot source=${playlist}`);
      return res.status(404).json({ error: `Cached data unavailable for module "${mod}"` });
    }
    data[mod] = value;
    log('RESPONSE', `${username} | module ${mod} served from source=${playlist}`);
  }

  return res.json({
    username,
    playlist: topPlaylist,
    cachedAt: snapshot.lastRefreshedAt,
    nextRefreshAt,
    status: snapshot.status,
    ...(snapshot.sources ? { sources: snapshot.sources } : {}),
    data: applyModuleLimits(data, modulesBody),
  });
});

module.exports = router;
