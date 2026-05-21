'use strict';

jest.mock('../src/scraper');
jest.mock('../src/snapshotStore');
jest.mock('../src/logger');

const { scrapeStats } = require('../src/scraper');
const { readSnapshot, writeSnapshot } = require('../src/snapshotStore');
const { refreshUserSnapshot, refreshTrackedUsers } = require('../src/refreshSnapshot');

const USERNAME = 'Spider31415#6921';

describe('refreshUserSnapshot', () => {
  beforeEach(() => {
    process.env.REFRESH_STAGGER_MS = '0';
    scrapeStats
      .mockResolvedValueOnce({ rank: { current: { rank: 'Gold 2' }, peak: { rank: 'Plat 1' } } })
      .mockResolvedValueOnce({ agents: [{ agent: 'Jett' }] })
      .mockResolvedValueOnce({ maps: [{ map: 'Ascent' }] })
      .mockResolvedValueOnce({ totalPlaytime: { total: '100 hours' } })
      .mockResolvedValueOnce({ agents: [{ agent: 'Phoenix' }] })
      .mockResolvedValueOnce({ maps: [{ map: 'Lotus' }] });
  });

  afterEach(() => {
    delete process.env.REFRESH_STAGGER_MS;
  });

  test('builds a full snapshot with 6 scrape calls', async () => {
    const snapshot = await refreshUserSnapshot(USERNAME);

    expect(scrapeStats).toHaveBeenCalledTimes(6);
    expect(scrapeStats).toHaveBeenNthCalledWith(1, USERNAME, 'competitive', ['rank']);
    expect(scrapeStats).toHaveBeenNthCalledWith(4, USERNAME, 'competitive', ['totalPlaytime']);
    expect(scrapeStats).toHaveBeenNthCalledWith(5, USERNAME, 'unrated', ['agents']);
    expect(snapshot.data.shared.totalPlaytime).toEqual({ total: '100 hours' });
    expect(snapshot.data.unrated.maps).toEqual([{ map: 'Lotus' }]);
    expect(writeSnapshot).toHaveBeenCalledWith(USERNAME, expect.objectContaining({
      username: USERNAME,
      status: 'ok',
    }));
  });
});

describe('refreshTrackedUsers', () => {
  test('marks existing snapshot stale when refresh fails', async () => {
    process.env.REFRESH_STAGGER_MS = '0';
    scrapeStats.mockRejectedValue(new Error('credits exhausted'));
    readSnapshot.mockReturnValue({
      username: USERNAME,
      status: 'ok',
      lastRefreshedAt: '2026-05-18T10:00:00.000Z',
      data: { competitive: {}, unrated: {}, shared: {} },
    });

    const results = await refreshTrackedUsers([USERNAME], { continueOnError: true });

    expect(results[0]).toEqual(expect.objectContaining({
      username: USERNAME,
      ok: false,
      error: 'credits exhausted',
    }));
    expect(writeSnapshot).toHaveBeenCalledWith(USERNAME, expect.objectContaining({
      status: 'stale',
      lastRefreshError: 'credits exhausted',
    }));
  });

  afterEach(() => {
    delete process.env.REFRESH_STAGGER_MS;
  });
});
