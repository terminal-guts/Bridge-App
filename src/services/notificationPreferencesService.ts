import AsyncStorage from '@react-native-async-storage/async-storage';

export interface NotificationPreferences {
    matchesEnabled: boolean;
    messagesEnabled: boolean;
    nudgesEnabled: boolean;
}

const PREFS_KEY = '@bridge_notification_prefs';

const defaultPreferences: NotificationPreferences = {
    matchesEnabled: true,
    messagesEnabled: true,
    nudgesEnabled: true,
};

export const notificationPreferencesService = {
    async getPreferences(): Promise<NotificationPreferences> {
        try {
            const data = await AsyncStorage.getItem(PREFS_KEY);
            if (!data) return defaultPreferences;
            return { ...defaultPreferences, ...JSON.parse(data) };
        } catch (e) {
            return defaultPreferences;
        }
    },

    async updatePreferences(updates: Partial<NotificationPreferences>): Promise<NotificationPreferences> {
        try {
            const current = await this.getPreferences();
            const next = { ...current, ...updates };
            await AsyncStorage.setItem(PREFS_KEY, JSON.stringify(next));
            return next;
        } catch (e) {
            return defaultPreferences;
        }
    }
};
