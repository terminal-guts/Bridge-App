/**
 * US Central Time helpers — pure UTC arithmetic, no Intl dependency.
 *
 * Hermes (React Native's JS engine) can return 12-hour values from
 * Intl.DateTimeFormat even with hour12:false, so these helpers avoid Intl
 * entirely and compute DST boundaries from known US rules.
 */

/**
 * Returns the UTC offset (hours behind UTC) for US Central Time at a given UTC timestamp.
 * CDT (UTC-5): 2nd Sunday of March 2:00 AM CT → 1st Sunday of November 2:00 AM CT
 * CST (UTC-6): rest of the year
 */
export function getCentralOffsetHours(utcMs: number): number {
  const d = new Date(utcMs);
  const year = d.getUTCFullYear();

  // 2nd Sunday of March at 2 AM CST = 8 AM UTC
  const mar1Day = new Date(Date.UTC(year, 2, 1)).getUTCDay();
  const secondSunMar = mar1Day === 0 ? 8 : 14 - mar1Day + 1;
  const dstStart = Date.UTC(year, 2, secondSunMar, 8, 0, 0);

  // 1st Sunday of November at 2 AM CDT = 7 AM UTC
  const nov1Day = new Date(Date.UTC(year, 10, 1)).getUTCDay();
  const firstSunNov = nov1Day === 0 ? 1 : 8 - nov1Day;
  const dstEnd = Date.UTC(year, 10, firstSunNov, 7, 0, 0);

  return (utcMs >= dstStart && utcMs < dstEnd) ? 5 : 6; // CDT=5, CST=6
}

/**
 * Returns the UTC timestamp (ms) of the next 7 PM US Central Time.
 *
 * Pure UTC arithmetic — does NOT depend on Intl.DateTimeFormat.
 * Correctly handles CST ↔ CDT transitions, including the case where
 * "today" and "tomorrow" straddle a DST boundary.
 */
export function getNext7PMCentral(): number {
  const nowMs = Date.now();
  const d = new Date(nowMs);
  const todayMidnightUTC = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());

  // Try today and tomorrow (covers all edge cases including DST transitions).
  for (let dayAdd = 0; dayAdd <= 1; dayAdd++) {
    const baseMidnight = todayMidnightUTC + dayAdd * 86400000;
    // 7 PM Central in UTC = midnight + (19 + offset) hours
    // The offset depends on whether the *target time* falls in DST.
    // Try the CST candidate first, then CDT (one of them is always correct).
    for (const offset of [6, 5]) {
      const candidate = baseMidnight + (19 + offset) * 3600000;
      // Verify this candidate actually falls in the timezone that matches `offset`
      if (getCentralOffsetHours(candidate) === offset && candidate > nowMs) {
        return candidate;
      }
    }
  }

  // Should never reach here, but just in case — 24h from now.
  return nowMs + 86400000;
}
