import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  SectionList,
  TextInput,
  Platform,
  Linking,
  Share,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { styled } from 'nativewind';
import { H1, Body, Button } from '../../../components/ui';
import { EvaIcon } from '../../../components/icons';
import { OnboardingData } from '../../../types';
import * as Clipboard from 'expo-clipboard';
import {
  getUserFriendCode,
  addFriendByCode,
  bulkAddFriendsByCodes,
  getFriendCodeByUserId,
  getFriendCodesByUserIds,
  sendFriendRequestByCode,
} from '../../../services/friendService';
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
  getBridgeUserCount,
  markAsInvited,
  markMultipleAsInvited,
  getSuggestedContacts,
} from '../../../services/contactsService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { showToast } from '../../../utils/toast';
import { createLogger } from '../../../utils/secureLogger';
import { COLORS } from '../../../theme/colors';
import { FONTS } from '../../../constants/typography';
import {
  GrantedContactList,
  PermissionView,
  LoadingView,
  CelebrationOverlay,
  MAX_INVITES,
  INVITE_COUNT_KEY,
  ON_BRIDGE_SECTION,
  SUGGESTED_SECTION,
} from '../../friends/ContactInviteScreen.components';

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
const StyledSafeAreaView = styled(SafeAreaView);

export const AddFriendsStep: React.FC<AddFriendsStepProps> = ({
  updateData,
  onNext,
  onBack,
}) => {
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
  const [addingAll, setAddingAll] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const enterCodeInputRef = useRef<TextInput>(null);
  const sectionListRef = useRef<SectionList<NormalizedContact, ContactSection>>(null);

  const handleSearchChange = useCallback((text: string) => {
    setSearchQuery(text);
  }, []);

  const invitesRemaining = Math.max(0, MAX_INVITES - invitesSentCount);

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

  const handleRequestPermission = useCallback(async () => {
    setLoading(true);
    try {
      const { status, granted } = await requestContactsPermission();
      setPermissionStatus(status);
      if (granted) {
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

  const handleOpenSettings = useCallback(() => {
    if (Platform.OS === 'ios') Linking.openURL('app-settings:');
    else Linking.openSettings();
  }, []);

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
          prev.map((c) => sentIds.has(c.id) ? { ...c, isInvited: true, invitedAt: Date.now() } : c)
        );
        setCelebrationCount(selectedContacts.length);
        setTimeout(() => setCelebrationCount(0), 2500);
      }
      // Always clear selections so the button returns to "Continue"
      setSelectedIds(new Set());
    } catch (err) {
      logger.error('Send invites failed:', err);
    } finally {
      setSending(false);
    }
  }, [selectedIds, contacts, friendCode, senderName, invitesRemaining]);

  const handleInviteSingle = useCallback(async (contact: NormalizedContact) => {
    if (!friendCode) return;
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
    }
  }, [friendCode, senderName, invitesRemaining]);

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
      setContacts((prev) => prev.map((c) =>
        c.bridgeUserId && addedUserIds.has(c.bridgeUserId) ? { ...c, isAlreadyFriend: true } : c
      ));
      showToast.success('Requests sent!', `Sent ${count} friend request${count === 1 ? '' : 's'}`);
    }
    setAddingAll(false);
  }, [contacts]);

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

  const handleEnterCodeChangeText = useCallback((t: string) => {
    setEnterCodeValue(t);
    setEnterCodeError('');
  }, []);

  const unadddedBridgeCount = useMemo(
    () => contacts.filter((c) => c.isOnBridge && !c.isAlreadyFriend).length,
    [contacts]
  );

  const filteredSections = useMemo((): ContactSection[] => {
    let filteredContacts = contacts;

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
    if (onBridge.length > 0) sections.push({ title: ON_BRIDGE_SECTION, data: onBridge });
    if (!searchQuery.trim()) {
      const suggested = getSuggestedContacts(notOnBridge);
      if (suggested.length > 0) sections.push({ title: SUGGESTED_SECTION, data: suggested });
    }
    sections.push(...groupContactsAlphabetically(notOnBridge));
    return sections;
  }, [contacts, searchQuery]);

  const keyExtractor = useCallback((item: NormalizedContact) => item.id, []);

  const handleContinue = () => {
    updateData({ friendsAdded: [] });
    onNext();
  };

  return (
    <StyledSafeAreaView edges={['top', 'bottom']} className="flex-1" style={{ backgroundColor: COLORS.screenBackground }}>
      {/* Onboarding header */}
      <StyledView className="px-6 pt-2 pb-3" style={{ backgroundColor: COLORS.screenBackground }}>
        <H1 className="mb-1">Add friends</H1>
        <Body className="text-neutral-500 text-sm mb-2">
          Bridge is more fun with friends. Invite your crew.
        </Body>
        <StyledView className="flex-row items-center justify-between mb-1">
          <StyledText className="text-xs text-neutral-500" style={{ fontFamily: FONTS.medium }}>
            {bridgeUserCount > 0 ? `${bridgeUserCount}+ students on Bridge` : 'Invite your crew'}
          </StyledText>
          <StyledText className="text-xs font-semibold" style={{ fontFamily: FONTS.semiBold, color: COLORS.primaryAccent }}>
            {invitesRemaining} invite{invitesRemaining === 1 ? '' : 's'} left
          </StyledText>
        </StyledView>
        <StyledView className="rounded-full overflow-hidden" style={{ height: 5, backgroundColor: COLORS.borderLight }}>
          <StyledView
            className="h-full rounded-full"
            style={{
              width: `${Math.min(100, (invitesSentCount / MAX_INVITES) * 100)}%`,
              backgroundColor: COLORS.primaryAccent,
            }}
          />
        </StyledView>
      </StyledView>

      {/* Content */}
      <StyledView className="flex-1">
        {loading && <LoadingView />}

        {!loading && permissionStatus !== 'granted' && (
          <PermissionView
            friendCode={friendCode}
            enterCodeValue={enterCodeValue}
            enterCodeError={enterCodeError}
            addingCode={addingCode}
            enterCodeInputRef={enterCodeInputRef}
            bridgeUserCount={bridgeUserCount}
            permissionStatus={permissionStatus}
            onShareCode={handleShareCode}
            onEnterCodeChangeText={handleEnterCodeChangeText}
            onEnterCode={handleEnterCode}
            onRequestPermission={handleRequestPermission}
            onOpenSettings={handleOpenSettings}
          />
        )}

        {!loading && permissionStatus === 'granted' && (
          <GrantedContactList
            friendCode={friendCode}
            enterCodeValue={enterCodeValue}
            enterCodeError={enterCodeError}
            addingCode={addingCode}
            selectedIds={selectedIds}
            addingFriendId={addingFriendId}
            invitesRemaining={invitesRemaining}
            sending={sending}
            unadddedBridgeCount={unadddedBridgeCount}
            addingAll={addingAll}
            filteredSections={filteredSections}
            searchQuery={searchQuery}
            onSearchChange={handleSearchChange}
            sectionListRef={sectionListRef}
            onCopyCode={handleCopyCode}
            onShareCode={handleShareCode}
            onEnterCodeChangeText={handleEnterCodeChangeText}
            onEnterCode={handleEnterCode}
            onToggleSelect={handleToggleSelect}
            onAddFriend={handleAddFriend}
            onInviteSingle={handleInviteSingle}
            onAddAllBridge={handleAddAllBridge}
            onSendInvites={handleSendInvites}
            keyExtractor={keyExtractor}
            hideFloatingButton
            totalContactCount={contacts.length}
          />
        )}
      </StyledView>

      <CelebrationOverlay count={celebrationCount} />

      {/* Onboarding bottom bar — Send invites replaces Continue when contacts selected */}
      <StyledView
        className="px-6 bg-neutral-50"
        style={{ paddingTop: 12, paddingBottom: 12, borderTopWidth: 1, borderTopColor: COLORS.card }}
      >
        {selectedIds.size > 0 ? (
          <Button onPress={handleSendInvites} variant="primary" size="lg" fullWidth disabled={sending}>
            {sending ? 'Sending...' : `Send ${Math.min(selectedIds.size, invitesRemaining)} Invite${Math.min(selectedIds.size, invitesRemaining) === 1 ? '' : 's'}`}
          </Button>
        ) : (
          <Button onPress={handleContinue} variant="primary" size="lg" fullWidth>
            Continue
          </Button>
        )}
      </StyledView>
    </StyledSafeAreaView>
  );
};
