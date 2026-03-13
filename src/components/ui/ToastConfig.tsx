import React from 'react';
import { View, Text } from 'react-native';
import { BaseToast, ErrorToast, InfoToast } from 'react-native-toast-message';
import { FONTS, FONT_SIZES } from '../../constants/typography';
import { COLORS } from '../../theme/colors';

/**
 * Custom Toast Configuration
 * Premium styled toasts matching Bridge's design system
 */

export const toastConfig = {
  success: (props: any) => (
    <BaseToast
      {...props}
      style={{
        borderLeftColor: '#12B981',
        borderLeftWidth: 6,
        backgroundColor: COLORS.card,
        borderRadius: 12,
        paddingVertical: 12,
        paddingHorizontal: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 5,
        minHeight: 70,
      }}
      contentContainerStyle={{
        paddingHorizontal: 12,
      }}
      text1Style={{
        fontSize: FONT_SIZES.xl,
        fontWeight: '600',
        fontFamily: FONTS.bold,
        color: '#171717',
        marginBottom: 2,
      }}
      text2Style={{
        fontSize: FONT_SIZES.base,
        fontFamily: FONTS.regular,
        color: '#525252',
        lineHeight: 18,
      }}
    />
  ),

  error: (props: any) => (
    <ErrorToast
      {...props}
      style={{
        borderLeftColor: COLORS.error,
        borderLeftWidth: 6,
        backgroundColor: COLORS.card,
        borderRadius: 12,
        paddingVertical: 12,
        paddingHorizontal: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 5,
        minHeight: 70,
      }}
      contentContainerStyle={{
        paddingHorizontal: 12,
      }}
      text1Style={{
        fontSize: FONT_SIZES.xl,
        fontWeight: '600',
        fontFamily: FONTS.bold,
        color: '#171717',
        marginBottom: 2,
      }}
      text2Style={{
        fontSize: FONT_SIZES.base,
        fontFamily: FONTS.regular,
        color: '#525252',
        lineHeight: 18,
      }}
    />
  ),

  info: (props: any) => (
    <InfoToast
      {...props}
      style={{
        borderLeftColor: COLORS.primaryAccent,
        borderLeftWidth: 6,
        backgroundColor: COLORS.card,
        borderRadius: 12,
        paddingVertical: 12,
        paddingHorizontal: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 5,
        minHeight: 70,
      }}
      contentContainerStyle={{
        paddingHorizontal: 12,
      }}
      text1Style={{
        fontSize: FONT_SIZES.xl,
        fontWeight: '600',
        fontFamily: FONTS.bold,
        color: '#171717',
        marginBottom: 2,
      }}
      text2Style={{
        fontSize: FONT_SIZES.base,
        fontFamily: FONTS.regular,
        color: '#525252',
        lineHeight: 18,
      }}
    />
  ),

  premiumToast: (props: any) => (
    <View
      style={{
        backgroundColor: COLORS.card,
        borderRadius: 12,
        paddingVertical: 16,
        paddingHorizontal: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 5,
        borderWidth: 1,
        borderColor: '#E5E5E5',
        minHeight: 70,
        justifyContent: 'center',
        width: '90%',
      }}
    >
      <Text
        style={{
          fontSize: FONT_SIZES.xl,
          fontWeight: '600',
          fontFamily: FONTS.bold,
          color: '#171717',
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
            color: '#525252',
            lineHeight: 18,
          }}
        >
          {props.text2}
        </Text>
      )}
    </View>
  ),
};
