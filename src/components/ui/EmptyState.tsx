import React from 'react';
import { View } from 'react-native';
import { styled } from 'nativewind';
import { Button } from './Button';
import { H3, Body, Caption } from './Typography';
import { COLORS } from '../../theme/colors';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onPress: () => void;
  };
  className?: string;
  variant?: 'default' | 'illustrated';
}

const StyledView = styled(View);

/**
 * Enhanced Empty State Component
 *
 * Two variants:
 * - default: Simple centered empty state (backward compatible)
 * - illustrated: Enhanced design with decorative elements and gradients
 */
export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  className = '',
  variant = 'default',
}) => {
  if (variant === 'illustrated') {
    return (
      <StyledView className={`items-center justify-center px-6 py-8 ${className}`}>
        {/* Decorative Background with Icon */}
        {icon && (
          <StyledView className="relative mb-5">
            {/* Outer decorative circle */}
            <StyledView className="absolute w-28 h-28 bg-primary-100/30 rounded-full" style={{ top: -14, left: -14 }} />

            {/* Main icon container with gradient */}
            <StyledView className="w-24 h-24 bg-gradient-to-br from-primary-100 to-primary-200 rounded-3xl items-center justify-center relative">
              {/* Inner glow effect */}
              <StyledView className="absolute w-20 h-20 bg-white/50 rounded-2xl" />

              {/* Icon */}
              <StyledView style={{ zIndex: 1 }}>
                {icon}
              </StyledView>
            </StyledView>

            {/* Small decorative dots */}
            <StyledView className="absolute w-4 h-4 bg-primary-400 rounded-full" style={{ top: -3, right: -3 }} />
            <StyledView className="absolute w-2 h-2 bg-primary-300 rounded-full" style={{ bottom: 2, left: -2 }} />
          </StyledView>
        )}

        {/* Text Content */}
        <StyledView className="items-center max-w-sm">
          <H3 className="text-center mb-2" style={{ color: COLORS.text.heading }}>
            {title}
          </H3>
          {description && (
            <Body className="text-center mb-5" style={{ color: COLORS.text.secondary }}>
              {description}
            </Body>
          )}
          {action && (
            <Button onPress={action.onPress} variant="primary">
              {action.label}
            </Button>
          )}
        </StyledView>
      </StyledView>
    );
  }

  // Default variant
  return (
    <StyledView className={`items-center justify-center px-6 py-2 ${className}`}>
      {icon && (
        <StyledView className="mb-2 opacity-40">
          {icon}
        </StyledView>
      )}
      <H3 className="text-center mb-1" style={{ color: COLORS.text.heading }}>
        {title}
      </H3>
      {description && (
        <Caption className="text-center mb-3 max-w-xs" style={{ color: COLORS.text.secondary }}>
          {description}
        </Caption>
      )}
      {action && (
        <StyledView style={{ minHeight: 44 }}>
          <Button onPress={action.onPress} variant="primary">
            {action.label}
          </Button>
        </StyledView>
      )}
    </StyledView>
  );
};
