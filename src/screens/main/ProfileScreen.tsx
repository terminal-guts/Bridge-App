import React from 'react';
import { View, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { Image } from 'expo-image';
import { FONTS } from '../../constants/typography';
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
import { useProfileScreen } from './ProfileScreen.hooks';
import { AboutTab, BadgesTab } from './ProfileScreen.sections';
import { QuestionsTab } from './ProfileScreen.questions';
import { ProfileModals } from './ProfileScreen.modals';

const logger = createLogger('ProfileScreen');

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
      <ProfileCompletionBanner
        profile={profile}
        onPress={() => navigation.navigate('ProfileEdit')}
      />

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
        {/* Header with Preview, Edit and Settings */}
        <StyledView className="bg-white border-b border-neutral-200">
          <StyledView className="px-4 py-3 flex-row justify-between items-center">
            <Display>Your Profile</Display>
            <StyledView className="flex-row items-center space-x-3">
              <StyledTouchableOpacity
                onPress={() => { lightHaptic(); navigation.navigate('ProfilePreview'); }}
                accessibilityLabel="Preview profile"
                accessibilityRole="button"
              >
                <EvaIcon name="eye" variant="outline" size={24} color={COLORS.purple} />
              </StyledTouchableOpacity>
              <StyledTouchableOpacity
                onPress={() => { lightHaptic(); navigation.navigate('ProfileEdit'); }}
                accessibilityLabel="Edit profile"
                accessibilityRole="button"
              >
                <EvaIcon name="edit-2" variant="outline" size={24} color={COLORS.primaryAccent} />
              </StyledTouchableOpacity>
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
                  source={{ uri: (profile.photos.find(p => p.isMain) || profile.photos[0]).url }}
                  className="rounded-full mb-3 bg-neutral-200 border-2 border-neutral-100"
                  style={{
                    width: AVATAR_SIZE_XL,
                    height: AVATAR_SIZE_XL,
                    ...SHADOWS.xl,
                  } as any}
                  contentFit="cover"
                  transition={200}
                  cachePolicy="disk"
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

              {/* Name & Karma Badge */}
              <StyledView className="flex-row items-center mb-4" style={{ gap: 8 }}>
                <H2 style={{ fontFamily: FONTS.bold, fontSize: 28 }}>{profile.firstName}</H2>
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
              </StyledView>

              {/* Friends Section */}
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
            </StyledView>
          </StyledView>

          {/* Tab Bar */}
          <TabBar
            activeTab={hook.activeTab}
            onTabChange={hook.setActiveTab}
            questionsCount={profile.deepQuestions?.length || 0}
            badgesCount={hook.badges.length}
          />
        </StyledView>

        {/* Tab Content */}
        {hook.activeTab === 'about' && (
          <AboutTab profile={profile} navigation={navigation} />
        )}
        {hook.activeTab === 'badges' && (
          <BadgesTab
            badges={hook.badges}
            badgesLoading={hook.badgesLoading}
            onToggleFeatured={hook.handleToggleFeaturedBadge}
          />
        )}
        {hook.activeTab === 'questions' && (
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
