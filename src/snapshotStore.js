const fs = require('fs');
const path = require('path');

const SNAPSHOT_DIR = path.join(process.cwd(), 'cache', 'snapshots');

function ensureSnapshotDir() {
  if (!fs.existsSync(SNAPSHOT_DIR)) {
    fs.mkdirSync(SNAPSHOT_DIR, { recursive: true });
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
    const raw = fs.readFileSync(snapshotPath(username), 'utf8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function writeSnapshot(username, snapshot) {
  ensureSnapshotDir();
  fs.writeFileSync(snapshotPath(username), JSON.stringify(snapshot, null, 2), 'utf8');
  return snapshot;
}

module.exports = { readSnapshot, writeSnapshot, snapshotPath };
