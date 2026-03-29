import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { AppState, Platform } from 'react-native';
import { supabase } from '../lib/supabase';
import { showToast } from '../utils/toast';
import { createLogger } from '../utils/secureLogger';
import { notificationPreferencesService } from './notificationPreferencesService';

const logger = createLogger('NotificationService');

/** Max entries in the dedup map before forced pruning */
const DEDUP_MAP_CAP = 200;

// Configure how notifications are handled when the app is foregrounded
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
    }),
});

// Valid deep-link screen targets — reject anything not in this list
const VALID_SCREENS = new Set([
    'Community', 'Matches', 'Chat', 'Profile', 'Settings',
    'MatchProposal', 'Notifications',
]);

/** UUID v4 regex (loose: accepts any 36-char hex-dash string) */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Valid notification type identifiers
const VALID_NOTIFICATION_TYPES = new Set([
    'match', 'message', 'proposal_deciding', 'shared_celebration',
]);

/**
 * Validate and sanitize a notification data payload.
 * Strips unknown fields; rejects invalid screen/type values.
 */
function sanitizeNotificationData(
    data: Record<string, unknown> | undefined,
): Record<string, unknown> {
    if (!data || typeof data !== 'object') return {};
    const clean: Record<string, unknown> = {};

    if (typeof data.type === 'string' && VALID_NOTIFICATION_TYPES.has(data.type)) {
        clean.type = data.type;
    }
    if (typeof data.screen === 'string' && VALID_SCREENS.has(data.screen)) {
        clean.screen = data.screen;
    }
    // Allow proposalId / matchId only if they look like UUIDs
    if (typeof data.proposalId === 'string' && UUID_RE.test(data.proposalId)) {
        clean.proposalId = data.proposalId;
    }
    if (typeof data.matchId === 'string' && UUID_RE.test(data.matchId)) {
        clean.matchId = data.matchId;
    }
    return clean;
}

/**
 * Notification Service — V2
 *
 * Server-side push handles all scheduled and engagement notifications.
 * This client service handles:
 *   - Push token registration (with refresh on app update / permission changes)
 *   - Realtime subscription fallbacks (for when app is foregrounded)
 *   - Notification listeners and deep linking
 *   - Badge management
 */
export const notificationService = {
    /** Track last-saved token to avoid redundant writes */
    _lastSavedToken: null as string | null,

    /** Subscription for runtime push-token changes (app update, OS rotation) */
    _tokenSubscription: null as ReturnType<typeof Notifications.addPushTokenListener> | null,

    /**
     * Start listening for push-token changes at runtime.
     * Expo can rotate the token after an app update or OS push-infra change.
     * This ensures we always have the latest token in the DB.
     */
    startTokenRefreshListener: () => {
        // Only one listener at a time
        if (notificationService._tokenSubscription) return;

        notificationService._tokenSubscription = Notifications.addPushTokenListener(
            async (tokenData) => {
                const newToken = tokenData.data;
                if (!newToken || newToken === notificationService._lastSavedToken) return;

                try {
                    const { data: userData } = await supabase.auth.getUser();
                    if (!userData?.user?.id) return;

                    const { error } = await supabase
                        .from('user_settings')
                        .upsert({
                            user_id: userData.user.id,
                            push_token: newToken,
                            push_enabled: true,
                            updated_at: new Date().toISOString(),
                        }, { onConflict: 'user_id' });

                    if (!error) {
                        notificationService._lastSavedToken = newToken;
                        logger.info('Push token refreshed via listener');
                    }
                } catch (e: unknown) {
                    logger.error('Token refresh listener error', e instanceof Error ? e.message : String(e));
                }
            }
        );
    },

    /** Stop the push-token refresh listener */
    stopTokenRefreshListener: () => {
        notificationService._tokenSubscription?.remove();
        notificationService._tokenSubscription = null;
    },

    /**
     * Register for push notifications and save token to Supabase.
     * Handles: first registration, token refresh on app update,
     * and graceful degradation when permission is revoked.
     */
    registerForPushNotifications: async () => {
        if (Platform.OS === 'android') {
            await Notifications.setNotificationChannelAsync('default', {
                name: 'default',
                importance: Notifications.AndroidImportance.MAX,
                vibrationPattern: [0, 250, 250, 250],
                lightColor: '#FF231F7C',
            });
        }

        if (!Device.isDevice) {
            logger.info('Must use physical device for push notifications');
            return null;
        }

        // Check current permission status — don't prompt on every foreground
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;

        if (existingStatus !== 'granted') {
            const { status } = await Notifications.requestPermissionsAsync();
            finalStatus = status;
        }

        if (finalStatus !== 'granted') {
            logger.info('Push notification permission not granted');
            // User revoked permission — mark push disabled in DB so server
            // stops sending pushes (avoids wasted Expo quota + delivery errors)
            try {
                const { data: userData } = await supabase.auth.getUser();
                if (userData?.user?.id) {
                    await supabase
                        .from('user_settings')
                        .upsert({
                            user_id: userData.user.id,
                            push_enabled: false,
                            updated_at: new Date().toISOString(),
                        }, { onConflict: 'user_id' });
                }
            } catch {
                // Best-effort — non-critical
            }
            return null;
        }

        let token: string | undefined;
        try {
            token = (await Notifications.getExpoPushTokenAsync()).data;

            // Only write to DB if the token actually changed (avoids redundant writes)
            if (token && token !== notificationService._lastSavedToken) {
                const { data: userData } = await supabase.auth.getUser();
                if (userData?.user?.id) {
                    const { error } = await supabase
                        .from('user_settings')
                        .upsert({
                            user_id: userData.user.id,
                            push_token: token,
                            push_enabled: true,
                            updated_at: new Date().toISOString(),
                        }, { onConflict: 'user_id' });

                    if (!error) {
                        notificationService._lastSavedToken = token;
                        logger.info('Push token registered');
                    } else {
                        logger.error('Failed to save push token', error.message);
                    }
                }
            }
        } catch (e: unknown) {
            logger.error('Error getting push token', e instanceof Error ? e.message : String(e));
        }

        return token ?? null;
    },

    /** Recent notification keys for deduplication (type+screen+id, TTL ~30s) */
    _recentNotifications: new Map<string, number>(),
    _DEDUP_WINDOW_MS: 30_000,

    /**
     * Schedule a local notification (used by realtime fallbacks only).
     * Deduplicates within a 30-second window to prevent double-fires
     * from overlapping realtime channels.
     */
    scheduleLocalNotification: async (title: string, body: string, data?: Record<string, unknown>, delaySeconds: number = 1) => {
        const sanitized = sanitizeNotificationData(data);

        // Build dedup key from notification identity
        const dedupKey = `${sanitized.type || ''}:${sanitized.screen || ''}:${sanitized.proposalId || ''}:${title}`;
        const now = Date.now();

        // Prune expired entries (keeps map small)
        for (const [key, ts] of notificationService._recentNotifications) {
            if (now - ts > notificationService._DEDUP_WINDOW_MS) {
                notificationService._recentNotifications.delete(key);
            }
        }

        // Hard cap: if map is still too large after TTL prune, clear it
        if (notificationService._recentNotifications.size > DEDUP_MAP_CAP) {
            notificationService._recentNotifications.clear();
        }

        if (notificationService._recentNotifications.has(dedupKey)) {
            logger.info('Skipping duplicate notification', dedupKey);
            return;
        }
        notificationService._recentNotifications.set(dedupKey, now);

        // Don't schedule if app is not active (server push handles background)
        if (AppState.currentState !== 'active') return;

        try {
            await Notifications.scheduleNotificationAsync({
                content: {
                    title,
                    body,
                    data: sanitized,
                    sound: true,
                },
                trigger: {
                    type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
                    seconds: delaySeconds,
                } as Notifications.TimeIntervalTriggerInput,
            });
        } catch (e: unknown) {
            logger.error('Error scheduling notification', e instanceof Error ? e.message : String(e));
            showToast.info(title, body);
        }
    },

    /**
     * Listen for incoming notifications
     */
    addNotificationListener: (callback: (notification: Notifications.Notification) => void) => {
        return Notifications.addNotificationReceivedListener(callback);
    },

    /**
     * Listen for interaction with notifications (taps)
     */
    addNotificationResponseListener: (callback: (response: Notifications.NotificationResponse) => void) => {
        return Notifications.addNotificationResponseReceivedListener(callback);
    },

    // ========================================================================
    // Realtime Fallback Notifications
    // ========================================================================
    // These fire when the app is foregrounded and realtime events arrive.
    // Server-side push is the primary delivery mechanism for backgrounded state.

    /**
     * Notify about a new match (realtime fallback)
     */
    notifyMatchNotice: async (name: string) => {
        const prefs = await notificationPreferencesService.getPreferences();
        if (!prefs.matchesEnabled) return;
        await notificationService.scheduleLocalNotification(
            "It's official",
            `💘 You and ${name} matched. Say hi.`,
            { type: 'match', screen: 'Matches' },
        );
    },

    /**
     * Notify about a new message (realtime fallback)
     */
    notifyNewMessage: async (senderName: string, preview: string) => {
        const prefs = await notificationPreferencesService.getPreferences();
        if (!prefs.messagesEnabled) return;
        await notificationService.scheduleLocalNotification(
            senderName,
            preview.length > 100 ? preview.substring(0, 100) + '...' : preview,
            { type: 'message', screen: 'Chat' },
        );
    },

    /**
     * Notify that a proposal moved to "deciding" (realtime fallback)
     */
    notifyProposalDeciding: async (partnerName: string, proposalId?: string) => {
        const prefs = await notificationPreferencesService.getPreferences();
        if (!prefs.matchesEnabled) return;
        await notificationService.scheduleLocalNotification(
            'Your community has spoken',
            `Your friends approved ${partnerName} for you. Time to decide.`,
            { type: 'proposal_deciding', screen: 'Matches', proposalId },
        );
    },

    /**
     * Notify when friends helped make a match happen (realtime fallback)
     */
    notifySharedCelebration: async (friendNames: string[], personAName: string, personBName: string) => {
        const prefs = await notificationPreferencesService.getPreferences();
        if (!prefs.matchesEnabled) return;

        const friendList = friendNames.length <= 2
            ? friendNames.join(' and ')
            : `${friendNames[0]} and ${friendNames.length - 1} others`;
        await notificationService.scheduleLocalNotification(
            'You called it',
            `You and ${friendList} helped ${personAName} and ${personBName} match. Nice work.`,
            { type: 'shared_celebration', screen: 'Community' },
        );
    },

    // ========================================================================
    // App Lifecycle
    // ========================================================================

    /**
     * Run on sign-in and app foreground.
     * Ensures push token is fresh (handles token rotation on app update),
     * syncs preferences, and resets badge count when user opens the app.
     */
    scheduleAppOpenChecks: async () => {
        try {
            // Ensure push-token rotation listener is active
            notificationService.startTokenRefreshListener();

            await Promise.allSettled([
                notificationService.registerForPushNotifications(),
                notificationPreferencesService.syncFromServer(),
                // Reset badge on app open — user has seen the app
                notificationService.setBadgeCount(0),
            ]);
        } catch (err) {
            logger.error('[NotificationService] Error in app-open checks', err);
        }
    },

    // ========================================================================
    // Real-Time Subscriptions (call on app startup)
    // ========================================================================

    /**
     * Subscribe to real-time notifications for matches, messages, and proposals.
     * These are FALLBACKS for when the app is foregrounded — server-side push
     * is the primary delivery for backgrounded state.
     *
     * Returns cleanup function to unsubscribe.
     */
    subscribeToRealtimeNotifications: async () => {
        const { data: userData } = await supabase.auth.getUser();
        const userId = userData?.user?.id;
        if (!userId) return () => { };

        // Subscribe to new matches
        const matchChannel = supabase
            .channel('match-notifications')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'matches',
                    filter: `user1_id=eq.${userId}`,
                },
                async (payload) => {
                    const partnerId = (payload.new as Record<string, unknown>).user2_id;
                    const { data: partner } = await supabase
                        .from('user_profiles')
                        .select('first_name')
                        .eq('user_id', partnerId)
                        .maybeSingle();
                    notificationService.notifyMatchNotice(partner?.first_name || 'Someone');
                }
            )
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'matches',
                    filter: `user2_id=eq.${userId}`,
                },
                async (payload) => {
                    const partnerId = (payload.new as Record<string, unknown>).user1_id;
                    const { data: partner } = await supabase
                        .from('user_profiles')
                        .select('first_name')
                        .eq('user_id', partnerId)
                        .maybeSingle();
                    notificationService.notifyMatchNotice(partner?.first_name || 'Someone');
                }
            )
            .subscribe();

        // Subscribe to new messages
        const messageChannel = supabase
            .channel('message-notifications')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'messages',
                    filter: `receiver_id=eq.${userId}`,
                },
                async (payload) => {
                    const newRecord = payload.new as Record<string, unknown>;
                    if (newRecord.sender_id === userId) return;

                    const { data: sender } = await supabase
                        .from('user_profiles')
                        .select('first_name')
                        .eq('user_id', newRecord.sender_id as string)
                        .maybeSingle();

                    let preview: string;
                    const msgType = newRecord.type;
                    if (msgType === 'audio') {
                        preview = '🎙️ Sent you a voice note';
                    } else if (msgType === 'image') {
                        preview = '🖼️ Sent you a photo';
                    } else {
                        preview = (newRecord.content as string) || 'Sent you a message';
                    }

                    notificationService.notifyNewMessage(
                        sender?.first_name || 'Someone',
                        preview
                    );
                }
            )
            .subscribe();

        // Subscribe to proposals moving to "deciding" status
        const proposalChannelA = supabase
            .channel('proposal-deciding-user-a')
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'proposals',
                    filter: `user_a_id=eq.${userId}`,
                },
                async (payload) => {
                    const newRecord = payload.new as Record<string, unknown>;
                    const oldRecord = payload.old as Record<string, unknown> | undefined;
                    if (newRecord.status !== 'deciding') return;
                    if (oldRecord?.status === 'deciding') return;

                    const partnerId = newRecord.user_b_id as string;
                    const { data: partner } = await supabase
                        .from('user_profiles')
                        .select('first_name')
                        .eq('user_id', partnerId)
                        .maybeSingle();

                    notificationService.notifyProposalDeciding(
                        partner?.first_name || 'someone special',
                        newRecord.id as string
                    );
                }
            )
            .subscribe();

        const proposalChannelB = supabase
            .channel('proposal-deciding-user-b')
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'proposals',
                    filter: `user_b_id=eq.${userId}`,
                },
                async (payload) => {
                    const newRecord = payload.new as Record<string, unknown>;
                    const oldRecord = payload.old as Record<string, unknown> | undefined;
                    if (newRecord.status !== 'deciding') return;
                    if (oldRecord?.status === 'deciding') return;

                    const partnerId = newRecord.user_a_id as string;
                    const { data: partner } = await supabase
                        .from('user_profiles')
                        .select('first_name')
                        .eq('user_id', partnerId)
                        .maybeSingle();

                    notificationService.notifyProposalDeciding(
                        partner?.first_name || 'someone special',
                        newRecord.id as string
                    );
                }
            )
            .subscribe();

        // Return cleanup function
        return () => {
            supabase.removeChannel(matchChannel);
            supabase.removeChannel(messageChannel);
            supabase.removeChannel(proposalChannelA);
            supabase.removeChannel(proposalChannelB);
            notificationService.stopTokenRefreshListener();
        };
    },

    /**
     * Clear all scheduled notifications
     */
    clearAll: async () => {
        await Notifications.cancelAllScheduledNotificationsAsync();
    },

    /**
     * Get badge count (returns 0 if permission not granted)
     */
    getBadgeCount: async () => {
        try {
            return await Notifications.getBadgeCountAsync();
        } catch {
            return 0;
        }
    },

    /**
     * Set badge count. Silently no-ops if notification permission
     * has been revoked (avoids unhandled errors on iOS).
     */
    setBadgeCount: async (count: number) => {
        try {
            const safeCount = Math.max(0, Math.round(count));
            await Notifications.setBadgeCountAsync(safeCount);
        } catch {
            // Permission revoked or unavailable — ignore
        }
    },
};
