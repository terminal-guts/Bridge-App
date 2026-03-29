/**
 * MatchPreferencesScreen Sections
 * Extracted from MatchPreferencesScreen.tsx for maintainability.
 * Contains preference option constants, reusable sub-components, and section components.
 */

import React from 'react';
import { View, TouchableOpacity, Text } from 'react-native';
import { styled } from 'nativewind';
import { H3, Body, Card } from '../../components/ui';
import { AgeRangeStepper } from '../../components/ui/AgeRangeStepper';
import RangeSlider from 'rn-range-slider';
import { lightHaptic } from '../../utils/haptics';
import { FONTS } from '../../constants/typography';
import { COLORS } from '../../theme/colors';
import { EvaIcon } from '../../components/icons';

const StyledView = styled(View);
const StyledTouchableOpacity = styled(TouchableOpacity);
const StyledText = styled(Text);

// ── Option Constants ─────────────────────────────────────────────────────────

// Gender options - values must match database storage format (male/female, not man/woman)
export const GENDER_OPTIONS = [
  { value: 'male', label: 'Man' },
  { value: 'female', label: 'Woman' },
  { value: 'non-binary', label: 'Non-binary' },
  { value: 'other', label: 'Other' },
];

export const LIFESTYLE_FREQUENCY_OPTIONS = [
  { value: 'no', label: 'No' },
  { value: 'sometimes', label: 'Sometimes' },
  { value: 'yes', label: 'Yes' },
  { value: 'dont_care', label: "Don't Care" },
];

export const ETHNICITY_OPTIONS = [
  'No Preference',
  'Black',
  'East Asian',
  'Hispanic',
  'Middle Eastern',
  'Native American',
  'Pacific Islander',
  'South Asian',
  'Southeast Asian',
  'White',
  'Other',
];

export const RELIGION_PREF_OPTIONS = [
  'No Preference',
  'Buddhist',
  'Catholic',
  'Christian',
  'Hindu',
  'Jewish',
  'Muslim',
  'Spiritual',
  'Agnostic',
  'Atheist',
  'Other',
];

export const POLITICAL_OPTIONS = [
  { value: 'no_preference', label: 'No Preference' },
  { value: 'very_liberal', label: 'Very Liberal' },
  { value: 'liberal', label: 'Liberal' },
  { value: 'moderate', label: 'Moderate' },
  { value: 'conservative', label: 'Conservative' },
  { value: 'very_conservative', label: 'Very Conservative' },
  { value: 'not_political', label: 'Not Political' },
  { value: 'other', label: 'Other' },
];

// ── Stable sub-components for RangeSlider (prevent re-mounting on each render) ──

export const Thumb = () => (
  <StyledView
    className="rounded-full border-2 border-white shadow-md"
    style={{ width: 28, height: 28, backgroundColor: COLORS.primaryAccent }}
    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
  />
);

export const Rail = () => (
  <StyledView
    className="flex-1 rounded-full"
    style={{ height: 6, backgroundColor: COLORS.backgroundProgressTrack }}
  />
);

export const RailSelected = () => (
  <StyledView
    className="rounded-full"
    style={{ height: 6, backgroundColor: COLORS.primaryAccent }}
  />
);

// ── Helper ───────────────────────────────────────────────────────────────────

export const formatHeight = (inches: number): string => {
  const feet = Math.floor(inches / 12);
  const remainingInches = inches % 12;
  return `${feet}'${remainingInches}"`;
};

// ── Reusable pill toggler (used by multiple sections) ────────────────────────

interface PillOption {
  value: string;
  label: string;
}

const PillToggle: React.FC<{
  options: PillOption[];
  selected: string[];
  onToggle: (value: string) => void;
}> = ({ options, selected, onToggle }) => (
  <StyledView className="flex-row flex-wrap gap-2">
    {options.map(option => {
      const isSelected = selected.includes(option.value);
      return (
        <StyledTouchableOpacity
          key={option.value}
          activeOpacity={0.7}
          onPress={() => {
            lightHaptic();
            onToggle(option.value);
          }}
          style={{ minHeight: 44 }}
          className={`px-4 rounded-full border items-center justify-center ${
            isSelected
              ? 'border-primary-500'
              : 'bg-white border-neutral-300'
          }`}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: isSelected }}
          accessibilityLabel={option.label}
        >
          <Body
            className={`text-sm ${
              isSelected ? 'text-white font-medium' : 'text-neutral-700'
            }`}
            style={isSelected ? { color: '#FFFFFF' } : undefined}
          >{option.label}</Body>
        </StyledTouchableOpacity>
      );
    })}
  </StyledView>
);

// Simple pill toggle for string[] options (ethnicity, religion)
const StringPillToggle: React.FC<{
  options: string[];
  selected: string[];
  onToggle: (value: string) => void;
}> = ({ options, selected, onToggle }) => (
  <StyledView className="flex-row flex-wrap gap-2">
    {options.map(option => {
      const isSelected = selected.includes(option);
      return (
        <StyledTouchableOpacity
          key={option}
          activeOpacity={0.7}
          onPress={() => {
            lightHaptic();
            onToggle(option);
          }}
          style={{ minHeight: 44 }}
          className={`px-4 rounded-full border items-center justify-center ${
            isSelected
              ? 'bg-primary-500 border-primary-500'
              : 'bg-white border-neutral-300'
          }`}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: isSelected }}
          accessibilityLabel={option}
        >
          <Body className={`text-sm ${
            isSelected ? 'text-white font-medium' : 'text-neutral-700'
          }`}>{option}</Body>
        </StyledTouchableOpacity>
      );
    })}
  </StyledView>
);

// ── Section Components ───────────────────────────────────────────────────────

/** Required field asterisk */
const RequiredMark = () => (
  <StyledText style={{ color: COLORS.error, fontFamily: FONTS.regular }}>*</StyledText>
);

/** Looking For section (relationship-only) */
export const LookingForSection: React.FC = () => (
  <Card className="mb-6">
    <H3 className="mb-4">I'm Looking For</H3>
    <Body style={{ color: COLORS.text.secondary }} className="text-sm mb-4">
      Bridge promotes genuine connection
    </Body>
    <StyledView className="p-4 rounded-lg border bg-primary-50 border-primary-500">
      <StyledView className="flex-row items-center justify-between" style={{ minHeight: 44 }}>
        <StyledView className="flex-1">
          <Body className="text-base font-semibold text-primary-700">
            Relationship
          </Body>
        </StyledView>
        <EvaIcon name="checkmark-circle-2" variant="outline" size={24} color={COLORS.primaryAccent} />
      </StyledView>
    </StyledView>
  </Card>
);

/** Gender preference section */
export const GenderSection: React.FC<{
  interestedInGenders: string[];
  setInterestedInGenders: React.Dispatch<React.SetStateAction<string[]>>;
}> = ({ interestedInGenders, setInterestedInGenders }) => (
  <Card className="mb-6">
    <H3 className="mb-2">Gender <RequiredMark /></H3>
    <Body style={{ color: COLORS.text.secondary }} className="text-sm mb-4">
      Select all gender identities you're open to matching with
    </Body>
    <StyledView className="flex-row flex-wrap gap-2">
      {GENDER_OPTIONS.map((option) => {
        const isSelected = interestedInGenders.includes(option.value);
        return (
          <StyledTouchableOpacity
            key={option.value}
            activeOpacity={0.7}
            onPress={() => {
              lightHaptic();
              if (isSelected) {
                setInterestedInGenders(prev => prev.filter(g => g !== option.value));
              } else {
                setInterestedInGenders(prev => [...prev, option.value]);
              }
            }}
            style={{ minHeight: 44 }}
            className={`px-4 rounded-full border items-center justify-center ${
              isSelected
                ? 'bg-primary-500 border-primary-500'
                : 'bg-white border-neutral-300'
            }`}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: isSelected }}
            accessibilityLabel={option.label}
          >
            <Body
              className={`text-sm ${
                isSelected ? 'text-white font-medium' : 'text-neutral-700'
              }`}
            >
              {option.label}
            </Body>
          </StyledTouchableOpacity>
        );
      })}
    </StyledView>
  </Card>
);

/** Age range section */
export const AgeRangeSection: React.FC<{
  ageMin: number;
  ageMax: number;
  onMinChange: (v: number) => void;
  onMaxChange: (v: number) => void;
}> = ({ ageMin, ageMax, onMinChange, onMaxChange }) => (
  <Card className="mb-6">
    <H3 className="mb-4">Age Range <RequiredMark /></H3>
    <AgeRangeStepper
      min={ageMin}
      max={ageMax}
      floor={18}
      ceiling={35}
      onMinChange={onMinChange}
      onMaxChange={onMaxChange}
    />
  </Card>
);

/** Height preference section */
export const HeightSection: React.FC<{
  heightMin: number;
  heightMax: number;
  renderThumb: () => React.JSX.Element;
  renderRail: () => React.JSX.Element;
  renderRailSelected: () => React.JSX.Element;
  onValueChanged: (low: number, high: number) => void;
}> = ({ heightMin, heightMax, renderThumb, renderRail, renderRailSelected, onValueChanged }) => (
  <Card className="mb-6">
    <H3 className="mb-3">Height <RequiredMark /></H3>
    <Body style={{ color: COLORS.text.secondary }} className="text-sm mb-4">
      Set your height preferences for potential matches
    </Body>

    <StyledView className="flex-row justify-between mb-3">
      <Body style={{ color: COLORS.text.secondary }}>Min: <Body className="font-semibold" style={{ color: COLORS.text.primary }}>{formatHeight(heightMin || 60)}</Body></Body>
      <Body style={{ color: COLORS.text.secondary }}>Max: <Body className="font-semibold" style={{ color: COLORS.text.primary }}>{formatHeight(heightMax || 84)}</Body></Body>
    </StyledView>
    <StyledView className="px-1">
      <RangeSlider
        style={{ width: '100%', height: 48 }}
        min={48}
        max={84}
        step={1}
        low={heightMin || 60}
        high={heightMax || 84}
        minRange={1}
        floatingLabel={false}
        renderThumb={renderThumb}
        renderRail={renderRail}
        renderRailSelected={renderRailSelected}
        onValueChanged={onValueChanged}
      />
    </StyledView>
  </Card>
);

/** Ethnicity preference section */
export const EthnicitySection: React.FC<{
  preferredEthnicities: string[];
  setPreferredEthnicities: React.Dispatch<React.SetStateAction<string[]>>;
}> = ({ preferredEthnicities, setPreferredEthnicities }) => (
  <Card className="mb-6">
    <H3 className="mb-2">Ethnicity <RequiredMark /></H3>
    <Body style={{ color: COLORS.text.secondary }} className="text-sm mb-4">
      Select the ethnicities you're interested in for potential matches
    </Body>
    <StringPillToggle
      options={ETHNICITY_OPTIONS}
      selected={preferredEthnicities}
      onToggle={(ethnicity) => {
        if (preferredEthnicities.includes(ethnicity)) {
          setPreferredEthnicities(prev => prev.filter(e => e !== ethnicity));
        } else if (ethnicity === 'No Preference') {
          setPreferredEthnicities(['No Preference']);
        } else {
          setPreferredEthnicities(prev => [...prev.filter(e => e !== 'No Preference'), ethnicity]);
        }
      }}
    />
  </Card>
);

/** Religion preference section */
export const ReligionSection: React.FC<{
  preferredReligions: string[];
  setPreferredReligions: React.Dispatch<React.SetStateAction<string[]>>;
}> = ({ preferredReligions, setPreferredReligions }) => (
  <Card className="mb-6">
    <H3 className="mb-2">Religion <RequiredMark /></H3>
    <Body style={{ color: COLORS.text.secondary }} className="text-sm mb-4">
      Select the religious beliefs you're open to matching with
    </Body>
    <StringPillToggle
      options={RELIGION_PREF_OPTIONS}
      selected={preferredReligions}
      onToggle={(religion) => {
        if (preferredReligions.includes(religion)) {
          setPreferredReligions(prev => prev.filter(r => r !== religion));
        } else if (religion === 'No Preference') {
          setPreferredReligions(['No Preference']);
        } else {
          setPreferredReligions(prev => [...prev.filter(r => r !== 'No Preference'), religion]);
        }
      }}
    />
  </Card>
);

/** Politics preference section */
export const PoliticsSection: React.FC<{
  preferredPolitics: string[];
  setPreferredPolitics: React.Dispatch<React.SetStateAction<string[]>>;
}> = ({ preferredPolitics, setPreferredPolitics }) => (
  <Card className="mb-6">
    <H3 className="mb-2">Politics <RequiredMark /></H3>
    <Body style={{ color: COLORS.text.secondary }} className="text-sm mb-4">
      Select the political views you're open to matching with
    </Body>
    <PillToggle
      options={POLITICAL_OPTIONS}
      selected={preferredPolitics}
      onToggle={(value) => {
        if (preferredPolitics.includes(value)) {
          setPreferredPolitics(prev => prev.filter(p => p !== value));
        } else if (value === 'no_preference') {
          setPreferredPolitics(['no_preference']);
        } else {
          setPreferredPolitics(prev => [...prev.filter(p => p !== 'no_preference'), value]);
        }
      }}
    />
  </Card>
);

/** Lifestyle sub-section for a single substance category */
const LifestyleSubSection: React.FC<{
  label: string;
  selectedValues: string[];
  substanceKey: string;
  onUpdate: (key: string, values: string[]) => void;
  isLast?: boolean;
}> = ({ label, selectedValues, substanceKey, onUpdate, isLast }) => (
  <StyledView className={isLast ? '' : 'mb-4'}>
    <Body style={{ color: COLORS.text.muted, fontFamily: FONTS.medium }} className="text-sm mb-2">{label}</Body>
    <StyledView className="flex-row flex-wrap gap-2">
      {LIFESTYLE_FREQUENCY_OPTIONS.map(option => {
        const isSelected = selectedValues.includes(option.value);
        return (
          <StyledTouchableOpacity
            key={option.value}
            activeOpacity={0.7}
            onPress={() => {
              lightHaptic();
              if (isSelected) {
                onUpdate(substanceKey, selectedValues.filter(v => v !== option.value));
              } else {
                onUpdate(substanceKey, [...selectedValues, option.value]);
              }
            }}
            style={{ minHeight: 44 }}
            className={`px-4 rounded-full border items-center justify-center ${
              isSelected
                ? 'bg-primary-500 border-primary-500'
                : 'bg-white border-neutral-300'
            }`}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: isSelected }}
            accessibilityLabel={`${label}: ${option.label}`}
          >
            <Body className={`text-center text-sm font-medium ${
              isSelected ? 'text-white' : 'text-neutral-700'
            }`}>{option.label}</Body>
          </StyledTouchableOpacity>
        );
      })}
    </StyledView>
  </StyledView>
);

/** Lifestyle preferences section (drinking, cannabis, tobacco, other drugs) */
export const LifestyleSection: React.FC<{
  partnerPreferences: {
    partnerDrinking: string[];
    partnerCannabis: string[];
    partnerTobacco: string[];
    partnerOtherDrugs: string[];
  };
  setPartnerPreferences: React.Dispatch<React.SetStateAction<{
    partnerDrinking: string[];
    partnerCannabis: string[];
    partnerTobacco: string[];
    partnerOtherDrugs: string[];
  }>>;
}> = ({ partnerPreferences, setPartnerPreferences }) => {
  const handleUpdate = (key: string, values: string[]) => {
    setPartnerPreferences(prev => ({ ...prev, [key]: values }));
  };

  return (
    <Card className="mb-6">
      <H3 className="mb-2">Lifestyle <RequiredMark /></H3>
      <Body style={{ color: COLORS.text.secondary }} className="text-sm mb-4">
        What lifestyle habits do you prefer in a partner?
      </Body>

      <LifestyleSubSection
        label="Drinking"
        selectedValues={partnerPreferences.partnerDrinking}
        substanceKey="partnerDrinking"
        onUpdate={handleUpdate}
      />
      <LifestyleSubSection
        label="Cannabis"
        selectedValues={partnerPreferences.partnerCannabis}
        substanceKey="partnerCannabis"
        onUpdate={handleUpdate}
      />
      <LifestyleSubSection
        label="Tobacco/Vaping"
        selectedValues={partnerPreferences.partnerTobacco}
        substanceKey="partnerTobacco"
        onUpdate={handleUpdate}
      />
      <LifestyleSubSection
        label="Other Substances"
        selectedValues={partnerPreferences.partnerOtherDrugs}
        substanceKey="partnerOtherDrugs"
        onUpdate={handleUpdate}
        isLast
      />
    </Card>
  );
};
