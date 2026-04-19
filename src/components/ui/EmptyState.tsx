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
  /**
   * When true, outer wrapper uses flex:1 + minHeight:240 so the empty
   * state fills its parent. Use when the empty state sits inside a
   * short container (e.g. a card body) that would otherwise collapse.
   */
  fillHeight?: boolean;
}

const StyledView = styled(View);

/**
 * Enhanced Empty State Component
 *
 * Two variants:
 * - default: Simple centered empty state (backward compatible)
 * - illustrated: Enhanced design with decorative elements (no gradients — RN only)
 */
export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  className = '',
  variant = 'default',
  fillHeight = false,
}) => {
  const fillStyle = fillHeight ? { flex: 1, minHeight: 240 } : undefined;

  if (variant === 'illustrated') {
    return (
      <StyledView
        className={`items-center justify-center px-6 py-8 ${className}`}
        style={fillStyle}
      >
        {/* Decorative Background with Icon */}
        {icon && (
          <StyledView className="relative mb-5">
            {/* Outer decorative circle */}
            <StyledView
              className="absolute w-28 h-28 rounded-full"
              style={{ top: -14, left: -14, backgroundColor: COLORS.primaryTint }}
            />

            {/* Main icon container (solid fill — no gradient, RN support only) */}
            <StyledView
              className="w-24 h-24 rounded-3xl items-center justify-center relative"
              style={{ backgroundColor: COLORS.primaryLight }}
            >
              {/* Inner glow effect */}
              <StyledView
                className="absolute w-20 h-20 rounded-2xl"
                style={{ backgroundColor: COLORS.card, opacity: 0.5 }}
              />

              {/* Icon */}
              <StyledView style={{ zIndex: 1 }}>
                {icon}
              </StyledView>
            </StyledView>

            {/* Small decorative dots */}
            <StyledView
              className="absolute w-4 h-4 rounded-full"
              style={{ top: -3, right: -3, backgroundColor: COLORS.primaryAccent }}
            />
            <StyledView
              className="absolute w-2 h-2 rounded-full"
              style={{ bottom: 2, left: -2, backgroundColor: COLORS.primaryDisabled }}
            />
          </StyledView>
        )}

        {/* Text Content */}
        <StyledView className="items-center max-w-sm">
          <H3 className="text-center mb-2" style={{ color: COLORS.text.primary }}>
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
    <StyledView
      className={`items-center justify-center px-6 py-2 ${className}`}
      style={fillStyle}
    >
      {icon && (
        <StyledView className="mb-2 opacity-40">
          {icon}
        </StyledView>
      )}
      <H3 className="text-center mb-1" style={{ color: COLORS.text.primary }}>
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
