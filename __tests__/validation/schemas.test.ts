/**
 * Tests for validation schemas (src/validation/schemas.ts)
 *
 * Covers: phone, email, friend code, name, age, sanitization, validateInput helper
 */

import {
  phoneNumberSchema,
  emailSchema,
  uuidSchema,
  friendCodeSchema,
  firstNameSchema,
  lastNameSchema,
  ageSchema,
  heightInchesSchema,
  heightStringSchema,
  genderSchema,
  drinkingSchema,
  verifyOtpSchema,
  validateInput,
  sanitizeString,
  sanitizeObject,
} from '../../src/validation/schemas';

// ============================================================================
// Phone Number Schema (E.164)
// ============================================================================

describe('phoneNumberSchema', () => {
  it('accepts valid E.164 phone numbers', () => {
    expect(phoneNumberSchema.safeParse('+12025551234').success).toBe(true);
    expect(phoneNumberSchema.safeParse('+441234567890').success).toBe(true);
    expect(phoneNumberSchema.safeParse('+8613800138000').success).toBe(true);
  });

  it('rejects phone numbers without + prefix', () => {
    expect(phoneNumberSchema.safeParse('12025551234').success).toBe(false);
  });

  it('rejects phone numbers starting with +0', () => {
    expect(phoneNumberSchema.safeParse('+0123456789').success).toBe(false);
  });

  it('rejects empty string', () => {
    expect(phoneNumberSchema.safeParse('').success).toBe(false);
  });

  it('rejects numbers with spaces or dashes', () => {
    expect(phoneNumberSchema.safeParse('+1 202 555 1234').success).toBe(false);
    expect(phoneNumberSchema.safeParse('+1-202-555-1234').success).toBe(false);
  });

  it('rejects non-numeric characters after +', () => {
    expect(phoneNumberSchema.safeParse('+1abc').success).toBe(false);
  });
});

// ============================================================================
// Email Schema
// ============================================================================

describe('emailSchema', () => {
  it('accepts valid emails', () => {
    expect(emailSchema.safeParse('user@example.com').success).toBe(true);
    expect(emailSchema.safeParse('test.user+tag@rice.edu').success).toBe(true);
  });

  it('rejects invalid emails', () => {
    expect(emailSchema.safeParse('not-an-email').success).toBe(false);
    expect(emailSchema.safeParse('@missing-local.com').success).toBe(false);
    expect(emailSchema.safeParse('missing@').success).toBe(false);
    expect(emailSchema.safeParse('').success).toBe(false);
  });
});

// ============================================================================
// UUID Schema
// ============================================================================

describe('uuidSchema', () => {
  it('accepts valid UUIDs', () => {
    expect(uuidSchema.safeParse('550e8400-e29b-41d4-a716-446655440000').success).toBe(true);
    expect(uuidSchema.safeParse('00000000-0000-0000-0000-000000000001').success).toBe(true);
  });

  it('rejects invalid UUIDs', () => {
    expect(uuidSchema.safeParse('not-a-uuid').success).toBe(false);
    expect(uuidSchema.safeParse('').success).toBe(false);
    expect(uuidSchema.safeParse('550e8400-e29b-41d4-a716').success).toBe(false);
  });
});

// ============================================================================
// Friend Code Schema (BRIDGE-XXXX-XXXX)
// ============================================================================

describe('friendCodeSchema', () => {
  it('accepts valid friend codes', () => {
    expect(friendCodeSchema.safeParse('BRIDGE-AB12-CD34').success).toBe(true);
    expect(friendCodeSchema.safeParse('BRIDGE-0000-ZZZZ').success).toBe(true);
  });

  it('rejects codes without BRIDGE- prefix', () => {
    expect(friendCodeSchema.safeParse('NOTBR-AB12-CD34').success).toBe(false);
  });

  it('rejects lowercase friend codes', () => {
    expect(friendCodeSchema.safeParse('BRIDGE-ab12-cd34').success).toBe(false);
  });

  it('rejects wrong length segments', () => {
    expect(friendCodeSchema.safeParse('BRIDGE-ABC-DEFG').success).toBe(false);
    expect(friendCodeSchema.safeParse('BRIDGE-ABCDE-FGHI').success).toBe(false);
  });

  it('rejects empty string', () => {
    expect(friendCodeSchema.safeParse('').success).toBe(false);
  });

  it('rejects codes with special characters', () => {
    expect(friendCodeSchema.safeParse('BRIDGE-AB!2-CD34').success).toBe(false);
  });
});

// ============================================================================
// Name Schemas
// ============================================================================

describe('firstNameSchema', () => {
  it('accepts valid first names', () => {
    expect(firstNameSchema.safeParse('John').success).toBe(true);
    expect(firstNameSchema.safeParse("Mary-Jane").success).toBe(true);
    expect(firstNameSchema.safeParse("O'Brien").success).toBe(true);
    expect(firstNameSchema.safeParse('Ana Maria').success).toBe(true);
  });

  it('rejects empty string', () => {
    const result = firstNameSchema.safeParse('');
    expect(result.success).toBe(false);
  });

  it('rejects names over 50 characters', () => {
    const longName = 'A'.repeat(51);
    expect(firstNameSchema.safeParse(longName).success).toBe(false);
  });

  it('accepts names exactly 50 characters', () => {
    const name50 = 'A'.repeat(50);
    expect(firstNameSchema.safeParse(name50).success).toBe(true);
  });

  it('rejects names with numbers', () => {
    expect(firstNameSchema.safeParse('John3').success).toBe(false);
  });

  it('rejects names with special characters', () => {
    expect(firstNameSchema.safeParse('John@Doe').success).toBe(false);
    expect(firstNameSchema.safeParse('John<script>').success).toBe(false);
  });
});

describe('lastNameSchema', () => {
  it('accepts valid last names', () => {
    expect(lastNameSchema.safeParse('Smith').success).toBe(true);
    expect(lastNameSchema.safeParse("O'Malley").success).toBe(true);
    expect(lastNameSchema.safeParse('van der Berg').success).toBe(true);
  });

  it('rejects empty string', () => {
    expect(lastNameSchema.safeParse('').success).toBe(false);
  });
});

// ============================================================================
// Age Schema
// ============================================================================

describe('ageSchema', () => {
  it('accepts valid ages', () => {
    expect(ageSchema.safeParse(18).success).toBe(true);
    expect(ageSchema.safeParse(25).success).toBe(true);
    expect(ageSchema.safeParse(100).success).toBe(true);
  });

  it('rejects ages below 18', () => {
    expect(ageSchema.safeParse(17).success).toBe(false);
    expect(ageSchema.safeParse(0).success).toBe(false);
    expect(ageSchema.safeParse(-1).success).toBe(false);
  });

  it('rejects ages above 100', () => {
    expect(ageSchema.safeParse(101).success).toBe(false);
  });

  it('rejects non-integer ages', () => {
    expect(ageSchema.safeParse(18.5).success).toBe(false);
  });

  it('rejects non-number types', () => {
    expect(ageSchema.safeParse('25').success).toBe(false);
    expect(ageSchema.safeParse(null).success).toBe(false);
  });
});

// ============================================================================
// Height Schemas
// ============================================================================

describe('heightInchesSchema', () => {
  it('accepts valid heights in inches', () => {
    expect(heightInchesSchema.safeParse(48).success).toBe(true); // 4 feet
    expect(heightInchesSchema.safeParse(70).success).toBe(true); // ~5'10"
    expect(heightInchesSchema.safeParse(96).success).toBe(true); // 8 feet
  });

  it('rejects heights outside bounds', () => {
    expect(heightInchesSchema.safeParse(47).success).toBe(false);
    expect(heightInchesSchema.safeParse(97).success).toBe(false);
  });
});

describe('heightStringSchema', () => {
  it('accepts valid height strings', () => {
    expect(heightStringSchema.safeParse("5'11\"").success).toBe(true);
    expect(heightStringSchema.safeParse("6'0").success).toBe(true);
  });

  it('rejects invalid height strings', () => {
    expect(heightStringSchema.safeParse('tall').success).toBe(false);
    expect(heightStringSchema.safeParse('').success).toBe(false);
  });
});

// ============================================================================
// Enum Schemas
// ============================================================================

describe('genderSchema', () => {
  it('accepts valid genders', () => {
    expect(genderSchema.safeParse('male').success).toBe(true);
    expect(genderSchema.safeParse('female').success).toBe(true);
    expect(genderSchema.safeParse('non-binary').success).toBe(true);
    expect(genderSchema.safeParse('other').success).toBe(true);
  });

  it('rejects invalid values', () => {
    expect(genderSchema.safeParse('invalid').success).toBe(false);
    expect(genderSchema.safeParse('').success).toBe(false);
  });
});

describe('drinkingSchema', () => {
  it('accepts valid drinking values', () => {
    expect(drinkingSchema.safeParse('never').success).toBe(true);
    expect(drinkingSchema.safeParse('socially').success).toBe(true);
  });

  it('rejects invalid values', () => {
    expect(drinkingSchema.safeParse('sometimes').success).toBe(false);
  });
});

// ============================================================================
// OTP Schema
// ============================================================================

describe('verifyOtpSchema', () => {
  it('accepts valid OTP verification data', () => {
    const result = verifyOtpSchema.safeParse({
      phoneNumber: '+12025551234',
      token: '123456',
    });
    expect(result.success).toBe(true);
  });

  it('rejects OTP with wrong length', () => {
    const result = verifyOtpSchema.safeParse({
      phoneNumber: '+12025551234',
      token: '12345',
    });
    expect(result.success).toBe(false);
  });

  it('rejects non-numeric OTP', () => {
    const result = verifyOtpSchema.safeParse({
      phoneNumber: '+12025551234',
      token: 'abcdef',
    });
    expect(result.success).toBe(false);
  });
});

// ============================================================================
// validateInput helper
// ============================================================================

describe('validateInput', () => {
  it('returns success with data for valid input', () => {
    const result = validateInput(ageSchema, 25);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBe(25);
    }
  });

  it('returns failure with errors for invalid input', () => {
    const result = validateInput(ageSchema, 'not a number');
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors).toBeDefined();
      expect(result.errors.issues.length).toBeGreaterThan(0);
    }
  });
});

// ============================================================================
// sanitizeString
// ============================================================================

describe('sanitizeString', () => {
  it('removes HTML tags', () => {
    expect(sanitizeString('<script>alert("xss")</script>')).toBe('alert(xss)'); // tags removed, then quotes removed
  });

  it('removes dangerous characters', () => {
    expect(sanitizeString('hello<world>')).toBe('hello'); // <world> removed as HTML tag
    expect(sanitizeString('test"quotes"')).toBe('testquotes');
    expect(sanitizeString("it's")).toBe('its');
  });

  it('trims whitespace', () => {
    expect(sanitizeString('  hello  ')).toBe('hello');
  });

  it('returns empty string for falsy input', () => {
    expect(sanitizeString('')).toBe('');
  });

  it('handles normal strings without changes', () => {
    expect(sanitizeString('Hello World')).toBe('Hello World');
  });
});

// ============================================================================
// sanitizeObject
// ============================================================================

describe('sanitizeObject', () => {
  it('sanitizes string fields in object', () => {
    const input = {
      name: '<b>Bold</b> Name',
      age: 25,
    };
    const result = sanitizeObject(input);
    expect(result.name).toBe('Bold Name');
    expect(result.age).toBe(25);
  });

  it('sanitizes nested objects', () => {
    const input = {
      user: {
        name: '<script>bad</script>',
      },
    };
    const result = sanitizeObject(input);
    expect(result.user.name).toBe('bad');
  });
});
