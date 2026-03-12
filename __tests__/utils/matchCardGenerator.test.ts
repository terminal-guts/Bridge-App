/**
 * Tests for match card generator utility (src/utils/matchCardGenerator.ts)
 *
 * Covers: computeApprovalPercent — the hash-based decorative approval score.
 * This is a LOCKED feature per CLAUDE.md (compatibility score display).
 */

// Mock react-native-view-shot to avoid native module errors
jest.mock('react-native-view-shot', () => ({}));

import { computeApprovalPercent } from '../../src/utils/matchCardGenerator';

// ============================================================================
// computeApprovalPercent
// ============================================================================

describe('computeApprovalPercent', () => {
  describe('range validation', () => {
    it('returns a value >= 70', () => {
      const result = computeApprovalPercent('test-id');
      expect(result).toBeGreaterThanOrEqual(70);
    });

    it('returns a value <= 99', () => {
      const result = computeApprovalPercent('test-id');
      expect(result).toBeLessThanOrEqual(99);
    });

    it('returns exactly 70 for an empty string', () => {
      // Empty string: reduce starts at 0, 0 % 30 = 0, so 70 + 0 = 70
      expect(computeApprovalPercent('')).toBe(70);
    });

    it('always returns an integer', () => {
      const ids = [
        'abc', 'xyz-123', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
        '', 'x', 'ABCDEF',
      ];
      for (const id of ids) {
        const result = computeApprovalPercent(id);
        expect(Number.isInteger(result)).toBe(true);
      }
    });
  });

  describe('stability (same ID always produces same score)', () => {
    it('returns identical results on repeated calls', () => {
      const id = 'f4985c2c-5f35-40c9-94bc-d975336e8aef';
      const first = computeApprovalPercent(id);
      const second = computeApprovalPercent(id);
      const third = computeApprovalPercent(id);
      expect(first).toBe(second);
      expect(second).toBe(third);
    });

    it('is stable for various UUID-like strings', () => {
      const uuids = [
        '82d7199b-073d-48ff-8f9b-fd7a2c5203c9',
        '0e12037d-e4f2-49f0-9bd3-49c10704187c',
        '7fcb3b03-7575-4d33-bd4f-24703ef854cb',
        '7d894347-9ca8-4374-afb0-53f51056983e',
      ];
      for (const uuid of uuids) {
        expect(computeApprovalPercent(uuid)).toBe(computeApprovalPercent(uuid));
      }
    });
  });

  describe('variety (different IDs generally produce different scores)', () => {
    it('produces at least 5 distinct values from 100 random UUIDs', () => {
      const scores = new Set<number>();
      for (let i = 0; i < 100; i++) {
        // Generate pseudo-UUID-like strings
        const id = `${i.toString(16).padStart(8, '0')}-${(i * 7).toString(16).padStart(4, '0')}-4${(i * 13).toString(16).padStart(3, '0')}-${(i * 17).toString(16).padStart(4, '0')}-${(i * 23).toString(16).padStart(12, '0')}`;
        const score = computeApprovalPercent(id);
        scores.add(score);
      }
      // With 100 different inputs mapping to 30 possible values,
      // we should see good variety
      expect(scores.size).toBeGreaterThanOrEqual(5);
    });

    it('all 100 UUID scores fall within 70-99 range', () => {
      for (let i = 0; i < 100; i++) {
        const id = `test-uuid-${i}-${Math.random().toString(36).slice(2)}`;
        const score = computeApprovalPercent(id);
        expect(score).toBeGreaterThanOrEqual(70);
        expect(score).toBeLessThanOrEqual(99);
      }
    });
  });

  describe('exact formula verification (LOCKED per CLAUDE.md)', () => {
    it('matches the formula: 70 + (charCodeSum % 30)', () => {
      const testCases = ['hello', 'abc', 'match-123', 'a'];

      for (const id of testCases) {
        const charCodeSum = id.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
        const expected = 70 + (charCodeSum % 30);
        expect(computeApprovalPercent(id)).toBe(expected);
      }
    });

    it('computes correctly for single character "a" (charCode 97)', () => {
      // 97 % 30 = 7, so 70 + 7 = 77
      expect(computeApprovalPercent('a')).toBe(77);
    });

    it('computes correctly for single character "A" (charCode 65)', () => {
      // 65 % 30 = 5, so 70 + 5 = 75
      expect(computeApprovalPercent('A')).toBe(75);
    });

    it('computes correctly for "abc" (97+98+99=294)', () => {
      // 294 % 30 = 24, so 70 + 24 = 94
      expect(computeApprovalPercent('abc')).toBe(94);
    });
  });

  describe('edge cases', () => {
    it('handles very long strings', () => {
      const longId = 'x'.repeat(10000);
      const result = computeApprovalPercent(longId);
      expect(result).toBeGreaterThanOrEqual(70);
      expect(result).toBeLessThanOrEqual(99);
    });

    it('handles strings with special characters', () => {
      const specialIds = ['!@#$%^&*()', '   ', '\t\n', '🎉'];
      for (const id of specialIds) {
        const result = computeApprovalPercent(id);
        expect(result).toBeGreaterThanOrEqual(70);
        expect(result).toBeLessThanOrEqual(99);
      }
    });

    it('handles numeric strings', () => {
      const result = computeApprovalPercent('12345');
      expect(result).toBeGreaterThanOrEqual(70);
      expect(result).toBeLessThanOrEqual(99);
    });
  });
});
