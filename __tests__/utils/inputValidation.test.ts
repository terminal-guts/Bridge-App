/**
 * Tests for inputValidation utility functions
 */

import {
  sanitizeText,
  validateName,
  validateBioText,
  validateEmail,
  validateUrl,
  validateAge,
  RateLimiter,
} from '../../src/utils/inputValidation';

// ============================================================================
// sanitizeText
// ============================================================================

describe('sanitizeText', () => {
  it('returns empty string for falsy input', () => {
    expect(sanitizeText('')).toBe('');
    expect(sanitizeText(null as any)).toBe('');
    expect(sanitizeText(undefined as any)).toBe('');
  });

  it('strips HTML tags', () => {
    expect(sanitizeText('Hello <script>alert("xss")</script> World')).toBe('Hello alert("xss") World');
    expect(sanitizeText('<b>bold</b>')).toBe('bold');
  });

  it('removes javascript: protocol', () => {
    expect(sanitizeText('javascript:alert(1)')).toBe('alert(1)');
  });

  it('removes event handler patterns', () => {
    expect(sanitizeText('onerror=alert(1)')).toBe('alert(1)');
    expect(sanitizeText('onclick =doSomething()')).toBe('doSomething()');
  });

  it('removes control characters', () => {
    expect(sanitizeText('Hello\x00\x01World')).toBe('HelloWorld');
  });

  it('preserves newlines and tabs', () => {
    expect(sanitizeText('Line 1\nLine 2\tTabbed')).toBe('Line 1\nLine 2\tTabbed');
  });

  it('trims whitespace', () => {
    expect(sanitizeText('  hello  ')).toBe('hello');
  });
});

// ============================================================================
// validateName
// ============================================================================

describe('validateName', () => {
  it('accepts valid names', () => {
    expect(validateName('Alice').isValid).toBe(true);
    expect(validateName("O'Brien").isValid).toBe(true);
    expect(validateName('Mary-Jane').isValid).toBe(true);
    expect(validateName('Jean Claude').isValid).toBe(true);
  });

  it('rejects empty names', () => {
    const result = validateName('');
    expect(result.isValid).toBe(false);
    expect(result.error).toContain('empty');
  });

  it('rejects names with numbers', () => {
    const result = validateName('Alice123');
    expect(result.isValid).toBe(false);
  });

  it('rejects names with special characters', () => {
    const result = validateName('Alice@#$');
    expect(result.isValid).toBe(false);
  });

  it('enforces max length', () => {
    const longName = 'A'.repeat(51);
    const result = validateName(longName);
    expect(result.isValid).toBe(false);
    expect(result.sanitized.length).toBe(50);
  });

  it('respects custom max length', () => {
    const result = validateName('Alexander', 5);
    expect(result.isValid).toBe(false);
  });

  it('strips HTML before validating', () => {
    const result = validateName('<b>Alice</b>');
    expect(result.sanitized).toBe('Alice');
    expect(result.isValid).toBe(true);
  });
});

// ============================================================================
// validateBioText
// ============================================================================

describe('validateBioText', () => {
  it('accepts normal text', () => {
    expect(validateBioText('I love hiking and cooking!').isValid).toBe(true);
  });

  it('accepts empty text', () => {
    expect(validateBioText('').isValid).toBe(true);
  });

  it('enforces max length', () => {
    const long = 'A'.repeat(501);
    const result = validateBioText(long);
    expect(result.isValid).toBe(false);
    expect(result.sanitized.length).toBe(500);
  });

  it('respects custom max length', () => {
    const result = validateBioText('Hello World', 5);
    expect(result.isValid).toBe(false);
  });

  it('sanitizes input', () => {
    const result = validateBioText('<script>alert("xss")</script>Normal text');
    expect(result.sanitized).not.toContain('<script>');
  });
});

// ============================================================================
// validateEmail
// ============================================================================

describe('validateEmail', () => {
  it('accepts valid emails', () => {
    expect(validateEmail('test@example.com').isValid).toBe(true);
    expect(validateEmail('user.name@domain.co.uk').isValid).toBe(true);
    expect(validateEmail('user+tag@gmail.com').isValid).toBe(true);
  });

  it('rejects invalid emails', () => {
    expect(validateEmail('not-an-email').isValid).toBe(false);
    expect(validateEmail('@domain.com').isValid).toBe(false);
    expect(validateEmail('user@').isValid).toBe(false);
  });

  it('lowercases email', () => {
    const result = validateEmail('USER@EXAMPLE.COM');
    expect(result.sanitized).toBe('user@example.com');
  });

  it('trims whitespace', () => {
    const result = validateEmail('  user@example.com  ');
    expect(result.sanitized).toBe('user@example.com');
    expect(result.isValid).toBe(true);
  });
});

// ============================================================================
// validateUrl
// ============================================================================

describe('validateUrl', () => {
  it('accepts valid HTTP URLs', () => {
    expect(validateUrl('https://example.com').isValid).toBe(true);
    expect(validateUrl('http://example.com/path').isValid).toBe(true);
  });

  it('accepts empty URLs (optional field)', () => {
    expect(validateUrl('').isValid).toBe(true);
  });

  it('rejects non-HTTP protocols', () => {
    expect(validateUrl('ftp://example.com').isValid).toBe(false);
    expect(validateUrl('javascript:alert(1)').isValid).toBe(false);
  });

  it('rejects invalid URLs', () => {
    expect(validateUrl('not a url').isValid).toBe(false);
  });
});

// ============================================================================
// validateAge
// ============================================================================

describe('validateAge', () => {
  it('accepts ages 18-120', () => {
    expect(validateAge(18).isValid).toBe(true);
    expect(validateAge(25).isValid).toBe(true);
    expect(validateAge(120).isValid).toBe(true);
  });

  it('rejects ages under 18', () => {
    const result = validateAge(17);
    expect(result.isValid).toBe(false);
    expect(result.error).toContain('18');
  });

  it('rejects ages over 120', () => {
    expect(validateAge(121).isValid).toBe(false);
  });

  it('rejects non-integers', () => {
    expect(validateAge(25.5).isValid).toBe(false);
  });
});

// ============================================================================
// RateLimiter
// ============================================================================

describe('RateLimiter', () => {
  let limiter: RateLimiter;

  beforeEach(() => {
    limiter = new RateLimiter();
  });

  it('allows actions within limit', () => {
    expect(limiter.isAllowed('vote', 3, 60000)).toBe(true);
    expect(limiter.isAllowed('vote', 3, 60000)).toBe(true);
    expect(limiter.isAllowed('vote', 3, 60000)).toBe(true);
  });

  it('blocks actions exceeding limit', () => {
    limiter.isAllowed('vote', 2, 60000);
    limiter.isAllowed('vote', 2, 60000);
    expect(limiter.isAllowed('vote', 2, 60000)).toBe(false);
  });

  it('tracks different action keys independently', () => {
    limiter.isAllowed('vote', 1, 60000);
    expect(limiter.isAllowed('vote', 1, 60000)).toBe(false);
    expect(limiter.isAllowed('submit', 1, 60000)).toBe(true);
  });

  it('resets a specific action', () => {
    limiter.isAllowed('vote', 1, 60000);
    expect(limiter.isAllowed('vote', 1, 60000)).toBe(false);
    limiter.reset('vote');
    expect(limiter.isAllowed('vote', 1, 60000)).toBe(true);
  });

  it('clears all limits', () => {
    limiter.isAllowed('vote', 1, 60000);
    limiter.isAllowed('submit', 1, 60000);
    limiter.clearAll();
    expect(limiter.isAllowed('vote', 1, 60000)).toBe(true);
    expect(limiter.isAllowed('submit', 1, 60000)).toBe(true);
  });
});
