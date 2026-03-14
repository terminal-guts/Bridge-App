import React from 'react';
import { Modal, View, Text, TouchableOpacity, Pressable, StyleSheet } from 'react-native';
import { FONTS, FONT_SIZES } from '../../../constants/typography';
import { OVERLAYS } from '../../../theme/shadows';
import { COLORS } from '../../../theme/colors';
import { EvaIcon } from '../../icons';

interface KarmaInfoModalProps {
  visible: boolean;
  onClose: () => void;
}

export function KarmaInfoModal({ visible, onClose }: KarmaInfoModalProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.card} onPress={e => e.stopPropagation()}>

          <View style={styles.header}>
            <EvaIcon name="star" variant="outline" size={18} color="#34C759" />
            <Text style={styles.title}>Karma Score</Text>
          </View>

          <Text style={styles.body}>
            Your Karma reflects how much you've helped others find matches. The higher your score, the higher quality matches you'll receive.
          </Text>

          <TouchableOpacity style={styles.btn} onPress={onClose} activeOpacity={0.85}>
            <Text style={styles.btnText}>Got it</Text>
          </TouchableOpacity>

        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: OVERLAYS.medium,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 20,
    padding: 20,
    width: '100%',
    maxWidth: 340,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  title: {
    fontFamily: FONTS.bold,
    fontSize: 17,
    color: '#0F1724',
  },
  body: {
    fontFamily: FONTS.regular,
    fontSize: FONT_SIZES.base,
    lineHeight: 22,
    color: '#4A5568',
    marginBottom: 18,
  },
  btn: {
    backgroundColor: COLORS.primaryAccent,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  btnText: {
    fontFamily: FONTS.semiBold,
    fontSize: FONT_SIZES.base,
    color: COLORS.card,
  },
});
