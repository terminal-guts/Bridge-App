import React from 'react';
import { View, SafeAreaView, StatusBar, StatusBarStyle, ViewStyle } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { COLORS } from '../../theme/colors';
import { DURATIONS } from '../../constants/animations';

interface ScreenWrapperProps {
  children: React.ReactNode;
  statusBarStyle?: StatusBarStyle;
  backgroundColor?: string;
  /** Enable entering fade animation (opt-in for pushed screens, not tabs) */
  animate?: boolean;
}

/**
 * Shared screen wrapper — enforces consistent background color and StatusBar.
 * Content fades in smoothly on mount for a polished feel.
 * Does NOT force padding or layout; screens control their own content.
 */
export const ScreenWrapper: React.FC<ScreenWrapperProps> = ({
  children,
  statusBarStyle = 'dark-content',
  backgroundColor = COLORS.screenBackground,
  animate = false,
}) => {
  const rootStyle: ViewStyle = { flex: 1, backgroundColor };

  return (
    <SafeAreaView style={rootStyle}>
      <StatusBar barStyle={statusBarStyle} />
      {animate ? (
        <Animated.View style={rootStyle} entering={FadeIn.duration(DURATIONS.normal)}>
          {children}
        </Animated.View>
      ) : (
        <View style={rootStyle}>
          {children}
        </View>
      )}
    </SafeAreaView>
  );
};
