/**
 * BadgeAwardModal Component
 *
 * 3-step modal flow for awarding or editing a friend badge:
 * 1. Icon picker (grid grouped by category)
 * 2. Message input (50 char limit)
 * 3. Review & submit
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Pressable,
  Keyboard,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  interpolate,
} from 'react-native-reanimated';
import { FriendBadge } from '../../types/badges';
import { BadgeIcon } from '../icons/BadgeIcon';
import { BadgeCard } from './BadgeCard';
import { BADGE_ICON_CATEGORIES, BADGE_ICON_LABELS } from '../../constants/badgeIcons';
import { awardBadge, updateBadge, deleteBadge } from '../../services/badgeService';
import { FONTS, FONT_SIZES, LINE_HEIGHTS } from '../../constants/typography';
import { COLORS } from '../../theme/colors';
import { SPRINGS } from '../../constants/animations';
import { successHaptic, errorHaptic, lightHaptic } from '../../utils/haptics';
import { EvaIcon } from '../icons';

interface BadgeAwardModalProps {
  visible: boolean;
  onClose: () => void;
  friendId: string;
  friendName: string;
  existingBadge?: FriendBadge | null;
  onSuccess: () => void;
}

export const BadgeAwardModal: React.FC<BadgeAwardModalProps> = ({
  visible,
  onClose,
  friendId,
  friendName,
  existingBadge,
  onSuccess,
}) => {
  const [step, setStep] = useState(0);
  const [selectedIcon, setSelectedIcon] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const animValue = useSharedValue(0);

  useEffect(() => {
    animValue.value = withSpring(visible ? 1 : 0, SPRINGS.responsive);
    if (visible) {
      setStep(0);
      setError('');
      if (existingBadge) {
        setSelectedIcon(existingBadge.iconName);
        setMessage(existingBadge.message);
      } else {
        setSelectedIcon('');
        setMessage('');
      }
    }
  }, [visible]);

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: animValue.value * 0.5,
  }));

  const modalStyle = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(animValue.value, [0, 1], [0.9, 1]) }],
    opacity: animValue.value,
  }));

  const handleClose = () => {
    Keyboard.dismiss();
    onClose();
  };

  const handleNext = () => {
    if (step === 0 && !selectedIcon) return;
    if (step === 1 && !message.trim()) return;
    lightHaptic();
    setStep(s => s + 1);
  };

  const handleBack = () => {
    lightHaptic();
    setStep(s => s - 1);
  };

  const handleRemove = async () => {
    if (!existingBadge) return;
    setSubmitting(true);
    setError('');
    try {
      const result = await deleteBadge(existingBadge.id);
      if (result.ok) {
        successHaptic();
        onSuccess();
        onClose();
      } else {
        errorHaptic();
        setError(result.error?.message || 'Failed to remove badge.');
      }
    } catch {
      errorHaptic();
      setError('Failed to remove badge.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError('');

    try {
      let result;
      if (existingBadge) {
        result = await updateBadge(existingBadge.id, {
          iconName: selectedIcon,
          message: message.trim(),
        });
      } else {
        result = await awardBadge({
          receiverId: friendId,
          iconName: selectedIcon,
          message: message.trim(),
        });
      }

      if (result.ok) {
        successHaptic();
        onSuccess();
        onClose();
      } else {
        errorHaptic();
        setError(result.error?.message || 'Something went wrong.');
      }
    } catch {
      errorHaptic();
      setError('Failed to save badge.');
    } finally {
      setSubmitting(false);
    }
  };

  const renderStepDots = () => (
    <View style={styles.dotsContainer}>
      {[0, 1, 2].map(i => (
        <View
          key={i}
          style={[styles.dot, step === i && styles.dotActive]}
        />
      ))}
    </View>
  );

  const renderIconPicker = () => (
    <ScrollView showsVerticalScrollIndicator={false} style={styles.scrollContent}>
      <View style={styles.explainerContainer}>
        <Text style={styles.explainerText}>
          Pick an icon that represents your friend. You can give 1 badge per friend — they can feature up to 3 on their profile.
        </Text>
      </View>
      {BADGE_ICON_CATEGORIES.map(category => (
        <View key={category.title} style={styles.categorySection}>
          <Text style={styles.categoryTitle}>{category.title}</Text>
          <View style={styles.iconGrid}>
            {category.icons.map(iconName => (
              <TouchableOpacity
                key={iconName}
                onPress={() => {
                  lightHaptic();
                  setSelectedIcon(iconName);
                }}
                style={[
                  styles.iconCell,
                  selectedIcon === iconName && styles.iconCellSelected,
                ]}
              >
                <BadgeIcon name={iconName} size={32} />
                <Text style={styles.iconLabel} numberOfLines={1}>
                  {BADGE_ICON_LABELS[iconName] || iconName.split('-')[0]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      ))}
    </ScrollView>
  );

  const renderMessageInput = () => (
    <View style={styles.messageContainer}>
      <View style={styles.selectedIconPreview}>
        <BadgeIcon name={selectedIcon} size={48} />
        <Text style={styles.selectedIconLabel}>
          {BADGE_ICON_LABELS[selectedIcon] || selectedIcon}
        </Text>
      </View>
      <TextInput
        style={styles.textInput}
        placeholder={`What makes ${friendName} special?`}
        placeholderTextColor={COLORS.text.secondary}
        value={message}
        onChangeText={t => {
          if (t.length <= 50) setMessage(t);
        }}
        maxLength={50}
        multiline={false}
        autoFocus
      />
      <Text style={styles.charCount}>{message.length}/50</Text>
    </View>
  );

  const renderReview = () => (
    <View style={styles.reviewContainer}>
      <Text style={styles.reviewTitle}>Preview</Text>
      <View style={styles.previewCard}>
        <BadgeCard
          badge={{
            id: 'preview',
            giverId: '',
            receiverId: friendId,
            iconName: selectedIcon,
            message: message.trim(),
            isFeatured: false,
            isHidden: false,
            createdAt: '',
            updatedAt: '',
            giverFirstName: 'You',
          }}
          revealAuthor={false}
        />
      </View>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
      <TouchableOpacity
        onPress={handleSubmit}
        disabled={submitting}
        style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
      >
        {submitting ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <Text style={styles.submitButtonText}>
            {existingBadge ? 'Update Badge' : 'Award Badge'}
          </Text>
        )}
      </TouchableOpacity>
      {existingBadge && (
        <TouchableOpacity
          onPress={handleRemove}
          disabled={submitting}
          style={styles.removeButton}
        >
          <Text style={styles.removeButtonText}>Remove Badge</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const canProceed = step === 0 ? !!selectedIcon : step === 1 ? !!message.trim() : false;

  return (
    <Modal visible={visible} transparent animationType="none">
      <Pressable style={styles.overlay} onPress={handleClose}>
        <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: '#000' }, overlayStyle]} />
      </Pressable>

      <Animated.View style={[styles.modalContainer, modalStyle]} pointerEvents="box-none">
        <View style={styles.modal}>
          {/* Header */}
          <View style={styles.header}>
            {step > 0 ? (
              <TouchableOpacity onPress={handleBack} style={styles.backButton}>
                <EvaIcon name="arrow-back" variant="outline" size={24} color={COLORS.text.primary} />
              </TouchableOpacity>
            ) : (
              <View style={styles.backButton} />
            )}
            <Text style={styles.headerTitle}>
              {existingBadge ? 'Edit Badge' : `Badge for ${friendName}`}
            </Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <EvaIcon name="close" variant="outline" size={24} color={COLORS.text.secondary} />
            </TouchableOpacity>
          </View>

          {renderStepDots()}

          {/* Step Content */}
          <View style={styles.stepContent}>
            {step === 0 && renderIconPicker()}
            {step === 1 && renderMessageInput()}
            {step === 2 && renderReview()}
          </View>

          {/* Next Button (steps 0 & 1) */}
          {step < 2 && (
            <TouchableOpacity
              onPress={handleNext}
              disabled={!canProceed}
              style={[styles.nextButton, !canProceed && styles.nextButtonDisabled]}
            >
              <Text style={[styles.nextButtonText, !canProceed && styles.nextButtonTextDisabled]}>
                Next
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modal: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: '92%',
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontFamily: FONTS.semiBold,
    fontSize: FONT_SIZES.lg,
    color: COLORS.text.primary,
    flex: 1,
    textAlign: 'center',
  },
  closeButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 12,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.borderLight,
  },
  dotActive: {
    backgroundColor: '#437FFF',
    width: 20,
  },
  stepContent: {
    flex: 1,
    minHeight: 300,
  },
  scrollContent: {
    paddingHorizontal: 16,
  },
  explainerContainer: {
    paddingVertical: 10,
    paddingHorizontal: 4,
    marginBottom: 8,
  },
  explainerText: {
    fontFamily: FONTS.regular,
    fontSize: FONT_SIZES.sm,
    color: COLORS.text.secondary,
    lineHeight: LINE_HEIGHTS.md,
    textAlign: 'center' as const,
  },
  categorySection: {
    marginBottom: 16,
  },
  categoryTitle: {
    fontFamily: FONTS.semiBold,
    fontWeight: '600' as const,
    fontSize: FONT_SIZES.sm,
    color: COLORS.text.secondary,
    marginBottom: 8,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.3,
  },
  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  iconCell: {
    width: '23%',
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: COLORS.card,
  },
  iconCellSelected: {
    borderWidth: 2,
    borderColor: COLORS.primaryAccent,
    backgroundColor: COLORS.primaryLight,
  },
  iconLabel: {
    fontFamily: FONTS.regular,
    fontSize: FONT_SIZES.xs,
    color: COLORS.text.secondary,
    marginTop: 4,
    textAlign: 'center',
  },
  messageContainer: {
    padding: 24,
    alignItems: 'center',
  },
  selectedIconPreview: {
    alignItems: 'center',
    marginBottom: 24,
  },
  selectedIconLabel: {
    fontFamily: FONTS.medium,
    fontSize: FONT_SIZES.md,
    color: COLORS.text.primary,
    marginTop: 8,
  },
  textInput: {
    width: '100%',
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontFamily: FONTS.regular,
    fontSize: FONT_SIZES.base,
    color: COLORS.text.primary,
  },
  charCount: {
    fontFamily: FONTS.regular,
    fontSize: FONT_SIZES.sm,
    color: COLORS.text.secondary,
    alignSelf: 'flex-end',
    marginTop: 6,
  },
  reviewContainer: {
    padding: 24,
    alignItems: 'center',
  },
  reviewTitle: {
    fontFamily: FONTS.semiBold,
    fontSize: FONT_SIZES.lg,
    color: COLORS.text.primary,
    marginBottom: 16,
  },
  previewCard: {
    marginBottom: 24,
  },
  errorText: {
    fontFamily: FONTS.regular,
    fontSize: FONT_SIZES.sm,
    color: '#EF4444',
    marginBottom: 12,
    textAlign: 'center',
  },
  submitButton: {
    backgroundColor: '#437FFF',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 14,
    width: '100%',
    alignItems: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontFamily: FONTS.bold,
    fontSize: FONT_SIZES.base,
    color: '#fff',
  },
  removeButton: {
    marginTop: 10,
    paddingVertical: 12,
    width: '100%',
    alignItems: 'center',
  },
  removeButtonText: {
    fontFamily: FONTS.medium,
    fontSize: FONT_SIZES.base,
    color: '#EF4444',
  },
  nextButton: {
    backgroundColor: '#437FFF',
    marginHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  nextButtonDisabled: {
    backgroundColor: COLORS.card,
  },
  nextButtonText: {
    fontFamily: FONTS.bold,
    fontSize: FONT_SIZES.base,
    color: '#fff',
  },
  nextButtonTextDisabled: {
    color: COLORS.text.secondary,
  },
});
