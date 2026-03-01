/**
 * ProfileView Component
 *
 * Standardized profile display used across the app.
 * Handles different contexts: own profile, grid candidates, match proposals, active matches.
 */

import React, { useState, useRef } from 'react';
import { View, Modal, ScrollView, Text, TouchableOpacity, Image, FlatList, Dimensions } from 'react-native';
import { styled } from 'nativewind';
import { Ionicons } from '@expo/vector-icons';
import { UserProfile } from '../../types';

const StyledView = styled(View);
const StyledText = styled(Text);
const StyledScrollView = styled(ScrollView);
const StyledTouchableOpacity = styled(TouchableOpacity);
const StyledImage = styled(Image);

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
  const flatListRef = useRef<FlatList>(null);

  if (!profile) return null;

  // Helper to capitalize
  const capitalize = (str: string | undefined): string => {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
  };

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
            <Ionicons name="arrow-back" size={28} color="#4A4540" />
            <StyledText style={{ fontSize: 16, color: '#4A4540', marginLeft: 8 }}>Back</StyledText>
          </StyledTouchableOpacity>
        </StyledView>

        {/* Name (if shown) */}
        {showName && (
          <StyledView style={{ paddingHorizontal: 20, marginBottom: 12 }}>
            <StyledText style={{ fontSize: 28, fontWeight: '700', color: '#4A4540' }}>
              {profile.firstName} {profile.lastName}
            </StyledText>
          </StyledView>
        )}

        {/* Photo Carousel */}
        {profile.photos && profile.photos.length > 0 && (
          <StyledView style={{ paddingHorizontal: 20, marginBottom: 20 }}>
            <FlatList
              ref={flatListRef}
              data={profile.photos.slice(0, 6)}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={(event) => {
                const index = Math.round(event.nativeEvent.contentOffset.x / (SCREEN_WIDTH - 40));
                setCurrentPhotoIndex(index);
              }}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <StyledView style={{ width: SCREEN_WIDTH - 40 }}>
                  <StyledImage
                    source={{ uri: item.url }}
                    style={{
                      width: '100%',
                      height: 280,
                      borderRadius: 16,
                    }}
                    resizeMode="cover"
                  />
                </StyledView>
              )}
            />

            {/* Pagination Dots */}
            {profile.photos.length > 1 && (
              <StyledView style={{
                flexDirection: 'row',
                justifyContent: 'center',
                marginTop: 12,
                gap: 6,
              }}>
                {profile.photos.slice(0, 6).map((_, index) => (
                  <StyledView
                    key={index}
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: 4,
                      backgroundColor: index === currentPhotoIndex ? '#7C3AED' : '#D1D5DB',
                    }}
                  />
                ))}
              </StyledView>
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
                backgroundColor: '#F3E8FF',
                borderRadius: 16,
                padding: 16,
                alignItems: 'center',
                marginBottom: 16,
              }}>
                <StyledText style={{ fontSize: 48, fontWeight: '700', color: '#7C3AED' }}>
                  {compatibilityScore}%
                </StyledText>
                <StyledText style={{ fontSize: 14, color: '#6B21A8', fontWeight: '600' }}>
                  Compatibility Match
                </StyledText>
              </StyledView>

              {/* Why This Match */}
              {whyThisMatch.length > 0 && (
                <StyledView style={{ marginBottom: 12 }}>
                  <StyledText style={{ fontSize: 15, fontWeight: '700', color: '#059669', marginBottom: 8 }}>
                    Why This Match
                  </StyledText>
                  {whyThisMatch.map((reason, index) => (
                    <StyledView key={index} style={{ flexDirection: 'row', marginBottom: 6 }}>
                      <StyledText style={{ color: '#059669', marginRight: 8 }}>✓</StyledText>
                      <StyledText style={{ fontSize: 13, color: '#4A4540', flex: 1 }}>
                        {reason}
                      </StyledText>
                    </StyledView>
                  ))}
                </StyledView>
              )}

              {/* What Doesn't Fit */}
              {whatDoesntFit.length > 0 && (
                <StyledView>
                  <StyledText style={{ fontSize: 15, fontWeight: '700', color: '#B45309', marginBottom: 8 }}>
                    What Doesn't Fit
                  </StyledText>
                  {whatDoesntFit.map((concern, index) => (
                    <StyledView key={index} style={{ flexDirection: 'row', marginBottom: 6 }}>
                      <StyledText style={{ color: '#B45309', marginRight: 8 }}>•</StyledText>
                      <StyledText style={{ fontSize: 13, color: '#4A4540', flex: 1 }}>
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
                backgroundColor: '#F3F4F6',
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderRadius: 20,
              }}>
                <Ionicons name="person" size={16} color="#7C3AED" style={{ marginRight: 6 }} />
                <StyledText style={{ fontSize: 13, color: '#4A4540', fontWeight: '500' }}>
                  {capitalize(profile.gender[0])}
                </StyledText>
              </StyledView>
            )}

            {/* Pronouns */}
            {profile.pronouns && (
              <StyledView style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: '#F3F4F6',
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderRadius: 20,
              }}>
                <Ionicons name="chatbubble-outline" size={16} color="#EC4899" style={{ marginRight: 6 }} />
                <StyledText style={{ fontSize: 13, color: '#4A4540', fontWeight: '500' }}>
                  {profile.pronouns.replace('_', '/')}
                </StyledText>
              </StyledView>
            )}

            {/* Age */}
            <StyledView style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: '#F3F4F6',
              paddingHorizontal: 12,
              paddingVertical: 8,
              borderRadius: 20,
            }}>
              <Ionicons name="calendar-outline" size={16} color="#EC4899" style={{ marginRight: 6 }} />
              <StyledText style={{ fontSize: 13, color: '#4A4540', fontWeight: '500' }}>
                {profile.age}
              </StyledText>
            </StyledView>

            {/* Height */}
            {profile.height && (
              <StyledView style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: '#F3F4F6',
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderRadius: 20,
              }}>
                <Ionicons name="resize-outline" size={16} color="#10B981" style={{ marginRight: 6 }} />
                <StyledText style={{ fontSize: 13, color: '#4A4540', fontWeight: '500' }}>
                  {formatHeight(profile.height)}
                </StyledText>
              </StyledView>
            )}

            {/* Occupation */}
            {profile.currentJob && (
              <StyledView style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: '#F3F4F6',
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderRadius: 20,
              }}>
                <Ionicons name="briefcase" size={16} color="#3B82F6" style={{ marginRight: 6 }} />
                <StyledText style={{ fontSize: 13, color: '#4A4540', fontWeight: '500' }}>
                  {profile.currentJob}
                </StyledText>
              </StyledView>
            )}

            {/* Ethnicity */}
            {profile.ethnicity && (
              <StyledView style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: '#F3F4F6',
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderRadius: 20,
              }}>
                <Ionicons name="globe-outline" size={16} color="#8B5CF6" style={{ marginRight: 6 }} />
                <StyledText style={{ fontSize: 13, color: '#4A4540', fontWeight: '500' }}>
                  {profile.ethnicity}
                </StyledText>
              </StyledView>
            )}

            {/* Religion */}
            {profile.religion && (
              <StyledView style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: '#F3F4F6',
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderRadius: 20,
              }}>
                <Ionicons name="moon-outline" size={16} color="#6366F1" style={{ marginRight: 6 }} />
                <StyledText style={{ fontSize: 13, color: '#4A4540', fontWeight: '500' }}>
                  {profile.religion}
                </StyledText>
              </StyledView>
            )}

            {/* Political Leaning */}
            {profile.politicalLeaning && (
              <StyledView style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: '#F3F4F6',
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderRadius: 20,
              }}>
                <Ionicons name="flag-outline" size={16} color="#EF4444" style={{ marginRight: 6 }} />
                <StyledText style={{ fontSize: 13, color: '#4A4540', fontWeight: '500' }}>
                  {capitalize(profile.politicalLeaning.replace(/_/g, ' '))}
                </StyledText>
              </StyledView>
            )}
          </StyledView>

          {/* Interests */}
          {profile.interests && profile.interests.length > 0 && (
            <StyledView style={{ marginBottom: 20 }}>
              <StyledView style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                <Ionicons name="star" size={18} color="#F59E0B" style={{ marginRight: 6 }} />
                <StyledText style={{ fontSize: 15, color: '#4A4540', fontWeight: '600' }}>Interests</StyledText>
              </StyledView>
              <StyledView style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                {profile.interests.map((interest: string, index: number) => (
                  <StyledView
                    key={index}
                    style={{
                      backgroundColor: '#FEF3C7',
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                      borderRadius: 16,
                    }}
                  >
                    <StyledText style={{ fontSize: 13, color: '#B45309', fontWeight: '500' }}>
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
                <Ionicons name="diamond" size={18} color="#10B981" style={{ marginRight: 6 }} />
                <StyledText style={{ fontSize: 15, color: '#4A4540', fontWeight: '600' }}>Values</StyledText>
              </StyledView>
              <StyledView style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                {profile.values.map((value: string, index: number) => (
                  <StyledView
                    key={index}
                    style={{
                      backgroundColor: '#D1FAE5',
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                      borderRadius: 16,
                    }}
                  >
                    <StyledText style={{ fontSize: 13, color: '#065F46', fontWeight: '500' }}>
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
                <Ionicons name="chatbox-ellipses" size={18} color="#7C3AED" style={{ marginRight: 6 }} />
                <StyledText style={{ fontSize: 15, color: '#4A4540', fontWeight: '600' }}>About Me</StyledText>
              </StyledView>

              {profile.deepQuestions.map((q, i) => (
                <StyledView key={i} style={{ marginBottom: 12 }}>
                  <StyledText style={{ fontSize: 14, color: '#4A4540', lineHeight: 20 }}>
                    {q.answer}
                  </StyledText>
                </StyledView>
              ))}
            </StyledView>
          )}

          {/* Family */}
          <StyledView style={{ marginBottom: 20 }}>
            <StyledView style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
              <Ionicons name="people" size={18} color="#F59E0B" style={{ marginRight: 6 }} />
              <StyledText style={{ fontSize: 15, color: '#4A4540', fontWeight: '600' }}>Family</StyledText>
            </StyledView>
            <StyledView style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
              <Ionicons name="person-outline" size={16} color="#78716C" style={{ marginRight: 8 }} />
              <StyledText style={{ fontSize: 14, color: '#4A4540' }}>
                {profile.hasChildren === 'no' ? 'No children' : profile.hasChildren === 'yes' ? 'Has children' : 'Prefer not to say'}
              </StyledText>
            </StyledView>
            {profile.familyPlans && (
              <StyledView style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="heart-outline" size={16} color="#78716C" style={{ marginRight: 8 }} />
                <StyledText style={{ fontSize: 14, color: '#4A4540' }}>
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
              <Ionicons name="leaf" size={18} color="#8B5CF6" style={{ marginRight: 6 }} />
              <StyledText style={{ fontSize: 15, color: '#4A4540', fontWeight: '600' }}>Lifestyle</StyledText>
            </StyledView>

            {profile.drinkingFrequency && (
              <StyledView style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 10,
              }}>
                <StyledView style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Ionicons name="wine" size={16} color="#78716C" style={{ marginRight: 8 }} />
                  <StyledText style={{ fontSize: 14, color: '#4A4540' }}>Drinking</StyledText>
                </StyledView>
                <StyledText style={{ fontSize: 14, color: '#78716C', fontWeight: '500' }}>
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
                  <Ionicons name="leaf-outline" size={16} color="#78716C" style={{ marginRight: 8 }} />
                  <StyledText style={{ fontSize: 14, color: '#4A4540' }}>Cannabis</StyledText>
                </StyledView>
                <StyledText style={{ fontSize: 14, color: '#78716C', fontWeight: '500' }}>
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
                  <Ionicons name="fitness-outline" size={16} color="#78716C" style={{ marginRight: 8 }} />
                  <StyledText style={{ fontSize: 14, color: '#4A4540' }}>Tobacco</StyledText>
                </StyledView>
                <StyledText style={{ fontSize: 14, color: '#78716C', fontWeight: '500' }}>
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
