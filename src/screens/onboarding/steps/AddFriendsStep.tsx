import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  SectionList,
  TouchableOpacity,
  ActivityIndicator,
  Share,
  Image,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { styled } from 'nativewind';
import { H1, H2, Body, Input, Button } from '../../../components/ui';
import { OnboardingData } from '../../../types';
import { EvaIcon } from '../../../components/icons';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { getUserFriendCode, addFriendByCode, bulkAddFriendsByCodes } from '../../../services/friendService';
import { getUserProfile } from '../../../services/profileService';
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
  markAsInvited,
  markMultipleAsInvited,
  getSuggestedContacts,
} from '../../../services/contactsService';
import { showToast } from '../../../utils/toast';
import { createLogger } from '../../../utils/secureLogger';
import { FONTS } from '../../../constants/typography';

const logger = createLogger('AddFriendsStep');

interface AddFriendsStepProps {
  data: Partial<OnboardingData>;
  updateData: (data: Partial<OnboardingData>) => void;
  onNext: () => void;
  onBack: () => void;
  isFirstStep: boolean;
  isLastStep: boolean;
}

const StyledView = styled(View);
const StyledText = styled(Text);
const StyledTouchableOpacity = styled(TouchableOpacity);
const StyledTextInput = styled(TextInput);
const StyledSafeAreaView = styled(SafeAreaView);

const ON_BRIDGE_SECTION = 'On Bridge';
const SUGGESTED_SECTION = 'Suggested';
const FRIEND_CODE_PATTERN = /^BRIDGE-[A-Z0-9]{4}-[A-Z0-9]{4}$/;
const REMIND_AFTER_MS = 3 * 24 * 60 * 60 * 1000;
const AVATAR_SIZE = 40;

// ── Contact Avatar ──────────────────────────────────────────────────────────

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
      <StyledText className={`font-semibold text-base ${textColor}`} style={{ fontFamily: FONTS.semiBold }}>
        {contact.name[0]?.toUpperCase()}
      </StyledText>
    </StyledView>
  );
});

// ── Contact Row ─────────────────────────────────────────────────────────────

interface ContactRowProps {
  contact: NormalizedContact;
  isSelected: boolean;
  isAdding: boolean;
  onToggleSelect: (c: NormalizedContact) => void;
  onAddFriend: (c: NormalizedContact) => void;
  onInviteSingle: (c: NormalizedContact) => void;
}

const ContactRow = React.memo(({ contact, isSelected, isAdding, onToggleSelect, onAddFriend, onInviteSingle }: ContactRowProps) => {
  if (contact.isOnBridge) {
    const alreadyAdded = contact.isAlreadyFriend;
    return (
      <StyledView className="flex-row items-center px-4 py-3 bg-white">
        <ContactAvatar contact={contact} bgColor="bg-green-100" textColor="text-green-600" />
        <StyledView className="flex-1 mr-3">
          <StyledText className="text-neutral-900 font-medium text-sm" numberOfLines={1} style={{ fontFamily: FONTS.medium }}>
            {contact.name}
          </StyledText>
          <StyledText className="text-green-600 text-xs font-medium" style={{ fontFamily: FONTS.medium }}>On Bridge</StyledText>
        </StyledView>
        {alreadyAdded ? (
          <StyledView className="bg-green-100 px-4 py-2 rounded-full">
            <StyledText className="text-green-700 text-xs font-semibold" style={{ fontFamily: FONTS.semiBold }}>Added</StyledText>
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
              <StyledText className="text-white text-xs font-semibold" style={{ fontFamily: FONTS.semiBold }}>Add Friend</StyledText>
            )}
          </StyledTouchableOpacity>
        )}
      </StyledView>
    );
  }

  const canRemind = contact.isInvited && contact.invitedAt && (Date.now() - contact.invitedAt) > REMIND_AFTER_MS;

  return (
    <StyledTouchableOpacity
      className="flex-row items-center px-4 py-3 bg-white"
      onPress={() => canRemind ? onInviteSingle(contact) : onToggleSelect(contact)}
      activeOpacity={0.7}
      disabled={contact.isInvited && !canRemind}
    >
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

      <StyledView className="flex-1 mr-3">
        <StyledText className={`font-medium text-sm ${
          contact.isInvited && !canRemind ? 'text-neutral-400' : 'text-neutral-900'
        }`} numberOfLines={1} style={{ fontFamily: FONTS.medium }}>
          {contact.name}
        </StyledText>
        <StyledText className="text-neutral-500 text-xs" numberOfLines={1} style={{ fontFamily: FONTS.regular }}>
          {contact.phoneNumber}
        </StyledText>
      </StyledView>

      {canRemind ? (
        <StyledTouchableOpacity
          className="bg-primary-100 px-3 py-1.5 rounded-full"
          onPress={() => onInviteSingle(contact)}
        >
          <StyledText className="text-primary-500 text-xs font-semibold" style={{ fontFamily: FONTS.semiBold }}>Remind</StyledText>
        </StyledTouchableOpacity>
      ) : contact.isInvited ? (
        <StyledView className="bg-neutral-100 px-3 py-1.5 rounded-full">
          <StyledText className="text-neutral-400 text-xs font-semibold" style={{ fontFamily: FONTS.semiBold }}>Invited</StyledText>
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

// ── Section Header ──────────────────────────────────────────────────────────

const SectionHeader = React.memo(({ title, onAddAll, addAllDisabled, addAllLabel }: {
  title: string;
  onAddAll?: () => void;
  addAllDisabled?: boolean;
  addAllLabel?: string;
}) => {
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
          <StyledText className={`text-xs font-bold ${textClass}`} style={{ fontFamily: FONTS.bold }}>
            {title}
          </StyledText>
        </StyledView>
        {onAddAll && (
          <StyledTouchableOpacity
            onPress={onAddAll}
            disabled={addAllDisabled}
            className={`px-3 py-1 rounded-full ${addAllDisabled ? 'bg-green-100' : 'bg-green-500'}`}
          >
            <StyledText className={`text-xs font-semibold ${addAllDisabled ? 'text-green-400' : 'text-white'}`} style={{ fontFamily: FONTS.semiBold }}>
              {addAllLabel || 'Add All'}
            </StyledText>
          </StyledTouchableOpacity>
        )}
      </StyledView>
    </StyledView>
  );
});

// ── Main Step ───────────────────────────────────────────────────────────────

export const AddFriendsStep: React.FC<AddFriendsStepProps> = ({
  data,
  updateData,
  onNext,
  onBack,
}) => {
  // Permission & contacts state
  const [permissionStatus, setPermissionStatus] = useState<string | null>(null);
  const [contacts, setContacts] = useState<NormalizedContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [sending, setSending] = useState(false);
  const [addingFriendId, setAddingFriendId] = useState<string | null>(null);
  const [addingAll, setAddingAll] = useState(false);

  // Friend code state
  const [friendCode, setFriendCode] = useState('');
  const [senderName, setSenderName] = useState('');
  const [enterCodeValue, setEnterCodeValue] = useState('');
  const [enterCodeError, setEnterCodeError] = useState('');
  const [addingCode, setAddingCode] = useState(false);
  const [addedFriends, setAddedFriends] = useState<string[]>([]);

  // Load friend code + sender name
  useEffect(() => {
    getUserFriendCode().then((result) => {
      if (result.ok && result.data) setFriendCode(result.data.code);
    });
    getUserProfile().then((result) => {
      if (result.ok && result.data) setSenderName(result.data.firstName);
    });
  }, []);

  // Request permission on mount — prompts the user immediately
  useEffect(() => {
    const init = async () => {
      try {
        const status = await requestContactsPermission();
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

  const handleRequestPermission = useCallback(async () => {
    // If already denied once, iOS won't re-prompt — open Settings instead
    if (permissionStatus === 'denied') {
      if (Platform.OS === 'ios') Linking.openURL('app-settings:');
      else Linking.openSettings();
      return;
    }
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
  }, [permissionStatus]);

  // ── Contact list handlers ───────────────────────────────────────────────

  const handleToggleSelect = useCallback((contact: NormalizedContact) => {
    if (contact.isInvited) return;
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(contact.id)) next.delete(contact.id);
      else next.add(contact.id);
      return next;
    });
  }, []);

  const handleAddFriend = useCallback(async (contact: NormalizedContact) => {
    if (!contact.bridgeUserId || contact.isAlreadyFriend) return;
    setAddingFriendId(contact.id);
    try {
      setContacts((prev) => prev.map((c) => c.id === contact.id ? { ...c, isAlreadyFriend: true } : c));
      const { supabase } = await import('../../../lib/supabase');
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
      const { data: rpcData, error } = await supabase
        .rpc('add_friend_by_code', { friend_code: codeRow.code });
      const row = rpcData?.[0];
      if (error || (!row?.success && !row?.message?.includes('already friends'))) {
        setContacts((prev) => prev.map((c) => c.id === contact.id ? { ...c, isAlreadyFriend: false } : c));
        showToast.error('Error', row?.message || 'Could not add friend');
        return;
      }
      showToast.success('Friend added!', `${contact.name} is now your friend on Bridge`);
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
      }
    } catch (err) {
      logger.error('Send invites failed:', err);
    } finally {
      setSending(false);
    }
  }, [selectedIds, contacts, friendCode, senderName]);

  const handleInviteSingle = useCallback(async (contact: NormalizedContact) => {
    if (!friendCode) return;
    const sent = await composeSmsInvite([contact.phoneNumber], friendCode, senderName);
    if (sent) {
      await markAsInvited(contact.phoneNumber);
      setContacts((prev) =>
        prev.map((c) => c.id === contact.id ? { ...c, isInvited: true } : c)
      );
      showToast.success('Sent!', `Invite sent to ${contact.name}`);
    }
  }, [friendCode, senderName]);

  const handleAddAllBridge = useCallback(async () => {
    const onBridgeNotAdded = contacts.filter((c) => c.isOnBridge && !c.isAlreadyFriend && c.bridgeUserId);
    if (onBridgeNotAdded.length === 0) return;
    setAddingAll(true);
    const { supabase } = await import('../../../lib/supabase');
    const userIds = onBridgeNotAdded.map((c) => c.bridgeUserId!);
    const { data: codeRows } = await supabase
      .from('friend_codes')
      .select('user_id, code')
      .in('user_id', userIds);
    const codeMap = new Map<string, string>();
    for (const row of codeRows || []) codeMap.set(row.user_id, row.code);
    const codesToAdd = onBridgeNotAdded
      .map((c) => codeMap.get(c.bridgeUserId!))
      .filter(Boolean) as string[];
    const addedCodes = await bulkAddFriendsByCodes(codesToAdd);
    const addedUserIds = new Set<string>();
    for (const [userId, code] of codeMap) {
      if (addedCodes.has(code)) addedUserIds.add(userId);
    }
    if (addedUserIds.size > 0) {
      setContacts((prev) => prev.map((c) =>
        c.bridgeUserId && addedUserIds.has(c.bridgeUserId) ? { ...c, isAlreadyFriend: true } : c
      ));
      showToast.success('Friends added!', `Added ${addedUserIds.size} friend${addedUserIds.size === 1 ? '' : 's'}`);
    }
    setAddingAll(false);
  }, [contacts]);

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
    if (!code) { setEnterCodeError('Enter a friend code'); return; }
    if (!FRIEND_CODE_PATTERN.test(code)) { setEnterCodeError('Format: BRIDGE-XXXX-XXXX'); return; }
    if (code === friendCode) { setEnterCodeError("That's your own code"); return; }
    setAddingCode(true);
    setEnterCodeError('');
    try {
      const result = await addFriendByCode(code);
      if (result.ok) {
        setEnterCodeValue('');
        const name = result.data?.friendProfile?.firstName || 'Friend';
        setAddedFriends((prev) => [...prev, name]);
        showToast.success('Friend added!', `${name} is now your friend`);
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

  const handleContinue = () => {
    updateData({ friendsAdded: addedFriends });
    onNext();
  };

  const handleSkip = () => {
    updateData({ friendsAdded: [] });
    onNext();
  };

  // ── Sections ────────────────────────────────────────────────────────────

  const unadddedBridgeCount = useMemo(
    () => contacts.filter((c) => c.isOnBridge && !c.isAlreadyFriend).length,
    [contacts]
  );

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
    if (onBridge.length > 0) sections.push({ title: ON_BRIDGE_SECTION, data: onBridge });
    if (!isSearching) {
      const suggested = getSuggestedContacts(notOnBridge);
      if (suggested.length > 0) sections.push({ title: SUGGESTED_SECTION, data: suggested });
    }
    sections.push(...groupContactsAlphabetically(notOnBridge));
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

  // Permission granted — show contacts list view
  const contactsGranted = !loading && permissionStatus === 'granted';

  // ── Render ──────────────────────────────────────────────────────────────

  // Contacts granted: custom layout with SectionList (can't nest in ScrollView)
  if (contactsGranted) {
    return (
      <StyledSafeAreaView edges={['top', 'bottom']} className="flex-1 bg-neutral-50">
        {/* Title area */}
        <StyledView className="px-6 pt-16 pb-3">
          <H1 className="mb-1">Add friends</H1>
          <Body className="text-neutral-500 text-sm">
            Friends vote on your matches and help you find the right person.
          </Body>
        </StyledView>

        {/* Friend Code Strip */}
        {friendCode ? (
          <StyledView className="px-4 py-3 bg-white border-b border-neutral-200">
            <StyledView className="flex-row items-center mb-2">
              <StyledText className="text-xs text-neutral-500 font-medium mr-1.5" style={{ fontFamily: FONTS.medium }}>Your code</StyledText>
              <StyledText className="text-xs font-bold text-primary-500 flex-1" numberOfLines={1} style={{ fontFamily: FONTS.bold }}>{friendCode}</StyledText>
              <StyledTouchableOpacity
                className="p-1.5 rounded-full bg-primary-50 ml-1"
                onPress={handleCopyCode}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              >
                <Ionicons name="copy-outline" size={16} color="#437FFF" />
              </StyledTouchableOpacity>
              <StyledTouchableOpacity
                className="p-1.5 rounded-full bg-primary-50 ml-1"
                onPress={handleShareCode}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              >
                <Ionicons name="share-outline" size={16} color="#437FFF" />
              </StyledTouchableOpacity>
            </StyledView>
            <StyledView className="flex-row items-center">
              <StyledView className="flex-1 flex-row items-center bg-neutral-100 rounded-lg px-3 py-2 mr-2">
                <StyledTextInput
                  className="flex-1 text-sm text-neutral-900"
                  placeholder="Enter friend code"
                  placeholderTextColor="#9CA3AF"
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
                <StyledText className="text-white text-sm font-semibold" style={{ fontFamily: FONTS.semiBold }}>
                  {addingCode ? '...' : 'Add'}
                </StyledText>
              </StyledTouchableOpacity>
            </StyledView>
            {enterCodeError ? (
              <StyledText className="text-red-500 text-xs mt-1" style={{ fontFamily: FONTS.regular }}>{enterCodeError}</StyledText>
            ) : null}
          </StyledView>
        ) : null}

        {/* Search bar */}
        <StyledView className="px-4 py-3 bg-white border-b border-neutral-200">
          <StyledView className="flex-row items-center bg-neutral-100 rounded-lg px-3 py-2">
            <EvaIcon name="search" variant="outline" color="neutral" size={18} />
            <StyledTextInput
              className="flex-1 ml-2 text-sm text-neutral-900"
              placeholder="Search contacts..."
              placeholderTextColor="#9CA3AF"
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
            contentContainerStyle={{ paddingBottom: selectedIds.size > 0 ? 140 : 80 }}
          />
        ) : (
          <StyledView className="flex-1 items-center justify-center px-8">
            <Body className="text-neutral-500 text-center">
              {searchQuery ? 'No contacts match your search' : 'No contacts found'}
            </Body>
          </StyledView>
        )}

        {/* Floating Send Invites button */}
        {selectedIds.size > 0 && (
          <StyledView
            className="absolute left-4 right-4"
            style={{
              bottom: 90,
              shadowColor: '#437FFF',
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
              <StyledText className="text-white font-bold text-base" style={{ fontFamily: FONTS.bold }}>
                {sending
                  ? 'Opening Messages...'
                  : `Send ${selectedIds.size} Invite${selectedIds.size === 1 ? '' : 's'}`
                }
              </StyledText>
            </StyledTouchableOpacity>
          </StyledView>
        )}

        {/* Bottom Continue / Skip */}
        <StyledView
          className="px-6 bg-neutral-50"
          style={{ paddingTop: 12, paddingBottom: 12, borderTopWidth: 1, borderTopColor: '#F3F4F6' }}
        >
          <Button onPress={handleContinue} variant="primary" size="lg" fullWidth>
            Continue
          </Button>
          <StyledTouchableOpacity onPress={handleSkip} className="items-center py-3">
            <Body className="text-neutral-500 text-sm">Skip for now</Body>
          </StyledTouchableOpacity>
        </StyledView>
      </StyledSafeAreaView>
    );
  }

  // ── Fallback: permission not granted — show friend code screen ────────

  return (
    <StyledSafeAreaView edges={['top', 'bottom']} className="flex-1 bg-neutral-50">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 64, paddingBottom: 24, flexGrow: 1 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <H1 className="mb-3">Add friends</H1>
          <Body className="text-neutral-600 mb-6">
            Friends vote on your daily matches and help you find the right person.
          </Body>

          {/* Loading state */}
          {loading && (
            <StyledView className="items-center py-6">
              <ActivityIndicator size="small" color="#437FFF" />
            </StyledView>
          )}

          {/* Your Friend Code */}
          {!loading && friendCode ? (
            <StyledView className="bg-primary-50 border border-primary-200 rounded-xl p-4 mb-6">
              <Body className="text-neutral-600 text-sm mb-2 text-center">Your friend code</Body>
              <StyledTouchableOpacity onPress={handleCopyCode} className="items-center mb-3">
                <H2 className="text-primary-500">{friendCode}</H2>
                <Body className="text-neutral-400 text-xs mt-1">Tap to copy</Body>
              </StyledTouchableOpacity>
              <StyledView className="flex-row">
                <StyledTouchableOpacity
                  onPress={handleShareCode}
                  className="flex-1 bg-primary-500 py-3 rounded-lg items-center mr-2"
                >
                  <Body className="text-white font-semibold">Share</Body>
                </StyledTouchableOpacity>
                <StyledTouchableOpacity
                  onPress={handleCopyCode}
                  className="flex-1 bg-white border border-primary-300 py-3 rounded-lg items-center ml-2"
                >
                  <Body className="text-primary-500 font-semibold">Copy</Body>
                </StyledTouchableOpacity>
              </StyledView>
            </StyledView>
          ) : null}

          {/* Enter a Friend's Code */}
          {!loading && (
            <StyledView className="mb-4">
              <Body className="font-semibold mb-2">Have a friend's code?</Body>
              <Input
                placeholder="BRIDGE-XXXX-XXXX"
                value={enterCodeValue}
                onChangeText={(text) => {
                  setEnterCodeValue(text.toUpperCase());
                  if (enterCodeError) setEnterCodeError('');
                }}
                autoCapitalize="characters"
                error={enterCodeError}
                containerClassName="mb-3"
              />
              <StyledTouchableOpacity
                onPress={handleEnterCode}
                disabled={addingCode}
                className={`py-3 rounded-lg items-center ${addingCode ? 'bg-primary-300' : 'bg-primary-500'}`}
              >
                <Body className="text-white font-semibold">
                  {addingCode ? 'Adding...' : 'Add Friend'}
                </Body>
              </StyledTouchableOpacity>
            </StyledView>
          )}

          {/* Added Friends */}
          {addedFriends.length > 0 && (
            <StyledView className="mb-4">
              <Body className="text-neutral-600 text-sm mb-2">
                Added ({addedFriends.length}):
              </Body>
              {addedFriends.map((name, i) => (
                <StyledView key={i} className="flex-row items-center mb-1">
                  <Ionicons name="checkmark-circle" size={18} color="#22C55E" />
                  <Body className="text-neutral-700 ml-2">{name}</Body>
                </StyledView>
              ))}
            </StyledView>
          )}

          {/* Access Contacts button */}
          {!loading && (
            <StyledTouchableOpacity
              onPress={handleRequestPermission}
              className="flex-row items-center justify-center py-3 mb-1"
            >
              <Ionicons name="people-outline" size={18} color="#437FFF" />
              <Body className="text-primary-500 font-semibold ml-2">Access Contacts</Body>
            </StyledTouchableOpacity>
          )}
        </ScrollView>

        {/* Bottom Continue / Skip */}
        <StyledView
          className="px-6 bg-neutral-50"
          style={{ paddingTop: 16, paddingBottom: 16, borderTopWidth: 1, borderTopColor: '#F3F4F6' }}
        >
          <Button onPress={handleContinue} variant="primary" size="lg" fullWidth>
            Continue
          </Button>
          <StyledTouchableOpacity onPress={handleSkip} className="items-center py-3">
            <Body className="text-neutral-500 text-sm">Skip for now</Body>
          </StyledTouchableOpacity>
        </StyledView>
      </KeyboardAvoidingView>
    </StyledSafeAreaView>
  );
};
