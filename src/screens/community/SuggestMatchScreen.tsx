import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { useNavigation } from '@react-navigation/native';
import { FONTS, FONT_SIZES } from '../../constants/typography';
import { COLORS } from '../../theme/colors';
import { getEligibleFriends, createFriendSuggestion } from '../../services/friendProposalService';
import { showToast } from '../../utils/toast';
import type { UserProfile } from '../../types';
import { EvaIcon } from '../../components/icons';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type Step = 'pick_a' | 'pick_b' | 'confirm';

export default function SuggestMatchScreen() {
  const navigation = useNavigation();
  const [step, setStep] = useState<Step>('pick_a');
  const [friends, setFriends] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [friendA, setFriendA] = useState<UserProfile | null>(null);
  const [friendB, setFriendB] = useState<UserProfile | null>(null);

  useEffect(() => {
    (async () => {
      const eligible = await getEligibleFriends();
      setFriends(eligible);
      setLoading(false);
    })();
  }, []);

  const handleSelectFriendA = (friend: UserProfile) => {
    setFriendA(friend);
    setStep('pick_b');
  };

  const handleSelectFriendB = (friend: UserProfile) => {
    setFriendB(friend);
    setStep('confirm');
  };

  const handleBack = () => {
    if (step === 'pick_b') {
      setStep('pick_a');
      setFriendA(null);
    } else if (step === 'confirm') {
      setStep('pick_b');
      setFriendB(null);
    } else {
      navigation.goBack();
    }
  };

  const handleSubmit = async () => {
    if (!friendA || !friendB || submitting) return;
    setSubmitting(true);

    try {
      await createFriendSuggestion(friendA.userId, friendB.userId);
      showToast.success('Suggestion sent!', 'It\'ll go live at the next voting cycle.');
      navigation.goBack();
    } catch (err: any) {
      const msg = err.message || 'Something went wrong';
      if (msg.includes('pending friend suggestion')) {
        showToast.error('Can\'t suggest', 'One of them already has a pending suggestion.');
      } else if (msg.includes('proposal in progress')) {
        showToast.error('Can\'t suggest', 'One of them has a proposal that can\'t be interrupted.');
      } else if (msg.includes('must be your friends')) {
        showToast.error('Can\'t suggest', 'Both must be your friends.');
      } else {
        showToast.error('Failed', msg);
      }
      setSubmitting(false);
    }
  };

  const getPhotoUrl = (profile: UserProfile): string | null => {
    const mainPhoto = profile.photos?.find(p => p.isMain) || profile.photos?.[0];
    return mainPhoto?.url || null;
  };

  const renderFriendItem = ({ item }: { item: UserProfile }) => {
    const photoUrl = getPhotoUrl(item);
    return (
      <TouchableOpacity
        style={styles.friendItem}
        onPress={() => step === 'pick_a' ? handleSelectFriendA(item) : handleSelectFriendB(item)}
      >
        {photoUrl ? (
          <Image source={{ uri: photoUrl }} style={styles.friendPhoto} contentFit="cover" />
        ) : (
          <View style={[styles.friendPhoto, styles.photoPlaceholder]}>
            <EvaIcon name="person" variant="outline" size={24} color="#D0D5DD" />
          </View>
        )}
        <View style={styles.friendInfo}>
          <Text style={styles.friendName}>{item.firstName}, {item.age}</Text>
          {item.currentJob && (
            <Text style={styles.friendJob}>{item.currentJob}</Text>
          )}
        </View>
        <EvaIcon name="arrow-ios-forward" variant="outline" size={20} color="#D0D5DD" />
      </TouchableOpacity>
    );
  };

  const availableFriends = step === 'pick_b'
    ? friends.filter(f => f.userId !== friendA?.userId)
    : friends;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <EvaIcon name="arrow-back" variant="outline" size={24} color="#1A1A1A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {step === 'pick_a' ? 'Pick the first friend' :
           step === 'pick_b' ? 'Pick the second friend' :
           'Confirm match suggestion'}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={COLORS.primaryAccent} />
        </View>
      ) : step === 'confirm' && friendA && friendB ? (
        /* Confirmation screen */
        <View style={styles.confirmContainer}>
          <View style={styles.confirmPhotos}>
            <View style={styles.confirmCard}>
              {getPhotoUrl(friendA) ? (
                <Image source={{ uri: getPhotoUrl(friendA)! }} style={styles.confirmPhoto} contentFit="cover" />
              ) : (
                <View style={[styles.confirmPhoto, styles.photoPlaceholder]}>
                  <EvaIcon name="person" variant="outline" size={40} color="#D0D5DD" />
                </View>
              )}
              <Text style={styles.confirmName}>{friendA.firstName}</Text>
            </View>

            <View style={styles.heartContainer}>
              <EvaIcon name="heart" variant="outline" size={28} color="#FF6B6B" />
            </View>

            <View style={styles.confirmCard}>
              {getPhotoUrl(friendB) ? (
                <Image source={{ uri: getPhotoUrl(friendB)! }} style={styles.confirmPhoto} contentFit="cover" />
              ) : (
                <View style={[styles.confirmPhoto, styles.photoPlaceholder]}>
                  <EvaIcon name="person" variant="outline" size={40} color="#D0D5DD" />
                </View>
              )}
              <Text style={styles.confirmName}>{friendB.firstName}</Text>
            </View>
          </View>

          <Text style={styles.confirmSubtext}>
            The community will vote on whether {friendA.firstName} and {friendB.firstName} should match. Your identity stays anonymous.
          </Text>

          <TouchableOpacity
            style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.submitButtonText}>Suggest Match</Text>
            )}
          </TouchableOpacity>
        </View>
      ) : availableFriends.length === 0 ? (
        <View style={styles.centerContainer}>
          <EvaIcon name="people" variant="outline" size={48} color="#D0D5DD" />
          <Text style={styles.emptyText}>
            {step === 'pick_b'
              ? 'No other eligible friends available.'
              : 'No eligible friends yet. Friends need completed profiles and can\'t have active proposals being decided on.'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={availableFriends}
          renderItem={renderFriendItem}
          keyExtractor={item => item.userId}
          contentContainerStyle={styles.listContent}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.card,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.backgroundProgressTrack,
  },
  headerTitle: {
    fontFamily: FONTS.semiBold,
    fontSize: FONT_SIZES.md,
    color: '#1A1A1A',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    gap: 16,
  },
  emptyText: {
    fontFamily: FONTS.regular,
    fontSize: FONT_SIZES.md,
    color: COLORS.text.label,
    textAlign: 'center',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  friendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.backgroundSubtle,
  },
  friendPhoto: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  photoPlaceholder: {
    backgroundColor: COLORS.backgroundProgressTrack,
    justifyContent: 'center',
    alignItems: 'center',
  },
  friendInfo: {
    flex: 1,
    marginLeft: 12,
  },
  friendName: {
    fontFamily: FONTS.semiBold,
    fontSize: FONT_SIZES.md,
    color: '#1A1A1A',
  },
  friendJob: {
    fontFamily: FONTS.regular,
    fontSize: FONT_SIZES.sm,
    color: COLORS.text.label,
    marginTop: 2,
  },
  confirmContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  confirmPhotos: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 24,
  },
  confirmCard: {
    alignItems: 'center',
  },
  confirmPhoto: {
    width: (SCREEN_WIDTH - 96) / 2,
    height: ((SCREEN_WIDTH - 96) / 2) * 1.2,
    borderRadius: 16,
  },
  confirmName: {
    fontFamily: FONTS.semiBold,
    fontSize: FONT_SIZES.md,
    color: '#1A1A1A',
    marginTop: 8,
  },
  heartContainer: {
    marginBottom: 40,
  },
  confirmSubtext: {
    fontFamily: FONTS.regular,
    fontSize: FONT_SIZES.sm,
    color: COLORS.text.label,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 20,
  },
  submitButton: {
    backgroundColor: COLORS.primaryAccent,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 14,
    width: '100%',
    alignItems: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontFamily: FONTS.semiBold,
    fontSize: FONT_SIZES.md,
    color: COLORS.card,
  },
});
