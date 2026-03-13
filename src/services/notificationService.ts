import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { supabase } from '../lib/supabase';
import { showToast } from '../utils/toast';
import { createLogger } from '../utils/secureLogger';
import { notificationPreferencesService } from './notificationPreferencesService';

const logger = createLogger('NotificationService');

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

/**
 * Notification Service — V2
 *
 * Server-side push handles all scheduled and engagement notifications.
 * This client service handles:
 *   - Push token registration
 *   - Realtime subscription fallbacks (for when app is foregrounded)
 *   - Notification listeners and deep linking
 *   - Badge management
 *
 * See NOTIFICATION_SYSTEM_SPEC.md for the full system design.
 */
export const notificationService = {
    /**
     * Register for push notifications and save token to Supabase.
     * Also syncs notification preferences from server on sign-in.
     */
    registerForPushNotifications: async () => {
        let token: string | undefined;

        if (Platform.OS === 'android') {
            await Notifications.setNotificationChannelAsync('default', {
                name: 'default',
                importance: Notifications.AndroidImportance.MAX,
                vibrationPattern: [0, 250, 250, 250],
                lightColor: '#FF231F7C',
            });
        }

        if (Device.isDevice) {
            const { status: existingStatus } = await Notifications.getPermissionsAsync();
            let finalStatus = existingStatus;

            if (existingStatus !== 'granted') {
                const { status } = await Notifications.requestPermissionsAsync();
                finalStatus = status;
            }

            if (finalStatus !== 'granted') {
                logger.info('Push notification permission not granted');
                return null;
            }

            try {
                token = (await Notifications.getExpoPushTokenAsync()).data;
                logger.info('Push token registered');

                // Save token to user_settings in Supabase
                const { data: userData } = await supabase.auth.getUser();
                if (userData?.user?.id && token) {
                    await supabase
                        .from('user_settings')
                        .upsert({
                            user_id: userData.user.id,
                            push_token: token,
                            push_enabled: true,
                            updated_at: new Date().toISOString(),
                        }, { onConflict: 'user_id' });
                }
            } catch (e: any) {
                logger.error('Error getting push token', e.message);
            }
        } else {
            logger.info('Must use physical device for push notifications');
        }

        return token;
    },

    /**
     * Schedule a local notification (used by realtime fallbacks only).
     */
    scheduleLocalNotification: async (title: string, body: string, data?: Record<string, any>, delaySeconds: number = 1) => {
        try {
            await Notifications.scheduleNotificationAsync({
                content: {
                    title,
                    body,
                    data: data || {},
                    sound: true,
                },
                trigger: {
                    type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
                    seconds: delaySeconds,
                } as Notifications.TimeIntervalTriggerInput,
            });
        } catch (e: any) {
            logger.error('Error scheduling notification', e.message);
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
     * V2: Only ensures push token is fresh and syncs preferences.
     * All scheduled notifications are now server-side.
     */
    scheduleAppOpenChecks: async () => {
        try {
            await Promise.allSettled([
                notificationService.registerForPushNotifications(),
                notificationPreferencesService.syncFromServer(),
                notificationService.cancelLegacyScheduledNotifications(),
            ]);
        } catch (err) {
            logger.error('[NotificationService] Error in app-open checks', err);
        }
    },

    /**
     * Cancel any legacy client-side scheduled notifications.
     * These are now handled server-side. Run once to clean up.
     */
    cancelLegacyScheduledNotifications: async () => {
        try {
            const scheduled = await Notifications.getAllScheduledNotificationsAsync();
            const legacyIds = ['anticipation_655pm', 'morning_recap_8am', 'daily_match_nudge_7pm'];
            for (const notif of scheduled) {
                if (legacyIds.includes(notif.identifier)) {
                    await Notifications.cancelScheduledNotificationAsync(notif.identifier);
                    logger.info(`Cancelled legacy scheduled notification: ${notif.identifier}`);
                }
            }
        } catch (e: any) {
            logger.error('Error cancelling legacy notifications', e.message);
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
                'postgres_changes' as any,
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'matches',
                    filter: `user1_id=eq.${userId}`,
                } as any,
                async (payload: any) => {
                    const partnerId = payload.new.user2_id;
                    const { data: partner } = await supabase
                        .from('user_profiles')
                        .select('first_name')
                        .eq('id', partnerId)
                        .maybeSingle();
                    notificationService.notifyMatchNotice(partner?.first_name || 'Someone');
                }
            )
            .on(
                'postgres_changes' as any,
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'matches',
                    filter: `user2_id=eq.${userId}`,
                } as any,
                async (payload: any) => {
                    const partnerId = payload.new.user1_id;
                    const { data: partner } = await supabase
                        .from('user_profiles')
                        .select('first_name')
                        .eq('id', partnerId)
                        .maybeSingle();
                    notificationService.notifyMatchNotice(partner?.first_name || 'Someone');
                }
            )
            .subscribe();

        // Subscribe to new messages
        const messageChannel = supabase
            .channel('message-notifications')
            .on(
                'postgres_changes' as any,
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'messages',
                    filter: `receiver_id=eq.${userId}`,
                } as any,
                async (payload: any) => {
                    if (payload.new.sender_id === userId) return;

                    const { data: sender } = await supabase
                        .from('user_profiles')
                        .select('first_name')
                        .eq('id', payload.new.sender_id)
                        .maybeSingle();

                    let preview: string;
                    const msgType = payload.new.type;
                    if (msgType === 'audio') {
                        preview = '🎙️ Sent you a voice note';
                    } else if (msgType === 'image') {
                        preview = '🖼️ Sent you a photo';
                    } else {
                        preview = payload.new.content || 'Sent you a message';
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
                'postgres_changes' as any,
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'proposals',
                    filter: `user_a_id=eq.${userId}`,
                } as any,
                async (payload: any) => {
                    if (payload.new.status !== 'deciding') return;
                    if (payload.old?.status === 'deciding') return;

                    const partnerId = payload.new.user_b_id;
                    const { data: partner } = await supabase
                        .from('user_profiles')
                        .select('first_name')
                        .eq('user_id', partnerId)
                        .maybeSingle();

                    notificationService.notifyProposalDeciding(
                        partner?.first_name || 'someone special',
                        payload.new.id
                    );
                }
            )
            .subscribe();

        const proposalChannelB = supabase
            .channel('proposal-deciding-user-b')
            .on(
                'postgres_changes' as any,
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'proposals',
                    filter: `user_b_id=eq.${userId}`,
                } as any,
                async (payload: any) => {
                    if (payload.new.status !== 'deciding') return;
                    if (payload.old?.status === 'deciding') return;

                    const partnerId = payload.new.user_a_id;
                    const { data: partner } = await supabase
                        .from('user_profiles')
                        .select('first_name')
                        .eq('user_id', partnerId)
                        .maybeSingle();

                    notificationService.notifyProposalDeciding(
                        partner?.first_name || 'someone special',
                        payload.new.id
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
        };
    },

    /**
     * Clear all scheduled notifications
     */
    clearAll: async () => {
        await Notifications.cancelAllScheduledNotificationsAsync();
    },

    /**
     * Get badge count
     */
    getBadgeCount: async () => {
        return await Notifications.getBadgeCountAsync();
    },

    /**
     * Set badge count
     */
    setBadgeCount: async (count: number) => {
        await Notifications.setBadgeCountAsync(count);
    },
};
