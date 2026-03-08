const fs = require('fs');
const path = require('path');

const CACHE_DIR = path.join(process.cwd(), 'cache');

function ensureCacheDir() {
  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
  }
}

function moduleCacheKey(username, resolvedPlaylist, moduleName) {
  const safeUsername = username.replace(/[^a-zA-Z0-9_.-]/g, '_');
  return path.join(CACHE_DIR, `${safeUsername}_${resolvedPlaylist}_${moduleName}.json`);
}

function readModuleCache(username, resolvedPlaylist, moduleName) {
  try {
    const raw = fs.readFileSync(moduleCacheKey(username, resolvedPlaylist, moduleName), 'utf8');
    return JSON.parse(raw); // { cachedAt, data: { [moduleName]: ... } }
  } catch {
    return null;
  }
}

function writeModuleCache(username, resolvedPlaylist, moduleName, moduleData) {
  ensureCacheDir();
  const payload = { cachedAt: new Date().toISOString(), data: { [moduleName]: moduleData } };
  fs.writeFileSync(moduleCacheKey(username, resolvedPlaylist, moduleName), JSON.stringify(payload, null, 2), 'utf8');
  return payload.cachedAt;
}

function isFresh(cachedAt) {
  const ttlHours = parseFloat(process.env.CACHE_TTL_HOURS) || 6;
  const ttlMs = ttlHours * 60 * 60 * 1000;
  return Date.now() - new Date(cachedAt).getTime() < ttlMs;
}

module.exports = { readModuleCache, writeModuleCache, isFresh };
