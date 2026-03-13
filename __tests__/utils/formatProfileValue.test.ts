/**
 * Tests for formatProfileValue utility
 */

import { formatProfileValue } from '../../src/utils/formatProfileValue';

describe('formatProfileValue', () => {
  // ── Null / undefined / empty ────────────────────────────────────────────
  describe('falsy inputs', () => {
    it('returns empty string for null', () => {
      expect(formatProfileValue(null)).toBe('');
    });

    it('returns empty string for undefined', () => {
      expect(formatProfileValue(undefined)).toBe('');
    });

    it('returns empty string for empty string', () => {
      expect(formatProfileValue('')).toBe('');
    });
  });

  // ── Snake case → Title Case ─────────────────────────────────────────────
  describe('snake_case conversion', () => {
    it('converts want_children to Want Children', () => {
      expect(formatProfileValue('want_children')).toBe('Want Children');
    });

    it('converts very_liberal to Very Liberal', () => {
      expect(formatProfileValue('very_liberal')).toBe('Very Liberal');
    });

    it('converts prefer_not_to_say to Prefer Not To Say', () => {
      expect(formatProfileValue('prefer_not_to_say')).toBe('Prefer Not To Say');
    });

    it('handles multiple underscores in a row gracefully', () => {
      // double underscore produces an extra space, but each word still capitalizes
      const result = formatProfileValue('some__value');
      expect(result).toBe('Some  Value');
    });
  });

  // ── dont → don't special case ──────────────────────────────────────────
  describe("dont → don't replacement", () => {
    it("converts dont_want_children with correct apostrophe casing", () => {
      expect(formatProfileValue('dont_want_children')).toBe("Don't Want Children");
    });

    it("handles dont at start of string", () => {
      expect(formatProfileValue('dont_care')).toBe("Don't Care");
    });

    it("handles dont at end of string", () => {
      expect(formatProfileValue('i_dont')).toBe("I Don't");
    });

    it("is case-insensitive for DONT", () => {
      expect(formatProfileValue('DONT_know')).toBe("Don't Know");
    });
  });

  // ── Single word ─────────────────────────────────────────────────────────
  describe('single word inputs', () => {
    it('capitalises a single lowercase word', () => {
      expect(formatProfileValue('no')).toBe('No');
    });

    it('capitalises a single longer word', () => {
      expect(formatProfileValue('agnostic')).toBe('Agnostic');
    });
  });

  // ── Already formatted strings ───────────────────────────────────────────
  describe('already formatted strings', () => {
    it('leaves an already title-cased string intact', () => {
      expect(formatProfileValue('Already Formatted')).toBe('Already Formatted');
    });

    it('capitalises first letter of each word even if mixed case', () => {
      expect(formatProfileValue('mixedCase_value')).toBe('MixedCase Value');
    });
  });
});
