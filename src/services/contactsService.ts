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
  isOnBridge: boolean;
  bridgeUserId?: string;
  isAlreadyFriend: boolean;
  isInvited: boolean;
  invitedAt?: number; // epoch ms when invited
}

export interface ContactSection {
  title: string;
  data: NormalizedContact[];
}

// Cache for Bridge user names (5-min TTL)
let bridgeUsersCache: { users: Map<string, string>; fetchedAt: number } | null = null;
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
    fields: [Contacts.Fields.PhoneNumbers, Contacts.Fields.Name],
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

    contacts.push({
      id: contact.id ?? normalized,
      name,
      phoneNumber: phone,
      isOnBridge: false,
      isAlreadyFriend: false,
      isInvited: invitedAt !== undefined,
      invitedAt: invitedAt || undefined,
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
    const friendIds = new Set<string>();
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: friends } = await supabase
          .from('friends')
          .select('friend_id')
          .eq('user_id', user.id);
        for (const f of friends || []) {
          friendIds.add(f.friend_id);
        }
      }
    } catch {
      // Non-critical — just won't filter existing friends
    }

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
 * Get count of Bridge users (for social proof on permission screen)
 */
export const getBridgeUserCount = async (): Promise<number> => {
  try {
    const { count, error } = await supabase
      .from('user_profiles')
      .select('*', { count: 'exact', head: true });

    if (error) return 0;
    return count ?? 0;
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
  // On Bridge contacts are always suggested
  const onBridge = contacts.filter((c) => c.isOnBridge);

  // Count how many times each first name appears — common first names among
  // your contacts suggest a social circle (e.g. 3 "Sarahs" means you know lots of Sarahs).
  // But what we really want is contacts with short, personalized names (not businesses).
  // Heuristic: names with 2-3 words (first + last) and not all-caps (businesses) are real people.
  const realPeople = contacts.filter((c) => {
    const words = c.name.split(/\s+/);
    if (words.length < 2 || words.length > 4) return false;
    if (c.name === c.name.toUpperCase()) return false; // skip "DOMINOS PIZZA"
    if (c.isOnBridge) return false; // already in onBridge list
    if (c.isInvited) return false; // already invited
    return true;
  });

  // Take the first 10 real-people contacts (OS sorts by recency/frequency on iOS)
  const suggested = realPeople.slice(0, 10);

  return [...onBridge, ...suggested];
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
 * Build the invite message text (shared by SMS and Share sheet)
 */
export const buildInviteMessage = async (
  friendCode: string,
  senderName?: string,
): Promise<string> => {
  const name = senderName ? `Hey it's ${senderName}! ` : '';
  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const inviteLink = supabaseUrl ? `${supabaseUrl}/functions/v1/invite-redirect?code=${friendCode}` : '';
  const linkLine = inviteLink ? `\n\nJoin here: ${inviteLink}` : `\n\nAdd me with my code: ${friendCode}`;
  return `${name}Join me on Bridge — it's a dating app where your friends pick who you date. 100+ people are already on it.${linkLine}`;
};
