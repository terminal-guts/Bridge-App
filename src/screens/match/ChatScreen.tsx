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
import { EvaIcon } from '../../components/icons';
import { AudioPlayer } from '../../components/chat/AudioPlayer';
import { AudioRecorder } from '../../components/chat/AudioRecorder';
import { communityService } from '../../services/communityServiceIndex';
import { supabase } from '../../lib/supabase';
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

  const handleReportConfirm = async () => {
    if (!reportReason || !currentUserId) return;
    try {
      const { error } = await supabase.from('user_reports').insert({
        reporter_id: currentUserId,
        reported_user_id: recipientId,
        reason: reportReason,
        details: reportDetails.trim() || '',
      });
      if (error) throw error;
      setReportModalVisible(false);
      setReportReason('');
      setReportDetails('');
      Alert.alert('Report Submitted', 'Thank you. Our team will review this shortly.');

      // Notify founder via email (fire-and-forget)
      const { data: reporterProfile } = await supabase
        .from('profiles')
        .select('first_name')
        .eq('id', currentUserId)
        .single();
      supabase.functions.invoke('notify-report', {
        body: {
          reporter_name: reporterProfile?.first_name || 'Unknown',
          reported_name: recipientName,
          reason: reportReason,
          details: reportDetails.trim() || '',
        },
      }).catch(() => {});
    } catch (err) {
      Alert.alert('Error', 'Could not submit report. Please try again.');
    }
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
                <EvaIcon name="calendar" size={18} color="#437FFF" variant="fill" />
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
                <EvaIcon name="done-all" size={12} color="#437FFF" />
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
            <EvaIcon name="people" size={40} color="#437FFF" variant="fill" />
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
          <EvaIcon name="message-square" size={40} color="#437FFF" variant="fill" />
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
        <EvaIcon name="alert-circle" size={64} color="#EF4444" variant="outline" />
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
            <EvaIcon name="arrow-back" size={24} color="#101828" />
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
            <EvaIcon name="more-vertical" size={22} color="#667085" />
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
                      <EvaIcon
                        name="paper-plane"
                        size={20}
                        color={newMessage.trim() ? 'white' : '#98A2B3'}
                        variant="fill"
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
              <EvaIcon name="calendar" size={18} color="#101828" variant="outline" />
              <Text style={cs.menuItemText}>Propose a Date</Text>
            </TouchableOpacity>

            <View style={cs.menuDivider} />

            <TouchableOpacity style={cs.menuItem} onPress={openEndMatchModal}>
              <EvaIcon name="close-circle" size={18} color="#101828" variant="outline" />
              <Text style={cs.menuItemText}>End Match</Text>
            </TouchableOpacity>

            <View style={cs.menuDivider} />

            <TouchableOpacity style={cs.menuItem} onPress={openReportModal}>
              <EvaIcon name="flag" size={18} color="#D92D20" variant="outline" />
              <Text style={[cs.menuItemText, { color: '#D92D20' }]}>Report</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ── Propose a Date Modal ───────────────────────────────────────── */}
      <Modal
        visible={proposeDateModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => { setProposeDateModalVisible(false); setDateProposalText(''); }}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={ts.overlay}
        >
          <View style={ts.card}>
            <TouchableOpacity
              style={ts.closeBtn}
              onPress={() => { setProposeDateModalVisible(false); setDateProposalText(''); }}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <EvaIcon name="close" size={22} color="#667085" />
            </TouchableOpacity>

            <View style={[ts.iconWrap, { backgroundColor: '#EEF3FF' }]}>
              <EvaIcon name="calendar" size={26} color="#437FFF" variant="fill" />
            </View>
            <Text style={ts.title}>Propose a Date</Text>
            <Text style={ts.subtitle}>Suggest something fun with {recipientName}</Text>

            <TextInput
              style={[ts.textArea, { minHeight: 80 }]}
              placeholder={`e.g. Coffee at Blue Bottle on Saturday at 2pm?`}
              placeholderTextColor="#98A2B3"
              value={dateProposalText}
              onChangeText={setDateProposalText}
              multiline
              maxLength={300}
              autoFocus
            />

            <TouchableOpacity
              style={[ts.submitBtn, !dateProposalText.trim() && ts.submitBtnDisabled]}
              onPress={handleProposeDateConfirm}
              disabled={!dateProposalText.trim()}
            >
              <Text style={ts.submitBtnText}>Send Proposal</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            activeOpacity={1}
            style={{ flex: 1 }}
            onPress={() => { setProposeDateModalVisible(false); setDateProposalText(''); }}
          />
        </KeyboardAvoidingView>
      </Modal>

      {/* ── End Match Modal ────────────────────────────────────────────── */}
      <Modal
        visible={endMatchModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => { setEndMatchModalVisible(false); setEndMatchReason(''); setEndMatchCustomReason(''); }}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={ts.overlay}
        >
          <View style={ts.card}>
            <TouchableOpacity
              style={ts.closeBtn}
              onPress={() => { setEndMatchModalVisible(false); setEndMatchReason(''); setEndMatchCustomReason(''); }}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <EvaIcon name="close" size={22} color="#667085" />
            </TouchableOpacity>

            <View style={[ts.iconWrap, { backgroundColor: '#FFF4ED' }]}>
              <EvaIcon name="heart" size={26} color="#F97316" variant="outline" />
            </View>
            <Text style={ts.title}>End this match?</Text>
            <Text style={ts.subtitle}>You'll re-enter the matchmaking pool.{'\n'}Your reason will be shared with them.</Text>

            <View style={ts.pillRow}>
              {END_MATCH_REASONS.map(reason => (
                <TouchableOpacity
                  key={reason}
                  style={[ts.pill, endMatchReason === reason && ts.pillActive]}
                  onPress={() => setEndMatchReason(reason)}
                >
                  <Text style={[ts.pillText, endMatchReason === reason && ts.pillTextActive]}>
                    {reason}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              style={ts.textArea}
              placeholder={endMatchReason === 'Other' ? 'Tell us a bit more...' : 'Additional details (optional)'}
              placeholderTextColor="#98A2B3"
              value={endMatchCustomReason}
              onChangeText={setEndMatchCustomReason}
              multiline
              maxLength={300}
            />

            <TouchableOpacity
              style={[ts.submitBtn, (!endMatchReason || endMatchSubmitting) && ts.submitBtnDisabled]}
              onPress={handleEndMatchConfirm}
              disabled={!endMatchReason || endMatchSubmitting}
            >
              <Text style={ts.submitBtnText}>{endMatchSubmitting ? 'Ending...' : 'End Match'}</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            activeOpacity={1}
            style={{ flex: 1 }}
            onPress={() => { setEndMatchModalVisible(false); setEndMatchReason(''); setEndMatchCustomReason(''); }}
          />
        </KeyboardAvoidingView>
      </Modal>

      {/* ── Report Modal ───────────────────────────────────────────────── */}
      <Modal
        visible={reportModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => { setReportModalVisible(false); setReportReason(''); setReportDetails(''); }}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={ts.overlay}
        >
          <View style={ts.card}>
            <TouchableOpacity
              style={ts.closeBtn}
              onPress={() => { setReportModalVisible(false); setReportReason(''); setReportDetails(''); }}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <EvaIcon name="close" size={22} color="#667085" />
            </TouchableOpacity>

            <View style={[ts.iconWrap, { backgroundColor: '#FEF3F2' }]}>
              <EvaIcon name="flag" size={26} color="#D92D20" variant="fill" />
            </View>
            <Text style={ts.title}>Report {recipientName}</Text>
            <Text style={ts.subtitle}>Our team reviews all reports within 24 hours</Text>

            <View style={ts.pillRow}>
              {REPORT_REASONS.map(reason => (
                <TouchableOpacity
                  key={reason}
                  style={[ts.pill, reportReason === reason && ts.pillActive]}
                  onPress={() => setReportReason(reason)}
                >
                  <Text style={[ts.pillText, reportReason === reason && ts.pillTextActive]}>
                    {reason}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              style={ts.textArea}
              placeholder="Additional details (optional)"
              placeholderTextColor="#98A2B3"
              value={reportDetails}
              onChangeText={setReportDetails}
              multiline
              maxLength={500}
            />

            <TouchableOpacity
              style={[ts.submitBtn, !reportReason && ts.submitBtnDisabled]}
              onPress={handleReportConfirm}
              disabled={!reportReason}
            >
              <Text style={ts.submitBtnText}>Submit Report</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            activeOpacity={1}
            style={{ flex: 1 }}
            onPress={() => { setReportModalVisible(false); setReportReason(''); setReportDetails(''); }}
          />
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
});

// ── Top-sheet modal styles ─────────────────────────────────────────────────
const ts = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-start',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 56,
    paddingBottom: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 12,
  },
  closeBtn: {
    position: 'absolute',
    top: 58,
    left: 16,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F2F4F7',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  iconWrap: {
    alignSelf: 'center',
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  title: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: 20,
    color: '#101828',
    textAlign: 'center',
    marginBottom: 6,
  },
  subtitle: {
    fontFamily: 'Outfit_400Regular',
    fontSize: 14,
    color: '#667085',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: '#E4E7EC',
    backgroundColor: '#FFFFFF',
  },
  pillActive: {
    borderColor: '#437FFF',
    backgroundColor: '#EEF3FF',
  },
  pillText: {
    fontFamily: 'Outfit_500Medium',
    fontSize: 13,
    color: '#667085',
  },
  pillTextActive: {
    fontFamily: 'Outfit_600SemiBold',
    color: '#437FFF',
  },
  textArea: {
    borderWidth: 1.5,
    borderColor: '#E4E7EC',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontFamily: 'Outfit_400Regular',
    fontSize: 15,
    color: '#101828',
    minHeight: 64,
    textAlignVertical: 'top',
    marginBottom: 20,
    backgroundColor: '#FAFBFC',
  },
  submitBtn: {
    paddingVertical: 16,
    borderRadius: 14,
    backgroundColor: '#437FFF',
    alignItems: 'center',
  },
  submitBtnDisabled: {
    opacity: 0.35,
  },
  submitBtnText: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: 16,
    color: '#FFFFFF',
  },
});
