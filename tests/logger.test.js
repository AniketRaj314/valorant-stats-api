'use strict';

describe('logger', () => {
  let consoleSpy;
  let log;
  let formatDuration;

  beforeEach(() => {
    jest.resetModules();
    consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    ({ log, formatDuration } = require('../src/logger'));
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  test('calls console.log exactly once', () => {
    log('TEST', 'hello world');
    expect(consoleSpy).toHaveBeenCalledTimes(1);
  });

  test('output contains [LABEL]', () => {
    log('MYLABEL', 'some message');
    const output = consoleSpy.mock.calls[0][0];
    expect(output).toContain('[MYLABEL]');
  });

  test('known labels include emoji prefixes', () => {
    log('INIT', 'booting');
    const output = consoleSpy.mock.calls[0][0];
    expect(output).toContain('🚀 [INIT]');
  });

  test('output contains the message', () => {
    log('X', 'the quick brown fox');
    const output = consoleSpy.mock.calls[0][0];
    expect(output).toContain('the quick brown fox');
  });

  test('timestamp format [DD/MM/YY HH:MM:SS] with pinned Date', () => {
    // Pin to 2024-06-15 09:05:03 UTC
    const pinned = new Date('2024-06-15T09:05:03.000Z');
    const OriginalDate = Date;
    const MockDate = class extends OriginalDate {
      constructor(...args) {
        if (args.length === 0) return pinned;
        super(...args);
      }
    };
    global.Date = MockDate;

    jest.resetModules();
    const { log: pinnedLog } = require('../src/logger');
    pinnedLog('TS', 'test');
    global.Date = OriginalDate;

    const output = consoleSpy.mock.calls[0][0];
    // Match [DD/MM/YY HH:MM:SS]
    expect(output).toMatch(/\[\d{2}\/\d{2}\/\d{2} \d{2}:\d{2}:\d{2}\]/);
  });

  test('single-digit values zero-padded', () => {
    // Use a date with single-digit day, month, hour, minute, second
    const pinned = new Date(2024, 0, 5, 9, 3, 7); // Jan 5 2024, 09:03:07
    const OriginalDate = Date;
    const MockDate = class extends OriginalDate {
      constructor(...args) {
        if (args.length === 0) return pinned;
        super(...args);
      }
    };
    global.Date = MockDate;

    jest.resetModules();
    const { log: paddedLog } = require('../src/logger');
    paddedLog('PAD', 'padding test');
    global.Date = OriginalDate;

    const output = consoleSpy.mock.calls[0][0];
    // Day=05, Month=01, Hour=09, Minute=03, Second=07
    expect(output).toContain('05/01/24 09:03:07');
  });

  test('formatDuration omits 0 days and formats dhms', () => {
    expect(formatDuration(3661000)).toBe('1h 1m 1s');
    expect(formatDuration(90061000)).toBe('1d 1h 1m 1s');
    expect(formatDuration(45000)).toBe('45s');
  });
});
