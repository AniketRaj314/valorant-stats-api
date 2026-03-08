'use strict';

let fetchSpy;
let RANK_ICONS, initRankIcons;

beforeEach(() => {
  jest.resetModules();
  fetchSpy = jest.spyOn(global, 'fetch');
  ({ RANK_ICONS, initRankIcons } = require('../src/rankIcons'));
  Object.keys(RANK_ICONS).forEach((k) => delete RANK_ICONS[k]);
});

afterEach(() => {
  fetchSpy.mockRestore();
});

function mockFetchOk(data) {
  fetchSpy.mockResolvedValue({
    ok: true,
    json: async () => ({ data }),
  });
}

describe('initRankIcons', () => {
  test('uses only the last element of data[] (current episode)', async () => {
    mockFetchOk([
      {
        tiers: [{ tierName: 'Iron 1', largeIcon: 'old-icon.png' }],
      },
      {
        tiers: [{ tierName: 'Gold 2', largeIcon: 'new-icon.png' }],
      },
    ]);
    await initRankIcons();
    expect(RANK_ICONS['gold 2']).toBe('new-icon.png');
    expect(RANK_ICONS['iron 1']).toBeUndefined();
  });

  test('keys are tierName.toLowerCase()', async () => {
    mockFetchOk([
      {
        tiers: [{ tierName: 'Diamond 3', largeIcon: 'diamond3.png' }],
      },
    ]);
    await initRankIcons();
    expect(RANK_ICONS['diamond 3']).toBe('diamond3.png');
    expect(RANK_ICONS['Diamond 3']).toBeUndefined();
  });

  test('skips tiers with null largeIcon', async () => {
    mockFetchOk([
      {
        tiers: [
          { tierName: 'Unranked', largeIcon: null },
          { tierName: 'Iron 1', largeIcon: 'iron1.png' },
        ],
      },
    ]);
    await initRankIcons();
    expect(RANK_ICONS['unranked']).toBeUndefined();
    expect(RANK_ICONS['iron 1']).toBe('iron1.png');
  });

  test('does not throw on HTTP error', async () => {
    fetchSpy.mockResolvedValue({ ok: false, status: 500 });
    await expect(initRankIcons()).resolves.not.toThrow();
  });

  test('does not throw on network error', async () => {
    fetchSpy.mockRejectedValue(new Error('Network failure'));
    await expect(initRankIcons()).resolves.not.toThrow();
  });
});
