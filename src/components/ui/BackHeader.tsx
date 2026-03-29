import React from 'react';
import { View, TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { H3 } from './Typography';
import { EvaIcon } from '../icons';
import { COLORS } from '../../theme/colors';

interface BackHeaderProps {
  /** Screen title displayed next to the back arrow */
  title: string;
  /** Override the default goBack behavior */
  onBack?: () => void;
  /** Optional right-side element (icon button, spacer, etc.) */
  right?: React.ReactNode;
  /** Layout: 'left' keeps title next to arrow; 'center' centers title with balanced spacers */
  titleAlign?: 'left' | 'center';
  /** Show bottom border (default true) */
  showBorder?: boolean;
  /** Disable back button (e.g. while saving) */
  backDisabled?: boolean;
  /** Back icon name — defaults to 'arrow-back' */
  backIcon?: string;
  /** Additional style for the container */
  style?: ViewStyle;
}

/**
 * BackHeader — standard header with a back arrow, title, and optional right action.
 *
 * Replaces the 12+ hand-rolled header patterns across screens with a single
 * consistent implementation that meets 44pt touch targets and accessibility.
 *
 * Usage:
 *   <BackHeader title="Settings" />
 *   <BackHeader title="Stats" titleAlign="center" right={<ShareButton />} />
 */
export const BackHeader: React.FC<BackHeaderProps> = ({
  title,
  onBack,
  right,
  titleAlign = 'left',
  showBorder = true,
  backDisabled = false,
  backIcon = 'arrow-back',
  style,
}) => {
  const navigation = useNavigation();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigation.goBack();
    }
  };

  const iconColor = backDisabled ? COLORS.text.disabled : COLORS.text.heading;

  return (
    <View
      style={[
        styles.container,
        showBorder && styles.border,
        style,
      ]}
      accessibilityRole="toolbar"
    >
      {/* Back button — always 44x44 touch target */}
      <TouchableOpacity
        onPress={handleBack}
        disabled={backDisabled}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        style={styles.backButton}
        accessibilityRole="button"
        accessibilityLabel="Go back"
      >
        <EvaIcon name={backIcon} variant="outline" size={24} color={iconColor} />
      </TouchableOpacity>

      {/* Title */}
      {titleAlign === 'center' ? (
        <View style={styles.centerTitleWrap}>
          <H3
            style={styles.title}
            accessibilityRole="header"
            numberOfLines={1}
          >
            {title}
          </H3>
        </View>
      ) : (
        <H3
          style={styles.titleLeft}
          accessibilityRole="header"
          numberOfLines={1}
        >
          {title}
        </H3>
      )}

      {/* Right action or balancing spacer */}
      {right ? (
        <View style={styles.rightSlot}>{right}</View>
      ) : titleAlign === 'center' ? (
        <View style={styles.spacer} />
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.card,
  },
  border: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    marginRight: 4,
  },
  title: {
    color: COLORS.text.heading,
  },
  titleLeft: {
    color: COLORS.text.heading,
    flex: 1,
  },
  centerTitleWrap: {
    flex: 1,
    alignItems: 'center',
  },
  rightSlot: {
    minWidth: 44,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  spacer: {
    width: 44,
  },
});
