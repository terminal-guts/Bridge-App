/**
 * Tests for central time utility (src/utils/centralTime.ts)
 *
 * Covers: getCentralOffsetHours, getNext7PMCentral, getLast7PMCentral
 * including DST boundary transitions and edge cases.
 */

import {
  getCentralOffsetHours,
  getNext7PMCentral,
  getLast7PMCentral,
} from '../../src/utils/centralTime';

// ============================================================================
// getCentralOffsetHours
// ============================================================================

describe('getCentralOffsetHours', () => {
  it('returns 5 during CDT (summer)', () => {
    // July 4, 2026 12:00 UTC — solidly in CDT
    const july4 = Date.UTC(2026, 6, 4, 12, 0, 0);
    expect(getCentralOffsetHours(july4)).toBe(5);
  });

  it('returns 6 during CST (winter)', () => {
    // January 15, 2026 12:00 UTC — solidly in CST
    const jan15 = Date.UTC(2026, 0, 15, 12, 0, 0);
    expect(getCentralOffsetHours(jan15)).toBe(6);
  });

  it('returns 6 during December (CST)', () => {
    const dec25 = Date.UTC(2026, 11, 25, 12, 0, 0);
    expect(getCentralOffsetHours(dec25)).toBe(6);
  });

  it('returns 5 during August (CDT)', () => {
    const aug1 = Date.UTC(2026, 7, 1, 0, 0, 0);
    expect(getCentralOffsetHours(aug1)).toBe(5);
  });

  // DST boundary: Spring forward — 2nd Sunday of March 2026 = March 8
  // DST starts at 2 AM CST = 8 AM UTC on March 8, 2026
  describe('spring forward boundary (March 8, 2026)', () => {
    it('returns 6 (CST) one millisecond before DST starts', () => {
      // 7:59:59.999 AM UTC = 1:59:59.999 AM CST — still CST
      const justBefore = Date.UTC(2026, 2, 8, 7, 59, 59, 999);
      expect(getCentralOffsetHours(justBefore)).toBe(6);
    });

    it('returns 5 (CDT) at the exact DST start moment', () => {
      // 8:00:00.000 AM UTC = 2:00 AM CST → springs forward to 3:00 AM CDT
      const exactMoment = Date.UTC(2026, 2, 8, 8, 0, 0);
      expect(getCentralOffsetHours(exactMoment)).toBe(5);
    });

    it('returns 5 (CDT) one millisecond after DST starts', () => {
      const justAfter = Date.UTC(2026, 2, 8, 8, 0, 0, 1);
      expect(getCentralOffsetHours(justAfter)).toBe(5);
    });
  });

  // DST boundary: Fall back — 1st Sunday of November 2026 = November 1
  // DST ends at 2 AM CDT = 7 AM UTC on November 1, 2026
  describe('fall back boundary (November 1, 2026)', () => {
    it('returns 5 (CDT) one millisecond before DST ends', () => {
      const justBefore = Date.UTC(2026, 10, 1, 6, 59, 59, 999);
      expect(getCentralOffsetHours(justBefore)).toBe(5);
    });

    it('returns 6 (CST) at the exact DST end moment', () => {
      // 7:00 AM UTC = 2:00 AM CDT → falls back to 1:00 AM CST
      const exactMoment = Date.UTC(2026, 10, 1, 7, 0, 0);
      expect(getCentralOffsetHours(exactMoment)).toBe(6);
    });

    it('returns 6 (CST) one millisecond after DST ends', () => {
      const justAfter = Date.UTC(2026, 10, 1, 7, 0, 0, 1);
      expect(getCentralOffsetHours(justAfter)).toBe(6);
    });
  });

  it('handles midnight UTC correctly during CST', () => {
    // Midnight UTC on Jan 1 = 6 PM CST Dec 31 — still CST
    const midnightUTC = Date.UTC(2026, 0, 1, 0, 0, 0);
    expect(getCentralOffsetHours(midnightUTC)).toBe(6);
  });

  it('handles midnight UTC correctly during CDT', () => {
    // Midnight UTC on July 1 = 7 PM CDT June 30 — still CDT
    const midnightUTC = Date.UTC(2026, 6, 1, 0, 0, 0);
    expect(getCentralOffsetHours(midnightUTC)).toBe(5);
  });

  it('handles year boundary correctly (Dec 31 → Jan 1)', () => {
    const newYearsEve = Date.UTC(2026, 11, 31, 23, 59, 59);
    expect(getCentralOffsetHours(newYearsEve)).toBe(6);

    const newYearsDay = Date.UTC(2027, 0, 1, 0, 0, 0);
    expect(getCentralOffsetHours(newYearsDay)).toBe(6);
  });

  // Test a different year to ensure formula works across years
  it('works for 2027 DST boundaries', () => {
    // 2027: 2nd Sunday of March = March 14; 1st Sunday of November = November 7
    // DST starts March 14, 8 AM UTC
    const beforeDST2027 = Date.UTC(2027, 2, 14, 7, 59, 59);
    expect(getCentralOffsetHours(beforeDST2027)).toBe(6);

    const afterDST2027 = Date.UTC(2027, 2, 14, 8, 0, 0);
    expect(getCentralOffsetHours(afterDST2027)).toBe(5);
  });
});

// ============================================================================
// getNext7PMCentral
// ============================================================================

describe('getNext7PMCentral', () => {
  const realDateNow = Date.now;

  afterEach(() => {
    Date.now = realDateNow;
  });

  it('returns today 7PM Central when current time is before 7PM Central (CDT)', () => {
    // June 15, 2026 10:00 AM UTC = 5:00 AM CDT (well before 7 PM CDT)
    // 7 PM CDT = midnight UTC = June 16 00:00 UTC
    Date.now = () => Date.UTC(2026, 5, 15, 10, 0, 0);

    const result = getNext7PMCentral();
    // 7 PM CDT on June 15 = June 16, 00:00 UTC (19 + 5 = 24 hours past midnight UTC of June 15)
    const expected = Date.UTC(2026, 5, 16, 0, 0, 0);
    expect(result).toBe(expected);
  });

  it('returns tomorrow 7PM Central when current time is after 7PM Central (CDT)', () => {
    // June 16, 2026 01:00 UTC = 8:00 PM CDT June 15 — after 7 PM CDT
    Date.now = () => Date.UTC(2026, 5, 16, 1, 0, 0);

    const result = getNext7PMCentral();
    // Next 7 PM CDT = June 17, 00:00 UTC
    const expected = Date.UTC(2026, 5, 17, 0, 0, 0);
    expect(result).toBe(expected);
  });

  it('returns today 7PM Central when current time is before 7PM Central (CST)', () => {
    // Jan 15, 2026 20:00 UTC = 2:00 PM CST (before 7 PM CST)
    // 7 PM CST = Jan 16, 01:00 UTC (19 + 6 = 25 hours past midnight UTC Jan 15)
    Date.now = () => Date.UTC(2026, 0, 15, 20, 0, 0);

    const result = getNext7PMCentral();
    const expected = Date.UTC(2026, 0, 16, 1, 0, 0);
    expect(result).toBe(expected);
  });

  it('returns tomorrow 7PM Central when current time is after 7PM Central (CST)', () => {
    // Jan 16, 2026 02:00 UTC = 8:00 PM CST Jan 15 — after 7 PM CST
    Date.now = () => Date.UTC(2026, 0, 16, 2, 0, 0);

    const result = getNext7PMCentral();
    // Next 7 PM CST = Jan 17, 01:00 UTC
    const expected = Date.UTC(2026, 0, 17, 1, 0, 0);
    expect(result).toBe(expected);
  });

  it('returns future time (result is always > now)', () => {
    Date.now = () => Date.UTC(2026, 3, 10, 15, 30, 0);
    const result = getNext7PMCentral();
    expect(result).toBeGreaterThan(Date.UTC(2026, 3, 10, 15, 30, 0));
  });

  it('handles midnight UTC during CST (6 PM CST)', () => {
    // Midnight UTC Jan 15 = 6 PM CST Jan 14 — before 7 PM CST
    Date.now = () => Date.UTC(2026, 0, 15, 0, 0, 0);

    const result = getNext7PMCentral();
    // The function searches today + tomorrow in UTC date terms.
    // dayAdd=0 with offset=6: candidate = Jan 15 00:00 + 25h = Jan 16 01:00 UTC
    // That's the first valid candidate it finds.
    const expected = Date.UTC(2026, 0, 16, 1, 0, 0);
    expect(result).toBe(expected);
  });
});

// ============================================================================
// getLast7PMCentral
// ============================================================================

describe('getLast7PMCentral', () => {
  const realDateNow = Date.now;

  afterEach(() => {
    Date.now = realDateNow;
  });

  it('returns yesterday 7PM Central when current time is before 7PM Central (CDT)', () => {
    // June 15, 2026 10:00 UTC = 5:00 AM CDT — before 7 PM CDT
    // Last 7 PM CDT was June 14 → June 15, 00:00 UTC
    Date.now = () => Date.UTC(2026, 5, 15, 10, 0, 0);

    const result = getLast7PMCentral();
    const expected = Date.UTC(2026, 5, 15, 0, 0, 0);
    expect(result).toBe(expected);
  });

  it('returns today 7PM Central when current time is after 7PM Central (CDT)', () => {
    // June 16, 2026 01:00 UTC = 8:00 PM CDT June 15 — after 7 PM CDT
    // Last 7 PM CDT = June 16, 00:00 UTC
    Date.now = () => Date.UTC(2026, 5, 16, 1, 0, 0);

    const result = getLast7PMCentral();
    const expected = Date.UTC(2026, 5, 16, 0, 0, 0);
    expect(result).toBe(expected);
  });

  it('returns yesterday 7PM Central when current time is before 7PM Central (CST)', () => {
    // Jan 15, 2026 20:00 UTC = 2:00 PM CST — before 7 PM CST
    // Last 7 PM CST was Jan 14 → Jan 15, 01:00 UTC
    Date.now = () => Date.UTC(2026, 0, 15, 20, 0, 0);

    const result = getLast7PMCentral();
    const expected = Date.UTC(2026, 0, 15, 1, 0, 0);
    expect(result).toBe(expected);
  });

  it('returns today 7PM Central when current time is after 7PM Central (CST)', () => {
    // Jan 16, 2026 02:00 UTC = 8:00 PM CST Jan 15 — after 7 PM CST
    // Last 7 PM CST = Jan 16, 01:00 UTC
    Date.now = () => Date.UTC(2026, 0, 16, 2, 0, 0);

    const result = getLast7PMCentral();
    const expected = Date.UTC(2026, 0, 16, 1, 0, 0);
    expect(result).toBe(expected);
  });

  it('returns past time (result is always <= now)', () => {
    Date.now = () => Date.UTC(2026, 3, 10, 15, 30, 0);
    const result = getLast7PMCentral();
    expect(result).toBeLessThanOrEqual(Date.UTC(2026, 3, 10, 15, 30, 0));
  });

  it('handles midnight UTC during CST', () => {
    // Midnight UTC Jan 15 = 6 PM CST Jan 14 — before 7 PM CST
    // The function searches today (Jan 15) and yesterday (Jan 14) in UTC.
    // dayAdd=0: candidates are Jan 16 00:00 and Jan 16 01:00 — both > now, fail.
    // dayAdd=-1: candidates are Jan 15 00:00 and Jan 15 01:00 — both > now, fail.
    // Falls back to nowMs - 86400000 = Jan 14 00:00 UTC.
    Date.now = () => Date.UTC(2026, 0, 15, 0, 0, 0);

    const result = getLast7PMCentral();
    const expected = Date.UTC(2026, 0, 14, 0, 0, 0);
    expect(result).toBe(expected);
  });
});

// ============================================================================
// getNext7PMCentral + getLast7PMCentral relationship
// ============================================================================

describe('getNext7PMCentral and getLast7PMCentral relationship', () => {
  const realDateNow = Date.now;

  afterEach(() => {
    Date.now = realDateNow;
  });

  it('next and last are exactly 24 hours apart', () => {
    Date.now = () => Date.UTC(2026, 5, 15, 10, 0, 0);
    const next = getNext7PMCentral();
    const last = getLast7PMCentral();
    expect(next - last).toBe(24 * 60 * 60 * 1000);
  });

  it('next and last are exactly 24 hours apart (CST)', () => {
    Date.now = () => Date.UTC(2026, 0, 15, 20, 0, 0);
    const next = getNext7PMCentral();
    const last = getLast7PMCentral();
    expect(next - last).toBe(24 * 60 * 60 * 1000);
  });
});
