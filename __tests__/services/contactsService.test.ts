/**
 * Tests for contactsService — pure-logic functions only
 */

// Mock expo-contacts
jest.mock('expo-contacts', () => ({
  requestPermissionsAsync: jest.fn(),
  getPermissionsAsync: jest.fn(),
  getContactsAsync: jest.fn(),
  Fields: { PhoneNumbers: 'phoneNumbers', Name: 'name', Image: 'image' },
  SortTypes: { FirstName: 'firstName' },
}));

// Mock expo-sms
jest.mock('expo-sms', () => ({
  isAvailableAsync: jest.fn(),
  sendSMSAsync: jest.fn(),
}));

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn().mockResolvedValue(undefined),
}));

// Mock Supabase
jest.mock('../../src/lib/supabase', () => ({ supabase: {} }));

// Mock logger
jest.mock('../../src/utils/secureLogger', () => ({
  createLogger: () => ({
    info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn(),
  }),
}));

import {
  groupContactsAlphabetically,
  getSuggestedContacts,
  buildInviteMessage,
  NormalizedContact,
} from '../../src/services/contactsService';

// ─── Helper factories ───────────────────────────────────────────────────────

const makeContact = (overrides: Partial<NormalizedContact> = {}): NormalizedContact => ({
  id: '1',
  name: 'Alice Smith',
  phoneNumber: '+1 (555) 123-4567',
  isOnBridge: false,
  isAlreadyFriend: false,
  isInvited: false,
  hasRiceEmail: false,
  ...overrides,
});

// ─── Phone number normalization ─────────────────────────────────────────────
// The normalization logic (phone.replace(/\D/g, '')) is used inline in
// fetchAndNormalizeContacts and markAsInvited. We test the pattern directly.

describe('phone number normalization (strip non-digits)', () => {
  const normalize = (phone: string) => phone.replace(/\D/g, '');

  it('strips parentheses, dashes, and spaces', () => {
    expect(normalize('+1 (555) 123-4567')).toBe('15551234567');
  });

  it('handles already-clean number', () => {
    expect(normalize('15551234567')).toBe('15551234567');
  });

  it('strips dots and plus signs', () => {
    expect(normalize('+1.555.123.4567')).toBe('15551234567');
  });

  it('returns empty string for non-digit input', () => {
    expect(normalize('abc')).toBe('');
  });

  it('handles international format', () => {
    expect(normalize('+44 7911 123456')).toBe('447911123456');
  });

  it('strips all formatting from complex format', () => {
    expect(normalize('(713) 555-0199 ext. 42')).toBe('713555019942');
  });
});

// ─── buildInviteMessage ─────────────────────────────────────────────────────

describe('buildInviteMessage', () => {
  const originalEnv = process.env.EXPO_PUBLIC_SUPABASE_URL;

  afterEach(() => {
    process.env.EXPO_PUBLIC_SUPABASE_URL = originalEnv;
  });

  it('includes the friend code in the message', async () => {
    process.env.EXPO_PUBLIC_SUPABASE_URL = '';
    const msg = await buildInviteMessage('ABC123');
    expect(msg).toContain('ABC123');
  });

  it('includes sender name when provided', async () => {
    process.env.EXPO_PUBLIC_SUPABASE_URL = '';
    const msg = await buildInviteMessage('CODE1', 'Saul');
    expect(msg).toContain("Hey it's Saul!");
  });

  it('omits name prefix when senderName is not provided', async () => {
    process.env.EXPO_PUBLIC_SUPABASE_URL = '';
    const msg = await buildInviteMessage('CODE1');
    expect(msg).not.toContain("Hey it's");
  });

  it('includes invite link when SUPABASE_URL is set', async () => {
    process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    const msg = await buildInviteMessage('XYZ');
    expect(msg).toContain('https://example.supabase.co/functions/v1/invite-redirect?code=XYZ');
  });

  it('falls back to plain code when SUPABASE_URL is empty', async () => {
    process.env.EXPO_PUBLIC_SUPABASE_URL = '';
    const msg = await buildInviteMessage('XYZ');
    expect(msg).toContain('Use my code: XYZ');
  });

  it('mentions Bridge and friends', async () => {
    process.env.EXPO_PUBLIC_SUPABASE_URL = '';
    const msg = await buildInviteMessage('CODE');
    expect(msg).toContain('Bridge');
    expect(msg).toContain('friend');
  });

  it('rotates message variants across calls', async () => {
    process.env.EXPO_PUBLIC_SUPABASE_URL = '';
    const msg1 = await buildInviteMessage('CODE1');
    const msg2 = await buildInviteMessage('CODE2');
    // Messages should differ (different variants) — compare body before the link
    const body1 = msg1.split('\n\n')[0];
    const body2 = msg2.split('\n\n')[0];
    expect(body1).not.toEqual(body2);
  });
});

// ─── groupContactsAlphabetically ────────────────────────────────────────────

describe('groupContactsAlphabetically', () => {
  it('groups contacts by first letter of name', () => {
    const contacts = [
      makeContact({ name: 'Alice Smith' }),
      makeContact({ name: 'Amy Jones' }),
      makeContact({ name: 'Bob Lee' }),
    ];
    const sections = groupContactsAlphabetically(contacts);
    expect(sections).toHaveLength(2);
    expect(sections[0].title).toBe('A');
    expect(sections[0].data).toHaveLength(2);
    expect(sections[1].title).toBe('B');
    expect(sections[1].data).toHaveLength(1);
  });

  it('returns sections in alphabetical order', () => {
    const contacts = [
      makeContact({ name: 'Zara King' }),
      makeContact({ name: 'Alice Smith' }),
      makeContact({ name: 'Mike Brown' }),
    ];
    const sections = groupContactsAlphabetically(contacts);
    const titles = sections.map(s => s.title);
    expect(titles).toEqual(['A', 'M', 'Z']);
  });

  it('groups non-alpha names under #', () => {
    const contacts = [
      makeContact({ name: '123 Taxi Service' }),
      makeContact({ name: 'Alice Smith' }),
    ];
    const sections = groupContactsAlphabetically(contacts);
    expect(sections[0].title).toBe('#');
    expect(sections[1].title).toBe('A');
  });

  it('handles empty array', () => {
    expect(groupContactsAlphabetically([])).toEqual([]);
  });

  it('sorts uninvited before invited within each group', () => {
    const contacts = [
      makeContact({ name: 'Amy Invited', isInvited: true }),
      makeContact({ name: 'Alice Fresh', isInvited: false }),
      makeContact({ name: 'Anna Also Fresh', isInvited: false }),
    ];
    const sections = groupContactsAlphabetically(contacts);
    const aSection = sections.find(s => s.title === 'A')!;
    // Uninvited should come first
    expect(aSection.data[0].isInvited).toBe(false);
    expect(aSection.data[1].isInvited).toBe(false);
    expect(aSection.data[2].isInvited).toBe(true);
  });

  it('handles lowercase first letter by uppercasing', () => {
    const contacts = [makeContact({ name: 'alice Smith' })];
    const sections = groupContactsAlphabetically(contacts);
    // 'a'.toUpperCase() = 'A', which matches /[A-Z]/, so it goes under 'A'
    expect(sections[0].title).toBe('A');
  });
});

// ─── Contact deduplication ──────────────────────────────────────────────────
// Deduplication happens inside fetchAndNormalizeContacts via Set<string>.
// We test the dedup logic pattern directly.

describe('contact deduplication by normalized phone', () => {
  const deduplicate = (phones: string[]): string[] => {
    const seen = new Set<string>();
    const result: string[] = [];
    for (const phone of phones) {
      const normalized = phone.replace(/\D/g, '');
      if (!normalized || seen.has(normalized)) continue;
      seen.add(normalized);
      result.push(phone);
    }
    return result;
  };

  it('removes duplicates with different formatting', () => {
    const phones = ['+1 (555) 123-4567', '15551234567', '555-123-4567'];
    const result = deduplicate(phones);
    // First two normalize to same value; third is different (no country code)
    expect(result).toHaveLength(2);
    expect(result[0]).toBe('+1 (555) 123-4567');
    expect(result[1]).toBe('555-123-4567');
  });

  it('keeps first occurrence', () => {
    const phones = ['(555) 111-2222', '5551112222'];
    const result = deduplicate(phones);
    expect(result).toEqual(['(555) 111-2222']);
  });

  it('skips empty/non-digit-only entries', () => {
    const phones = ['', 'abc', '555-1234'];
    const result = deduplicate(phones);
    expect(result).toEqual(['555-1234']);
  });

  it('handles empty array', () => {
    expect(deduplicate([])).toEqual([]);
  });
});

// ─── getSuggestedContacts ───────────────────────────────────────────────────

describe('getSuggestedContacts', () => {
  it('returns up to 10 contacts', () => {
    const contacts = Array.from({ length: 20 }, (_, i) =>
      makeContact({ id: String(i), name: `First Last${i}`, hasRiceEmail: true })
    );
    const result = getSuggestedContacts(contacts);
    expect(result.length).toBeLessThanOrEqual(10);
  });

  it('excludes contacts already on Bridge', () => {
    const contacts = [
      makeContact({ name: 'John Doe', isOnBridge: true, hasRiceEmail: true }),
      makeContact({ name: 'Jane Smith', isOnBridge: false, hasRiceEmail: true }),
    ];
    const result = getSuggestedContacts(contacts);
    expect(result.every(c => !c.isOnBridge)).toBe(true);
  });

  it('excludes already invited contacts', () => {
    const contacts = [
      makeContact({ name: 'John Doe', isInvited: true, hasRiceEmail: true }),
      makeContact({ name: 'Jane Smith', isInvited: false, hasRiceEmail: true }),
    ];
    const result = getSuggestedContacts(contacts);
    expect(result.every(c => !c.isInvited)).toBe(true);
  });

  it('excludes single-word names (likely businesses)', () => {
    const contacts = [
      makeContact({ name: 'Madonna', hasRiceEmail: true }),
      makeContact({ name: 'Jane Smith', hasRiceEmail: true }),
    ];
    const result = getSuggestedContacts(contacts);
    expect(result.find(c => c.name === 'Madonna')).toBeUndefined();
  });

  it('excludes names with more than 4 words', () => {
    const contacts = [
      makeContact({ name: 'Sir Doctor John William Smith Jr', hasRiceEmail: true }),
      makeContact({ name: 'Jane Smith', hasRiceEmail: true }),
    ];
    const result = getSuggestedContacts(contacts);
    expect(result.find(c => c.name.includes('Sir Doctor'))).toBeUndefined();
  });

  it('excludes ALL-CAPS names (likely businesses)', () => {
    const contacts = [
      makeContact({ name: 'DOMINOS PIZZA', hasRiceEmail: true }),
      makeContact({ name: 'Jane Smith', hasRiceEmail: true }),
    ];
    const result = getSuggestedContacts(contacts);
    expect(result.find(c => c.name === 'DOMINOS PIZZA')).toBeUndefined();
  });

  it('ranks contacts with photos higher', () => {
    const contacts = [
      makeContact({ id: 'no-photo', name: 'No Photo Person', imageUri: undefined, hasRiceEmail: true }),
      makeContact({ id: 'has-photo', name: 'Has Photo Person', imageUri: 'file:///photo.jpg', hasRiceEmail: true }),
    ];
    const result = getSuggestedContacts(contacts);
    expect(result.length).toBe(2);
    // Contact with photo should be first (higher score)
    expect(result[0].id).toBe('has-photo');
  });

  it('returns empty array when all contacts are filtered out', () => {
    const contacts = [
      makeContact({ name: 'OnBridge User', isOnBridge: true, hasRiceEmail: true }),
      makeContact({ name: 'Invited Friend', isInvited: true, hasRiceEmail: true }),
      makeContact({ name: 'SingleName', hasRiceEmail: true }),
    ];
    const result = getSuggestedContacts(contacts);
    expect(result).toEqual([]);
  });

  it('only suggests contacts with rice.edu emails', () => {
    const contacts = [
      makeContact({ name: 'No Rice Email', hasRiceEmail: false }),
      makeContact({ name: 'Has Rice Email', hasRiceEmail: true }),
    ];
    const result = getSuggestedContacts(contacts);
    expect(result.every(c => c.hasRiceEmail)).toBe(true);
  });

  it('handles empty input', () => {
    expect(getSuggestedContacts([])).toEqual([]);
  });

  it('prefers shorter names (2-3 words) over 4-word names', () => {
    const contacts = [
      makeContact({ id: 'long', name: 'Mary Jane Watson Parker', hasRiceEmail: true }),
      makeContact({ id: 'short', name: 'Jane Smith', hasRiceEmail: true }),
    ];
    // Both have no photos, so the shorter-name bonus (2 pts) applies to 'short'
    // 'long' has 4 words so it gets 0 for that dimension
    const result = getSuggestedContacts(contacts);
    expect(result[0].id).toBe('short');
  });
});
