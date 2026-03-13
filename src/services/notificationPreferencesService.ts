import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';

export interface NotificationPreferences {
    matchesEnabled: boolean;
    messagesEnabled: boolean;
    showNameIfWinner: boolean;
    leaderboardVisible: boolean;
}

const PREFS_KEY = '@bridge_notification_prefs';

const defaultPreferences: NotificationPreferences = {
    matchesEnabled: true,
    messagesEnabled: true,
    showNameIfWinner: true,
    leaderboardVisible: false,
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
            // Write to local storage
            await AsyncStorage.setItem(PREFS_KEY, JSON.stringify(next));
            // Sync to server so edge functions respect preferences
            this.syncToServer(next);
            return next;
        } catch (e) {
            return defaultPreferences;
        }
    },

    /**
     * Sync preferences to user_settings table so server-side push
     * functions can check them. Fire-and-forget — don't block the UI.
     */
    async syncToServer(prefs: NotificationPreferences): Promise<void> {
        try {
            const { data: userData } = await supabase.auth.getUser();
            if (!userData?.user?.id) return;

            await supabase
                .from('user_settings')
                .upsert({
                    user_id: userData.user.id,
                    pref_matches_enabled: prefs.matchesEnabled,
                    pref_messages_enabled: prefs.messagesEnabled,
                    pref_show_name_if_winner: prefs.showNameIfWinner,
                    pref_leaderboard_visible: prefs.leaderboardVisible,
                    updated_at: new Date().toISOString(),
                }, { onConflict: 'user_id' });
        } catch {
            // Non-critical — server will use defaults (all true)
        }
    },

    /**
     * Pull preferences from server and update local storage.
     * Called on sign-in to ensure client and server are in sync.
     */
    async syncFromServer(): Promise<NotificationPreferences> {
        try {
            const { data: userData } = await supabase.auth.getUser();
            if (!userData?.user?.id) return defaultPreferences;

            const { data: settings } = await supabase
                .from('user_settings')
                .select('pref_matches_enabled, pref_messages_enabled, pref_show_name_if_winner, pref_leaderboard_visible')
                .eq('user_id', userData.user.id)
                .maybeSingle();

            if (!settings) return defaultPreferences;

            const prefs: NotificationPreferences = {
                matchesEnabled: settings.pref_matches_enabled ?? true,
                messagesEnabled: settings.pref_messages_enabled ?? true,
                showNameIfWinner: settings.pref_show_name_if_winner ?? true,
                leaderboardVisible: settings.pref_leaderboard_visible ?? false,
            };

            await AsyncStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
            return prefs;
        } catch {
            return defaultPreferences;
        }
    },
};
