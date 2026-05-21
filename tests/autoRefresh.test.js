'use strict';

jest.mock('../src/snapshotStore');
jest.mock('../src/refreshSnapshot');
jest.mock('../src/logger');

const { readSnapshot } = require('../src/snapshotStore');
const { refreshTrackedUsers } = require('../src/refreshSnapshot');
const {
  computeSnapshotDueAt,
  computeNextAutoRefreshDelay,
  startAutoRefreshScheduler,
} = require('../src/autoRefresh');

describe('computeSnapshotDueAt', () => {
  test('returns 0 when snapshot is missing', () => {
    expect(computeSnapshotDueAt(null)).toBe(0);
  });

  test('returns 0 when lastRefreshedAt is invalid', () => {
    expect(computeSnapshotDueAt({ lastRefreshedAt: 'not-a-date' })).toBe(0);
  });

  test('returns refresh due timestamp when snapshot is valid', () => {
    const refreshedAt = '2026-05-19T10:00:00.000Z';
    const dueAt = computeSnapshotDueAt({ lastRefreshedAt: refreshedAt });
    expect(dueAt).toBe(Date.parse(refreshedAt) + 48 * 60 * 60 * 1000);
  });
});

describe('computeNextAutoRefreshDelay', () => {
  test('returns 0 if a tracked user has no snapshot yet', () => {
    readSnapshot.mockReturnValue(null);
    expect(computeNextAutoRefreshDelay(['Spider31415#6921'], Date.parse('2026-05-20T00:00:00.000Z'))).toBe(0);
  });

  test('returns remaining delay until earliest due snapshot', () => {
    readSnapshot.mockImplementation((username) => ({
      lastRefreshedAt:
        username === 'A#1' ? '2026-05-19T10:00:00.000Z' : '2026-05-19T20:00:00.000Z',
    }));

    const now = Date.parse('2026-05-20T12:00:00.000Z');
    const delay = computeNextAutoRefreshDelay(['A#1', 'B#2'], now);

    expect(delay).toBe(Date.parse('2026-05-21T10:00:00.000Z') - now);
  });
});

describe('startAutoRefreshScheduler', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    refreshTrackedUsers.mockResolvedValue([{ username: 'Spider31415#6921', ok: true }]);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('runs immediately when snapshots are missing', async () => {
    readSnapshot.mockReturnValue(null);
    startAutoRefreshScheduler({ usernames: ['Spider31415#6921'] });

    jest.runOnlyPendingTimers();
    await Promise.resolve();

    expect(refreshTrackedUsers).toHaveBeenCalledWith(['Spider31415#6921'], { continueOnError: true });
  });
});
