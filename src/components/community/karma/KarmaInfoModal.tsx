import React from 'react';
import { Modal, View, Text, TouchableOpacity, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FONTS } from '../../../constants/typography';
import { OVERLAYS } from '../../../theme/shadows';

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
            <Ionicons name="star" size={18} color="#34C759" />
            <Text style={styles.title}>Karma Score</Text>
          </View>

          <Text style={styles.body}>
            Your Karma score reflects how much you've helped others find matches. The higher your score, the more frequently you'll receive matches.
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
    backgroundColor: '#FFFFFF',
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
    fontSize: 14,
    lineHeight: 22,
    color: '#4A5568',
    marginBottom: 18,
  },
  btn: {
    backgroundColor: '#437FFF',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  btnText: {
    fontFamily: FONTS.semiBold,
    fontSize: 14,
    color: '#FFFFFF',
  },
});
