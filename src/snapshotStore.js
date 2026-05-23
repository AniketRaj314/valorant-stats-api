const fs = require('fs');
const path = require('path');
const { log } = require('./logger');

const SNAPSHOT_DIR = path.join(process.cwd(), 'cache', 'snapshots');

function ensureSnapshotDir() {
  if (!fs.existsSync(SNAPSHOT_DIR)) {
    fs.mkdirSync(SNAPSHOT_DIR, { recursive: true });
    log('SNAPSHOT', `Created snapshot directory at ${SNAPSHOT_DIR}`);
  }
}

function encodeUsername(username) {
  return Buffer.from(username, 'utf8').toString('base64url');
}

function snapshotPath(username) {
  return path.join(SNAPSHOT_DIR, `${encodeUsername(username)}.json`);
}

function legacySnapshotPath(username) {
  const legacySafeUsername = username.replace(/[^a-zA-Z0-9_.-]/g, '_');
  return path.join(SNAPSHOT_DIR, `${legacySafeUsername}.json`);
}

function readSnapshot(username) {
  try {
    const preferredPath = snapshotPath(username);
    const legacyPath = legacySnapshotPath(username);
    const filePath = fs.existsSync(preferredPath) ? preferredPath : legacyPath;
    const raw = fs.readFileSync(filePath, 'utf8');
    if (filePath === legacyPath && legacyPath !== preferredPath) {
      log('SNAPSHOT', `Read legacy snapshot for ${username} from ${filePath}`);
    } else {
      log('SNAPSHOT', `Read snapshot for ${username} from ${filePath}`);
    }
    return JSON.parse(raw);
  } catch {
    log('SNAPSHOT', `No snapshot found for ${username}`);
    return null;
  }
}

function writeSnapshot(username, snapshot) {
  ensureSnapshotDir();
  const filePath = snapshotPath(username);
  fs.writeFileSync(filePath, JSON.stringify(snapshot, null, 2), 'utf8');
  log('SNAPSHOT', `Wrote snapshot for ${username} to ${filePath}`);
  return snapshot;
}

function mergeSnapshotData(username, mergeFn) {
  const previous = readSnapshot(username) ?? { username, status: 'ok', data: {} };
  const next = mergeFn(previous);
  return writeSnapshot(username, next);
}

module.exports = { readSnapshot, writeSnapshot, mergeSnapshotData, snapshotPath };
