import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { AppState, Platform } from 'react-native';
import { supabase } from '../lib/supabase';
import { showToast } from '../utils/toast';
import { createLogger } from '../utils/secureLogger';
import AsyncStorage from '@react-native-async-storage/async-storage';

const logger = createLogger('NotificationService');

// Keys for throttling notifications (don't spam the same nudge)
const STORAGE_KEYS = {
    LAST_INACTIVITY_NUDGE: '@bridge_last_inactivity_nudge',
    LAST_PROFILE_REMINDER: '@bridge_last_profile_reminder',
};

// Minimum hours between repeated nudges of the same type
const NUDGE_COOLDOWN_HOURS = 24;

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
     * Notify about a pending proposal decision (generic)
     */
    notifyPendingDecision: async () => {
        await notificationService.scheduleLocalNotification(
            'Community Approved a Match!',
            'A proposal has been approved by the community. Accept or decline now!',
            { type: 'pending_decision', screen: 'Matches' },
        );
    },

    /**
     * Notify that a specific proposal has moved to "deciding" —
     * the community approved it and now the user gets to choose.
     */
    notifyProposalDeciding: async (partnerName: string, proposalId?: string) => {
        await notificationService.scheduleLocalNotification(
            'Your Community Has Spoken! 🎉',
            `Time to decide — do you want to connect with ${partnerName}?`,
            { type: 'proposal_deciding', screen: 'Matches', proposalId },
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

    /**
     * Notify about incomplete profile
     */
    notifyProfileIncomplete: async (missingItems: string[]) => {
        const itemText = missingItems.length === 1
            ? missingItems[0]
            : missingItems.slice(0, 2).join(' and ');

        await notificationService.scheduleLocalNotification(
            'Complete Your Profile ✨',
            `Add your ${itemText} to get better matches and more visibility!`,
            { type: 'profile_incomplete', screen: 'Profile' },
        );
    },

    // ========================================================================
    // Scheduled Checks (run on app foreground)
    // ========================================================================

    /**
     * Master entry point — run all "app open" notification checks.
     * Called once when the user signs in or the app comes to foreground.
     */
    scheduleAppOpenChecks: async () => {
        try {
            await Promise.allSettled([
                notificationService.checkAndScheduleInactivityNudge(),
                notificationService.checkAndScheduleProfileReminder(),
            ]);
        } catch (err) {
            logger.error('[NotificationService] Error in app-open checks', err);
        }
    },

    /**
     * Check days since last activity and schedule an inactivity nudge.
     * Uses user_profiles.updated_at as a proxy for last activity.
     */
    checkAndScheduleInactivityNudge: async () => {
        try {
            // Throttle: don't send more than once per NUDGE_COOLDOWN_HOURS
            const lastNudge = await AsyncStorage.getItem(STORAGE_KEYS.LAST_INACTIVITY_NUDGE);
            if (lastNudge) {
                const hoursSince = (Date.now() - parseInt(lastNudge, 10)) / (1000 * 60 * 60);
                if (hoursSince < NUDGE_COOLDOWN_HOURS) return;
            }

            const { data: userData } = await supabase.auth.getUser();
            const userId = userData?.user?.id;
            if (!userId) return;

            // Try app_sessions table first, fall back to user_profiles.updated_at
            let lastActiveDate: string | null = null;

            const { data: session } = await supabase
                .from('app_sessions')
                .select('ended_at')
                .eq('user_id', userId)
                .order('ended_at', { ascending: false })
                .limit(1)
                .maybeSingle();

            if (session?.ended_at) {
                lastActiveDate = session.ended_at;
            } else {
                // Fallback: use profile updated_at
                const { data: profile } = await supabase
                    .from('user_profiles')
                    .select('updated_at')
                    .eq('user_id', userId)
                    .maybeSingle();
                lastActiveDate = profile?.updated_at || null;
            }

            if (!lastActiveDate) return;

            const daysSinceActive = Math.floor(
                (Date.now() - new Date(lastActiveDate).getTime()) / (1000 * 60 * 60 * 24)
            );

            // Send nudge after 2+ days of inactivity
            if (daysSinceActive >= 2) {
                await notificationService.notifyInactivity(daysSinceActive);
                await AsyncStorage.setItem(
                    STORAGE_KEYS.LAST_INACTIVITY_NUDGE,
                    Date.now().toString()
                );
                logger.info(`[NotificationService] Inactivity nudge sent (${daysSinceActive} days)`);
            }
        } catch (err) {
            logger.error('[NotificationService] Inactivity check failed', err);
        }
    },

    /**
     * Check if the user's profile is missing key fields and nudge them.
     */
    checkAndScheduleProfileReminder: async () => {
        try {
            // Throttle
            const lastReminder = await AsyncStorage.getItem(STORAGE_KEYS.LAST_PROFILE_REMINDER);
            if (lastReminder) {
                const hoursSince = (Date.now() - parseInt(lastReminder, 10)) / (1000 * 60 * 60);
                if (hoursSince < NUDGE_COOLDOWN_HOURS) return;
            }

            const { data: userData } = await supabase.auth.getUser();
            const userId = userData?.user?.id;
            if (!userId) return;

            const { data: profile } = await supabase
                .from('user_profiles')
                .select('bio, photos, interests, values, deep_question_answers, profile_completed')
                .eq('user_id', userId)
                .maybeSingle();

            if (!profile) return;

            // If profile is already marked complete by the backend, skip
            if (profile.profile_completed) return;

            // Determine what's missing
            const missing: string[] = [];

            const photos = profile.photos;
            const photoCount = Array.isArray(photos) ? photos.length : 0;
            if (photoCount < 2) missing.push('photos');

            if (!profile.bio || profile.bio.trim().length < 10) missing.push('bio');

            const interests = profile.interests;
            if (!Array.isArray(interests) || interests.length < 3) missing.push('interests');

            const values = profile.values;
            if (!Array.isArray(values) || values.length < 2) missing.push('values');

            const dqa = profile.deep_question_answers;
            if (!Array.isArray(dqa) || dqa.length < 1) missing.push('deep questions');

            if (missing.length > 0) {
                await notificationService.notifyProfileIncomplete(missing);
                await AsyncStorage.setItem(
                    STORAGE_KEYS.LAST_PROFILE_REMINDER,
                    Date.now().toString()
                );
                logger.info(`[NotificationService] Profile reminder sent. Missing: ${missing.join(', ')}`);
            }
        } catch (err) {
            logger.error('[NotificationService] Profile reminder check failed', err);
        }
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
                    // Only notify if the message is TO us, not FROM us
                    if (payload.new.sender_id === userId) return;

                    const { data: sender } = await supabase
                        .from('user_profiles')
                        .select('first_name')
                        .eq('id', payload.new.sender_id)
                        .maybeSingle();

                    // Determine preview text based on message type
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
        // Fires when a proposal the user is part of gets community approval
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
                    // Only notify when status just changed to 'deciding'
                    if (payload.new.status !== 'deciding') return;
                    if (payload.old?.status === 'deciding') return; // already deciding

                    const partnerId = payload.new.user_b_id;
                    const { data: partner } = await supabase
                        .from('user_profiles')
                        .select('first_name')
                        .eq('user_id', partnerId)
                        .maybeSingle();

                    logger.info('[NotificationService] Proposal moved to deciding (user_a):', payload.new.id);
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
                    // Only notify when status just changed to 'deciding'
                    if (payload.new.status !== 'deciding') return;
                    if (payload.old?.status === 'deciding') return;

                    const partnerId = payload.new.user_a_id;
                    const { data: partner } = await supabase
                        .from('user_profiles')
                        .select('first_name')
                        .eq('user_id', partnerId)
                        .maybeSingle();

                    logger.info('[NotificationService] Proposal moved to deciding (user_b):', payload.new.id);
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
