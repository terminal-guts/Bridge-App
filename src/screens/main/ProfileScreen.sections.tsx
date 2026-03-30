/**
 * ProfileScreen Sections
 *
 * Tab content renderers: About, Badges, and Questions tabs.
 * Also includes skeleton loaders and memoized card components.
 */

import React, { useEffect } from 'react';
import { View, TouchableOpacity, ActivityIndicator } from 'react-native';
import ReanimatedAnimated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  cancelAnimation,
} from 'react-native-reanimated';
import { styled } from 'nativewind';
import { FONTS, FONT_SIZES, LINE_HEIGHTS } from '../../constants/typography';
import { COLORS } from '../../theme/colors';
import { SHADOWS } from '../../theme/shadows';
import { H3, Body, Card } from '../../components/ui';
import { UserProfile, DeepQuestionAnswer } from '../../types';
import { FriendBadgeWithGiver } from '../../types/badges';
import { EvaIcon } from '../../components/icons';
import { BadgeIcon } from '../../components/icons/BadgeIcon';
import { GuideTarget } from '../../components/guides';
import { ProfileStrengthDashboard } from '../../components/profile/ProfileStrengthDashboard';
import {
  AboutMeSummary,
  MatchPreferencesSummary,
} from './ProfileScreen.components';
import { lightHaptic } from '../../utils/haptics';

const StyledView = styled(View) as typeof View;
const StyledTouchableOpacity = styled(TouchableOpacity) as typeof TouchableOpacity;

// ─── Skeleton Loaders ────────────────────────────────────────────────

export const QuestionsSkeleton: React.FC = () => {
  const pulseAnim = useSharedValue(0.3);

  useEffect(() => {
    pulseAnim.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1000 }),
        withTiming(0.3, { duration: 1000 }),
      ), -1, false
    );
    return () => cancelAnimation(pulseAnim);
  }, []);

  const pulseStyle = useAnimatedStyle(() => ({ opacity: pulseAnim.value }));

  return (
    <StyledView className="px-4 py-6 bg-neutral-50">
      <ReanimatedAnimated.View style={pulseStyle}>
        <Card className="mb-6" style={{ backgroundColor: COLORS.card }}>
          <StyledView className="flex-row items-center p-4">
            <StyledView className="w-20 h-20 rounded-full bg-neutral-300 mr-5" />
            <StyledView className="flex-1">
              <StyledView className="h-3 bg-neutral-300 rounded mb-2 w-24" />
              <StyledView className="h-5 bg-neutral-300 rounded mb-2 w-32" />
              <StyledView className="h-3 bg-neutral-300 rounded w-40" />
            </StyledView>
          </StyledView>
        </Card>
      </ReanimatedAnimated.View>

      <ReanimatedAnimated.View style={pulseStyle}>
        <Card className="mb-6" style={{ backgroundColor: COLORS.card }}>
          <StyledView className="p-4">
            <StyledView className="h-4 bg-neutral-300 rounded mb-4 w-32 mx-auto" />
            <StyledView className="flex-row items-center justify-between">
              {[1, 2, 3].map((i) => (
                <StyledView key={i} className="flex-1 items-center">
                  <StyledView className="w-14 h-14 rounded-2xl bg-neutral-300 mb-2" />
                  <StyledView className="h-3 bg-neutral-300 rounded w-12 mb-1" />
                  <StyledView className="h-3 bg-neutral-300 rounded w-8" />
                </StyledView>
              ))}
            </StyledView>
          </StyledView>
        </Card>
      </ReanimatedAnimated.View>

      <ReanimatedAnimated.View style={pulseStyle}>
        <Card className="mb-6" style={{ backgroundColor: COLORS.card }}>
          <StyledView className="p-4 flex-row items-center">
            <StyledView className="w-14 h-14 rounded-xl bg-neutral-300 mr-4" />
            <StyledView className="flex-1">
              <StyledView className="h-4 bg-neutral-300 rounded mb-2 w-32" />
              <StyledView className="h-3 bg-neutral-300 rounded w-48" />
            </StyledView>
          </StyledView>
        </Card>
      </ReanimatedAnimated.View>

      <ReanimatedAnimated.View style={pulseStyle}>
        <StyledView className="mb-4">
          <StyledView className="h-5 bg-neutral-300 rounded mb-2 w-40" />
          <StyledView className="h-3 bg-neutral-300 rounded w-56" />
        </StyledView>
        {[1, 2, 3].map((i) => (
          <Card key={i} className="mb-4" style={{ backgroundColor: COLORS.card }}>
            <StyledView className="p-4">
              <StyledView className="flex-row justify-between mb-3">
                <StyledView className="h-4 bg-neutral-300 rounded w-24" />
                <StyledView className="h-4 bg-neutral-300 rounded w-16" />
              </StyledView>
              <StyledView className="h-12 bg-neutral-300 rounded mb-3" />
              <StyledView className="h-20 bg-neutral-300 rounded" />
            </StyledView>
          </Card>
        ))}
      </ReanimatedAnimated.View>
    </StyledView>
  );
};

// ─── Memoized Question Cards ─────────────────────────────────────────

export const UnansweredQuestionCard = React.memo<{
  question: { id: number; question: string };
  onPress: () => void;
}>(({ question, onPress }) => (
  <StyledTouchableOpacity
    onPress={onPress}
    activeOpacity={0.7}
    className="mb-3"
  >
    <Card className="bg-neutral-50 border-2 border-dashed border-neutral-300">
      <StyledView className="flex-row items-center justify-between">
        <StyledView className="flex-1 pr-3">
          <Body className="text-neutral-900 font-medium text-sm">{question.question}</Body>
        </StyledView>
        <StyledView className="w-8 h-8 rounded-full items-center justify-center" style={{ backgroundColor: 'rgba(67, 127, 255, 0.12)' }}>
          <EvaIcon name="plus" variant="outline" size={20} color={COLORS.primaryAccent} />
        </StyledView>
      </StyledView>
    </Card>
  </StyledTouchableOpacity>
));

export const AnsweredQuestionCard = React.memo<{
  question: DeepQuestionAnswer;
  onPress: () => void;
}>(({ question, onPress }) => (
  <StyledTouchableOpacity
    onPress={onPress}
    activeOpacity={0.7}
    className="mb-3"
  >
    <Card className="bg-white border border-neutral-200">
      <Body className="text-neutral-900 font-semibold text-base mb-2">{question.question}</Body>
      <Body className="text-neutral-600 text-sm" numberOfLines={2}>{question.answer}</Body>
    </Card>
  </StyledTouchableOpacity>
));

// ─── About Tab ───────────────────────────────────────────────────────

interface AboutTabProps {
  profile: UserProfile;
  navigation: any;
}

export const AboutTab: React.FC<AboutTabProps> = ({ profile, navigation }) => (
  <StyledView className="px-4 pt-4 pb-6">
    {/* Profile Strength Dashboard */}
    <GuideTarget id="profile-strength-card">
      <ProfileStrengthDashboard
        profile={profile}
        onSectionPress={(section) => {
          lightHaptic();
          switch (section) {
            case 'Match Preferences':
              navigation.navigate('MatchPreferences');
              break;
            case 'Questions':
              // Handled by parent via callback — but we navigate for consistency
              navigation.navigate('Profile', { initialTab: 'questions' });
              break;
            case 'About Me':
            case 'Photos':
            default:
              navigation.navigate('ProfileEdit');
              break;
          }
        }}
      />
    </GuideTarget>

    {/* About Me Summary Card */}
    <AboutMeSummary
      profile={profile}
      onEdit={() => navigation.navigate('ProfileEdit')}
    />

    {/* Match Preferences Summary Card */}
    {profile.preferences && (
      <MatchPreferencesSummary
        preferences={profile.preferences}
        interestedInGenders={profile.interestedInGenders}
        preferredPolitics={profile.preferredPolitics}
        preferredEthnicitiesCount={profile.preferredEthnicities?.length || 0}
        interestsCount={profile.interests?.length || 0}
        valuesCount={profile.values?.length || 0}
        onEdit={() => navigation.navigate('MatchPreferences')}
      />
    )}
  </StyledView>
);

// ─── Badges Tab ──────────────────────────────────────────────────────

interface BadgesTabProps {
  badges: FriendBadgeWithGiver[];
  badgesLoading: boolean;
  onToggleFeatured: (badge: FriendBadgeWithGiver) => void;
  onToggleHidden: (badge: FriendBadgeWithGiver) => void;
}

export const BadgesTab: React.FC<BadgesTabProps> = ({ badges, badgesLoading, onToggleFeatured, onToggleHidden }) => {
  const [showHidden, setShowHidden] = React.useState(false);
  const isUpdatingRef = React.useRef(false);
  const visibleBadges = badges.filter(b => !b.isHidden);
  const hiddenBadges = badges.filter(b => b.isHidden);
  const featured = visibleBadges.filter(b => b.isFeatured);
  const unfeatured = visibleBadges.filter(b => !b.isFeatured);

  if (badgesLoading) {
    return (
      <StyledView className="px-4 py-12 items-center">
        <ActivityIndicator color={COLORS.primaryAccent} />
      </StyledView>
    );
  }

  if (badges.length === 0) {
    return (
      <StyledView className="px-6 py-12 items-center">
        <StyledView style={{
          width: 80, height: 80, borderRadius: 40,
          backgroundColor: 'rgba(67, 127, 255, 0.08)',
          alignItems: 'center', justifyContent: 'center', marginBottom: 16,
        }}>
          <EvaIcon name="award" variant="outline" size={40} color={COLORS.primaryAccent} />
        </StyledView>
        <H3 style={{ fontFamily: FONTS.bold, color: COLORS.text.primary, marginBottom: 8 }}>
          No badges yet
        </H3>
        <Body style={{ color: COLORS.text.secondary, textAlign: 'center', lineHeight: LINE_HEIGHTS.xl, maxWidth: 260 }}>
          When friends award you badges, they'll appear here as mini-testimonials on your profile.
        </Body>
      </StyledView>
    );
  }

  const renderBadgeCard = (badge: FriendBadgeWithGiver, isFeatured: boolean, isHidden = false) => (
    <StyledView
      key={badge.id}
      style={{
        backgroundColor: isFeatured ? COLORS.primaryLight : COLORS.card,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: isFeatured ? 'rgba(37, 99, 235, 0.12)' : COLORS.borderLight,
        paddingHorizontal: 14, paddingVertical: 12, marginBottom: 10,
        flexDirection: 'row', alignItems: 'center', gap: 12,
      }}
    >
      <StyledView style={{
        width: 44, height: 44, borderRadius: 22,
        backgroundColor: isFeatured ? COLORS.card : COLORS.screenBackground,
        alignItems: 'center', justifyContent: 'center',
      }}>
        <BadgeIcon name={badge.iconName} size={26} />
      </StyledView>

      <StyledView style={{ flex: 1 }}>
        <Body style={{
          fontFamily: FONTS.semiBold, fontWeight: '600',
          fontSize: FONT_SIZES.base, color: COLORS.text.primary,
          lineHeight: LINE_HEIGHTS.base, marginBottom: 2,
        }} numberOfLines={2}>
          {badge.message}
        </Body>
        <Body style={{
          fontFamily: FONTS.medium, fontWeight: '500',
          fontSize: FONT_SIZES.sm, color: COLORS.text.secondary,
        }}>
          — {badge.giverFirstName}
        </Body>
      </StyledView>

      {/* Star toggle */}
      <StyledTouchableOpacity
        onPress={() => {
          if (isUpdatingRef.current) return;
          isUpdatingRef.current = true;
          lightHaptic();
          onToggleFeatured(badge);
          setTimeout(() => { isUpdatingRef.current = false; }, 800);
        }}
        activeOpacity={0.6}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        style={{ padding: 4 }}
        accessibilityLabel={isFeatured ? 'Unfeature badge' : 'Feature badge'}
      >
        <EvaIcon
          name="star"
          variant={isFeatured ? 'fill' : 'outline'}
          size={22}
          color={isFeatured ? COLORS.amber : COLORS.border}
        />
      </StyledTouchableOpacity>

    </StyledView>
  );

  return (
    <StyledView className="px-4 pt-4 pb-5">
      {featured.length > 0 && (
        <StyledView style={{ marginBottom: 20 }}>
          <StyledView style={{
            flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10,
          }}>
            <EvaIcon name="star" variant="fill" size={14} color={COLORS.amber} />
            <Body style={{
              fontFamily: FONTS.semiBold, fontWeight: '600',
              fontSize: FONT_SIZES.sm, color: COLORS.amber,
              textTransform: 'uppercase', letterSpacing: 0.5,
            }}>
              Featured ({featured.length}/3)
            </Body>
          </StyledView>
          {featured.map(b => renderBadgeCard(b, true))}
        </StyledView>
      )}

      {unfeatured.length > 0 && (
        <StyledView style={{ marginBottom: 16 }}>
          <StyledView style={{
            flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10,
          }}>
            <EvaIcon name="award" variant="outline" size={14} color={COLORS.text.tertiary} />
            <Body style={{
              fontFamily: FONTS.semiBold, fontWeight: '600',
              fontSize: FONT_SIZES.sm, color: COLORS.text.tertiary,
              textTransform: 'uppercase', letterSpacing: 0.8,
            }}>
              All Badges
            </Body>
          </StyledView>
          {unfeatured.map(b => renderBadgeCard(b, false))}
        </StyledView>
      )}

      {false && hiddenBadges.length > 0 && (
        // Hidden badges section removed — star toggle is the only control.
        // Starred = shown on profile, unstarred = in your list only.
        <StyledView style={{ marginBottom: 20 }}></StyledView>
      )}
    </StyledView>
  );
};

