/**
 * Streak Tracking Service
 *
 * Persists friend streak values to AsyncStorage so we can detect:
 * - Streak deaths (was > 0, now == 0) → fire error toast + notification
 * - Streak milestones (crossed 7/14/30 threshold) → fire celebration toast + haptic
 *
 * Called on each FriendsArea data load to compare previous vs current values.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createLogger } from '../utils/secureLogger';

const logger = createLogger('StreakTracking');

const STORAGE_KEY = '@bridge_friend_streaks';

interface StreakSnapshot {
    [friendId: string]: number; // friendId → streakDays
}

/**
 * Load the previously saved streak snapshot.
 */
export async function getPreviousStreaks(): Promise<StreakSnapshot> {
    try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (!raw) return {};
        return JSON.parse(raw) as StreakSnapshot;
    } catch {
        return {};
    }
}

/**
 * Save the current streak snapshot for next comparison.
 */
export async function saveCurrentStreaks(friends: { friendId: string; streakDays: number }[]): Promise<void> {
    try {
        const snapshot: StreakSnapshot = {};
        for (const f of friends) {
            snapshot[f.friendId] = f.streakDays;
        }
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
    } catch (err) {
        logger.error('Failed to save streak snapshot', err);
    }
}

export interface StreakChange {
    friendId: string;
    friendName: string;
    previousDays: number;
    currentDays: number;
    type: 'death' | 'milestone';
    milestone?: number; // 7, 14, or 30
}

const MILESTONES = [30, 14, 7] as const;

/**
 * Compare current friend streaks against the saved snapshot.
 * Returns an array of notable changes (deaths and milestones).
 */
export function detectStreakChanges(
    friends: { friendId: string; friendName: string; streakDays: number }[],
    previousStreaks: StreakSnapshot,
): StreakChange[] {
    const changes: StreakChange[] = [];

    for (const friend of friends) {
        const prev = previousStreaks[friend.friendId];
        if (prev == null) continue; // New friend, no comparison

        // Streak death: was > 0, now 0
        if (prev > 0 && friend.streakDays === 0) {
            changes.push({
                friendId: friend.friendId,
                friendName: friend.friendName,
                previousDays: prev,
                currentDays: 0,
                type: 'death',
            });
            continue;
        }

        // Milestone crossing
        for (const milestone of MILESTONES) {
            if (friend.streakDays >= milestone && prev < milestone) {
                changes.push({
                    friendId: friend.friendId,
                    friendName: friend.friendName,
                    previousDays: prev,
                    currentDays: friend.streakDays,
                    type: 'milestone',
                    milestone,
                });
                break; // Only report highest milestone crossed
            }
        }
    }

    return changes;
}
