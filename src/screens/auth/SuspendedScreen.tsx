import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FONTS, FONT_SIZES } from '../../constants/typography';
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
          <EvaIcon name="alert-circle" variant="outline" size={64} color="#FF383C" />
        </View>

        <Text style={styles.title}>Account Suspended</Text>

        <Text style={styles.description}>
          Your account has been temporarily suspended due to reports from other users.
        </Text>

        {reason && (
          <View style={styles.reasonBox}>
            <Text style={styles.reasonLabel}>Reason</Text>
            <Text style={styles.reasonText}>{reason}</Text>
          </View>
        )}

        <Text style={styles.helpText}>
          If you believe this is a mistake, please contact our support team.
        </Text>

        <TouchableOpacity style={styles.supportButton} onPress={handleContactSupport}>
          <EvaIcon name="message-circle" variant="outline" size={20} color="#FFFFFF" />
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
    backgroundColor: COLORS.card,
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
    color: '#1A1A1A',
    marginBottom: 12,
    textAlign: 'center',
  },
  description: {
    fontFamily: FONTS.regular,
    fontSize: FONT_SIZES.md,
    color: COLORS.text.label,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 16,
  },
  reasonBox: {
    backgroundColor: '#FFF1F1',
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
    color: '#1A1A1A',
  },
  helpText: {
    fontFamily: FONTS.regular,
    fontSize: FONT_SIZES.sm,
    color: COLORS.text.label,
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
