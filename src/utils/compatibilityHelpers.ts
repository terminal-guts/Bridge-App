/**
 * Clamp a raw compatibility score (0-100) into the display range 70-99.
 * This is a frontend-only transform — no backend algorithm is changed.
 * The raw score is linearly mapped so that 0 → 70 and 100 → 99.
 */
export function clampDisplayScore(raw: number): number {
  // Linear map: displayScore = 70 + (raw / 100) * 29
  const mapped = Math.round(70 + (raw / 100) * 29);
  return Math.min(99, Math.max(70, mapped));
}

