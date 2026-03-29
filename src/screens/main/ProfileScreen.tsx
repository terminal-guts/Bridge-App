import React, { useEffect, useRef } from 'react';
import { View, ScrollView, TouchableOpacity, RefreshControl, Text, Animated } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle } from 'react-native-svg';
import { FONTS, FONT_SIZES, LINE_HEIGHTS } from '../../constants/typography';
import { COLORS } from '../../theme/colors';
import { SHADOWS } from '../../theme/shadows';
import { AVATAR_SIZE_XL } from '../../constants';
import { styled } from 'nativewind';
import { Body, Button, ProfileSkeleton, ScreenWrapper } from '../../components/ui';
import { NavigationProp } from '@react-navigation/native';
import { MainTabParamList } from '../../types';
import { OfflineBanner } from '../../components/ui/OfflineBanner';
import { ProfileCompletionBanner } from '../../components/profile/ProfileCompletionBanner';
import { GuideTarget } from '../../components/guides';
import { EvaIcon } from '../../components/icons';
import { lightHaptic } from '../../utils/haptics';
import { createLogger } from '../../utils/secureLogger';
import { getOptimizedImageUrl } from '../../utils/imageUtils';
import { useProfileScreen } from './ProfileScreen.hooks';
import { AboutTab, BadgesTab } from './ProfileScreen.sections';
import { QuestionsTab } from './ProfileScreen.questions';
import { ProfileModals } from './ProfileScreen.modals';

const logger = createLogger('ProfileScreen');

/** Karma progress toward next milestone (25 → 100 → beyond) */
const getKarmaProgress = (karma: number): number => {
  if (karma >= 100) return 1;
  if (karma >= 25) return (karma - 25) / 75;
  return karma / 25;
};

/** Color for karma progress ring based on tier */
const getKarmaRingColor = (karma: number): string => {
  if (karma >= 100) return COLORS.warning.icon;
  if (karma >= 25) return COLORS.primaryAccent; // blue
  return COLORS.emerald; // green
};

/** Format "Matchmaker since Mar 2026" */
const formatJoinDate = (iso: string): string => {
  const d = new Date(iso);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `Matchmaker since ${months[d.getMonth()]} ${d.getFullYear()}`;
};

/** Progress ring around avatar */
const AvatarProgressRing: React.FC<{ size: number; progress: number; color: string; children: React.ReactNode }> = ({ size, progress, color, children }) => {
  const strokeWidth = 3;
  const radius = (size + strokeWidth * 2) / 2;
  const svgSize = size + strokeWidth * 4;
  const circumference = 2 * Math.PI * radius;

  return (
    <View style={{ width: svgSize, height: svgSize, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={svgSize} height={svgSize} style={{ position: 'absolute' }}>
        {/* Background track */}
        <Circle
          cx={svgSize / 2} cy={svgSize / 2} r={radius}
          stroke="rgba(0,0,0,0.04)" strokeWidth={strokeWidth} fill="none"
        />
        {/* Progress arc */}
        <Circle
          cx={svgSize / 2} cy={svgSize / 2} r={radius}
          stroke={color} strokeWidth={strokeWidth} fill="none"
          strokeLinecap="round"
          strokeDasharray={`${circumference * progress} ${circumference * (1 - progress)}`}
          strokeDashoffset={circumference * 0.25}
          rotation={-90} origin={`${svgSize / 2}, ${svgSize / 2}`}
        />
      </Svg>
      {children}
    </View>
  );
};

/** Hook for staggered fade-in animations */
const useStaggeredFadeIn = (count: number, delay = 80) => {
  const anims = useRef(Array.from({ length: count }, () => new Animated.Value(0))).current;

  useEffect(() => {
    const animations = anims.map((anim, i) =>
      Animated.timing(anim, {
        toValue: 1,
        duration: 350,
        delay: i * delay,
        useNativeDriver: true,
      })
    );
    Animated.stagger(delay, animations).start();
  }, []);

  return anims;
};

interface ProfileScreenProps {
  navigation: NavigationProp<MainTabParamList, 'Profile'>;
}

const StyledView = styled(View) as typeof View;
const StyledScrollView = styled(ScrollView) as typeof ScrollView;
const StyledImage = styled(Image) as typeof Image;
const StyledTouchableOpacity = styled(TouchableOpacity) as typeof TouchableOpacity;

export const ProfileScreen: React.FC<ProfileScreenProps> = ({ navigation: _navigation }) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const navigation = _navigation as any;
  const hook = useProfileScreen(navigation);

  if (hook.loading) {
    return (
      <ScreenWrapper>
        <ProfileSkeleton />
      </ScreenWrapper>
    );
  }

  if (!hook.profile) {
    return (
      <ScreenWrapper>
        <StyledView className="flex-1 justify-center items-center px-6">
          <Body className="text-neutral-600">We couldn't load your profile. Check your connection and try again.</Body>
          <Button onPress={hook.loadProfile} variant="primary" className="mt-4">
            Try Again
          </Button>
        </StyledView>
      </ScreenWrapper>
    );
  }

  const { profile } = hook;

  return (
    <ScreenWrapper>
      <OfflineBanner />
      {profile.role !== 'matchmaker' && (
        <ProfileCompletionBanner
          profile={profile}
          onPress={() => navigation.navigate('ProfileEdit')}
        />
      )}

      <StyledScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        removeClippedSubviews={true}
        nestedScrollEnabled={true}
        refreshControl={
          <RefreshControl
            refreshing={hook.refreshing}
            onRefresh={hook.handleRefresh}
            tintColor={COLORS.primaryAccent}
          />
        }
      >
        {/* Header with Settings (and Preview/Edit for daters) */}
        <StyledView className={profile.role === 'matchmaker' ? '' : 'bg-white border-b border-neutral-200'}>
          {/* Warm gradient behind avatar area for matchmakers (#10) */}
          {profile.role === 'matchmaker' && (
            <LinearGradient
              colors={['#FFF5ED', '#FEF0E3', COLORS.screenBackground]}
              locations={[0, 0.5, 1]}
              style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 280 }}
            />
          )}
          <StyledView className="px-4 py-3 flex-row justify-between items-center">
            <Text style={{ fontFamily: FONTS.bold, fontWeight: '700' as const, fontSize: FONT_SIZES['5xl'], lineHeight: LINE_HEIGHTS['5xl'], color: COLORS.text.black, letterSpacing: -0.5 }}>Your Profile</Text>
            <StyledView className="flex-row items-center" style={{ gap: 4 }}>
              {profile.role !== 'matchmaker' && (
                <StyledTouchableOpacity
                  onPress={() => { lightHaptic(); navigation.navigate('ProfilePreview'); }}
                  hitSlop={{ top: 10, bottom: 10, left: 6, right: 6 }}
                  accessibilityLabel="Preview profile"
                  accessibilityRole="button"
                >
                  <EvaIcon name="eye" variant="outline" size={24} color={COLORS.purple} />
                </StyledTouchableOpacity>
              )}
              {profile.role !== 'matchmaker' && (
                <StyledTouchableOpacity
                  onPress={() => { lightHaptic(); navigation.navigate('ProfileEdit'); }}
                  hitSlop={{ top: 10, bottom: 10, left: 6, right: 6 }}
                  accessibilityLabel="Edit profile"
                  accessibilityRole="button"
                >
                  <EvaIcon name="edit-2" variant="outline" size={24} color={COLORS.primaryAccent} />
                </StyledTouchableOpacity>
              )}
              <StyledTouchableOpacity
                onPress={() => { lightHaptic(); navigation.navigate('Settings'); }}
                hitSlop={{ top: 10, bottom: 10, left: 6, right: 6 }}
                accessibilityLabel="Settings"
                accessibilityRole="button"
              >
                <EvaIcon name="settings-2" variant="outline" size={24} color={COLORS.navInactiveIcon} />
              </StyledTouchableOpacity>
            </StyledView>
          </StyledView>

          {/* Profile Photo and Name */}
          <StyledView className="px-4 pb-4">
            <StyledView className="items-center">
              {/* Profile Photo Circle — with progress ring for matchmakers (#6) */}
              {profile.photos && profile.photos.length > 0 && (profile.photos.find(p => p.isMain) || profile.photos[0])?.url && !hook.photoLoadFailed ? (
                profile.role === 'matchmaker' ? (
                  <View style={{
                    marginBottom: 12,
                    borderRadius: (AVATAR_SIZE_XL + 16) / 2,
                    ...SHADOWS.xl,
                  }}>
                    <AvatarProgressRing
                      size={AVATAR_SIZE_XL}
                      progress={getKarmaProgress(profile.karma?.karma_points ?? 0)}
                      color={getKarmaRingColor(profile.karma?.karma_points ?? 0)}
                    >
                      <StyledImage
                        source={{ uri: getOptimizedImageUrl((profile.photos.find(p => p.isMain) || profile.photos[0]).url, AVATAR_SIZE_XL) }}
                        className="rounded-full bg-neutral-200"
                        style={{ width: AVATAR_SIZE_XL, height: AVATAR_SIZE_XL } as any}
                        contentFit="cover"
                        transition={200}
                        cachePolicy="memory-disk"
                        priority="high"
                        onError={() => { logger.warn('Profile photo failed to load'); hook.setPhotoLoadFailed(true); }}
                      />
                    </AvatarProgressRing>
                  </View>
                ) : (
                  <View style={{
                    marginBottom: 12,
                    borderRadius: AVATAR_SIZE_XL / 2,
                    ...SHADOWS.xl,
                  }}>
                    <StyledImage
                      source={{ uri: (profile.photos.find(p => p.isMain) || profile.photos[0]).url }}
                      style={{
                        width: AVATAR_SIZE_XL,
                        height: AVATAR_SIZE_XL,
                        borderRadius: AVATAR_SIZE_XL / 2,
                        borderWidth: 2,
                        borderColor: 'rgba(255,255,255,0.9)',
                        backgroundColor: COLORS.backgroundGrayMedium,
                      } as any}
                      contentFit="cover"
                      transition={200}
                      cachePolicy="memory-disk"
                      priority="high"
                      onError={() => { logger.warn('Profile photo failed to load'); hook.setPhotoLoadFailed(true); }}
                    />
                  </View>
                )
              ) : (
                <StyledView
                  className="w-24 h-24 rounded-full mb-3 bg-neutral-200 items-center justify-center border-2 border-neutral-100"
                  style={{ ...SHADOWS.lg }}
                >
                  <EvaIcon name="person" variant="outline" size={40} color={COLORS.text.placeholder} />
                </StyledView>
              )}

              {/* Name & Karma Badge — hidden for matchmakers */}
              <StyledView className="flex-row items-center mb-4" style={{ gap: 8 }}>
                <Text style={{ fontFamily: FONTS.bold, fontWeight: '700' as const, fontSize: FONT_SIZES['4xl'], lineHeight: LINE_HEIGHTS['4xl'], color: COLORS.text.black, letterSpacing: -0.3 }}>{profile.firstName}</Text>
                {profile.role !== 'matchmaker' && (
                  <StyledTouchableOpacity
                    onPress={() => hook.setShowKarmaInfoModal(true)}
                    activeOpacity={0.75}
                    style={{
                      flexDirection: 'row', alignItems: 'center',
                      paddingHorizontal: 10, paddingVertical: 10,
                      backgroundColor: 'rgba(52, 199, 89, 0.1)',
                      borderWidth: 1, borderColor: COLORS.success,
                      borderRadius: 999, gap: 4,
                    }}>
                    <EvaIcon name="star" variant="outline" size={12} color={COLORS.success} />
                    <Text style={{ fontSize: FONT_SIZES.xs, lineHeight: LINE_HEIGHTS.xs, color: COLORS.success, fontFamily: FONTS.semiBold }}>
                      {profile.karma?.karma_points ?? 0} pts
                    </Text>
                  </StyledTouchableOpacity>
                )}
              </StyledView>

              {/* Friends Section — hidden for matchmakers */}
              {profile.role !== 'matchmaker' && (
              <StyledView className="flex-row items-center space-x-3">
                <StyledTouchableOpacity
                  onPress={() => navigation.navigate('Community')}
                  className="bg-neutral-100 px-4 py-2 rounded-full flex-row items-center"
                  style={SHADOWS.md}
                  accessibilityLabel={`View ${hook.friendCount} friend${hook.friendCount !== 1 ? 's' : ''}`}
                  accessibilityRole="button"
                >
                  <EvaIcon name="people" variant="outline" size={16} color={COLORS.navInactiveIcon} />
                  <Body className="text-neutral-700 text-sm font-medium ml-1.5">
                    {hook.friendCount} {hook.friendCount === 1 ? 'Friend' : 'Friends'}
                  </Body>
                </StyledTouchableOpacity>
                <StyledTouchableOpacity
                  onPress={() => navigation.navigate('ContactInvite')}
                  className="bg-primary-500 px-4 py-2 rounded-full flex-row items-center"
                  style={SHADOWS.accentBlue}
                  accessibilityLabel="Add friends"
                  accessibilityRole="button"
                >
                  <EvaIcon name="person-add" variant="outline" size={16} color="white" />
                  <Body className="text-white text-sm font-medium ml-1.5">Add Friends</Body>
                </StyledTouchableOpacity>
              </StyledView>
              )}
            </StyledView>
          </StyledView>

          {/* Matchmaker profile section — v6 warm layout */}
          {profile.role === 'matchmaker' ? (
            <MatchmakerSection profile={profile} hook={hook} navigation={navigation} />
          ) : (
            /* Tab Bar — dater only */
            <TabBar
              activeTab={hook.activeTab}
              onTabChange={hook.setActiveTab}
              questionsCount={profile.deepQuestions?.length || 0}
              badgesCount={hook.badges.length}
            />
          )}
        </StyledView>

        {/* Tab Content — dater only */}
        {profile.role !== 'matchmaker' && hook.activeTab === 'about' && (
          <AboutTab profile={profile} navigation={navigation} />
        )}
        {profile.role !== 'matchmaker' && hook.activeTab === 'badges' && (
          <BadgesTab
            badges={hook.badges}
            badgesLoading={hook.badgesLoading}
            onToggleFeatured={hook.handleToggleFeaturedBadge}
            onToggleHidden={hook.handleToggleHiddenBadge}
          />
        )}
        {profile.role !== 'matchmaker' && hook.activeTab === 'questions' && (
          <QuestionsTab
            profile={profile}
            loading={hook.loading}
            inlineEditSlot={hook.inlineEditSlot}
            inlineEditText={hook.inlineEditText}
            inlineEditSaving={hook.inlineEditSaving}
            answerMoreExpanded={hook.answerMoreExpanded}
            showAnswerModal={hook.showAnswerModal}
            selectedQuestionToAnswer={hook.selectedQuestionToAnswer}
            selectedSlotIndex={hook.selectedSlotIndex}
            onSetInlineEditText={hook.setInlineEditText}
            onSetInlineEditSlot={hook.setInlineEditSlot}
            onSetAnswerMoreExpanded={hook.setAnswerMoreExpanded}
            onSetSelectedSlotIndex={hook.setSelectedSlotIndex}
            onSetShowQuestionSelectionModal={hook.setShowQuestionSelectionModal}
            onSetSelectedQuestionToAnswer={hook.setSelectedQuestionToAnswer}
            onSetShowAnswerModal={hook.setShowAnswerModal}
            onSetCurrentEditingQuestion={hook.setCurrentEditingQuestion}
            onSetShowEditAnswerModal={hook.setShowEditAnswerModal}
            onSetProfile={hook.setProfile as any}
            onShowSlotActions={hook.showSlotActions}
            onHandleInlineSave={hook.handleInlineSave}
            isMountedRef={hook.isMountedRef}
          />
        )}
      </StyledScrollView>

      {/* All Modals */}
      <ProfileModals
        profile={profile}
        showEditAnswerModal={hook.showEditAnswerModal}
        selectedQuestionForEdit={hook.selectedQuestionForEdit}
        currentEditingQuestion={hook.currentEditingQuestion}
        onSaveEditedAnswer={hook.handleSaveEditedAnswer}
        onCloseEditAnswerModal={() => {
          hook.setShowEditAnswerModal(false);
          hook.setSelectedQuestionForEdit(null);
          hook.setCurrentEditingQuestion(null);
          hook.setSelectedSlotIndex(null);
        }}
        onChangeQuestion={hook.currentEditingQuestion ? hook.handleChangeQuestion : undefined}
        showQuestionSelectionModal={hook.showQuestionSelectionModal}
        onCloseQuestionSelectionModal={() => hook.setShowQuestionSelectionModal(false)}
        onQuestionSelected={hook.handleQuestionSelected}
        onChangeToAnsweredQuestion={hook.handleChangeToAnsweredQuestion}
        showAnswerModal={hook.showAnswerModal}
        selectedQuestionToAnswer={hook.selectedQuestionToAnswer}
        selectedSlotIndex={hook.selectedSlotIndex}
        onSaveNewAnswer={hook.handleSaveNewAnswer}
        onCloseAnswerModal={() => {
          hook.setShowAnswerModal(false);
          hook.setSelectedQuestionToAnswer(null);
          hook.setSelectedSlotIndex(null);
        }}
        showChangeQuestionModal={hook.showChangeQuestionModal}
        onCloseChangeQuestionModal={() => hook.setShowChangeQuestionModal(false)}
        onChangeToAnsweredQuestionFromModal={hook.handleChangeToAnsweredQuestion}
        showPhotoCarousel={hook.showPhotoCarousel}
        photoCarouselIndex={hook.photoCarouselIndex}
        onClosePhotoCarousel={() => hook.setShowPhotoCarousel(false)}
        showKarmaInfoModal={hook.showKarmaInfoModal}
        onCloseKarmaInfoModal={() => hook.setShowKarmaInfoModal(false)}
        celebrationActive={hook.celebrationActive}
        confettiRef={hook.confettiRef}
      />
    </ScreenWrapper>
  );
};

// ─── Matchmaker Section (private component) ─────────────────────────

interface MatchmakerSectionProps {
  profile: any;
  hook: ReturnType<typeof useProfileScreen>;
  navigation: any;
}

const MatchmakerSection: React.FC<MatchmakerSectionProps> = ({ profile, hook, navigation }) => {
  // Staggered fade-in for stats (#5) — 4 items: karma, votes, assists, rank card
  const fadeAnims = useStaggeredFadeIn(4);

  return (
    <StyledView style={{ paddingHorizontal: 24, paddingBottom: 32, paddingTop: 0, flex: 1, backgroundColor: 'transparent' }}>
      {/* Matchmaker badge + since date (#7) */}
      <View style={{ alignItems: 'center', marginBottom: 16 }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: COLORS.tier1.lightBg,
            borderWidth: 1,
            borderColor: 'rgba(67, 127, 255, 0.15)',
            borderRadius: 999,
            paddingHorizontal: 14,
            paddingVertical: 6,
            gap: 6,
          }}
          accessibilityLabel="Matchmaker role badge"
        >
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.primaryAccent }} />
          <Text style={{ color: COLORS.primaryAccent, fontFamily: FONTS.semiBold, fontSize: FONT_SIZES.sm, lineHeight: LINE_HEIGHTS.sm }}>
            Matchmaker
          </Text>
        </View>
        {profile.createdAt && (
          <Text style={{ color: COLORS.text.light, fontFamily: FONTS.regular, fontSize: FONT_SIZES.xs, lineHeight: LINE_HEIGHTS.xs, marginTop: 6 }}>
            {formatJoinDate(profile.createdAt)}
          </Text>
        )}
      </View>

      {/* YOUR IMPACT section header (#2) */}
      <Text style={{
        fontFamily: FONTS.semiBold,
        fontSize: FONT_SIZES.xs,
        lineHeight: LINE_HEIGHTS.xs,
        color: COLORS.text.light,
        textTransform: 'uppercase',
        letterSpacing: 1.2,
        marginBottom: 10,
      }}>
        Your Impact
      </Text>

      {/* Stats dashboard — 3-column with animated entrance (#5) */}
      <View style={{ flexDirection: 'row', gap: 10, marginBottom: 12 }}>
        {/* Karma */}
        <Animated.View style={{ flex: 1, opacity: fadeAnims[0], transform: [{ translateY: fadeAnims[0].interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }] }}>
          <View
            style={{
              backgroundColor: COLORS.backgroundSuccessBadge,
              borderRadius: 14,
              paddingVertical: 16,
              paddingHorizontal: 8,
              alignItems: 'center',
              borderWidth: 1,
              borderColor: 'rgba(16, 185, 129, 0.12)',
              ...SHADOWS.sm,
            }}
          >
            <Text style={{ fontSize: FONT_SIZES['4xl'], fontFamily: FONTS.extraBold, lineHeight: LINE_HEIGHTS['4xl'], color: COLORS.emerald, letterSpacing: -0.5 }}>
              {profile.karma?.karma_points ?? 0}
            </Text>
            <Text style={{ fontSize: FONT_SIZES.xs, fontFamily: FONTS.semiBold, lineHeight: LINE_HEIGHTS.xs, color: COLORS.emerald, marginTop: 6, textTransform: 'uppercase', letterSpacing: 0.3 }}>
              Karma
            </Text>
          </View>
        </Animated.View>
        {/* Votes */}
        <Animated.View style={{ flex: 1, opacity: fadeAnims[1], transform: [{ translateY: fadeAnims[1].interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }] }}>
          <View
            style={{
              backgroundColor: COLORS.tier1.lightBg,
              borderRadius: 14,
              paddingVertical: 16,
              paddingHorizontal: 8,
              alignItems: 'center',
              borderWidth: 1,
              borderColor: 'rgba(67, 127, 255, 0.12)',
              ...SHADOWS.sm,
            }}
          >
            <Text style={{ fontSize: FONT_SIZES['4xl'], fontFamily: FONTS.extraBold, lineHeight: LINE_HEIGHTS['4xl'], color: COLORS.primaryAccent, letterSpacing: -0.5 }}>
              {(profile.karma as any)?.total_votes ?? 0}
            </Text>
            <Text style={{ fontSize: FONT_SIZES.xs, fontFamily: FONTS.semiBold, lineHeight: LINE_HEIGHTS.xs, color: COLORS.primaryAccent, marginTop: 6, textTransform: 'uppercase', letterSpacing: 0.3 }}>
              Votes
            </Text>
          </View>
        </Animated.View>
        {/* Assists */}
        <Animated.View style={{ flex: 1, opacity: fadeAnims[2], transform: [{ translateY: fadeAnims[2].interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }] }}>
          <View
            style={{
              backgroundColor: COLORS.backgroundSoftYellow,
              borderRadius: 14,
              paddingVertical: 16,
              paddingHorizontal: 8,
              alignItems: 'center',
              borderWidth: 1,
              borderColor: 'rgba(245, 158, 11, 0.12)',
              ...SHADOWS.sm,
            }}
          >
            <Text style={{ fontSize: FONT_SIZES['4xl'], fontFamily: FONTS.extraBold, lineHeight: LINE_HEIGHTS['4xl'], color: COLORS.warning.icon, letterSpacing: -0.5 }}>
              {profile.karma?.total_assists ?? 0}
            </Text>
            <Text style={{ fontSize: FONT_SIZES.xs, fontFamily: FONTS.semiBold, lineHeight: LINE_HEIGHTS.xs, color: COLORS.warning.icon, marginTop: 6, textTransform: 'uppercase', letterSpacing: 0.3 }}>
              Assists
            </Text>
          </View>
        </Animated.View>
      </View>

      {/* Not in the matching pool info line */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 16, minHeight: 44 }}>
        <EvaIcon name="info" variant="outline" size={14} color={COLORS.text.light} />
        <Text style={{ color: COLORS.text.light, fontFamily: FONTS.medium, fontSize: FONT_SIZES.sm, lineHeight: LINE_HEIGHTS.sm }}>
          Not in the matching pool
        </Text>
      </View>

      {/* Community Rank card — tappable to open leaderboard (#4), animated (#5) */}
      <Animated.View style={{ opacity: fadeAnims[3], transform: [{ translateY: fadeAnims[3].interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }] }}>
        <TouchableOpacity
          onPress={() => { lightHaptic(); navigation.navigate('Leaderboard'); }}
          activeOpacity={0.7}
          accessibilityLabel={hook.communityRank != null ? `Community rank ${hook.communityRank}, tap to view leaderboard` : 'View leaderboard'}
          accessibilityRole="button"
          style={{
            backgroundColor: COLORS.card,
            borderRadius: 14,
            paddingVertical: 14,
            paddingHorizontal: 16,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
            marginBottom: 20,
            borderWidth: 1,
            borderColor: COLORS.borderSubtle,
            ...SHADOWS.sm,
          }}
        >
          <View style={{ width: 3, height: 36, borderRadius: 2, backgroundColor: COLORS.purple }} />
          <View
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              backgroundColor: 'rgba(124, 58, 237, 0.08)',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <EvaIcon name="award" variant="outline" size={18} color={COLORS.purple} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: FONT_SIZES['3xl'], fontFamily: FONTS.extraBold, lineHeight: LINE_HEIGHTS['3xl'], color: COLORS.text.heading, letterSpacing: -0.5 }}>
              {hook.communityRank != null ? `#${hook.communityRank}` : '—'}
            </Text>
            <Text style={{ fontFamily: FONTS.regular, fontSize: FONT_SIZES.xs, lineHeight: LINE_HEIGHTS.xs, color: COLORS.text.secondary, marginTop: 1 }}>
              Community rank
            </Text>
          </View>
          {hook.rankChange !== 0 && (
            <Text style={{ color: hook.rankChange > 0 ? COLORS.success : COLORS.error, fontSize: FONT_SIZES.xs, lineHeight: LINE_HEIGHTS.xs, fontFamily: FONTS.semiBold }}>
              {hook.rankChange > 0 ? '▲' : '▼'} {Math.abs(hook.rankChange)}
            </Text>
          )}
          <EvaIcon name="chevron-right" variant="outline" size={20} color={COLORS.text.light} />
        </TouchableOpacity>
      </Animated.View>

      {/* Change Photo link */}
      <TouchableOpacity
        onPress={() => { lightHaptic(); navigation.navigate('EditPhotos'); }}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: 44,
          paddingVertical: 12,
          gap: 6,
        }}
        activeOpacity={0.6}
        accessibilityLabel="Change photo"
        accessibilityRole="button"
      >
        <EvaIcon name="camera" variant="outline" size={16} color={COLORS.text.secondary} />
        <Text style={{ color: COLORS.text.secondary, fontFamily: FONTS.medium, fontSize: FONT_SIZES.base, lineHeight: LINE_HEIGHTS.base }}>
          Change Photo
        </Text>
      </TouchableOpacity>
    </StyledView>
  );
};

// ─── Tab Bar with animated sliding indicator ───────────────────────

interface TabBarProps {
  activeTab: 'about' | 'badges' | 'questions';
  onTabChange: (tab: 'about' | 'badges' | 'questions') => void;
  questionsCount: number;
  badgesCount: number;
}

const TAB_ORDER: Array<'about' | 'questions' | 'badges'> = ['about', 'questions', 'badges'];

const TabBar: React.FC<TabBarProps> = ({ activeTab, onTabChange, questionsCount, badgesCount }) => {
  const indicatorAnim = useRef(new Animated.Value(0)).current;
  const containerWidthRef = useRef(0);

  useEffect(() => {
    const idx = TAB_ORDER.indexOf(activeTab);
    Animated.spring(indicatorAnim, {
      toValue: idx,
      damping: 20,
      stiffness: 200,
      mass: 0.8,
      useNativeDriver: true,
    }).start();
  }, [activeTab]);

  const tabWidth = containerWidthRef.current / 3;

  return (
    <View
      style={{ flexDirection: 'row', borderTopWidth: 1, borderTopColor: COLORS.borderSubtle, position: 'relative' }}
      onLayout={(e) => { containerWidthRef.current = e.nativeEvent.layout.width; }}
    >
      {/* Animated sliding indicator */}
      <Animated.View
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          height: 2,
          width: '33.33%',
          backgroundColor: COLORS.primaryAccent,
          borderRadius: 1,
          transform: [{
            translateX: indicatorAnim.interpolate({
              inputRange: [0, 1, 2],
              outputRange: [0, tabWidth || 130, (tabWidth || 130) * 2],
            }),
          }],
        }}
      />
      <StyledTouchableOpacity
        onPress={() => { lightHaptic(); onTabChange('about'); }}
        style={{ width: '33.33%', minHeight: 44, paddingVertical: 12, alignItems: 'center' }}
        accessibilityLabel="About tab"
        accessibilityRole="tab"
        accessibilityState={{ selected: activeTab === 'about' }}
      >
        <Body className={`font-medium ${activeTab === 'about' ? 'text-primary-500' : 'text-neutral-600'}`}>
          About
        </Body>
      </StyledTouchableOpacity>
      <GuideTarget id="questions-tab" style={{ width: '33.33%' }}>
        <StyledTouchableOpacity
          onPress={() => { lightHaptic(); onTabChange('questions'); }}
          style={{ minHeight: 44, paddingVertical: 12, alignItems: 'center' }}
          accessibilityLabel={`Questions tab, ${questionsCount} answered`}
          accessibilityRole="tab"
          accessibilityState={{ selected: activeTab === 'questions' }}
        >
          <Body className={`font-medium ${activeTab === 'questions' ? 'text-primary-500' : 'text-neutral-600'}`}>
            Questions
          </Body>
        </StyledTouchableOpacity>
      </GuideTarget>
      <StyledTouchableOpacity
        onPress={() => { lightHaptic(); onTabChange('badges'); }}
        style={{ width: '33.34%', minHeight: 44, paddingVertical: 12, alignItems: 'center' }}
        accessibilityLabel={`Badges tab, ${badgesCount} badge${badgesCount !== 1 ? 's' : ''}`}
        accessibilityRole="tab"
        accessibilityState={{ selected: activeTab === 'badges' }}
      >
        <Body className={`font-medium ${activeTab === 'badges' ? 'text-primary-500' : 'text-neutral-600'}`}>
          Badges
        </Body>
      </StyledTouchableOpacity>
    </View>
  );
};
