import { RateLimiter } from '../inputValidation';

describe('RateLimiter', () => {
  let rateLimiter: RateLimiter;

  beforeEach(() => {
    rateLimiter = new RateLimiter();
    // Setup fake timers to mock Date.now()
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2023-01-01T00:00:00.000Z'));
  });

  afterEach(() => {
    // Restore real timers
    jest.useRealTimers();
  });

  describe('isAllowed', () => {
    it('allows actions under the maximum limit', () => {
      const actionKey = 'test-action';
      const maxActions = 3;
      const windowMs = 1000; // 1 second

      // First action
      expect(rateLimiter.isAllowed(actionKey, maxActions, windowMs)).toBe(true);
      // Second action
      expect(rateLimiter.isAllowed(actionKey, maxActions, windowMs)).toBe(true);
      // Third action
      expect(rateLimiter.isAllowed(actionKey, maxActions, windowMs)).toBe(true);
    });

    it('blocks actions when limit is reached within the window', () => {
      const actionKey = 'test-action';
      const maxActions = 2;
      const windowMs = 1000;

      // Allow up to maxActions
      expect(rateLimiter.isAllowed(actionKey, maxActions, windowMs)).toBe(true);
      expect(rateLimiter.isAllowed(actionKey, maxActions, windowMs)).toBe(true);

      // Block when limit is reached
      expect(rateLimiter.isAllowed(actionKey, maxActions, windowMs)).toBe(false);
    });

    it('allows new actions after the window expires', () => {
      const actionKey = 'test-action';
      const maxActions = 2;
      const windowMs = 1000;

      // Reach the limit
      expect(rateLimiter.isAllowed(actionKey, maxActions, windowMs)).toBe(true);
      expect(rateLimiter.isAllowed(actionKey, maxActions, windowMs)).toBe(true);
      expect(rateLimiter.isAllowed(actionKey, maxActions, windowMs)).toBe(false);

      // Advance time beyond the window
      jest.advanceTimersByTime(1001);

      // Should be allowed again
      expect(rateLimiter.isAllowed(actionKey, maxActions, windowMs)).toBe(true);
    });

    it('keeps actions isolated by key', () => {
      const key1 = 'action-1';
      const key2 = 'action-2';
      const maxActions = 1;
      const windowMs = 1000;

      // Reaching limit for key1 doesn't affect key2
      expect(rateLimiter.isAllowed(key1, maxActions, windowMs)).toBe(true);
      expect(rateLimiter.isAllowed(key1, maxActions, windowMs)).toBe(false);

      expect(rateLimiter.isAllowed(key2, maxActions, windowMs)).toBe(true);
      expect(rateLimiter.isAllowed(key2, maxActions, windowMs)).toBe(false);
    });

    it('filters out only older timestamps when checking the limit', () => {
      const actionKey = 'test-action';
      const maxActions = 2;
      const windowMs = 1000;

      // First action at t=0
      expect(rateLimiter.isAllowed(actionKey, maxActions, windowMs)).toBe(true);

      // Advance half the window, second action at t=500
      jest.advanceTimersByTime(500);
      expect(rateLimiter.isAllowed(actionKey, maxActions, windowMs)).toBe(true);

      // Limit reached
      expect(rateLimiter.isAllowed(actionKey, maxActions, windowMs)).toBe(false);

      // Advance past the first action's window but not the second
      // Currently t=500. Advancing by 501 makes t=1001.
      // First action (t=0) is expired (1001 - 0 = 1001 > 1000)
      // Second action (t=500) is valid (1001 - 500 = 501 < 1000)
      jest.advanceTimersByTime(501);

      // Now we should have 1 slot available
      expect(rateLimiter.isAllowed(actionKey, maxActions, windowMs)).toBe(true);

      // Limit reached again
      expect(rateLimiter.isAllowed(actionKey, maxActions, windowMs)).toBe(false);
    });
  });

  describe('reset', () => {
    it('clears limits for a specific action key', () => {
      const actionKey = 'test-action';
      const maxActions = 1;
      const windowMs = 1000;

      expect(rateLimiter.isAllowed(actionKey, maxActions, windowMs)).toBe(true);
      expect(rateLimiter.isAllowed(actionKey, maxActions, windowMs)).toBe(false);

      rateLimiter.reset(actionKey);

      expect(rateLimiter.isAllowed(actionKey, maxActions, windowMs)).toBe(true);
    });

    it('does not clear limits for other action keys', () => {
      const key1 = 'action-1';
      const key2 = 'action-2';
      const maxActions = 1;
      const windowMs = 1000;

      expect(rateLimiter.isAllowed(key1, maxActions, windowMs)).toBe(true);
      expect(rateLimiter.isAllowed(key2, maxActions, windowMs)).toBe(true);

      rateLimiter.reset(key1);

      expect(rateLimiter.isAllowed(key1, maxActions, windowMs)).toBe(true);
      expect(rateLimiter.isAllowed(key2, maxActions, windowMs)).toBe(false);
    });
  });

  describe('clearAll', () => {
    it('clears limits for all action keys', () => {
      const key1 = 'action-1';
      const key2 = 'action-2';
      const maxActions = 1;
      const windowMs = 1000;

      expect(rateLimiter.isAllowed(key1, maxActions, windowMs)).toBe(true);
      expect(rateLimiter.isAllowed(key2, maxActions, windowMs)).toBe(true);

      rateLimiter.clearAll();

      expect(rateLimiter.isAllowed(key1, maxActions, windowMs)).toBe(true);
      expect(rateLimiter.isAllowed(key2, maxActions, windowMs)).toBe(true);
    });
  });
});
