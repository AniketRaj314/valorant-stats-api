'use strict';

process.env.TRACKED_USERNAMES = 'Spider31415#6921';

jest.mock('../../src/snapshotStore');
jest.mock('../../src/logger');

const express = require('express');
const request = require('supertest');
const { readSnapshot } = require('../../src/snapshotStore');
const { REFRESH_INTERVAL_MS, TRACKED_USERNAMES } = require('../../src/config');

const app = express();
app.use(express.json());
app.use('/valorant', require('../../src/routes/valorant'));

const USERNAME = TRACKED_USERNAMES[0] || 'Spider31415#6921';
const ENCODED_USERNAME = encodeURIComponent(USERNAME);
const URL = `/valorant/stats/${ENCODED_USERNAME}`;

const SNAPSHOT = {
  username: USERNAME,
  lastRefreshedAt: '2026-05-19T10:00:00.000Z',
  status: 'ok',
  data: {
    competitive: {
      rank: { current: { rank: 'Gold 2', icon: null }, peak: { rank: 'Plat 1', icon: null } },
      agents: [{ agent: 'Jett' }, { agent: 'Sage' }, { agent: 'Reyna' }],
      maps: [{ map: 'Ascent' }, { map: 'Bind' }, { map: 'Haven' }],
    },
    unrated: {
      agents: [{ agent: 'Phoenix' }, { agent: 'Skye' }],
      maps: [{ map: 'Lotus' }, { map: 'Sunset' }],
    },
    shared: {
      totalPlaytime: { total: '1,243 hours' },
    },
  },
};

beforeEach(() => {
  readSnapshot.mockReturnValue(SNAPSHOT);
});

describe('tracked-user behavior', () => {
  test('unknown user returns 404', async () => {
    const res = await request(app).post('/valorant/stats/SomeoneElse%231234').send({ modules: { agents: {} } });
    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/User not tracked/);
  });

  test('tracked user without snapshot returns 404', async () => {
    readSnapshot.mockReturnValue(null);
    const res = await request(app).post(URL).send({ modules: { agents: {} } });
    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/no cached snapshot yet/i);
  });
});

describe('validation', () => {
  test('missing modules returns 400', async () => {
    const res = await request(app).post(URL).send({});
    expect(res.status).toBe(400);
  });

  test('invalid top-level playlist returns 400', async () => {
    const res = await request(app).post(URL).send({ playlist: 'ranked', modules: { agents: {} } });
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('ranked');
  });

  test('invalid module returns 400', async () => {
    const res = await request(app).post(URL).send({ modules: { nope: {} } });
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('nope');
  });

  test('invalid per-module playlist returns 400', async () => {
    const res = await request(app).post(URL).send({ modules: { agents: { playlist: 'weird' } } });
    expect(res.status).toBe(400);
  });

  test('invalid limit returns 400', async () => {
    const res = await request(app).post(URL).send({ modules: { agents: { limit: 0 } } });
    expect(res.status).toBe(400);
  });
});

describe('snapshot reads', () => {
  test('returns competitive agents by default', async () => {
    const res = await request(app).post(URL).send({ modules: { agents: {} } });
    expect(res.status).toBe(200);
    expect(res.body.data.agents).toEqual(SNAPSHOT.data.competitive.agents);
    expect(res.body.cachedAt).toBe(SNAPSHOT.lastRefreshedAt);
    expect(res.body.nextRefreshAt).toBe(
      new Date(Date.parse(SNAPSHOT.lastRefreshedAt) + REFRESH_INTERVAL_MS).toISOString()
    );
  });

  test('returns unrated agents when requested', async () => {
    const res = await request(app).post(URL).send({
      playlist: 'competitive',
      modules: { agents: { playlist: 'unrated' } },
    });
    expect(res.status).toBe(200);
    expect(res.body.data.agents).toEqual(SNAPSHOT.data.unrated.agents);
  });

  test('rank always comes from competitive snapshot', async () => {
    const res = await request(app).post(URL).send({
      playlist: 'unrated',
      modules: { rank: { playlist: 'unrated' } },
    });
    expect(res.status).toBe(200);
    expect(res.body.data.rank).toEqual(SNAPSHOT.data.competitive.rank);
  });

  test('totalPlaytime comes from shared snapshot data', async () => {
    const res = await request(app).post(URL).send({
      playlist: 'unrated',
      modules: { totalPlaytime: {} },
    });
    expect(res.status).toBe(200);
    expect(res.body.data.totalPlaytime).toEqual(SNAPSHOT.data.shared.totalPlaytime);
  });

  test('multiple modules are returned together', async () => {
    const res = await request(app).post(URL).send({
      modules: { agents: { limit: 1 }, maps: { limit: 2 }, totalPlaytime: {} },
    });
    expect(res.status).toBe(200);
    expect(res.body.data.agents).toHaveLength(1);
    expect(res.body.data.maps).toHaveLength(2);
    expect(res.body.data.totalPlaytime).toEqual(SNAPSHOT.data.shared.totalPlaytime);
  });

  test('missing module data returns 404', async () => {
    const brokenSnapshot = JSON.parse(JSON.stringify(SNAPSHOT));
    brokenSnapshot.data.unrated.maps = null;
    readSnapshot.mockReturnValue(brokenSnapshot);
    const res = await request(app).post(URL).send({
      modules: { maps: { playlist: 'unrated' } },
    });
    expect(res.status).toBe(404);
    expect(res.body.error).toContain('maps');
  });
});
