import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  SectionList,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  Platform,
  Share,
  Alert,
  Image,
} from 'react-native';
import { styled } from 'nativewind';
import { NavigationProp, RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../../types';
import { EvaIcon } from '../../components/icons';
import { H3, Body, ScreenWrapper } from '../../components/ui';
import { OVERLAYS, SHADOWS } from '../../theme/shadows';
import * as Clipboard from 'expo-clipboard';
import { getUserFriendCode, addFriendByCode, bulkAddFriendsByCodes } from '../../services/friendService';
import { getUserProfile } from '../../services/profileService';
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
import { createLogger } from '../../utils/secureLogger';
import { showToast } from '../../utils/toast';
import { FONTS, FONT_SIZES } from '../../constants/typography';
import { COLORS } from '../../theme/colors';

const logger = createLogger('ContactInviteScreen');

interface Props {
  navigation: NavigationProp<RootStackParamList, 'ContactInvite'>;
  route: RouteProp<RootStackParamList, 'ContactInvite'>;
}

const StyledView = styled(View);
const StyledText = styled(Text);
const StyledTouchableOpacity = styled(TouchableOpacity);
const StyledTextInput = styled(TextInput);

const ON_BRIDGE_SECTION = 'On Bridge';
const SUGGESTED_SECTION = 'Suggested';

// ── Contact Row ──────────────────────────────────────────────────────────────

const REMIND_AFTER_MS = 3 * 24 * 60 * 60 * 1000; // 3 days

interface ContactRowProps {
  contact: NormalizedContact;
  isSelected: boolean;
  isAdding: boolean;
  onToggleSelect: (c: NormalizedContact) => void;
  onAddFriend: (c: NormalizedContact) => void;
  onInviteSingle: (c: NormalizedContact) => void;
}

const AVATAR_SIZE = 40;

const ContactAvatar = React.memo(({ contact, bgColor, textColor }: { contact: NormalizedContact; bgColor: string; textColor: string }) => {
  if (contact.imageUri) {
    return (
      <Image
        source={{ uri: contact.imageUri }}
        style={{ width: AVATAR_SIZE, height: AVATAR_SIZE, borderRadius: AVATAR_SIZE / 2, marginRight: 12 }}
      />
    );
  }
  return (
    <StyledView className={`w-10 h-10 rounded-full items-center justify-center mr-3 ${bgColor}`}>
      <StyledText className={`font-semibold text-base ${textColor}`}>
        {contact.name[0]?.toUpperCase()}
      </StyledText>
    </StyledView>
  );
});

const ContactRow = React.memo(({ contact, isSelected, isAdding, onToggleSelect, onAddFriend, onInviteSingle }: ContactRowProps) => {
  // On Bridge contacts — "Add Friend" or "Added" if already friends
  if (contact.isOnBridge) {
    const alreadyAdded = contact.isAlreadyFriend;
    return (
      <StyledView className="flex-row items-center px-4 py-3 bg-white">
        <ContactAvatar contact={contact} bgColor="bg-green-100" textColor="text-green-600" />
        <StyledView className="flex-1 mr-3">
          <StyledText className="text-neutral-900 font-medium text-sm" numberOfLines={1}>
            {contact.name}
          </StyledText>
          <StyledText className="text-green-600 text-xs font-medium">On Bridge</StyledText>
        </StyledView>
        {alreadyAdded ? (
          <StyledView className="bg-green-100 px-4 py-2 rounded-full">
            <StyledText className="text-green-700 text-xs font-semibold">Added</StyledText>
          </StyledView>
        ) : (
          <StyledTouchableOpacity
            className={`px-4 py-2 rounded-full ${isAdding ? 'bg-green-300' : 'bg-green-500'}`}
            onPress={() => onAddFriend(contact)}
            disabled={isAdding}
          >
            {isAdding ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <StyledText className="text-white text-xs font-semibold">Add Friend</StyledText>
            )}
          </StyledTouchableOpacity>
        )}
      </StyledView>
    );
  }

  // Check if invite is old enough to show "Remind"
  const canRemind = contact.isInvited && contact.invitedAt && (Date.now() - contact.invitedAt) > REMIND_AFTER_MS;

  // Regular contacts — selectable for batch invite
  return (
    <StyledTouchableOpacity
      className="flex-row items-center px-4 py-3 bg-white"
      onPress={() => canRemind ? onInviteSingle(contact) : onToggleSelect(contact)}
      activeOpacity={0.7}
      disabled={contact.isInvited && !canRemind}
    >
      {/* Avatar / checkbox */}
      {isSelected ? (
        <StyledView className="w-10 h-10 rounded-full items-center justify-center mr-3 bg-primary-500">
          <EvaIcon name="checkmark" variant="outline" color="white" size={20} />
        </StyledView>
      ) : (
        <ContactAvatar
          contact={contact}
          bgColor={contact.isInvited ? 'bg-neutral-200' : 'bg-primary-100'}
          textColor={contact.isInvited ? 'text-neutral-400' : 'text-primary-500'}
        />
      )}

      {/* Name + phone */}
      <StyledView className="flex-1 mr-3">
        <StyledText className={`font-medium text-sm ${
          contact.isInvited && !canRemind ? 'text-neutral-400' : 'text-neutral-900'
        }`} numberOfLines={1}>
          {contact.name}
        </StyledText>
        <StyledText className="text-neutral-500 text-xs" numberOfLines={1}>
          {contact.phoneNumber}
        </StyledText>
      </StyledView>

      {/* Right side: checkbox, status, or remind */}
      {canRemind ? (
        <StyledTouchableOpacity
          className="bg-primary-100 px-3 py-1.5 rounded-full"
          onPress={() => onInviteSingle(contact)}
        >
          <StyledText className="text-primary-500 text-xs font-semibold">Remind</StyledText>
        </StyledTouchableOpacity>
      ) : contact.isInvited ? (
        <StyledView className="bg-neutral-100 px-3 py-1.5 rounded-full">
          <StyledText className="text-neutral-400 text-xs font-semibold">Invited</StyledText>
        </StyledView>
      ) : (
        <StyledView className={`w-6 h-6 rounded-full border-2 items-center justify-center ${
          isSelected ? 'bg-primary-500 border-primary-500' : 'border-neutral-300'
        }`}>
          {isSelected && <EvaIcon name="checkmark" variant="outline" color="white" size={14} />}
        </StyledView>
      )}
    </StyledTouchableOpacity>
  );
});

// ── Section Header ───────────────────────────────────────────────────────────

interface SectionHeaderProps {
  title: string;
  onAddAll?: () => void;
  addAllDisabled?: boolean;
  addAllLabel?: string;
}

const SectionHeader = React.memo(({ title, onAddAll, addAllDisabled, addAllLabel }: SectionHeaderProps) => {
  const isOnBridge = title === ON_BRIDGE_SECTION;
  const isSuggested = title === SUGGESTED_SECTION;
  const bgClass = isOnBridge ? 'bg-green-50' : isSuggested ? 'bg-primary-50' : 'bg-neutral-100';
  const textClass = isOnBridge ? 'text-green-700' : isSuggested ? 'text-primary-600' : 'text-neutral-500';
  return (
    <StyledView className={`px-4 py-2 ${bgClass}`}>
      <StyledView className="flex-row items-center justify-between">
        <StyledView className="flex-row items-center">
          {isOnBridge && (
            <StyledView className="mr-1.5">
              <EvaIcon name="checkmark-circle-2" variant="outline" color="success" size={14} />
            </StyledView>
          )}
          {isSuggested && (
            <StyledView className="mr-1.5">
              <EvaIcon name="star" variant="outline" color="primary" size={14} />
            </StyledView>
          )}
          <StyledText className={`text-xs font-bold ${textClass}`}>
            {title}
          </StyledText>
        </StyledView>
        {onAddAll && (
          <StyledTouchableOpacity
            onPress={onAddAll}
            disabled={addAllDisabled}
            className={`px-3 py-1 rounded-full ${addAllDisabled ? 'bg-green-100' : 'bg-green-500'}`}
          >
            <StyledText className={`text-xs font-semibold ${addAllDisabled ? 'text-green-400' : 'text-white'}`}>
              {addAllLabel || 'Add All'}
            </StyledText>
          </StyledTouchableOpacity>
        )}
      </StyledView>
    </StyledView>
  );
});

// ── Main Screen ──────────────────────────────────────────────────────────────

export const ContactInviteScreen: React.FC<Props> = ({ navigation, route }) => {
  const [permissionStatus, setPermissionStatus] = useState<string | null>(null);
  const [contacts, setContacts] = useState<NormalizedContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
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
  const enterCodeInputRef = useRef<TextInput>(null);

  // Load friend code + sender name on mount
  useEffect(() => {
    getUserFriendCode().then((result) => {
      if (result.ok && result.data) setFriendCode(result.data.code);
    });
    getUserProfile().then((result) => {
      if (result.ok && result.data) setSenderName(result.data.firstName);
    });
    getBridgeUserCount().then(setBridgeUserCount);
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
        const { supabase } = await import('../../lib/supabase');
        const { data, error } = await supabase
          .rpc('send_friend_request', { friend_code: code.toUpperCase() });
        const row = data?.[0];
        if (!error && (row?.success || row?.message?.includes('already friends'))) {
          processedCodeRef.current = code;
          if (row?.was_auto_accepted) {
            showToast.success('Friend added!', 'You were connected via invite link');
          } else {
            showToast.success('Request sent!', 'Friend request sent via invite link');
          }
        } else {
          processedCodeRef.current = code;
          showToast.error('Could not send request', row?.message || 'Invalid code');
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
      const status = await requestContactsPermission();
      setPermissionStatus(status);

      if (status === 'granted') {
        const raw = await fetchAndNormalizeContacts();
        const marked = await markBridgeUsers(raw);
        setContacts(marked);
      }
    } catch (err) {
      logger.error('Permission request failed:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleToggleSelect = useCallback((contact: NormalizedContact) => {
    if (contact.isInvited) return;
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
      // Optimistic UI update — mark as added immediately
      setContacts((prev) => prev.map((c) => c.id === contact.id ? { ...c, isAlreadyFriend: true } : c));

      const { supabase } = await import('../../lib/supabase');
      const { data: codeRow } = await supabase
        .from('friend_codes')
        .select('code')
        .eq('user_id', contact.bridgeUserId)
        .single();

      if (!codeRow?.code) {
        setContacts((prev) => prev.map((c) => c.id === contact.id ? { ...c, isAlreadyFriend: false } : c));
        showToast.error('Error', 'Could not find their friend code');
        return;
      }

      const { data, error } = await supabase
        .rpc('send_friend_request', { friend_code: codeRow.code });

      const row = data?.[0];
      if (error || (!row?.success && !row?.message?.includes('already friends'))) {
        setContacts((prev) => prev.map((c) => c.id === contact.id ? { ...c, isAlreadyFriend: false } : c));
        showToast.error('Error', row?.message || 'Could not send request');
        return;
      }

      if (row?.was_auto_accepted) {
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

    setSending(true);
    try {
      const selectedContacts = contacts.filter((c) => selectedIds.has(c.id));
      const phoneNumbers = selectedContacts.map((c) => c.phoneNumber);

      const sent = await composeSmsInvite(phoneNumbers, friendCode, senderName);

      if (sent) {
        await markMultipleAsInvited(phoneNumbers);
        setContacts((prev) =>
          prev.map((c) =>
            selectedIds.has(c.id) ? { ...c, isInvited: true, invitedAt: Date.now() } : c
          )
        );
        setSelectedIds(new Set());
        setCelebrationCount(selectedContacts.length);
        setTimeout(() => setCelebrationCount(0), 2500);
      }
    } catch (err) {
      logger.error('Send invites failed:', err);
    } finally {
      setSending(false);
    }
  }, [selectedIds, contacts, friendCode, senderName]);

  const handleInviteSingle = useCallback(async (contact: NormalizedContact) => {
    if (!friendCode) {
      showToast.error('Error', 'Could not load your friend code');
      return;
    }

    const sent = await composeSmsInvite([contact.phoneNumber], friendCode, senderName);
    if (sent) {
      await markAsInvited(contact.phoneNumber);
      setContacts((prev) =>
        prev.map((c) => c.id === contact.id ? { ...c, isInvited: true } : c)
      );
      showToast.success('Sent!', `Invite sent to ${contact.name}`);
    }
  }, [friendCode, senderName]);

  const handleShareCode = useCallback(async () => {
    if (!friendCode) return;
    const message = await buildInviteMessage(friendCode, senderName);
    Share.share({ message });
  }, [friendCode, senderName]);

  const handleCopyCode = useCallback(async () => {
    if (!friendCode) return;
    await Clipboard.setStringAsync(friendCode);
    showToast.success('Copied!', 'Friend code copied to clipboard');
  }, [friendCode]);

  const handleEnterCode = useCallback(async () => {
    const code = enterCodeValue.trim().toUpperCase();
    if (!code) {
      setEnterCodeError('Enter a friend code');
      return;
    }
    if (!/^BRIDGE-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(code)) {
      setEnterCodeError('Format: BRIDGE-XXXX-XXXX');
      return;
    }
    if (code === friendCode) {
      setEnterCodeError("That's your own code");
      return;
    }
    setAddingCode(true);
    setEnterCodeError('');
    try {
      const result = await addFriendByCode(code);
      if (result.ok) {
        setEnterCodeValue('');
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

  const [addingAll, setAddingAll] = useState(false);

  const handleAddAllBridge = useCallback(async () => {
    const onBridgeNotAdded = contacts.filter((c) => c.isOnBridge && !c.isAlreadyFriend && c.bridgeUserId);
    if (onBridgeNotAdded.length === 0) return;

    setAddingAll(true);

    // Single batch query for all friend codes
    const { supabase } = await import('../../lib/supabase');
    const userIds = onBridgeNotAdded.map((c) => c.bridgeUserId!);
    const { data: codeRows } = await supabase
      .from('friend_codes')
      .select('user_id, code')
      .in('user_id', userIds);

    const codeMap = new Map<string, string>();
    for (const row of codeRows || []) {
      codeMap.set(row.user_id, row.code);
    }

    const codesToAdd = onBridgeNotAdded
      .map((c) => codeMap.get(c.bridgeUserId!))
      .filter(Boolean) as string[];

    // Parallel RPCs — no rate limiting, no profile fetching
    const addedCodes = await bulkAddFriendsByCodes(codesToAdd);

    // Map back to contact IDs
    const addedUserIds = new Set<string>();
    for (const [userId, code] of codeMap) {
      if (addedCodes.has(code)) addedUserIds.add(userId);
    }

    const count = addedUserIds.size;
    if (count > 0) {
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

  // Build sections: "On Bridge" at top, then "Suggested", then A-Z
  const filteredSections = useMemo((): ContactSection[] => {
    let filtered = contacts;
    const isSearching = searchQuery.trim().length > 0;
    if (isSearching) {
      const q = searchQuery.trim().toLowerCase();
      filtered = contacts.filter((c) => c.name.toLowerCase().includes(q));
    }

    const onBridge = filtered.filter((c) => c.isOnBridge);
    const notOnBridge = filtered.filter((c) => !c.isOnBridge);

    const sections: ContactSection[] = [];
    if (onBridge.length > 0) {
      sections.push({ title: ON_BRIDGE_SECTION, data: onBridge });
    }

    // Only show Suggested when not searching
    if (!isSearching) {
      const suggested = getSuggestedContacts(notOnBridge);
      if (suggested.length > 0) {
        sections.push({ title: SUGGESTED_SECTION, data: suggested });
      }
    }

    const alphabetical = groupContactsAlphabetically(notOnBridge);
    sections.push(...alphabetical);

    return sections;
  }, [contacts, searchQuery]);

  const renderItem = useCallback(
    ({ item }: { item: NormalizedContact }) => (
      <ContactRow
        contact={item}
        isSelected={selectedIds.has(item.id)}
        isAdding={addingFriendId === item.id}
        onToggleSelect={handleToggleSelect}
        onAddFriend={handleAddFriend}
        onInviteSingle={handleInviteSingle}
      />
    ),
    [selectedIds, addingFriendId, handleToggleSelect, handleAddFriend, handleInviteSingle]
  );

  const renderSectionHeader = useCallback(
    ({ section }: { section: ContactSection }) => {
      if (section.title === ON_BRIDGE_SECTION && unadddedBridgeCount > 0) {
        return (
          <SectionHeader
            title={section.title}
            onAddAll={handleAddAllBridge}
            addAllDisabled={addingAll}
            addAllLabel={addingAll ? 'Adding...' : `Add All (${unadddedBridgeCount})`}
          />
        );
      }
      return <SectionHeader title={section.title} />;
    },
    [unadddedBridgeCount, handleAddAllBridge, addingAll]
  );

  const keyExtractor = useCallback((item: NormalizedContact) => item.id, []);

  return (
    <ScreenWrapper>

      {/* Header */}
      <StyledView className="flex-row items-center justify-between px-4 py-3 border-b border-neutral-200 bg-white">
        <StyledTouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <EvaIcon name="arrow-back" variant="outline" color="text" size={24} />
        </StyledTouchableOpacity>
        <H3>Invite Friends</H3>
        <StyledView className="w-6" />
      </StyledView>

      {/* Loading */}
      {loading && (
        <StyledView className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={COLORS.primaryAccent} />
          <Body className="text-neutral-500 mt-4">Loading contacts...</Body>
        </StyledView>
      )}

      {/* Permission: undetermined */}
      {!loading && permissionStatus !== 'granted' && permissionStatus !== 'denied' && (
        <StyledView className="flex-1 px-8 pt-12">
          {/* Friend code card */}
          {friendCode ? (
            <StyledView
              className="bg-primary-50 rounded-2xl px-6 pt-5 pb-6 items-center mb-8"
              style={{ borderWidth: 1, borderColor: 'rgba(67, 127, 255, 0.12)' }}
            >
              <StyledText className="text-xs font-bold text-primary-400 tracking-widest mb-1">YOUR FRIEND CODE</StyledText>
              <StyledText style={{ fontSize: FONT_SIZES['3xl'], fontFamily: FONTS.extraBold, color: '#0B1226', letterSpacing: -0.5, marginBottom: 16 }}>
                {friendCode}
              </StyledText>
              <StyledView className="flex-row" style={{ gap: 12 }}>
                <StyledTouchableOpacity
                  className="flex-1 flex-row items-center justify-center py-3 rounded-xl"
                  style={{ borderWidth: 1.5, borderColor: COLORS.primaryAccent }}
                  onPress={handleShareCode}
                >
                  <EvaIcon name="share" variant="outline" size={18} color={COLORS.primaryAccent} />
                  <StyledText className="ml-2 font-semibold text-sm" style={{ color: COLORS.primaryAccent }}>Share Code</StyledText>
                </StyledTouchableOpacity>
                <StyledTouchableOpacity
                  className="flex-1 flex-row items-center justify-center py-3 rounded-xl"
                  style={{ borderWidth: 1.5, borderColor: COLORS.primaryAccent }}
                  onPress={() => enterCodeInputRef.current?.focus()}
                >
                  <StyledText className="font-semibold text-sm" style={{ color: COLORS.primaryAccent }}>Enter a Code</StyledText>
                </StyledTouchableOpacity>
              </StyledView>
            </StyledView>
          ) : null}

          {/* Enter code input */}
          <StyledView className="flex-row items-center mb-4">
            <StyledView className="flex-1 flex-row items-center bg-neutral-100 rounded-lg px-3 py-2 mr-2">
              <TextInput
                ref={enterCodeInputRef}
                style={{ flex: 1, fontSize: FONT_SIZES.base, color: '#0B1226' }}
                placeholder="Enter friend code"
                placeholderTextColor={COLORS.text.disabled}
                value={enterCodeValue}
                onChangeText={(t: string) => { setEnterCodeValue(t); setEnterCodeError(''); }}
                autoCapitalize="characters"
                autoCorrect={false}
              />
            </StyledView>
            <StyledTouchableOpacity
              className={`px-4 py-2 rounded-lg ${addingCode ? 'bg-primary-300' : 'bg-primary-500'}`}
              onPress={handleEnterCode}
              disabled={addingCode}
            >
              <StyledText className="text-white text-sm font-semibold">
                {addingCode ? '...' : 'Add'}
              </StyledText>
            </StyledTouchableOpacity>
          </StyledView>
          {enterCodeError ? (
            <StyledText className="text-red-500 text-xs mb-4 -mt-2">{enterCodeError}</StyledText>
          ) : null}

          {/* Contacts access prompt */}
          <StyledView className="items-center mt-6">
            <StyledView className="w-16 h-16 bg-primary-100 rounded-full items-center justify-center mb-3">
              <EvaIcon name="people" variant="outline" color="primary" size={30} />
            </StyledView>
            <StyledText className="text-base font-semibold text-neutral-900 text-center mb-1">
              Find friends from your contacts
            </StyledText>
            <StyledText className="text-sm text-neutral-500 text-center mb-4">
              {bridgeUserCount > 0
                ? `${bridgeUserCount} ${bridgeUserCount === 1 ? 'person is' : 'people are'} already on Bridge`
                : 'We never store or upload your contacts'}
            </StyledText>
            <StyledTouchableOpacity
              className="bg-primary-500 px-6 py-3 rounded-xl"
              onPress={handleRequestPermission}
            >
              <StyledText className="text-white font-semibold">Allow Contacts Access</StyledText>
            </StyledTouchableOpacity>
          </StyledView>
        </StyledView>
      )}

      {/* Permission: denied */}
      {!loading && permissionStatus === 'denied' && (
        <StyledView className="flex-1 px-8 pt-12">
          {/* Friend code card */}
          {friendCode ? (
            <StyledView
              className="bg-primary-50 rounded-2xl px-6 pt-5 pb-6 items-center mb-8"
              style={{ borderWidth: 1, borderColor: 'rgba(67, 127, 255, 0.12)' }}
            >
              <StyledText className="text-xs font-bold text-primary-400 tracking-widest mb-1">YOUR FRIEND CODE</StyledText>
              <StyledText style={{ fontSize: FONT_SIZES['3xl'], fontFamily: FONTS.extraBold, color: '#0B1226', letterSpacing: -0.5, marginBottom: 16 }}>
                {friendCode}
              </StyledText>
              <StyledView className="flex-row" style={{ gap: 12 }}>
                <StyledTouchableOpacity
                  className="flex-1 flex-row items-center justify-center py-3 rounded-xl"
                  style={{ borderWidth: 1.5, borderColor: COLORS.primaryAccent }}
                  onPress={handleShareCode}
                >
                  <EvaIcon name="share" variant="outline" size={18} color={COLORS.primaryAccent} />
                  <StyledText className="ml-2 font-semibold text-sm" style={{ color: COLORS.primaryAccent }}>Share Code</StyledText>
                </StyledTouchableOpacity>
                <StyledTouchableOpacity
                  className="flex-1 flex-row items-center justify-center py-3 rounded-xl"
                  style={{ borderWidth: 1.5, borderColor: COLORS.primaryAccent }}
                  onPress={() => enterCodeInputRef.current?.focus()}
                >
                  <StyledText className="font-semibold text-sm" style={{ color: COLORS.primaryAccent }}>Enter a Code</StyledText>
                </StyledTouchableOpacity>
              </StyledView>
            </StyledView>
          ) : null}

          {/* Enter code input */}
          <StyledView className="flex-row items-center mb-4">
            <StyledView className="flex-1 flex-row items-center bg-neutral-100 rounded-lg px-3 py-2 mr-2">
              <TextInput
                ref={enterCodeInputRef}
                style={{ flex: 1, fontSize: FONT_SIZES.base, color: '#0B1226' }}
                placeholder="Enter friend code"
                placeholderTextColor={COLORS.text.disabled}
                value={enterCodeValue}
                onChangeText={(t: string) => { setEnterCodeValue(t); setEnterCodeError(''); }}
                autoCapitalize="characters"
                autoCorrect={false}
              />
            </StyledView>
            <StyledTouchableOpacity
              className={`px-4 py-2 rounded-lg ${addingCode ? 'bg-primary-300' : 'bg-primary-500'}`}
              onPress={handleEnterCode}
              disabled={addingCode}
            >
              <StyledText className="text-white text-sm font-semibold">
                {addingCode ? '...' : 'Add'}
              </StyledText>
            </StyledTouchableOpacity>
          </StyledView>
          {enterCodeError ? (
            <StyledText className="text-red-500 text-xs mb-4 -mt-2">{enterCodeError}</StyledText>
          ) : null}

          {/* Settings prompt */}
          <StyledView className="items-center mt-4">
            <StyledText className="text-sm text-neutral-500 text-center mb-3">
              Want to invite contacts via SMS?
            </StyledText>
            <StyledTouchableOpacity
              className="px-5 py-2.5 rounded-xl bg-neutral-100"
              onPress={handleOpenSettings}
            >
              <StyledText className="text-neutral-700 font-semibold text-sm">Enable Contacts in Settings</StyledText>
            </StyledTouchableOpacity>
          </StyledView>
        </StyledView>
      )}

      {/* Permission: granted — show contact list */}
      {!loading && permissionStatus === 'granted' && (
        <>
          {/* Search bar */}
          <StyledView className="px-4 py-3 bg-white border-b border-neutral-200">
            <StyledView className="flex-row items-center bg-neutral-100 rounded-lg px-3 py-2">
              <EvaIcon name="search" variant="outline" color="neutral" size={18} />
              <StyledTextInput
                className="flex-1 ml-2 text-sm text-neutral-900"
                placeholder="Search contacts..."
                placeholderTextColor={COLORS.text.disabled}
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoCorrect={false}
              />
              {searchQuery.length > 0 && (
                <StyledTouchableOpacity onPress={() => setSearchQuery('')}>
                  <EvaIcon name="close" variant="outline" color="neutral" size={18} />
                </StyledTouchableOpacity>
              )}
            </StyledView>
          </StyledView>

          {/* Friend Code Strip */}
          {friendCode ? (
            <StyledView className="px-4 py-3 bg-white border-b border-neutral-200">
              {/* Your code + Copy/Share icons */}
              <StyledView className="flex-row items-center mb-2">
                <StyledText className="text-xs text-neutral-500 font-medium mr-1.5">Your code</StyledText>
                <StyledText className="text-xs font-bold text-primary-500 flex-1" numberOfLines={1}>{friendCode}</StyledText>
                <StyledTouchableOpacity
                  className="p-1.5 rounded-full bg-primary-50 ml-1"
                  onPress={handleCopyCode}
                  hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                >
                  <EvaIcon name="copy" variant="outline" size={16} color="#437FFF" />
                </StyledTouchableOpacity>
                <StyledTouchableOpacity
                  className="p-1.5 rounded-full bg-primary-50 ml-1"
                  onPress={handleShareCode}
                  hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                >
                  <EvaIcon name="share" variant="outline" size={16} color="#437FFF" />
                </StyledTouchableOpacity>
              </StyledView>
              {/* Enter a code */}
              <StyledView className="flex-row items-center">
                <StyledView className="flex-1 flex-row items-center bg-neutral-100 rounded-lg px-3 py-2 mr-2">
                  <StyledTextInput
                    className="flex-1 text-sm text-neutral-900"
                    placeholder="Enter friend code"
                    placeholderTextColor={COLORS.text.disabled}
                    value={enterCodeValue}
                    onChangeText={(t: string) => { setEnterCodeValue(t); setEnterCodeError(''); }}
                    autoCapitalize="characters"
                    autoCorrect={false}
                  />
                </StyledView>
                <StyledTouchableOpacity
                  className={`px-4 py-2 rounded-lg ${addingCode ? 'bg-primary-300' : 'bg-primary-500'}`}
                  onPress={handleEnterCode}
                  disabled={addingCode}
                >
                  <StyledText className="text-white text-sm font-semibold">
                    {addingCode ? '...' : 'Add'}
                  </StyledText>
                </StyledTouchableOpacity>
              </StyledView>
              {enterCodeError ? (
                <StyledText className="text-red-500 text-xs mt-1">{enterCodeError}</StyledText>
              ) : null}
            </StyledView>
          ) : null}

          {/* Contact list */}
          {filteredSections.length > 0 ? (
            <SectionList
              sections={filteredSections}
              keyExtractor={keyExtractor}
              renderItem={renderItem}
              renderSectionHeader={renderSectionHeader}
              stickySectionHeadersEnabled
              initialNumToRender={20}
              maxToRenderPerBatch={30}
              windowSize={10}
              contentContainerStyle={selectedIds.size > 0 ? { paddingBottom: 80 } : undefined}
            />
          ) : (
            <StyledView className="flex-1 items-center justify-center px-8">
              <Body className="text-neutral-500 text-center">
                {searchQuery ? 'No contacts match your search' : 'No contacts found'}
              </Body>
            </StyledView>
          )}

          {/* Floating Send button */}
          {selectedIds.size > 0 && (
            <StyledView
              className="absolute left-4 right-4 bottom-8"
              style={{
                shadowColor: COLORS.primaryAccent,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 8,
                elevation: 8,
              }}
            >
              <StyledTouchableOpacity
                className={`rounded-xl py-4 items-center ${sending ? 'bg-primary-300' : 'bg-primary-500'}`}
                onPress={handleSendInvites}
                disabled={sending}
              >
                <StyledText className="text-white font-bold text-base">
                  {sending
                    ? 'Opening Messages...'
                    : `Send ${selectedIds.size} Invite${selectedIds.size === 1 ? '' : 's'}`
                  }
                </StyledText>
              </StyledTouchableOpacity>
            </StyledView>
          )}
        </>
      )}
      {/* Celebration overlay */}
      {celebrationCount > 0 && (
        <View
          pointerEvents="none"
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: OVERLAYS.medium, alignItems: 'center', justifyContent: 'center', zIndex: 999 }}
        >
          <View style={{ backgroundColor: COLORS.card, borderRadius: 20, paddingHorizontal: 40, paddingVertical: 32, alignItems: 'center', ...SHADOWS.xxl }}>
            <EvaIcon name="award" variant="outline" size={48} color={COLORS.primaryAccent} />
            <View style={{ marginBottom: 8 }} />
            <Text style={{ fontSize: FONT_SIZES['3xl'], fontWeight: '700', fontFamily: FONTS.bold, color: '#0B1226', marginBottom: 4 }}>
              {celebrationCount} invite{celebrationCount === 1 ? '' : 's'} sent!
            </Text>
            <Text style={{ fontSize: FONT_SIZES.base, color: COLORS.text.label, textAlign: 'center', fontFamily: FONTS.regular }}>
              Your friends are going to love Bridge
            </Text>
          </View>
        </View>
      )}
    </ScreenWrapper>
  );
};
