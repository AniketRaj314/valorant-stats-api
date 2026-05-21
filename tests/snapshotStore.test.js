'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');

jest.mock('../src/logger', () => ({
  log: jest.fn(),
}));

describe('snapshotStore', () => {
  const originalCwd = process.cwd();
  let tempDir;

  beforeEach(() => {
    jest.resetModules();
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'valorant-stats-api-'));
    process.chdir(tempDir);
  });

  afterEach(() => {
    process.chdir(originalCwd);
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  test('snapshotPath is collision-safe for similar usernames', () => {
    const { snapshotPath } = require('../src/snapshotStore');

    const first = snapshotPath('Spider31415#6921');
    const second = snapshotPath('Spider31415/6921');

    expect(first).not.toBe(second);
    expect(first.endsWith('.json')).toBe(true);
    expect(second.endsWith('.json')).toBe(true);
  });

  test('readSnapshot still supports legacy sanitized filenames', () => {
    const { readSnapshot } = require('../src/snapshotStore');
    const snapshotDir = path.join(tempDir, 'cache', 'snapshots');
    fs.mkdirSync(snapshotDir, { recursive: true });

    const username = 'Spider31415#6921';
    const legacyPath = path.join(snapshotDir, 'Spider31415_6921.json');
    const snapshot = {
      username,
      status: 'ok',
      lastRefreshedAt: '2026-05-21T00:00:00.000Z',
      data: {},
    };

    fs.writeFileSync(legacyPath, JSON.stringify(snapshot), 'utf8');

    expect(readSnapshot(username)).toEqual(snapshot);
  });
});
