'use strict';

process.env.TRACKED_USERNAMES = 'Spider31415#6921';

jest.mock('../src/snapshotStore');
jest.mock('../src/logger');

const request = require('supertest');
const { version } = require('../package.json');
const { REFRESH_INTERVAL_MS } = require('../src/config');
const { readSnapshot } = require('../src/snapshotStore');
const { createApp } = require('../src/app');

const USERNAME = 'Spider31415#6921';
const ENCODED_USERNAME = encodeURIComponent(USERNAME);
const VALID_API_KEY = 'test-api-key';

const SNAPSHOT = {
  username: USERNAME,
  lastRefreshedAt: '2026-05-19T10:00:00.000Z',
  status: 'ok',
  data: {
    competitive: {
      rank: { current: { rank: 'Gold 2', icon: null }, peak: { rank: 'Plat 1', icon: null } },
      agents: [{ agent: 'Jett' }],
      maps: [{ map: 'Ascent' }],
    },
    unrated: {
      agents: [{ agent: 'Phoenix' }],
      maps: [{ map: 'Lotus' }],
    },
    shared: {
      totalPlaytime: { total: '1,243 hours' },
    },
    profile: {
      accountLevel: 514,
      region: 'ap',
      card: { id: 'card-id', name: 'VCT x SEN Card' },
      title: { id: 'title-id', name: 'Gnarly Title', displayText: 'Gnarly' },
    },
  },
};

describe('app route wiring', () => {
  let app;

  beforeEach(() => {
    readSnapshot.mockReturnValue(SNAPSHOT);
    app = createApp({
      startTime: Date.parse('2026-05-19T10:00:00.000Z'),
      validKeys: [VALID_API_KEY],
    });
  });

  test('health endpoint is public and namespaced', async () => {
    const res = await request(app).get('/valorant/health');

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.version).toBe(version);
    expect(typeof res.body.uptime).toBe('number');
  });

  test('docs endpoint is public and uses the namespaced base url', async () => {
    const res = await request(app).get('/valorant/docs').set('Host', 'api.example.test');

    expect(res.status).toBe(200);
    expect(res.text).toContain('Base URL: http://api.example.test/valorant');
    expect(res.text).toContain('http://api.example.test/valorant/stats/');
    expect(res.text).toContain('http://api.example.test/valorant/health');
    expect(res.text).toContain('http://api.example.test/valorant/llms.txt');
  });

  test('llms endpoint is public and includes version and base url', async () => {
    const res = await request(app).get('/valorant/llms.txt').set('Host', 'api.example.test');

    expect(res.status).toBe(200);
    expect(res.text).toContain(`Version: ${version}`);
    expect(res.text).toContain('Base URL: http://api.example.test/valorant');
    expect(res.text).toContain('Endpoint:\n  POST /stats/:username');
    expect(res.text).toContain(`Example: ${ENCODED_USERNAME}`);
  });

  test('stats endpoint requires an API key', async () => {
    const res = await request(app)
      .post(`/valorant/stats/${ENCODED_USERNAME}`)
      .send({ modules: { agents: {} } });

    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: 'Invalid or missing API key' });
  });

  test('stats endpoint works with a valid API key', async () => {
    const res = await request(app)
      .post(`/valorant/stats/${ENCODED_USERNAME}`)
      .set('X-API-Key', VALID_API_KEY)
      .send({ modules: { agents: {}, totalPlaytime: {}, profile: {} } });

    expect(res.status).toBe(200);
    expect(res.body.username).toBe(USERNAME);
    expect(res.body.cachedAt).toBe(SNAPSHOT.lastRefreshedAt);
    expect(res.body.nextRefreshAt).toBe(
      new Date(Date.parse(SNAPSHOT.lastRefreshedAt) + REFRESH_INTERVAL_MS).toISOString()
    );
    expect(res.body.data.agents).toEqual(SNAPSHOT.data.competitive.agents);
    expect(res.body.data.totalPlaytime).toEqual(SNAPSHOT.data.shared.totalPlaytime);
    expect(res.body.data.profile).toEqual(SNAPSHOT.data.profile);
  });

  test('legacy public routes now 404', async () => {
    const [healthRes, docsRes, llmsRes] = await Promise.all([
      request(app).get('/health'),
      request(app).get('/docs'),
      request(app).get('/llms.txt'),
    ]);

    expect(healthRes.status).toBe(404);
    expect(docsRes.status).toBe(404);
    expect(llmsRes.status).toBe(404);
    expect(healthRes.body).toEqual({ error: 'Not found' });
    expect(docsRes.body).toEqual({ error: 'Not found' });
    expect(llmsRes.body).toEqual({ error: 'Not found' });
  });
});
