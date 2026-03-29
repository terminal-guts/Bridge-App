/**
 * Rate limiting helper - tracks action timestamps
 */
export class RateLimiter {
  private actionTimestamps: Map<string, number[]> = new Map();

  /**
   * Check if an action is allowed based on rate limit
   * @param actionKey Unique identifier for the action (e.g., 'vote', 'submit-proposal')
   * @param maxActions Maximum number of actions allowed
   * @param windowMs Time window in milliseconds
   * @returns true if action is allowed, false if rate limited
   */
  isAllowed(actionKey: string, maxActions: number, windowMs: number): boolean {
    const now = Date.now();
    const timestamps = this.actionTimestamps.get(actionKey) || [];

    // Remove timestamps outside the window
    const validTimestamps = timestamps.filter(ts => now - ts < windowMs);

    // Check if under the limit
    if (validTimestamps.length >= maxActions) {
      return false;
    }

    // Add current timestamp
    validTimestamps.push(now);
    this.actionTimestamps.set(actionKey, validTimestamps);

    return true;
  }

  /**
   * Reset rate limit for a specific action
   */
  reset(actionKey: string): void {
    this.actionTimestamps.delete(actionKey);
  }

  /**
   * Clear all rate limits
   */
  clearAll(): void {
    this.actionTimestamps.clear();
  }
}
