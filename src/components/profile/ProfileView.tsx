/**
 * ProfileView Component
 *
 * Standardized profile display used across the app.
 * Handles different contexts: own profile, grid candidates, match proposals, active matches.
 */

import React, { useState, useRef } from 'react';
import { View, Modal, ScrollView, Text, TouchableOpacity, FlatList, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import { formatProfileValue } from '../../utils/formatProfileValue';
import { styled } from 'nativewind';
import { UserProfile } from '../../types';
import { clampDisplayScore } from '../../utils/compatibilityHelpers';
import { valueIconName, interestIconName } from '../../utils/emojiMaps';
import { FONTS, FONT_SIZES } from '../../constants/typography';
import { COLORS } from '../../theme/colors';
import { EvaIcon, IconScoutIcon } from '../icons';
import { WineGlassIcon, LeafIcon, CigaretteIcon } from '../icons/Icons';

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
      <StyledView style={{ flex: 1, backgroundColor: '#FBF9F6' }}>
        {/* Header with Back Button */}
        <StyledView style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 20,
          paddingTop: 48,
          paddingBottom: 16,
        }}>
          <StyledTouchableOpacity
            onPress={onClose}
            style={{ flexDirection: 'row', alignItems: 'center' }}
          >
            <EvaIcon name="arrow-back" variant="outline" size={28} color="#4A4540" />
            <StyledText style={{ fontSize: FONT_SIZES.xl, fontFamily: FONTS.regular, color: COLORS.text.warmNeutral, marginLeft: 8 }}>Back</StyledText>
          </StyledTouchableOpacity>
        </StyledView>

        {/* Name (if shown) */}
        {showName && (
          <StyledView style={{ paddingHorizontal: 20, marginBottom: 12 }}>
            <StyledText style={{ fontSize: FONT_SIZES['5xl'], fontWeight: '700', fontFamily: FONTS.bold, color: COLORS.text.warmNeutral }}>
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
                style={{ width: '100%', height: 280, borderRadius: 16 }}
                contentFit="cover"
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
                        style={{ width: '100%', height: 280, borderRadius: 16 }}
                        contentFit="cover"
                      />
                    </StyledView>
                  ))}
                </ScrollView>

                {/* Pagination Dots */}
                <StyledView style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 12, gap: 6 }}>
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
          {/* Compatibility Section (if shown) */}
          {showCompatibility && compatibilityScore !== undefined && (
            <StyledView style={{ marginBottom: 24 }}>
              <StyledView style={{
                backgroundColor: COLORS.backgroundPurpleTag,
                borderRadius: 16,
                padding: 16,
                alignItems: 'center',
                marginBottom: 16,
              }}>
                <StyledText style={{ fontSize: 48, fontWeight: '700', fontFamily: FONTS.bold, color: COLORS.purple }}>
                  {clampDisplayScore(compatibilityScore)}%
                </StyledText>
                <StyledText style={{ fontSize: FONT_SIZES.base, color: '#6B21A8', fontWeight: '600', fontFamily: FONTS.semiBold }}>
                  Compatibility Match
                </StyledText>
              </StyledView>

              {/* Why This Match */}
              {whyThisMatch.length > 0 && (
                <StyledView style={{ marginBottom: 12 }}>
                  <StyledText style={{ fontSize: FONT_SIZES.lg, fontWeight: '700', fontFamily: FONTS.bold, color: '#059669', marginBottom: 8 }}>
                    Why This Match
                  </StyledText>
                  {whyThisMatch.map((reason, index) => (
                    <StyledView key={index} style={{ flexDirection: 'row', marginBottom: 6 }}>
                      <StyledText style={{ fontFamily: FONTS.regular, color: '#059669', marginRight: 8 }}>✓</StyledText>
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
                  <StyledText style={{ fontSize: FONT_SIZES.lg, fontWeight: '700', fontFamily: FONTS.bold, color: '#B45309', marginBottom: 8 }}>
                    What Doesn't Fit
                  </StyledText>
                  {whatDoesntFit.map((concern, index) => (
                    <StyledView key={index} style={{ flexDirection: 'row', marginBottom: 6 }}>
                      <StyledText style={{ fontFamily: FONTS.regular, color: '#B45309', marginRight: 8 }}>•</StyledText>
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
          <StyledView style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: 8,
            marginBottom: 20,
          }}>
            {/* Gender */}
            {profile.gender && profile.gender.length > 0 && (
              <StyledView style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: COLORS.backgroundGray,
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderRadius: 20,
              }}>
                <EvaIcon name="person" variant="outline" size={16} color="#7C3AED" style={{ marginRight: 6 }} />
                <StyledText style={{ fontSize: FONT_SIZES.md, color: COLORS.text.warmNeutral, fontWeight: '500', fontFamily: FONTS.medium }}>
                  {capitalize(profile.gender[0])}
                </StyledText>
              </StyledView>
            )}

            {/* Pronouns */}
            {profile.pronouns && (
              <StyledView style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: COLORS.backgroundGray,
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderRadius: 20,
              }}>
                <EvaIcon name="message-circle" variant="outline" size={16} color="#EC4899" style={{ marginRight: 6 }} />
                <StyledText style={{ fontSize: FONT_SIZES.md, color: COLORS.text.warmNeutral, fontWeight: '500', fontFamily: FONTS.medium }}>
                  {profile.pronouns.replace('_', '/')}
                </StyledText>
              </StyledView>
            )}

            {/* Age */}
            <StyledView style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: COLORS.backgroundGray,
              paddingHorizontal: 12,
              paddingVertical: 8,
              borderRadius: 20,
            }}>
              <EvaIcon name="calendar" variant="outline" size={16} color="#EC4899" style={{ marginRight: 6 }} />
              <StyledText style={{ fontSize: FONT_SIZES.md, color: COLORS.text.warmNeutral, fontWeight: '500', fontFamily: FONTS.medium }}>
                {profile.age}
              </StyledText>
            </StyledView>

            {/* Height */}
            {profile.height && (
              <StyledView style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: COLORS.backgroundGray,
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderRadius: 20,
              }}>
                <EvaIcon name="maximize" variant="outline" size={16} color="#10B981" style={{ marginRight: 6 }} />
                <StyledText style={{ fontSize: FONT_SIZES.md, color: COLORS.text.warmNeutral, fontWeight: '500', fontFamily: FONTS.medium }}>
                  {formatHeight(profile.height)}
                </StyledText>
              </StyledView>
            )}

            {/* Occupation */}
            {profile.currentJob && (
              <StyledView style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: COLORS.backgroundGray,
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderRadius: 20,
              }}>
                <EvaIcon name="briefcase" variant="outline" size={16} color="#3B82F6" style={{ marginRight: 6 }} />
                <StyledText style={{ fontSize: FONT_SIZES.md, color: COLORS.text.warmNeutral, fontWeight: '500', fontFamily: FONTS.medium }}>
                  {profile.currentJob}
                </StyledText>
              </StyledView>
            )}

            {/* Ethnicity */}
            {profile.ethnicity && (
              <StyledView style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: COLORS.backgroundGray,
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderRadius: 20,
              }}>
                <EvaIcon name="globe" variant="outline" size={16} color="#8B5CF6" style={{ marginRight: 6 }} />
                <StyledText style={{ fontSize: FONT_SIZES.md, color: COLORS.text.warmNeutral, fontWeight: '500', fontFamily: FONTS.medium }}>
                  {profile.ethnicity}
                </StyledText>
              </StyledView>
            )}

            {/* Religion */}
            {profile.religion && (
              <StyledView style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: COLORS.backgroundGray,
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderRadius: 20,
              }}>
                <EvaIcon name="moon" variant="outline" size={16} color="#6366F1" style={{ marginRight: 6 }} />
                <StyledText style={{ fontSize: FONT_SIZES.md, color: COLORS.text.warmNeutral, fontWeight: '500', fontFamily: FONTS.medium }}>
                  {profile.religion}
                </StyledText>
              </StyledView>
            )}

            {/* Political Leaning */}
            {profile.politicalLeaning && (
              <StyledView style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: COLORS.backgroundGray,
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderRadius: 20,
              }}>
                <EvaIcon name="flag" variant="outline" size={16} color="#EF4444" style={{ marginRight: 6 }} />
                <StyledText style={{ fontSize: FONT_SIZES.md, color: COLORS.text.warmNeutral, fontWeight: '500', fontFamily: FONTS.medium }}>
                  {formatProfileValue(profile.politicalLeaning)}
                </StyledText>
              </StyledView>
            )}

            {/* Joined Date */}
            {profile.createdAt && (
              <StyledView style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: COLORS.backgroundGray,
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderRadius: 20,
              }}>
                <EvaIcon name="clock" variant="outline" size={16} color="#4B5563" style={{ marginRight: 6 }} />
                <StyledText style={{ fontSize: FONT_SIZES.md, color: COLORS.text.warmNeutral, fontWeight: '500', fontFamily: FONTS.medium }}>
                  Joined {new Date(profile.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                </StyledText>
              </StyledView>
            )}
          </StyledView>

          {/* Interests */}
          {profile.interests && profile.interests.length > 0 && (
            <StyledView style={{ marginBottom: 20 }}>
              <StyledView style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                <EvaIcon name="star" variant="outline" size={18} color="#F59E0B" style={{ marginRight: 6 }} />
                <StyledText style={{ fontSize: FONT_SIZES.lg, color: COLORS.text.warmNeutral, fontWeight: '600', fontFamily: FONTS.semiBold }}>Interests</StyledText>
              </StyledView>
              <StyledView style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                {profile.interests.map((interest: string, index: number) => (
                  <StyledView
                    key={index}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      backgroundColor: '#FEF3C7',
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                      borderRadius: 16,
                    }}
                  >
                    <IconScoutIcon name={interestIconName(interest) ?? ''} size={14} style={{ marginRight: 3 }} />
                    <StyledText style={{ fontSize: FONT_SIZES.md, color: '#B45309', fontWeight: '500', fontFamily: FONTS.medium }}>
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
                <EvaIcon name="award" variant="outline" size={18} color="#10B981" style={{ marginRight: 6 }} />
                <StyledText style={{ fontSize: FONT_SIZES.lg, color: COLORS.text.warmNeutral, fontWeight: '600', fontFamily: FONTS.semiBold }}>Values</StyledText>
              </StyledView>
              <StyledView style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                {profile.values.map((value: string, index: number) => (
                  <StyledView
                    key={index}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      backgroundColor: COLORS.backgroundValuesTag,
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                      borderRadius: 16,
                    }}
                  >
                    <IconScoutIcon name={valueIconName(value) ?? ''} size={14} style={{ marginRight: 3 }} />
                    <StyledText style={{ fontSize: FONT_SIZES.md, color: '#065F46', fontWeight: '500', fontFamily: FONTS.medium }}>
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
                <EvaIcon name="message-square" variant="outline" size={18} color="#7C3AED" style={{ marginRight: 6 }} />
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
              <EvaIcon name="people" variant="outline" size={18} color="#F59E0B" style={{ marginRight: 6 }} />
              <StyledText style={{ fontSize: FONT_SIZES.lg, color: COLORS.text.warmNeutral, fontWeight: '600', fontFamily: FONTS.semiBold }}>Family</StyledText>
            </StyledView>
            <StyledView style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
              <EvaIcon name="person" variant="outline" size={16} color="#78716C" style={{ marginRight: 8 }} />
              <StyledText style={{ fontSize: FONT_SIZES.base, fontFamily: FONTS.regular, color: COLORS.text.warmNeutral }}>
                {profile.hasChildren === 'no' ? 'No children' : profile.hasChildren === 'yes' ? 'Has children' : 'Prefer not to say'}
              </StyledText>
            </StyledView>
            {profile.familyPlans && (
              <StyledView style={{ flexDirection: 'row', alignItems: 'center' }}>
                <EvaIcon name="heart" variant="outline" size={16} color="#78716C" style={{ marginRight: 8 }} />
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
              <EvaIcon name="trending-up" variant="outline" size={18} color="#8B5CF6" style={{ marginRight: 6 }} />
              <StyledText style={{ fontSize: FONT_SIZES.lg, color: COLORS.text.warmNeutral, fontWeight: '600', fontFamily: FONTS.semiBold }}>Lifestyle</StyledText>
            </StyledView>

            {profile.drinkingFrequency && (
              <StyledView style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 10,
              }}>
                <StyledView style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <WineGlassIcon size={16} color="#78716C" style={{ marginRight: 8 }} />
                  <StyledText style={{ fontSize: FONT_SIZES.base, fontFamily: FONTS.regular, color: COLORS.text.warmNeutral }}>Drinking</StyledText>
                </StyledView>
                <StyledText style={{ fontSize: FONT_SIZES.base, color: COLORS.text.subtle, fontWeight: '500', fontFamily: FONTS.medium }}>
                  {capitalize(profile.drinkingFrequency)}
                </StyledText>
              </StyledView>
            )}

            {profile.cannabisFrequency && (
              <StyledView style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 10,
              }}>
                <StyledView style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <LeafIcon size={16} color="#78716C" style={{ marginRight: 8 }} />
                  <StyledText style={{ fontSize: FONT_SIZES.base, fontFamily: FONTS.regular, color: COLORS.text.warmNeutral }}>Cannabis</StyledText>
                </StyledView>
                <StyledText style={{ fontSize: FONT_SIZES.base, color: COLORS.text.subtle, fontWeight: '500', fontFamily: FONTS.medium }}>
                  {capitalize(profile.cannabisFrequency)}
                </StyledText>
              </StyledView>
            )}

            {profile.tobaccoFrequency && (
              <StyledView style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}>
                <StyledView style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <CigaretteIcon size={16} color="#78716C" style={{ marginRight: 8 }} />
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
          <StyledView style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            padding: 20,
            backgroundColor: '#FBF9F6',
            borderTopWidth: 1,
            borderTopColor: '#E7DED4',
          }}>
            {actionButton}
          </StyledView>
        )}
      </StyledView>
    </Modal>
  );
}

export default ProfileView;
