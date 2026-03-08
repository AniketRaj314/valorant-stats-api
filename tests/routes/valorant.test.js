'use strict';

jest.mock('../../src/scraper');
jest.mock('../../src/cache');
jest.mock('../../src/logger');

const express = require('express');
const request = require('supertest');
const { scrapeStats } = require('../../src/scraper');
const { readModuleCache, writeModuleCache, isFresh } = require('../../src/cache');

// Build local app — do NOT import index.js (it calls app.listen + initAgentData)
const app = express();
app.use(express.json());
app.use('/valorant', require('../../src/routes/valorant'));

const USERNAME = 'Spider31415#6921';
const ENCODED_USERNAME = encodeURIComponent(USERNAME);
const URL = `/valorant/stats/${ENCODED_USERNAME}`;

// Helper: flush all pending microtasks / promises (for background refresh checks)
const flushPromises = () => new Promise((resolve) => setImmediate(resolve));

// Sample data
const AGENTS_DATA = [
  { agent: 'Jett', icon: null, portrait: null, killfeedPortrait: null },
  { agent: 'Sage', icon: null, portrait: null, killfeedPortrait: null },
  { agent: 'Reyna', icon: null, portrait: null, killfeedPortrait: null },
];
const RANK_DATA = { current: { rank: 'Gold 2', icon: null }, peak: { rank: 'Plat 1', icon: null } };
const MAPS_DATA = [
  { map: 'Ascent', topAgents: [] },
  { map: 'Bind', topAgents: [] },
  { map: 'Haven', topAgents: [] },
];

function freshEntry(mod, data) {
  return { cachedAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(), data: { [mod]: data } };
}

function staleEntry(mod, data) {
  return { cachedAt: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(), data: { [mod]: data } };
}

beforeEach(() => {
  readModuleCache.mockReturnValue(null);
  writeModuleCache.mockReturnValue(new Date().toISOString());
  isFresh.mockReturnValue(false);
  scrapeStats.mockResolvedValue({ agents: AGENTS_DATA });
});

// ─── Validation — modules ────────────────────────────────────────────────────

describe('Validation — modules', () => {
  test('missing → 400 "modules is required and must be an object"', async () => {
    const res = await request(app).post(URL).send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/modules is required and must be an object/);
  });

  test('null → 400', async () => {
    const res = await request(app).post(URL).send({ modules: null });
    expect(res.status).toBe(400);
  });

  test('array → 400', async () => {
    const res = await request(app).post(URL).send({ modules: ['agents'] });
    expect(res.status).toBe(400);
  });

  test('string → 400', async () => {
    const res = await request(app).post(URL).send({ modules: 'agents' });
    expect(res.status).toBe(400);
  });
});

// ─── Validation — top-level playlist ────────────────────────────────────────

describe('Validation — top-level playlist', () => {
  test('"ranked" → 400 with playlist name in error', async () => {
    const res = await request(app).post(URL).send({ playlist: 'ranked', modules: { agents: {} } });
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('ranked');
  });

  test('empty string → 400', async () => {
    const res = await request(app).post(URL).send({ playlist: '', modules: { agents: {} } });
    expect(res.status).toBe(400);
  });

  test('"competitive" → accepted', async () => {
    const res = await request(app).post(URL).send({ playlist: 'competitive', modules: { agents: {} } });
    expect(res.status).not.toBe(400);
  });

  test('"unrated" → accepted', async () => {
    scrapeStats.mockResolvedValue({ agents: AGENTS_DATA });
    const res = await request(app).post(URL).send({ playlist: 'unrated', modules: { agents: {} } });
    expect(res.status).not.toBe(400);
  });

  test('omitted → defaults to "competitive" in response body', async () => {
    const res = await request(app).post(URL).send({ modules: { agents: {} } });
    expect(res.status).toBe(200);
    expect(res.body.playlist).toBe('competitive');
  });
});

// ─── Validation — module names ───────────────────────────────────────────────

describe('Validation — module names', () => {
  test('unknown name → 400 listing the invalid name', async () => {
    const res = await request(app).post(URL).send({ modules: { foobar: {} } });
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('foobar');
  });

  test('multiple invalid → 400 listing all', async () => {
    const res = await request(app).post(URL).send({ modules: { foo: {}, bar: {} } });
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('foo');
    expect(res.body.error).toContain('bar');
  });

  test('mix of valid + invalid → 400', async () => {
    const res = await request(app).post(URL).send({ modules: { agents: {}, invalid: {} } });
    expect(res.status).toBe(400);
  });
});

// ─── Validation — per-module playlist ───────────────────────────────────────

describe('Validation — per-module playlist', () => {
  test('"ranked" → 400 mentioning module name and playlist value', async () => {
    const res = await request(app).post(URL).send({ modules: { agents: { playlist: 'ranked' } } });
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('agents');
    expect(res.body.error).toContain('ranked');
  });

  test('empty string → 400', async () => {
    const res = await request(app).post(URL).send({ modules: { agents: { playlist: '' } } });
    expect(res.status).toBe(400);
  });

  test('"competitive" → accepted', async () => {
    const res = await request(app).post(URL).send({ modules: { agents: { playlist: 'competitive' } } });
    expect(res.status).not.toBe(400);
  });

  test('"unrated" → accepted', async () => {
    const res = await request(app).post(URL).send({ modules: { agents: { playlist: 'unrated' } } });
    expect(res.status).not.toBe(400);
  });
});

// ─── Validation — per-module limit ──────────────────────────────────────────

describe('Validation — per-module limit', () => {
  test('0 → 400 "limit for agents must be a positive integer"', async () => {
    const res = await request(app).post(URL).send({ modules: { agents: { limit: 0 } } });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/limit for agents must be a positive integer/);
  });

  test('-1 → 400', async () => {
    const res = await request(app).post(URL).send({ modules: { agents: { limit: -1 } } });
    expect(res.status).toBe(400);
  });

  test('1.5 (float) → 400', async () => {
    const res = await request(app).post(URL).send({ modules: { agents: { limit: 1.5 } } });
    expect(res.status).toBe(400);
  });

  test('"5" (string) → 400', async () => {
    const res = await request(app).post(URL).send({ modules: { agents: { limit: '5' } } });
    expect(res.status).toBe(400);
  });

  test('1 → accepted', async () => {
    scrapeStats.mockResolvedValue({ agents: AGENTS_DATA });
    const res = await request(app).post(URL).send({ modules: { agents: { limit: 1 } } });
    expect(res.status).not.toBe(400);
  });

  test('100 → accepted', async () => {
    scrapeStats.mockResolvedValue({ agents: AGENTS_DATA });
    const res = await request(app).post(URL).send({ modules: { agents: { limit: 100 } } });
    expect(res.status).not.toBe(400);
  });

  test('undefined (key absent) → no error', async () => {
    scrapeStats.mockResolvedValue({ agents: AGENTS_DATA });
    const res = await request(app).post(URL).send({ modules: { agents: {} } });
    expect(res.status).not.toBe(400);
  });
});

// ─── Cache Branch 1 — all fresh ─────────────────────────────────────────────

describe('Cache Branch 1 — all fresh', () => {
  beforeEach(() => {
    readModuleCache.mockReturnValue(freshEntry('agents', AGENTS_DATA));
    isFresh.mockReturnValue(true);
  });

  test('returns 200, no scrapeStats call', async () => {
    const res = await request(app).post(URL).send({ modules: { agents: {} } });
    expect(res.status).toBe(200);
    expect(scrapeStats).not.toHaveBeenCalled();
  });

  test('response shape: { username, playlist, cachedAt, data }', async () => {
    const res = await request(app).post(URL).send({ modules: { agents: {} } });
    expect(res.body).toHaveProperty('username');
    expect(res.body).toHaveProperty('playlist');
    expect(res.body).toHaveProperty('cachedAt');
    expect(res.body).toHaveProperty('data');
  });

  test('username decoded from URL (%23 → #) and echoed', async () => {
    const res = await request(app).post(URL).send({ modules: { agents: {} } });
    expect(res.body.username).toBe(USERNAME);
  });

  test('no stale key in response', async () => {
    const res = await request(app).post(URL).send({ modules: { agents: {} } });
    expect(res.body).not.toHaveProperty('stale');
  });

  test('cachedAt = oldest cachedAt among fresh entries', async () => {
    const olderTime = new Date(Date.now() - 50 * 60 * 1000).toISOString();
    const newerTime = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    readModuleCache
      .mockReturnValueOnce({ cachedAt: olderTime, data: { agents: AGENTS_DATA } })
      .mockReturnValueOnce({ cachedAt: newerTime, data: { rank: RANK_DATA } });
    isFresh.mockReturnValue(true);
    const res = await request(app).post(URL).send({ modules: { agents: {}, rank: {} } });
    expect(res.body.cachedAt).toBe(olderTime);
  });
});

// ─── Cache Branch 2 — all stale, no miss ────────────────────────────────────

describe('Cache Branch 2 — all stale, no miss', () => {
  beforeEach(() => {
    readModuleCache.mockReturnValue(staleEntry('agents', AGENTS_DATA));
    isFresh.mockReturnValue(false);
    scrapeStats.mockResolvedValue({ agents: AGENTS_DATA });
  });

  test('returns 200 with stale: true', async () => {
    const res = await request(app).post(URL).send({ modules: { agents: {} } });
    expect(res.status).toBe(200);
    expect(res.body.stale).toBe(true);
  });

  test('scrapeStats called for background refresh', async () => {
    await request(app).post(URL).send({ modules: { agents: {} } });
    await flushPromises();
    expect(scrapeStats).toHaveBeenCalled();
  });

  test('writeModuleCache called after background scrape completes', async () => {
    await request(app).post(URL).send({ modules: { agents: {} } });
    await flushPromises();
    expect(writeModuleCache).toHaveBeenCalled();
  });

  test('no crash when background scrapeStats rejects', async () => {
    scrapeStats.mockRejectedValue(new Error('bg scrape failed'));
    const res = await request(app).post(URL).send({ modules: { agents: {} } });
    await flushPromises();
    expect(res.status).toBe(200);
  });

  test('cachedAt = oldest among stale entries', async () => {
    const olderTime = new Date(Date.now() - 9 * 60 * 60 * 1000).toISOString();
    const newerTime = new Date(Date.now() - 7 * 60 * 60 * 1000).toISOString();
    readModuleCache
      .mockReturnValueOnce({ cachedAt: olderTime, data: { agents: AGENTS_DATA } })
      .mockReturnValueOnce({ cachedAt: newerTime, data: { rank: RANK_DATA } });
    isFresh.mockReturnValue(false);
    scrapeStats.mockResolvedValue({ agents: AGENTS_DATA, rank: RANK_DATA });
    const res = await request(app).post(URL).send({ modules: { agents: {}, rank: {} } });
    expect(res.body.cachedAt).toBe(olderTime);
  });
});

// ─── Cache Branch 3 — any miss → synchronous scrape ─────────────────────────

describe('Cache Branch 3 — cold cache', () => {
  beforeEach(() => {
    readModuleCache.mockReturnValue(null);
    isFresh.mockReturnValue(false);
  });

  test('cold cache: 200 with scraped data, no stale key', async () => {
    scrapeStats.mockResolvedValue({ agents: AGENTS_DATA });
    const res = await request(app).post(URL).send({ modules: { agents: {} } });
    expect(res.status).toBe(200);
    expect(res.body).not.toHaveProperty('stale');
    expect(res.body.data).toHaveProperty('agents');
  });

  test('writeModuleCache called once per scraped module', async () => {
    scrapeStats.mockResolvedValue({ agents: AGENTS_DATA });
    await request(app).post(URL).send({ modules: { agents: {} } });
    expect(writeModuleCache).toHaveBeenCalledTimes(1);
  });

  test('cache write uses resolved playlist per module', async () => {
    scrapeStats.mockResolvedValue({ agents: AGENTS_DATA });
    await request(app).post(URL).send({
      modules: { agents: { playlist: 'unrated' } },
    });
    expect(writeModuleCache).toHaveBeenCalledWith(
      USERNAME,
      'unrated',
      'agents',
      AGENTS_DATA
    );
  });

  test('fresh hits merged with scraped data in response', async () => {
    // agents: fresh, rank: miss
    readModuleCache
      .mockReturnValueOnce(freshEntry('agents', AGENTS_DATA)) // agents fresh
      .mockReturnValueOnce(null);                              // rank miss
    isFresh.mockImplementation(() => {
      // First call (agents) is fresh, second (rank) is not
      const result = isFresh.mock.calls.length === 1;
      return result;
    });
    // Reset isFresh mock to use a counter
    isFresh.mockReturnValueOnce(true).mockReturnValueOnce(false);
    scrapeStats.mockResolvedValue({ rank: RANK_DATA });

    const res = await request(app).post(URL).send({ modules: { agents: {}, rank: {} } });
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('agents');
    expect(res.body.data).toHaveProperty('rank');
  });

  test('mix of stale + miss: both groups included in scrapeStats call', async () => {
    // agents: stale, rank: miss
    readModuleCache
      .mockReturnValueOnce(staleEntry('agents', AGENTS_DATA))
      .mockReturnValueOnce(null);
    isFresh.mockReturnValueOnce(false).mockReturnValueOnce(false);
    scrapeStats.mockResolvedValue({ agents: AGENTS_DATA, rank: RANK_DATA });

    await request(app).post(URL).send({ modules: { agents: {}, rank: {} } });
    // scrapeStats should be called with both agents and rank in some order
    const calledModules = scrapeStats.mock.calls.flatMap((call) => call[2]);
    expect(calledModules).toContain('agents');
    expect(calledModules).toContain('rank');
  });
});

// ─── Cache Branch 3 — scrapeStats returns null ───────────────────────────────

describe('Cache Branch 3 — scrapeStats returns null', () => {
  beforeEach(() => {
    readModuleCache.mockReturnValue(null);
    isFresh.mockReturnValue(false);
    scrapeStats.mockResolvedValue(null);
  });

  test('returns 404 "Profile not found"', async () => {
    const res = await request(app).post(URL).send({ modules: { agents: {} } });
    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/Profile not found/);
  });

  test('writeModuleCache not called', async () => {
    await request(app).post(URL).send({ modules: { agents: {} } });
    expect(writeModuleCache).not.toHaveBeenCalled();
  });
});

// ─── Cache Branch 3 — agents empty array ────────────────────────────────────

describe('Cache Branch 3 — agents empty array', () => {
  beforeEach(() => {
    readModuleCache.mockReturnValue(null);
    isFresh.mockReturnValue(false);
  });

  test('agents in modules + rawData.agents === [] → 404', async () => {
    scrapeStats.mockResolvedValue({ agents: [] });
    const res = await request(app).post(URL).send({ modules: { agents: {} } });
    expect(res.status).toBe(404);
  });

  test('agents NOT in modules + rawData.agents === [] → 200', async () => {
    scrapeStats.mockResolvedValue({ rank: RANK_DATA, agents: [] });
    const res = await request(app).post(URL).send({ modules: { rank: {} } });
    expect(res.status).toBe(200);
  });

  test('agents with 1+ entries → 200', async () => {
    scrapeStats.mockResolvedValue({ agents: [AGENTS_DATA[0]] });
    const res = await request(app).post(URL).send({ modules: { agents: {} } });
    expect(res.status).toBe(200);
  });
});

// ─── Cache Branch 3 — scrapeStats throws ────────────────────────────────────

describe('Cache Branch 3 — scrapeStats throws', () => {
  test('returns 502 with original error message in body.error', async () => {
    readModuleCache.mockReturnValue(null);
    isFresh.mockReturnValue(false);
    scrapeStats.mockRejectedValue(new Error('Apify request failed: timeout'));
    const res = await request(app).post(URL).send({ modules: { agents: {} } });
    expect(res.status).toBe(502);
    expect(res.body.error).toContain('Apify request failed: timeout');
  });
});

// ─── Playlist resolution ─────────────────────────────────────────────────────

describe('Playlist resolution', () => {
  beforeEach(() => {
    readModuleCache.mockReturnValue(null);
    isFresh.mockReturnValue(false);
    scrapeStats.mockResolvedValue({ agents: AGENTS_DATA });
  });

  test('per-module playlist overrides top-level → scrapeStats called with per-module playlist', async () => {
    await request(app).post(URL).send({
      playlist: 'competitive',
      modules: { agents: { playlist: 'unrated' } },
    });
    expect(scrapeStats).toHaveBeenCalledWith(USERNAME, 'unrated', ['agents']);
  });

  test('rank always resolves to competitive even when top-level is unrated', async () => {
    scrapeStats.mockResolvedValue({ rank: RANK_DATA });
    await request(app).post(URL).send({
      playlist: 'unrated',
      modules: { rank: {} },
    });
    expect(scrapeStats).toHaveBeenCalledWith(USERNAME, 'competitive', ['rank']);
  });

  test('dynamic module uses top-level playlist when no per-module override', async () => {
    await request(app).post(URL).send({
      playlist: 'unrated',
      modules: { agents: {} },
    });
    expect(scrapeStats).toHaveBeenCalledWith(USERNAME, 'unrated', ['agents']);
  });

  test('priority order: module-level > definition-level > top-level', async () => {
    // rank has definition-level='competitive'; override with module-level='unrated'
    scrapeStats.mockResolvedValue({ rank: RANK_DATA });
    await request(app).post(URL).send({
      playlist: 'competitive',
      modules: { rank: { playlist: 'unrated' } },
    });
    expect(scrapeStats).toHaveBeenCalledWith(USERNAME, 'unrated', ['rank']);
  });

  test('two modules same resolved playlist → one scrapeStats call with both', async () => {
    scrapeStats.mockResolvedValue({ agents: AGENTS_DATA, maps: MAPS_DATA });
    await request(app).post(URL).send({
      playlist: 'competitive',
      modules: { agents: {}, maps: {} },
    });
    // Both agents and maps resolve to competitive → one call
    expect(scrapeStats).toHaveBeenCalledTimes(1);
    const modules = scrapeStats.mock.calls[0][2];
    expect(modules).toContain('agents');
    expect(modules).toContain('maps');
  });

  test('two modules different resolved playlists → two scrapeStats calls', async () => {
    scrapeStats
      .mockResolvedValueOnce({ agents: AGENTS_DATA })
      .mockResolvedValueOnce({ maps: MAPS_DATA });
    await request(app).post(URL).send({
      playlist: 'competitive',
      modules: {
        agents: { playlist: 'unrated' },
        maps: { playlist: 'competitive' },
      },
    });
    expect(scrapeStats).toHaveBeenCalledTimes(2);
  });
});

// ─── Limit application ───────────────────────────────────────────────────────

describe('Limit application', () => {
  test('agents with limit: 3 → body.data.agents.length === 3', async () => {
    readModuleCache.mockReturnValue(null);
    isFresh.mockReturnValue(false);
    scrapeStats.mockResolvedValue({ agents: AGENTS_DATA }); // 3 agents
    const res = await request(app).post(URL).send({ modules: { agents: { limit: 2 } } });
    expect(res.body.data.agents).toHaveLength(2);
  });

  test('no limit → full array returned', async () => {
    readModuleCache.mockReturnValue(null);
    isFresh.mockReturnValue(false);
    scrapeStats.mockResolvedValue({ agents: AGENTS_DATA });
    const res = await request(app).post(URL).send({ modules: { agents: {} } });
    expect(res.body.data.agents).toHaveLength(AGENTS_DATA.length);
  });

  test('limit > array length → no error, full array', async () => {
    readModuleCache.mockReturnValue(null);
    isFresh.mockReturnValue(false);
    scrapeStats.mockResolvedValue({ agents: AGENTS_DATA });
    const res = await request(app).post(URL).send({ modules: { agents: { limit: 100 } } });
    expect(res.status).toBe(200);
    expect(res.body.data.agents).toHaveLength(AGENTS_DATA.length);
  });

  test('maps limited independently', async () => {
    readModuleCache.mockReturnValue(null);
    isFresh.mockReturnValue(false);
    scrapeStats.mockResolvedValue({ maps: MAPS_DATA });
    const res = await request(app).post(URL).send({ modules: { maps: { limit: 2 } } });
    expect(res.body.data.maps).toHaveLength(2);
  });

  test('multiple modules limited independently in same request', async () => {
    readModuleCache.mockReturnValue(null);
    isFresh.mockReturnValue(false);
    scrapeStats.mockResolvedValue({ agents: AGENTS_DATA, maps: MAPS_DATA });
    const res = await request(app).post(URL).send({
      modules: { agents: { limit: 1 }, maps: { limit: 2 } },
    });
    expect(res.body.data.agents).toHaveLength(1);
    expect(res.body.data.maps).toHaveLength(2);
  });

  test('limit applied on fresh-cache path', async () => {
    readModuleCache.mockReturnValue(freshEntry('agents', AGENTS_DATA));
    isFresh.mockReturnValue(true);
    const res = await request(app).post(URL).send({ modules: { agents: { limit: 1 } } });
    expect(res.body.data.agents).toHaveLength(1);
  });

  test('limit applied on stale-cache path', async () => {
    readModuleCache.mockReturnValue(staleEntry('agents', AGENTS_DATA));
    isFresh.mockReturnValue(false);
    scrapeStats.mockResolvedValue({ agents: AGENTS_DATA });
    const res = await request(app).post(URL).send({ modules: { agents: { limit: 1 } } });
    expect(res.body.data.agents).toHaveLength(1);
  });

  test('rank (object, not array) with limit: 1 → rank object unchanged', async () => {
    readModuleCache.mockReturnValue(null);
    isFresh.mockReturnValue(false);
    scrapeStats.mockResolvedValue({ rank: RANK_DATA });
    const res = await request(app).post(URL).send({ modules: { rank: { limit: 1 } } });
    expect(res.status).toBe(200);
    expect(res.body.data.rank).toEqual(RANK_DATA);
  });
});
