/**
 * ChatScreen — main screen orchestrator
 * Modals and styles extracted to ChatScreen.components.tsx
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  AppState,
  View,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  TextInput,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Text,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { getOptimizedPhotoUrl } from '../../utils/imageUtils';
import { H3, ChatSkeleton } from '../../components/ui';
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
import { showToast } from '../../utils/toast';
import { COLORS } from '../../theme/colors';
import { SHADOWS } from '../../theme/shadows';
import { FONTS, FONT_SIZES, LINE_HEIGHTS } from '../../constants/typography';
import { EvaIcon } from '../../components/icons';
import { OfflineBanner } from '../../components/ui/OfflineBanner';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';

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

const FLAT_LIST_CONTENT_STYLE = { padding: 16, paddingBottom: 8, flexGrow: 1 } as const;

// ─── MessageItem ─────────────────────────────────────────────────────────────
// Extracted + memoized so FlatList can skip re-renders for unchanged rows when
// a new message arrives. Previously `renderMessage` depended on a Map that
// re-computed on every `messages` change, invalidating every cell.
// Date-separator label is computed inline from timestamps, keeping props
// primitive so React.memo's shallow compare works as intended.
interface MessageItemProps {
  item: Message;
  prevItem: Message | null;
  isOwnMessage: boolean;
}

const MessageItemBase: React.FC<MessageItemProps> = ({ item, prevItem, isOwnMessage }) => {
  const messageDate = new Date(item.sentAt);
  const timeString = messageDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  const currentLabel = formatMessageDate(messageDate);
  const prevLabel = prevItem ? formatMessageDate(new Date(prevItem.sentAt)) : null;
  const showDateSep = prevItem == null || currentLabel !== prevLabel;
  const isDateProposal = item.type === 'text' && item.content.startsWith('📅 Date Proposal:');
  const dateProposalBody = isDateProposal ? item.content.replace('📅 Date Proposal: ', '') : '';

  return (
    <View>
      {showDateSep && (
        <View style={cs.dateSepWrap}>
          <View style={cs.dateSepPill}>
            <Text style={cs.dateSepText}>{currentLabel}</Text>
          </View>
        </View>
      )}
      <View style={[cs.messageRow, isOwnMessage ? cs.messageRowOwn : cs.messageRowOther]}>
        {isDateProposal ? (
          <View style={dateProposalStyles.card}>
            <View style={dateProposalStyles.header}>
              <EvaIcon name="calendar" variant="outline" size={18} color={COLORS.primaryAccent} />
              <Text style={dateProposalStyles.headerText}>Date Proposal</Text>
            </View>
            <Text style={dateProposalStyles.body}>{dateProposalBody}</Text>
          </View>
        ) : (
          <View style={[cs.bubble, isOwnMessage ? cs.bubbleOwn : cs.bubbleOther]}>
            {item.type === 'audio' ? (
              <AudioPlayer uri={item.content} duration={item.duration} isOwnMessage={isOwnMessage} />
            ) : (
              <Text style={[cs.bubbleText, isOwnMessage ? cs.bubbleTextOwn : cs.bubbleTextOther]}>
                {item.content}
              </Text>
            )}
          </View>
        )}
        <View style={cs.timestampRow}>
          <Text style={cs.timestampText}>{timeString}</Text>
          {isOwnMessage && item.readAt && (
            <View style={cs.readReceipt}>
              <EvaIcon name="done-all" variant="outline" size={12} color={COLORS.primaryAccent} />
            </View>
          )}
        </View>
      </View>
    </View>
  );
};

const MessageItem = React.memo(MessageItemBase);

export const ChatScreen: React.FC<ChatScreenProps> = ({ navigation, route }) => {
  const { matchId, friendshipId, recipientName = 'Match', recipientId, recipientPhoto = null, isFriendChat } = route.params;
  const insets = useSafeAreaInsets();
  // Measured height of the top chrome (OfflineBanner + header). Combined with
  // insets.top, this is the exact distance from screen-top to the KAV — which
  // is what `keyboardVerticalOffset` requires. Hardcoding this value (previous
  // `100`) caused a gap on shorter devices (iPhone SE) and clipping on taller
  // ones (Pro Max Dynamic Island).
  const [chromeHeight, setChromeHeight] = useState(0);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [audioRecording, setAudioRecording] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [match, setMatch] = useState<Match | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [imageLoadError, setImageLoadError] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sendingRef = useRef(false);

  // Tracks mount state so deferred timers don't touch state on an unmounted component
  const isMountedRef = useRef(true);
  useEffect(() => {
    isMountedRef.current = true;
    return () => { isMountedRef.current = false; };
  }, []);

  // Network status — shows OfflineBanner, guards send, auto-recovers on reconnect
  const loadMessagesRef = useRef<((isRefresh?: boolean) => Promise<void>) | null>(null);
  const { isOffline } = useNetworkStatus(useCallback(() => {
    // Re-fetch messages on reconnect to recover any missed during the gap
    setTimeout(() => {
      if (!isMountedRef.current) return;
      loadMessagesRef.current?.(true);
    }, 1500);
  }, []));

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

  const recipientProfile = match?.currentUserId === match?.user1Id ? match?.user2Profile : match?.user1Profile;

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

  const loadingRef = useRef(false);
  const loadMessages = useCallback(async (isRefresh = false) => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    if (isRefresh) setRefreshing(true); else setLoading(true);
    setError(null);
    try {
      const userResult = await getCurrentUser();
      if (!userResult.ok || !userResult.data) {
        setError('Looks like you got signed out. Please sign back in to continue.');
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
        } else { setError(messagesResult.error?.message || 'Couldn\'t load your conversation right now'); }
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
        setError(messagesResult.error?.message || 'Couldn\'t load your conversation right now');
        return;
      }
      setMessages(messagesResult.data || []);
      if (matchId && userResult.data && messagesResult.data && messagesResult.data.length > 0) {
        await markMessagesAsRead(matchId, userResult.data.id);
      }
    } catch (err: any) {
      setError(err.message || 'Couldn\'t load your conversation right now');
    } finally { setLoading(false); setRefreshing(false); loadingRef.current = false; }
  }, [matchId, recipientId, isFriend]);

  // Wire up ref so reconnect handler can call loadMessages
  loadMessagesRef.current = loadMessages;

  // Re-fetch messages when app returns from background — covers the case where
  // the realtime channel silently disconnected without firing CHANNEL_ERROR
  // (e.g. OS killed the WebSocket after 24h+ in background).
  const lastActiveRef = useRef(Date.now());
  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        const elapsed = Date.now() - lastActiveRef.current;
        // Only re-fetch if backgrounded for more than 2 minutes
        if (elapsed > 120_000) {
          logger.info('App foregrounded after', Math.round(elapsed / 1000), 's — re-fetching messages');
          loadMessages(true);
        }
      } else if (nextState === 'background') {
        lastActiveRef.current = Date.now();
      }
    });
    return () => sub.remove();
  }, [loadMessages]);

  const handleRefresh = useCallback(() => loadMessages(true), [loadMessages]);

  const sendMessage = async () => {
    if (!newMessage.trim() || !currentUserId || sendingRef.current) return;
    if (isOffline) {
      setSendError('You\'re offline. Your message will send when you reconnect.');
      return;
    }
    if (!isFriend && !match) return;
    if (isFriend && (!friendshipId || !recipientId)) return;
    sendingRef.current = true;
    const targetRecipientId = isFriend ? recipientId! : (match!.currentUserId === match!.user1Id ? match!.user2Id : match!.user1Id);
    const messageText = newMessage.trim();
    setNewMessage(''); setSendingMessage(true); setSendError(null);
    try {
      let result;
      if (isFriend && friendshipId) result = await sendFriendMessage(friendshipId, targetRecipientId, messageText);
      else if (matchId) result = await sendMessageAPI(matchId, targetRecipientId, messageText);
      else return;
      if (!result.ok || !result.data) throw new Error(result.error?.message || 'Your message didn\'t go through — try again?');
      const sentMsg = result.data;
      setMessages(prev => { if (prev.some(m => m.id === sentMsg.id)) return prev; return [...prev, sentMsg]; });
    } catch (error: any) {
      const msg = error.message || 'Your message didn\'t go through — try again?';
      const isRestricted = msg.toLowerCase().includes('restricted');
      setSendError(isRestricted ? 'That message has a restricted phrase. Use "Propose a Date" in the menu instead.' : msg);
      setNewMessage(messageText);
    } finally { setSendingMessage(false); sendingRef.current = false; }
  };

  const handleAudioRecordingComplete = async (uri: string, durationMillis: number) => {
    if (!currentUserId || sendingRef.current) return;
    if (isOffline) {
      setSendError('You\'re offline. Your voice note will send when you reconnect.');
      return;
    }
    if (!isFriend && !match) return;
    if (isFriend && (!friendshipId || !recipientId)) return;
    sendingRef.current = true;
    const targetRecipientId = isFriend ? recipientId! : (match!.currentUserId === match!.user1Id ? match!.user2Id : match!.user1Id);
    setSendingMessage(true); setSendError(null);
    const AUDIO_TIMEOUT_MS = 30000;
    try {
      let sendPromise: Promise<any>;
      if (isFriend && friendshipId) sendPromise = sendFriendMessage(friendshipId, targetRecipientId, uri, 'audio', durationMillis);
      else if (matchId) sendPromise = sendMessageAPI(matchId, targetRecipientId, uri, 'audio', durationMillis);
      else return;
      const result = await Promise.race([
        sendPromise,
        new Promise<never>((_, reject) => setTimeout(() => {
          if (!isMountedRef.current) return;
          reject(new Error('Voice note took too long — try again.'));
        }, AUDIO_TIMEOUT_MS)),
      ]);
      if (!result.ok || !result.data) throw new Error(result.error?.message || 'Your voice note didn\'t go through — try again?');
      const sentMsg = result.data;
      setMessages(prev => { if (prev.some(m => m.id === sentMsg.id)) return prev; return [...prev, sentMsg]; });
    } catch (err: any) { setSendError(err.message || 'Voice note failed to send. Please try again.'); }
    finally { setSendingMessage(false); sendingRef.current = false; }
  };

  // ── Menu action handlers ─────────────────────────────────────────────────
  const openEndMatchModal = () => { setMenuVisible(false); setTimeout(() => setEndMatchModalVisible(true), 150); };
  const openReportModal = () => { setMenuVisible(false); setTimeout(() => setReportModalVisible(true), 150); };
  const openProposeDateModal = () => { setMenuVisible(false); setTimeout(() => setProposeDateModalVisible(true), 150); };

  const endMatchRef = useRef(false);
  const handleEndMatchConfirm = async () => {
    if (!endMatchReason || endMatchRef.current) return;
    endMatchRef.current = true;
    const reason = endMatchReason === 'Other' ? endMatchCustomReason.trim() || 'Other' : endMatchReason;
    setEndMatchSubmitting(true);
    try {
      if (matchId) await communityService.endActiveMatch(matchId, reason);
      setEndMatchModalVisible(false); setEndMatchReason(''); setEndMatchCustomReason('');
      navigation.goBack();
    } catch (error: any) {
      logger.error('End match failed', error);
      showToast.error('Hmm, that didn\'t work', 'We couldn\'t end the match right now. Give it another try?');
    }
    finally { setEndMatchSubmitting(false); endMatchRef.current = false; }
  };

  const reportSubmittingRef = useRef(false);
  const handleReportConfirm = async () => {
    if (!reportReason || !currentUserId || reportSubmittingRef.current) return;
    reportSubmittingRef.current = true;
    try {
      const finalReason = reportReason === 'Other' && reportDetails.trim() ? `Other: ${reportDetails.trim()}` : reportReason;
      await submitUserReport({ reporterId: currentUserId, reportedUserId: recipientId || '', reportedUserName: recipientName, reason: finalReason, details: reportReason === 'Other' ? '' : reportDetails });
      setReportModalVisible(false); setReportReason(''); setReportDetails('');
      showToast.success('Thanks for letting us know', 'Our team will look into this within 24 hours.');
    } catch (err) {
      logger.error('Report submission failed', err);
      showToast.error('Hmm, that didn\'t work', 'We couldn\'t send your report right now. Give it another try?');
    }
    finally { reportSubmittingRef.current = false; }
  };

  const handleProposeDateConfirm = async () => {
    const text = dateProposalText.trim();
    if (!text || !currentUserId || sendingRef.current) return;
    setProposeDateModalVisible(false); setDateProposalText('');
    const targetRecipientId = isFriend ? recipientId! : (match ? (match.currentUserId === match.user1Id ? match.user2Id : match.user1Id) : recipientId!);
    if (!targetRecipientId) return;
    sendingRef.current = true;
    const messageText = `📅 Date Proposal: ${text}`;
    setSendingMessage(true); setSendError(null);
    try {
      let result;
      if (isFriend && friendshipId) result = await sendFriendMessage(friendshipId, targetRecipientId, messageText);
      else if (matchId) result = await sendMessageAPI(matchId, targetRecipientId, messageText);
      else return;
      if (!result.ok || !result.data) throw new Error(result.error?.message || 'Your hangout idea didn\'t go through');
      const sentMsg = result.data;
      setMessages(prev => prev.some(m => m.id === sentMsg.id) ? prev : [...prev, sentMsg]);
    } catch (e: any) { setSendError(e.message || 'Date proposal failed to send. Please try again.'); }
    finally { setSendingMessage(false); sendingRef.current = false; }
  };

  // Date-separator derivation moved into MessageItem (uses prevItem timestamp).
  // This keeps renderMessage deps stable (just currentUserId + messages array),
  // and React.memo on MessageItem skips re-rendering unchanged rows.
  const renderMessage = useCallback(({ item, index }: { item: Message; index: number }) => {
    const prevItem = index > 0 ? messages[index - 1] : null;
    const isOwnMessage = item.senderId === currentUserId;
    return <MessageItem item={item} prevItem={prevItem} isOwnMessage={isOwnMessage} />;
  }, [currentUserId, messages]);

  const renderEmptyState = useCallback(() => {
    if (isFriend) {
      return (
        <View style={cs.emptyWrap}>
          <View style={cs.emptyIcon}>
            <EvaIcon name="people" variant="outline" size={40} color={COLORS.primaryAccent} />
          </View>
          <H3 className="mb-2 text-center">Chat with {recipientName}</H3>
          <Text style={cs.emptySubtext}>Send a message to catch up or coordinate your next match together.</Text>
        </View>
      );
    }
    return (
      <View style={cs.emptyMatchWrap}>
        <MatchContextCard currentUserProfile={currentUserProfile} recipientProfile={matchRecipientProfile} />
        <View style={cs.emptyMatchHint}>
          <Text style={cs.emptyMatchHintText}>
            This is the start of your conversation with {recipientName}. Say something genuine — your friends brought you here for a reason.
          </Text>
        </View>
      </View>
    );
  }, [isFriend, recipientName, currentUserProfile, matchRecipientProfile]);

  const keyExtractor = useCallback((item: Message) => item.id, []);

  const renderHeader = useCallback(() => {
    if (isFriend || messages.length === 0) return null;
    return (
      <View style={cs.listHeader}>
        <MatchContextCard currentUserProfile={currentUserProfile} recipientProfile={matchRecipientProfile} />
      </View>
    );
  }, [isFriend, messages.length, currentUserProfile, matchRecipientProfile]);

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.screenBackground }}>
        <ChatSkeleton />
      </SafeAreaView>
    );
  }

  if (error && !match && !isFriend) {
    return (
      <SafeAreaView style={cs.errorContainer}>
        <EvaIcon name="alert-circle" variant="outline" size={64} color={COLORS.error} />
        <H3 className="mt-4 mb-2 text-center">Something went wrong</H3>
        <Text style={cs.errorSubtext}>{error}</Text>
        <TouchableOpacity onPress={() => loadMessages()} style={cs.retryBtn} accessibilityRole="button" accessibilityLabel="Try again">
          <Text style={cs.retryBtnText}>Try Again</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.goBack()} style={cs.goBackBtn} accessibilityRole="button" accessibilityLabel="Go back">
          <Text style={cs.goBackText}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={cs.screen}>
      <StatusBar barStyle="dark-content" />
      {/* Measure the chrome above the KAV so keyboardVerticalOffset stays accurate
          across devices (iPhone SE vs Pro Max Dynamic Island vs Android). */}
      <View onLayout={(e) => {
        const h = Math.round(e.nativeEvent.layout.height);
        if (h !== chromeHeight) setChromeHeight(h);
      }}>
      <OfflineBanner />
      {/* Chat Header */}
      <View style={cs.header}>
        <View style={cs.headerLeft}>
          <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} accessibilityRole="button" accessibilityLabel="Go back">
            <EvaIcon name="arrow-back" variant="outline" size={24} color={COLORS.text.primary} />
          </TouchableOpacity>
          {(() => {
            const photoUrl = (recipientProfile?.photos?.find((p: any) => p.isMain) || recipientProfile?.photos?.[0])?.url || recipientPhoto;
            if (!photoUrl || imageLoadError) return null;
            return (
              <TouchableOpacity onPress={() => navigation.navigate('ProfileView', { userId: recipientId || '', profile: recipientProfile || (recipientId ? { userId: recipientId, firstName: recipientName } as any : undefined), showActions: false })} style={cs.avatarBtn} accessibilityRole="button" accessibilityLabel={`View ${recipientName}'s profile`}>
                <Image
                  source={{ uri: getOptimizedPhotoUrl(photoUrl, 'avatar') ?? photoUrl }}
                  style={cs.avatar}
                  contentFit="cover"
                  cachePolicy="memory-disk"
                  priority="high"
                  onError={() => setImageLoadError(true)}
                  accessibilityLabel={`${recipientName}'s photo`}
                />
              </TouchableOpacity>
            );
          })()}
          <View style={cs.headerTitleWrap}>
            <H3 numberOfLines={1}>{recipientName}</H3>
            {isFriend && <Text style={cs.friendLabel}>Friend</Text>}
          </View>
        </View>
        {!isFriend && (
          <TouchableOpacity onPress={() => setMenuVisible(true)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} style={cs.menuBtn} accessibilityRole="button" accessibilityLabel="Chat options menu">
            <EvaIcon name="more-vertical" variant="outline" size={22} color={COLORS.text.secondary} />
          </TouchableOpacity>
        )}
      </View>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={cs.flex1}
        keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top + chromeHeight : 0}
      >
        <FlatList
          ref={flatListRef} data={messages} keyExtractor={keyExtractor}
          renderItem={renderMessage} contentContainerStyle={FLAT_LIST_CONTENT_STYLE}
          showsVerticalScrollIndicator={false} ListHeaderComponent={renderHeader}
          ListEmptyComponent={renderEmptyState}
          keyboardShouldPersistTaps="handled"
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={COLORS.primaryAccent} />}
          initialNumToRender={8}
          maxToRenderPerBatch={8}
          windowSize={5}
          removeClippedSubviews
          accessibilityRole="list"
          accessibilityLabel="Messages"
        />
        {sendError && (
          <View style={cs.sendErrorWrap}>
            <EvaIcon name="alert-circle" variant="outline" size={16} color={COLORS.error} />
            <Text style={cs.sendErrorText} numberOfLines={2}>{sendError}</Text>
            <TouchableOpacity onPress={() => setSendError(null)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} accessibilityRole="button" accessibilityLabel="Dismiss error">
              <EvaIcon name="close" variant="outline" size={16} color={COLORS.text.secondary} />
            </TouchableOpacity>
          </View>
        )}
        <View style={cs.inputBar}>
          <View style={cs.inputBarInner}>
            <AudioRecorder onRecordingComplete={handleAudioRecordingComplete} onRecordingStateChange={setAudioRecording} disabled={sendingMessage} />
            {!audioRecording && (
              <>
                <View style={cs.inputFieldWrap}>
                  <TextInput
                    value={newMessage}
                    onChangeText={(text: string) => { setNewMessage(text); if (sendError) setSendError(null); }}
                    placeholder="Write a message..."
                    multiline
                    maxLength={1000}
                    style={cs.inputField}
                    placeholderTextColor={COLORS.text.tertiary}
                    editable={!sendingMessage}
                    accessibilityLabel="Message input"
                  />
                </View>
                {newMessage.trim() || sendingMessage ? (
                  <TouchableOpacity
                    onPress={sendMessage}
                    disabled={!newMessage.trim() || sendingMessage}
                    style={[cs.sendBtn, newMessage.trim() && !sendingMessage ? cs.sendBtnActive : cs.sendBtnDisabled]}
                    accessibilityRole="button"
                    accessibilityLabel="Send message"
                    accessibilityState={{ disabled: !newMessage.trim() || sendingMessage }}
                  >
                    {sendingMessage ? <ActivityIndicator size="small" color={COLORS.card} /> : <EvaIcon name="paper-plane" variant="outline" size={20} color={newMessage.trim() ? COLORS.card : COLORS.text.tertiary} />}
                  </TouchableOpacity>
                ) : null}
              </>
            )}
          </View>
          {newMessage.length > 900 && (
            <Text style={cs.charCount}>{1000 - newMessage.length} characters remaining</Text>
          )}
        </View>
      </KeyboardAvoidingView>

      {/* Modals */}
      <DropdownMenu visible={menuVisible} onClose={() => setMenuVisible(false)} onProposeDate={openProposeDateModal} onEndMatch={openEndMatchModal} onReport={openReportModal} recipientName={recipientName} />
      <ProposeDateModal visible={proposeDateModalVisible} onClose={() => { setProposeDateModalVisible(false); setDateProposalText(''); }} onConfirm={handleProposeDateConfirm} recipientName={recipientName} dateProposalText={dateProposalText} onChangeText={setDateProposalText} />
      <EndMatchModal visible={endMatchModalVisible} onClose={() => { setEndMatchModalVisible(false); setEndMatchReason(''); setEndMatchCustomReason(''); }} onConfirm={handleEndMatchConfirm} endMatchReason={endMatchReason} onSelectReason={setEndMatchReason} endMatchCustomReason={endMatchCustomReason} onChangeCustomReason={setEndMatchCustomReason} submitting={endMatchSubmitting} />
      <ReportModal visible={reportModalVisible} onClose={() => { setReportModalVisible(false); setReportReason(''); setReportDetails(''); }} onConfirm={handleReportConfirm} recipientName={recipientName} reportReason={reportReason} onSelectReason={setReportReason} reportDetails={reportDetails} onChangeDetails={setReportDetails} />
    </SafeAreaView>
  );
};

// ── Styles ──────────────────────────────────────────────────────────────────

const cs = StyleSheet.create({
  flex1: { flex: 1 },
  screen: {
    flex: 1,
    backgroundColor: COLORS.screenBackground,
  },

  // ── Loading ─────────────────────────────────────
  loadingContainer: {
    flex: 1,
    backgroundColor: COLORS.screenBackground,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.card,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  loadingText: {
    fontFamily: FONTS.regular,
    fontSize: FONT_SIZES.base,
    lineHeight: LINE_HEIGHTS.base,
    color: COLORS.text.tertiary,
    marginTop: 12,
  },

  // ── Error ───────────────────────────────────────
  errorContainer: {
    flex: 1,
    backgroundColor: COLORS.screenBackground,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  errorSubtext: {
    fontFamily: FONTS.regular,
    fontSize: FONT_SIZES.base,
    lineHeight: LINE_HEIGHTS.base,
    color: COLORS.text.secondary,
    textAlign: 'center',
    marginBottom: 24,
  },
  retryBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
  },
  retryBtnText: {
    fontFamily: FONTS.semiBold,
    fontSize: FONT_SIZES.lg,
    lineHeight: LINE_HEIGHTS.lg,
    color: COLORS.card,
  },
  goBackBtn: {
    marginTop: 16,
    paddingVertical: 8,
  },
  goBackText: {
    fontFamily: FONTS.regular,
    fontSize: FONT_SIZES.lg,
    lineHeight: LINE_HEIGHTS.lg,
    color: COLORS.text.secondary,
  },

  // ── Chat Header ─────────────────────────────────
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.card,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatarBtn: {
    marginLeft: 12,
    marginRight: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.card,
  },
  headerTitleWrap: {
    flex: 1,
    minWidth: 0,
  },
  friendLabel: {
    fontFamily: FONTS.regular,
    fontSize: FONT_SIZES.sm,
    lineHeight: LINE_HEIGHTS.sm,
    color: COLORS.text.secondary,
  },
  menuBtn: {
    padding: 8,
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── List header ─────────────────────────────────
  listHeader: {
    marginBottom: 8,
  },

  // ── Date separator ──────────────────────────────
  dateSepWrap: {
    alignItems: 'center',
    marginVertical: 16,
  },
  dateSepPill: {
    backgroundColor: COLORS.card,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
  },
  dateSepText: {
    fontFamily: FONTS.medium,
    fontSize: FONT_SIZES.xs,
    lineHeight: LINE_HEIGHTS.xs,
    color: COLORS.text.secondary,
  },

  // ── Message bubbles ─────────────────────────────
  messageRow: {
    marginBottom: 12,
  },
  messageRowOwn: {
    alignItems: 'flex-end',
  },
  messageRowOther: {
    alignItems: 'flex-start',
  },
  bubble: {
    maxWidth: '80%',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    ...SHADOWS.sm,
  },
  bubbleOwn: {
    backgroundColor: COLORS.primary,
    borderBottomRightRadius: 6,
  },
  bubbleOther: {
    backgroundColor: COLORS.card,
    borderBottomLeftRadius: 6,
  },
  bubbleText: {
    fontFamily: FONTS.regular,
    fontSize: FONT_SIZES.lg,
    lineHeight: LINE_HEIGHTS.lg,
  },
  bubbleTextOwn: {
    color: COLORS.card,
  },
  bubbleTextOther: {
    color: COLORS.text.primary,
  },
  timestampRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    paddingHorizontal: 4,
  },
  timestampText: {
    fontFamily: FONTS.regular,
    fontSize: FONT_SIZES.xs,
    lineHeight: LINE_HEIGHTS.xs,
    color: COLORS.text.tertiary,
  },
  readReceipt: {
    marginLeft: 4,
  },

  // ── Empty state ─────────────────────────────────
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingVertical: 48,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    backgroundColor: COLORS.card,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptySubtext: {
    fontFamily: FONTS.regular,
    fontSize: FONT_SIZES.base,
    lineHeight: LINE_HEIGHTS.base,
    color: COLORS.text.secondary,
    textAlign: 'center',
  },
  emptyMatchWrap: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingBottom: 16,
  },
  emptyMatchHint: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 8,
  },
  emptyMatchHintText: {
    fontFamily: FONTS.regular,
    fontSize: FONT_SIZES.base,
    lineHeight: LINE_HEIGHTS.base,
    color: COLORS.text.secondary,
    textAlign: 'center',
  },

  // ── Send error banner ───────────────────────────
  sendErrorWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  sendErrorText: {
    flex: 1,
    marginLeft: 8,
    fontFamily: FONTS.regular,
    fontSize: FONT_SIZES.sm,
    lineHeight: LINE_HEIGHTS.sm,
    color: COLORS.error,
  },

  // ── Input bar ───────────────────────────────────
  inputBar: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.card,
  },
  inputBarInner: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  inputFieldWrap: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginHorizontal: 8,
  },
  inputField: {
    fontFamily: FONTS.regular,
    fontSize: FONT_SIZES.lg,
    lineHeight: LINE_HEIGHTS.lg,
    color: COLORS.text.primary,
    maxHeight: 96,
    paddingTop: 0,
    paddingBottom: 0,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnActive: {
    backgroundColor: COLORS.primary,
  },
  sendBtnDisabled: {
    backgroundColor: COLORS.card,
  },
  charCount: {
    fontFamily: FONTS.regular,
    fontSize: FONT_SIZES.xs,
    lineHeight: LINE_HEIGHTS.xs,
    color: COLORS.text.tertiary,
    marginTop: 4,
    textAlign: 'right',
  },
});

export default ChatScreen;
