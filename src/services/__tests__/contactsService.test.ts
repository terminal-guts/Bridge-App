import { buildInviteMessage } from '../contactsService';

jest.mock('expo-contacts', () => ({
  Fields: { PhoneNumbers: 'phoneNumbers', Name: 'name', Image: 'image' },
  SortTypes: { FirstName: 'firstName' },
  getContactsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
  getPermissionsAsync: jest.fn(),
}));

jest.mock('expo-sms', () => ({
  isAvailableAsync: jest.fn(),
  sendSMSAsync: jest.fn(),
}));

jest.mock('../../lib/supabase', () => ({
  supabase: {
    from: jest.fn(),
    auth: {
      getUser: jest.fn(),
    },
  },
}));

describe('contactsService', () => {
  describe('buildInviteMessage', () => {
    const friendCode = 'BRIDGE-1234-5678';
    const senderName = 'Alice';

    it('should include the sender name prefix when provided', async () => {
      const message = await buildInviteMessage(friendCode, senderName);
      expect(message).toContain("Hey it's Alice!");
      expect(message).toContain("\n\nWhat if someone on Bridge");
    });

    it('should not include the sender name prefix when not provided', async () => {
      const message = await buildInviteMessage(friendCode);
      expect(message).not.toContain("Hey it's");
      expect(message.startsWith("What if someone on Bridge")).toBe(true);
    });

    it('should include the new enticing body text', async () => {
      const message = await buildInviteMessage(friendCode, senderName);
      expect(message).toContain("What if someone on Bridge is actually looking for you");
      expect(message).toContain("and you just haven’t met yet?");
      expect(message).toContain("I joined and now my friends help choose who I should date 😅");
      expect(message).toContain("Come help pick my matches… and maybe find yours too.");
    });

    it('should include the invite link when EXPO_PUBLIC_SUPABASE_URL is set', async () => {
      const originalEnv = process.env.EXPO_PUBLIC_SUPABASE_URL;
      process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';

      const message = await buildInviteMessage(friendCode, senderName);
      expect(message).toContain('Join here:');
      expect(message).toContain('https://example.supabase.co/functions/v1/invite-redirect?code=BRIDGE-1234-5678');

      process.env.EXPO_PUBLIC_SUPABASE_URL = originalEnv;
    });

    it('should include the friend code when EXPO_PUBLIC_SUPABASE_URL is not set', async () => {
      const originalEnv = process.env.EXPO_PUBLIC_SUPABASE_URL;
      delete process.env.EXPO_PUBLIC_SUPABASE_URL;

      const message = await buildInviteMessage(friendCode, senderName);
      expect(message).toContain('Add me with my code: BRIDGE-1234-5678');

      process.env.EXPO_PUBLIC_SUPABASE_URL = originalEnv;
    });
  });
});
