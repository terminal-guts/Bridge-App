/**
 * Tests for image utility functions (src/utils/imageUtils.ts)
 *
 * Covers: getOptimizedImageUrl — Supabase image transformation URL builder.
 */

import { getOptimizedImageUrl } from '../../src/utils/imageUtils';

// ============================================================================
// getOptimizedImageUrl
// ============================================================================

describe('getOptimizedImageUrl', () => {
  const SUPABASE_BASE = 'https://ikyiwnydgedwbmcdzgbe.supabase.co/storage/v1/object/public/photos/user123/avatar.jpg';

  describe('Supabase public URL transformation', () => {
    it('transforms /object/public/ to /render/image/public/', () => {
      const result = getOptimizedImageUrl(SUPABASE_BASE, 200);
      expect(result).toContain('/storage/v1/render/image/public/');
      expect(result).not.toContain('/storage/v1/object/public/');
    });

    it('appends width, height, resize, and quality query params', () => {
      const result = getOptimizedImageUrl(SUPABASE_BASE, 200)!;
      expect(result).toContain('width=400');
      expect(result).toContain('height=400');
      expect(result).toContain('resize=cover');
      expect(result).toContain('quality=80');
    });

    it('doubles the size for retina displays (size=200 → width=400)', () => {
      const result = getOptimizedImageUrl(SUPABASE_BASE, 200)!;
      expect(result).toContain('width=400');
      expect(result).toContain('height=400');
    });

    it('doubles the size for retina displays (size=50 → width=100)', () => {
      const result = getOptimizedImageUrl(SUPABASE_BASE, 50)!;
      expect(result).toContain('width=100');
      expect(result).toContain('height=100');
    });

    it('rounds the doubled size (size=75 → width=150)', () => {
      const result = getOptimizedImageUrl(SUPABASE_BASE, 75)!;
      expect(result).toContain('width=150');
      expect(result).toContain('height=150');
    });

    it('rounds non-integer sizes correctly (size=33.3 → width=67)', () => {
      const result = getOptimizedImageUrl(SUPABASE_BASE, 33.3)!;
      // Math.round(33.3 * 2) = Math.round(66.6) = 67
      expect(result).toContain('width=67');
      expect(result).toContain('height=67');
    });

    it('produces the correct full URL', () => {
      const result = getOptimizedImageUrl(SUPABASE_BASE, 100);
      const expected =
        'https://ikyiwnydgedwbmcdzgbe.supabase.co/storage/v1/render/image/public/photos/user123/avatar.jpg?width=200&height=200&resize=cover&quality=80';
      expect(result).toBe(expected);
    });
  });

  describe('non-Supabase URLs', () => {
    it('returns non-Supabase URLs unchanged', () => {
      const url = 'https://example.com/images/photo.jpg';
      expect(getOptimizedImageUrl(url, 200)).toBe(url);
    });

    it('returns URLs with supabase.co but without /object/public/ unchanged', () => {
      const url = 'https://ikyiwnydgedwbmcdzgbe.supabase.co/storage/v1/some/other/path.jpg';
      expect(getOptimizedImageUrl(url, 200)).toBe(url);
    });

    it('returns URLs with /object/public/ but not supabase.co unchanged', () => {
      const url = 'https://example.com/storage/v1/object/public/photos/img.jpg';
      expect(getOptimizedImageUrl(url, 200)).toBe(url);
    });

    it('returns CDN URLs unchanged', () => {
      const url = 'https://cdn.example.com/avatar.png';
      expect(getOptimizedImageUrl(url, 300)).toBe(url);
    });
  });

  describe('falsy and edge-case inputs', () => {
    it('returns undefined when url is undefined', () => {
      expect(getOptimizedImageUrl(undefined, 200)).toBeUndefined();
    });

    it('returns empty string when url is empty string', () => {
      expect(getOptimizedImageUrl('', 200)).toBe('');
    });

    it('handles size of 0', () => {
      const result = getOptimizedImageUrl(SUPABASE_BASE, 0)!;
      expect(result).toContain('width=0');
      expect(result).toContain('height=0');
    });

    it('handles very large size values', () => {
      const result = getOptimizedImageUrl(SUPABASE_BASE, 2000)!;
      expect(result).toContain('width=4000');
      expect(result).toContain('height=4000');
    });
  });

  describe('URL with existing query parameters', () => {
    it('appends query params after existing URL (no existing params)', () => {
      const result = getOptimizedImageUrl(SUPABASE_BASE, 100)!;
      // Should have exactly one ? in the URL
      const questionMarks = (result.match(/\?/g) || []).length;
      expect(questionMarks).toBe(1);
    });
  });
});
