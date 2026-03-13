import React, { useEffect } from 'react';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { Body } from './Typography';
import { AnimatedPressable } from './AnimatedPressable';
import { lightHaptic } from '../../utils/haptics';
import { SPRINGS } from '../../constants/animations';

interface OptionButtonProps {
  label: string;
  selected: boolean;
  onPress: () => void;
}

export const OptionButton: React.FC<OptionButtonProps> = ({
  label,
  selected,
  onPress,
}) => {
  const scale = useSharedValue(1);

  useEffect(() => {
    if (selected) {
      scale.value = withSpring(1, { ...SPRINGS.bouncy, velocity: 8 });
    }
  }, [selected]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePress = () => {
    lightHaptic();
    scale.value = withSpring(0.93, SPRINGS.snappy, () => {
      scale.value = withSpring(1, SPRINGS.bouncy);
    });
    onPress();
  };

  return (
    <Animated.View style={animatedStyle}>
      <AnimatedPressable
        onPress={handlePress}
        scale="standard"
        className={`px-4 py-3 rounded-lg border mr-2 mb-2 ${
          selected
            ? 'bg-primary-500 border-primary-500'
            : 'bg-white border-neutral-300'
        }`}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ selected }}
      >
        <Body className={selected ? 'text-white font-medium' : 'text-neutral-700'}>
          {label}
        </Body>
      </AnimatedPressable>
    </Animated.View>
  );
};
