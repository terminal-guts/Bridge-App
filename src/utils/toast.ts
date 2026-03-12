import Toast from 'react-native-toast-message';

/**
 * Toast Notification Utility
 * Premium toast notifications that match Bridge's design system
 */

export const showToast = {
  /**
   * Success toast - green theme
   */
  success: (message: string, subtitle?: string) => {
    Toast.show({
      type: 'success',
      text1: message,
      text2: subtitle,
      position: 'top',
      visibilityTime: 3000,
      topOffset: 100,
    });
  },

  /**
   * Error toast - red theme
   */
  error: (message: string, subtitle?: string) => {
    Toast.show({
      type: 'error',
      text1: message,
      text2: subtitle,
      position: 'top',
      visibilityTime: 4000,
      topOffset: 100,
    });
  },

  /**
   * Info toast - blue theme
   */
  info: (message: string, subtitle?: string) => {
    Toast.show({
      type: 'info',
      text1: message,
      text2: subtitle,
      position: 'top',
      visibilityTime: 3000,
      topOffset: 100,
    });
  },

  /**
   * Custom toast with premium styling
   */
  premium: (message: string, subtitle?: string) => {
    Toast.show({
      type: 'premiumToast',
      text1: message,
      text2: subtitle,
      position: 'top',
      visibilityTime: 3000,
      topOffset: 60,
    });
  },

  /**
   * Match accepted celebration toast
   */
  matchAccepted: (recipientName: string) => {
    Toast.show({
      type: 'success',
      text1: 'Match Accepted!',
      text2: `You can now chat with ${recipientName}`,
      position: 'top',
      visibilityTime: 3000,
      topOffset: 60,
    });
  },

  /**
   * Match declined toast
   */
  matchDeclined: () => {
    Toast.show({
      type: 'info',
      text1: 'Match Passed',
      text2: 'Looking for your next match...',
      position: 'bottom',
      visibilityTime: 2500,
      bottomOffset: 100,
    });
  },

  /**
   * Match expired toast
   */
  matchExpired: () => {
    Toast.show({
      type: 'info',
      text1: 'Match Expired',
      text2: 'Check back for new matches!',
      position: 'top',
      visibilityTime: 3000,
      topOffset: 60,
    });
  },

  /**
   * Survey submitted toast
   */
  surveySubmitted: () => {
    Toast.show({
      type: 'success',
      text1: 'Rankings Submitted! ✓',
      text2: 'Thank you for participating',
      position: 'top',
      visibilityTime: 3000,
      topOffset: 60,
    });
  },
};
