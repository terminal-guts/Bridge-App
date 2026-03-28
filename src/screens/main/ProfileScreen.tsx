import React from 'react';
import { View, ScrollView, TouchableOpacity, RefreshControl, Text } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import * as Clipboard from 'expo-clipboard';
import { FONTS, FONT_SIZES } from '../../constants/typography';
import { COLORS } from '../../theme/colors';
import { SHADOWS } from '../../theme/shadows';
import { AVATAR_SIZE_XL } from '../../constants';
import { styled } from 'nativewind';
import { H2, Body, Button, ProfileSkeleton, ScreenWrapper, Display } from '../../components/ui';
import { NavigationProp } from '@react-navigation/native';
import { MainTabParamList } from '../../types';
import { OfflineBanner } from '../../components/ui/OfflineBanner';
import { ProfileCompletionBanner } from '../../components/profile/ProfileCompletionBanner';
import { GuideTarget } from '../../components/guides';
import { EvaIcon } from '../../components/icons';
import { lightHaptic } from '../../utils/haptics';
import { createLogger } from '../../utils/secureLogger';
import { getOptimizedImageUrl } from '../../utils/imageUtils';
import { showToast } from '../../utils/toast';
import { useProfileScreen } from './ProfileScreen.hooks';
import { AboutTab, BadgesTab } from './ProfileScreen.sections';
import { QuestionsTab } from './ProfileScreen.questions';
import { ProfileModals } from './ProfileScreen.modals';

const logger = createLogger('ProfileScreen');

// Rotating matchmaker tips — one shown per day
const MATCHMAKER_TIPS = [
  { icon: 'people' as const, text: 'The best matches come from friends who really know each other.' },
  { icon: 'message-circle' as const, text: 'When you vote, think about who would genuinely make each other smile.' },
  { icon: 'star' as const, text: 'Your karma grows every time you vote — and even more when you get it right.' },
  { icon: 'heart' as const, text: 'Every assist means you helped two people find their person.' },
  { icon: 'trending-up' as const, text: 'Invite more friends to unlock better matches for everyone.' },
  { icon: 'award' as const, text: 'Accurate votes earn 3x more karma than just showing up.' },
  { icon: 'eye' as const, text: 'Pay attention to shared values — they matter more than shared hobbies.' },
];

/** Returns a daily-rotating tip index (stable for the whole day) */
const getDailyTipIndex = () => {
  const daysSinceEpoch = Math.floor(Date.now() / (1000 * 60 * 60 * 24));
  return daysSinceEpoch % MATCHMAKER_TIPS.length;
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
          <Body className="text-neutral-600">Failed to load profile</Body>
          <Button onPress={hook.loadProfile} variant="primary" className="mt-4">
            Retry
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
        <StyledView className="bg-white border-b border-neutral-200">
          <StyledView className="px-4 py-3 flex-row justify-between items-center">
            <Display>Your Profile</Display>
            <StyledView className="flex-row items-center space-x-3">
              {profile.role !== 'matchmaker' && (
                <StyledTouchableOpacity
                  onPress={() => { lightHaptic(); navigation.navigate('ProfilePreview'); }}
                  accessibilityLabel="Preview profile"
                  accessibilityRole="button"
                >
                  <EvaIcon name="eye" variant="outline" size={24} color={COLORS.purple} />
                </StyledTouchableOpacity>
              )}
              {profile.role !== 'matchmaker' && (
                <StyledTouchableOpacity
                  onPress={() => { lightHaptic(); navigation.navigate('ProfileEdit'); }}
                  accessibilityLabel="Edit profile"
                  accessibilityRole="button"
                >
                  <EvaIcon name="edit-2" variant="outline" size={24} color={COLORS.primaryAccent} />
                </StyledTouchableOpacity>
              )}
              <StyledTouchableOpacity
                onPress={() => { lightHaptic(); navigation.navigate('Settings'); }}
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
              {/* Profile Photo Circle */}
              {profile.photos && profile.photos.length > 0 && (profile.photos.find(p => p.isMain) || profile.photos[0])?.url ? (
                <StyledImage
                  source={{ uri: getOptimizedImageUrl((profile.photos.find(p => p.isMain) || profile.photos[0]).url, AVATAR_SIZE_XL) }}
                  className="rounded-full mb-3 bg-neutral-200 border-2 border-neutral-100"
                  style={{
                    width: AVATAR_SIZE_XL,
                    height: AVATAR_SIZE_XL,
                    ...SHADOWS.xl,
                  } as any}
                  contentFit="cover"
                  transition={0}
                  cachePolicy="memory-disk"
                  priority="high"
                  onError={(e) => { logger.warn('Failed to load profile photo:', e.error); }}
                />
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
                <H2 style={{ fontFamily: FONTS.bold, fontSize: 28 }}>{profile.firstName}</H2>
                {profile.role !== 'matchmaker' && (
                  <StyledTouchableOpacity
                    onPress={() => hook.setShowKarmaInfoModal(true)}
                    activeOpacity={0.75}
                    style={{
                      flexDirection: 'row', alignItems: 'center',
                      paddingHorizontal: 8, paddingVertical: 4,
                      backgroundColor: 'rgba(52, 199, 89, 0.1)',
                      borderWidth: 1, borderColor: COLORS.success,
                      borderRadius: 999, gap: 4,
                    }}>
                    <EvaIcon name="star" variant="outline" size={12} color={COLORS.success} />
                    <H2 className="text-xs" style={{ color: COLORS.success, fontWeight: '600', fontFamily: FONTS.semiBold }}>
                      {profile.karma?.karma_points ?? 0} pts
                    </H2>
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
            <StyledView style={{ paddingHorizontal: 24, paddingBottom: 32, paddingTop: 0, flex: 1, backgroundColor: COLORS.screenBackground }}>
              {/* Matchmaker badge */}
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
                  <Text style={{ color: COLORS.primaryAccent, fontFamily: FONTS.semiBold, fontWeight: '600', fontSize: FONT_SIZES.sm }}>
                    Matchmaker
                  </Text>
                </View>
              </View>

              {/* Your Role explainer card */}
              <View
                style={{
                  backgroundColor: COLORS.tier1.lightBg,
                  borderRadius: 14,
                  paddingVertical: 16,
                  paddingHorizontal: 18,
                  marginBottom: 16,
                  borderWidth: 1,
                  borderColor: 'rgba(67, 127, 255, 0.10)',
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 12,
                }}
              >
                <View
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    backgroundColor: COLORS.backgroundIconBlue,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <EvaIcon name="heart" variant="outline" size={18} color={COLORS.primaryAccent} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: FONTS.semiBold, fontWeight: '600', fontSize: FONT_SIZES.base, color: COLORS.text.heading, marginBottom: 2 }}>
                    Your Role
                  </Text>
                  <Text style={{ fontFamily: FONTS.regular, fontWeight: '400', fontSize: FONT_SIZES.sm, color: COLORS.text.secondary, lineHeight: 18 }}>
                    You help friends find their person by voting on community proposals
                  </Text>
                </View>
              </View>

              {/* Stats dashboard — 3-column with colored backgrounds */}
              <View
                style={{
                  flexDirection: 'row',
                  gap: 10,
                  marginBottom: 16,
                }}
              >
                {/* Karma column */}
                <View
                  style={{
                    flex: 1,
                    backgroundColor: '#ECFDF5',
                    borderRadius: 14,
                    paddingVertical: 16,
                    paddingHorizontal: 8,
                    alignItems: 'center',
                    borderWidth: 1,
                    borderColor: 'rgba(16, 185, 129, 0.12)',
                    ...SHADOWS.sm,
                  }}
                >
                  <Text style={{ fontSize: FONT_SIZES['4xl'], fontFamily: FONTS.extraBold, fontWeight: '800', lineHeight: FONT_SIZES['4xl'] * 1.2, color: COLORS.emerald, letterSpacing: -0.5 }}>
                    {profile.karma?.karma_points ?? 0}
                  </Text>
                  <Text style={{ fontSize: FONT_SIZES.xs, fontFamily: FONTS.semiBold, fontWeight: '600', color: COLORS.emerald, marginTop: 6, textTransform: 'uppercase', letterSpacing: 0.3 }}>
                    Karma
                  </Text>
                </View>
                {/* Votes column */}
                <View
                  style={{
                    flex: 1,
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
                  <Text style={{ fontSize: FONT_SIZES['4xl'], fontFamily: FONTS.extraBold, fontWeight: '800', lineHeight: FONT_SIZES['4xl'] * 1.2, color: COLORS.primaryAccent, letterSpacing: -0.5 }}>
                    {(profile.karma as any)?.total_votes ?? 0}
                  </Text>
                  <Text style={{ fontSize: FONT_SIZES.xs, fontFamily: FONTS.semiBold, fontWeight: '600', color: COLORS.primaryAccent, marginTop: 6, textTransform: 'uppercase', letterSpacing: 0.3 }}>
                    Votes
                  </Text>
                </View>
                {/* Assists column */}
                <View
                  style={{
                    flex: 1,
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
                  <Text style={{ fontSize: FONT_SIZES['4xl'], fontFamily: FONTS.extraBold, fontWeight: '800', lineHeight: FONT_SIZES['4xl'] * 1.2, color: COLORS.warning.icon, letterSpacing: -0.5 }}>
                    {profile.karma?.total_assists ?? 0}
                  </Text>
                  <Text style={{ fontSize: FONT_SIZES.xs, fontFamily: FONTS.semiBold, fontWeight: '600', color: COLORS.warning.icon, marginTop: 6, textTransform: 'uppercase', letterSpacing: 0.3 }}>
                    Assists
                  </Text>
                </View>
              </View>

              {/* Not in the dating pool info line */}
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 16 }}>
                <EvaIcon name="info" variant="outline" size={14} color={COLORS.text.light} />
                <Text style={{ color: COLORS.text.light, fontFamily: FONTS.medium, fontWeight: '500', fontSize: FONT_SIZES.sm }}>
                  Not in the dating pool
                </Text>
              </View>

              {/* Next milestone indicator */}
              <View
                style={{
                  backgroundColor: COLORS.card,
                  borderRadius: 12,
                  paddingVertical: 12,
                  paddingHorizontal: 16,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 10,
                  marginBottom: 24,
                  borderWidth: 1,
                  borderColor: COLORS.borderSubtle,
                }}
              >
                <EvaIcon name="trending-up" variant="outline" size={18} color={COLORS.primaryAccent} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: FONTS.semiBold, fontWeight: '600', fontSize: FONT_SIZES.sm, color: COLORS.text.heading }}>
                    Next milestone
                  </Text>
                  <Text style={{ fontFamily: FONTS.regular, fontWeight: '400', fontSize: FONT_SIZES.xs, color: COLORS.text.secondary, marginTop: 2 }}>
                    {(profile.karma?.karma_points ?? 0) < 25
                      ? `${25 - (profile.karma?.karma_points ?? 0)} karma to unlock accuracy stats`
                      : (profile.karma?.karma_points ?? 0) < 100
                        ? `${100 - (profile.karma?.karma_points ?? 0)} karma to reach Top Matchmaker`
                        : 'Top Matchmaker — keep the streak going!'}
                  </Text>
                </View>
                <View style={{
                  backgroundColor: COLORS.tier1.lightBg,
                  borderRadius: 8,
                  paddingHorizontal: 8,
                  paddingVertical: 4,
                }}>
                  <Text style={{ fontFamily: FONTS.bold, fontWeight: '700', fontSize: FONT_SIZES.xs, color: COLORS.primaryAccent }}>
                    {(profile.karma?.karma_points ?? 0) < 25
                      ? `${Math.round(((profile.karma?.karma_points ?? 0) / 25) * 100)}%`
                      : (profile.karma?.karma_points ?? 0) < 100
                        ? `${Math.round(((profile.karma?.karma_points ?? 0) / 100) * 100)}%`
                        : '100%'}
                  </Text>
                </View>
              </View>

              {/* Quick Actions section */}
              <Text style={{ fontFamily: FONTS.semiBold, fontWeight: '600', fontSize: FONT_SIZES.xl, color: COLORS.text.heading, marginBottom: 12 }}>
                Quick Actions
              </Text>
              <View style={{ flexDirection: 'row', gap: 12, marginBottom: 20 }}>
                {/* Vote on Proposals card */}
                <TouchableOpacity
                  onPress={() => { lightHaptic(); navigation.navigate('Community'); }}
                  style={{
                    flex: 1,
                    backgroundColor: COLORS.card,
                    borderRadius: 14,
                    paddingVertical: 20,
                    paddingHorizontal: 14,
                    alignItems: 'center',
                    ...SHADOWS.md,
                    borderWidth: 1,
                    borderColor: COLORS.borderSubtle,
                  }}
                  activeOpacity={0.7}
                  accessibilityLabel="Vote on proposals"
                  accessibilityRole="button"
                >
                  <View
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 22,
                      backgroundColor: COLORS.tier1.lightBg,
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: 10,
                    }}
                  >
                    <EvaIcon name="checkmark-circle-2" variant="outline" size={22} color={COLORS.primaryAccent} />
                  </View>
                  <Text style={{ fontFamily: FONTS.semiBold, fontWeight: '600', fontSize: FONT_SIZES.base, color: COLORS.text.heading, textAlign: 'center' }}>
                    Vote on Proposals
                  </Text>
                  <Text style={{ fontFamily: FONTS.regular, fontWeight: '400', fontSize: FONT_SIZES.xs, color: COLORS.text.secondary, marginTop: 4, textAlign: 'center' }}>
                    Help your community
                  </Text>
                </TouchableOpacity>

                {/* Invite Friends card */}
                <TouchableOpacity
                  onPress={() => { lightHaptic(); navigation.navigate('ContactInvite'); }}
                  style={{
                    flex: 1,
                    backgroundColor: COLORS.card,
                    borderRadius: 14,
                    paddingVertical: 20,
                    paddingHorizontal: 14,
                    alignItems: 'center',
                    ...SHADOWS.md,
                    borderWidth: 1,
                    borderColor: COLORS.borderSubtle,
                  }}
                  activeOpacity={0.7}
                  accessibilityLabel="Invite friends"
                  accessibilityRole="button"
                >
                  <View
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 22,
                      backgroundColor: 'rgba(52, 199, 89, 0.08)',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: 10,
                    }}
                  >
                    <EvaIcon name="person-add" variant="outline" size={22} color={COLORS.success} />
                  </View>
                  <Text style={{ fontFamily: FONTS.semiBold, fontWeight: '600', fontSize: FONT_SIZES.base, color: COLORS.text.heading, textAlign: 'center' }}>
                    Invite Friends
                  </Text>
                  <Text style={{ fontFamily: FONTS.regular, fontWeight: '400', fontSize: FONT_SIZES.xs, color: COLORS.text.secondary, marginTop: 4, textAlign: 'center' }}>
                    Grow the community
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Change Photo link */}
              <TouchableOpacity
                onPress={() => { lightHaptic(); navigation.navigate('EditPhotos'); }}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  paddingVertical: 12,
                  gap: 6,
                }}
                activeOpacity={0.6}
                accessibilityLabel="Change photo"
                accessibilityRole="button"
              >
                <EvaIcon name="camera" variant="outline" size={16} color={COLORS.text.secondary} />
                <Text style={{ color: COLORS.text.secondary, fontFamily: FONTS.medium, fontWeight: '500', fontSize: FONT_SIZES.base }}>
                  Change Photo
                </Text>
              </TouchableOpacity>
            </StyledView>
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

// ─── Tab Bar (private component) ─────────────────────────────────────

interface TabBarProps {
  activeTab: 'about' | 'badges' | 'questions';
  onTabChange: (tab: 'about' | 'badges' | 'questions') => void;
  questionsCount: number;
  badgesCount: number;
}

const TabBar: React.FC<TabBarProps> = ({ activeTab, onTabChange, questionsCount, badgesCount }) => (
  <StyledView className="flex-row border-t border-neutral-100">
    <StyledTouchableOpacity
      onPress={() => { lightHaptic(); onTabChange('about'); }}
      style={{ width: '33.33%' }}
      className="py-3 items-center relative"
      accessibilityLabel="About tab"
      accessibilityRole="tab"
      accessibilityState={{ selected: activeTab === 'about' }}
    >
      <Body className={`font-medium ${activeTab === 'about' ? 'text-primary-500' : 'text-neutral-600'}`}>
        About
      </Body>
      {activeTab === 'about' && (
        <StyledView className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-500" />
      )}
    </StyledTouchableOpacity>
    <GuideTarget id="questions-tab" style={{ width: '33.33%' }}>
      <StyledTouchableOpacity
        onPress={() => { lightHaptic(); onTabChange('questions'); }}
        className="py-3 items-center relative"
        accessibilityLabel={`Questions tab, ${questionsCount} answered`}
        accessibilityRole="tab"
        accessibilityState={{ selected: activeTab === 'questions' }}
      >
        <Body className={`font-medium ${activeTab === 'questions' ? 'text-primary-500' : 'text-neutral-600'}`}>
          Questions
        </Body>
        {activeTab === 'questions' && (
          <StyledView className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-500" />
        )}
      </StyledTouchableOpacity>
    </GuideTarget>
    <StyledTouchableOpacity
      onPress={() => { lightHaptic(); onTabChange('badges'); }}
      style={{ width: '33.34%' }}
      className="py-3 items-center relative"
      accessibilityLabel={`Badges tab, ${badgesCount} badge${badgesCount !== 1 ? 's' : ''}`}
      accessibilityRole="tab"
      accessibilityState={{ selected: activeTab === 'badges' }}
    >
      <Body className={`font-medium ${activeTab === 'badges' ? 'text-primary-500' : 'text-neutral-600'}`}>
        Badges
      </Body>
      {activeTab === 'badges' && (
        <StyledView className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-500" />
      )}
    </StyledTouchableOpacity>
  </StyledView>
);
