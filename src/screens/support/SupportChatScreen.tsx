import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
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
import { BackHeader, LoadingState } from '../../components/ui';
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
    "Every week we raffle off $25! Submit an improvement suggestion or bug to win a ticket. Your feedback will make a real difference. Thank you. We appreciate it.\n\n— Saul, Aarav, and Utkarsh",
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
  const displayMessages = useMemo(() => [WELCOME_MESSAGE, ...messages], [messages]);

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

  // Pre-compute date separators so renderMessage doesn't need displayMessages
  // in its dependency array (avoids re-creating the callback on each new message).
  const dateSeparatorMap = useMemo(() => {
    const map = new Map<string, string>();
    for (let i = 0; i < displayMessages.length; i++) {
      const msg = displayMessages[i];
      const messageDate = new Date(msg.created_at);
      if (messageDate.getFullYear() <= 1970) continue;
      const dateLabel = formatMessageDate(messageDate);
      const prevLabel = i > 0 ? formatMessageDate(new Date(displayMessages[i - 1].created_at)) : null;
      if (i === 0 || dateLabel !== prevLabel) {
        map.set(msg.id, dateLabel);
      }
    }
    return map;
  }, [displayMessages]);

  const keyExtractor = useCallback((item: SupportMessage) => item.id, []);

  const renderMessage = useCallback(({ item }: { item: SupportMessage }) => {
    const isUser = item.sender === 'user';
    const messageDate = new Date(item.created_at);
    const timeString = messageDate.getFullYear() > 1970
      ? messageDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
      : '';

    const dateSepLabel = dateSeparatorMap.get(item.id);

    return (
      <>
        {dateSepLabel != null && (
          <View style={s.dateSep}>
            <View style={s.dateSepPill}>
              <Text style={s.dateSepText}>{dateSepLabel}</Text>
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
  }, [dateSeparatorMap]);

  if (loading) {
    return (
      <SafeAreaView style={s.container}>
        <StatusBar barStyle="dark-content" />
        <LoadingState fullScreen />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.container}>
      <StatusBar barStyle="dark-content" />

      <BackHeader title="Feedback" titleAlign="center" />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={s.flex1}
        keyboardVerticalOffset={0}
      >
        {/* Messages */}
        <FlatList
          ref={flatListRef}
          data={displayMessages}
          keyExtractor={keyExtractor}
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
              placeholderTextColor={COLORS.text.tertiary}
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
                <EvaIcon name="paper-plane" variant="outline" size={20} color={input.trim() ? 'white' : COLORS.text.tertiary} />
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
    borderBottomColor: COLORS.border,
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
    color: COLORS.text.primary,
  },
  headerSpacer: { width: 44 },

  // Messages
  listContent: { padding: 16, paddingBottom: 8, flexGrow: 1 },

  dateSep: { alignItems: 'center', marginVertical: 16 },
  dateSepPill: { backgroundColor: COLORS.card, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 999 },
  dateSepText: { fontFamily: FONTS.regular, fontSize: FONT_SIZES.sm, color: COLORS.navInactiveIcon },

  bubbleRow: { marginBottom: 12 },
  bubbleRowRight: { alignItems: 'flex-end' },
  bubbleRowLeft: { alignItems: 'flex-start' },

  autoReplyLabel: {
    fontFamily: FONTS.regular,
    fontSize: FONT_SIZES.xs,
    color: COLORS.text.tertiary,
    marginBottom: 2,
    marginLeft: 4,
  },

  bubble: { maxWidth: '80%', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 18 },
  bubbleUser: { backgroundColor: COLORS.primaryAccent, borderBottomRightRadius: 4 },
  bubbleAdmin: { backgroundColor: COLORS.card, borderBottomLeftRadius: 4 },

  bubbleText: { fontFamily: FONTS.regular, fontSize: FONT_SIZES.lg, lineHeight: LINE_HEIGHTS.xl },
  bubbleTextUser: { color: COLORS.card },
  bubbleTextAdmin: { color: COLORS.text.primary },

  timestamp: {
    fontFamily: FONTS.regular,
    fontSize: FONT_SIZES.xs,
    color: COLORS.text.tertiary,
    marginTop: 2,
    marginHorizontal: 4,
  },

  // Failed banner
  failedBanner: {
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    paddingVertical: 12,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  failedBannerText: {
    fontFamily: FONTS.medium,
    fontSize: FONT_SIZES.md,
    color: COLORS.error,
  },

  // Input
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.card,
  },
  inputWrap: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
  },
  textInput: {
    fontFamily: FONTS.regular,
    fontSize: FONT_SIZES.lg,
    color: COLORS.text.primary,
    maxHeight: 96,
  },
  sendBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  sendBtnActive: { backgroundColor: COLORS.primaryAccent },
  sendBtnDisabled: { backgroundColor: COLORS.border },

  // Char count
  charCountWrap: { paddingHorizontal: 24, paddingBottom: 4, alignItems: 'flex-end', backgroundColor: COLORS.card },
  charCount: { fontFamily: FONTS.regular, fontSize: FONT_SIZES.xs, color: COLORS.text.tertiary },
  charCountRed: { color: COLORS.error },
});

export default SupportChatScreen;
