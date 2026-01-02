/**
 * Haptic Feedback Utilities
 *
 * Provides consistent haptic feedback across the app
 */

import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

/**
 * Light haptic feedback for subtle interactions
 * Use for: Card taps, toggle switches, minor selections
 */
export const lightHaptic = async () => {
  if (Platform.OS === 'ios' || Platform.OS === 'android') {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (error) {
      // Haptics might not be supported on all devices
      console.log('Haptic feedback not supported');
    }
  }
};

/**
 * Medium haptic feedback for standard interactions
 * Use for: Button presses, navigation, standard selections
 */
export const mediumHaptic = async () => {
  if (Platform.OS === 'ios' || Platform.OS === 'android') {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (error) {
      console.log('Haptic feedback not supported');
    }
  }
};

/**
 * Heavy haptic feedback for important interactions
 * Use for: Confirmations, important actions, errors
 */
export const heavyHaptic = async () => {
  if (Platform.OS === 'ios' || Platform.OS === 'android') {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    } catch (error) {
      console.log('Haptic feedback not supported');
    }
  }
};

/**
 * Success haptic feedback
 * Use for: Successful actions, completions, achievements
 */
export const successHaptic = async () => {
  if (Platform.OS === 'ios' || Platform.OS === 'android') {
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.log('Haptic feedback not supported');
    }
  }
};

/**
 * Warning haptic feedback
 * Use for: Warnings, alerts, attention needed
 */
export const warningHaptic = async () => {
  if (Platform.OS === 'ios' || Platform.OS === 'android') {
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    } catch (error) {
      console.log('Haptic feedback not supported');
    }
  }
};

/**
 * Error haptic feedback
 * Use for: Errors, failures, invalid actions
 */
export const errorHaptic = async () => {
  if (Platform.OS === 'ios' || Platform.OS === 'android') {
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } catch (error) {
      console.log('Haptic feedback not supported');
    }
  }
};

/**
 * Selection haptic feedback
 * Use for: Scrolling through pickers, changing selections
 */
export const selectionHaptic = async () => {
  if (Platform.OS === 'ios' || Platform.OS === 'android') {
    try {
      await Haptics.selectionAsync();
    } catch (error) {
      console.log('Haptic feedback not supported');
    }
  }
};
