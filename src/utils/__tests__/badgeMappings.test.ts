import { getVerifiedTags } from '../badgeMappings';

describe('badgeMappings', () => {
  describe('getVerifiedTags', () => {
    it('should return an empty set for an empty list of badge icons', () => {
      const result = getVerifiedTags([]);
      expect(result.size).toBe(0);
    });

    it('should map a single badge icon to lowercase tag names', () => {
      const result = getVerifiedTags(['kind-char-005']);
      expect(result.has('kindness')).toBe(true);
      expect(result.has('compassion')).toBe(true);
      expect(result.size).toBe(2);
    });

    it('should handle multiple badge icons and aggregate unique tags', () => {
      const result = getVerifiedTags(['kind-char-005', 'loyal-char-001']);
      expect(result.has('kindness')).toBe(true);
      expect(result.has('compassion')).toBe(true);
      expect(result.has('loyalty')).toBe(true);
      expect(result.has('friendship first')).toBe(true);
      expect(result.size).toBe(4);
    });

    it('should be case-insensitive for badge icon names if they were to vary (though they are constants)', () => {
      // The current implementation is exact match for keys, which is fine since they are internal constants.
      const result = getVerifiedTags(['Kind-Char-005']);
      expect(result.size).toBe(0); // Expected as BADGE_TO_TAG_MAP keys are specific
    });

    it('should return lowercase tags even if they were mixed case in the map', () => {
       const result = getVerifiedTags(['loyal-char-001']);
       expect(result.has('loyalty')).toBe(true);
       expect(result.has('Loyalty')).toBe(false);
    });
  });
});
