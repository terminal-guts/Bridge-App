/**
 * ProfileView Component
 *
 * Standardized profile display used across the app.
 * Handles different contexts: own profile, grid candidates, match proposals, active matches.
 */

import React, { useState, useRef } from 'react';
import { View, Modal, ScrollView, Text, TouchableOpacity, Dimensions, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { formatProfileValue, formatGenderDisplay } from '../../utils/formatProfileValue';
import { styled } from 'nativewind';
import { UserProfile } from '../../types';
import { clampDisplayScore } from '../../utils/compatibilityHelpers';
import { valueIconName, interestIconName } from '../../utils/emojiMaps';
import { FONTS, FONT_SIZES } from '../../constants/typography';
import { COLORS } from '../../theme/colors';
import { EvaIcon, IconScoutIcon } from '../icons';
import { WineGlassIcon, LeafIcon, CigaretteIcon } from '../icons/Icons';
import { ProfileBadgesSection } from '../badges/ProfileBadgesSection';

const StyledView = styled(View);
const StyledText = styled(Text);
const StyledScrollView = styled(ScrollView);
const StyledTouchableOpacity = styled(TouchableOpacity);
const StyledImage = Image;

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface ProfileViewProps {
  visible: boolean;
  profile: UserProfile | null;
  onClose: () => void;

  // Display options
  showName?: boolean;
  showDeepQuestions?: boolean;
  showCompatibility?: boolean;

  // Compatibility data (if showCompatibility is true)
  compatibilityScore?: number;
  whyThisMatch?: string[];
  whatDoesntFit?: string[];

  // Action button
  actionButton?: React.ReactNode;
}

export function ProfileView({
  visible,
  profile,
  onClose,
  showName = false,
  showDeepQuestions = false,
  showCompatibility = false,
  compatibilityScore,
  whyThisMatch = [],
  whatDoesntFit = [],
  actionButton,
}: ProfileViewProps) {
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const scrollRef = useRef<ScrollView>(null);

  if (!profile) return null;

  const photos = profile.photos?.slice(0, 3) ?? [];

  const capitalize = formatProfileValue;

  // Helper to format height
  const formatHeight = (height: any): string => {
    if (!height) return 'Not specified';

    // If already a string (e.g., "5'10\""), return as-is
    if (typeof height === 'string') return height;

    // If number (inches), convert to feet/inches
    if (typeof height === 'number') {
      const feet = Math.floor(height / 12);
      const remainingInches = height % 12;
      return `${feet}'${remainingInches}"`;
    }

    return 'Not specified';
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <StyledView style={{ flex: 1, backgroundColor: COLORS.backgroundWarmCream }}>
        {/* Header with Back Button */}
        <StyledView style={pvStyles.header}>
          <StyledTouchableOpacity
            onPress={onClose}
            style={{ flexDirection: 'row', alignItems: 'center' }}
            accessibilityRole="button"
            accessibilityLabel="Close profile"
          >
            <EvaIcon name="arrow-back" variant="outline" size={28} color={COLORS.text.warmNeutral} />
            <StyledText style={pvStyles.backText}>Back</StyledText>
          </StyledTouchableOpacity>
        </StyledView>

        {/* Name (if shown) */}
        {showName && (
          <StyledView style={{ paddingHorizontal: 20, marginBottom: 12 }}>
            <StyledText style={pvStyles.nameText}>
              {profile.firstName} {profile.lastName}
            </StyledText>
          </StyledView>
        )}

        {/* Photo Carousel */}
        {photos.length > 0 && (
          <StyledView style={{ paddingHorizontal: 20, marginBottom: 20 }}>
            {photos.length === 1 ? (
              <StyledImage
                source={{ uri: photos[0].url }}
                style={{ width: '100%', height: 280, borderRadius: 16, backgroundColor: COLORS.backgroundGrayMedium }}
                contentFit="cover"
                transition={200}
                cachePolicy="disk"
              />
            ) : (
              <>
                {/* Loop data: [clone_last, ...photos, clone_first] */}
                <ScrollView
                  ref={scrollRef}
                  horizontal
                  pagingEnabled
                  showsHorizontalScrollIndicator={false}
                  contentOffset={{ x: SCREEN_WIDTH - 40, y: 0 }}
                  onMomentumScrollEnd={(event) => {
                    const itemWidth = SCREEN_WIDTH - 40;
                    const rawIndex = Math.round(event.nativeEvent.contentOffset.x / itemWidth);
                    if (rawIndex === 0) {
                      // Hit clone of last — jump to real last
                      scrollRef.current?.scrollTo({ x: itemWidth * photos.length, animated: false });
                      setCurrentPhotoIndex(photos.length - 1);
                    } else if (rawIndex === photos.length + 1) {
                      // Hit clone of first — jump to real first
                      scrollRef.current?.scrollTo({ x: itemWidth, animated: false });
                      setCurrentPhotoIndex(0);
                    } else {
                      setCurrentPhotoIndex(rawIndex - 1);
                    }
                  }}
                >
                  {[photos[photos.length - 1], ...photos, photos[0]].map((photo, index) => (
                    <StyledView key={`loop-${index}`} style={{ width: SCREEN_WIDTH - 40 }}>
                      <StyledImage
                        source={{ uri: photo.url }}
                        style={{ width: '100%', height: 280, borderRadius: 16, backgroundColor: COLORS.backgroundGrayMedium }}
                        contentFit="cover"
                        transition={200}
                        cachePolicy="disk"
                      />
                    </StyledView>
                  ))}
                </ScrollView>

                {/* Pagination Dots */}
                <StyledView style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 12, gap: 8 }}>
                  {photos.map((_, index) => (
                    <StyledTouchableOpacity
                      key={index}
                      onPress={() => {
                        scrollRef.current?.scrollTo({ x: (index + 1) * (SCREEN_WIDTH - 40), animated: true });
                        setCurrentPhotoIndex(index);
                      }}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <StyledView
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: 4,
                          backgroundColor: index === currentPhotoIndex ? COLORS.purple : COLORS.borderGray,
                        }}
                      />
                    </StyledTouchableOpacity>
                  ))}
                </StyledView>
              </>
            )}
          </StyledView>
        )}

        {/* Scrollable Content */}
        <StyledScrollView
          style={{ flex: 1, paddingHorizontal: 20 }}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: actionButton ? 120 : 40 }}
        >
          {/* Friend Badges */}
          {profile?.userId && (
            <ProfileBadgesSection userId={profile.userId} revealAuthor={true} />
          )}

          {/* Compatibility Section (if shown) */}
          {showCompatibility && compatibilityScore !== undefined && (
            <StyledView style={{ marginBottom: 24 }}>
              <StyledView style={pvStyles.compatCard}>
                <StyledText style={pvStyles.compatScore}>
                  {clampDisplayScore(compatibilityScore)}%
                </StyledText>
                <StyledText style={pvStyles.compatLabel}>
                  Compatibility Match
                </StyledText>
              </StyledView>

              {/* Why This Match */}
              {whyThisMatch.length > 0 && (
                <StyledView style={{ marginBottom: 12 }}>
                  <StyledText style={pvStyles.whyMatchTitle}>
                    Why This Match
                  </StyledText>
                  {whyThisMatch.map((reason, index) => (
                    <StyledView key={index} style={{ flexDirection: 'row', marginBottom: 8 }}>
                      <StyledText style={{ fontFamily: FONTS.regular, color: COLORS.matchReasonGreen, marginRight: 8 }}>✓</StyledText>
                      <StyledText style={{ fontSize: FONT_SIZES.md, fontFamily: FONTS.regular, color: COLORS.text.warmNeutral, flex: 1 }}>
                        {reason}
                      </StyledText>
                    </StyledView>
                  ))}
                </StyledView>
              )}

              {/* What Doesn't Fit */}
              {whatDoesntFit.length > 0 && (
                <StyledView>
                  <StyledText style={pvStyles.doesntFitTitle}>
                    What Doesn't Fit
                  </StyledText>
                  {whatDoesntFit.map((concern, index) => (
                    <StyledView key={index} style={{ flexDirection: 'row', marginBottom: 8 }}>
                      <StyledText style={{ fontFamily: FONTS.regular, color: COLORS.amberText, marginRight: 8 }}>•</StyledText>
                      <StyledText style={{ fontSize: FONT_SIZES.md, fontFamily: FONTS.regular, color: COLORS.text.warmNeutral, flex: 1 }}>
                        {concern}
                      </StyledText>
                    </StyledView>
                  ))}
                </StyledView>
              )}
            </StyledView>
          )}

          {/* Basic Info Row */}
          <StyledView style={pvStyles.infoPillWrap}>
            {/* Gender */}
            {profile.gender && profile.gender.length > 0 && (
              <StyledView style={pvStyles.infoPill}>
                <EvaIcon name="person" variant="outline" size={16} color={COLORS.purple} style={{ marginRight: 8 }} />
                <StyledText style={pvStyles.infoPillText}>
                  {formatGenderDisplay(profile.gender[0])}
                </StyledText>
              </StyledView>
            )}

            {/* Pronouns */}
            {profile.pronouns && (
              <StyledView style={pvStyles.infoPill}>
                <EvaIcon name="message-circle" variant="outline" size={16} color={COLORS.pink} style={{ marginRight: 8 }} />
                <StyledText style={pvStyles.infoPillText}>
                  {profile.pronouns.replace('_', '/')}
                </StyledText>
              </StyledView>
            )}

            {/* Age */}
            <StyledView style={pvStyles.infoPill}>
              <EvaIcon name="calendar" variant="outline" size={16} color={COLORS.pink} style={{ marginRight: 8 }} />
              <StyledText style={pvStyles.infoPillText}>
                {profile.age}
              </StyledText>
            </StyledView>

            {/* Height */}
            {profile.height && (
              <StyledView style={pvStyles.infoPill}>
                <EvaIcon name="maximize" variant="outline" size={16} color={COLORS.emerald} style={{ marginRight: 8 }} />
                <StyledText style={pvStyles.infoPillText}>
                  {formatHeight(profile.height)}
                </StyledText>
              </StyledView>
            )}

            {/* Occupation */}
            {profile.currentJob && (
              <StyledView style={pvStyles.infoPill}>
                <EvaIcon name="briefcase" variant="outline" size={16} color={COLORS.tier1.icon} style={{ marginRight: 8 }} />
                <StyledText style={pvStyles.infoPillText}>
                  {profile.currentJob}
                </StyledText>
              </StyledView>
            )}

            {/* Ethnicity */}
            {profile.ethnicity && (
              <StyledView style={pvStyles.infoPill}>
                <EvaIcon name="globe" variant="outline" size={16} color={COLORS.violet} style={{ marginRight: 8 }} />
                <StyledText style={pvStyles.infoPillText}>
                  {profile.ethnicity}
                </StyledText>
              </StyledView>
            )}

            {/* Religion */}
            {profile.religion && (
              <StyledView style={pvStyles.infoPill}>
                <EvaIcon name="moon" variant="outline" size={16} color={COLORS.tier2.icon} style={{ marginRight: 8 }} />
                <StyledText style={pvStyles.infoPillText}>
                  {profile.religion}
                </StyledText>
              </StyledView>
            )}

            {/* Political Leaning */}
            {profile.politicalLeaning && (
              <StyledView style={pvStyles.infoPill}>
                <EvaIcon name="flag" variant="outline" size={16} color={COLORS.error} style={{ marginRight: 8 }} />
                <StyledText style={pvStyles.infoPillText}>
                  {formatProfileValue(profile.politicalLeaning)}
                </StyledText>
              </StyledView>
            )}

            {/* Joined Date */}
            {profile.createdAt && (
              <StyledView style={pvStyles.infoPill}>
                <EvaIcon name="clock" variant="outline" size={16} color={COLORS.grayIcon} style={{ marginRight: 8 }} />
                <StyledText style={pvStyles.infoPillText}>
                  Joined {new Date(profile.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                </StyledText>
              </StyledView>
            )}
          </StyledView>

          {/* Interests */}
          {profile.interests && profile.interests.length > 0 && (
            <StyledView style={{ marginBottom: 20 }}>
              <StyledView style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                <EvaIcon name="star" variant="outline" size={18} color={COLORS.warning.icon} style={{ marginRight: 8 }} />
                <StyledText style={{ fontSize: FONT_SIZES.lg, color: COLORS.text.warmNeutral, fontWeight: '600', fontFamily: FONTS.semiBold }}>Interests</StyledText>
              </StyledView>
              <StyledView style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {profile.interests.map((interest: string, index: number) => (
                  <StyledView key={index} style={pvStyles.interestTag}>
                    <IconScoutIcon name={interestIconName(interest) ?? ''} size={14} style={{ marginRight: 4 }} />
                    <StyledText style={pvStyles.interestTagText}>
                      {interest}
                    </StyledText>
                  </StyledView>
                ))}
              </StyledView>
            </StyledView>
          )}

          {/* Values */}
          {profile.values && profile.values.length > 0 && (
            <StyledView style={{ marginBottom: 20 }}>
              <StyledView style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                <EvaIcon name="award" variant="outline" size={18} color={COLORS.emerald} style={{ marginRight: 8 }} />
                <StyledText style={{ fontSize: FONT_SIZES.lg, color: COLORS.text.warmNeutral, fontWeight: '600', fontFamily: FONTS.semiBold }}>Values</StyledText>
              </StyledView>
              <StyledView style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {profile.values.map((value: string, index: number) => (
                  <StyledView key={index} style={pvStyles.valueTag}>
                    <IconScoutIcon name={valueIconName(value) ?? ''} size={14} style={{ marginRight: 4 }} />
                    <StyledText style={pvStyles.valueTagText}>
                      {value}
                    </StyledText>
                  </StyledView>
                ))}
              </StyledView>
            </StyledView>
          )}

          {/* Deep Questions (if shown) */}
          {showDeepQuestions && profile.deepQuestions && profile.deepQuestions.length > 0 && (
            <StyledView style={{ marginBottom: 20 }}>
              <StyledView style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                <EvaIcon name="message-square" variant="outline" size={18} color={COLORS.purple} style={{ marginRight: 8 }} />
                <StyledText style={{ fontSize: FONT_SIZES.lg, color: COLORS.text.warmNeutral, fontWeight: '600', fontFamily: FONTS.semiBold }}>About Me</StyledText>
              </StyledView>

              {profile.deepQuestions.map((q, i) => (
                <StyledView key={i} style={{ marginBottom: 12 }}>
                  <StyledText style={{ fontSize: FONT_SIZES.base, fontFamily: FONTS.regular, color: COLORS.text.warmNeutral, lineHeight: 20 }}>
                    {q.answer}
                  </StyledText>
                </StyledView>
              ))}
            </StyledView>
          )}

          {/* Family */}
          <StyledView style={{ marginBottom: 20 }}>
            <StyledView style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
              <EvaIcon name="people" variant="outline" size={18} color={COLORS.warning.icon} style={{ marginRight: 8 }} />
              <StyledText style={{ fontSize: FONT_SIZES.lg, color: COLORS.text.warmNeutral, fontWeight: '600', fontFamily: FONTS.semiBold }}>Family</StyledText>
            </StyledView>
            <StyledView style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
              <EvaIcon name="person" variant="outline" size={16} color={COLORS.text.subtle} style={{ marginRight: 8 }} />
              <StyledText style={{ fontSize: FONT_SIZES.base, fontFamily: FONTS.regular, color: COLORS.text.warmNeutral }}>
                {profile.hasChildren === 'no' ? 'No children' : profile.hasChildren === 'yes' ? 'Has children' : 'Prefer not to say'}
              </StyledText>
            </StyledView>
            {profile.familyPlans && (
              <StyledView style={{ flexDirection: 'row', alignItems: 'center' }}>
                <EvaIcon name="heart" variant="outline" size={16} color={COLORS.text.subtle} style={{ marginRight: 8 }} />
                <StyledText style={{ fontSize: FONT_SIZES.base, fontFamily: FONTS.regular, color: COLORS.text.warmNeutral }}>
                  {profile.familyPlans === 'want_children' ? 'Want children someday' :
                    profile.familyPlans === 'open_to_children' ? 'Open to children' :
                      profile.familyPlans === 'dont_want_children' ? 'Don\'t want children' : 'Not sure yet'}
                </StyledText>
              </StyledView>
            )}
          </StyledView>

          {/* Lifestyle */}
          <StyledView style={{ marginBottom: 20 }}>
            <StyledView style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
              <EvaIcon name="trending-up" variant="outline" size={18} color={COLORS.violet} style={{ marginRight: 8 }} />
              <StyledText style={{ fontSize: FONT_SIZES.lg, color: COLORS.text.warmNeutral, fontWeight: '600', fontFamily: FONTS.semiBold }}>Lifestyle</StyledText>
            </StyledView>

            {profile.drinkingFrequency && (
              <StyledView style={pvStyles.lifestyleRow}>
                <StyledView style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <WineGlassIcon size={16} color={COLORS.text.subtle} style={{ marginRight: 8 }} />
                  <StyledText style={{ fontSize: FONT_SIZES.base, fontFamily: FONTS.regular, color: COLORS.text.warmNeutral }}>Drinking</StyledText>
                </StyledView>
                <StyledText style={{ fontSize: FONT_SIZES.base, color: COLORS.text.subtle, fontWeight: '500', fontFamily: FONTS.medium }}>
                  {capitalize(profile.drinkingFrequency)}
                </StyledText>
              </StyledView>
            )}

            {profile.cannabisFrequency && (
              <StyledView style={pvStyles.lifestyleRow}>
                <StyledView style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <LeafIcon size={16} color={COLORS.text.subtle} style={{ marginRight: 8 }} />
                  <StyledText style={{ fontSize: FONT_SIZES.base, fontFamily: FONTS.regular, color: COLORS.text.warmNeutral }}>Cannabis</StyledText>
                </StyledView>
                <StyledText style={{ fontSize: FONT_SIZES.base, color: COLORS.text.subtle, fontWeight: '500', fontFamily: FONTS.medium }}>
                  {capitalize(profile.cannabisFrequency)}
                </StyledText>
              </StyledView>
            )}

            {profile.tobaccoFrequency && (
              <StyledView style={[pvStyles.lifestyleRow, { marginBottom: 0 }]}>
                <StyledView style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <CigaretteIcon size={16} color={COLORS.text.subtle} style={{ marginRight: 8 }} />
                  <StyledText style={{ fontSize: FONT_SIZES.base, fontFamily: FONTS.regular, color: COLORS.text.warmNeutral }}>Tobacco</StyledText>
                </StyledView>
                <StyledText style={{ fontSize: FONT_SIZES.base, color: COLORS.text.subtle, fontWeight: '500', fontFamily: FONTS.medium }}>
                  {capitalize(profile.tobaccoFrequency)}
                </StyledText>
              </StyledView>
            )}
          </StyledView>
        </StyledScrollView>

        {/* Action Button (if provided) */}
        {actionButton && (
          <StyledView style={pvStyles.actionButtonBar}>
            {actionButton}
          </StyledView>
        )}
      </StyledView>
    </Modal>
  );
}

export default ProfileView;

const pvStyles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 48,
    paddingBottom: 16,
  },
  backText: {
    fontSize: FONT_SIZES.xl,
    fontFamily: FONTS.regular,
    color: COLORS.text.warmNeutral,
    marginLeft: 8,
  },
  nameText: {
    fontSize: FONT_SIZES['5xl'],
    fontWeight: '700',
    fontFamily: FONTS.bold,
    color: COLORS.text.warmNeutral,
  },
  compatCard: {
    backgroundColor: COLORS.backgroundPurpleTag,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  compatScore: {
    fontSize: 48,
    fontWeight: '700',
    fontFamily: FONTS.bold,
    color: COLORS.purple,
  },
  compatLabel: {
    fontSize: FONT_SIZES.base,
    color: COLORS.purpleDeep,
    fontWeight: '600',
    fontFamily: FONTS.semiBold,
  },
  whyMatchTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    fontFamily: FONTS.bold,
    color: COLORS.matchReasonGreen,
    marginBottom: 8,
  },
  doesntFitTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    fontFamily: FONTS.bold,
    color: COLORS.amberText,
    marginBottom: 8,
  },
  infoPillWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  infoPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.backgroundGray,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  infoPillText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.text.warmNeutral,
    fontWeight: '500',
    fontFamily: FONTS.medium,
  },
  interestTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.warning.bg,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
  },
  interestTagText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.amberText,
    fontWeight: '500',
    fontFamily: FONTS.medium,
  },
  valueTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.backgroundValuesTag,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
  },
  valueTagText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.emeraldText,
    fontWeight: '500',
    fontFamily: FONTS.medium,
  },
  lifestyleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  actionButtonBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    backgroundColor: COLORS.backgroundWarmCream,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderWarm,
  },
});
