import React, { useState } from 'react';
import { View, Image, ImageStyle, ViewStyle } from 'react-native';
import { styled } from 'nativewind';
import { Ionicons } from '@expo/vector-icons';

const StyledView = styled(View);
const StyledImage = styled(Image);

interface AvatarProps {
  uri?: string;
  size?: number;
  className?: string;
  rounded?: 'full' | 'lg' | '2xl';
  blurRadius?: number;
}

export const Avatar: React.FC<AvatarProps> = ({
  uri,
  size = 96,
  className = '',
  rounded = '2xl',
  blurRadius,
}) => {
  const [hasError, setHasError] = useState(false);

  const roundedClass = {
    full: 'rounded-full',
    lg: 'rounded-lg',
    '2xl': 'rounded-2xl',
  }[rounded];

  // Show placeholder if no URI or if image failed to load
  if (!uri || hasError) {
    return (
      <StyledView
        className={`bg-neutral-200 items-center justify-center ${roundedClass} ${className}`}
        style={{ width: size, height: size }}
      >
        <Ionicons name="person" size={size * 0.5} color="#A3A3A3" />
      </StyledView>
    );
  }

  return (
    <StyledImage
      source={{ uri }}
      className={`${roundedClass} ${className}`}
      style={{ width: size, height: size }}
      blurRadius={blurRadius}
      defaultSource={undefined}
      onError={(e) => {
        console.warn('Failed to load image:', uri);
        setHasError(true); // Show placeholder on error
      }}
    />
  );
};
