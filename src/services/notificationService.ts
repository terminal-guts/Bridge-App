import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { AppState, Platform } from 'react-native';
import { supabase } from '../lib/supabase';
import { showToast } from '../utils/toast';
import { createLogger } from '../utils/secureLogger';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { notificationPreferencesService } from './notificationPreferencesService';

const logger = createLogger('NotificationService');

// Keys for throttling notifications (don't spam the same nudge)
const STORAGE_KEYS = {
    LAST_INACTIVITY_NUDGE: '@bridge_last_inactivity_nudge',
    LAST_PROFILE_REMINDER: '@bridge_last_profile_reminder',
    LAST_STREAK_RISK_NUDGE: '@bridge_last_streak_risk_nudge',
    LAST_FRIEND_NUDGE_PREFIX: '@bridge_friend_nudge_',
    LAST_ACCURACY_BONUS: '@bridge_last_accuracy_bonus',
    DAILY_NOTIF_COUNT_PREFIX: '@bridge_notif_count_',
};

// Cooldown hours by notification type
const COOLDOWN_HOURS = {
    DEFAULT: 24,             // streak risk, friend nudge
    INACTIVITY: 72,          // Tier 3: re-engagement — max 1 per 3 days
    PROFILE_REMINDER: 72,    // Tier 3: re-engagement
    ACCURACY_BONUS: 6,       // prevent spam if multiple proposals resolve at once
};

// Tier 2 daily cap — max engagement notifications per day
const DAILY_NOTIFICATION_CAP = 3;

// Scheduled notification identifiers
const NOTIF_IDS = {
    ANTICIPATION_655PM: 'anticipation_655pm',
    MORNING_RECAP_8AM: 'morning_recap_8am',
    DAILY_MATCH_NUDGE_7PM: 'daily_match_nudge_7pm',
};

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
 * Get today's date key for daily cap tracking (YYYY-MM-DD).
 */
function todayKey(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * Check if a Tier 2 notification can be sent (daily cap not reached).
 * If allowed, increments the counter. Returns true if the notification should proceed.
 */
async function canSendTier2Notification(): Promise<boolean> {
    try {
        const key = STORAGE_KEYS.DAILY_NOTIF_COUNT_PREFIX + todayKey();
        const raw = await AsyncStorage.getItem(key);
        const count = raw ? parseInt(raw, 10) : 0;
        if (count >= DAILY_NOTIFICATION_CAP) {
            logger.info(`[NotificationService] Daily Tier 2 cap reached (${count}/${DAILY_NOTIFICATION_CAP})`);
            return false;
        }
        await AsyncStorage.setItem(key, (count + 1).toString());
        return true;
    } catch {
        return true; // fail open — better to send than silently drop
    }
}

/**
 * Notification Service
 * Handles push notification registration, local scheduling, and
 * real-time subscription-based notifications for proposals/matches/messages.
 *
 * Notification Tiers (see NOTIFICATION_STRATEGY.md):
 * - Tier 1 (Transactional): match, message, proposal deciding — no cap, always send
 * - Tier 2 (Engagement): streak risk, anticipation, recap, accuracy, celebration, nudge — 3/day cap
 * - Tier 3 (Re-engagement): inactivity, profile, streak death — 72h cooldown, separate budget
 * - Tier 4 (Weekly): summary — 1/week
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
        const prefs = await notificationPreferencesService.getPreferences();
        if (!prefs.matchesEnabled) return;
        await notificationService.scheduleLocalNotification(
            'New Proposals Ready',
            'Your friends need your vote! Help them find their match.',
            { type: 'new_proposals', screen: 'Community' },
        );
    },

    /**
     * Notify about a new match
     */
    notifyMatchNotice: async (name: string) => {
        const prefs = await notificationPreferencesService.getPreferences();
        if (!prefs.matchesEnabled) return;
        await notificationService.scheduleLocalNotification(
            "It's a Match!",
            `💘 You and ${name} matched! Say hi.`,
            { type: 'match', screen: 'Matches' },
        );
    },

    /**
     * Notify about a new message
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
     * Notify that a specific proposal has moved to "deciding" —
     * the community approved it and now the user gets to choose.
     */
    notifyProposalDeciding: async (partnerName: string, proposalId?: string) => {
        const prefs = await notificationPreferencesService.getPreferences();
        if (!prefs.matchesEnabled) return;
        await notificationService.scheduleLocalNotification(
            'Your Community Has Spoken!',
            `Your friends approved ${partnerName} for you. Ready to decide?`,
            { type: 'proposal_deciding', screen: 'Matches', proposalId },
        );
    },

    /**
     * Notify about days of inactivity
     */
    notifyInactivity: async (days: number) => {
        const prefs = await notificationPreferencesService.getPreferences();
        if (!prefs.nudgesEnabled) return;
        await notificationService.scheduleLocalNotification(
            'Your Friends Miss You!',
            `It's been ${days} days. Your friends are voting!`,
            { type: 'inactivity', screen: 'Community' },
        );
    },

    /**
     * Notify about incomplete profile
     */
    notifyProfileIncomplete: async (missingItems: string[]) => {
        const prefs = await notificationPreferencesService.getPreferences();
        if (!prefs.nudgesEnabled) return;
        const itemText = missingItems.length === 1
            ? missingItems[0]
            : missingItems.slice(0, 2).join(' and ');

        await notificationService.scheduleLocalNotification(
            'Finish Your Profile',
            `Add your ${itemText} to get better matches!`,
            { type: 'profile_incomplete', screen: 'Profile' },
        );
    },

    // ========================================================================
    // Engagement Notifications (Hook Model triggers)
    // ========================================================================

    /**
     * Notify when a friend's streak is at risk (they have an active proposal
     * the user hasn't voted on and it's getting late).
     */
    notifyStreakAtRisk: async (friendName: string, streakDays: number) => {
        const prefs = await notificationPreferencesService.getPreferences();
        if (!prefs.nudgesEnabled) return;

        // 24h cooldown on streak risk nudges
        const lastNudge = await AsyncStorage.getItem(STORAGE_KEYS.LAST_STREAK_RISK_NUDGE);
        if (lastNudge) {
            const hoursSince = (Date.now() - parseInt(lastNudge, 10)) / (1000 * 60 * 60);
            if (hoursSince < COOLDOWN_HOURS.DEFAULT) return;
        }

        // Tier 2 daily cap
        if (!(await canSendTier2Notification())) return;

        await notificationService.scheduleLocalNotification(
            'Streak at risk!',
            `Your ${streakDays}-day streak with ${friendName} is at risk!`,
            { type: 'streak_risk', screen: 'Community' },
        );
        await AsyncStorage.setItem(STORAGE_KEYS.LAST_STREAK_RISK_NUDGE, Date.now().toString());
    },

    /**
     * Notify when the user earns bonus karma from an accurate vote.
     * These arrive unpredictably — variable ratio reinforcement (slot machine effect).
     */
    notifyAccuracyBonus: async (points: number) => {
        const prefs = await notificationPreferencesService.getPreferences();
        if (!prefs.matchesEnabled) return;

        // 6h cooldown — prevents spam when multiple proposals resolve at once
        const lastBonus = await AsyncStorage.getItem(STORAGE_KEYS.LAST_ACCURACY_BONUS);
        if (lastBonus) {
            const hoursSince = (Date.now() - parseInt(lastBonus, 10)) / (1000 * 60 * 60);
            if (hoursSince < COOLDOWN_HOURS.ACCURACY_BONUS) return;
        }

        // Tier 2 daily cap
        if (!(await canSendTier2Notification())) return;

        await notificationService.scheduleLocalNotification(
            'Nice call!',
            `⭐ You earned +${points} bonus karma for an accurate vote.`,
            { type: 'accuracy_bonus', screen: 'Community' },
        );
        await AsyncStorage.setItem(STORAGE_KEYS.LAST_ACCURACY_BONUS, Date.now().toString());
    },

    /**
     * Notify when a friend nudges the user to vote.
     */
    notifyFriendNudge: async (nudgerName: string) => {
        const prefs = await notificationPreferencesService.getPreferences();
        if (!prefs.nudgesEnabled) return;

        // Tier 2 daily cap
        if (!(await canSendTier2Notification())) return;

        await notificationService.scheduleLocalNotification(
            'You got nudged!',
            `${nudgerName} nudged you to vote!`,
            { type: 'friend_nudge', screen: 'Community' },
        );
    },

    /**
     * Notify when friends all helped make a match happen.
     */
    notifySharedCelebration: async (friendNames: string[], personAName: string, personBName: string) => {
        const prefs = await notificationPreferencesService.getPreferences();
        if (!prefs.matchesEnabled) return;

        // Tier 2 daily cap
        if (!(await canSendTier2Notification())) return;

        const friendList = friendNames.length <= 2
            ? friendNames.join(' and ')
            : `${friendNames[0]} and ${friendNames.length - 1} others`;
        await notificationService.scheduleLocalNotification(
            'You all called it!',
            `You and ${friendList} helped ${personAName} and ${personBName} match!`,
            { type: 'shared_celebration', screen: 'Community' },
        );
    },

    /**
     * Notify when a streak ends (friend had a proposal but user didn't vote).
     */
    notifyStreakDeath: async (friendName: string, previousDays: number) => {
        const prefs = await notificationPreferencesService.getPreferences();
        if (!prefs.nudgesEnabled) return;
        await notificationService.scheduleLocalNotification(
            'Streak ended',
            `Your ${previousDays}-day streak with ${friendName} ended.`,
            { type: 'streak_death', screen: 'Community' },
        );
    },

    // ========================================================================
    // Scheduled Checks (run on app foreground)
    // ========================================================================

    /**
     * Setup engagement cadence — replaces the old single 7PM nudge with:
     * - 6:55 PM anticipation notification (5 min before proposals drop)
     * - 8:00 AM morning recap
     * Also cancels the legacy daily_match_nudge_7pm.
     */
    setupEngagementCadence: async () => {
        try {
            const prefs = await notificationPreferencesService.getPreferences();

            // Cancel legacy and existing scheduled notifications
            const scheduled = await Notifications.getAllScheduledNotificationsAsync();
            const idsToCancel = [NOTIF_IDS.DAILY_MATCH_NUDGE_7PM, NOTIF_IDS.ANTICIPATION_655PM, NOTIF_IDS.MORNING_RECAP_8AM];
            for (const notif of scheduled) {
                if (idsToCancel.includes(notif.identifier)) {
                    await Notifications.cancelScheduledNotificationAsync(notif.identifier);
                }
            }

            // Schedule 6:55 PM anticipation — "New proposals drop in 5 minutes"
            if (prefs.matchesEnabled) {
                await Notifications.scheduleNotificationAsync({
                    identifier: NOTIF_IDS.ANTICIPATION_655PM,
                    content: {
                        title: 'Almost time!',
                        body: 'New proposals drop in 5 minutes — get ready to help your friends.',
                        data: { screen: 'Community' },
                    },
                    trigger: {
                        type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
                        hour: 18,
                        minute: 55,
                        repeats: true,
                    } as Notifications.CalendarTriggerInput,
                });
                logger.info('Scheduled 6:55 PM anticipation notification');
            }

            // Schedule 8:00 AM morning recap — "Last night's votes are in"
            if (prefs.nudgesEnabled) {
                await Notifications.scheduleNotificationAsync({
                    identifier: NOTIF_IDS.MORNING_RECAP_8AM,
                    content: {
                        title: 'Good morning!',
                        body: "Last night's votes are in — see what happened.",
                        data: { screen: 'Community' },
                    },
                    trigger: {
                        type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
                        hour: 8,
                        minute: 0,
                        repeats: true,
                    } as Notifications.CalendarTriggerInput,
                });
                logger.info('Scheduled 8:00 AM morning recap notification');
            }
        } catch (e: any) {
            logger.error('Failed to schedule engagement cadence', e.message);
        }
    },

    /**
     * Master entry point — run all "app open" notification checks.
     * Called once when the user signs in or the app comes to foreground.
     */
    scheduleAppOpenChecks: async () => {
        try {
            await Promise.allSettled([
                notificationService.checkAndScheduleInactivityNudge(),
                notificationService.checkAndScheduleProfileReminder(),
                notificationService.setupEngagementCadence(),
                notificationService.checkAndScheduleStreakRiskNudge(),
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
            // Throttle: 72h cooldown (Tier 3 re-engagement)
            const lastNudge = await AsyncStorage.getItem(STORAGE_KEYS.LAST_INACTIVITY_NUDGE);
            if (lastNudge) {
                const hoursSince = (Date.now() - parseInt(lastNudge, 10)) / (1000 * 60 * 60);
                if (hoursSince < COOLDOWN_HOURS.INACTIVITY) return;
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
            // Throttle: 72h cooldown (Tier 3 re-engagement)
            const lastReminder = await AsyncStorage.getItem(STORAGE_KEYS.LAST_PROFILE_REMINDER);
            if (lastReminder) {
                const hoursSince = (Date.now() - parseInt(lastReminder, 10)) / (1000 * 60 * 60);
                if (hoursSince < COOLDOWN_HOURS.PROFILE_REMINDER) return;
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

    /**
     * Check if the user has friends with active proposals they haven't voted on
     * and it's after 9 PM — schedule a streak risk notification.
     */
    checkAndScheduleStreakRiskNudge: async () => {
        try {
            const now = new Date();
            const currentHour = now.getHours();
            // Only fire after 9 PM local time
            if (currentHour < 21) return;

            // Throttle: 24h cooldown
            const lastNudge = await AsyncStorage.getItem(STORAGE_KEYS.LAST_STREAK_RISK_NUDGE);
            if (lastNudge) {
                const hoursSince = (Date.now() - parseInt(lastNudge, 10)) / (1000 * 60 * 60);
                if (hoursSince < COOLDOWN_HOURS.DEFAULT) return;
            }

            const { data: userData } = await supabase.auth.getUser();
            const userId = userData?.user?.id;
            if (!userId) return;

            // Find friends with active proposals the user hasn't voted on
            const { data: friends } = await supabase
                .from('friends')
                .select('friend_id, streak_days')
                .eq('user_id', userId)
                .gt('streak_days', 0);

            if (!friends || friends.length === 0) return;

            // Check each friend for an active proposal the user hasn't voted on
            for (const friend of friends) {
                const { data: proposal } = await supabase
                    .from('proposals')
                    .select('id')
                    .eq('user_a_id', friend.friend_id)
                    .eq('status', 'active')
                    .limit(1)
                    .maybeSingle();

                if (!proposal) continue;

                // Check if user has already voted
                const { data: vote } = await supabase
                    .from('proposal_votes')
                    .select('id')
                    .eq('proposal_id', proposal.id)
                    .eq('voter_id', userId)
                    .limit(1)
                    .maybeSingle();

                if (!vote) {
                    // User hasn't voted — streak at risk!
                    const { data: friendProfile } = await supabase
                        .from('user_profiles')
                        .select('first_name')
                        .eq('user_id', friend.friend_id)
                        .maybeSingle();

                    await notificationService.notifyStreakAtRisk(
                        friendProfile?.first_name || 'A friend',
                        friend.streak_days
                    );
                    return; // Only send one streak risk nudge per check
                }
            }
        } catch (err) {
            logger.error('[NotificationService] Streak risk check failed', err);
        }
    },

    // ========================================================================
    // Real-Time Subscriptions (call on app startup)
    // ========================================================================

    /**
     * Subscribe to real-time notifications for matches, messages, and karma changes.
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

                    // Shared celebration — notify friends who helped
                    try {
                        const proposalId = payload.new.proposal_id;
                        if (proposalId) {
                            const { data: voters } = await supabase
                                .from('proposal_votes')
                                .select('voter_id')
                                .eq('proposal_id', proposalId)
                                .neq('voter_id', userId);

                            if (voters && voters.length > 0) {
                                const voterIds = voters.map((v: any) => v.voter_id);
                                const { data: friendProfiles } = await supabase
                                    .from('user_profiles')
                                    .select('first_name')
                                    .in('user_id', voterIds);

                                const friendNames = friendProfiles?.map((p: any) => p.first_name).filter(Boolean) || [];
                                if (friendNames.length > 0) {
                                    const user1Id = payload.new.user1_id;
                                    const user2Id = payload.new.user2_id;
                                    const { data: matchProfiles } = await supabase
                                        .from('user_profiles')
                                        .select('user_id, first_name')
                                        .in('user_id', [user1Id, user2Id]);

                                    const personA = matchProfiles?.find((p: any) => p.user_id === user1Id)?.first_name || 'Someone';
                                    const personB = matchProfiles?.find((p: any) => p.user_id === user2Id)?.first_name || 'Someone';

                                    await notificationService.notifySharedCelebration(friendNames, personA, personB);
                                }
                            }
                        }
                    } catch {
                        // Non-critical — don't block match notification
                    }
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

                    // Shared celebration — notify friends who helped
                    try {
                        const proposalId = payload.new.proposal_id;
                        if (proposalId) {
                            const { data: voters } = await supabase
                                .from('proposal_votes')
                                .select('voter_id')
                                .eq('proposal_id', proposalId)
                                .neq('voter_id', userId);

                            if (voters && voters.length > 0) {
                                const voterIds = voters.map((v: any) => v.voter_id);
                                const { data: friendProfiles } = await supabase
                                    .from('user_profiles')
                                    .select('first_name')
                                    .in('user_id', voterIds);

                                const friendNames = friendProfiles?.map((p: any) => p.first_name).filter(Boolean) || [];
                                if (friendNames.length > 0) {
                                    const user1Id = payload.new.user1_id;
                                    const user2Id = payload.new.user2_id;
                                    const { data: matchProfiles } = await supabase
                                        .from('user_profiles')
                                        .select('user_id, first_name')
                                        .in('user_id', [user1Id, user2Id]);

                                    const personA = matchProfiles?.find((p: any) => p.user_id === user1Id)?.first_name || 'Someone';
                                    const personB = matchProfiles?.find((p: any) => p.user_id === user2Id)?.first_name || 'Someone';

                                    await notificationService.notifySharedCelebration(friendNames, personA, personB);
                                }
                            }
                        }
                    } catch {
                        // Non-critical — don't block match notification
                    }
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

        // Subscribe to karma score changes — delayed accuracy bonus (variable reward)
        // When karma_points increases by >1, it's an accuracy bonus from the backend
        const karmaChannel = supabase
            .channel('karma-accuracy-bonus')
            .on(
                'postgres_changes' as any,
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'karma_scores',
                    filter: `user_id=eq.${userId}`,
                } as any,
                async (payload: any) => {
                    const oldPoints = payload.old?.karma_points ?? 0;
                    const newPoints = payload.new?.karma_points ?? 0;
                    const delta = newPoints - oldPoints;
                    // Only fire for accuracy bonuses (>1 point, since +1 is a normal vote)
                    if (delta > 1) {
                        notificationService.notifyAccuracyBonus(delta);
                    }
                }
            )
            .subscribe();

        // Return cleanup function
        return () => {
            supabase.removeChannel(matchChannel);
            supabase.removeChannel(messageChannel);
            supabase.removeChannel(proposalChannelA);
            supabase.removeChannel(proposalChannelB);
            supabase.removeChannel(karmaChannel);
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
