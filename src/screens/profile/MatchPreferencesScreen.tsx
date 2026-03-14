import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { View, ScrollView, TouchableOpacity, Alert, Modal, Keyboard, TextInput, Text } from 'react-native';
import ReanimatedAnimated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    interpolate,
} from 'react-native-reanimated';
import { SPRINGS } from '../../constants/animations';
import { styled } from 'nativewind';
import { H3, Body, Card, Button, ScreenWrapper } from '../../components/ui';
import { NavigationProp } from '@react-navigation/native';
import { RootStackParamList, UserProfile } from '../../types';
import RangeSlider from 'rn-range-slider';
import { AgeRangeStepper } from '../../components/ui/AgeRangeStepper';
import NetInfo from '@react-native-community/netinfo';
import { getCurrentUser } from '../../services/authService';
import { getUserProfile, updateUserProfile } from '../../services/profileService';
import { lightHaptic, mediumHaptic } from '../../utils/haptics';
import { calculateMatchPreferencesCompleteness } from '../../utils/profileCompleteness';
import { createLogger } from '../../utils/secureLogger';
import { FONTS, FONT_SIZES } from '../../constants/typography';
import { COLORS } from '../../theme/colors';
import { EvaIcon } from '../../components/icons';

const logger = createLogger('MatchPreferencesScreen');

interface MatchPreferencesScreenProps {
  navigation: NavigationProp<RootStackParamList>;
}

const StyledView = styled(View);
const StyledScrollView = styled(ScrollView);
const StyledTouchableOpacity = styled(TouchableOpacity);
const StyledTextInput = styled(TextInput);
const StyledAnimatedView = styled(ReanimatedAnimated.View);
const StyledText = styled(Text);

// Gender options - values must match database storage format (male/female, not man/woman)
const GENDER_OPTIONS = [
  { value: 'male', label: 'Man' },
  { value: 'female', label: 'Woman' },
  { value: 'non-binary', label: 'Non-binary' },
  { value: 'genderfluid', label: 'Genderfluid' },
  { value: 'agender', label: 'Agender' },
  { value: 'two_spirit', label: 'Two-Spirit' },
];

const LIFESTYLE_FREQUENCY_OPTIONS = [
  { value: 'no', label: 'No' },
  { value: 'sometimes', label: 'Sometimes' },
  { value: 'yes', label: 'Yes' },
  { value: 'dont_care', label: "Don't Care" },
];

const COMMON_VALUES = [
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

const COMMON_INTERESTS = [
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

const ETHNICITY_OPTIONS = [
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

const RELIGION_PREF_OPTIONS = [
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

const POLITICAL_OPTIONS = [
  { value: 'no_preference', label: 'No Preference' },
  { value: 'very_liberal', label: 'Very Liberal' },
  { value: 'liberal', label: 'Liberal' },
  { value: 'moderate', label: 'Moderate' },
  { value: 'conservative', label: 'Conservative' },
  { value: 'very_conservative', label: 'Very Conservative' },
  { value: 'not_political', label: 'Not Political' },
];

// Stable sub-components for RangeSlider (prevent re-mounting on each render)
const Thumb = () => (
  <StyledView className="w-6 h-6 rounded-full border-2 border-white shadow-md" style={{ backgroundColor: COLORS.primaryAccent }} />
);
const Rail = () => <StyledView className="flex-1 h-1 rounded-full bg-neutral-200" />;
const RailSelected = () => <StyledView className="h-1 rounded-full" style={{ backgroundColor: COLORS.primaryAccent }} />;

export const MatchPreferencesScreen: React.FC<MatchPreferencesScreenProps> = ({ navigation }) => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [preferences, setPreferences] = useState({
    ageMin: 24,
    ageMax: 32,
    gender: 'female' as 'male' | 'female' | 'both',
    lookingFor: 'relationship' as 'relationship' | 'casual' | 'friendship' | 'unsure',
    heightMin: 60, // 5'0"
    heightMax: 84, // 7'0"
  });
  const [partnerPreferences, setPartnerPreferences] = useState({
    partnerDrinking: [] as string[],
    partnerCannabis: [] as string[],
    partnerTobacco: [] as string[],
    partnerOtherDrugs: [] as string[],
  });
  const [preferredEthnicities, setPreferredEthnicities] = useState<string[]>([]);
  const [preferredReligions, setPreferredReligions] = useState<string[]>([]);
  const [interestedInGenders, setInterestedInGenders] = useState<string[]>([]);
  const [preferredPolitics, setPreferredPolitics] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Track original data for change detection
  const originalDataRef = useRef<string | null>(null);

  // "Other" custom input modal state
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [customModalType, setCustomModalType] = useState<'gender' | 'values' | 'interests' | 'ethnicity'>('gender');
  const [customInputValue, setCustomInputValue] = useState('');
  const customModalAnim = useSharedValue(0);
  const modalOverlayStyle = useAnimatedStyle(() => ({ opacity: customModalAnim.value }));
  const modalScaleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(customModalAnim.value, [0, 1], [0.9, 1]) }],
  }));


  // Helper function to convert inches to feet and inches
  const formatHeight = (inches: number): string => {
    const feet = Math.floor(inches / 12);
    const remainingInches = inches % 12;
    return `${feet}'${remainingInches}"`;
  };

  useEffect(() => {
    loadProfile();
  }, []);

  // Animation for the reusable custom modal
  useEffect(() => {
    customModalAnim.value = withSpring(showCustomModal ? 1 : 0, SPRINGS.responsive);
  }, [showCustomModal]);

  // Helper to open custom modal for different types
  const openCustomModal = (type: 'gender' | 'values' | 'interests' | 'ethnicity') => {
    setCustomModalType(type);
    setCustomInputValue('');
    setShowCustomModal(true);
    lightHaptic();
  };

  // Helper to save custom modal value
  const saveCustomModalValue = () => {
    const trimmedValue = customInputValue.trim();
    if (!trimmedValue) return;

    switch (customModalType) {
      case 'gender':
        if (!interestedInGenders.includes(trimmedValue)) {
          setInterestedInGenders(prev => [...prev, trimmedValue]);
        }
        break;
      case 'ethnicity':
        if (!preferredEthnicities.includes(trimmedValue)) {
          setPreferredEthnicities(prev => [...prev, trimmedValue]);
        }
        break;
    }

    mediumHaptic();
    setCustomInputValue('');
    setShowCustomModal(false);
    Keyboard.dismiss();
  };

  // Get modal title based on type
  const getCustomModalTitle = () => {
    switch (customModalType) {
      case 'gender': return 'Add Custom Gender';
      case 'values': return 'Add Custom Value';
      case 'interests': return 'Add Custom Interest';
      case 'ethnicity': return 'Add Custom Ethnicity';
      default: return 'Add Custom';
    }
  };

  // Get modal placeholder based on type
  const getCustomModalPlaceholder = () => {
    switch (customModalType) {
      case 'gender': return 'Enter gender identity';
      case 'values': return 'Enter a value you want in a partner';
      case 'interests': return 'Enter an interest you want in a partner';
      case 'ethnicity': return 'Enter ethnicity preference';
      default: return 'Enter custom value';
    }
  };

  const loadProfile = async () => {
    try {
      const userResult = await getCurrentUser();
      if (!userResult.ok || !userResult.data) return;

      const profileResult = await getUserProfile();
      if (profileResult.ok && profileResult.data) {
        setProfile(profileResult.data);
        // Ensure all required fields have defaults when loading from profile
        const loadedPrefs = profileResult.data.preferences;
        setPreferences({
          ageMin: loadedPrefs.ageMin,
          ageMax: loadedPrefs.ageMax,
          gender: loadedPrefs.gender,
          lookingFor: 'relationship', // Bridge only supports relationships
          heightMin: loadedPrefs.heightMin ?? 60,
          heightMax: loadedPrefs.heightMax ?? 84,
        });

        // Load partner preferences (handle both old string format and new array format)
        if (profileResult.data.partnerLifestylePreferences) {
          const prefs = profileResult.data.partnerLifestylePreferences;
          setPartnerPreferences({
            partnerDrinking: Array.isArray(prefs.drinking) ? prefs.drinking : (prefs.drinking ? [prefs.drinking] : []),
            partnerCannabis: Array.isArray(prefs.cannabis) ? prefs.cannabis : (prefs.cannabis ? [prefs.cannabis] : []),
            partnerTobacco: Array.isArray(prefs.tobacco) ? prefs.tobacco : (prefs.tobacco ? [prefs.tobacco] : []),
            partnerOtherDrugs: Array.isArray(prefs.otherDrugs) ? prefs.otherDrugs : (prefs.otherDrugs ? [prefs.otherDrugs] : []),
          });
        }

        // Load preferred ethnicities
        setPreferredEthnicities(profileResult.data.preferredEthnicities || []);

        // Load preferred religions
        setPreferredReligions(profileResult.data.preferredReligions || []);

        // Load interested in genders
        setInterestedInGenders(profileResult.data.interestedInGenders || []);

        // Load preferred politics
        setPreferredPolitics(profileResult.data.preferredPolitics || []);

        // Store original data for change detection
        const originalPrefs: { drinking?: string | string[]; cannabis?: string | string[]; tobacco?: string | string[]; otherDrugs?: string | string[] } = profileResult.data.partnerLifestylePreferences ?? {};
        originalDataRef.current = JSON.stringify({
          preferences: {
            ageMin: loadedPrefs.ageMin,
            ageMax: loadedPrefs.ageMax,
            gender: loadedPrefs.gender,
            lookingFor: 'relationship', // Include lookingFor to match current state structure
            heightMin: loadedPrefs.heightMin ?? 60,
            heightMax: loadedPrefs.heightMax ?? 84,
          },
          partnerPreferences: {
            partnerDrinking: Array.isArray(originalPrefs.drinking) ? originalPrefs.drinking : (originalPrefs.drinking ? [originalPrefs.drinking] : []),
            partnerCannabis: Array.isArray(originalPrefs.cannabis) ? originalPrefs.cannabis : (originalPrefs.cannabis ? [originalPrefs.cannabis] : []),
            partnerTobacco: Array.isArray(originalPrefs.tobacco) ? originalPrefs.tobacco : (originalPrefs.tobacco ? [originalPrefs.tobacco] : []),
            partnerOtherDrugs: Array.isArray(originalPrefs.otherDrugs) ? originalPrefs.otherDrugs : (originalPrefs.otherDrugs ? [originalPrefs.otherDrugs] : []),
          },
          preferredEthnicities: profileResult.data.preferredEthnicities || [],
          preferredReligions: profileResult.data.preferredReligions || [],
          interestedInGenders: profileResult.data.interestedInGenders || [],
          preferredPolitics: profileResult.data.preferredPolitics || [],
        });
      }
    } catch (error) {
      logger.error('Failed to load profile:', error);
    }
  };

  // Detect changes for unsaved changes warning
  useEffect(() => {
    if (originalDataRef.current) {
      const currentData = JSON.stringify({
        preferences,
        partnerPreferences,
        preferredEthnicities,
        preferredReligions,
        interestedInGenders,
        preferredPolitics,
      });
      setHasUnsavedChanges(currentData !== originalDataRef.current);
    }
  }, [preferences, partnerPreferences, preferredEthnicities, preferredReligions, interestedInGenders, preferredPolitics]);

  const handleClose = () => {
    if (hasUnsavedChanges) {
      Alert.alert(
        'Discard Changes?',
        'You have unsaved changes. Are you sure you want to leave?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Discard',
            style: 'destructive',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } else {
      navigation.goBack();
    }
  };

  const renderThumb = useCallback(() => <Thumb />, []);
  const renderRail = useCallback(() => <Rail />, []);
  const renderRailSelected = useCallback(() => <RailSelected />, []);
  const handleAgeValueChanged = useCallback((low: number, high: number) => {
    setPreferences((prev) => ({ ...prev, ageMin: low, ageMax: high }));
  }, []);
  const handleHeightValueChanged = useCallback((low: number, high: number) => {
    setPreferences((prev) => ({ ...prev, heightMin: low, heightMax: high }));
  }, []);

  const handleSave = async () => {
    if (!profile) return;

    // Check network connectivity
    const networkState = await NetInfo.fetch();
    if (!networkState.isConnected) {
      Alert.alert('No Internet Connection', 'Please check your internet connection and try again');
      return;
    }

    // Validation
    if (preferences.ageMin < 18 || preferences.ageMin > 100) {
      Alert.alert('Invalid Age Range', 'Minimum age must be between 18 and 100');
      return;
    }

    if (preferences.ageMax < 18 || preferences.ageMax > 100) {
      Alert.alert('Invalid Age Range', 'Maximum age must be between 18 and 100');
      return;
    }

    // Allow min to equal max for specific age targeting
    // No validation needed here

    if (preferences.heightMin && preferences.heightMax && preferences.heightMin > preferences.heightMax) {
      Alert.alert('Invalid Height Range', 'Minimum height cannot be greater than maximum height');
      return;
    }

    if (interestedInGenders.length === 0) {
      Alert.alert('Gender Interest Required', 'Please select at least one gender you\'re interested in');
      return;
    }

    setSaving(true);
    try {
      // Auto-derive preferred_gender from interestedInGenders for backward compatibility
      // Values are already in database format (male/female, not man/woman)
      let derivedPreferredGender: 'male' | 'female' | 'both' = 'both';
      if (interestedInGenders.length === 1) {
        if (interestedInGenders[0] === 'male') {
          derivedPreferredGender = 'male';
        } else if (interestedInGenders[0] === 'female') {
          derivedPreferredGender = 'female';
        }
        // For non-binary, genderfluid, etc., use 'both'
      }
      // Multiple genders selected = 'both'

      const updatedProfile = {
        ...profile,
        preferences: {
          ...preferences,
          gender: derivedPreferredGender, // Auto-derived from interestedInGenders
          lookingFor: 'relationship' as const, // Bridge only supports relationships
        },
        interestedInGenders: interestedInGenders,
        preferredPolitics: preferredPolitics,
        // Partner preferences
        partnerLifestylePreferences: {
          drinking: partnerPreferences.partnerDrinking,
          cannabis: partnerPreferences.partnerCannabis,
          tobacco: partnerPreferences.partnerTobacco,
          otherDrugs: partnerPreferences.partnerOtherDrugs,
        },
        preferredEthnicities: preferredEthnicities,
        preferredReligions: preferredReligions,
      };

      const result = await updateUserProfile(updatedProfile);

      if (result.ok) {
        // Navigate back automatically on success - no popup needed
        navigation.goBack();
      } else {
        Alert.alert('Error', 'Failed to save preferences. Please try again.');
      }
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setSaving(false);
    }
  };

  // Calculate match preferences completion for current editing state
  // NOTE: Uses centralized calculation - consistent with ProfileStrengthDashboard
  // This provides real-time updates as user edits (before saving)
  const matchPrefsCompletion = useMemo(() => {
    if (!profile) return { percentage: 0, completedCount: 0, totalCount: 8, missingFields: [] };

    // Create a temporary profile with current state for real-time updates
    const currentProfile = {
      ...profile,
      preferences: {
        ...profile.preferences,
        ...preferences,
      },
      partnerLifestylePreferences: {
        drinking: partnerPreferences.partnerDrinking,
        cannabis: partnerPreferences.partnerCannabis,
        tobacco: partnerPreferences.partnerTobacco,
        otherDrugs: partnerPreferences.partnerOtherDrugs,
      },
      interestedInGenders,
      preferredEthnicities,
      preferredReligions,
      preferredPolitics,
    };

    return calculateMatchPreferencesCompleteness(currentProfile);
  }, [profile, preferences, partnerPreferences, interestedInGenders, preferredEthnicities, preferredReligions, preferredPolitics]);

  // Calculate match preferences completion for SAVED profile (for banner visibility)
  // This prevents banner from disappearing until changes are actually saved
  const savedMatchPrefsCompletion = useMemo(() => {
    if (!profile) return { percentage: 0 };
    return calculateMatchPreferencesCompleteness(profile);
  }, [profile]);

  return (
    <ScreenWrapper>

      {/* Header */}
      <StyledView className="bg-white border-b border-neutral-200 px-4 py-3">
        <StyledView className="flex-row items-center justify-between">
          <StyledTouchableOpacity onPress={handleClose} className="mr-3">
            <EvaIcon name="close" variant="outline" size={24} color="#101828" />
          </StyledTouchableOpacity>
          <StyledView className="flex-1">
            <H3>Match Preferences</H3>
          </StyledView>
          <StyledTouchableOpacity onPress={handleSave} disabled={saving}>
            <Body className={saving ? 'text-neutral-400' : 'text-primary-500 font-medium'}>
              {saving ? 'Saving...' : 'Save'}
            </Body>
          </StyledTouchableOpacity>
        </StyledView>

        {/* Completion Progress Bar - Hidden only when both saved AND current state are 100% */}
        {(savedMatchPrefsCompletion.percentage < 100 || matchPrefsCompletion.percentage < 100) && (
          <StyledView className="mt-3">
            <StyledView className="flex-row items-center justify-between mb-1.5">
              <Body className="text-xs text-neutral-600">
                {matchPrefsCompletion.completedCount} of {matchPrefsCompletion.totalCount} completed
              </Body>
              <Body className="text-xs font-semibold text-primary-600">
                {matchPrefsCompletion.percentage}%
              </Body>
            </StyledView>
            <StyledView className="bg-neutral-200 rounded-full h-1.5 overflow-hidden">
              <StyledView
                className="h-full rounded-full transition-all"
                style={{
                  width: `${matchPrefsCompletion.percentage}%`,
                  backgroundColor: COLORS.primaryAccent,
                }}
              />
            </StyledView>
          </StyledView>
        )}
      </StyledView>

      <StyledScrollView className="flex-1">
        <StyledView className="px-4 py-4">
          {/* Looking For - Bridge is for relationships only */}
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
                <EvaIcon name="checkmark-circle-2" variant="outline" size={24} color="#437FFF" />
              </StyledView>
            </StyledView>
          </Card>

          {/* Interested In Genders */}
          <Card className="mb-6">
            <H3 className="mb-2">Gender <StyledText style={{ color: COLORS.error, fontFamily: FONTS.regular }}>*</StyledText></H3>
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
                onPress={() => openCustomModal('gender')}
                className="px-3 py-2 rounded-full border border-dashed border-neutral-400 bg-neutral-50"
              >
                <Body className="text-sm text-neutral-600">+ Other</Body>
              </StyledTouchableOpacity>
            </StyledView>
          </Card>

          {/* Age Range */}
          <Card className="mb-6">
            <H3 className="mb-4">Age Range <StyledText style={{ color: COLORS.error, fontFamily: FONTS.regular }}>*</StyledText></H3>
            <AgeRangeStepper
              min={preferences.ageMin}
              max={preferences.ageMax}
              floor={18}
              ceiling={35}
              onMinChange={(v) => setPreferences(prev => ({ ...prev, ageMin: v }))}
              onMaxChange={(v) => setPreferences(prev => ({ ...prev, ageMax: v }))}
            />
          </Card>

          {/* Height Preference */}
          <Card className="mb-6">
            <H3 className="mb-3">Height <StyledText style={{ color: COLORS.error, fontFamily: FONTS.regular }}>*</StyledText></H3>
            <Body className="text-neutral-600 text-sm mb-4">
              Set your height preferences for potential matches
            </Body>

            <StyledView className="flex-row justify-between mb-3">
              <Body className="text-neutral-600">Min: <Body className="text-neutral-900 font-semibold">{formatHeight(preferences.heightMin || 60)}</Body></Body>
              <Body className="text-neutral-600">Max: <Body className="text-neutral-900 font-semibold">{formatHeight(preferences.heightMax || 84)}</Body></Body>
            </StyledView>
            <StyledView className="px-2">
              <RangeSlider
                style={{ width: '100%', height: 40 }}
                min={48}
                max={84}
                step={1}
                low={preferences.heightMin || 60}
                high={preferences.heightMax || 84}
                minRange={1}
                floatingLabel={false}
                renderThumb={renderThumb}
                renderRail={renderRail}
                renderRailSelected={renderRailSelected}
                onValueChanged={handleHeightValueChanged}
              />
            </StyledView>
          </Card>

          {/* Preferred Ethnicities */}
          <Card className="mb-6">
            <H3 className="mb-2">Ethnicity <StyledText style={{ color: COLORS.error, fontFamily: FONTS.regular }}>*</StyledText></H3>
            <Body className="text-neutral-600 text-sm mb-4">
              Select the ethnicities you're interested in for potential matches
            </Body>
            <StyledView className="flex-row flex-wrap gap-2.5">
              {ETHNICITY_OPTIONS.map(ethnicity => {
                const isSelected = preferredEthnicities.includes(ethnicity);
                return (
                  <StyledTouchableOpacity
                    key={ethnicity}
                    activeOpacity={1}
                    onPress={() => {
                      lightHaptic();
                      if (isSelected) {
                        setPreferredEthnicities(prev => prev.filter(e => e !== ethnicity));
                      } else if (ethnicity === 'No Preference') {
                        setPreferredEthnicities(['No Preference']);
                      } else {
                        setPreferredEthnicities(prev => [...prev.filter(e => e !== 'No Preference'), ethnicity]);
                      }
                    }}
                    className={`px-3 py-2 rounded-full border ${
                      isSelected
                        ? 'bg-primary-500 border-primary-500'
                        : 'bg-white border-neutral-300'
                    }`}
                  >
                    <Body className={`text-sm ${
                      isSelected ? 'text-white font-medium' : 'text-neutral-700'
                    }`}>{ethnicity}</Body>
                  </StyledTouchableOpacity>
                );
              })}
              {/* Custom ethnicities (not in predefined list) */}
              {preferredEthnicities
                .filter(e => !ETHNICITY_OPTIONS.includes(e))
                .map((customEthnicity) => (
                  <StyledTouchableOpacity
                    key={customEthnicity}
                    activeOpacity={1}
                    onPress={() => {
                      lightHaptic();
                      setPreferredEthnicities(prev => prev.filter(e => e !== customEthnicity));
                    }}
                    className="px-3 py-2 rounded-full border bg-primary-500 border-primary-500"
                  >
                    <Body className="text-sm text-white font-medium">{customEthnicity}</Body>
                  </StyledTouchableOpacity>
                ))}
              {/* Other button */}
              <StyledTouchableOpacity
                onPress={() => openCustomModal('ethnicity')}
                className="px-3 py-2 rounded-full border border-dashed border-neutral-400 bg-neutral-50"
              >
                <Body className="text-sm text-neutral-600">+ Other</Body>
              </StyledTouchableOpacity>
            </StyledView>
          </Card>

          {/* Preferred Religions */}
          <Card className="mb-6">
            <H3 className="mb-2">Religion</H3>
            <Body className="text-neutral-600 text-sm mb-4">
              Select the religious beliefs you're open to matching with
            </Body>
            <StyledView className="flex-row flex-wrap gap-2.5">
              {RELIGION_PREF_OPTIONS.map(religion => {
                const isSelected = preferredReligions.includes(religion);
                return (
                  <StyledTouchableOpacity
                    key={religion}
                    activeOpacity={1}
                    onPress={() => {
                      lightHaptic();
                      if (isSelected) {
                        setPreferredReligions(prev => prev.filter(r => r !== religion));
                      } else if (religion === 'No Preference') {
                        setPreferredReligions(['No Preference']);
                      } else {
                        setPreferredReligions(prev => [...prev.filter(r => r !== 'No Preference'), religion]);
                      }
                    }}
                    className={`px-3 py-2 rounded-full border ${
                      isSelected
                        ? 'bg-primary-500 border-primary-500'
                        : 'bg-white border-neutral-300'
                    }`}
                  >
                    <Body className={`text-sm ${
                      isSelected ? 'text-white font-medium' : 'text-neutral-700'
                    }`}>{religion}</Body>
                  </StyledTouchableOpacity>
                );
              })}
            </StyledView>
          </Card>

          {/* Preferred Politics */}
          <Card className="mb-6">
            <H3 className="mb-2">Politics <StyledText style={{ color: COLORS.error, fontFamily: FONTS.regular }}>*</StyledText></H3>
            <Body className="text-neutral-600 text-sm mb-4">
              Select the political views you're open to matching with
            </Body>
            <StyledView className="flex-row flex-wrap gap-2.5">
              {POLITICAL_OPTIONS.map(option => {
                const isSelected = preferredPolitics.includes(option.value);
                return (
                  <StyledTouchableOpacity
                    key={option.value}
                    activeOpacity={1}
                    onPress={() => {
                      lightHaptic();
                      if (isSelected) {
                        setPreferredPolitics(prev => prev.filter(p => p !== option.value));
                      } else if (option.value === 'no_preference') {
                        setPreferredPolitics(['no_preference']);
                      } else {
                        setPreferredPolitics(prev => [...prev.filter(p => p !== 'no_preference'), option.value]);
                      }
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
          </Card>

          {/* Lifestyle */}
          <Card className="mb-6">
            <H3 className="mb-2">Lifestyle <StyledText style={{ color: COLORS.error, fontFamily: FONTS.regular }}>*</StyledText></H3>
            <Body className="text-neutral-600 text-sm mb-4">
              What lifestyle habits do you prefer in a partner?
            </Body>

            {/* Drinking */}
            <StyledView className="mb-4">
              <Body className="text-neutral-700 text-sm font-medium mb-2">Drinking</Body>
              <StyledView className="flex-row flex-wrap gap-2.5">
                {LIFESTYLE_FREQUENCY_OPTIONS.map(option => {
                  const isSelected = partnerPreferences.partnerDrinking.includes(option.value);
                  return (
                    <StyledTouchableOpacity
                      key={option.value}
                      activeOpacity={1}
                      onPress={() => {
                        lightHaptic();
                        if (isSelected) {
                          // Deselect if already selected
                          setPartnerPreferences(prev => ({
                            ...prev,
                            partnerDrinking: prev.partnerDrinking.filter(v => v !== option.value)
                          }));
                        } else {
                          // Select if not selected
                          setPartnerPreferences(prev => ({
                            ...prev,
                            partnerDrinking: [...prev.partnerDrinking, option.value]
                          }));
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

            {/* Cannabis */}
            <StyledView className="mb-4">
              <Body className="text-neutral-700 text-sm font-medium mb-2">Cannabis</Body>
              <StyledView className="flex-row flex-wrap gap-2.5">
                {LIFESTYLE_FREQUENCY_OPTIONS.map(option => {
                  const isSelected = partnerPreferences.partnerCannabis.includes(option.value);
                  return (
                    <StyledTouchableOpacity
                      key={option.value}
                      activeOpacity={1}
                      onPress={() => {
                        lightHaptic();
                        if (isSelected) {
                          // Deselect if already selected
                          setPartnerPreferences(prev => ({
                            ...prev,
                            partnerCannabis: prev.partnerCannabis.filter(v => v !== option.value)
                          }));
                        } else {
                          // Select if not selected
                          setPartnerPreferences(prev => ({
                            ...prev,
                            partnerCannabis: [...prev.partnerCannabis, option.value]
                          }));
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

            {/* Tobacco */}
            <StyledView className="mb-4">
              <Body className="text-neutral-700 text-sm font-medium mb-2">Tobacco/Vaping</Body>
              <StyledView className="flex-row flex-wrap gap-2.5">
                {LIFESTYLE_FREQUENCY_OPTIONS.map(option => {
                  const isSelected = partnerPreferences.partnerTobacco.includes(option.value);
                  return (
                    <StyledTouchableOpacity
                      key={option.value}
                      activeOpacity={1}
                      onPress={() => {
                        lightHaptic();
                        if (isSelected) {
                          // Deselect if already selected
                          setPartnerPreferences(prev => ({
                            ...prev,
                            partnerTobacco: prev.partnerTobacco.filter(v => v !== option.value)
                          }));
                        } else {
                          // Select if not selected
                          setPartnerPreferences(prev => ({
                            ...prev,
                            partnerTobacco: [...prev.partnerTobacco, option.value]
                          }));
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

            {/* Other Drugs */}
            <StyledView>
              <Body className="text-neutral-700 text-sm font-medium mb-2">Other Substances</Body>
              <StyledView className="flex-row flex-wrap gap-2.5">
                {LIFESTYLE_FREQUENCY_OPTIONS.map(option => {
                  const isSelected = partnerPreferences.partnerOtherDrugs.includes(option.value);
                  return (
                    <StyledTouchableOpacity
                      key={option.value}
                      activeOpacity={1}
                      onPress={() => {
                        lightHaptic();
                        if (isSelected) {
                          // Deselect if already selected
                          setPartnerPreferences(prev => ({
                            ...prev,
                            partnerOtherDrugs: prev.partnerOtherDrugs.filter(v => v !== option.value)
                          }));
                        } else {
                          // Select if not selected
                          setPartnerPreferences(prev => ({
                            ...prev,
                            partnerOtherDrugs: [...prev.partnerOtherDrugs, option.value]
                          }));
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
          </Card>

        </StyledView>
      </StyledScrollView>

      {/* Reusable Custom Input Modal */}
      <Modal
        visible={showCustomModal}
        animationType="none"
        transparent
        onRequestClose={() => setShowCustomModal(false)}
      >
        <StyledAnimatedView
          className="flex-1 bg-black/50 justify-start items-center px-6 pt-24"
          style={modalOverlayStyle}
        >
          <StyledTouchableOpacity
            activeOpacity={1}
            onPress={() => {
              Keyboard.dismiss();
              setShowCustomModal(false);
              setCustomInputValue('');
            }}
            className="absolute inset-0"
          />

          <StyledAnimatedView
            className="bg-white rounded-2xl w-full max-w-md"
            style={modalScaleStyle}
          >
            {/* Header */}
            <StyledView className="px-6 pt-6 pb-4 border-b border-neutral-100">
              <H3 className="mb-2">{getCustomModalTitle()}</H3>
              <Body className="text-neutral-600 text-sm">
                {getCustomModalPlaceholder()}
              </Body>
            </StyledView>

            {/* Input Field */}
            <StyledView className="px-6 py-5">
              <StyledTextInput
                value={customInputValue}
                onChangeText={setCustomInputValue}
                placeholder={getCustomModalPlaceholder()}
                className="bg-neutral-50 border border-neutral-200 rounded-lg px-4 py-3 text-base text-neutral-900"
                placeholderTextColor={COLORS.text.disabled}
                autoFocus
                returnKeyType="done"
                onSubmitEditing={saveCustomModalValue}
              />
            </StyledView>

            {/* Action Buttons */}
            <StyledView className="px-6 pb-6 flex-row gap-3">
              <StyledTouchableOpacity
                onPress={() => {
                  lightHaptic();
                  setShowCustomModal(false);
                  setCustomInputValue('');
                  Keyboard.dismiss();
                }}
                className="flex-1 bg-neutral-100 rounded-lg py-3 items-center"
              >
                <Body className="text-neutral-700 font-semibold">Cancel</Body>
              </StyledTouchableOpacity>

              <StyledTouchableOpacity
                onPress={saveCustomModalValue}
                className={`flex-1 rounded-lg py-3 items-center ${
                  customInputValue.trim()
                    ? 'bg-primary-500'
                    : 'bg-neutral-200'
                }`}
                disabled={!customInputValue.trim()}
              >
                <Body className={`font-semibold ${
                  customInputValue.trim()
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
    </ScreenWrapper>
  );
};