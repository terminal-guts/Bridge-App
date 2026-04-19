import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { COLORS } from '../../theme/colors';
import { FONTS, FONT_SIZES, LINE_HEIGHTS } from '../../constants/typography';
import { lightHaptic } from '../../utils/haptics';

interface AgeRangeStepperProps {
  min: number;
  max: number;
  floor?: number;
  ceiling?: number;
  onMinChange: (value: number) => void;
  onMaxChange: (value: number) => void;
}

const StepButton = ({ label, onPress, disabled, accessibilityLabel }: { label: string; onPress: () => void; disabled?: boolean; accessibilityLabel: string }) => (
  <TouchableOpacity
    onPress={() => { lightHaptic(); onPress(); }}
    disabled={disabled}
    activeOpacity={0.7}
    hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
    style={[
      s.stepBtn,
      disabled ? s.stepBtnOff : s.stepBtnOn,
    ]}
    accessibilityRole="button"
    accessibilityLabel={accessibilityLabel}
    accessibilityState={{ disabled: !!disabled }}
  >
    <Text
      style={[
        s.stepBtnLabel,
        { color: disabled ? '#D0D5DD' : COLORS.primaryAccent },
      ]}
    >
      {label}
    </Text>
  </TouchableOpacity>
);

export const AgeRangeStepper: React.FC<AgeRangeStepperProps> = ({
  min,
  max,
  floor = 18,
  ceiling = 35,
  onMinChange,
  onMaxChange,
}) => (
  <View style={s.root}>
    {/* Min group */}
    <View style={s.group}>
      <Text style={s.label} accessibilityRole="header">Min</Text>
      <View style={s.controls}>
        <StepButton label="−" onPress={() => onMinChange(min - 1)} disabled={min <= floor} accessibilityLabel={`Decrease minimum age, currently ${min}`} />
        <View style={s.valueBox} accessibilityRole="text" accessibilityLabel={`Minimum age ${min}`}>
          <Text style={s.valueNum}>{min}</Text>
        </View>
        <StepButton label="+" onPress={() => onMinChange(min + 1)} disabled={min >= max - 1} accessibilityLabel={`Increase minimum age, currently ${min}`} />
      </View>
    </View>

    {/* Separator */}
    <View style={s.sep} />

    {/* Max group */}
    <View style={s.group}>
      <Text style={s.label} accessibilityRole="header">Max</Text>
      <View style={s.controls}>
        <StepButton label="−" onPress={() => onMaxChange(max - 1)} disabled={max <= min + 1} accessibilityLabel={`Decrease maximum age, currently ${max}`} />
        <View style={s.valueBox} accessibilityRole="text" accessibilityLabel={`Maximum age ${max}`}>
          <Text style={s.valueNum}>{max}</Text>
        </View>
        <StepButton label="+" onPress={() => onMaxChange(max + 1)} disabled={max >= ceiling} accessibilityLabel={`Increase maximum age, currently ${max}`} />
      </View>
    </View>
  </View>
);

const s = StyleSheet.create({
  root: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  group: {
    alignItems: 'center',
  },
  label: {
    fontSize: FONT_SIZES.md,
    lineHeight: LINE_HEIGHTS.md,
    color: '#667085',
    fontFamily: FONTS.medium,
    marginBottom: 10,
    textAlign: 'center',
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },

  // ── Step buttons ──
  stepBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBtnOn: {
    backgroundColor: '#EEF2FF',
    borderWidth: 1.5,
    borderColor: '#C7D2FE',
  },
  stepBtnOff: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  stepBtnLabel: {
    // Tight-centered glyph: 18/18 via 2xl size + base line-height (scale has
    // no 2xl size paired with an 18 line-height, so we mix tokens).
    fontSize: FONT_SIZES['2xl'],
    lineHeight: LINE_HEIGHTS.base,
    fontFamily: FONTS.medium,
    textAlign: 'center',
    // Kill Android extra padding so glyph sits dead-center
    ...(Platform.OS === 'android' && { includeFontPadding: false }),
  },

  // ── Value box ──
  valueBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: COLORS.primaryAccent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  valueNum: {
    color: '#FFFFFF',
    fontSize: FONT_SIZES['3xl'],
    lineHeight: LINE_HEIGHTS['2xl'],
    fontFamily: FONTS.bold,
    textAlign: 'center',
    ...(Platform.OS === 'android' && { includeFontPadding: false }),
  },

  // ── Separator ──
  sep: {
    width: 1,
    height: 44,
    backgroundColor: '#E5E7EB',
    marginTop: 16,
    marginHorizontal: 14,
  },
});
