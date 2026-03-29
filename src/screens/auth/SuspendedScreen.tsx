import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FONTS, FONT_SIZES, LINE_HEIGHTS } from '../../constants/typography';
import { COLORS } from '../../theme/colors';
import { supabase } from '../../lib/supabase';
import { useNavigation } from '@react-navigation/native';
import type { RootStackParamList } from '../../types';
import { EvaIcon } from '../../components/icons';

interface SuspendedScreenProps {
  reason?: string | null;
}

export default function SuspendedScreen({ reason }: SuspendedScreenProps) {
  const navigation = useNavigation<any>();

  const handleContactSupport = () => {
    navigation.navigate('SupportChat');
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <EvaIcon name="alert-circle" variant="outline" size={64} color={COLORS.rejectRed} />
        </View>

        <Text style={styles.title}>Your account is on hold</Text>

        <Text style={styles.description}>
          We noticed some activity on your account that goes against our community guidelines, so we've temporarily paused it while we look into things.
        </Text>

        {reason && (
          <View style={styles.reasonBox}>
            <Text style={styles.reasonLabel}>What happened</Text>
            <Text style={styles.reasonText}>{reason}</Text>
          </View>
        )}

        <Text style={styles.helpText}>
          Think this is a mix-up? Reach out to our support team and we'll get it sorted out.
        </Text>

        <TouchableOpacity style={styles.supportButton} onPress={handleContactSupport}>
          <EvaIcon name="message-circle" variant="outline" size={20} color={COLORS.card} />
          <Text style={styles.supportButtonText}>Contact Support</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
          <Text style={styles.signOutButtonText}>Sign Out</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.screenBackground,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  iconContainer: {
    marginBottom: 24,
  },
  title: {
    fontFamily: FONTS.bold,
    fontSize: FONT_SIZES['3xl'],
    color: COLORS.text.heading,
    marginBottom: 12,
    textAlign: 'center',
  },
  description: {
    fontFamily: FONTS.regular,
    fontSize: FONT_SIZES.md,
    color: COLORS.text.secondary,
    textAlign: 'center',
    lineHeight: LINE_HEIGHTS.xl,
    marginBottom: 16,
  },
  reasonBox: {
    backgroundColor: COLORS.mismatch.bg,
    borderRadius: 12,
    padding: 16,
    width: '100%',
    marginBottom: 16,
  },
  reasonLabel: {
    fontFamily: FONTS.semiBold,
    fontSize: FONT_SIZES.sm,
    color: COLORS.rejectRed,
    marginBottom: 4,
  },
  reasonText: {
    fontFamily: FONTS.regular,
    fontSize: FONT_SIZES.sm,
    color: COLORS.text.heading,
  },
  helpText: {
    fontFamily: FONTS.regular,
    fontSize: FONT_SIZES.sm,
    color: COLORS.text.secondary,
    textAlign: 'center',
    marginBottom: 24,
  },
  supportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primaryAccent,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    width: '100%',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 12,
  },
  supportButtonText: {
    fontFamily: FONTS.semiBold,
    fontSize: FONT_SIZES.md,
    color: COLORS.card,
  },
  signOutButton: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
  },
  signOutButtonText: {
    fontFamily: FONTS.medium,
    fontSize: FONT_SIZES.md,
    color: COLORS.rejectRed,
  },
});
