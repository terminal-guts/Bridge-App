import { useState, useEffect } from 'react';
import { Keyboard, Platform } from 'react-native';

/**
 * Hook to track keyboard visibility state
 * @param initiallyVisible - Whether keyboard should be considered visible initially
 * @returns boolean indicating if keyboard is currently visible
 */
export const useKeyboardVisibility = (initiallyVisible = false): boolean => {
  const [isVisible, setIsVisible] = useState(initiallyVisible);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showListener = Keyboard.addListener(showEvent, () => setIsVisible(true));
    const hideListener = Keyboard.addListener(hideEvent, () => setIsVisible(false));

    return () => {
      showListener.remove();
      hideListener.remove();
    };
  }, []);

  return isVisible;
};
