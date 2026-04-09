/**
 * ContactInviteScreen Components
 * Extracted from ContactInviteScreen.tsx for maintainability.
 */

import React, { RefObject, useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  SectionList,
  StyleSheet,
} from 'react-native';
import ReanimatedAnimated, {
  FadeIn,
  FadeOut,
  ZoomIn,
  SlideInDown,
} from 'react-native-reanimated';
import { Image } from 'expo-image';
import * as Clipboard from 'expo-clipboard';
import { styled } from 'nativewind';
import { EvaIcon } from '../../components/icons';
import { H3, Body } from '../../components/ui';
import { BackHeader } from '../../components/ui/BackHeader';
import { FONTS, FONT_SIZES } from '../../constants/typography';
import { COLORS } from '../../theme/colors';
import { SHADOWS } from '../../theme/shadows';
import { DURATIONS } from '../../constants/animations';
import { NormalizedContact, ContactSection } from '../../services/contactsService';
import { contactStyles } from './ContactInviteScreen.styles';
import { lightHaptic } from '../../utils/haptics';

const StyledView = styled(View);
const StyledText = styled(Text);
const StyledTouchableOpacity = styled(TouchableOpacity);

export const ON_BRIDGE_SECTION = 'On Bridge';
export const SUGGESTED_SECTION = 'Suggested';

export const MAX_INVITES = 10;
export const INVITE_COUNT_KEY = '@bridge_invites_sent_count';

const REMIND_AFTER_MS = 3 * 24 * 60 * 60 * 1000; // 3 days

// ── Contact Avatar ────────────────────────────────────────────────────────────

export const ContactAvatar = React.memo(({ contact, bgColor, textColor }: { contact: NormalizedContact; bgColor: string; textColor: string }) => {
  if (contact.imageUri) {
    return (
      <Image
        source={{ uri: contact.imageUri }}
        style={contactStyles.avatar}
        contentFit="cover"
        cachePolicy="memory-disk"
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

// ── Contact Row ───────────────────────────────────────────────────────────────

export interface ContactRowProps {
  contact: NormalizedContact;
  isSelected: boolean;
  isAdding: boolean;
  onToggleSelect: (c: NormalizedContact) => void;
  onAddFriend: (c: NormalizedContact) => void;
  onInviteSingle: (c: NormalizedContact) => void;
}

export const ContactRow = React.memo(({ contact, isSelected, isAdding, onToggleSelect, onAddFriend, onInviteSingle }: ContactRowProps) => {
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

  // Regular contacts — selectable for batch invite
  return (
    <StyledTouchableOpacity
      className="flex-row items-center px-4 py-3 bg-white"
      onPress={() => onToggleSelect(contact)}
      activeOpacity={0.7}
    >
      {/* Avatar / checkbox */}
      {isSelected ? (
        <StyledView className="w-10 h-10 rounded-full items-center justify-center mr-3 bg-primary-500">
          <EvaIcon name="checkmark" variant="outline" color="white" size={20} />
        </StyledView>
      ) : (
        <ContactAvatar
          contact={contact}
          bgColor="bg-primary-100"
          textColor="text-primary-500"
        />
      )}

      {/* Name + phone */}
      <StyledView className="flex-1 mr-3">
        <StyledView className="flex-row items-center">
          <StyledText className="font-medium text-sm text-neutral-900" numberOfLines={1}>
            {contact.name}
          </StyledText>
          {contact.hasRiceEmail && (
            <StyledView className="ml-1.5 bg-blue-100 px-1.5 py-0.5 rounded">
              <StyledText className="text-blue-600" style={{ fontSize: 9, fontFamily: FONTS.semiBold }}>Rice</StyledText>
            </StyledView>
          )}
        </StyledView>
        <StyledText className="text-neutral-500 text-xs" numberOfLines={1}>
          {contact.phoneNumber}
        </StyledText>
      </StyledView>

      {/* Right side: checkbox */}
      <StyledView className={`w-6 h-6 rounded-full border-2 items-center justify-center ${
        isSelected ? 'bg-primary-500 border-primary-500' : 'border-neutral-300'
      }`}>
        {isSelected && <EvaIcon name="checkmark" variant="outline" color="white" size={14} />}
      </StyledView>
    </StyledTouchableOpacity>
  );
});

// ── Section Header ────────────────────────────────────────────────────────────

export interface SectionHeaderProps {
  title: string;
  onAddAll?: () => void;
  addAllDisabled?: boolean;
  addAllLabel?: string;
}

export const SectionHeader = React.memo(({ title, onAddAll, addAllDisabled, addAllLabel }: SectionHeaderProps) => {
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

// ── Friend Code Card ──────────────────────────────────────────────────────────

export interface FriendCodeCardProps {
  friendCode: string;
  onShareCode: () => void;
}

export const FriendCodeCard = React.memo(({ friendCode, onShareCode }: FriendCodeCardProps) => {
  const [copied, setCopied] = useState(false);

  const handleCopyCode = useCallback(async () => {
    await Clipboard.setStringAsync(friendCode);
    lightHaptic();
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [friendCode]);

  return (
  <StyledView className="items-center mb-3">
    <TouchableOpacity onPress={handleCopyCode} activeOpacity={0.7} style={{ alignItems: 'center', marginBottom: 8 }}>
      <StyledText
        style={{
          fontSize: FONT_SIZES.lg,
          fontFamily: FONTS.bold,
          fontWeight: '700',
          color: copied ? COLORS.success : COLORS.text.primary,
          letterSpacing: 1,
        }}
      >
        {copied ? 'Copied!' : friendCode}
      </StyledText>
    </TouchableOpacity>
    <StyledTouchableOpacity
      className="flex-row items-center justify-center py-2 px-5 rounded-lg"
      style={{ backgroundColor: COLORS.primary }}
      onPress={onShareCode}
    >
      <EvaIcon name="share" variant="outline" size={15} color="#FFFFFF" />
      <StyledText className="ml-1.5" style={{ color: '#FFFFFF', fontSize: FONT_SIZES.sm, fontFamily: FONTS.semiBold, fontWeight: '600' }}>Share</StyledText>
    </StyledTouchableOpacity>
  </StyledView>
  );
});

// ── Enter Code Input ──────────────────────────────────────────────────────────

export interface EnterCodeInputProps {
  inputRef?: RefObject<TextInput | null>;
  value: string;
  onChangeText: (t: string) => void;
  onSubmit: () => void;
  error: string;
  adding: boolean;
  /** Additional className for the wrapper (e.g. "mb-4" vs "mt-1" for error) */
  wrapperClassName?: string;
  errorClassName?: string;
}

export const EnterCodeInput = React.memo(({ inputRef, value, onChangeText, onSubmit, error, adding, wrapperClassName, errorClassName }: EnterCodeInputProps) => {
  const isEmpty = !value.trim();
  const isDisabled = adding || isEmpty;
  return (
    <>
      <StyledView className={`flex-row items-center ${wrapperClassName || 'mb-4'}`}>
        <StyledView className="flex-1 flex-row items-center bg-neutral-100 rounded-lg px-3 py-2 mr-2">
          <TextInput
            ref={inputRef}
            style={{ flex: 1, fontSize: FONT_SIZES.base, fontFamily: FONTS.regular, color: '#0B1226' }}
            placeholder="Enter a friend's code"
            placeholderTextColor={COLORS.text.tertiary}
            value={value}
            onChangeText={onChangeText}
            autoCapitalize="characters"
            autoCorrect={false}
            onSubmitEditing={onSubmit}
            returnKeyType="go"
          />
        </StyledView>
        <StyledTouchableOpacity
          className={`px-4 py-2 rounded-lg ${isDisabled ? 'bg-primary-300' : 'bg-primary-500'}`}
          onPress={onSubmit}
          disabled={isDisabled}
          style={{ opacity: isDisabled ? 0.5 : 1 }}
        >
          <StyledText className="text-white text-sm font-semibold">
            {adding ? '...' : 'Add'}
          </StyledText>
        </StyledTouchableOpacity>
      </StyledView>
      {error ? (
        <StyledText className={`text-red-500 text-xs ${errorClassName || 'mb-4 -mt-2'}`}>{error}</StyledText>
      ) : null}
    </>
  );
});

// ── Celebration Overlay ───────────────────────────────────────────────────────

export interface CelebrationOverlayProps {
  count: number;
}

export const CelebrationOverlay = React.memo(({ count }: CelebrationOverlayProps) => {
  if (count <= 0) return null;
  return (
    <ReanimatedAnimated.View
      pointerEvents="none"
      entering={FadeIn.duration(DURATIONS.micro)}
      exiting={FadeOut.duration(DURATIONS.slow)}
      style={contactStyles.celebrationOverlay}
    >
      <ReanimatedAnimated.View
        entering={ZoomIn.springify().damping(12).stiffness(200).delay(DURATIONS.micro)}
        style={contactStyles.celebrationCard}
      >
        <ReanimatedAnimated.View
          entering={SlideInDown.springify().damping(10).stiffness(180).delay(DURATIONS.normal)}
        >
          <EvaIcon name="award" variant="outline" size={48} color={COLORS.primaryAccent} />
        </ReanimatedAnimated.View>
        <View style={{ marginBottom: 8 }} />
        <Text style={contactStyles.celebrationTitle}>
          {count} invite{count === 1 ? '' : 's'} sent!
        </Text>
        <Text style={contactStyles.celebrationSubtitle}>
          The more friends on Bridge, the better your matches get
        </Text>
      </ReanimatedAnimated.View>
    </ReanimatedAnimated.View>
  );
});

// ── Loading View ──────────────────────────────────────────────────────────────

export const LoadingView = React.memo(() => (
  <StyledView className="flex-1 items-center justify-center">
    <ActivityIndicator size="large" color={COLORS.primaryAccent} />
    <Body className="text-neutral-500 mt-4">Loading contacts...</Body>
  </StyledView>
));

// ── Empty Contacts View ───────────────────────────────────────────────────────

export const EmptyContactsView = React.memo(() => (
  <StyledView className="flex-1 items-center justify-center px-8">
    <StyledView className="w-16 h-16 bg-primary-100 rounded-full items-center justify-center mb-4">
      <EvaIcon name="people" variant="outline" color="primary" size={32} />
    </StyledView>
    <StyledText
      className="text-neutral-900 text-center mb-2"
      style={{ fontSize: FONT_SIZES.lg, fontFamily: FONTS.bold, fontWeight: '700' }}
    >
      No contacts to show
    </StyledText>
    <Body className="text-neutral-500 text-center" style={{ lineHeight: 20 }}>
      Try sharing your friend code instead — you can text or DM it to anyone you want on Bridge
    </Body>
  </StyledView>
));

// ── Search Bar ───────────────────────────────────────────────────────────────

export interface ContactSearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
}

export const ContactSearchBar = React.memo(({ value, onChangeText }: ContactSearchBarProps) => (
  <StyledView className="px-3 py-2 bg-white border-b border-neutral-100">
    <StyledView className="flex-row items-center bg-neutral-100 rounded-lg px-3 py-2">
      <EvaIcon name="search" variant="outline" size={18} color={COLORS.text.tertiary} />
      <TextInput
        style={{ flex: 1, marginLeft: 8, fontSize: FONT_SIZES.sm, fontFamily: FONTS.regular, color: COLORS.text.primary }}
        placeholder="Search contacts..."
        placeholderTextColor={COLORS.text.tertiary}
        value={value}
        onChangeText={onChangeText}
        autoCorrect={false}
        clearButtonMode="while-editing"
        returnKeyType="search"
      />
    </StyledView>
  </StyledView>
));

// ── Contacts Access Prompt ────────────────────────────────────────────────────

export interface ContactsAccessPromptProps {
  bridgeUserCount: number;
  onRequestPermission: () => void;
}

export const ContactsAccessPrompt = React.memo(({ bridgeUserCount, onRequestPermission }: ContactsAccessPromptProps) => (
  <StyledView className="items-center">
    <StyledText
      className="text-center mb-2"
      style={{ fontSize: FONT_SIZES.lg, fontFamily: FONTS.semiBold, fontWeight: '600', color: COLORS.text.primary }}
    >
      {bridgeUserCount > 0
        ? `${bridgeUserCount} of your contacts are on Bridge`
        : 'See who\u2019s already on Bridge'}
    </StyledText>
    <StyledText
      className="text-center mb-4"
      style={{ fontSize: FONT_SIZES.md, fontFamily: FONTS.regular, color: COLORS.text.secondary, lineHeight: 18 }}
    >
      We check your contacts to find friends who can vote on your matches. Nothing is stored or shared.
    </StyledText>
    <StyledTouchableOpacity
      className="w-full py-3 rounded-xl items-center flex-row justify-center"
      style={{ backgroundColor: COLORS.primary }}
      onPress={onRequestPermission}
      accessibilityRole="button"
      accessibilityLabel="Allow contacts access"
    >
      <EvaIcon name="people" variant="outline" size={18} color="#FFFFFF" />
      <StyledText className="ml-2" style={{ color: '#FFFFFF', fontFamily: FONTS.semiBold, fontWeight: '600', fontSize: FONT_SIZES.base }}>Find Friends in Contacts</StyledText>
    </StyledTouchableOpacity>
  </StyledView>
));

// ── Settings Prompt (denied state) ────────────────────────────────────────────

export interface SettingsPromptProps {
  onOpenSettings: () => void;
}

export const SettingsPrompt = React.memo(({ onOpenSettings }: SettingsPromptProps) => (
  <StyledView className="items-center">
    <StyledText
      className="text-center mb-2"
      style={{ fontSize: FONT_SIZES.lg, fontFamily: FONTS.semiBold, fontWeight: '600', color: COLORS.text.primary }}
    >
      See who's already on Bridge
    </StyledText>
    <StyledText
      className="text-center mb-4"
      style={{ fontSize: FONT_SIZES.md, fontFamily: FONTS.regular, color: COLORS.text.secondary, lineHeight: 18 }}
    >
      Enable contacts to find friends who can vote on your matches.
    </StyledText>
    <StyledTouchableOpacity
      className="w-full py-3 rounded-xl items-center flex-row justify-center"
      style={{ borderWidth: 1.5, borderColor: COLORS.primary }}
      onPress={onOpenSettings}
    >
      <EvaIcon name="settings-2" variant="outline" size={16} color={COLORS.primary} />
      <StyledText className="ml-2" style={{ fontFamily: FONTS.semiBold, fontWeight: '600', fontSize: FONT_SIZES.base, color: COLORS.primary }}>Enable in Settings</StyledText>
    </StyledTouchableOpacity>
  </StyledView>
));

// ── Granted Header Strip ──────────────────────────────────────────────────────

export interface GrantedHeaderStripProps {
  friendCode: string;
  enterCodeValue: string;
  enterCodeError: string;
  addingCode: boolean;
  onCopyCode: () => void;
  onShareCode: () => void;
  onChangeText: (t: string) => void;
  onEnterCode: () => void;
}

export const GrantedHeaderStrip = React.memo(({ friendCode, enterCodeValue, enterCodeError, addingCode, onCopyCode, onShareCode, onChangeText, onEnterCode }: GrantedHeaderStripProps) => (
  <StyledView className="px-3 py-2 bg-white border-b border-neutral-200">
    {friendCode ? (
      <StyledView className="flex-row items-center mb-2">
        <StyledText className="text-xs text-neutral-500 font-medium mr-1.5">Your code</StyledText>
        <StyledText className="text-xs font-bold text-primary-500 flex-1" numberOfLines={1}>{friendCode}</StyledText>
        <StyledTouchableOpacity
          className="p-1.5 rounded-full bg-primary-50 ml-1"
          onPress={onCopyCode}
          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          accessibilityRole="button"
          accessibilityLabel="Copy friend code"
        >
          <EvaIcon name="copy" variant="outline" size={16} color={COLORS.primaryAccent} />
        </StyledTouchableOpacity>
        <StyledTouchableOpacity
          className="p-1.5 rounded-full bg-primary-50 ml-1"
          onPress={onShareCode}
          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          accessibilityRole="button"
          accessibilityLabel="Share friend code"
        >
          <EvaIcon name="share" variant="outline" size={16} color={COLORS.primaryAccent} />
        </StyledTouchableOpacity>
      </StyledView>
    ) : null}
    <StyledView className="flex-row items-center">
      <StyledView className="flex-1 flex-row items-center bg-neutral-100 rounded-lg px-3 py-1.5 mr-2">
        <TextInput
          className="flex-1 text-sm text-neutral-900"
          placeholder="Enter friend code"
          placeholderTextColor={COLORS.text.tertiary}
          value={enterCodeValue}
          onChangeText={onChangeText}
          autoCapitalize="characters"
          autoCorrect={false}
        />
      </StyledView>
      <StyledTouchableOpacity
        className={`px-4 py-1.5 rounded-lg ${addingCode ? 'bg-primary-300' : 'bg-primary-500'}`}
        onPress={onEnterCode}
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
));

// ── A-Z Sidebar ───────────────────────────────────────────────────────────────

export interface AZSidebarProps {
  sections: ContactSection[];
  sectionListRef: RefObject<SectionList<NormalizedContact, ContactSection> | null>;
}

export const AZSidebar = React.memo(({ sections, sectionListRef }: AZSidebarProps) => (
  <View style={contactStyles.azSidebar}>
    {'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map((letter) => (
      <TouchableOpacity
        key={letter}
        onPress={() => {
          const sectionIndex = sections.findIndex((s) => s.title === letter);
          if (sectionIndex >= 0 && sectionListRef.current) {
            sectionListRef.current.scrollToLocation({
              sectionIndex,
              itemIndex: 0,
              viewPosition: 0,
              animated: false,
            });
          }
        }}
        activeOpacity={0.5}
      >
        <Text style={[contactStyles.azLetter, {
          color: sections.some((s) => s.title === letter) ? COLORS.primaryAccent : '#D0D5DD',
        }]}>
          {letter}
        </Text>
      </TouchableOpacity>
    ))}
  </View>
));

// ── Floating Send Button ──────────────────────────────────────────────────────

export interface FloatingSendButtonProps {
  selectedCount: number;
  invitesRemaining: number;
  sending: boolean;
  onSend: () => void;
}

export const FloatingSendButton = React.memo(({ selectedCount, invitesRemaining, sending, onSend }: FloatingSendButtonProps) => {
  if (selectedCount <= 0) return null;
  const sendCount = Math.min(selectedCount, invitesRemaining);
  const exhausted = invitesRemaining <= 0;
  const isDisabled = sending || exhausted;
  return (
    <ReanimatedAnimated.View
      entering={SlideInDown.duration(DURATIONS.normal)}
      exiting={FadeOut.duration(DURATIONS.micro)}
      style={[
        { position: 'absolute', left: 16, right: 16, bottom: 32 },
        SHADOWS.accentBlue,
      ]}
    >
      <StyledTouchableOpacity
        className={`rounded-xl py-4 items-center ${isDisabled ? 'bg-neutral-300' : 'bg-primary-500'}`}
        style={exhausted ? { opacity: 0.6 } : undefined}
        onPress={onSend}
        disabled={isDisabled}
        accessibilityRole="button"
        accessibilityLabel={sending ? 'Sending invites' : exhausted ? 'No invites remaining' : `Send ${sendCount} invites`}
        accessibilityState={{ disabled: isDisabled }}
      >
        <StyledText className="text-white font-bold text-base">
          {sending
            ? 'Opening Messages...'
            : exhausted
            ? 'All invites used'
            : `Send ${sendCount} Invite${sendCount === 1 ? '' : 's'}`
          }
        </StyledText>
      </StyledTouchableOpacity>
    </ReanimatedAnimated.View>
  );
});

// ── Screen Header with Progress ───────────────────────────────────────────────

export interface ScreenHeaderProps {
  onGoBack: () => void;
  bridgeUserCount: number;
  invitesRemaining: number;
  invitesSentCount: number;
}

// ── Permission View (undetermined / denied) ─────────────────────────────────

export interface PermissionViewProps {
  friendCode: string;
  enterCodeValue: string;
  enterCodeError: string;
  addingCode: boolean;
  enterCodeInputRef: React.RefObject<TextInput | null>;
  bridgeUserCount: number;
  permissionStatus: string | null;
  onShareCode: () => void;
  onEnterCodeChangeText: (t: string) => void;
  onEnterCode: () => void;
  onRequestPermission: () => void;
  onOpenSettings: () => void;
}

export const PermissionView = React.memo(({
  friendCode,
  enterCodeValue,
  enterCodeError,
  addingCode,
  enterCodeInputRef,
  bridgeUserCount,
  permissionStatus,
  onShareCode,
  onEnterCodeChangeText,
  onEnterCode,
  onRequestPermission,
  onOpenSettings,
}: PermissionViewProps) => (
  <StyledView className="flex-1 px-6 pt-6">
    {/* Section 1: Contacts discovery — primary action */}
    {permissionStatus === 'denied' ? (
      <SettingsPrompt onOpenSettings={onOpenSettings} />
    ) : (
      <ContactsAccessPrompt
        bridgeUserCount={bridgeUserCount}
        onRequestPermission={onRequestPermission}
      />
    )}

    {/* Divider */}
    <StyledView className="flex-row items-center" style={{ marginTop: 28, marginBottom: 24 }}>
      <StyledView className="flex-1" style={{ height: StyleSheet.hairlineWidth, backgroundColor: COLORS.border }} />
      <StyledText
        className="mx-3"
        style={{ fontSize: FONT_SIZES.xs, fontFamily: FONTS.regular, color: COLORS.text.tertiary }}
      >
        or use a friend code
      </StyledText>
      <StyledView className="flex-1" style={{ height: StyleSheet.hairlineWidth, backgroundColor: COLORS.border }} />
    </StyledView>

    {/* Section 2: Code exchange — compact secondary path */}
    {friendCode ? (
      <FriendCodeCard
        friendCode={friendCode}
        onShareCode={onShareCode}
      />
    ) : null}
    <EnterCodeInput
      inputRef={enterCodeInputRef}
      value={enterCodeValue}
      onChangeText={onEnterCodeChangeText}
      onSubmit={onEnterCode}
      error={enterCodeError}
      adding={addingCode}
    />
  </StyledView>
));

// ── Granted Contact List View ────────────────────────────────────────────────

export interface GrantedContactListProps {
  friendCode: string;
  enterCodeValue: string;
  enterCodeError: string;
  addingCode: boolean;
  selectedIds: Set<string>;
  addingFriendId: string | null;
  invitesRemaining: number;
  sending: boolean;
  unadddedBridgeCount: number;
  addingAll: boolean;
  filteredSections: ContactSection[];
  searchQuery: string;
  onSearchChange: (text: string) => void;
  sectionListRef: React.RefObject<SectionList<NormalizedContact, ContactSection> | null>;
  onCopyCode: () => void;
  onShareCode: () => void;
  onEnterCodeChangeText: (t: string) => void;
  onEnterCode: () => void;
  onToggleSelect: (c: NormalizedContact) => void;
  onAddFriend: (c: NormalizedContact) => void;
  onInviteSingle: (c: NormalizedContact) => void;
  onAddAllBridge: () => void;
  onSendInvites: () => void;
  keyExtractor: (item: NormalizedContact) => string;
  hideFloatingButton?: boolean;
  totalContactCount: number;
}

export const GrantedContactList = React.memo(({
  friendCode,
  enterCodeValue,
  enterCodeError,
  addingCode,
  selectedIds,
  addingFriendId,
  invitesRemaining,
  sending,
  unadddedBridgeCount,
  addingAll,
  filteredSections,
  searchQuery,
  onSearchChange,
  sectionListRef,
  onCopyCode,
  onShareCode,
  onEnterCodeChangeText,
  onEnterCode,
  onToggleSelect,
  onAddFriend,
  onInviteSingle,
  onAddAllBridge,
  onSendInvites,
  keyExtractor,
  hideFloatingButton,
  totalContactCount,
}: GrantedContactListProps) => {
  const renderItem = React.useCallback(
    ({ item }: { item: NormalizedContact }) => (
      <ContactRow
        contact={item}
        isSelected={selectedIds.has(item.id)}
        isAdding={addingFriendId === item.id}
        onToggleSelect={onToggleSelect}
        onAddFriend={onAddFriend}
        onInviteSingle={onInviteSingle}
      />
    ),
    [selectedIds, addingFriendId, onToggleSelect, onAddFriend, onInviteSingle]
  );

  const renderSectionHeader = React.useCallback(
    ({ section }: { section: { title: string; data: NormalizedContact[] } }) => {
      if (section.title === ON_BRIDGE_SECTION && unadddedBridgeCount > 0) {
        return (
          <SectionHeader
            title={section.title}
            onAddAll={onAddAllBridge}
            addAllDisabled={addingAll}
            addAllLabel={addingAll ? 'Adding...' : `Add All (${unadddedBridgeCount})`}
          />
        );
      }
      return <SectionHeader title={section.title} />;
    },
    [unadddedBridgeCount, onAddAllBridge, addingAll]
  );

  // Show search bar when there are 20+ contacts
  const showSearch = totalContactCount >= 20;

  return (
    <>
      <GrantedHeaderStrip
        friendCode={friendCode}
        enterCodeValue={enterCodeValue}
        enterCodeError={enterCodeError}
        addingCode={addingCode}
        onCopyCode={onCopyCode}
        onShareCode={onShareCode}
        onChangeText={onEnterCodeChangeText}
        onEnterCode={onEnterCode}
      />

      {showSearch && (
        <ContactSearchBar
          value={searchQuery}
          onChangeText={onSearchChange}
        />
      )}

      {filteredSections.length > 0 ? (
        <View style={contactStyles.contactListWrapper}>
          <SectionList
            ref={sectionListRef}
            style={contactStyles.sectionListFlex}
            sections={filteredSections}
            keyExtractor={keyExtractor}
            renderItem={renderItem}
            renderSectionHeader={renderSectionHeader}
            ItemSeparatorComponent={() => (
              <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: '#E8EDFB', marginLeft: 68 }} />
            )}
            stickySectionHeadersEnabled
            initialNumToRender={20}
            maxToRenderPerBatch={30}
            windowSize={10}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            contentContainerStyle={selectedIds.size > 0 ? contactStyles.contentWithSelection : contactStyles.contentDefault}
          />
          <AZSidebar sections={filteredSections} sectionListRef={sectionListRef} />
        </View>
      ) : (
        <EmptyContactsView />
      )}

      {!hideFloatingButton && (
        <FloatingSendButton
          selectedCount={selectedIds.size}
          invitesRemaining={invitesRemaining}
          sending={sending}
          onSend={onSendInvites}
        />
      )}
    </>
  );
});

// ── Screen Header with Progress ───────────────────────────────────────────────

export const ScreenHeader = React.memo(({ onGoBack, bridgeUserCount, invitesRemaining, invitesSentCount }: ScreenHeaderProps) => (
  <StyledView>
    <BackHeader title="Build Your Crew" titleAlign="center" onBack={onGoBack} showBorder={false} />

    {/* Progress bar + social proof */}
    <StyledView className="px-4 pb-3 border-b border-neutral-200 bg-white">
      <StyledView className="flex-row items-center justify-between mb-1">
        <StyledText className="text-xs text-neutral-500" style={{ fontFamily: FONTS.medium }}>
          {bridgeUserCount > 0 ? `${bridgeUserCount}+ people on Bridge` : 'Invite friends to start getting matched'}
        </StyledText>
        <StyledText className="text-xs font-semibold" style={{ fontFamily: FONTS.semiBold, color: COLORS.primaryAccent }}>
          {invitesRemaining} invite{invitesRemaining === 1 ? '' : 's'} remaining
        </StyledText>
      </StyledView>
      <StyledView className="bg-neutral-200 rounded-full h-1.5 overflow-hidden">
        <StyledView
          className="h-full rounded-full"
          style={{
            width: `${Math.min(100, (invitesSentCount / MAX_INVITES) * 100)}%`,
            backgroundColor: COLORS.primaryAccent,
          }}
        />
      </StyledView>
    </StyledView>
  </StyledView>
));
