/**
 * EmptyState Component
 *
 * Displays friendly empty and error states for the community matching system.
 * Provides clear messaging and actionable next steps.
 */

import React from 'react';
import { View, Text } from 'react-native';
import { styled } from 'nativewind';
import { Ionicons } from '@expo/vector-icons';

const StyledView = styled(View);
const StyledText = styled(Text);

interface EmptyStateProps {
  type: 'no_grid' | 'network_error' | 'no_candidates' | 'loading_error';
  title?: string;
  message?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  onRetry?: () => void;
}

export function EmptyState({
  type,
  title,
  message,
  icon,
  onRetry,
}: EmptyStateProps) {
  // Default content based on type
  const defaults = {
    no_grid: {
      icon: 'calendar-outline' as keyof typeof Ionicons.glyphMap,
      title: 'No Grid Today',
      message: "You don't have a grid assignment today. Check back tomorrow!",
    },
    network_error: {
      icon: 'cloud-offline-outline' as keyof typeof Ionicons.glyphMap,
      title: 'Connection Lost',
      message: 'Unable to load your grid. Please check your internet connection and try again.',
    },
    no_candidates: {
      icon: 'people-outline' as keyof typeof Ionicons.glyphMap,
      title: 'No Candidates Available',
      message: "We couldn't find any candidates for this grid. This is unusual - please try again later.",
    },
    loading_error: {
      icon: 'alert-circle-outline' as keyof typeof Ionicons.glyphMap,
      title: 'Something Went Wrong',
      message: 'We had trouble loading your grid. Please try again.',
    },
  };

  const defaultContent = defaults[type];
  const displayTitle = title || defaultContent.title;
  const displayMessage = message || defaultContent.message;
  const displayIcon = icon || defaultContent.icon;

  return (
    <StyledView className="flex-1 items-center justify-center px-8 py-12">
      {/* Icon */}
      <StyledView className="mb-6">
        <Ionicons name={displayIcon} size={64} color="#94A3B8" />
      </StyledView>

      {/* Title */}
      <StyledText className="text-xl font-semibold text-neutral-900 text-center mb-3">
        {displayTitle}
      </StyledText>

      {/* Message */}
      <StyledText className="text-base text-neutral-600 text-center leading-6 mb-6">
        {displayMessage}
      </StyledText>

      {/* Retry Button (optional) */}
      {onRetry && (
        <StyledView
          className="bg-primary-500 rounded-lg px-6 py-3 active:opacity-80"
          onTouchEnd={onRetry}
        >
          <StyledText className="text-white font-semibold">Try Again</StyledText>
        </StyledView>
      )}
    </StyledView>
  );
}

/**
 * ErrorBoundaryFallback - Fallback UI for error boundaries
 */
interface ErrorBoundaryFallbackProps {
  error: Error;
  resetError: () => void;
}

export function ErrorBoundaryFallback({
  error,
  resetError,
}: ErrorBoundaryFallbackProps) {
  return (
    <EmptyState
      type="loading_error"
      title="Unexpected Error"
      message={
        __DEV__
          ? `Error: ${error.message}`
          : 'Something went wrong. Please try again.'
      }
      onRetry={resetError}
    />
  );
}

export default EmptyState;
