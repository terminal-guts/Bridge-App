import React from 'react';
import { View, Modal, TouchableOpacity, ScrollView } from 'react-native';
import { styled } from 'nativewind';
import { H2, Body, Caption } from './Typography';
import { EvaIcon  } from '../../components/icons';
import { lightHaptic, mediumHaptic } from '../../utils/haptics';
import { LinearGradient } from 'expo-linear-gradient';

interface InfoModalProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  icon?: string;
  iconColor?: string;
  iconBackground?: string;
  children: React.ReactNode;
}

const StyledView = styled(View);
const StyledTouchableOpacity = styled(TouchableOpacity);
const StyledScrollView = styled(ScrollView);

/**
 * InfoModal Component
 *
 * Beautiful modal for displaying informational content
 * with icon, title, and scrollable content area
 */
export const InfoModal: React.FC<InfoModalProps> = ({
  visible,
  onClose,
  title,
  icon = 'information-circle',
  iconColor = '#437FFF',
  iconBackground = '#EFF6FF',
  children,
}) => {
  const handleClose = () => {
    mediumHaptic();
    onClose();
  };

  const handleBackdropPress = () => {
    lightHaptic();
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      {/* Backdrop with blur effect */}
      <StyledView className="flex-1 justify-center items-center px-6" style={{ backgroundColor: 'rgba(0, 0, 0, 0.6)' }}>
        <StyledTouchableOpacity
          className="absolute inset-0"
          activeOpacity={1}
          onPress={handleBackdropPress}
        />

        {/* Modal Content */}
        <StyledView
          className="bg-white rounded-3xl w-full max-w-md overflow-hidden"
          style={{
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 20 },
            shadowOpacity: 0.3,
            shadowRadius: 30,
            elevation: 24,
          }}
        >
          {/* Top gradient accent */}
          <LinearGradient
            colors={['#437FFF', '#6B9FFF']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: 4,
            }}
          />

          {/* Header Section */}
          <StyledView className="items-center pt-8 pb-6 px-6">
            {/* Close Button - Absolute positioned */}
            <StyledTouchableOpacity
              onPress={handleClose}
              className="absolute top-4 right-4 p-2 rounded-full bg-neutral-100"
              activeOpacity={0.7}
            >
              <EvaIcon name="close" size={20} color="#64748B" />
            </StyledTouchableOpacity>

            {/* Icon */}
            <StyledView
              className="w-16 h-16 rounded-2xl items-center justify-center mb-4"
              style={{ backgroundColor: iconBackground }}
            >
              <EvaIcon name={icon} size={32} color={iconColor} />
            </StyledView>

            {/* Title */}
            <H2 className="text-neutral-900 text-center text-xl font-bold">
              {title}
            </H2>
          </StyledView>

          {/* Content Section */}
          <StyledScrollView
            className="px-6 pb-6"
            style={{ maxHeight: 400 }}
            showsVerticalScrollIndicator={false}
          >
            {children}
          </StyledScrollView>

          {/* Bottom padding for visual balance */}
          <StyledView style={{ height: 8 }} />
        </StyledView>
      </StyledView>
    </Modal>
  );
};

/**
 * InfoSection Component
 *
 * Helper component for structuring content within InfoModal
 */
export const InfoSection: React.FC<{
  title?: string;
  children: React.ReactNode;
  className?: string;
}> = ({ title, children, className = '' }) => {
  return (
    <StyledView className={`mb-5 ${className}`}>
      {title && (
        <Body className="text-neutral-900 font-semibold mb-2 text-base">
          {title}
        </Body>
      )}
      <Body className="text-neutral-600 leading-6">
        {children}
      </Body>
    </StyledView>
  );
};

/**
 * InfoBullet Component
 *
 * Styled bullet point for use within InfoModal
 */
export const InfoBullet: React.FC<{
  icon?: string;
  children: React.ReactNode;
}> = ({ icon = 'checkmark-circle', children }) => {
  return (
    <StyledView className="flex-row mb-3">
      <EvaIcon name={icon}
        size={20}
        color="#12B981"
        style={{ marginRight: 12, marginTop: 2 }}
      />
      <Body className="text-neutral-600 flex-1 leading-6">
        {children}
      </Body>
    </StyledView>
  );
};
