import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { showToast } from '../utils/toast';

// Configure how notifications are handled when the app is foregrounded
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
    }),
});

/**
 * Notification Service
 * Handles real push notifications, tokens, and simulated mock notifications.
 */
export const notificationService = {
    /**
     * Register for push notifications and get the token
     */
    registerForPushNotifications: async () => {
        let token;

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
                console.log('[NOTIFICATION] Failed to get push token for push notification!');
                return null;
            }

            // Learn more about projectId here: https://docs.expo.dev/push-notifications/push-notifications-setup/#configure-projectid
            // For development, this might need to be set in app.json
            try {
                token = (await Notifications.getExpoPushTokenAsync()).data;
                console.log('[NOTIFICATION] Expo Push Token:', token);
            } catch (e) {
                console.error('[NOTIFICATION] Error getting push token:', e);
            }
        } else {
            console.log('[NOTIFICATION] Must use physical device for Push Notifications');
        }

        return token;
    },

    /**
     * Send a test notification.
     * Schedules a local notification to appear in 2 seconds.
     */
    sendTestNotification: async (title: string, body: string) => {
        console.log(`[NOTIFICATION] Sending test: ${title} - ${body}`);

        if (!Device.isDevice && Platform.OS !== 'web') {
            // Fallback for simulators
            showToast.info(title, body);
            return { ok: true, method: 'toast' };
        }

        try {
            await Notifications.scheduleNotificationAsync({
                content: {
                    title,
                    body,
                    data: { type: 'test' },
                    sound: true,
                },
                trigger: {
                    type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
                    seconds: 2,
                } as Notifications.TimeIntervalTriggerInput,
            });
            return { ok: true, method: 'local_notification' };
        } catch (e) {
            console.error('[NOTIFICATION] Error scheduling notification:', e);
            showToast.info(title, body);
            return { ok: false, error: e };
        }
    },

    /**
     * Listen for incoming notifications
     */
    addNotificationListener: (callback: (notification: Notifications.Notification) => void) => {
        return Notifications.addNotificationReceivedListener(callback);
    },

    /**
     * Listen for interaction with notifications
     */
    addNotificationResponseListener: (callback: (response: Notifications.NotificationResponse) => void) => {
        return Notifications.addNotificationResponseReceivedListener(callback);
    },

    /**
     * Notify about days of inactivity
     */
    notifyInactivity: async (days: number) => {
        const title = "We Miss You! 👋";
        const body = `It's been ${days} days since your last visit. Come back and see what's new!`;
        return notificationService.sendTestNotification(title, body);
    },

    /**
     * Notify about a potential ghosting situation
     */
    notifyGhosting: async (name: string) => {
        const title = "Don't let it go cold! 🔥";
        const body = `${name} is still waiting for your reply. Keep the conversation going!`;
        return notificationService.sendTestNotification(title, body);
    },

    /**
     * Notify about an invitation for a date
     */
    notifyDateInvitation: async (name: string) => {
        const title = "A special invitation! ✨";
        const body = `${name} just asked you out for a date! Open Bridge to respond.`;
        return notificationService.sendTestNotification(title, body);
    },

    /**
     * Notify about a new match
     */
    notifyMatchNotice: async (name: string) => {
        const title = "It's a Match! 💖";
        const body = `You and ${name} have matched! Start the conversation now.`;
        return notificationService.sendTestNotification(title, body);
    }
};
