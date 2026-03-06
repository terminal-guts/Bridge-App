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
  Modal,
  StyleSheet,
  Text,
  ScrollView as RNScrollView,
} from 'react-native';
import { styled } from 'nativewind';
import { H3, Body, BodySmall } from '../../components/ui';
import { NavigationProp, RouteProp } from '@react-navigation/native';
import { RootStackParamList, Message, Match } from '../../types';
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
import { Ionicons } from '@expo/vector-icons';
import { AudioPlayer } from '../../components/chat/AudioPlayer';
import { AudioRecorder } from '../../components/chat/AudioRecorder';
import { communityService } from '../../services/communityServiceIndex';
import { createLogger } from '../../utils/secureLogger';

const logger = createLogger('ChatScreen');

const END_MATCH_REASONS = [
  'Conversation fizzled',
  'No connection',
  'Not on same page',
  'Felt uncomfortable',
  'Bad timing',
  'Other',
];

const REPORT_REASONS = [
  'Inappropriate messages',
  'Fake profile',
  'Harassment',
  'Spam',
  'Other',
];

const formatMessageDate = (date: Date): string => {
  const today = new Date();
  const messageDate = new Date(date);
  if (
    messageDate.getDate() === today.getDate() &&
    messageDate.getMonth() === today.getMonth() &&
    messageDate.getFullYear() === today.getFullYear()
  ) {
    return 'Today';
  }
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (
    messageDate.getDate() === yesterday.getDate() &&
    messageDate.getMonth() === yesterday.getMonth() &&
    messageDate.getFullYear() === yesterday.getFullYear()
  ) {
    return 'Yesterday';
  }
  return messageDate.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
};

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

  // Determine if this is a friend chat or match chat
  // Priority: isFriendChat flag takes precedence, then check if matchId is present
  const isFriend = isFriendChat === true || !matchId;

  // Ref to track currentUserId for use in subscription (prevents stale closure)
  const currentUserIdRef = useRef<string | null>(null);

  // Keep ref updated when currentUserId changes
  useEffect(() => {
    currentUserIdRef.current = currentUserId;
  }, [currentUserId]);

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

    // Subscribe to real-time messages for either match or friend chat
    let subscription: { unsubscribe: () => void } | null = null;

    if (isFriend && recipientId) {
      subscription = subscribeToFriendMessages(recipientId, handleNewMessage);
    } else if (matchId) {
      subscription = subscribeToMessages(matchId, handleNewMessage);
    }

    return () => {
      subscription?.unsubscribe();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchId, recipientId, isFriend]);

  useEffect(() => {
    // Scroll to bottom when messages change
    if (messages.length > 0) {
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
      scrollTimeoutRef.current = setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
    return () => {
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    };
  }, [messages]);

  const loadMessages = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError(null);

    try {
      const userResult = await getCurrentUser();
      if (!userResult.ok || !userResult.data) {
        setError('User not authenticated');
        if (!isRefresh) {
          Alert.alert('Error', 'User not authenticated');
          navigation.goBack();
        }
        return;
      }

      setCurrentUserId(userResult.data.id);

      // Friend chat — query by user pair, not friendship_id
      if (isFriend && recipientId) {
        const messagesResult = await getFriendMessages(userResult.data.id, recipientId);
        if (messagesResult.ok) {
          setMessages(messagesResult.data || []);
          if (messagesResult.data && messagesResult.data.length > 0) {
            await markFriendMessagesAsRead(userResult.data.id, recipientId);
          }
        } else {
          setError(messagesResult.error?.message || 'Failed to load messages');
        }
        setLoading(false);
        setRefreshing(false);
        return;
      }

      // Match chat — build a minimal match object from route params + current user
      // (avoids the broken PostgREST join in getUserMatches)
      if (matchId) {
        const minimalMatch: Match = {
          id: matchId,
          user1Id: userResult.data.id,
          user2Id: recipientId || '',
          status: 'active',
          communityScore: 0,
          matchedAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 86400000).toISOString(),
          currentUserId: userResult.data.id,
        };
        setMatch(minimalMatch);
      }

      // Load messages
      const messagesResult = await getMatchMessages(matchId || 'mock-match');
      if (!messagesResult.ok) {
        setError(messagesResult.error?.message || 'Failed to load messages');
        if (!isRefresh) {
          Alert.alert('Error', 'Failed to load messages');
        }
        return;
      }

      setMessages(messagesResult.data || []);

      // Mark messages as read (only when matchId is defined — it's optional in route params)
      if (matchId && userResult.data && messagesResult.data && messagesResult.data.length > 0) {
        await markMessagesAsRead(matchId, userResult.data.id);
      }
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to load chat';
      setError(errorMessage);
      if (!isRefresh) {
        Alert.alert('Error', errorMessage);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [matchId, recipientId, isFriend, navigation]);

  const handleRefresh = useCallback(() => loadMessages(true), [loadMessages]);

  const sendMessage = async () => {
    if (!newMessage.trim() || !currentUserId || sendingMessage) return;

    // For match chat, need match object; for friend chat, need friendshipId + recipientId
    if (!isFriend && !match) return;
    if (isFriend && (!friendshipId || !recipientId)) return;

    const targetRecipientId = isFriend
      ? recipientId!
      : (match!.currentUserId === match!.user1Id ? match!.user2Id : match!.user1Id);

    const messageText = newMessage.trim();
    setNewMessage(''); // Clear input immediately for better UX
    setSendingMessage(true);

    try {
      let result;
      if (isFriend && friendshipId) {
        result = await sendFriendMessage(friendshipId, targetRecipientId, messageText);
      } else if (matchId) {
        result = await sendMessageAPI(matchId, targetRecipientId, messageText);
      } else {
        return;
      }

      if (!result.ok || !result.data) {
        throw new Error(result.error?.message || 'Failed to send message');
      }

      // Fallback: Add message to state manually if subscription doesn't trigger
      const sentMsg = result.data;
      setMessages(prev => {
        if (prev.some(m => m.id === sentMsg.id)) return prev;
        return [...prev, sentMsg];
      });
    } catch (error: any) {
      const msg = error.message || 'Failed to send message';
      const isRestricted = msg.toLowerCase().includes('restricted');
      Alert.alert(
        'Send Failed',
        isRestricted
          ? 'This message contains restricted phrases. Use the "Propose a Date" button in the menu to ask them out!'
          : msg,
      );
      setNewMessage(messageText); // Restore message on failure
    } finally {
      setSendingMessage(false);
    }
  };

  const handleAudioRecordingComplete = async (uri: string, durationMillis: number) => {
    if (!currentUserId || sendingMessage) return;
    if (!isFriend && !match) return;
    if (isFriend && (!friendshipId || !recipientId)) return;

    const targetRecipientId = isFriend
      ? recipientId!
      : (match!.currentUserId === match!.user1Id ? match!.user2Id : match!.user1Id);

    setSendingMessage(true);

    try {
      let result;
      if (isFriend && friendshipId) {
        result = await sendFriendMessage(friendshipId, targetRecipientId, uri, 'audio', durationMillis);
      } else if (matchId) {
        result = await sendMessageAPI(matchId, targetRecipientId, uri, 'audio', durationMillis);
      } else {
        return;
      }

      if (!result.ok || !result.data) {
        throw new Error(result.error?.message || 'Failed to send voice note');
      }

      const sentMsg = result.data;
      setMessages(prev => {
        if (prev.some(m => m.id === sentMsg.id)) return prev;
        return [...prev, sentMsg];
      });
    } catch (error: any) {
      Alert.alert('Upload Failed', error.message || 'Failed to send voice note');
    } finally {
      setSendingMessage(false);
    }
  };

  // ── Menu action handlers ─────────────────────────────────────────────────

  const openEndMatchModal = () => {
    setMenuVisible(false);
    setTimeout(() => setEndMatchModalVisible(true), 150);
  };

  const openReportModal = () => {
    setMenuVisible(false);
    setTimeout(() => setReportModalVisible(true), 150);
  };

  const openProposeDateModal = () => {
    setMenuVisible(false);
    setTimeout(() => setProposeDateModalVisible(true), 150);
  };

  const [endMatchSubmitting, setEndMatchSubmitting] = useState(false);

  const handleEndMatchConfirm = async () => {
    if (!endMatchReason || endMatchSubmitting) return;
    const reason = endMatchReason === 'Other' ? endMatchCustomReason.trim() || 'Other' : endMatchReason;
    setEndMatchSubmitting(true);
    try {
      if (matchId) {
        await communityService.endActiveMatch(matchId, reason);
      }
      setEndMatchModalVisible(false);
      setEndMatchReason('');
      setEndMatchCustomReason('');
      navigation.goBack();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Could not end match. Try again.');
    } finally {
      setEndMatchSubmitting(false);
    }
  };

  const handleReportConfirm = () => {
    if (!reportReason) return;
    setReportModalVisible(false);
    setReportReason('');
    setReportDetails('');
    Alert.alert('Report Submitted', 'Thank you. Our team will review this shortly.');
  };

  const handleProposeDateConfirm = async () => {
    const text = dateProposalText.trim();
    if (!text || !currentUserId || sendingMessage) return;
    setProposeDateModalVisible(false);
    setDateProposalText('');

    const targetRecipientId = isFriend
      ? recipientId!
      : (match ? (match.currentUserId === match.user1Id ? match.user2Id : match.user1Id) : recipientId!);

    if (!targetRecipientId) return;

    const messageText = `📅 Date Proposal: ${text}`;
    setSendingMessage(true);
    try {
      let result;
      if (isFriend && friendshipId) {
        result = await sendFriendMessage(friendshipId, targetRecipientId, messageText);
      } else if (matchId) {
        result = await sendMessageAPI(matchId, targetRecipientId, messageText);
      } else {
        return;
      }
      if (!result.ok || !result.data) {
        throw new Error(result.error?.message || 'Failed to send');
      }
      const sentMsg = result.data;
      setMessages(prev => prev.some(m => m.id === sentMsg.id) ? prev : [...prev, sentMsg]);
    } catch (e: any) {
      Alert.alert('Failed', e.message || 'Could not send date proposal. Please try again.');
    } finally {
      setSendingMessage(false);
    }
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
    const timeString = messageDate.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });

    // Check if we need a date separator
    const showDateSeparator = index === 0 ||
      (index > 0 && formatMessageDate(new Date(messages[index - 1].sentAt)) !== formatMessageDate(messageDate));

    const isDateProposal = item.type === 'text' && item.content.startsWith('📅 Date Proposal:');
    const dateProposalBody = isDateProposal ? item.content.replace('📅 Date Proposal: ', '') : '';

    return (
      <>
        {showDateSeparator && renderDateSeparator(formatMessageDate(messageDate))}
        <StyledView
          className={`mb-3 ${isOwnMessage ? 'items-end' : 'items-start'}`}
        >
          {isDateProposal ? (
            <View style={dateProposalStyles.card}>
              <View style={dateProposalStyles.header}>
                <Ionicons name="calendar" size={18} color="#437FFF" />
                <Text style={dateProposalStyles.headerText}>Date Proposal</Text>
              </View>
              <Text style={dateProposalStyles.body}>{dateProposalBody}</Text>
            </View>
          ) : (
            <StyledView
              className={`max-w-[80%] px-4 py-2 rounded-2xl ${isOwnMessage
                ? 'bg-primary-500 rounded-br-sm'
                : 'bg-neutral-100 rounded-bl-sm'
                }`}
            >
              {item.type === 'audio' ? (
                <AudioPlayer
                  uri={item.content}
                  duration={item.duration}
                  isOwnMessage={isOwnMessage}
                />
              ) : (
                <Body className={isOwnMessage ? 'text-white' : 'text-neutral-900'}>
                  {item.content}
                </Body>
              )}
            </StyledView>
          )}
          <StyledView className="flex-row items-center mt-1 px-1">
            <BodySmall className="text-neutral-500">{timeString}</BodySmall>
            {isOwnMessage && item.readAt && (
              <StyledView className="ml-1">
                <Ionicons name="checkmark-done" size={12} color="#437FFF" />
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
            <Ionicons name="people" size={40} color="#437FFF" />
          </StyledView>
          <H3 className="mb-2 text-center">Chat with {recipientName}</H3>
          <BodySmall className="text-neutral-600 text-center">
            Say hi to your friend! You can coordinate matches and catch up here.
          </BodySmall>
        </StyledView>
      );
    }

    return (
      <StyledView className="flex-1 items-center justify-center px-8">
        <StyledView className="w-20 h-20 bg-primary-50 rounded-full items-center justify-center mb-4">
          <Ionicons name="chatbubbles" size={40} color="#437FFF" />
        </StyledView>
        <H3 className="mb-2 text-center">Start the conversation!</H3>
        <BodySmall className="text-neutral-600 text-center">
          The community matched you two for a reason. Say hello!
        </BodySmall>
      </StyledView>
    );
  }, [isFriend, recipientName]);

  const renderHeader = useCallback(() => null, []);

  if (loading) {
    return (
      <StyledSafeAreaView className="flex-1 bg-white justify-center items-center">
        <ActivityIndicator size="large" color="#437FFF" />
        <BodySmall className="text-neutral-600 mt-4">Loading messages...</BodySmall>
      </StyledSafeAreaView>
    );
  }

  if (error && !match && !isFriend) {
    return (
      <StyledSafeAreaView className="flex-1 bg-white justify-center items-center px-8">
        <Ionicons name="alert-circle-outline" size={64} color="#EF4444" />
        <H3 className="mt-4 mb-2 text-center">Something went wrong</H3>
        <BodySmall className="text-neutral-600 text-center mb-6">{error}</BodySmall>
        <StyledTouchableOpacity
          onPress={() => loadMessages()}
          className="bg-primary-500 px-6 py-3 rounded-lg"
        >
          <Body className="text-white font-semibold">Try Again</Body>
        </StyledTouchableOpacity>
        <StyledTouchableOpacity
          onPress={() => navigation.goBack()}
          className="mt-4"
        >
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
          <StyledTouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#101828" />
          </StyledTouchableOpacity>
          {(() => {
            const photoUrl = (recipientProfile?.photos?.find(p => p.isMain) || recipientProfile?.photos?.[0])?.url || recipientPhoto;
            return photoUrl ? (
              <StyledTouchableOpacity
                onPress={() => navigation.navigate('ProfileView', {
                  userId: recipientId || '',
                  profile: recipientProfile || (recipientId ? { userId: recipientId, firstName: recipientName } as any : undefined),
                  showActions: false,
                })}
                className="ml-3 mr-3"
              >
                <StyledImage
                  source={{ uri: photoUrl }}
                  className="w-10 h-10 rounded-full"
                />
              </StyledTouchableOpacity>
            ) : null;
          })()}
          <StyledView className="flex-1">
            <H3>{recipientName}</H3>
            {isFriend && <BodySmall className="text-neutral-500">Friend</BodySmall>}
          </StyledView>
        </StyledView>
        {!isFriend && (
          <StyledTouchableOpacity
            onPress={() => setMenuVisible(true)}
            style={{ padding: 4 }}
          >
            <Ionicons name="ellipsis-vertical" size={22} color="#667085" />
          </StyledTouchableOpacity>
        )}
      </StyledView>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
        keyboardVerticalOffset={0}
      >
        {/* Messages List */}
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          contentContainerStyle={FLAT_LIST_CONTENT_STYLE}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={renderHeader}
          ListEmptyComponent={renderEmptyState}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor="#437FFF"
            />
          }
        />

        {/* Message Input */}
        <StyledView className="border-t border-neutral-200 px-4 py-3 bg-white">
          <StyledView className="flex-row items-end">
            <AudioRecorder
              onRecordingComplete={handleAudioRecordingComplete}
              onRecordingStateChange={setAudioRecording}
              disabled={sendingMessage}
            />
            {!audioRecording && (
              <>
                <StyledView className="flex-1 bg-neutral-50 rounded-2xl px-4 py-2 mx-2">
                  <StyledTextInput
                    value={newMessage}
                    onChangeText={setNewMessage}
                    placeholder="Type a message..."
                    multiline
                    maxLength={1000}
                    className="text-neutral-900 text-base max-h-24"
                    placeholderTextColor="#98A2B3"
                    editable={!sendingMessage && !newMessage.startsWith('file://')}
                  />
                </StyledView>
                {newMessage.trim() || sendingMessage ? (
                  <StyledTouchableOpacity
                    onPress={sendMessage}
                    disabled={!newMessage.trim() || sendingMessage}
                    className={`w-10 h-10 rounded-full items-center justify-center ${newMessage.trim() && !sendingMessage ? 'bg-primary-500' : 'bg-neutral-200'
                      }`}
                  >
                    {sendingMessage ? (
                      <ActivityIndicator size="small" color="white" />
                    ) : (
                      <Ionicons
                        name="send"
                        size={20}
                        color={newMessage.trim() ? 'white' : '#98A2B3'}
                      />
                    )}
                  </StyledTouchableOpacity>
                ) : null}
              </>
            )}
          </StyledView>
          {newMessage.length > 900 && (
            <BodySmall className="text-neutral-500 mt-1 text-right">
              {1000 - newMessage.length} characters remaining
            </BodySmall>
          )}
        </StyledView>
      </KeyboardAvoidingView>

      {/* ── Dropdown Menu ──────────────────────────────────────────────── */}
      <Modal
        visible={menuVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuVisible(false)}
      >
        <TouchableOpacity
          style={cs.menuOverlay}
          activeOpacity={1}
          onPress={() => setMenuVisible(false)}
        >
          <View style={cs.menuCard}>
            <TouchableOpacity style={cs.menuItem} onPress={openProposeDateModal}>
              <Ionicons name="calendar-outline" size={18} color="#101828" />
              <Text style={cs.menuItemText}>Propose a Date</Text>
            </TouchableOpacity>

            <View style={cs.menuDivider} />

            <TouchableOpacity style={cs.menuItem} onPress={openEndMatchModal}>
              <Ionicons name="close-circle-outline" size={18} color="#101828" />
              <Text style={cs.menuItemText}>End Match</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ── End Match Modal ────────────────────────────────────────────── */}
      <Modal
        visible={endMatchModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setEndMatchModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={cs.centeredModalOverlay}
        >
          <TouchableOpacity
            activeOpacity={1}
            style={cs.centeredModalOverlay}
            onPress={() => { setEndMatchModalVisible(false); setEndMatchReason(''); setEndMatchCustomReason(''); }}
          >
          <TouchableOpacity activeOpacity={1} style={cs.centeredModalCard}>
            <Text style={cs.modalTitle}>End this match?</Text>
            <Text style={cs.modalSubtitle}>
              You'll re-enter the matchmaking pool.{'\n'}Your reason will be shared with them.
            </Text>

            <View style={cs.reasonList}>
              {END_MATCH_REASONS.map(reason => (
                <TouchableOpacity
                  key={reason}
                  style={[cs.reasonPill, endMatchReason === reason && cs.reasonPillActive]}
                  onPress={() => setEndMatchReason(reason)}
                >
                  <Text style={[cs.reasonText, endMatchReason === reason && cs.reasonTextActive]}>
                    {reason}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {endMatchReason === 'Other' && (
              <TextInput
                style={cs.textArea}
                placeholder="Tell us a bit more..."
                placeholderTextColor="#98A2B3"
                value={endMatchCustomReason}
                onChangeText={setEndMatchCustomReason}
                multiline
                maxLength={300}
              />
            )}

            <View style={cs.modalActions}>
              <TouchableOpacity
                style={cs.cancelBtn}
                onPress={() => {
                  setEndMatchModalVisible(false);
                  setEndMatchReason('');
                  setEndMatchCustomReason('');
                }}
              >
                <Text style={cs.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[cs.destructiveBtn, (!endMatchReason || endMatchSubmitting) && cs.btnDisabled]}
                onPress={handleEndMatchConfirm}
                disabled={!endMatchReason || endMatchSubmitting}
              >
                <Text style={cs.destructiveBtnText}>{endMatchSubmitting ? 'Ending...' : 'End Match'}</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── Report Modal ───────────────────────────────────────────────── */}
      <Modal
        visible={reportModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setReportModalVisible(false)}
      >
        <View style={cs.modalOverlay}>
          <View style={cs.modalCard}>
            <Text style={cs.modalTitle}>Report {recipientName}</Text>
            <Text style={cs.modalSubtitle}>
              Our team reviews all reports within 24 hours
            </Text>

            <View style={cs.reasonList}>
              {REPORT_REASONS.map(reason => (
                <TouchableOpacity
                  key={reason}
                  style={[cs.reasonPill, reportReason === reason && cs.reasonPillActive]}
                  onPress={() => setReportReason(reason)}
                >
                  <Text style={[cs.reasonText, reportReason === reason && cs.reasonTextActive]}>
                    {reason}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              style={cs.textArea}
              placeholder="Additional details (optional)"
              placeholderTextColor="#98A2B3"
              value={reportDetails}
              onChangeText={setReportDetails}
              multiline
              maxLength={500}
            />

            <View style={cs.modalActions}>
              <TouchableOpacity
                style={cs.cancelBtn}
                onPress={() => {
                  setReportModalVisible(false);
                  setReportReason('');
                  setReportDetails('');
                }}
              >
                <Text style={cs.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[cs.primaryBtn, !reportReason && cs.btnDisabled]}
                onPress={handleReportConfirm}
                disabled={!reportReason}
              >
                <Text style={cs.primaryBtnText}>Submit Report</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Propose a Date Modal ───────────────────────────────────────── */}
      <Modal
        visible={proposeDateModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setProposeDateModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={cs.dateModalOverlay}
        >
          <TouchableOpacity
            activeOpacity={1}
            style={{ flex: 1 }}
            onPress={() => { setProposeDateModalVisible(false); setDateProposalText(''); }}
          />
          <View style={cs.dateModalCard}>
            <View style={cs.dateIconWrap}>
              <Ionicons name="calendar" size={28} color="#437FFF" />
            </View>
            <Text style={cs.modalTitle}>Propose a Date</Text>
            <Text style={cs.modalSubtitle}>
              Suggest something fun with {recipientName}
            </Text>

            <TextInput
              style={[cs.textArea, { minHeight: 80 }]}
              placeholder={`e.g. Coffee at Blue Bottle on Saturday at 2pm?`}
              placeholderTextColor="#98A2B3"
              value={dateProposalText}
              onChangeText={setDateProposalText}
              multiline
              maxLength={300}
              autoFocus
            />

            <View style={cs.modalActions}>
              <TouchableOpacity
                style={cs.cancelBtn}
                onPress={() => {
                  setProposeDateModalVisible(false);
                  setDateProposalText('');
                }}
              >
                <Text style={cs.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[cs.primaryBtn, !dateProposalText.trim() && cs.btnDisabled]}
                onPress={handleProposeDateConfirm}
                disabled={!dateProposalText.trim()}
              >
                <Text style={cs.primaryBtnText}>Send Proposal</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

    </StyledSafeAreaView>
  );
};

export default ChatScreen;

// ── Date proposal message card ───────────────────────────────────────────────
const dateProposalStyles = StyleSheet.create({
  card: {
    maxWidth: '85%',
    borderWidth: 1.5,
    borderColor: '#D0DBFF',
    backgroundColor: '#F0F4FF',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  headerText: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: 14,
    color: '#437FFF',
  },
  body: {
    fontFamily: 'Outfit_400Regular',
    fontSize: 15,
    color: '#101828',
    lineHeight: 22,
  },
});

// ── Styles for menus & modals ──────────────────────────────────────────────
const cs = StyleSheet.create({
  // Dropdown
  menuOverlay: {
    flex: 1,
  },
  menuCard: {
    position: 'absolute',
    top: 96,
    right: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    width: 220,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 10,
  },
  menuItemText: {
    fontSize: 15,
    fontFamily: 'Outfit_500Medium',
    color: '#101828',
  },
  menuDivider: {
    height: 1,
    backgroundColor: '#F2F4F7',
    marginHorizontal: 16,
  },

  // Modal shared
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 40,
  },
  // Centered modal (End Match)
  centeredModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  centeredModalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 24,
    width: '100%',
  },
  // Date proposal modal — anchored to top so keyboard doesn't cover it
  dateModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-start',
  },
  dateModalCard: {
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 24,
    marginTop: 0,
  },
  modalTitle: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: 20,
    color: '#101828',
    marginBottom: 6,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontFamily: 'Outfit_400Regular',
    fontSize: 14,
    color: '#667085',
    textAlign: 'center',
    marginBottom: 20,
  },
  dateIconWrap: {
    alignSelf: 'center',
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#EEF3FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },

  // Reason pills
  reasonList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 16,
  },
  reasonPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: '#E4E7EC',
    backgroundColor: '#FFFFFF',
  },
  reasonPillActive: {
    borderColor: '#437FFF',
    backgroundColor: '#EEF3FF',
  },
  reasonText: {
    fontFamily: 'Outfit_400Regular',
    fontSize: 12,
    color: '#667085',
  },
  reasonTextActive: {
    fontFamily: 'Outfit_600SemiBold',
    color: '#437FFF',
  },

  // Text area
  textArea: {
    borderWidth: 1.5,
    borderColor: '#E4E7EC',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: 'Outfit_400Regular',
    fontSize: 14,
    color: '#101828',
    minHeight: 60,
    textAlignVertical: 'top',
    marginBottom: 20,
  },

  // Action row
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E4E7EC',
    alignItems: 'center',
  },
  cancelBtnText: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: 15,
    color: '#344054',
  },
  primaryBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#437FFF',
    alignItems: 'center',
  },
  primaryBtnText: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: 15,
    color: '#FFFFFF',
  },
  destructiveBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#EF4444',
    alignItems: 'center',
  },
  destructiveBtnText: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: 15,
    color: '#FFFFFF',
  },
  btnDisabled: {
    opacity: 0.4,
  },
});
