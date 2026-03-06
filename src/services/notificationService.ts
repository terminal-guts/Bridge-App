import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { supabase } from '../lib/supabase';
import { showToast } from '../utils/toast';
import { createLogger } from '../utils/secureLogger';

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
 * Notification Service
 * Handles push notification registration, local scheduling, and
 * real-time subscription-based notifications for proposals/matches/messages.
 */
export const notificationService = {
    /**
     * Register for push notifications and save token to Supabase
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
     * Schedule a local notification
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
            // Fallback to toast
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
    // Contextual Notifications
    // ========================================================================

    /**
     * Notify about a new proposal ready for voting
     */
    notifyNewProposal: async () => {
        await notificationService.scheduleLocalNotification(
            'New Proposals Ready',
            'You have new proposals to vote on. Help your community find matches!',
            { type: 'new_proposals', screen: 'Community' },
        );
    },

    /**
     * Notify about a new match
     */
    notifyMatchNotice: async (name: string) => {
        await notificationService.scheduleLocalNotification(
            "It's a Match!",
            `You and ${name} have matched! Start the conversation now.`,
            { type: 'match', screen: 'Chat' },
        );
    },

    /**
     * Notify about a new message
     */
    notifyNewMessage: async (senderName: string, preview: string) => {
        await notificationService.scheduleLocalNotification(
            senderName,
            preview.length > 100 ? preview.substring(0, 100) + '...' : preview,
            { type: 'message', screen: 'Chat' },
        );
    },

    /**
     * Notify about a pending proposal decision
     */
    notifyPendingDecision: async () => {
        await notificationService.scheduleLocalNotification(
            'Community Approved a Match!',
            'A proposal has been approved by the community. Accept or decline now!',
            { type: 'pending_decision', screen: 'Community' },
        );
    },

    /**
     * Notify about days of inactivity
     */
    notifyInactivity: async (days: number) => {
        await notificationService.scheduleLocalNotification(
            "We Miss You!",
            `It's been ${days} days since your last visit. Come back and see what's new!`,
            { type: 'inactivity' },
        );
    },

    /**
     * Notify about a potential ghosting situation
     */
    notifyGhosting: async (name: string) => {
        await notificationService.scheduleLocalNotification(
            "Don't let it go cold!",
            `${name} is still waiting for your reply. Keep the conversation going!`,
            { type: 'ghosting', screen: 'Chat' },
        );
    },

    // ========================================================================
    // Real-Time Subscriptions (call on app startup)
    // ========================================================================

    /**
     * Subscribe to real-time notifications for matches and messages.
     * Returns cleanup function to unsubscribe.
     */
    subscribeToRealtimeNotifications: async () => {
        const { data: userData } = await supabase.auth.getUser();
        const userId = userData?.user?.id;
        if (!userId) return () => {};

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

        // Subscribe to new messages (only when app is backgrounded/inactive)
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

                    const { data: sender } = await supabase
                        .from('user_profiles')
                        .select('first_name')
                        .eq('id', payload.new.sender_id)
                        .maybeSingle();

                    notificationService.notifyNewMessage(
                        sender?.first_name || 'Someone',
                        payload.new.content || 'Sent you a message'
                    );
                }
            )
            .subscribe();

        // Return cleanup function
        return () => {
            supabase.removeChannel(matchChannel);
            supabase.removeChannel(messageChannel);
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
