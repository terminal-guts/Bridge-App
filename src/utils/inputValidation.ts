/**
 * Input Validation and Sanitization Utilities
 *
 * Provides functions to validate and sanitize user inputs
 * to prevent XSS, injection attacks, and ensure data quality.
 */

/**
 * Sanitize text input by removing potentially dangerous characters
 * while preserving safe special characters for names and text
 */
export function sanitizeText(input: string): string {
  if (!input) return '';

  // Remove any HTML-like tags
  let sanitized = input.replace(/<[^>]*>/g, '');

  // Remove script-like patterns
  sanitized = sanitized.replace(/javascript:/gi, '');
  sanitized = sanitized.replace(/on\w+\s*=/gi, '');

  // Remove control characters except newlines and tabs
  sanitized = sanitized.replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, '');

  // Trim whitespace
  sanitized = sanitized.trim();

  return sanitized;
}

/**
 * Validate and sanitize name input
 */
export function validateName(name: string, maxLength: number = 50): {
  isValid: boolean;
  sanitized: string;
  error?: string;
} {
  const sanitized = sanitizeText(name);

  if (!sanitized) {
    return { isValid: false, sanitized: '', error: 'Name cannot be empty' };
  }

  if (sanitized.length > maxLength) {
    return {
      isValid: false,
      sanitized: sanitized.substring(0, maxLength),
      error: `Name must be ${maxLength} characters or less`,
    };
  }

  // Allow letters, spaces, hyphens, apostrophes (for names like O'Brien, Mary-Jane)
  const namePattern = /^[a-zA-Z\s'\-]+$/;
  if (!namePattern.test(sanitized)) {
    return {
      isValid: false,
      sanitized,
      error: 'Name can only contain letters, spaces, hyphens, and apostrophes',
    };
  }

  return { isValid: true, sanitized };
}

/**
 * Validate and sanitize bio/reason text
 */
export function validateBioText(text: string, maxLength: number = 500): {
  isValid: boolean;
  sanitized: string;
  error?: string;
} {
  const sanitized = sanitizeText(text);

  if (sanitized.length > maxLength) {
    return {
      isValid: false,
      sanitized: sanitized.substring(0, maxLength),
      error: `Text must be ${maxLength} characters or less`,
    };
  }

  return { isValid: true, sanitized };
}

/**
 * Validate email format
 */
export function validateEmail(email: string): {
  isValid: boolean;
  sanitized: string;
  error?: string;
} {
  const sanitized = email.trim().toLowerCase();

  // RFC 5322 compliant email regex (simplified)
  const emailPattern = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

  if (!emailPattern.test(sanitized)) {
    return {
      isValid: false,
      sanitized,
      error: 'Please enter a valid email address',
    };
  }

  return { isValid: true, sanitized };
}

/**
 * Validate URL format
 */
export function validateUrl(url: string): {
  isValid: boolean;
  sanitized: string;
  error?: string;
} {
  const sanitized = url.trim();

  if (!sanitized) {
    return { isValid: true, sanitized: '' }; // Empty URL is valid (optional field)
  }

  try {
    const urlObj = new URL(sanitized);

    // Only allow http and https protocols
    if (!['http:', 'https:'].includes(urlObj.protocol)) {
      return {
        isValid: false,
        sanitized,
        error: 'URL must use HTTP or HTTPS protocol',
      };
    }

    return { isValid: true, sanitized };
  } catch {
    return {
      isValid: false,
      sanitized,
      error: 'Please enter a valid URL',
    };
  }
}

/**
 * Validate age (must be 18+)
 */
export function validateAge(age: number): {
  isValid: boolean;
  error?: string;
} {
  if (!Number.isInteger(age)) {
    return { isValid: false, error: 'Age must be a whole number' };
  }

  if (age < 18) {
    return { isValid: false, error: 'You must be 18 or older to use Bridge' };
  }

  if (age > 120) {
    return { isValid: false, error: 'Please enter a valid age' };
  }

  return { isValid: true };
}

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
