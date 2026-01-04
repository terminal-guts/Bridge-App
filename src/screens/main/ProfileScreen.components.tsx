/**
 * ProfileScreen Components
 *
 * Extracted reusable components for ProfileScreen
 */

import React from 'react';
import { View, Image, TouchableOpacity, ScrollView } from 'react-native';
import { styled } from 'nativewind';
import { H2, H3, Body, Card, CollapsibleCard, Chip } from '../../components/ui';
import { Ionicons } from '@expo/vector-icons';
import { UserProfile, Match } from '../../types';

const StyledView = styled(View);
const StyledImage = styled(Image);
const StyledTouchableOpacity = styled(TouchableOpacity);
const StyledScrollView = styled(ScrollView);

// Types
export type SectionType = 'basic' | 'interests' | 'values' | 'lifestyle' | 'preferences';

interface ProfileInfoItemProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  subtitle?: string;
}

/**
 * Reusable profile info item with icon
 */
export const ProfileInfoItem: React.FC<ProfileInfoItemProps> = ({
  icon,
  label,
  value,
  subtitle,
}) => (
  <StyledView className="flex-row items-center">
    <StyledView className="w-10 h-10 bg-primary-100 rounded-lg items-center justify-center mr-3">
      <Ionicons name={icon} size={20} color="#437FFF" />
    </StyledView>
    <StyledView className="flex-1">
      <Body className="text-neutral-500 text-xs mb-1">{label}</Body>
      <Body className="text-neutral-900 font-semibold">{value}</Body>
      {subtitle && <Body className="text-neutral-600 text-sm">{subtitle}</Body>}
    </StyledView>
  </StyledView>
);

interface BasicInfoSectionProps {
  profile: UserProfile;
  onEdit: () => void;
}

/**
 * Basic profile information section
 * Split into multiple cards for better visual hierarchy and scanability
 */
export const BasicInfoSection: React.FC<BasicInfoSectionProps> = ({ profile, onEdit }) => (
  <>
    {/* About Me - Demographics & Location */}
    <CollapsibleCard
      title={
        <StyledView className="flex-row justify-between items-center flex-1">
          <H3>About Me</H3>
          <StyledTouchableOpacity
            onPress={(e) => {
              e.stopPropagation();
              onEdit();
            }}
            accessibilityLabel="Edit profile"
            accessibilityRole="button"
          >
            <Ionicons name="pencil" size={18} color="#437FFF" />
          </StyledTouchableOpacity>
        </StyledView>
      }
      defaultExpanded={true}
    >
      <StyledView className="space-y-3">
        <ProfileInfoItem icon="calendar-outline" label="Age" value={`${profile.age} years old`} />
        {profile.height && (
          <ProfileInfoItem icon="resize-outline" label="Height" value={profile.height} />
        )}
        <ProfileInfoItem icon="body-outline" label="Ethnicity" value={profile.ethnicity} />
        {profile.location && (
          <ProfileInfoItem icon="location-outline" label="Lives in" value={profile.location} />
        )}
        {profile.hometown && (
          <ProfileInfoItem icon="home-outline" label="From" value={profile.hometown} />
        )}
      </StyledView>
    </CollapsibleCard>

    {/* Professional & Education */}
    {(profile.currentJob || profile.school) && (
      <CollapsibleCard
        title={<H3>Professional & Education</H3>}
        defaultExpanded={false}
      >
        <StyledView className="space-y-3">
          {profile.currentJob && (
            <ProfileInfoItem
              icon="briefcase-outline"
              label="Current Job"
              value={profile.currentJob}
              subtitle={profile.companyPosition}
            />
          )}
          {profile.school && (
            <ProfileInfoItem
              icon="school-outline"
              label="Education"
              value={profile.school}
              subtitle={profile.educationLevel ? profile.educationLevel.replace('_', ' ') : undefined}
            />
          )}
        </StyledView>
      </CollapsibleCard>
    )}

    {/* Identity & Beliefs */}
    {((profile.pronounsList && profile.pronounsList.length > 0) ||
      profile.customMyGender ||
      (profile.interestedInGenders && profile.interestedInGenders.length > 0) ||
      profile.religion ||
      (profile.politicalLeaning && profile.politicalLeaning !== 'prefer_not_to_say')) && (
      <CollapsibleCard
        title={<H3>Identity & Beliefs</H3>}
        defaultExpanded={false}
      >
        <StyledView className="space-y-3">
          {profile.pronounsList && profile.pronounsList.length > 0 && (
            <ProfileInfoItem
              icon="person-outline"
              label="Pronouns"
              value={profile.pronounsList.join(' / ')}
            />
          )}
          {profile.customMyGender && (
            <ProfileInfoItem
              icon="transgender-outline"
              label="Gender Identity"
              value={profile.customMyGender}
            />
          )}
          {profile.interestedInGenders && profile.interestedInGenders.length > 0 && (
            <ProfileInfoItem
              icon="heart-outline"
              label="Interested In"
              value={profile.interestedInGenders.map(g => g.charAt(0).toUpperCase() + g.slice(1)).join(', ')}
              subtitle={profile.customInterestedIn}
            />
          )}
          {profile.religion && (
            <ProfileInfoItem
              icon="flower-outline"
              label="Religion"
              value={profile.religion}
            />
          )}
          {profile.politicalLeaning && profile.politicalLeaning !== 'prefer_not_to_say' && (
            <ProfileInfoItem
              icon="flag-outline"
              label="Political Views"
              value={profile.politicalLeaning.replace(/_/g, ' ')}
            />
          )}
        </StyledView>
      </CollapsibleCard>
    )}

    {/* Family & Relationships */}
    {(profile.hasChildren || profile.familyPlans) && (
      <CollapsibleCard
        title={<H3>Family & Relationships</H3>}
        defaultExpanded={false}
      >
        <StyledView className="space-y-3">
          {profile.hasChildren && (
            <ProfileInfoItem
              icon="people-outline"
              label="Has Children"
              value={profile.hasChildren}
            />
          )}
          {profile.familyPlans && (
            <ProfileInfoItem
              icon="heart-outline"
              label="Family Plans"
              value={profile.familyPlans}
            />
          )}
        </StyledView>
      </CollapsibleCard>
    )}

    {/* Lifestyle & Habits */}
    {(profile.drinkingFrequency || profile.cannabisFrequency || profile.tobaccoFrequency || profile.otherDrugsFrequency) && (
      <CollapsibleCard
        title={<H3>Lifestyle & Habits</H3>}
        defaultExpanded={false}
      >
        <StyledView className="space-y-4">
          {(profile.drinkingFrequency || profile.cannabisFrequency || profile.tobaccoFrequency || profile.otherDrugsFrequency) && (
            <StyledView className="space-y-3">
              {profile.drinkingFrequency && (
                <ProfileInfoItem icon="wine-outline" label="Drinking" value={profile.drinkingFrequency} />
              )}
              {profile.cannabisFrequency && (
                <ProfileInfoItem icon="leaf-outline" label="Cannabis" value={profile.cannabisFrequency} />
              )}
              {profile.tobaccoFrequency && (
                <ProfileInfoItem icon="ban-outline" label="Tobacco" value={profile.tobaccoFrequency} />
              )}
              {profile.otherDrugsFrequency && (
                <ProfileInfoItem icon="medical-outline" label="Other Substances" value={profile.otherDrugsFrequency} />
              )}
            </StyledView>
          )}
        </StyledView>
      </CollapsibleCard>
    )}
  </>
);

interface InterestsSectionProps {
  interests: string[];
}

/**
 * Interests section
 */
export const InterestsSection: React.FC<InterestsSectionProps> = ({ interests }) => {
  // Only render if there are interests to display
  if (!interests || interests.length === 0) return null;

  return (
    <CollapsibleCard
      title={<H3>Interests</H3>}
      defaultExpanded={false}
      className="mb-2"
    >
      <StyledView className="flex-row flex-wrap -mx-1">
        {interests.map((interest, index) => (
          <StyledView key={index} className="px-1 mb-2">
            <Chip label={interest} variant="interest" />
          </StyledView>
        ))}
      </StyledView>
    </CollapsibleCard>
  );
};

interface ValuesSectionProps {
  values: string[];
}

/**
 * Values section
 */
export const ValuesSection: React.FC<ValuesSectionProps> = ({ values }) => {
  // Only render if there are values to display
  if (!values || values.length === 0) return null;

  return (
    <CollapsibleCard
      title={<H3>My Values</H3>}
      defaultExpanded={false}
      className="mb-2"
    >
      <StyledView className="flex-row flex-wrap -mx-1">
        {values.map((value, index) => (
          <StyledView key={index} className="px-1 mb-2">
            <Chip label={value} variant="value" />
          </StyledView>
        ))}
      </StyledView>
    </CollapsibleCard>
  );
};

interface PartnerLifestyleSectionProps {
  partnerLifestylePreferences?: {
    drinking: string;
    weed: string;
    tobacco: string;
    drugs: string;
  };
  onEdit?: () => void;
}

/**
 * Partner Lifestyle Preferences section
 * Displays what the user is looking for in a partner regarding lifestyle choices
 */
export const PartnerLifestyleSection: React.FC<PartnerLifestyleSectionProps> = ({ partnerLifestylePreferences, onEdit }) => {
  if (!partnerLifestylePreferences) return null;

  const { drinking, weed, tobacco, drugs } = partnerLifestylePreferences;

  // Only show if at least one preference is set
  if (!drinking && !weed && !tobacco && !drugs) return null;

  return (
    <Card className="mb-6">
      <StyledView className="flex-row items-center justify-between mb-3">
        <StyledView className="flex-row items-center flex-1">
          <Ionicons name="heart-circle-outline" size={20} color="#7C3AED" />
          <H3 className="ml-2">What I Want in a Partner - Lifestyle</H3>
        </StyledView>
        {onEdit && (
          <StyledTouchableOpacity
            onPress={onEdit}
            accessibilityLabel="Edit partner lifestyle preferences"
            accessibilityRole="button"
          >
            <Ionicons name="pencil" size={18} color="#7C3AED" />
          </StyledTouchableOpacity>
        )}
      </StyledView>
      <StyledView className="space-y-3">
        {drinking && (
          <StyledView className="flex-row justify-between items-center">
            <StyledView className="flex-row items-center">
              <Ionicons name="wine-outline" size={18} color="#7C3AED" />
              <Body className="text-purple-700 ml-2">Drinking</Body>
            </StyledView>
            <Body className="text-purple-900 font-medium capitalize">{drinking.replace(/_/g, ' ')}</Body>
          </StyledView>
        )}
        {weed && (
          <StyledView className="flex-row justify-between items-center">
            <StyledView className="flex-row items-center">
              <Ionicons name="leaf-outline" size={18} color="#7C3AED" />
              <Body className="text-purple-700 ml-2">Weed</Body>
            </StyledView>
            <Body className="text-purple-900 font-medium capitalize">{weed.replace(/_/g, ' ')}</Body>
          </StyledView>
        )}
        {tobacco && (
          <StyledView className="flex-row justify-between items-center">
            <StyledView className="flex-row items-center">
              <Ionicons name="close-circle-outline" size={18} color="#7C3AED" />
              <Body className="text-purple-700 ml-2">Tobacco</Body>
            </StyledView>
            <Body className="text-purple-900 font-medium capitalize">{tobacco.replace(/_/g, ' ')}</Body>
          </StyledView>
        )}
        {drugs && (
          <StyledView className="flex-row justify-between items-center">
            <StyledView className="flex-row items-center">
              <Ionicons name="medical-outline" size={18} color="#7C3AED" />
              <Body className="text-purple-700 ml-2">Drugs</Body>
            </StyledView>
            <Body className="text-purple-900 font-medium capitalize">{drugs.replace(/_/g, ' ')}</Body>
          </StyledView>
        )}
      </StyledView>
    </Card>
  );
};

interface LifestyleItemProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}

const LifestyleItem: React.FC<LifestyleItemProps> = ({ icon, label, value }) => (
  <StyledView className="flex-row justify-between items-center">
    <StyledView className="flex-row items-center">
      <Ionicons name={icon} size={18} color="#667085" />
      <Body className="text-neutral-600 ml-2">{label}</Body>
    </StyledView>
    <Body className="text-neutral-900 font-medium capitalize">{value}</Body>
  </StyledView>
);

interface LifestyleSectionProps {
  lifestyle: UserProfile['lifestyle'];
}

/**
 * Lifestyle section
 */
export const LifestyleSection: React.FC<LifestyleSectionProps> = ({ lifestyle }) => {
  // Guard: Only render if lifestyle data exists and has at least one non-default value
  const hasLifestyleData = lifestyle && (
    lifestyle.exercise ||
    lifestyle.drinking ||
    lifestyle.smoking ||
    lifestyle.children ||
    (lifestyle.pets && lifestyle.pets.length > 0)
  );

  if (!hasLifestyleData) {
    return null; // Don't show empty lifestyle section
  }

  return (
    <Card className="mb-6">
      <H3 className="mb-4">Lifestyle</H3>
      <StyledView className="space-y-3">
        {lifestyle.exercise && (
          <LifestyleItem
            icon="fitness-outline"
            label="Exercise"
            value={lifestyle.exercise.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
          />
        )}
        {lifestyle.drinking && (
          <LifestyleItem
            icon="wine-outline"
            label="Drinking"
            value={lifestyle.drinking.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
          />
        )}
        {lifestyle.smoking && (
          <LifestyleItem
            icon="ban-outline"
            label="Smoking"
            value={lifestyle.smoking.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
          />
        )}
        {lifestyle.children && (
          <LifestyleItem
            icon="heart-outline"
            label="Children Preference"
            value={lifestyle.children.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
          />
        )}
        {lifestyle.pets && lifestyle.pets.length > 0 && (
          <LifestyleItem
            icon="paw-outline"
            label="Pets"
            value={lifestyle.pets.map((p: string) => p.charAt(0).toUpperCase() + p.slice(1)).join(', ')}
          />
        )}
      </StyledView>
    </Card>
  );
};

interface PreferencesSectionProps {
  preferences: UserProfile['preferences'];
}

/**
 * Preferences section - Split into multiple cards for better readability
 */
export const PreferencesSection: React.FC<PreferencesSectionProps> = ({ preferences }) => (
  <>
    {/* Basic Preferences Card */}
    <Card className="mb-4">
      <H3 className="mb-4">Looking For - Basics</H3>
      <StyledView className="space-y-3">
        <LifestyleItem
          icon="calendar-outline"
          label="Age Range"
          value={`${preferences.ageMin}-${preferences.ageMax}`}
        />
        <LifestyleItem
          icon="people-outline"
          label="Interested In (Gender)"
          value={preferences.gender === 'both' ? 'Men & Women' : preferences.gender.charAt(0).toUpperCase() + preferences.gender.slice(1)}
        />
        <LifestyleItem
          icon="heart-outline"
          label="Looking For"
          value={preferences.lookingFor.charAt(0).toUpperCase() + preferences.lookingFor.slice(1)}
        />
      </StyledView>
    </Card>

    {/* Physical Preferences Card */}
    {(preferences.heightMin && preferences.heightMax) && (
      <Card className="mb-4">
        <H3 className="mb-4">Physical Preferences</H3>
        <StyledView className="space-y-3">
          <LifestyleItem
            icon="resize-outline"
            label="Height Preference"
            value={`${Math.floor(preferences.heightMin / 12)}'${preferences.heightMin % 12}" - ${Math.floor(preferences.heightMax / 12)}'${preferences.heightMax % 12}"`}
          />
        </StyledView>
      </Card>
    )}

  </>
);

interface MatchCardProps {
  match: Match;
  onMatchPress: (match: Match) => void;
}

/**
 * Match card component - Shows past matches with unmatch info
 *
 * Performance: Wrapped in React.memo to prevent unnecessary re-renders in lists
 */
export const MatchCard: React.FC<MatchCardProps> = React.memo(({ match, onMatchPress }) => {
  const matchProfile = match.user2Profile || match.user1Profile;
  if (!matchProfile) return null;

  // Format dates
  const matchedDate = match.acceptedAt
    ? new Date(match.acceptedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : 'Unknown';

  const unmatchedDate = match.unmatchedAt
    ? new Date(match.unmatchedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : null;

  return (
    <StyledTouchableOpacity
      onPress={() => onMatchPress(match)}
      activeOpacity={0.7}
    >
      <Card elevation={1} className="mb-4">
        <StyledView className="flex-row items-center justify-between">
          <StyledView className="flex-1">
            <H3 className="mb-1">
              {matchProfile.firstName}
            </H3>
            <StyledView className="flex-row items-center mb-0.5">
              <Ionicons name="heart" size={12} color="#10B981" />
              <Body className="text-neutral-600 text-xs ml-1.5">
                Matched: {matchedDate}
              </Body>
            </StyledView>
            {unmatchedDate && (
              <StyledView className="flex-row items-center">
                <Ionicons name="close-circle" size={12} color="#EF4444" />
                <Body className="text-neutral-600 text-xs ml-1.5">
                  Unmatched: {unmatchedDate}
                </Body>
              </StyledView>
            )}
          </StyledView>
          <Ionicons name="chevron-forward" size={20} color="#D0D5DD" />
        </StyledView>
      </Card>
    </StyledTouchableOpacity>
  );
}, (prevProps, nextProps) => {
  // Custom comparison - only re-render if match data changes
  return (
    prevProps.match.id === nextProps.match.id &&
    prevProps.match.acceptedAt === nextProps.match.acceptedAt &&
    prevProps.match.unmatchedAt === nextProps.match.unmatchedAt &&
    prevProps.onMatchPress === nextProps.onMatchPress
  );
});

interface EmptyStateProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  message: string;
}

/**
 * Enhanced illustrated empty state component
 * Features:
 * - Decorative background circles for depth
 * - Gradient icon container for visual interest
 * - Improved typography and spacing
 * - Subtle elevation for card
 * - Properly centered icon and content
 */
export const EmptyState: React.FC<EmptyStateProps> = ({ icon, title, message }) => (
  <Card elevation={1} className="bg-gradient-to-br from-neutral-50 to-white">
    <StyledView className="items-center justify-center py-8 px-4">
      {/* Decorative Background Circles - Centered */}
      <StyledView className="relative mb-4 items-center justify-center">
        {/* Main icon container with gradient - Centered */}
        <StyledView className="w-20 h-20 bg-gradient-to-br from-primary-100 to-primary-200 rounded-2xl items-center justify-center shadow-sm">
          {/* Inner glow effect */}
          <StyledView className="absolute w-16 h-16 bg-white/40 rounded-xl" />

          {/* Icon - Properly centered */}
          <Ionicons name={icon} size={36} color="#437FFF" style={{ zIndex: 1 }} />
        </StyledView>
      </StyledView>

      {/* Text Content - Centered */}
      <StyledView className="items-center max-w-xs">
        <Body className="text-neutral-900 font-bold text-base mb-2 text-center">{title}</Body>
        <Body className="text-neutral-600 text-sm text-center leading-5">{message}</Body>
      </StyledView>
    </StyledView>
  </Card>
);

/**
 * About Me Summary Card
 * Shows key profile information with edit button
 */
interface AboutMeSummaryProps {
  profile: UserProfile;
  onEdit: () => void;
}

export const AboutMeSummary: React.FC<AboutMeSummaryProps> = ({ profile, onEdit }) => {
  // Count how many profile sections are filled
  const getSectionCounts = () => {
    let count = 0;

    // Basic info
    if (profile.age) count++;
    if (profile.height) count++;
    if (profile.ethnicity) count++;
    if (profile.location) count++;

    // Professional
    if (profile.currentJob) count++;
    // School is optional and not shown in About Me card

    // Lifestyle
    if (profile.drinkingFrequency) count++;
    if (profile.hasChildren) count++;
    if (profile.familyPlans) count++;

    // Interests & Values
    if (profile.interests?.length > 0) count++;
    if (profile.values?.length > 0) count++;

    return count;
  };

  const filledSections = getSectionCounts();

  return (
    <Card
      elevation={3}
      className="mb-4 bg-gradient-to-r from-blue-50 to-primary-50 border-2 border-primary-200"
      style={{
        shadowColor: '#2952CC',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.18,
        shadowRadius: 12,
        elevation: 6,
      }}
    >
      <StyledView className="flex-row items-center justify-between mb-3">
        <StyledView className="flex-row items-center flex-1">
          <StyledView className="w-12 h-12 bg-primary-500 rounded-xl items-center justify-center mr-3 shadow-md">
            <Ionicons name="person" size={24} color="white" />
          </StyledView>
          <StyledView className="flex-1">
            <H3 className="text-neutral-900 mb-1">About Me</H3>
            <Body className="text-neutral-600 text-xs">Your profile information</Body>
          </StyledView>
        </StyledView>
        <StyledTouchableOpacity
          onPress={onEdit}
          accessibilityLabel="Edit profile information"
          accessibilityRole="button"
          className="bg-primary-500 px-4 py-2 rounded-lg"
        >
          <Body className="text-white font-semibold text-sm">Edit All</Body>
        </StyledTouchableOpacity>
      </StyledView>

      <StyledView className="space-y-2">
        {/* Age */}
        <StyledView className="flex-row items-center justify-between py-2 border-b border-primary-100/50">
          <StyledView className="flex-row items-center">
            <Ionicons name="calendar-outline" size={16} color="#437FFF" />
            <Body className="text-neutral-700 text-sm ml-2">Age</Body>
          </StyledView>
          <Body className="text-neutral-900 font-semibold text-sm">
            {profile.age || '-'}
          </Body>
        </StyledView>

        {/* Ethnicity */}
        <StyledView className="flex-row items-center justify-between py-2 border-b border-primary-100/50">
          <StyledView className="flex-row items-center">
            <Ionicons name="body-outline" size={16} color="#437FFF" />
            <Body className="text-neutral-700 text-sm ml-2">Ethnicity</Body>
          </StyledView>
          <Body className="text-neutral-900 font-semibold text-sm" numberOfLines={1}>
            {(() => {
              if (!profile.ethnicity) return '-';
              const ethnicities = profile.ethnicity.split(' / ').map(e => e.trim());
              if (ethnicities.length === 1) return ethnicities[0];
              return `${ethnicities[0]} +${ethnicities.length - 1}`;
            })()}
          </Body>
        </StyledView>

        {/* Location */}
        <StyledView className="flex-row items-center justify-between py-2 border-b border-primary-100/50">
          <StyledView className="flex-row items-center">
            <Ionicons name="location-outline" size={16} color="#437FFF" />
            <Body className="text-neutral-700 text-sm ml-2">Location</Body>
          </StyledView>
          <Body className="text-neutral-900 font-semibold text-sm">
            {profile.location || '-'}
          </Body>
        </StyledView>

        {/* Values & Interests Count - Values Left, Interests Right */}
        {((profile.values?.length || 0) > 0 || (profile.interests?.length || 0) > 0) && (
          <StyledView className="flex-row gap-2 pt-2">
            {(profile.values?.length || 0) > 0 && (
              <StyledView className="flex-1 py-2">
                <Body className="text-neutral-600 text-xs mb-1">Values</Body>
                <Body className="text-primary-700 font-bold text-sm">{profile.values.length} selected</Body>
              </StyledView>
            )}
            {(profile.interests?.length || 0) > 0 && (
              <StyledView className="flex-1 py-2">
                <Body className="text-neutral-600 text-xs mb-1">Interests</Body>
                <Body className="text-primary-700 font-bold text-sm">{profile.interests.length} selected</Body>
              </StyledView>
            )}
          </StyledView>
        )}
      </StyledView>
    </Card>
  );
};

/**
 * Match Preferences Summary Card
 * Shows key matching criteria with edit button
 */
interface MatchPreferencesSummaryProps {
  preferences: UserProfile['preferences'];
  preferredPolitics?: string[];
  nonNegotiablesCount?: number;
  preferredEthnicitiesCount?: number;
  interestsCount?: number;
  valuesCount?: number;
  onEdit: () => void;
}

export const MatchPreferencesSummary: React.FC<MatchPreferencesSummaryProps> = ({
  preferences,
  preferredPolitics,
  nonNegotiablesCount = 0,
  preferredEthnicitiesCount = 0,
  interestsCount = 0,
  valuesCount = 0,
  onEdit,
}) => {
  return (
    <Card
      elevation={3}
      className="mb-4 bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-200"
      style={{
        shadowColor: '#7C3AED',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.18,
        shadowRadius: 12,
        elevation: 6,
      }}
    >
      <StyledView className="flex-row items-center justify-between mb-3">
        <StyledView className="flex-row items-center flex-1">
          <StyledView className="w-12 h-12 bg-purple-500 rounded-xl items-center justify-center mr-3 shadow-md">
            <Ionicons name="heart" size={24} color="white" />
          </StyledView>
          <StyledView className="flex-1">
            <H3 className="text-neutral-900 mb-1">Match Preferences</H3>
            <Body className="text-neutral-600 text-xs">Who you're looking for</Body>
          </StyledView>
        </StyledView>
        <StyledTouchableOpacity
          onPress={onEdit}
          accessibilityLabel="Edit match preferences"
          accessibilityRole="button"
          className="bg-purple-500 px-4 py-2 rounded-lg"
        >
          <Body className="text-white font-semibold text-sm">Edit All</Body>
        </StyledTouchableOpacity>
      </StyledView>

      <StyledView className="space-y-2">
        {/* Looking For */}
        <StyledView className="flex-row items-center justify-between py-2 border-b border-purple-100/50">
          <StyledView className="flex-row items-center">
            <Ionicons name="heart-outline" size={16} color="#7C3AED" />
            <Body className="text-neutral-700 text-sm ml-2">Looking For</Body>
          </StyledView>
          <Body className="text-neutral-900 font-semibold text-sm capitalize">
            {preferences.lookingFor?.replace('_', ' ') || '-'}
          </Body>
        </StyledView>

        {/* Height Preference */}
        <StyledView className="flex-row items-center justify-between py-2 border-b border-purple-100/50">
          <StyledView className="flex-row items-center">
            <Ionicons name="resize-outline" size={16} color="#7C3AED" />
            <Body className="text-neutral-700 text-sm ml-2">Height</Body>
          </StyledView>
          <Body className="text-neutral-900 font-semibold text-sm">
            {preferences.heightMin && preferences.heightMax
              ? `${Math.floor(preferences.heightMin / 12)}'${preferences.heightMin % 12}" - ${Math.floor(preferences.heightMax / 12)}'${preferences.heightMax % 12}"`
              : '-'}
          </Body>
        </StyledView>

        {/* Preferred Politics */}
        <StyledView className="flex-row items-center justify-between py-2">
          <StyledView className="flex-row items-center">
            <Ionicons name="flag-outline" size={16} color="#7C3AED" />
            <Body className="text-neutral-700 text-sm ml-2">Preferred Politics</Body>
          </StyledView>
          <Body className="text-neutral-900 font-semibold text-sm" numberOfLines={1}>
            {(() => {
              if (!preferredPolitics || preferredPolitics.length === 0) return '-';
              if (preferredPolitics.length === 1) return preferredPolitics[0];
              return `${preferredPolitics[0]} +${preferredPolitics.length - 1}`;
            })()}
          </Body>
        </StyledView>
      </StyledView>
    </Card>
  );
};

/**
 * Get section display name
 */
export const getSectionName = (type: SectionType): string => {
  const names: Record<SectionType, string> = {
    basic: 'About',
    interests: 'Interests',
    values: 'Values',
    lifestyle: 'Lifestyle',
    preferences: 'Looking For',
  };
  return names[type];
};
