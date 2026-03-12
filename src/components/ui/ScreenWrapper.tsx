import React from 'react';
import { View, SafeAreaView, StatusBar, StatusBarStyle, ViewStyle } from 'react-native';
import { COLORS } from '../../theme/colors';

interface ScreenWrapperProps {
  children: React.ReactNode;
  statusBarStyle?: StatusBarStyle;
  backgroundColor?: string;
}

/**
 * Shared screen wrapper — enforces consistent background color and StatusBar.
 * Does NOT force padding or layout; screens control their own content.
 */
export const ScreenWrapper: React.FC<ScreenWrapperProps> = ({
  children,
  statusBarStyle = 'dark-content',
  backgroundColor = COLORS.screenBackground,
}) => {
  const rootStyle: ViewStyle = { flex: 1, backgroundColor };

  return (
    <SafeAreaView style={rootStyle}>
      <StatusBar barStyle={statusBarStyle} />
      <View style={rootStyle}>
        {children}
      </View>
    </SafeAreaView>
  );
};
