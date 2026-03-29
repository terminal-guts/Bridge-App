/**
 * CollapsibleCard Component
 *
 * A card that can be expanded/collapsed with smooth animations.
 * Uses Reanimated for buttery 120fps chevron rotation on the UI thread,
 * and LayoutAnimation for height transitions.
 */

import React, { useState } from 'react';
import { View, TouchableOpacity, LayoutAnimation, Platform, UIManager } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { styled } from 'nativewind';
import { Card } from './Card';
import { lightHaptic } from '../../utils/haptics';
import { EvaIcon } from '../icons';
import { SPRINGS } from '../../constants/animations';
import { COLORS } from '../../theme/colors';

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
  const rotation = useSharedValue(defaultExpanded ? 180 : 0);

  const chevronStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

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
    rotation.value = withSpring(newExpanded ? 180 : 0, SPRINGS.responsive);
    setExpanded(newExpanded);
    onToggle?.(newExpanded);
  };

  return (
    <Card elevation={elevation} variant={variant} className={`mb-4 ${className}`} animateDepth>
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
              {title}
            </StyledView>
          </StyledView>

          <Animated.View style={chevronStyle}>
            <EvaIcon name="arrow-ios-downward" variant="outline" size={20} color={COLORS.navInactiveIcon} />
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
