'use strict';

jest.mock('fs');

const fs = require('fs');

// Require cache once — it shares the same mocked fs module instance
const cache = require('../src/cache');

beforeEach(() => {
  // clearMocks:true in jest config resets call counts; we just need to set implementations
  fs.existsSync = jest.fn().mockReturnValue(true);
  fs.mkdirSync = jest.fn();
  fs.readFileSync = jest.fn();
  fs.writeFileSync = jest.fn();
});

afterEach(() => {
  delete process.env.CACHE_TTL_HOURS;
});

// ─── moduleCacheKey (tested indirectly via readFileSync / writeFileSync paths) ─

describe('moduleCacheKey', () => {
  test('clean username maps to expected filename segments', () => {
    fs.readFileSync.mockReturnValue(JSON.stringify({ cachedAt: new Date().toISOString(), data: { agents: [] } }));
    cache.readModuleCache('Spider31415#6921', 'competitive', 'agents');
    const calledPath = fs.readFileSync.mock.calls[0][0];
    expect(calledPath).toContain('Spider31415_6921_competitive_agents.json');
  });

  test('sanitizes spaces, slashes, colons to _', () => {
    fs.readFileSync.mockReturnValue(JSON.stringify({ cachedAt: new Date().toISOString(), data: { rank: {} } }));
    cache.readModuleCache('User Name/Test:User', 'competitive', 'rank');
    const calledPath = fs.readFileSync.mock.calls[0][0];
    expect(calledPath).toContain('User_Name_Test_User_competitive_rank.json');
  });

  test('consecutive special chars each replaced individually', () => {
    fs.readFileSync.mockReturnValue(JSON.stringify({ cachedAt: new Date().toISOString(), data: { rank: {} } }));
    cache.readModuleCache('A##B', 'competitive', 'rank');
    const calledPath = fs.readFileSync.mock.calls[0][0];
    expect(calledPath).toContain('A__B_competitive_rank.json');
  });
});

// ─── isFresh ────────────────────────────────────────────────────────────────

describe('isFresh', () => {
  const T = new Date('2024-01-01T12:00:00.000Z').getTime();
  let dateSpy;

  beforeEach(() => {
    dateSpy = jest.spyOn(Date, 'now').mockReturnValue(T);
  });

  afterEach(() => {
    dateSpy.mockRestore();
  });

  test('true when 1ms old (within default 6h TTL)', () => {
    expect(cache.isFresh(new Date(T - 1).toISOString())).toBe(true);
  });

  test('true when 5h old', () => {
    expect(cache.isFresh(new Date(T - 5 * 60 * 60 * 1000).toISOString())).toBe(true);
  });

  test('false at exactly 6h (boundary is strict <)', () => {
    expect(cache.isFresh(new Date(T - 6 * 60 * 60 * 1000).toISOString())).toBe(false);
  });

  test('false when 7h old', () => {
    expect(cache.isFresh(new Date(T - 7 * 60 * 60 * 1000).toISOString())).toBe(false);
  });

  test('respects CACHE_TTL_HOURS=1: 30min → true, 90min → false', () => {
    process.env.CACHE_TTL_HOURS = '1';
    expect(cache.isFresh(new Date(T - 30 * 60 * 1000).toISOString())).toBe(true);
    expect(cache.isFresh(new Date(T - 90 * 60 * 1000).toISOString())).toBe(false);
  });

  test('fractional CACHE_TTL_HOURS=0.5: 29min → true, 31min → false', () => {
    process.env.CACHE_TTL_HOURS = '0.5';
    expect(cache.isFresh(new Date(T - 29 * 60 * 1000).toISOString())).toBe(true);
    expect(cache.isFresh(new Date(T - 31 * 60 * 1000).toISOString())).toBe(false);
  });

  test('falls back to 6h when CACHE_TTL_HOURS is invalid', () => {
    process.env.CACHE_TTL_HOURS = 'bad';
    expect(cache.isFresh(new Date(T - 5 * 60 * 60 * 1000).toISOString())).toBe(true);
    expect(cache.isFresh(new Date(T - 7 * 60 * 60 * 1000).toISOString())).toBe(false);
  });
});

// ─── readModuleCache ─────────────────────────────────────────────────────────

describe('readModuleCache', () => {
  test('returns parsed object when file exists', () => {
    const payload = { cachedAt: '2024-01-01T00:00:00Z', data: { agents: [{ agent: 'Jett' }] } };
    fs.readFileSync.mockReturnValue(JSON.stringify(payload));
    expect(cache.readModuleCache('User#1234', 'competitive', 'agents')).toEqual(payload);
  });

  test('returns null when readFileSync throws (ENOENT)', () => {
    fs.readFileSync.mockImplementation(() => {
      throw Object.assign(new Error('ENOENT'), { code: 'ENOENT' });
    });
    expect(cache.readModuleCache('User#1234', 'competitive', 'agents')).toBeNull();
  });

  test('returns null when file content is invalid JSON', () => {
    fs.readFileSync.mockReturnValue('not json {{{');
    expect(cache.readModuleCache('User#1234', 'competitive', 'agents')).toBeNull();
  });
});

// ─── writeModuleCache ────────────────────────────────────────────────────────

describe('writeModuleCache', () => {
  test('calls mkdirSync with recursive:true when cache dir missing', () => {
    fs.existsSync.mockReturnValue(false);
    cache.writeModuleCache('User#1', 'competitive', 'agents', []);
    expect(fs.mkdirSync).toHaveBeenCalledWith(expect.any(String), { recursive: true });
  });

  test('does NOT call mkdirSync when dir exists', () => {
    fs.existsSync.mockReturnValue(true);
    cache.writeModuleCache('User#1', 'competitive', 'agents', []);
    expect(fs.mkdirSync).not.toHaveBeenCalled();
  });

  test('written JSON has shape { cachedAt, data: { [mod]: data } }', () => {
    const data = [{ agent: 'Jett' }];
    cache.writeModuleCache('User#1', 'competitive', 'agents', data);
    const written = JSON.parse(fs.writeFileSync.mock.calls[0][1]);
    expect(written).toHaveProperty('cachedAt');
    expect(written.data).toEqual({ agents: data });
  });

  test('returns a cachedAt string', () => {
    const result = cache.writeModuleCache('User#1', 'competitive', 'agents', []);
    expect(typeof result).toBe('string');
    expect(() => new Date(result)).not.toThrow();
  });

  test('returned cachedAt matches the written cachedAt', () => {
    const returned = cache.writeModuleCache('User#1', 'competitive', 'agents', []);
    const written = JSON.parse(fs.writeFileSync.mock.calls[0][1]);
    expect(returned).toBe(written.cachedAt);
  });
});
