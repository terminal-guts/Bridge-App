import React from 'react';
import { NavigationProp, RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../../types';
import { ScreenWrapper } from '../../components/ui';

// Extracted hook + components
import { useContactInvite } from './useContactInvite';
import {
  CelebrationOverlay,
  LoadingView,
  PermissionView,
  GrantedContactList,
  ScreenHeader,
} from './ContactInviteScreen.components';

interface Props {
  navigation: NavigationProp<RootStackParamList, 'ContactInvite'>;
  route: RouteProp<RootStackParamList, 'ContactInvite'>;
}

// ── Main Screen ──────────────────────────────────────────────────────────────

export const ContactInviteScreen: React.FC<Props> = ({ navigation, route }) => {
  const {
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
    enterCodeInputRef,
    sectionListRef,
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
    keyExtractor,
  } = useContactInvite(route);

  return (
    <ScreenWrapper>
      {/* Header */}
      <ScreenHeader
        onGoBack={() => navigation.goBack()}
        bridgeUserCount={bridgeUserCount}
        invitesRemaining={invitesRemaining}
        invitesSentCount={invitesSentCount}
      />

      {/* Loading */}
      {loading && <LoadingView />}

      {/* Permission: undetermined or denied */}
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

      {/* Permission: granted — show contact list */}
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
          totalContactCount={contacts.length}
        />
      )}

      <CelebrationOverlay count={celebrationCount} />
    </ScreenWrapper>
  );
};
