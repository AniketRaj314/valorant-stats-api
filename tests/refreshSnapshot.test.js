'use strict';

jest.mock('../src/scraper');
jest.mock('../src/snapshotStore');
jest.mock('../src/logger');

const { scrapeStats } = require('../src/scraper');
const { readSnapshot, writeSnapshot } = require('../src/snapshotStore');
const { refreshUserSnapshot, refreshTrackedUsers } = require('../src/refreshSnapshot');

describe('refreshUserSnapshot', () => {
  beforeEach(() => {
    scrapeStats
      .mockResolvedValueOnce({ rank: { current: { rank: 'Gold 2' }, peak: { rank: 'Plat 1' } } })
      .mockResolvedValueOnce({ agents: [{ agent: 'Jett' }] })
      .mockResolvedValueOnce({ maps: [{ map: 'Ascent' }] })
      .mockResolvedValueOnce({ totalPlaytime: { total: '100 hours' } })
      .mockResolvedValueOnce({ agents: [{ agent: 'Phoenix' }] })
      .mockResolvedValueOnce({ maps: [{ map: 'Lotus' }] });
  });

  test('builds a full snapshot with 6 scrape calls', async () => {
    const snapshot = await refreshUserSnapshot('Spider31415#6921');

    expect(scrapeStats).toHaveBeenCalledTimes(6);
    expect(scrapeStats).toHaveBeenNthCalledWith(1, 'Spider31415#6921', 'competitive', ['rank']);
    expect(scrapeStats).toHaveBeenNthCalledWith(4, 'Spider31415#6921', 'competitive', ['totalPlaytime']);
    expect(scrapeStats).toHaveBeenNthCalledWith(5, 'Spider31415#6921', 'unrated', ['agents']);
    expect(snapshot.data.shared.totalPlaytime).toEqual({ total: '100 hours' });
    expect(snapshot.data.unrated.maps).toEqual([{ map: 'Lotus' }]);
    expect(writeSnapshot).toHaveBeenCalledWith('Spider31415#6921', expect.objectContaining({
      username: 'Spider31415#6921',
      status: 'ok',
    }));
  });
});

describe('refreshTrackedUsers', () => {
  test('marks existing snapshot stale when refresh fails', async () => {
    scrapeStats.mockRejectedValue(new Error('credits exhausted'));
    readSnapshot.mockReturnValue({
      username: 'Spider31415#6921',
      status: 'ok',
      lastRefreshedAt: '2026-05-18T10:00:00.000Z',
      data: { competitive: {}, unrated: {}, shared: {} },
    });

    const results = await refreshTrackedUsers(['Spider31415#6921'], { continueOnError: true });

    expect(results[0]).toEqual(expect.objectContaining({
      username: 'Spider31415#6921',
      ok: false,
      error: 'credits exhausted',
    }));
    expect(writeSnapshot).toHaveBeenCalledWith('Spider31415#6921', expect.objectContaining({
      status: 'stale',
      lastRefreshError: 'credits exhausted',
    }));
  });
});
