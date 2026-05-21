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

function safeUsername(username) {
  return username.replace(/[^a-zA-Z0-9_.-]/g, '_');
}

function snapshotPath(username) {
  return path.join(SNAPSHOT_DIR, `${safeUsername(username)}.json`);
}

function readSnapshot(username) {
  try {
    const filePath = snapshotPath(username);
    const raw = fs.readFileSync(filePath, 'utf8');
    log('SNAPSHOT', `Read snapshot for ${username} from ${filePath}`);
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

module.exports = { readSnapshot, writeSnapshot, snapshotPath };
