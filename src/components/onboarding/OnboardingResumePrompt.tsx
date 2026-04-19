import React, { useEffect, useState } from 'react';
import { Modal, View, TouchableOpacity, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { H2, Body } from '../ui/Typography';
import { EvaIcon } from '../icons';
import { OVERLAYS } from '../../theme/shadows';

const STORAGE_KEY = '@bridge/seen_post_proposal_prompt';

interface OnboardingResumePromptProps {}

export const OnboardingResumePrompt: React.FC<OnboardingResumePromptProps> = () => {
  const insets = useSafeAreaInsets();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((seen) => {
      if (!seen) {
        setVisible(true);
        AsyncStorage.setItem(STORAGE_KEY, '1').catch(() => {});
      }
    }).catch(() => {});
  }, []);

  const dismiss = () => setVisible(false);

  if (!visible) return null;

  return (
    <Modal visible transparent animationType="slide" statusBarTranslucent onRequestClose={dismiss}>
      <View style={styles.overlay}>
        <TouchableOpacity activeOpacity={1} onPress={dismiss} style={styles.overlayBg} />

        {/* Bottom sheet card */}
        <View
          style={[
            styles.card,
            { paddingBottom: Math.max(insets.bottom + 16, 32) },
          ]}
        >
          <TouchableOpacity
            onPress={dismiss}
            activeOpacity={0.6}
            hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
            style={styles.handleHit}
          >
            <View style={styles.handle} />
          </TouchableOpacity>

          <TouchableOpacity onPress={dismiss} style={styles.closeButton} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <EvaIcon name="close" variant="outline" size={20} color="#9CA3AF" />
          </TouchableOpacity>

          <View style={styles.iconRow}>
            <View style={styles.iconCircle}>
              <EvaIcon name="people" variant="outline" size={28} color="#437FFF" />
            </View>
          </View>

          <H2 style={styles.title}>Keep going — you're almost in.</H2>
          <Body style={styles.body}>
            Finish your profile to get matched.
          </Body>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  overlayBg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: OVERLAYS.medium,
  },
  card: {
    backgroundColor: '#FAFAFA',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 28,
    paddingTop: 12,
  },
  handleHit: {
    alignSelf: 'center',
    paddingVertical: 8,
    paddingHorizontal: 20,
    marginBottom: 4,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#D1D5DB',
  },
  closeButton: {
    alignSelf: 'flex-end',
    marginBottom: 8,
  },
  iconRow: {
    marginBottom: 14,
  },
  iconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#EEF3FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    color: '#101828',
    marginBottom: 8,
  },
  body: {
    color: '#667085',
    lineHeight: 22,
  },
});
