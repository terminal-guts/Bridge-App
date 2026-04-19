/**
 * ProfileScreen Components
 *
 * Extracted reusable components for ProfileScreen
 */

import React from 'react';
import { View, TouchableOpacity, ScrollView } from 'react-native';
import { Image } from 'expo-image';
import { styled } from 'nativewind';
import { H2, H3, Body, Card, CollapsibleCard, Chip } from '../../components/ui';
import { UserProfile, Match } from '../../types';
import { valueIconName, interestIconName } from '../../utils/emojiMaps';
import { EvaIcon } from '../../components/icons';
import { WineGlassIcon, LeafIcon, CigaretteIcon, PillIcon } from '../../components/icons/Icons';
import { formatProfileValue, formatGenderDisplay } from '../../utils/formatProfileValue';
import { COLORS } from '../../theme/colors';
import { SHADOWS } from '../../theme/shadows';
import { FONTS, FONT_SIZES } from '../../constants/typography';

const StyledView = styled(View);
const StyledImage = Image;
const StyledTouchableOpacity = styled(TouchableOpacity);
const StyledScrollView = styled(ScrollView);

// Types
export type SectionType = 'basic' | 'interests' | 'values' | 'lifestyle' | 'preferences';

interface ProfileInfoItemProps {
  icon?: string;
  customIcon?: React.ReactNode;
  label: string;
  value: string;
  subtitle?: string;
}

/**
 * Reusable profile info item with icon
 */
export const ProfileInfoItem: React.FC<ProfileInfoItemProps> = ({
  icon,
  customIcon,
  label,
  value,
  subtitle,
}) => (
  <StyledView className="flex-row items-center">
    <StyledView className="w-10 h-10 rounded-lg items-center justify-center mr-3" style={{ backgroundColor: 'rgba(67, 127, 255, 0.12)' }}>
      {customIcon || <EvaIcon name={icon!} variant="outline" size={20} color={COLORS.primaryAccent} />}
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
            <EvaIcon name="edit-2" variant="outline" size={18} color={COLORS.primaryAccent} />
          </StyledTouchableOpacity>
        </StyledView>
      }
      defaultExpanded={true}
    >
      <StyledView className="space-y-3">
        <ProfileInfoItem icon="calendar" label="Age" value={profile.age ? `${profile.age} years old` : 'Not specified'} />
        {profile.height && (
          <ProfileInfoItem icon="maximize" label="Height" value={profile.height} />
        )}
        <ProfileInfoItem icon="person" label="Ethnicity" value={profile.ethnicity || 'Not specified'} />
      </StyledView>
    </CollapsibleCard>

    {/* Identity & Beliefs */}
    {(profile.customMyGender ||
      (profile.interestedInGenders && profile.interestedInGenders.length > 0) ||
      profile.religion ||
      (profile.politicalLeaning && profile.politicalLeaning !== 'prefer_not_to_say')) && (
      <CollapsibleCard
        title={<H3>Identity & Beliefs</H3>}
        defaultExpanded={false}
      >
        <StyledView className="space-y-3">
          {profile.customMyGender && (
            <ProfileInfoItem
              icon="people"
              label="Gender Identity"
              value={profile.customMyGender}
            />
          )}
          {profile.interestedInGenders && profile.interestedInGenders.length > 0 && (
            <ProfileInfoItem
              icon="heart"
              label="Interested In"
              value={profile.interestedInGenders.map(g => formatGenderDisplay(g)).join(', ')}
              subtitle={profile.customInterestedIn}
            />
          )}
          {profile.religion && (
            <ProfileInfoItem
              icon="sun"
              label="Religion"
              value={profile.religion}
            />
          )}
          {profile.politicalLeaning && profile.politicalLeaning !== 'prefer_not_to_say' && (
            <ProfileInfoItem
              icon="flag"
              label="Political Views"
              value={formatProfileValue(profile.politicalLeaning)}
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
                <ProfileInfoItem customIcon={<WineGlassIcon size={20} color={COLORS.text.secondary} />} label="Drinking" value={formatProfileValue(profile.drinkingFrequency)} />
              )}
              {profile.cannabisFrequency && (
                <ProfileInfoItem customIcon={<LeafIcon size={20} color={COLORS.text.secondary} />} label="Cannabis" value={formatProfileValue(profile.cannabisFrequency)} />
              )}
              {profile.tobaccoFrequency && (
                <ProfileInfoItem customIcon={<CigaretteIcon size={20} color={COLORS.text.secondary} />} label="Tobacco" value={formatProfileValue(profile.tobaccoFrequency)} />
              )}
              {profile.otherDrugsFrequency && (
                <ProfileInfoItem customIcon={<PillIcon size={20} color={COLORS.text.secondary} />} label="Other Substances" value={formatProfileValue(profile.otherDrugsFrequency)} />
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
            <Chip label={interest} variant="interest" iconName={interestIconName(interest)} />
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
            <Chip label={value} variant="value" iconName={valueIconName(value)} />
          </StyledView>
        ))}
      </StyledView>
    </CollapsibleCard>
  );
};

interface PartnerLifestyleSectionProps {
  partnerLifestylePreferences?: {
    drinking: string;
    cannabis: string;
    tobacco: string;
    otherDrugs: string;
  };
  onEdit?: () => void;
}

/**
 * Partner Lifestyle Preferences section
 * Displays what the user is looking for in a partner regarding lifestyle choices
 */
export const PartnerLifestyleSection: React.FC<PartnerLifestyleSectionProps> = ({ partnerLifestylePreferences, onEdit }) => {
  if (!partnerLifestylePreferences) return null;

  const { drinking, cannabis, tobacco, otherDrugs } = partnerLifestylePreferences;

  // Only show if at least one preference is set
  if (!drinking && !cannabis && !tobacco && !otherDrugs) return null;

  return (
    <Card className="mb-6">
      <StyledView className="flex-row items-center justify-between mb-3">
        <StyledView className="flex-row items-center flex-1">
          <EvaIcon name="heart" variant="outline" size={20} color={COLORS.primaryAccent} />
          <H3 className="ml-2">What I Want in a Partner - Lifestyle</H3>
        </StyledView>
        {onEdit && (
          <StyledTouchableOpacity
            onPress={onEdit}
            accessibilityLabel="Edit partner lifestyle preferences"
            accessibilityRole="button"
          >
            <EvaIcon name="edit-2" variant="outline" size={18} color={COLORS.primaryAccent} />
          </StyledTouchableOpacity>
        )}
      </StyledView>
      <StyledView className="space-y-3">
        {drinking && (
          <StyledView className="flex-row justify-between items-center">
            <StyledView className="flex-row items-center">
              <WineGlassIcon size={18} color={COLORS.primaryAccent} />
              <Body className="text-purple-700 ml-2">Drinking</Body>
            </StyledView>
            <Body className="text-purple-900 font-medium">{formatProfileValue(drinking)}</Body>
          </StyledView>
        )}
        {cannabis && (
          <StyledView className="flex-row justify-between items-center">
            <StyledView className="flex-row items-center">
              <LeafIcon size={18} color={COLORS.primaryAccent} />
              <Body className="text-purple-700 ml-2">Weed</Body>
            </StyledView>
            <Body className="text-purple-900 font-medium">{formatProfileValue(cannabis)}</Body>
          </StyledView>
        )}
        {tobacco && (
          <StyledView className="flex-row justify-between items-center">
            <StyledView className="flex-row items-center">
              <CigaretteIcon size={18} color={COLORS.primaryAccent} />
              <Body className="text-purple-700 ml-2">Tobacco</Body>
            </StyledView>
            <Body className="text-purple-900 font-medium">{formatProfileValue(tobacco)}</Body>
          </StyledView>
        )}
        {otherDrugs && (
          <StyledView className="flex-row justify-between items-center">
            <StyledView className="flex-row items-center">
              <PillIcon size={18} color={COLORS.primaryAccent} />
              <Body className="text-purple-700 ml-2">Drugs</Body>
            </StyledView>
            <Body className="text-purple-900 font-medium">{formatProfileValue(otherDrugs)}</Body>
          </StyledView>
        )}
      </StyledView>
    </Card>
  );
};

interface LifestyleItemProps {
  icon?: string;
  customIcon?: React.ReactNode;
  label: string;
  value: string;
}

const LifestyleItem: React.FC<LifestyleItemProps> = ({ icon, customIcon, label, value }) => (
  <StyledView className="flex-row justify-between items-center">
    <StyledView className="flex-row items-center">
      {customIcon || <EvaIcon name={icon!} variant="outline" size={18} color={COLORS.navInactiveIcon} />}
      <Body className="text-neutral-600 ml-2">{label}</Body>
    </StyledView>
    <Body className="text-neutral-900 font-medium">{value}</Body>
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
            icon="activity"
            label="Exercise"
            value={formatProfileValue(lifestyle.exercise)}
          />
        )}
        {lifestyle.drinking && (
          <LifestyleItem
            customIcon={<WineGlassIcon size={18} color={COLORS.navInactiveIcon} />}
            label="Drinking"
            value={formatProfileValue(lifestyle.drinking)}
          />
        )}
        {lifestyle.smoking && (
          <LifestyleItem
            customIcon={<CigaretteIcon size={18} color={COLORS.navInactiveIcon} />}
            label="Smoking"
            value={formatProfileValue(lifestyle.smoking)}
          />
        )}
        {lifestyle.pets && lifestyle.pets.length > 0 && (
          <LifestyleItem
            icon="smiling-face"
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
          icon="calendar"
          label="Age Range"
          value={preferences.ageMin && preferences.ageMax ? `${preferences.ageMin}-${preferences.ageMax}` : 'Not set'}
        />
        <LifestyleItem
          icon="people"
          label="Interested In (Gender)"
          value={preferences.gender ? (preferences.gender === 'both' ? 'Men & Women' : formatGenderDisplay(preferences.gender)) : 'Not specified'}
        />
      </StyledView>
    </Card>

    {/* Physical Preferences Card */}
    {(preferences.heightMin && preferences.heightMax) && (
      <Card className="mb-4">
        <H3 className="mb-4">Physical Preferences</H3>
        <StyledView className="space-y-3">
          <LifestyleItem
            icon="maximize"
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
      accessibilityRole="button"
      accessibilityLabel={`Match with ${matchProfile.firstName}, matched ${matchedDate}`}
    >
      <Card shadow="sm" className="mb-4">
        <StyledView className="flex-row items-center justify-between">
          <StyledView className="flex-1">
            <H3 className="mb-1">
              {matchProfile.firstName}
            </H3>
            <StyledView className="flex-row items-center mb-0.5">
              <EvaIcon name="heart" variant="outline" size={12} color={COLORS.success} />
              <Body className="text-neutral-600 text-xs ml-1.5">
                Matched: {matchedDate}
              </Body>
            </StyledView>
            {unmatchedDate && (
              <StyledView className="flex-row items-center">
                <EvaIcon name="close-circle" variant="outline" size={12} color={COLORS.error} />
                <Body className="text-neutral-600 text-xs ml-1.5">
                  Unmatched: {unmatchedDate}
                </Body>
              </StyledView>
            )}
          </StyledView>
          <EvaIcon name="arrow-ios-forward" variant="outline" size={20} color={COLORS.border} />
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
  icon: string;
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
  <Card shadow="sm" className="bg-gradient-to-br from-neutral-50 to-white">
    <StyledView className="items-center justify-center py-8 px-4">
      {/* Decorative Background Circles - Centered */}
      <StyledView className="relative mb-4 items-center justify-center">
        {/* Main icon container with gradient - Centered */}
        <StyledView className="w-20 h-20 bg-gradient-to-br from-primary-100 to-primary-200 rounded-2xl items-center justify-center shadow-sm">
          {/* Inner glow effect */}
          <StyledView className="absolute w-16 h-16 bg-white/40 rounded-xl" />

          {/* Icon - Properly centered */}
          <EvaIcon name={icon} variant="outline" size={36} color={COLORS.text.secondary} style={{ zIndex: 1 }} />
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

    // Lifestyle
    if (profile.drinkingFrequency) count++;

    // Interests & Values
    if (profile.interests?.length > 0) count++;
    if (profile.values?.length > 0) count++;

    return count;
  };

  const filledSections = getSectionCounts();

  return (
    <Card
      shadow="md"
      className="mb-4"
      style={{ borderWidth: 1, borderColor: COLORS.border }}
    >
      <StyledView className="flex-row items-center justify-between mb-4">
        <StyledView className="flex-row items-center flex-1">
          <StyledView className="w-10 h-10 rounded-lg items-center justify-center mr-3" style={{ backgroundColor: 'rgba(67, 127, 255, 0.12)' }}>
            <EvaIcon name="file-text" variant="outline" size={20} color={COLORS.primaryAccent} />
          </StyledView>
          <StyledView className="flex-1">
            <Body style={{ fontFamily: FONTS.semiBold, fontWeight: '600', fontSize: FONT_SIZES.lg, color: COLORS.text.primary }}>About Me</Body>
            <Body style={{ color: COLORS.text.secondary, fontSize: FONT_SIZES.md }}>The basics about you</Body>
          </StyledView>
        </StyledView>
        <StyledTouchableOpacity
          onPress={onEdit}
          accessibilityLabel="Edit profile information"
          accessibilityRole="button"
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          className="px-3.5 py-1.5 rounded-lg"
          style={{ backgroundColor: 'rgba(37, 99, 235, 0.82)' }}
        >
          <Body className="text-white font-semibold text-xs">Edit All</Body>
        </StyledTouchableOpacity>
      </StyledView>

      <StyledView>
        {/* Age */}
        <StyledView className="flex-row items-center justify-between py-2.5" style={{ borderBottomWidth: 1, borderBottomColor: COLORS.borderLight }}>
          <StyledView className="flex-row items-center">
            <EvaIcon name="calendar" variant="outline" size={15} color={COLORS.text.secondary} />
            <Body className="text-neutral-600 text-sm ml-2">Age</Body>
          </StyledView>
          <Body className="text-neutral-900 font-medium text-sm">
            {profile.age || '-'}
          </Body>
        </StyledView>

        {/* Ethnicity */}
        <StyledView className="flex-row items-center justify-between py-2.5" style={{ borderBottomWidth: 1, borderBottomColor: COLORS.borderLight }}>
          <StyledView className="flex-row items-center">
            <EvaIcon name="globe" variant="outline" size={15} color={COLORS.text.secondary} />
            <Body className="text-neutral-600 text-sm ml-2">Ethnicity</Body>
          </StyledView>
          <Body className="text-neutral-900 font-medium text-sm" numberOfLines={1}>
            {(() => {
              if (!profile.ethnicity) return '-';
              const ethnicities = profile.ethnicity.split(' / ').map(e => e.trim());
              if (ethnicities.length === 1) return ethnicities[0];
              return `${ethnicities[0]} +${ethnicities.length - 1}`;
            })()}
          </Body>
        </StyledView>

        {/* Values & Interests Count */}
        {((profile.values?.length || 0) > 0 || (profile.interests?.length || 0) > 0) && (
          <StyledView className="flex-row pt-3" style={{ gap: 16 }}>
            {(profile.values?.length || 0) > 0 && (
              <StyledView className="flex-1">
                <Body style={{ color: COLORS.text.secondary, fontSize: FONT_SIZES.sm, marginBottom: 2 }}>Values</Body>
                <Body style={{ color: COLORS.text.secondary, fontFamily: FONTS.semiBold, fontSize: FONT_SIZES.md }}>{profile.values?.length ?? 0} selected</Body>
              </StyledView>
            )}
            {(profile.interests?.length || 0) > 0 && (
              <StyledView className="flex-1">
                <Body style={{ color: COLORS.text.secondary, fontSize: FONT_SIZES.sm, marginBottom: 2 }}>Interests</Body>
                <Body style={{ color: COLORS.text.secondary, fontFamily: FONTS.semiBold, fontSize: FONT_SIZES.md }}>{profile.interests?.length ?? 0} selected</Body>
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
  interestedInGenders?: string[];
  preferredPolitics?: string[];
  preferredEthnicitiesCount?: number;
  interestsCount?: number;
  valuesCount?: number;
  onEdit: () => void;
}

const GENDER_LABELS: Record<string, string> = {
  male: 'Man',
  female: 'Woman',
  'non-binary': 'Non-binary',
  other: 'Other',
};

export const MatchPreferencesSummary: React.FC<MatchPreferencesSummaryProps> = ({
  preferences,
  interestedInGenders,
  preferredPolitics,
  preferredEthnicitiesCount = 0,
  interestsCount = 0,
  valuesCount = 0,
  onEdit,
}) => {
  return (
    <Card
      shadow="md"
      className="mb-4"
      style={{ borderWidth: 1, borderColor: COLORS.border }}
    >
      <StyledView className="flex-row items-center justify-between mb-4">
        <StyledView className="flex-row items-center flex-1">
          <StyledView className="w-10 h-10 rounded-lg items-center justify-center mr-3" style={{ backgroundColor: 'rgba(67, 127, 255, 0.12)' }}>
            <EvaIcon name="heart" variant="outline" size={20} color={COLORS.primaryAccent} />
          </StyledView>
          <StyledView className="flex-1">
            <Body style={{ fontFamily: FONTS.semiBold, fontWeight: '600', fontSize: FONT_SIZES.lg, color: COLORS.text.primary }}>Match Preferences</Body>
            <Body style={{ color: COLORS.text.secondary, fontSize: FONT_SIZES.md }}>What matters to you in a match</Body>
          </StyledView>
        </StyledView>
        <StyledTouchableOpacity
          onPress={onEdit}
          accessibilityLabel="Edit match preferences"
          accessibilityRole="button"
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          className="px-3.5 py-1.5 rounded-lg"
          style={{ backgroundColor: 'rgba(37, 99, 235, 0.82)' }}
        >
          <Body className="text-white font-semibold text-xs">Edit All</Body>
        </StyledTouchableOpacity>
      </StyledView>

      <StyledView>
        {/* Looking For (gender) */}
        <StyledView className="flex-row items-center justify-between py-2.5" style={{ borderBottomWidth: 1, borderBottomColor: COLORS.borderLight }}>
          <StyledView className="flex-row items-center">
            <EvaIcon name="search" variant="outline" size={15} color={COLORS.text.secondary} />
            <Body className="text-neutral-600 text-sm ml-2">Looking For</Body>
          </StyledView>
          <Body className="text-neutral-900 font-medium text-sm">
            {(() => {
              if (!interestedInGenders || interestedInGenders.length === 0) return '-';
              const first = GENDER_LABELS[interestedInGenders[0]] || formatProfileValue(interestedInGenders[0]);
              if (interestedInGenders.length === 1) return first;
              return `${first} +${interestedInGenders.length - 1}`;
            })()}
          </Body>
        </StyledView>

        {/* Height Preference */}
        <StyledView className="flex-row items-center justify-between py-2.5" style={{ borderBottomWidth: 1, borderBottomColor: COLORS.borderLight }}>
          <StyledView className="flex-row items-center">
            <EvaIcon name="arrow-upward" variant="outline" size={15} color={COLORS.text.secondary} />
            <Body className="text-neutral-600 text-sm ml-2">Height Range</Body>
          </StyledView>
          <Body className="text-neutral-900 font-medium text-sm">
            {preferences.heightMin && preferences.heightMax
              ? `${Math.floor(preferences.heightMin / 12)}'${preferences.heightMin % 12}" - ${Math.floor(preferences.heightMax / 12)}'${preferences.heightMax % 12}"`
              : '-'}
          </Body>
        </StyledView>

        {/* Preferred Politics */}
        <StyledView className="flex-row items-center justify-between py-2.5">
          <StyledView className="flex-row items-center">
            <EvaIcon name="compass" variant="outline" size={15} color={COLORS.text.secondary} />
            <Body className="text-neutral-600 text-sm ml-2">Politics</Body>
          </StyledView>
          <Body className="text-neutral-900 font-medium text-sm" numberOfLines={1}>
            {(() => {
              const cap = formatProfileValue;
              if (!preferredPolitics || preferredPolitics.length === 0) return '-';
              if (preferredPolitics.length === 1) return cap(preferredPolitics[0]);
              return `${cap(preferredPolitics[0])} +${preferredPolitics.length - 1}`;
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
