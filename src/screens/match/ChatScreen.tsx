/**
 * ChatScreen — main screen orchestrator
 * Modals and styles extracted to ChatScreen.components.tsx
 */

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  SafeAreaView,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  TextInput,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  RefreshControl,
  StyleSheet,
  Text,
} from 'react-native';
import { styled } from 'nativewind';
import { H3, Body, BodySmall } from '../../components/ui';
import { NavigationProp, RouteProp } from '@react-navigation/native';
import { RootStackParamList, Message, Match, MatchStatus } from '../../types';
import { getCurrentUser } from '../../services/authService';
import {
  getMatchMessages,
  sendMessage as sendMessageAPI,
  subscribeToMessages,
  markMessagesAsRead,
  getFriendMessages,
  sendFriendMessage,
  subscribeToFriendMessages,
  markFriendMessagesAsRead,
} from '../../services/messageService';
import { AudioPlayer } from '../../components/chat/AudioPlayer';
import { AudioRecorder } from '../../components/chat/AudioRecorder';
import { MatchContextCard } from '../../components/chat/MatchContextCard';
import { communityService } from '../../services/communityServiceIndex';
import { getUserProfile, getFullUserProfileById } from '../../services/profileService';
import { submitUserReport } from '../../services/matchService';
import { createLogger } from '../../utils/secureLogger';
import { COLORS } from '../../theme/colors';
import { EvaIcon } from '../../components/icons';

import {
  formatMessageDate,
  dateProposalStyles,
  DropdownMenu,
  ProposeDateModal,
  EndMatchModal,
  ReportModal,
} from './ChatScreen.components';

const logger = createLogger('ChatScreen');

interface ChatScreenProps {
  navigation: NavigationProp<RootStackParamList, 'Chat'>;
  route: RouteProp<RootStackParamList, 'Chat'>;
}

const StyledSafeAreaView = styled(SafeAreaView);
const StyledView = styled(View);
const StyledTextInput = styled(TextInput);
const StyledTouchableOpacity = styled(TouchableOpacity);
const StyledImage = styled(Image);

const FLAT_LIST_CONTENT_STYLE = { padding: 16, paddingBottom: 8, flexGrow: 1 } as const;

export const ChatScreen: React.FC<ChatScreenProps> = ({ navigation, route }) => {
  const { matchId, friendshipId, recipientName = 'Match', recipientId, recipientPhoto = null, isFriendChat } = route.params;
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [audioRecording, setAudioRecording] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [match, setMatch] = useState<Match | null>(null);
  const [error, setError] = useState<string | null>(null);
  const flatListRef = useRef<FlatList>(null);
  const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Dropdown + action modals
  const [menuVisible, setMenuVisible] = useState(false);
  const [endMatchModalVisible, setEndMatchModalVisible] = useState(false);
  const [endMatchReason, setEndMatchReason] = useState('');
  const [endMatchCustomReason, setEndMatchCustomReason] = useState('');
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reportDetails, setReportDetails] = useState('');
  const [proposeDateModalVisible, setProposeDateModalVisible] = useState(false);
  const [dateProposalText, setDateProposalText] = useState('');
  const [endMatchSubmitting, setEndMatchSubmitting] = useState(false);

  // Profiles for MatchContextCard (match chats only)
  const [currentUserProfile, setCurrentUserProfile] = useState<any>(null);
  const [matchRecipientProfile, setMatchRecipientProfile] = useState<any>(null);

  const isFriend = isFriendChat === true || !matchId;

  // Fetch both profiles for the context card (match chats only)
  useEffect(() => {
    if (isFriend) return;
    getUserProfile().then(res => {
      if (res.ok && res.data) setCurrentUserProfile(res.data);
    });
    if (recipientId) {
      getFullUserProfileById(recipientId).then(profile => {
        if (profile) setMatchRecipientProfile(profile);
      }).catch(() => {});
    }
  }, [isFriend, recipientId]);

  const currentUserIdRef = useRef<string | null>(null);
  useEffect(() => { currentUserIdRef.current = currentUserId; }, [currentUserId]);

  const recipientProfile = useMemo(() =>
    match?.currentUserId === match?.user1Id ? match?.user2Profile : match?.user1Profile,
    [match]
  );

  useEffect(() => {
    loadMessages();
    const handleNewMessage = (newMsg: Message) => {
      setMessages(prev => {
        if (prev.some(m => m.id === newMsg.id)) return prev;
        return [...prev, newMsg];
      });
      const userId = currentUserIdRef.current;
      if (newMsg.senderId !== userId && userId) {
        if (isFriend && recipientId) {
          markFriendMessagesAsRead(userId, recipientId);
        } else if (matchId) {
          markMessagesAsRead(matchId, userId);
        }
      }
    };
    let subscription: { unsubscribe: () => void } | null = null;
    if (isFriend && recipientId) {
      subscription = subscribeToFriendMessages(recipientId, handleNewMessage);
    } else if (matchId) {
      subscription = subscribeToMessages(matchId, handleNewMessage);
    }
    return () => { subscription?.unsubscribe(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchId, recipientId, isFriend]);

  useEffect(() => {
    if (messages.length > 0) {
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
      scrollTimeoutRef.current = setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
    return () => { if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current); };
  }, [messages]);

  const loadMessages = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    setError(null);
    try {
      const userResult = await getCurrentUser();
      if (!userResult.ok || !userResult.data) {
        setError('User not authenticated');
        if (!isRefresh) { Alert.alert('Error', 'User not authenticated'); navigation.goBack(); }
        return;
      }
      setCurrentUserId(userResult.data.id);
      if (isFriend && recipientId) {
        const messagesResult = await getFriendMessages(userResult.data.id, recipientId);
        if (messagesResult.ok) {
          setMessages(messagesResult.data || []);
          if (messagesResult.data && messagesResult.data.length > 0) {
            await markFriendMessagesAsRead(userResult.data.id, recipientId);
          }
        } else { setError(messagesResult.error?.message || 'Failed to load messages'); }
        setLoading(false); setRefreshing(false); return;
      }
      if (matchId) {
        const minimalMatch: Match = {
          id: matchId, user1Id: userResult.data.id, user2Id: recipientId || '',
          status: 'accepted' as MatchStatus, communityScore: 0,
          matchedAt: new Date().toISOString(), expiresAt: new Date(Date.now() + 86400000).toISOString(),
          currentUserId: userResult.data.id,
        };
        setMatch(minimalMatch);
      }
      const messagesResult = await getMatchMessages(matchId || 'mock-match');
      if (!messagesResult.ok) {
        setError(messagesResult.error?.message || 'Failed to load messages');
        if (!isRefresh) Alert.alert('Error', 'Failed to load messages');
        return;
      }
      setMessages(messagesResult.data || []);
      if (matchId && userResult.data && messagesResult.data && messagesResult.data.length > 0) {
        await markMessagesAsRead(matchId, userResult.data.id);
      }
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to load chat';
      setError(errorMessage);
      if (!isRefresh) Alert.alert('Error', errorMessage);
    } finally { setLoading(false); setRefreshing(false); }
  }, [matchId, recipientId, isFriend, navigation]);

  const handleRefresh = useCallback(() => loadMessages(true), [loadMessages]);

  const sendMessage = async () => {
    if (!newMessage.trim() || !currentUserId || sendingMessage) return;
    if (!isFriend && !match) return;
    if (isFriend && (!friendshipId || !recipientId)) return;
    const targetRecipientId = isFriend ? recipientId! : (match!.currentUserId === match!.user1Id ? match!.user2Id : match!.user1Id);
    const messageText = newMessage.trim();
    setNewMessage(''); setSendingMessage(true);
    try {
      let result;
      if (isFriend && friendshipId) result = await sendFriendMessage(friendshipId, targetRecipientId, messageText);
      else if (matchId) result = await sendMessageAPI(matchId, targetRecipientId, messageText);
      else return;
      if (!result.ok || !result.data) throw new Error(result.error?.message || 'Failed to send message');
      const sentMsg = result.data;
      setMessages(prev => { if (prev.some(m => m.id === sentMsg.id)) return prev; return [...prev, sentMsg]; });
    } catch (error: any) {
      const msg = error.message || 'Failed to send message';
      const isRestricted = msg.toLowerCase().includes('restricted');
      Alert.alert('Send Failed', isRestricted ? 'This message contains restricted phrases. Use the "Propose a Date" button in the menu to ask them out!' : msg);
      setNewMessage(messageText);
    } finally { setSendingMessage(false); }
  };

  const handleAudioRecordingComplete = async (uri: string, durationMillis: number) => {
    if (!currentUserId || sendingMessage) return;
    if (!isFriend && !match) return;
    if (isFriend && (!friendshipId || !recipientId)) return;
    const targetRecipientId = isFriend ? recipientId! : (match!.currentUserId === match!.user1Id ? match!.user2Id : match!.user1Id);
    setSendingMessage(true);
    try {
      let result;
      if (isFriend && friendshipId) result = await sendFriendMessage(friendshipId, targetRecipientId, uri, 'audio', durationMillis);
      else if (matchId) result = await sendMessageAPI(matchId, targetRecipientId, uri, 'audio', durationMillis);
      else return;
      if (!result.ok || !result.data) throw new Error(result.error?.message || 'Failed to send voice note');
      const sentMsg = result.data;
      setMessages(prev => { if (prev.some(m => m.id === sentMsg.id)) return prev; return [...prev, sentMsg]; });
    } catch (error: any) { Alert.alert('Upload Failed', error.message || 'Failed to send voice note'); }
    finally { setSendingMessage(false); }
  };

  // ── Menu action handlers ─────────────────────────────────────────────────
  const openEndMatchModal = () => { setMenuVisible(false); setTimeout(() => setEndMatchModalVisible(true), 150); };
  const openReportModal = () => { setMenuVisible(false); setTimeout(() => setReportModalVisible(true), 150); };
  const openProposeDateModal = () => { setMenuVisible(false); setTimeout(() => setProposeDateModalVisible(true), 150); };

  const handleEndMatchConfirm = async () => {
    if (!endMatchReason || endMatchSubmitting) return;
    const reason = endMatchReason === 'Other' ? endMatchCustomReason.trim() || 'Other' : endMatchReason;
    setEndMatchSubmitting(true);
    try {
      if (matchId) await communityService.endActiveMatch(matchId, reason);
      setEndMatchModalVisible(false); setEndMatchReason(''); setEndMatchCustomReason('');
      navigation.goBack();
    } catch (error: any) { Alert.alert('Error', error.message || 'Could not end match. Try again.'); }
    finally { setEndMatchSubmitting(false); }
  };

  const handleReportConfirm = async () => {
    if (!reportReason || !currentUserId) return;
    try {
      await submitUserReport({ reporterId: currentUserId, reportedUserId: recipientId || '', reportedUserName: recipientName, reason: reportReason, details: reportDetails });
      setReportModalVisible(false); setReportReason(''); setReportDetails('');
      Alert.alert('Report Submitted', 'Thank you. Our team will review this shortly.');
    } catch (err) { Alert.alert('Error', 'Could not submit report. Please try again.'); }
  };

  const handleProposeDateConfirm = async () => {
    const text = dateProposalText.trim();
    if (!text || !currentUserId || sendingMessage) return;
    setProposeDateModalVisible(false); setDateProposalText('');
    const targetRecipientId = isFriend ? recipientId! : (match ? (match.currentUserId === match.user1Id ? match.user2Id : match.user1Id) : recipientId!);
    if (!targetRecipientId) return;
    const messageText = `📅 Date Proposal: ${text}`;
    setSendingMessage(true);
    try {
      let result;
      if (isFriend && friendshipId) result = await sendFriendMessage(friendshipId, targetRecipientId, messageText);
      else if (matchId) result = await sendMessageAPI(matchId, targetRecipientId, messageText);
      else return;
      if (!result.ok || !result.data) throw new Error(result.error?.message || 'Failed to send');
      const sentMsg = result.data;
      setMessages(prev => prev.some(m => m.id === sentMsg.id) ? prev : [...prev, sentMsg]);
    } catch (e: any) { Alert.alert('Failed', e.message || 'Could not send date proposal. Please try again.'); }
    finally { setSendingMessage(false); }
  };

  const renderDateSeparator = useCallback((date: string) => (
    <StyledView className="items-center my-4">
      <StyledView className="bg-neutral-100 px-3 py-1 rounded-full">
        <BodySmall className="text-neutral-600">{date}</BodySmall>
      </StyledView>
    </StyledView>
  ), []);

  const renderMessage = useCallback(({ item, index }: { item: Message; index: number }) => {
    const isOwnMessage = item.senderId === currentUserId;
    const messageDate = new Date(item.sentAt);
    const timeString = messageDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    const showDateSeparator = index === 0 || (index > 0 && formatMessageDate(new Date(messages[index - 1].sentAt)) !== formatMessageDate(messageDate));
    const isDateProposal = item.type === 'text' && item.content.startsWith('📅 Date Proposal:');
    const dateProposalBody = isDateProposal ? item.content.replace('📅 Date Proposal: ', '') : '';
    return (
      <>
        {showDateSeparator && renderDateSeparator(formatMessageDate(messageDate))}
        <StyledView className={`mb-3 ${isOwnMessage ? 'items-end' : 'items-start'}`}>
          {isDateProposal ? (
            <View style={dateProposalStyles.card}>
              <View style={dateProposalStyles.header}>
                <EvaIcon name="calendar" variant="outline" size={18} color={COLORS.primaryAccent} />
                <Text style={dateProposalStyles.headerText}>Date Proposal</Text>
              </View>
              <Text style={dateProposalStyles.body}>{dateProposalBody}</Text>
            </View>
          ) : (
            <StyledView className={`max-w-[80%] px-4 py-2 rounded-2xl ${isOwnMessage ? 'bg-primary-500 rounded-br-sm' : 'bg-neutral-100 rounded-bl-sm'}`}>
              {item.type === 'audio' ? (
                <AudioPlayer uri={item.content} duration={item.duration} isOwnMessage={isOwnMessage} />
              ) : (
                <Body className={isOwnMessage ? 'text-white' : 'text-neutral-900'}>{item.content}</Body>
              )}
            </StyledView>
          )}
          <StyledView className="flex-row items-center mt-1 px-1">
            <BodySmall className="text-neutral-500">{timeString}</BodySmall>
            {isOwnMessage && item.readAt && (
              <StyledView className="ml-1">
                <EvaIcon name="done-all" variant="outline" size={12} color={COLORS.primaryAccent} />
              </StyledView>
            )}
          </StyledView>
        </StyledView>
      </>
    );
  }, [currentUserId, messages, renderDateSeparator]);

  const renderEmptyState = useCallback(() => {
    if (isFriend) {
      return (
        <StyledView className="flex-1 items-center justify-center px-8 py-12">
          <StyledView className="w-20 h-20 bg-primary-50 rounded-full items-center justify-center mb-4">
            <EvaIcon name="people" variant="outline" size={40} color={COLORS.primaryAccent} />
          </StyledView>
          <H3 className="mb-2 text-center">Chat with {recipientName}</H3>
          <BodySmall className="text-neutral-600 text-center">Say hi to your friend! You can coordinate matches and catch up here.</BodySmall>
        </StyledView>
      );
    }
    return (
      <StyledView className="flex-1 justify-end px-0 pb-4">
        <MatchContextCard currentUserProfile={currentUserProfile} recipientProfile={matchRecipientProfile} />
      </StyledView>
    );
  }, [isFriend, currentUserProfile, matchRecipientProfile]);

  const renderHeader = useCallback(() => {
    if (isFriend || messages.length === 0) return null;
    return (
      <StyledView className="mb-2">
        <MatchContextCard currentUserProfile={currentUserProfile} recipientProfile={matchRecipientProfile} />
      </StyledView>
    );
  }, [isFriend, messages.length, currentUserProfile, matchRecipientProfile]);

  if (loading) {
    return (
      <StyledSafeAreaView className="flex-1 bg-white justify-center items-center">
        <ActivityIndicator size="large" color={COLORS.primaryAccent} />
        <BodySmall className="text-neutral-600 mt-4">Loading messages...</BodySmall>
      </StyledSafeAreaView>
    );
  }

  if (error && !match && !isFriend) {
    return (
      <StyledSafeAreaView className="flex-1 bg-white justify-center items-center px-8">
        <EvaIcon name="alert-circle" variant="outline" size={64} color={COLORS.error} />
        <H3 className="mt-4 mb-2 text-center">Something went wrong</H3>
        <BodySmall className="text-neutral-600 text-center mb-6">{error}</BodySmall>
        <StyledTouchableOpacity onPress={() => loadMessages()} className="bg-primary-500 px-6 py-3 rounded-lg" accessibilityRole="button" accessibilityLabel="Try again">
          <Body className="text-white font-semibold">Try Again</Body>
        </StyledTouchableOpacity>
        <StyledTouchableOpacity onPress={() => navigation.goBack()} className="mt-4" accessibilityRole="button" accessibilityLabel="Go back">
          <Body className="text-neutral-600">Go Back</Body>
        </StyledTouchableOpacity>
      </StyledSafeAreaView>
    );
  }

  return (
    <StyledSafeAreaView className="flex-1 bg-white">
      <StatusBar barStyle="dark-content" />
      {/* Chat Header */}
      <StyledView className="flex-row items-center justify-between px-4 py-3 border-b border-neutral-200">
        <StyledView className="flex-row items-center flex-1">
          <StyledTouchableOpacity onPress={() => navigation.goBack()} accessibilityRole="button" accessibilityLabel="Go back">
            <EvaIcon name="arrow-back" variant="outline" size={24} color={COLORS.textDarkHeading} />
          </StyledTouchableOpacity>
          {(() => {
            const photoUrl = (recipientProfile?.photos?.find((p: any) => p.isMain) || recipientProfile?.photos?.[0])?.url || recipientPhoto;
            return photoUrl ? (
              <StyledTouchableOpacity onPress={() => navigation.navigate('ProfileView', { userId: recipientId || '', profile: recipientProfile || (recipientId ? { userId: recipientId, firstName: recipientName } as any : undefined), showActions: false })} className="ml-3 mr-3" accessibilityRole="button" accessibilityLabel={`View ${recipientName}'s profile`}>
                <StyledImage source={{ uri: photoUrl }} className="w-10 h-10 rounded-full" />
              </StyledTouchableOpacity>
            ) : null;
          })()}
          <StyledView className="flex-1">
            <H3>{recipientName}</H3>
            {isFriend && <BodySmall className="text-neutral-500">Friend</BodySmall>}
          </StyledView>
        </StyledView>
        {!isFriend && (
          <StyledTouchableOpacity onPress={() => setMenuVisible(true)} style={{ padding: 4 }} accessibilityRole="button" accessibilityLabel="Chat options menu">
            <EvaIcon name="more-vertical" variant="outline" size={22} color={COLORS.navInactiveIcon} />
          </StyledTouchableOpacity>
        )}
      </StyledView>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }} keyboardVerticalOffset={0}>
        <FlatList
          ref={flatListRef} data={messages} keyExtractor={(item) => item.id}
          renderItem={renderMessage} contentContainerStyle={FLAT_LIST_CONTENT_STYLE}
          showsVerticalScrollIndicator={false} ListHeaderComponent={renderHeader}
          ListEmptyComponent={renderEmptyState}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={COLORS.primaryAccent} />}
        />
        <StyledView className="border-t border-neutral-200 px-4 py-3 bg-white">
          <StyledView className="flex-row items-end">
            <AudioRecorder onRecordingComplete={handleAudioRecordingComplete} onRecordingStateChange={setAudioRecording} disabled={sendingMessage} />
            {!audioRecording && (
              <>
                <StyledView className="flex-1 bg-neutral-50 rounded-2xl px-4 py-2 mx-2">
                  <StyledTextInput value={newMessage} onChangeText={setNewMessage} placeholder="Say something..." multiline maxLength={1000} className="text-neutral-900 text-base max-h-24" placeholderTextColor={COLORS.text.placeholder} editable={!sendingMessage && !newMessage.startsWith('file://')} accessibilityLabel="Message input" />
                </StyledView>
                {newMessage.trim() || sendingMessage ? (
                  <StyledTouchableOpacity onPress={sendMessage} disabled={!newMessage.trim() || sendingMessage} className={`w-10 h-10 rounded-full items-center justify-center ${newMessage.trim() && !sendingMessage ? 'bg-primary-500' : 'bg-neutral-200'}`} accessibilityRole="button" accessibilityLabel="Send message" accessibilityState={{ disabled: !newMessage.trim() || sendingMessage }}>
                    {sendingMessage ? <ActivityIndicator size="small" color="white" /> : <EvaIcon name="paper-plane" variant="outline" size={20} color={newMessage.trim() ? COLORS.card : COLORS.text.placeholder} />}
                  </StyledTouchableOpacity>
                ) : null}
              </>
            )}
          </StyledView>
          {newMessage.length > 900 && (
            <BodySmall className="text-neutral-500 mt-1 text-right">{1000 - newMessage.length} characters remaining</BodySmall>
          )}
        </StyledView>
      </KeyboardAvoidingView>

      {/* Modals */}
      <DropdownMenu visible={menuVisible} onClose={() => setMenuVisible(false)} onProposeDate={openProposeDateModal} onEndMatch={openEndMatchModal} onReport={openReportModal} recipientName={recipientName} />
      <ProposeDateModal visible={proposeDateModalVisible} onClose={() => { setProposeDateModalVisible(false); setDateProposalText(''); }} onConfirm={handleProposeDateConfirm} recipientName={recipientName} dateProposalText={dateProposalText} onChangeText={setDateProposalText} />
      <EndMatchModal visible={endMatchModalVisible} onClose={() => { setEndMatchModalVisible(false); setEndMatchReason(''); setEndMatchCustomReason(''); }} onConfirm={handleEndMatchConfirm} endMatchReason={endMatchReason} onSelectReason={setEndMatchReason} endMatchCustomReason={endMatchCustomReason} onChangeCustomReason={setEndMatchCustomReason} submitting={endMatchSubmitting} />
      <ReportModal visible={reportModalVisible} onClose={() => { setReportModalVisible(false); setReportReason(''); setReportDetails(''); }} onConfirm={handleReportConfirm} recipientName={recipientName} reportReason={reportReason} onSelectReason={setReportReason} reportDetails={reportDetails} onChangeDetails={setReportDetails} />
    </StyledSafeAreaView>
  );
};

export default ChatScreen;
