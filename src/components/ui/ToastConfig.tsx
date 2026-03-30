import React from 'react';
import { View, Text } from 'react-native';
import { BaseToast, ErrorToast, InfoToast, BaseToastProps } from 'react-native-toast-message';
import { FONTS, FONT_SIZES, LINE_HEIGHTS } from '../../constants/typography';
import { COLORS } from '../../theme/colors';
import { SHADOWS } from '../../theme/shadows';

/**
 * Custom Toast Configuration
 * Premium styled toasts matching Bridge's design system
 */

export const toastConfig = {
  success: (props: BaseToastProps) => (
    <BaseToast
      {...props}
      style={{
        borderLeftColor: COLORS.success,
        borderLeftWidth: 6,
        backgroundColor: COLORS.card,
        borderRadius: 12,
        paddingVertical: 12,
        paddingHorizontal: 16,
        ...SHADOWS.lg,
        minHeight: 70,
      }}
      contentContainerStyle={{
        paddingHorizontal: 12,
      }}
      text1Style={{
        fontSize: FONT_SIZES.xl,
        fontFamily: FONTS.bold,
        color: COLORS.text.primary,
        marginBottom: 2,
      }}
      text2Style={{
        fontSize: FONT_SIZES.base,
        fontFamily: FONTS.regular,
        color: COLORS.text.secondary,
        lineHeight: LINE_HEIGHTS.base,
      }}
    />
  ),

  error: (props: BaseToastProps) => (
    <ErrorToast
      {...props}
      style={{
        borderLeftColor: COLORS.error,
        borderLeftWidth: 6,
        backgroundColor: COLORS.card,
        borderRadius: 12,
        paddingVertical: 12,
        paddingHorizontal: 16,
        ...SHADOWS.lg,
        minHeight: 70,
      }}
      contentContainerStyle={{
        paddingHorizontal: 12,
      }}
      text1Style={{
        fontSize: FONT_SIZES.xl,
        fontFamily: FONTS.bold,
        color: COLORS.text.primary,
        marginBottom: 2,
      }}
      text2Style={{
        fontSize: FONT_SIZES.base,
        fontFamily: FONTS.regular,
        color: COLORS.text.secondary,
        lineHeight: LINE_HEIGHTS.base,
      }}
    />
  ),

  info: (props: BaseToastProps) => (
    <InfoToast
      {...props}
      style={{
        borderLeftColor: COLORS.primaryAccent,
        borderLeftWidth: 6,
        backgroundColor: COLORS.card,
        borderRadius: 12,
        paddingVertical: 12,
        paddingHorizontal: 16,
        ...SHADOWS.lg,
        minHeight: 70,
      }}
      contentContainerStyle={{
        paddingHorizontal: 12,
      }}
      text1Style={{
        fontSize: FONT_SIZES.xl,
        fontFamily: FONTS.bold,
        color: COLORS.text.primary,
        marginBottom: 2,
      }}
      text2Style={{
        fontSize: FONT_SIZES.base,
        fontFamily: FONTS.regular,
        color: COLORS.text.secondary,
        lineHeight: LINE_HEIGHTS.base,
      }}
    />
  ),

  premiumToast: (props: BaseToastProps) => (
    <View
      style={{
        backgroundColor: COLORS.card,
        borderRadius: 12,
        paddingVertical: 16,
        paddingHorizontal: 20,
        ...SHADOWS.lg,
        borderWidth: 1,
        borderColor: COLORS.border,
        minHeight: 70,
        justifyContent: 'center',
        width: '90%',
      }}
    >
      <Text
        style={{
          fontSize: FONT_SIZES.xl,
          fontFamily: FONTS.bold,
          color: COLORS.text.primary,
          marginBottom: 4,
        }}
      >
        {props.text1}
      </Text>
      {props.text2 && (
        <Text
          style={{
            fontSize: FONT_SIZES.base,
            fontFamily: FONTS.regular,
            color: COLORS.text.secondary,
            lineHeight: LINE_HEIGHTS.base,
          }}
        >
          {props.text2}
        </Text>
      )}
    </View>
  ),
};
