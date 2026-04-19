/**
 * useContactInvite Hook
 * Extracted from ContactInviteScreen.tsx — manages all state, effects, and callbacks.
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  TextInput,
  SectionList,
  Linking,
  Platform,
  Share,
  Alert,
} from 'react-native';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../../types';
import * as Clipboard from 'expo-clipboard';
import {
  getUserFriendCode,
  addFriendByCode,
  bulkAddFriendsByCodes,
  getFriendCodeByUserId,
  getFriendCodesByUserIds,
  sendFriendRequestByCode,
} from '../../services/friendService';
import { getUserProfile } from '../../services/profileService';
import { communityBackendService } from '../../services/communityBackendService';
import {
  NormalizedContact,
  ContactSection,
  requestContactsPermission,
  getContactsPermission,
  fetchAndNormalizeContacts,
  markBridgeUsers,
  groupContactsAlphabetically,
  composeSmsInvite,
  buildInviteMessage,
  getBridgeUserCount,
  markAsInvited,
  markMultipleAsInvited,
  getSuggestedContacts,
} from '../../services/contactsService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createLogger } from '../../utils/secureLogger';
import { showToast } from '../../utils/toast';
import { INVITE_COUNT_KEY, MAX_INVITES, ON_BRIDGE_SECTION, SUGGESTED_SECTION } from './ContactInviteScreen.components';

const logger = createLogger('ContactInviteScreen');

export function useContactInvite(route: RouteProp<RootStackParamList, 'ContactInvite'>) {
  const [permissionStatus, setPermissionStatus] = useState<string | null>(null);
  const [contacts, setContacts] = useState<NormalizedContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [friendCode, setFriendCode] = useState('');
  const [senderName, setSenderName] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bridgeUserCount, setBridgeUserCount] = useState(0);
  const [sending, setSending] = useState(false);
  const [enterCodeValue, setEnterCodeValue] = useState('');
  const [enterCodeError, setEnterCodeError] = useState('');
  const [addingCode, setAddingCode] = useState(false);
  const [celebrationCount, setCelebrationCount] = useState(0);
  const [addingFriendId, setAddingFriendId] = useState<string | null>(null);
  const [invitesSentCount, setInvitesSentCount] = useState(0);
  const [suggestedPreSelected, setSuggestedPreSelected] = useState(false);
  const [addingAll, setAddingAll] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const enterCodeInputRef = useRef<TextInput>(null);
  const sectionListRef = useRef<SectionList<NormalizedContact, ContactSection>>(null);

  const invitesRemaining = Math.max(0, MAX_INVITES - invitesSentCount);

  // Load friend code + sender name + invite count on mount
  useEffect(() => {
    getUserFriendCode().then((result) => {
      if (result.ok && result.data) setFriendCode(result.data.code);
    });
    getUserProfile().then((result) => {
      if (result.ok && result.data) setSenderName(result.data.firstName);
    });
    getBridgeUserCount().then((count) => setBridgeUserCount(count));
    AsyncStorage.getItem(INVITE_COUNT_KEY).then((val) => {
      if (val) setInvitesSentCount(parseInt(val, 10) || 0);
    });
  }, []);

  // Check permission and load contacts
  useEffect(() => {
    const init = async () => {
      try {
        const status = await getContactsPermission();
        setPermissionStatus(status);

        if (status === 'granted') {
          const raw = await fetchAndNormalizeContacts();
          const marked = await markBridgeUsers(raw);
          setContacts(marked);
        }
      } catch (err) {
        logger.error('Failed to load contacts:', err);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  // Auto-add friend code from deep link (ref guard prevents duplicate RPC calls)
  const processedCodeRef = useRef<string | null>(null);
  useEffect(() => {
    const code = route.params?.autoAddCode;
    if (!code || processedCodeRef.current === code) return;
    (async () => {
      try {
        const result = await sendFriendRequestByCode(code);
        if (result.success) {
          processedCodeRef.current = code;
          communityBackendService.invalidateFriendsCache();
          if (result.wasAutoAccepted) {
            showToast.success('Friend added!', 'You were connected via invite link');
          } else {
            showToast.success('Request sent!', 'Friend request sent via invite link');
          }
        } else {
          processedCodeRef.current = code;
          showToast.error('Could not send request', result.message || 'Invalid code');
        }
      } catch {
        // Don't mark processed — allow retry on network failure
        showToast.error('Error', 'Could not process invite link');
      }
    })();
  }, [route.params?.autoAddCode]);

  const handleRequestPermission = useCallback(async () => {
    setLoading(true);
    try {
      const result = await requestContactsPermission();
      setPermissionStatus(result.status);

      if (result.granted) {
        const raw = await fetchAndNormalizeContacts();
        const marked = await markBridgeUsers(raw);
        setContacts(marked);
      } else if (!result.canAskAgain) {
        // iOS has locked the system prompt (user denied once and re-denial
        // closed the dialog). Calling requestPermissionsAsync again no-ops.
        // Route the user to Settings — that's the only path to re-grant.
        Alert.alert(
          'Contacts Access',
          'Please enable Contacts in Settings to invite friends.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => Linking.openSettings() },
          ],
        );
      }
    } catch (err) {
      logger.error('Permission request failed:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Pre-select up to 3 rice.edu suggested contacts
  useEffect(() => {
    if (suggestedPreSelected || contacts.length === 0) return;
    const notOnBridge = contacts.filter((c) => !c.isOnBridge);
    const suggested = getSuggestedContacts(notOnBridge);
    const riceOnly = suggested.filter((c) => c.hasRiceEmail);
    if (riceOnly.length > 0) {
      const topIds = riceOnly.slice(0, 3).map((c) => c.id);
      setSelectedIds((prev) => {
        const next = new Set(prev);
        topIds.forEach((id) => next.add(id));
        return next;
      });
    }
    setSuggestedPreSelected(true);
  }, [contacts, suggestedPreSelected]);

  const handleToggleSelect = useCallback((contact: NormalizedContact) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(contact.id)) {
        next.delete(contact.id);
      } else {
        next.add(contact.id);
      }
      return next;
    });
  }, []);

  const handleAddFriend = useCallback(async (contact: NormalizedContact) => {
    if (!contact.bridgeUserId) {
      showToast.error('Error', 'Could not find this user on Bridge');
      return;
    }
    if (contact.isAlreadyFriend) return;

    setAddingFriendId(contact.id);
    try {
      setContacts((prev) => prev.map((c) => c.id === contact.id ? { ...c, isAlreadyFriend: true } : c));
      const code = await getFriendCodeByUserId(contact.bridgeUserId!);

      if (!code) {
        setContacts((prev) => prev.map((c) => c.id === contact.id ? { ...c, isAlreadyFriend: false } : c));
        showToast.error('Error', 'Could not find their friend code');
        return;
      }

      const result = await sendFriendRequestByCode(code);
      if (!result.success) {
        setContacts((prev) => prev.map((c) => c.id === contact.id ? { ...c, isAlreadyFriend: false } : c));
        showToast.error('Error', result.message || 'Could not send request');
        return;
      }

      communityBackendService.invalidateFriendsCache();
      if (result.wasAutoAccepted) {
        showToast.success('Friend added!', `${contact.name} is now your friend on Bridge`);
      } else {
        showToast.success('Request sent!', `Friend request sent to ${contact.name}`);
      }
    } catch (err) {
      logger.error('Add friend failed:', err);
      setContacts((prev) => prev.map((c) => c.id === contact.id ? { ...c, isAlreadyFriend: false } : c));
      showToast.error('Error', 'Something went wrong');
    } finally {
      setAddingFriendId(null);
    }
  }, []);

  const handleSendInvites = useCallback(async () => {
    if (selectedIds.size === 0 || !friendCode) return;

    if (invitesRemaining <= 0) {
      Alert.alert("You've used all 10 invites", "Each invite is valuable — check back to see who joined!");
      return;
    }

    const selectedContacts = contacts.filter((c) => selectedIds.has(c.id)).slice(0, invitesRemaining);
    if (selectedContacts.length === 0) return;

    setSending(true);
    try {
      const phoneNumbers = selectedContacts.map((c) => c.phoneNumber);
      const sent = await composeSmsInvite(phoneNumbers, friendCode, senderName);

      if (sent) {
        await markMultipleAsInvited(phoneNumbers);
        const sentIds = new Set(selectedContacts.map((c) => c.id));
        setInvitesSentCount((prev) => {
          const newCount = prev + selectedContacts.length;
          AsyncStorage.setItem(INVITE_COUNT_KEY, String(newCount));
          return newCount;
        });
        setContacts((prev) =>
          prev.map((c) =>
            sentIds.has(c.id) ? { ...c, isInvited: true, invitedAt: Date.now() } : c
          )
        );
        setSelectedIds(new Set());
        setCelebrationCount(selectedContacts.length);
        setTimeout(() => setCelebrationCount(0), 2500);
      } else {
        // User cancelled or SMS was not available
        showToast.info('No invites sent', 'You can try again whenever you\'re ready');
      }
    } catch (err) {
      logger.error('Send invites failed:', err);
    } finally {
      setSending(false);
    }
  }, [selectedIds, contacts, friendCode, senderName, invitesRemaining]);

  const handleInviteSingle = useCallback(async (contact: NormalizedContact) => {
    if (!friendCode) {
      showToast.error('Error', 'Could not load your friend code');
      return;
    }
    if (invitesRemaining <= 0) {
      Alert.alert("You've used all 10 invites", "Each invite is valuable — check back to see who joined!");
      return;
    }

    const sent = await composeSmsInvite([contact.phoneNumber], friendCode, senderName);
    if (sent) {
      await markAsInvited(contact.phoneNumber);
      setInvitesSentCount((prev) => {
        const newCount = prev + 1;
        AsyncStorage.setItem(INVITE_COUNT_KEY, String(newCount));
        return newCount;
      });
      setContacts((prev) =>
        prev.map((c) => c.id === contact.id ? { ...c, isInvited: true, invitedAt: Date.now() } : c)
      );
      showToast.success('Sent!', `Invite sent to ${contact.name}`);
    } else {
      // User cancelled the SMS compose sheet
      showToast.info('Invite not sent', 'No worries — you can send it later');
    }
  }, [friendCode, senderName, invitesRemaining]);

  const handleShareCode = useCallback(async () => {
    if (!friendCode) return;
    const message = await buildInviteMessage(friendCode, senderName);
    const result = await Share.share({ message });
    if (result.action === Share.sharedAction) {
      setInvitesSentCount((prev) => {
        const newCount = prev + 1;
        AsyncStorage.setItem(INVITE_COUNT_KEY, String(newCount));
        return newCount;
      });
    }
  }, [friendCode, senderName]);

  const handleCopyCode = useCallback(async () => {
    if (!friendCode) return;
    await Clipboard.setStringAsync(friendCode);
    showToast.success('Copied!', 'Friend code copied to clipboard');
  }, [friendCode]);

  const handleEnterCode = useCallback(async () => {
    const code = enterCodeValue.trim().toUpperCase();
    if (!code) { setEnterCodeError('Enter a friend code'); return; }
    if (!/^BRIDGE-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(code)) { setEnterCodeError('Format: BRIDGE-XXXX-XXXX'); return; }
    if (code === friendCode) { setEnterCodeError("That's your own code"); return; }
    setAddingCode(true);
    setEnterCodeError('');
    try {
      const result = await addFriendByCode(code);
      if (result.ok) {
        setEnterCodeValue('');
        communityBackendService.invalidateFriendsCache();
        const name = result.data?.friendProfile?.firstName || 'Friend';
        if (result.data?.wasAutoAccepted) {
          showToast.success('Friend added!', `${name} is now your friend`);
        } else {
          showToast.success('Request sent!', `Friend request sent to ${name}`);
        }
      } else {
        const msg = result.error?.message || 'Failed to add friend';
        setEnterCodeError(msg.includes('already friends') ? 'Already friends' : msg.includes('not found') ? 'Invalid code' : msg);
      }
    } catch {
      setEnterCodeError('Something went wrong');
    } finally {
      setAddingCode(false);
    }
  }, [enterCodeValue, friendCode]);

  const handleAddAllBridge = useCallback(async () => {
    const onBridgeNotAdded = contacts.filter((c) => c.isOnBridge && !c.isAlreadyFriend && c.bridgeUserId);
    if (onBridgeNotAdded.length === 0) return;

    setAddingAll(true);
    const userIds = onBridgeNotAdded.map((c) => c.bridgeUserId!);
    const codeMap = await getFriendCodesByUserIds(userIds);

    const codesToAdd = onBridgeNotAdded
      .map((c) => codeMap.get(c.bridgeUserId!))
      .filter(Boolean) as string[];

    const addedCodes = await bulkAddFriendsByCodes(codesToAdd);

    const addedUserIds = new Set<string>();
    for (const [userId, code] of codeMap) {
      if (addedCodes.has(code)) addedUserIds.add(userId);
    }

    const count = addedUserIds.size;
    if (count > 0) {
      communityBackendService.invalidateFriendsCache();
      setContacts((prev) => prev.map((c) =>
        c.bridgeUserId && addedUserIds.has(c.bridgeUserId) ? { ...c, isAlreadyFriend: true } : c
      ));
      showToast.success('Requests sent!', `Sent ${count} friend request${count === 1 ? '' : 's'}`);
    }
    setAddingAll(false);
  }, [contacts]);

  const unadddedBridgeCount = useMemo(
    () => contacts.filter((c) => c.isOnBridge && !c.isAlreadyFriend).length,
    [contacts]
  );

  const handleOpenSettings = useCallback(() => {
    if (Platform.OS === 'ios') {
      Linking.openURL('app-settings:');
    } else {
      Linking.openSettings();
    }
  }, []);

  const handleEnterCodeChangeText = useCallback((t: string) => {
    setEnterCodeValue(t);
    setEnterCodeError('');
  }, []);

  const handleSearchChange = useCallback((text: string) => {
    setSearchQuery(text);
  }, []);

  // Build sections: "On Bridge" at top, then "Suggested", then A-Z
  // Applies search filter when searchQuery is non-empty
  const filteredSections = useMemo((): ContactSection[] => {
    let filteredContacts = contacts;

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.trim().toLowerCase();
      filteredContacts = contacts.filter((c) =>
        c.name.toLowerCase().includes(query) ||
        c.phoneNumber.includes(query)
      );
    }

    const onBridge = filteredContacts.filter((c) => c.isOnBridge);
    const notOnBridge = filteredContacts.filter((c) => !c.isOnBridge);

    const sections: ContactSection[] = [];
    if (onBridge.length > 0) {
      sections.push({ title: ON_BRIDGE_SECTION, data: onBridge });
    }

    // Only show suggested section when not searching
    if (!searchQuery.trim()) {
      const suggested = getSuggestedContacts(notOnBridge);
      if (suggested.length > 0) {
        sections.push({ title: SUGGESTED_SECTION, data: suggested });
      }
    }

    const alphabetical = groupContactsAlphabetically(notOnBridge);
    sections.push(...alphabetical);

    return sections;
  }, [contacts, searchQuery]);

  const keyExtractor = useCallback((item: NormalizedContact) => item.id, []);

  return {
    // State
    permissionStatus,
    loading,
    friendCode,
    contacts,
    selectedIds,
    bridgeUserCount,
    sending,
    enterCodeValue,
    enterCodeError,
    addingCode,
    celebrationCount,
    addingFriendId,
    invitesSentCount,
    invitesRemaining,
    addingAll,
    unadddedBridgeCount,
    filteredSections,
    searchQuery,

    // Refs
    enterCodeInputRef,
    sectionListRef,

    // Handlers
    handleRequestPermission,
    handleToggleSelect,
    handleAddFriend,
    handleSendInvites,
    handleInviteSingle,
    handleShareCode,
    handleCopyCode,
    handleEnterCode,
    handleAddAllBridge,
    handleOpenSettings,
    handleEnterCodeChangeText,
    handleSearchChange,

    // List helpers
    keyExtractor,
  };
}
