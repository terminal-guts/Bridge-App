import React from 'react';
import { View, Text } from 'react-native';
import { BaseToast, ErrorToast, InfoToast } from 'react-native-toast-message';

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
        backgroundColor: '#FFFFFF',
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
        fontSize: 16,
        fontWeight: '600',
        fontFamily: 'Satoshi-Bold',
        color: '#171717',
        marginBottom: 2,
      }}
      text2Style={{
        fontSize: 14,
        fontFamily: 'Inter-Regular',
        color: '#525252',
        lineHeight: 18,
      }}
    />
  ),

  error: (props: any) => (
    <ErrorToast
      {...props}
      style={{
        borderLeftColor: '#EF4444',
        borderLeftWidth: 6,
        backgroundColor: '#FFFFFF',
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
        fontSize: 16,
        fontWeight: '600',
        fontFamily: 'Satoshi-Bold',
        color: '#171717',
        marginBottom: 2,
      }}
      text2Style={{
        fontSize: 14,
        fontFamily: 'Inter-Regular',
        color: '#525252',
        lineHeight: 18,
      }}
    />
  ),

  info: (props: any) => (
    <InfoToast
      {...props}
      style={{
        borderLeftColor: '#437FFF',
        borderLeftWidth: 6,
        backgroundColor: '#FFFFFF',
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
        fontSize: 16,
        fontWeight: '600',
        fontFamily: 'Satoshi-Bold',
        color: '#171717',
        marginBottom: 2,
      }}
      text2Style={{
        fontSize: 14,
        fontFamily: 'Inter-Regular',
        color: '#525252',
        lineHeight: 18,
      }}
    />
  ),

  premiumToast: (props: any) => (
    <View
      style={{
        backgroundColor: '#FFFFFF',
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
          fontSize: 16,
          fontWeight: '600',
          fontFamily: 'Satoshi-Bold',
          color: '#171717',
          marginBottom: 4,
        }}
      >
        {props.text1}
      </Text>
      {props.text2 && (
        <Text
          style={{
            fontSize: 14,
            fontFamily: 'Inter-Regular',
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
