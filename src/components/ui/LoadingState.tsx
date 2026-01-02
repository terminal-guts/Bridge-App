import React from 'react';
import { View, ActivityIndicator, Text } from 'react-native';
import { styled } from 'nativewind';
import { Body } from './Typography';

interface LoadingStateProps {
  message?: string;
  fullScreen?: boolean;
  className?: string;
}

const StyledView = styled(View);

export const LoadingState: React.FC<LoadingStateProps> = ({
  message = 'Loading...',
  fullScreen = false,
  className = '',
}) => {
  return (
    <StyledView
      className={`${
        fullScreen ? 'flex-1' : ''
      } items-center justify-center p-8 ${className}`}
    >
      <ActivityIndicator size="large" color="#437FFF" />
      {message && (
        <Body className="text-neutral-600 mt-3">{message}</Body>
      )}
    </StyledView>
  );
};