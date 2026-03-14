import React, { useState, useMemo } from 'react';
import { View } from 'react-native';
import { Image } from 'expo-image';
import { styled } from 'nativewind';
import { createLogger } from '../../utils/secureLogger';
import { getOptimizedImageUrl } from '../../utils/imageUtils';
import { EvaIcon } from '../icons';

const logger = createLogger('Avatar');

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
  const optimizedUri = useMemo(() => getOptimizedImageUrl(uri, size), [uri, size]);

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
        <EvaIcon name="person" variant="outline" size={size} color="#A3A3A3" />
      </StyledView>
    );
  }

  return (
    <StyledImage
      source={{ uri: optimizedUri }}
      className={`${roundedClass} ${className}`}
      style={{ width: size, height: size, backgroundColor: '#E5E7EB' }}
      blurRadius={blurRadius}
      contentFit="cover"
      transition={200}
      cachePolicy="disk"
      recyclingKey={uri}
      onError={(e) => {
        logger.warn('Failed to load image:', uri);
        setHasError(true);
      }}
    />
  );
};
