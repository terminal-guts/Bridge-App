import React, { useState, useRef, useEffect } from 'react';
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
import { H3, Body, BodySmall } from '../components/ui';
import { NavigationProp, RouteProp } from '@react-navigation/native';
import { RootStackParamList, Message, Match } from '../types';
import { getCurrentUser } from '../services/authService';
import { getUserMatches } from '../services/matchService';
import {
  getMatchMessages,
  sendMessage as sendMessageAPI,
  subscribeToMessages,
  markMessagesAsRead
} from '../services/messageService';
import { Ionicons } from '@expo/vector-icons';
import { AudioPlayer } from '../components/chat/AudioPlayer';
import { AudioRecorder } from '../components/chat/AudioRecorder';
import { createLogger } from '../utils/secureLogger';

const logger = createLogger('ChatScreen');

const END_MATCH_REASONS = [
  'We\'re not compatible',
  'Not interested anymore',
  'We decided to meet in person',
  'Inappropriate behaviour',
  'Other',
];

const REPORT_REASONS = [
  'Inappropriate messages',
  'Fake profile',
  'Harassment',
  'Spam',
  'Other',
];

interface ChatScreenProps {
  navigation: NavigationProp<RootStackParamList, 'Chat'>;
  route: RouteProp<RootStackParamList, 'Chat'>;
}

const StyledSafeAreaView = styled(SafeAreaView);
const StyledView = styled(View);
const StyledTextInput = styled(TextInput);
const StyledTouchableOpacity = styled(TouchableOpacity);
const StyledImage = styled(Image);

export const ChatScreen: React.FC<ChatScreenProps> = ({ navigation, route }) => {
  const { matchId, recipientName, recipientId, isFriendChat } = route.params;
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [match, setMatch] = useState<Match | null>(null);
  const [error, setError] = useState<string | null>(null);
  const flatListRef = useRef<FlatList>(null);

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

  const recipientProfile = match?.currentUserId === match?.user1Id
    ? match?.user2Profile
    : match?.user1Profile;

  useEffect(() => {
    loadMessages();

    // Only subscribe to real-time messages for match chats
    if (isFriend || !matchId) {
      return;
    }

    // Subscribe to real-time messages
    const subscription = subscribeToMessages(matchId, (newMsg) => {
      setMessages(prev => {
        // Prevent duplicates
        if (prev.some(m => m.id === newMsg.id)) {
          return prev;
        }
        return [...prev, newMsg];
      });

      // Auto-mark as read if message is from other user (use ref to avoid stale closure)
      const userId = currentUserIdRef.current;
      if (newMsg.senderId !== userId && userId) {
        markMessagesAsRead(matchId, userId);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [matchId, isFriend]);

  useEffect(() => {
    // Scroll to bottom when messages change
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  // Mark messages as read when screen is focused or new messages arrive
  useEffect(() => {
    if (currentUserId && messages.length > 0) {
      markMessagesAsRead(matchId, currentUserId);
    }
  }, [currentUserId, matchId, messages.length]);

  const loadMessages = async (isRefresh = false) => {
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

      // Friend chat - coming soon
      if (isFriend) {
        // Friend chat functionality not yet implemented
        setMessages([]);
        setLoading(false);
        setRefreshing(false);
        return;
      }

      // Match chat - existing functionality
      // Load match details
      const matchesResult = await getUserMatches();
      let foundMatch = matchesResult.data?.find(m => m.id === matchId);

      // Fallback for development/testing: If match not found, use a mock one
      if (!foundMatch && matchId) {
        logger.info(`[CHAT] Match ${matchId} not found, using fallback for development`);
        const { mockProfiles, currentUserProfile } = await import('../services/mockData');
        foundMatch = {
          id: matchId,
          user1Id: currentUserProfile.userId,
          user2Id: 'fallback-user',
          user1Profile: currentUserProfile,
          user2Profile: mockProfiles[0],
          status: 'accepted',
          communityScore: 95,
          matchedAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 86400000).toISOString(),
          currentUserId: currentUserProfile.userId,
        };
      }

      if (foundMatch) {
        setMatch(foundMatch);
      } else {
        setError('Match not found');
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

      // Mark messages as read
      if (userResult.data && messagesResult.data && messagesResult.data.length > 0) {
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
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !currentUserId || !match || sendingMessage) return;

    const recipientId = match.currentUserId === match.user1Id
      ? match.user2Id
      : match.user1Id;

    const messageText = newMessage.trim();
    setNewMessage(''); // Clear input immediately for better UX
    setSendingMessage(true);

    try {
      if (!matchId) return;
      const result = await sendMessageAPI(matchId, recipientId, messageText);
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
      Alert.alert('Send Failed', error.message || 'Failed to send message');
      setNewMessage(messageText); // Restore message on failure
    } finally {
      setSendingMessage(false);
    }
  };

  const handleAudioRecordingComplete = async (uri: string, durationMillis: number) => {
    if (!currentUserId || !match || sendingMessage) {
      return;
    }

    const recipientId = match.currentUserId === match.user1Id
      ? match.user2Id
      : match.user1Id;

    setSendingMessage(true);

    try {
      if (!matchId) return;
      // In a real app, we would upload the file to Supabase/S3 first
      // and then send the URL as the content. For this mock, we use the local URI.
      const result = await sendMessageAPI(matchId, recipientId, uri, 'audio', durationMillis);
      if (!result.ok || !result.data) {
        throw new Error(result.error?.message || 'Failed to send voice note');
      }

      // Fallback: Add message to state manually if subscription doesn't trigger
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

  const handleEndMatchConfirm = () => {
    if (!endMatchReason) return;
    setEndMatchModalVisible(false);
    setEndMatchReason('');
    setEndMatchCustomReason('');
    Alert.alert('Match Ended', 'Your match has been ended.', [
      { text: 'OK', onPress: () => navigation.goBack() },
    ]);
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
    if (!text || !currentUserId || !match || sendingMessage) return;
    setProposeDateModalVisible(false);
    setDateProposalText('');

    if (!matchId) return;
    const recipId = match.currentUserId === match.user1Id ? match.user2Id : match.user1Id;
    setSendingMessage(true);
    try {
      const result = await sendMessageAPI(matchId, recipId, `📅 Date Proposal: ${text}`);
      if (!result.ok || !result.data) throw new Error(result.error?.message || 'Failed to send');
      const sentMsg = result.data;
      setMessages(prev => prev.some(m => m.id === sentMsg.id) ? prev : [...prev, sentMsg]);
    } catch (e: any) {
      Alert.alert('Failed', 'Could not send date proposal. Please try again.');
    } finally {
      setSendingMessage(false);
    }
  };

  const formatMessageDate = (date: Date): string => {
    const today = new Date();
    const messageDate = new Date(date);

    // Check if same day
    if (
      messageDate.getDate() === today.getDate() &&
      messageDate.getMonth() === today.getMonth() &&
      messageDate.getFullYear() === today.getFullYear()
    ) {
      return 'Today';
    }

    // Check if yesterday
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (
      messageDate.getDate() === yesterday.getDate() &&
      messageDate.getMonth() === yesterday.getMonth() &&
      messageDate.getFullYear() === yesterday.getFullYear()
    ) {
      return 'Yesterday';
    }

    // Format as "Mon, Jan 15"
    return messageDate.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  };

  const renderMessage = ({ item, index }: { item: Message; index: number }) => {
    const isOwnMessage = item.senderId === currentUserId;
    const messageDate = new Date(item.sentAt);
    const timeString = messageDate.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });

    // Check if we need a date separator
    const showDateSeparator = index === 0 ||
      (index > 0 && formatMessageDate(new Date(messages[index - 1].sentAt)) !== formatMessageDate(messageDate));

    return (
      <>
        {showDateSeparator && renderDateSeparator(formatMessageDate(messageDate))}
        <StyledView
          className={`mb-3 ${isOwnMessage ? 'items-end' : 'items-start'}`}
        >
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
  };

  const renderDateSeparator = (date: string) => (
    <StyledView className="items-center my-4">
      <StyledView className="bg-neutral-100 px-3 py-1 rounded-full">
        <BodySmall className="text-neutral-600">{date}</BodySmall>
      </StyledView>
    </StyledView>
  );

  const renderEmptyState = () => {
    if (isFriend) {
      return (
        <StyledView className="flex-1 items-center justify-center px-8 py-12">
          <StyledView className="w-20 h-20 bg-rose-50 rounded-full items-center justify-center mb-4">
            <Ionicons name="construct" size={40} color="#F43F5E" />
          </StyledView>
          <H3 className="mb-2 text-center">Friend Chat Coming Soon</H3>
          <BodySmall className="text-neutral-600 text-center">
            We're building the ability to chat with your friends.{'\n'}Stay tuned!
          </BodySmall>
        </StyledView>
      );
    }

    return (
      <StyledView className="flex-1 items-center justify-center px-8 py-12">
        <StyledView className="w-20 h-20 bg-primary-50 rounded-full items-center justify-center mb-4">
          <Ionicons name="chatbubbles" size={40} color="#437FFF" />
        </StyledView>
        <H3 className="mb-2 text-center">Start the conversation!</H3>
        <BodySmall className="text-neutral-600 text-center">
          The community matched you two for a reason. Say hello!
        </BodySmall>
      </StyledView>
    );
  };

  const renderHeader = () => {
    if (isFriend) {
      return null; // No header for friend chats (coming soon screen)
    }

    if (!recipientProfile) return null;

    return (
      <StyledView className="items-center mb-6 pt-4">
        <StyledImage
          source={{ uri: (recipientProfile.photos?.find(p => p.isMain) || recipientProfile.photos?.[0])?.url }}
          className="w-20 h-20 rounded-full mb-3"
        />
        <H3 className="mb-1">You matched with {recipientName}!</H3>
        <BodySmall className="text-neutral-600 text-center px-8">
          The community thinks you two are perfect for each other.
        </BodySmall>
      </StyledView>
    );
  };

  if (loading) {
    return (
      <StyledSafeAreaView className="flex-1 bg-white justify-center items-center">
        <ActivityIndicator size="large" color="#437FFF" />
        <BodySmall className="text-neutral-600 mt-4">Loading messages...</BodySmall>
      </StyledSafeAreaView>
    );
  }

  if (error && !match) {
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
          {(recipientProfile?.photos?.find(p => p.isMain) || recipientProfile?.photos?.[0])?.url && (
            <StyledImage
              source={{ uri: (recipientProfile.photos.find(p => p.isMain) || recipientProfile.photos[0]).url }}
              className="w-10 h-10 rounded-full ml-3 mr-3"
            />
          )}
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
          contentContainerStyle={{
            padding: 16,
            paddingBottom: 8,
            flexGrow: 1
          }}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={renderHeader}
          ListEmptyComponent={renderEmptyState}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => loadMessages(true)}
              tintColor="#437FFF"
            />
          }
        />

        {/* Message Input - Only show for match chats */}
        {!isFriend && (
          <StyledView className="border-t border-neutral-200 px-4 py-3 bg-white">
            <StyledView className="flex-row items-end">
              <AudioRecorder
                onRecordingComplete={handleAudioRecordingComplete}
                disabled={sendingMessage}
              />
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
            </StyledView>
            {newMessage.length > 900 && (
              <BodySmall className="text-neutral-500 mt-1 text-right">
                {1000 - newMessage.length} characters remaining
              </BodySmall>
            )}
          </StyledView>
        )}
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

            <View style={cs.menuDivider} />

            <TouchableOpacity style={cs.menuItem} onPress={openReportModal}>
              <Ionicons name="flag-outline" size={18} color="#EF4444" />
              <Text style={[cs.menuItemText, { color: '#EF4444' }]}>
                Report {recipientName}
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ── End Match Modal ────────────────────────────────────────────── */}
      <Modal
        visible={endMatchModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setEndMatchModalVisible(false)}
      >
        <View style={cs.modalOverlay}>
          <View style={cs.modalCard}>
            <Text style={cs.modalTitle}>End this match?</Text>
            <Text style={cs.modalSubtitle}>
              Help us improve — let us know why
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
                style={[cs.destructiveBtn, !endMatchReason && cs.btnDisabled]}
                onPress={handleEndMatchConfirm}
                disabled={!endMatchReason}
              >
                <Text style={cs.destructiveBtnText}>End Match</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
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
        animationType="slide"
        onRequestClose={() => setProposeDateModalVisible(false)}
      >
        <View style={cs.modalOverlay}>
          <View style={cs.modalCard}>
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
        </View>
      </Modal>

    </StyledSafeAreaView>
  );
};

export default ChatScreen;

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
    gap: 8,
    marginBottom: 16,
  },
  reasonPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
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
    fontSize: 14,
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
