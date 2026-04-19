import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { styled } from 'nativewind';
import { H3, Body } from './';
import { lightHaptic } from '../../utils/haptics';
import { EvaIcon } from '../icons';
import { COLORS } from '../../theme/colors';

interface ErrorStateProps {
  title?: string;
  message?: string;
  error?: Error | null;
  onRetry?: () => void;
  retryLabel?: string;
  icon?: React.ReactNode;
  className?: string;
}

const StyledView = styled(View);

/**
 * ErrorState Component
 *
 * Displays error messages with optional retry functionality
 * Can be used for failed data fetches, network errors, etc.
 */
export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Something went wrong',
  message = 'We couldn\'t load this content. Please try again.',
  error,
  onRetry,
  retryLabel = 'Try Again',
  icon,
  className = '',
}) => {
  const insets = useSafeAreaInsets();

  const handleRetry = () => {
    lightHaptic();
    onRetry?.();
  };

  return (
    <StyledView
      className={`items-center justify-center py-12 px-6 ${className}`}
      style={{ flex: 1, paddingBottom: Math.max(insets.bottom, 24) }}
    >
      {/* Icon */}
      <StyledView className="mb-4">
        {icon || (
          <StyledView
            className="w-16 h-16 rounded-full items-center justify-center"
            style={{ backgroundColor: COLORS.error + '1A' }}
          >
            <EvaIcon name="alert-circle" variant="outline" size={32} color={COLORS.error} />
          </StyledView>
        )}
      </StyledView>

      {/* Title */}
      <H3
        className="text-center mb-2"
        style={{ color: COLORS.text.primary, maxWidth: 320 }}
      >
        {title}
      </H3>

      {/* Message */}
      <Body
        className="text-center mb-6"
        style={{ color: COLORS.text.secondary, maxWidth: 320 }}
      >
        {message}
      </Body>

      {/* Error Details (Development Only) */}
      {__DEV__ && error && (
        <Body
          className="text-xs text-center mb-4 px-4 py-2 rounded-lg"
          style={{
            color: COLORS.error,
            backgroundColor: COLORS.error + '1A',
            maxWidth: 320,
          }}
        >
          {error.message}
        </Body>
      )}

      {/* Retry Button */}
      {onRetry && (
        <TouchableOpacity
          onPress={handleRetry}
          activeOpacity={0.7}
          className="px-6 py-3 rounded-xl flex-row items-center"
          style={{ backgroundColor: COLORS.primary }}
        >
          <EvaIcon name="refresh" variant="outline" size={18} color={COLORS.card} style={{ marginRight: 8 }} />
          <Body className="font-semibold" style={{ color: COLORS.card }}>
            {retryLabel}
          </Body>
        </TouchableOpacity>
      )}
    </StyledView>
  );
};

/**
 * CardErrorState Component
 *
 * Compact error state for use inside dashboard cards
 */
export const CardErrorState: React.FC<ErrorStateProps> = ({
  title = 'Failed to load',
  message = 'Tap to retry',
  onRetry,
  className = '',
}) => {
  const handleRetry = () => {
    lightHaptic();
    onRetry?.();
  };

  return (
    <TouchableOpacity
      onPress={handleRetry}
      activeOpacity={0.7}
      disabled={!onRetry}
      className={`items-center justify-center py-8 px-4 ${className}`}
    >
      <StyledView
        className="w-12 h-12 rounded-full items-center justify-center mb-3"
        style={{ backgroundColor: COLORS.error + '1A' }}
      >
        <EvaIcon name="alert-circle" variant="outline" size={24} color={COLORS.error} />
      </StyledView>

      <Body
        className="font-medium text-center mb-1"
        style={{ color: COLORS.text.primary }}
      >
        {title}
      </Body>

      {onRetry && (
        <Body
          className="text-sm text-center"
          style={{ color: COLORS.primary }}
        >
          {message}
        </Body>
      )}
    </TouchableOpacity>
  );
};
