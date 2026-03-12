import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import { styled } from 'nativewind';
import { H3, Body, Button } from './';
import { lightHaptic } from '../../utils/haptics';
import { EvaIcon } from '../icons';

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
  const handleRetry = () => {
    lightHaptic();
    onRetry?.();
  };

  return (
    <StyledView className={`items-center justify-center py-12 px-6 ${className}`}>
      {/* Icon */}
      <StyledView className="mb-4">
        {icon || (
          <StyledView className="w-16 h-16 bg-error-100 rounded-full items-center justify-center">
            <EvaIcon name="alert-circle" variant="outline" size={32} color="#EF4444" />
          </StyledView>
        )}
      </StyledView>

      {/* Title */}
      <H3 className="text-neutral-900 text-center mb-2">
        {title}
      </H3>

      {/* Message */}
      <Body className="text-neutral-600 text-center mb-6 max-w-sm">
        {message}
      </Body>

      {/* Error Details (Development Only) */}
      {__DEV__ && error && (
        <Body className="text-error text-xs text-center mb-4 px-4 py-2 bg-error-50 rounded-lg max-w-sm">
          {error.message}
        </Body>
      )}

      {/* Retry Button */}
      {onRetry && (
        <TouchableOpacity
          onPress={handleRetry}
          activeOpacity={0.7}
          className="bg-primary-500 px-6 py-3 rounded-xl flex-row items-center"
        >
          <EvaIcon name="refresh" variant="outline" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
          <Body className="text-white font-semibold">
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
      <StyledView className="w-12 h-12 bg-error-100 rounded-full items-center justify-center mb-3">
        <EvaIcon name="alert-circle" variant="outline" size={24} color="#EF4444" />
      </StyledView>

      <Body className="text-neutral-700 font-medium text-center mb-1">
        {title}
      </Body>

      {onRetry && (
        <Body className="text-primary-600 text-sm text-center">
          {message}
        </Body>
      )}
    </TouchableOpacity>
  );
};
