import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  SafeAreaView,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  TextInput,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Text,
} from 'react-native';
import { NavigationProp } from '@react-navigation/native';
import { EvaIcon } from '../../components/icons';
import { RootStackParamList } from '../../types';
import { FONTS, FONT_SIZES, LINE_HEIGHTS } from '../../constants/typography';
import { COLORS } from '../../theme/colors';
import {
  getSupportMessages,
  sendSupportMessage,
  subscribeToSupportMessages,
  markAdminMessagesRead,
  SupportMessage,
} from '../../services/supportChatService';

interface SupportChatScreenProps {
  navigation: NavigationProp<RootStackParamList, 'SupportChat'>;
}

const WELCOME_MESSAGE: SupportMessage = {
  id: 'welcome',
  user_id: '',
  content:
    "Every week we raffle off $50! Submit an improvement suggestion or bug to win a ticket. Your feedback will make a real difference. Thank you. We appreciate it.\n\n— Saul, Oneal, Aarav, and Utkarsh",
  sender: 'admin',
  is_auto_reply: false,
  created_at: new Date(0).toISOString(),
};

const formatMessageDate = (date: Date): string => {
  const today = new Date();
  if (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  ) {
    return 'Today';
  }
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (
    date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear()
  ) {
    return 'Yesterday';
  }
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

export const SupportChatScreen: React.FC<SupportChatScreenProps> = ({ navigation }) => {
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [sendFailed, setSendFailed] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load messages on mount
  useEffect(() => {
    const load = async () => {
      const msgs = await getSupportMessages();
      setMessages(msgs);
      setLoading(false);
      markAdminMessagesRead();
    };
    load();
  }, []);

  // Subscribe to real-time admin messages
  useEffect(() => {
    const sub = subscribeToSupportMessages((newMsg) => {
      setMessages((prev) => {
        if (prev.some((m) => m.id === newMsg.id)) return prev;
        return [...prev, newMsg];
      });
      markAdminMessagesRead();
    });
    return () => sub.unsubscribe();
  }, []);

  // Prepend welcome message
  const displayMessages = [WELCOME_MESSAGE, ...messages];

  // Scroll to bottom on new messages
  useEffect(() => {
    if (displayMessages.length > 0) {
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
      scrollTimeoutRef.current = setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
    return () => {
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || sending) return;

    setSending(true);
    setSendFailed(false);

    // Optimistically add user message
    const optimisticMsg: SupportMessage = {
      id: `optimistic-${Date.now()}`,
      user_id: '',
      content: text,
      sender: 'user',
      is_auto_reply: false,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimisticMsg]);
    setInput('');

    const result = await sendSupportMessage(text);

    if (!result.ok) {
      // Remove optimistic message, restore input
      setMessages((prev) => prev.filter((m) => m.id !== optimisticMsg.id));
      setInput(text);
      setSendFailed(true);
    } else {
      setSendFailed(false);
      // Reload messages to get the real message + auto-reply
      const fresh = await getSupportMessages();
      setMessages(fresh);
    }

    setSending(false);
  };

  const charRemaining = 1000 - input.length;

  const renderMessage = ({ item, index }: { item: SupportMessage; index: number }) => {
    const isUser = item.sender === 'user';
    const messageDate = new Date(item.created_at);
    const timeString = messageDate.getFullYear() > 1970
      ? messageDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
      : '';

    // Date separator
    const prevDate = index > 0 ? new Date(displayMessages[index - 1].created_at) : null;
    const showDateSep =
      index === 0 ||
      (prevDate && formatMessageDate(prevDate) !== formatMessageDate(messageDate) && messageDate.getFullYear() > 1970);

    return (
      <>
        {showDateSep && messageDate.getFullYear() > 1970 && (
          <View style={s.dateSep}>
            <View style={s.dateSepPill}>
              <Text style={s.dateSepText}>{formatMessageDate(messageDate)}</Text>
            </View>
          </View>
        )}
        <View style={[s.bubbleRow, isUser ? s.bubbleRowRight : s.bubbleRowLeft]}>
          {item.is_auto_reply && (
            <Text style={s.autoReplyLabel}>Auto-reply</Text>
          )}
          <View style={[s.bubble, isUser ? s.bubbleUser : s.bubbleAdmin]}>
            <Text style={[s.bubbleText, isUser ? s.bubbleTextUser : s.bubbleTextAdmin]}>
              {item.content}
            </Text>
          </View>
          {timeString ? (
            <Text style={s.timestamp}>{timeString}</Text>
          ) : null}
        </View>
      </>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={s.container}>
        <StatusBar barStyle="dark-content" />
        <View style={s.loadingWrap}>
          <ActivityIndicator size="large" color={COLORS.primaryAccent} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.container}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={s.backButton}
        >
          <EvaIcon name="arrow-back" variant="outline" size={24} color={COLORS.textDarkHeading} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Feedback</Text>
        <View style={s.headerSpacer} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={s.flex1}
        keyboardVerticalOffset={0}
      >
        {/* Messages */}
        <FlatList
          ref={flatListRef}
          data={displayMessages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          contentContainerStyle={s.listContent}
          showsVerticalScrollIndicator={false}
          initialNumToRender={8}
          maxToRenderPerBatch={8}
          windowSize={5}
          removeClippedSubviews
        />

        {/* Failed banner */}
        {sendFailed && (
          <TouchableOpacity
            style={s.failedBanner}
            onPress={() => { setSendFailed(false); handleSend(); }}
          >
            <Text style={s.failedBannerText}>Failed to send. Tap to retry.</Text>
          </TouchableOpacity>
        )}

        {/* Input bar */}
        <View style={s.inputBar}>
          <View style={s.inputWrap}>
            <TextInput
              style={s.textInput}
              value={input}
              onChangeText={setInput}
              placeholder="Type a message..."
              placeholderTextColor={COLORS.text.placeholder}
              multiline
              maxLength={1000}
              editable={!sending}
            />
          </View>
          {(input.trim() || sending) ? (
            <TouchableOpacity
              onPress={handleSend}
              disabled={!input.trim() || sending}
              style={[s.sendBtn, input.trim() && !sending ? s.sendBtnActive : s.sendBtnDisabled]}
            >
              {sending ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <EvaIcon name="paper-plane" variant="outline" size={20} color={input.trim() ? 'white' : COLORS.text.placeholder} />
              )}
            </TouchableOpacity>
          ) : null}
        </View>
        {input.length > 0 && (
          <View style={s.charCountWrap}>
            <Text style={[s.charCount, charRemaining < 50 && s.charCountRed]}>
              {charRemaining}
            </Text>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.card },
  flex1: { flex: 1 },
  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderNeutral,
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontFamily: FONTS.semiBold,
    fontSize: FONT_SIZES['2xl'],
    color: COLORS.textDarkHeading,
  },
  headerSpacer: { width: 44 },

  // Messages
  listContent: { padding: 16, paddingBottom: 8, flexGrow: 1 },

  dateSep: { alignItems: 'center', marginVertical: 16 },
  dateSepPill: { backgroundColor: COLORS.backgroundProgressTrack, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 999 },
  dateSepText: { fontFamily: FONTS.regular, fontSize: FONT_SIZES.sm, color: COLORS.navInactiveIcon },

  bubbleRow: { marginBottom: 12 },
  bubbleRowRight: { alignItems: 'flex-end' },
  bubbleRowLeft: { alignItems: 'flex-start' },

  autoReplyLabel: {
    fontFamily: FONTS.regular,
    fontSize: FONT_SIZES.xs,
    color: COLORS.text.placeholder,
    marginBottom: 2,
    marginLeft: 4,
  },

  bubble: { maxWidth: '80%', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 18 },
  bubbleUser: { backgroundColor: COLORS.primaryAccent, borderBottomRightRadius: 4 },
  bubbleAdmin: { backgroundColor: COLORS.backgroundProgressTrack, borderBottomLeftRadius: 4 },

  bubbleText: { fontFamily: FONTS.regular, fontSize: FONT_SIZES.lg, lineHeight: LINE_HEIGHTS.xl },
  bubbleTextUser: { color: COLORS.card },
  bubbleTextAdmin: { color: COLORS.textDarkHeading },

  timestamp: {
    fontFamily: FONTS.regular,
    fontSize: FONT_SIZES.xs,
    color: COLORS.text.placeholder,
    marginTop: 2,
    marginHorizontal: 4,
  },

  // Failed banner
  failedBanner: {
    backgroundColor: COLORS.backgroundSoftRed,
    paddingVertical: 12,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  failedBannerText: {
    fontFamily: FONTS.medium,
    fontSize: FONT_SIZES.md,
    color: COLORS.danger,
  },

  // Input
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderNeutral,
    backgroundColor: COLORS.card,
  },
  inputWrap: {
    flex: 1,
    backgroundColor: COLORS.backgroundSubtle,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
  },
  textInput: {
    fontFamily: FONTS.regular,
    fontSize: FONT_SIZES.lg,
    color: COLORS.textDarkHeading,
    maxHeight: 96,
  },
  sendBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  sendBtnActive: { backgroundColor: COLORS.primaryAccent },
  sendBtnDisabled: { backgroundColor: COLORS.borderNeutral },

  // Char count
  charCountWrap: { paddingHorizontal: 24, paddingBottom: 4, alignItems: 'flex-end', backgroundColor: COLORS.card },
  charCount: { fontFamily: FONTS.regular, fontSize: FONT_SIZES.xs, color: COLORS.text.placeholder },
  charCountRed: { color: COLORS.danger },
});

export default SupportChatScreen;
