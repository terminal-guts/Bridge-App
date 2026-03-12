/**
 * CollapsibleCard Component
 *
 * A card that can be expanded/collapsed with smooth animations
 * Features:
 * - Spring-based expand/collapse animation
 * - Customizable header
 * - Optional default expanded state
 * - Haptic feedback on toggle
 */

import React, { useState, useRef, useEffect } from 'react';
import { View, TouchableOpacity, Animated, LayoutAnimation, Platform, UIManager } from 'react-native';
import { styled } from 'nativewind';
import { EvaIcon  } from '../../components/icons';
import { Card } from './Card';
import { lightHaptic } from '../../utils/haptics';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface CollapsibleCardProps {
  title: React.ReactNode;
  children: React.ReactNode;
  defaultExpanded?: boolean;
  elevation?: 0 | 1 | 2 | 3;
  variant?: 'default' | 'subtle' | 'elevated' | 'premium';
  className?: string;
  onToggle?: (expanded: boolean) => void;
  icon?: React.ReactNode;
}

const StyledView = styled(View);
const StyledTouchableOpacity = styled(TouchableOpacity);

export const CollapsibleCard: React.FC<CollapsibleCardProps> = ({
  title,
  children,
  defaultExpanded = true,
  elevation = 2,
  variant = 'default',
  className = '',
  onToggle,
  icon,
}) => {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const rotateAnim = useRef(new Animated.Value(defaultExpanded ? 1 : 0)).current;

  useEffect(() => {
    Animated.spring(rotateAnim, {
      toValue: expanded ? 1 : 0,
      useNativeDriver: true,
      tension: 100,
      friction: 10,
    }).start();
  }, [expanded]);

  const handleToggle = () => {
    lightHaptic();

    // Use LayoutAnimation for smooth height transition
    LayoutAnimation.configureNext(
      LayoutAnimation.create(
        200,
        LayoutAnimation.Types.easeInEaseOut,
        LayoutAnimation.Properties.opacity
      )
    );

    const newExpanded = !expanded;
    setExpanded(newExpanded);
    onToggle?.(newExpanded);
  };

  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  return (
    <Card elevation={elevation} variant={variant} className={`mb-4 ${className}`}>
      {/* Header */}
      <StyledTouchableOpacity
        onPress={handleToggle}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        accessibilityLabel={`${expanded ? 'Collapse' : 'Expand'} section`}
      >
        <StyledView className="flex-row items-center justify-between mb-0">
          <StyledView className="flex-row items-center flex-1">
            {icon && <StyledView className="mr-3">{icon}</StyledView>}
            <StyledView className="flex-1">
              {typeof title === 'string' ? (
                <StyledView>
                  {title}
                </StyledView>
              ) : (
                title
              )}
            </StyledView>
          </StyledView>

          <Animated.View style={{ transform: [{ rotate }] }}>
            <EvaIcon name="chevron-down" size={20} color="#667085" />
          </Animated.View>
        </StyledView>
      </StyledTouchableOpacity>

      {/* Content */}
      {expanded && (
        <StyledView className="mt-4">
          {children}
        </StyledView>
      )}
    </Card>
  );
};
