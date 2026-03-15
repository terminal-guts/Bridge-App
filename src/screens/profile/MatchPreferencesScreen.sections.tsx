/**
 * MatchPreferencesScreen Sections
 * Extracted from MatchPreferencesScreen.tsx for maintainability.
 * Contains preference option constants, reusable sub-components, and section components.
 */

import React from 'react';
import { View, TouchableOpacity, Modal, Keyboard, TextInput, Text } from 'react-native';
import ReanimatedAnimated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    interpolate,
} from 'react-native-reanimated';
import { SPRINGS } from '../../constants/animations';
import { styled } from 'nativewind';
import { H3, Body, Card } from '../../components/ui';
import { AgeRangeStepper } from '../../components/ui/AgeRangeStepper';
import RangeSlider from 'rn-range-slider';
import { lightHaptic, mediumHaptic } from '../../utils/haptics';
import { FONTS } from '../../constants/typography';
import { COLORS } from '../../theme/colors';
import { EvaIcon } from '../../components/icons';
import { useEffect } from 'react';

const StyledView = styled(View);
const StyledTouchableOpacity = styled(TouchableOpacity);
const StyledTextInput = styled(TextInput);
const StyledAnimatedView = styled(ReanimatedAnimated.View);
const StyledText = styled(Text);

// ── Option Constants ─────────────────────────────────────────────────────────

// Gender options - values must match database storage format (male/female, not man/woman)
export const GENDER_OPTIONS = [
  { value: 'male', label: 'Man' },
  { value: 'female', label: 'Woman' },
  { value: 'non-binary', label: 'Non-binary' },
];

export const LIFESTYLE_FREQUENCY_OPTIONS = [
  { value: 'no', label: 'No' },
  { value: 'sometimes', label: 'Sometimes' },
  { value: 'yes', label: 'Yes' },
  { value: 'dont_care', label: "Don't Care" },
];

export const COMMON_VALUES = [
  // Personal
  'Honesty', 'Integrity', 'Trust', 'Respect', 'Authenticity', 'Kindness', 'Empathy',

  // Relationship
  'Communication', 'Commitment', 'Independence', 'Romance',

  // Life
  'Family', 'Career', 'Ambition', 'Work-Life Balance',
  'Adventure', 'Stability', 'Growth Mindset', 'Creativity',

  // Social
  'Community', 'Social Justice', 'Environmentalism', 'Diversity',

  // Personal Growth
  'Spirituality', 'Health',
];

export const COMMON_INTERESTS = [
  // Activities
  'Tennis', 'Golf', 'Running', 'Yoga', 'Hiking', 'Skiing',
  'Basketball', 'Lifting', 'Live Sports', 'Watching Sports',

  // Culture & Entertainment
  'Museums', 'Theater', 'Live Music', 'Comedy Shows',
  'Film', 'Reading', 'Photography',

  // Food & Drink
  'Cooking', 'Coffee', 'Cocktails', 'Fine Dining', 'Brunch',

  // Travel & Adventure
  'Travel', 'Camping',

  // Lifestyle
  'Startups', 'Investing', 'Real Estate', 'Fashion', 'Meditation', 'Podcasts',

  // Social
  'Dinner Parties', 'Game Nights', 'Dancing', 'Trivia Nights',
  'Poker', 'Video Games',
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
  <StyledView className="w-6 h-6 rounded-full border-2 border-white shadow-md" style={{ backgroundColor: COLORS.primaryAccent }} />
);

export const Rail = () => <StyledView className="flex-1 h-1 rounded-full bg-neutral-200" />;

export const RailSelected = () => <StyledView className="h-1 rounded-full" style={{ backgroundColor: COLORS.primaryAccent }} />;

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
  <StyledView className="flex-row flex-wrap gap-2.5">
    {options.map(option => {
      const isSelected = selected.includes(option.value);
      return (
        <StyledTouchableOpacity
          key={option.value}
          activeOpacity={1}
          onPress={() => {
            lightHaptic();
            onToggle(option.value);
          }}
          className={`px-3 py-2 rounded-full border ${
            isSelected
              ? 'bg-primary-500 border-primary-500'
              : 'bg-white border-neutral-300'
          }`}
        >
          <Body className={`text-sm ${
            isSelected ? 'text-white font-medium' : 'text-neutral-700'
          }`}>{option.label}</Body>
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
  <StyledView className="flex-row flex-wrap gap-2.5">
    {options.map(option => {
      const isSelected = selected.includes(option);
      return (
        <StyledTouchableOpacity
          key={option}
          activeOpacity={1}
          onPress={() => {
            lightHaptic();
            onToggle(option);
          }}
          className={`px-3 py-2 rounded-full border ${
            isSelected
              ? 'bg-primary-500 border-primary-500'
              : 'bg-white border-neutral-300'
          }`}
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
    <Body className="text-neutral-600 text-sm mb-4">
      Bridge promotes genuine connection
    </Body>
    <StyledView className="p-4 rounded-lg border bg-primary-50 border-primary-500">
      <StyledView className="flex-row items-center justify-between">
        <StyledView className="flex-1">
          <Body className="text-base font-semibold mb-1 text-primary-700">
            Relationship
          </Body>
          <Body className="text-sm text-neutral-600">
            Long-term relationship
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
  onOpenCustomModal: () => void;
}> = ({ interestedInGenders, setInterestedInGenders, onOpenCustomModal }) => (
  <Card className="mb-6">
    <H3 className="mb-2">Gender <RequiredMark /></H3>
    <Body className="text-neutral-600 text-sm mb-4">
      Select all gender identities you're open to matching with
    </Body>
    <StyledView className="flex-row flex-wrap gap-2.5">
      {GENDER_OPTIONS.map((option) => {
        const isSelected = interestedInGenders.includes(option.value);
        return (
          <StyledTouchableOpacity
            key={option.value}
            activeOpacity={1}
            onPress={() => {
              lightHaptic();
              if (isSelected) {
                setInterestedInGenders(prev => prev.filter(g => g !== option.value));
              } else {
                setInterestedInGenders(prev => [...prev, option.value]);
              }
            }}
            className={`px-3 py-2 rounded-full border ${
              isSelected
                ? 'bg-primary-500 border-primary-500'
                : 'bg-white border-neutral-300'
            }`}
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
      {/* Custom genders (not in predefined list) */}
      {interestedInGenders
        .filter(g => !GENDER_OPTIONS.some(opt => opt.value === g))
        .map((customGender) => (
          <StyledTouchableOpacity
            key={customGender}
            activeOpacity={1}
            onPress={() => {
              lightHaptic();
              setInterestedInGenders(prev => prev.filter(g => g !== customGender));
            }}
            className="px-3 py-2 rounded-full border bg-primary-500 border-primary-500"
          >
            <Body className="text-sm text-white font-medium">{customGender}</Body>
          </StyledTouchableOpacity>
        ))}
      {/* Other button */}
      <StyledTouchableOpacity
        onPress={onOpenCustomModal}
        className="px-3 py-2 rounded-full border border-dashed border-neutral-400 bg-neutral-50"
      >
        <Body className="text-sm text-neutral-600">+ Other</Body>
      </StyledTouchableOpacity>
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
    <Body className="text-neutral-600 text-sm mb-4">
      Set your height preferences for potential matches
    </Body>

    <StyledView className="flex-row justify-between mb-3">
      <Body className="text-neutral-600">Min: <Body className="text-neutral-900 font-semibold">{formatHeight(heightMin || 60)}</Body></Body>
      <Body className="text-neutral-600">Max: <Body className="text-neutral-900 font-semibold">{formatHeight(heightMax || 84)}</Body></Body>
    </StyledView>
    <StyledView className="px-2">
      <RangeSlider
        style={{ width: '100%', height: 40 }}
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
    <Body className="text-neutral-600 text-sm mb-4">
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
    <Body className="text-neutral-600 text-sm mb-4">
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
    <Body className="text-neutral-600 text-sm mb-4">
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
    <Body className="text-neutral-700 text-sm font-medium mb-2">{label}</Body>
    <StyledView className="flex-row flex-wrap gap-2.5">
      {LIFESTYLE_FREQUENCY_OPTIONS.map(option => {
        const isSelected = selectedValues.includes(option.value);
        return (
          <StyledTouchableOpacity
            key={option.value}
            activeOpacity={1}
            onPress={() => {
              lightHaptic();
              if (isSelected) {
                onUpdate(substanceKey, selectedValues.filter(v => v !== option.value));
              } else {
                onUpdate(substanceKey, [...selectedValues, option.value]);
              }
            }}
            className={`px-3 py-2 rounded-full border ${
              isSelected
                ? 'bg-primary-500 border-primary-500'
                : 'bg-white border-neutral-300'
            }`}
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
      <Body className="text-neutral-600 text-sm mb-4">
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

/** Custom input modal (for adding custom genders, etc.) */
export const CustomInputModal: React.FC<{
  visible: boolean;
  onClose: () => void;
  onSave: (value: string) => void;
}> = ({ visible, onClose, onSave }) => {
  const [inputValue, setInputValue] = React.useState('');
  const modalAnim = useSharedValue(0);
  const overlayStyle = useAnimatedStyle(() => ({ opacity: modalAnim.value }));
  const scaleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(modalAnim.value, [0, 1], [0.9, 1]) }],
  }));

  useEffect(() => {
    modalAnim.value = withSpring(visible ? 1 : 0, SPRINGS.responsive);
    if (visible) setInputValue('');
  }, [visible]);

  const handleSave = () => {
    const trimmed = inputValue.trim();
    if (!trimmed) return;
    onSave(trimmed);
    setInputValue('');
    Keyboard.dismiss();
  };

  const handleClose = () => {
    Keyboard.dismiss();
    setInputValue('');
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="none"
      transparent
      onRequestClose={onClose}
    >
      <StyledAnimatedView
        className="flex-1 bg-black/50 justify-start items-center px-6 pt-24"
        style={overlayStyle}
      >
        <StyledTouchableOpacity
          activeOpacity={1}
          onPress={handleClose}
          className="absolute inset-0"
        />

        <StyledAnimatedView
          className="bg-white rounded-2xl w-full max-w-md"
          style={scaleStyle}
        >
          {/* Header */}
          <StyledView className="px-6 pt-6 pb-4 border-b border-neutral-100">
            <H3 className="mb-2">Add Custom Gender</H3>
            <Body className="text-neutral-600 text-sm">
              Enter gender identity
            </Body>
          </StyledView>

          {/* Input Field */}
          <StyledView className="px-6 py-5">
            <StyledTextInput
              value={inputValue}
              onChangeText={setInputValue}
              placeholder="Enter gender identity"
              className="bg-neutral-50 border border-neutral-200 rounded-lg px-4 py-3 text-base text-neutral-900"
              placeholderTextColor={COLORS.text.disabled}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={handleSave}
            />
          </StyledView>

          {/* Action Buttons */}
          <StyledView className="px-6 pb-6 flex-row gap-3">
            <StyledTouchableOpacity
              onPress={() => {
                lightHaptic();
                handleClose();
              }}
              className="flex-1 bg-neutral-100 rounded-lg py-3 items-center"
            >
              <Body className="text-neutral-700 font-semibold">Cancel</Body>
            </StyledTouchableOpacity>

            <StyledTouchableOpacity
              onPress={handleSave}
              className={`flex-1 rounded-lg py-3 items-center ${
                inputValue.trim()
                  ? 'bg-primary-500'
                  : 'bg-neutral-200'
              }`}
              disabled={!inputValue.trim()}
            >
              <Body className={`font-semibold ${
                inputValue.trim()
                  ? 'text-white'
                  : 'text-neutral-400'
              }`}>
                Add
              </Body>
            </StyledTouchableOpacity>
          </StyledView>
        </StyledAnimatedView>
      </StyledAnimatedView>
    </Modal>
  );
};
