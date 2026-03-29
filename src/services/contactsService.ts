/**
 * Contacts Service
 *
 * Handles device contacts access and SMS invite composition.
 * Used by ContactInviteScreen to let users invite friends via SMS.
 */

import * as Contacts from 'expo-contacts';
import * as SMS from 'expo-sms';
import { supabase } from '../lib/supabase';
import { createLogger } from '../utils/secureLogger';
import AsyncStorage from '@react-native-async-storage/async-storage';

const logger = createLogger('ContactsService');

const INVITED_CONTACTS_KEY = 'bridge_invited_contacts';

export interface NormalizedContact {
  id: string;
  name: string;
  phoneNumber: string;
  emails?: string[];
  imageUri?: string;
  isOnBridge: boolean;
  bridgeUserId?: string;
  isAlreadyFriend: boolean;
  isInvited: boolean;
  invitedAt?: number; // epoch ms when invited
  hasRiceEmail?: boolean;
}

export interface ContactSection {
  title: string;
  data: NormalizedContact[];
}

// Cache for Bridge user names (5-min TTL)
let bridgeUsersCache: { users: Map<string, string>; fetchedAt: number } | null = null;
let friendIdsCache: { ids: Set<string>; fetchedAt: number } | null = null;
const CACHE_TTL_MS = 5 * 60 * 1000;

/**
 * Request contacts permission from the user
 */
export const requestContactsPermission = async (): Promise<Contacts.PermissionStatus> => {
  const { status } = await Contacts.requestPermissionsAsync();
  return status;
};

/**
 * Check current contacts permission status
 */
export const getContactsPermission = async (): Promise<Contacts.PermissionStatus> => {
  const { status } = await Contacts.getPermissionsAsync();
  return status;
};

/**
 * Get invited phone numbers with timestamps.
 * Backwards-compatible: migrates old string[] format to Record<string, number>.
 */
const getInvitedPhoneMap = async (): Promise<Record<string, number>> => {
  try {
    const raw = await AsyncStorage.getItem(INVITED_CONTACTS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    // Migrate old format (string[]) → Record<string, number>
    if (Array.isArray(parsed)) {
      const migrated: Record<string, number> = {};
      for (const phone of parsed) migrated[phone] = 0; // unknown timestamp
      await AsyncStorage.setItem(INVITED_CONTACTS_KEY, JSON.stringify(migrated));
      return migrated;
    }
    return parsed;
  } catch {
    return {};
  }
};

/**
 * Mark a phone number as invited in persistent storage
 */
export const markAsInvited = async (phoneNumber: string): Promise<void> => {
  try {
    const normalized = phoneNumber.replace(/\D/g, '');
    const existing = await getInvitedPhoneMap();
    existing[normalized] = Date.now();
    await AsyncStorage.setItem(INVITED_CONTACTS_KEY, JSON.stringify(existing));
  } catch {
    // Non-critical
  }
};

/**
 * Mark multiple phone numbers as invited
 */
export const markMultipleAsInvited = async (phoneNumbers: string[]): Promise<void> => {
  try {
    const now = Date.now();
    const existing = await getInvitedPhoneMap();
    for (const phone of phoneNumbers) {
      existing[phone.replace(/\D/g, '')] = now;
    }
    await AsyncStorage.setItem(INVITED_CONTACTS_KEY, JSON.stringify(existing));
  } catch {
    // Non-critical
  }
};

/**
 * Fetch contacts from device, deduplicate by phone number, sort A-Z.
 * Also marks previously-invited contacts.
 */
export const fetchAndNormalizeContacts = async (): Promise<NormalizedContact[]> => {
  const { data } = await Contacts.getContactsAsync({
    fields: [Contacts.Fields.PhoneNumbers, Contacts.Fields.Name, Contacts.Fields.Image, Contacts.Fields.Emails],
    sort: Contacts.SortTypes.FirstName,
  });

  if (!data || data.length === 0) return [];

  const invitedMap = await getInvitedPhoneMap();
  const seen = new Set<string>();
  const contacts: NormalizedContact[] = [];

  for (const contact of data) {
    const name = contact.name?.trim();
    if (!name) continue;

    const phone = contact.phoneNumbers?.[0]?.number;
    if (!phone) continue;

    // Normalize phone: strip non-digit chars for dedup key
    const normalized = phone.replace(/\D/g, '');
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);

    const invitedAt = invitedMap[normalized];

    const contactEmails: string[] = (contact.emails?.map((e) => e.email).filter((e): e is string => Boolean(e)) || []);
    const hasRiceEmail = contactEmails.some((e) => e.toLowerCase().endsWith('@rice.edu'));

    contacts.push({
      id: contact.id ?? normalized,
      name,
      phoneNumber: phone,
      emails: contactEmails.length > 0 ? contactEmails : undefined,
      imageUri: contact.image?.uri || undefined,
      isOnBridge: false,
      isAlreadyFriend: false,
      isInvited: invitedAt !== undefined,
      invitedAt: invitedAt || undefined,
      hasRiceEmail,
    });
  }

  return contacts;
};

/**
 * Query Bridge profiles and mark contacts whose names match a Bridge user.
 * Stores user_id so we can send friend requests for "On Bridge" contacts.
 * Uses a 5-minute cache to avoid repeated DB calls.
 */
export const markBridgeUsers = async (contacts: NormalizedContact[]): Promise<NormalizedContact[]> => {
  try {
    const now = Date.now();
    if (!bridgeUsersCache || now - bridgeUsersCache.fetchedAt > CACHE_TTL_MS) {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('user_id, first_name, last_name');

      if (error) {
        logger.warn('Failed to fetch Bridge user names:', error.message);
        return contacts;
      }

      // Map lowercase full name → user_id
      const users = new Map<string, string>();
      for (const row of data || []) {
        const full = `${row.first_name ?? ''} ${row.last_name ?? ''}`.trim().toLowerCase();
        if (full && row.user_id) users.set(full, row.user_id);
      }

      bridgeUsersCache = { users, fetchedAt: now };
    }

    // Fetch current user's friend IDs to filter out already-friended Bridge users
    // Cached in-memory for 60s to avoid re-querying on re-renders
    if (!friendIdsCache || now - friendIdsCache.fetchedAt > 60_000) {
      const freshIds = new Set<string>();
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: friends } = await supabase
            .from('friends')
            .select('friend_id')
            .eq('user_id', user.id);
          for (const f of friends || []) {
            freshIds.add(f.friend_id);
          }
        }
      } catch {
        // Non-critical — just won't filter existing friends
      }
      friendIdsCache = { ids: freshIds, fetchedAt: now };
    }
    const friendIds = friendIdsCache.ids;

    return contacts.map((c) => {
      const userId = bridgeUsersCache!.users.get(c.name.toLowerCase());
      return {
        ...c,
        isOnBridge: !!userId,
        bridgeUserId: userId,
        isAlreadyFriend: !!userId && friendIds.has(userId),
      };
    });
  } catch (err) {
    logger.warn('markBridgeUsers failed:', err);
    return contacts;
  }
};

/**
 * Get count of Bridge users (for social proof — displayed count is 2x actual)
 */
export const getBridgeUserCount = async (): Promise<number> => {
  try {
    const { count, error } = await supabase
      .from('user_profiles')
      .select('*', { count: 'exact', head: true });

    if (error) return 0;
    return (count ?? 0) * 2;
  } catch {
    return 0;
  }
};

/**
 * Group contacts alphabetically for SectionList
 */
export const groupContactsAlphabetically = (contacts: NormalizedContact[]): ContactSection[] => {
  const groups: Record<string, NormalizedContact[]> = {};

  for (const contact of contacts) {
    const letter = contact.name[0]?.toUpperCase() || '#';
    const key = /[A-Z]/.test(letter) ? letter : '#';
    if (!groups[key]) groups[key] = [];
    groups[key].push(contact);
  }

  // Sort each group: uninvited first, invited last
  for (const key of Object.keys(groups)) {
    groups[key].sort((a, b) => (a.isInvited ? 1 : 0) - (b.isInvited ? 1 : 0));
  }

  return Object.keys(groups)
    .sort()
    .map((letter) => ({ title: letter, data: groups[letter] }));
};

/**
 * Identify suggested contacts — people you likely know well.
 * Heuristic: contacts whose names appear multiple times in your address book
 * (multiple phone numbers = close contact), plus On Bridge users.
 */
export const getSuggestedContacts = (contacts: NormalizedContact[]): NormalizedContact[] => {
  // Only suggest contacts with rice.edu emails (not businesses, not already invited/on Bridge)
  const candidates = contacts.filter((c) => {
    if (!c.hasRiceEmail) return false; // rice.edu only
    const words = c.name.split(/\s+/);
    if (words.length < 2 || words.length > 4) return false;
    if (c.name === c.name.toUpperCase()) return false;
    if (c.isOnBridge) return false;
    if (c.isInvited) return false;
    return true;
  });

  // Score: photos (closer contact), shorter names
  const scored = candidates.map((c) => ({
    contact: c,
    score: (c.imageUri ? 10 : 0) + (c.name.split(/\s+/).length <= 3 ? 2 : 0),
  }));

  scored.sort((a, b) => b.score - a.score);

  return scored.slice(0, 10).map((s) => s.contact);
};

/**
 * Compose and send an SMS invite to one or more contacts
 */
export const composeSmsInvite = async (
  phoneNumbers: string[],
  friendCode: string,
  senderName?: string,
): Promise<boolean> => {
  const isAvailable = await SMS.isAvailableAsync();
  if (!isAvailable) {
    logger.warn('SMS is not available on this device');
    return false;
  }

  const message = await buildInviteMessage(friendCode, senderName);

  const { result } = await SMS.sendSMSAsync(phoneNumbers, message);
  return result === 'sent';
};

/**
 * Invite message variants — rotated to keep messages feeling personal
 * when a user sends multiple invites. Each variant is under 160 chars
 * (before link) to avoid SMS splitting.
 *
 * Principles:
 * - Lead with the friend relationship, not the app
 * - Create a curiosity gap ("your friends help you find your person")
 * - Feel like a text from a friend, not a referral campaign
 * - Align with Bridge brand voice: warm, down-to-earth, community
 * - NEVER use the word "dating" — it's too intimidating. Keep it warm.
 */
const INVITE_VARIANTS = [
  (name: string) =>
    `${name}I'm on this app called Bridge where your friends actually help you find your person. It takes like 5 min a day — join my crew`,
  (name: string) =>
    `${name}Ok you need to get on Bridge. Your friends vote on who'd be good for you and it's honestly fun. I want you on my team`,
  (name: string) =>
    `${name}Have you heard of Bridge? Your friends help match you with people instead of you swiping through strangers. I need you on mine`,
  (name: string) =>
    `${name}So there's this app Bridge where your friend group helps you find your person. No swiping, just your friends looking out for you. Come join`,
];

let variantIndex = 0;

/**
 * Build the invite message text (shared by SMS and Share sheet)
 *
 * Rotates through message variants so batch invites don't feel copy-pasted.
 * Each message is personal, curiosity-driven, and under SMS split threshold.
 */
export const buildInviteMessage = async (
  friendCode: string,
  senderName?: string,
): Promise<string> => {
  const namePrefix = senderName ? `Hey it's ${senderName}! ` : '';
  const variant = INVITE_VARIANTS[variantIndex % INVITE_VARIANTS.length];
  variantIndex++;

  const body = variant(namePrefix);

  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const inviteLink = supabaseUrl
    ? `${supabaseUrl}/functions/v1/invite-redirect?code=${friendCode}`
    : '';
  const linkLine = inviteLink
    ? `\n\n${inviteLink}`
    : `\n\nUse my code: ${friendCode}`;

  return `${body}${linkLine}`;
};
