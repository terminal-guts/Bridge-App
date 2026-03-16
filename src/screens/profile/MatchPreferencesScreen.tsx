import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { View, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { styled } from 'nativewind';
import { H3, Body, ScreenWrapper } from '../../components/ui';
import { NavigationProp } from '@react-navigation/native';
import { RootStackParamList, UserProfile } from '../../types';
import NetInfo from '@react-native-community/netinfo';
import { getCurrentUser } from '../../services/authService';
import { getUserProfile, updateUserProfile } from '../../services/profileService';
import { mediumHaptic } from '../../utils/haptics';
import { calculateMatchPreferencesCompleteness } from '../../utils/profileCompleteness';
import { createLogger } from '../../utils/secureLogger';
import { COLORS } from '../../theme/colors';
import { EvaIcon } from '../../components/icons';

// Extracted section components and constants
import {
  Thumb,
  Rail,
  RailSelected,
  LookingForSection,
  GenderSection,
  AgeRangeSection,
  HeightSection,
  EthnicitySection,
  ReligionSection,
  PoliticsSection,
  LifestyleSection,
} from './MatchPreferencesScreen.sections';

const logger = createLogger('MatchPreferencesScreen');

interface MatchPreferencesScreenProps {
  navigation: NavigationProp<RootStackParamList>;
}

const StyledView = styled(View);
const StyledScrollView = styled(ScrollView);
const StyledTouchableOpacity = styled(TouchableOpacity);

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

  useEffect(() => {
    loadProfile();
  }, []);

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

        // Load array preferences
        setPreferredEthnicities(profileResult.data.preferredEthnicities || []);
        setPreferredReligions(profileResult.data.preferredReligions || []);
        setInterestedInGenders(profileResult.data.interestedInGenders || []);
        setPreferredPolitics(profileResult.data.preferredPolitics || []);

        // Store original data for change detection
        const originalPrefs: { drinking?: string | string[]; cannabis?: string | string[]; tobacco?: string | string[]; otherDrugs?: string | string[] } = profileResult.data.partnerLifestylePreferences ?? {};
        originalDataRef.current = JSON.stringify({
          preferences: {
            ageMin: loadedPrefs.ageMin,
            ageMax: loadedPrefs.ageMax,
            gender: loadedPrefs.gender,
            lookingFor: 'relationship',
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

  const handleBack = () => {
    if (!hasUnsavedChanges) {
      navigation.goBack();
      return;
    }
    // Auto-save on back
    handleSave();
  };

  const renderThumb = useCallback(() => <Thumb />, []);
  const renderRail = useCallback(() => <Rail />, []);
  const renderRailSelected = useCallback(() => <RailSelected />, []);
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

    if (preferences.heightMin && preferences.heightMax && preferences.heightMin > preferences.heightMax) {
      Alert.alert('Invalid Height Range', 'Minimum height cannot be greater than maximum height');
      return;
    }

    // Validate all mandatory fields
    const missing: string[] = [];
    if (interestedInGenders.length === 0) missing.push('Gender');
    if (preferredEthnicities.length === 0) missing.push('Ethnicity');
    if (preferredReligions.length === 0) missing.push('Religion');
    if (preferredPolitics.length === 0) missing.push('Politics');
    if (partnerPreferences.partnerDrinking.length === 0 ||
        partnerPreferences.partnerCannabis.length === 0 ||
        partnerPreferences.partnerTobacco.length === 0 ||
        partnerPreferences.partnerOtherDrugs.length === 0) missing.push('Lifestyle');

    if (missing.length > 0) {
      Alert.alert(
        'Missing Required Fields',
        `Please complete: ${missing.join(', ')}`,
        [
          { text: 'Fix', style: 'cancel' },
          { text: 'Discard Changes', style: 'destructive', onPress: () => navigation.goBack() },
        ]
      );
      return;
    }

    setSaving(true);
    try {
      // Auto-derive preferred_gender from interestedInGenders for backward compatibility
      let derivedPreferredGender: 'male' | 'female' | 'both' = 'both';
      if (interestedInGenders.length === 1) {
        if (interestedInGenders[0] === 'male') {
          derivedPreferredGender = 'male';
        } else if (interestedInGenders[0] === 'female') {
          derivedPreferredGender = 'female';
        }
      }

      const updatedProfile = {
        ...profile,
        preferences: {
          ...preferences,
          gender: derivedPreferredGender,
          lookingFor: 'relationship' as const,
        },
        interestedInGenders: interestedInGenders,
        preferredPolitics: preferredPolitics,
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
  const matchPrefsCompletion = useMemo(() => {
    if (!profile) return { percentage: 0, completedCount: 0, totalCount: 8, missingFields: [] };

    const currentProfile = {
      ...profile,
      preferences: { ...profile.preferences, ...preferences },
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
  const savedMatchPrefsCompletion = useMemo(() => {
    if (!profile) return { percentage: 0 };
    return calculateMatchPreferencesCompleteness(profile);
  }, [profile]);

  return (
    <ScreenWrapper>

      {/* Header */}
      <StyledView className="bg-white border-b border-neutral-200 px-4 py-3">
        <StyledView className="flex-row items-center justify-between">
          <StyledTouchableOpacity onPress={handleBack} className="mr-3" accessibilityRole="button" accessibilityLabel="Go back">
            <EvaIcon name="arrow-ios-back" variant="outline" size={24} color={COLORS.textDarkHeading} />
          </StyledTouchableOpacity>
          <StyledView className="flex-1">
            <H3>Match Preferences</H3>
          </StyledView>
          {hasUnsavedChanges && (
            <Body className="text-primary-500 text-xs font-medium">
              {saving ? 'Saving...' : 'Auto-saves on back'}
            </Body>
          )}
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
          <LookingForSection />

          <GenderSection
            interestedInGenders={interestedInGenders}
            setInterestedInGenders={setInterestedInGenders}
          />

          <AgeRangeSection
            ageMin={preferences.ageMin}
            ageMax={preferences.ageMax}
            onMinChange={(v) => setPreferences(prev => ({ ...prev, ageMin: v }))}
            onMaxChange={(v) => setPreferences(prev => ({ ...prev, ageMax: v }))}
          />

          <HeightSection
            heightMin={preferences.heightMin}
            heightMax={preferences.heightMax}
            renderThumb={renderThumb}
            renderRail={renderRail}
            renderRailSelected={renderRailSelected}
            onValueChanged={handleHeightValueChanged}
          />

          <EthnicitySection
            preferredEthnicities={preferredEthnicities}
            setPreferredEthnicities={setPreferredEthnicities}
          />

          <ReligionSection
            preferredReligions={preferredReligions}
            setPreferredReligions={setPreferredReligions}
          />

          <PoliticsSection
            preferredPolitics={preferredPolitics}
            setPreferredPolitics={setPreferredPolitics}
          />

          <LifestyleSection
            partnerPreferences={partnerPreferences}
            setPartnerPreferences={setPartnerPreferences}
          />
        </StyledView>
      </StyledScrollView>

    </ScreenWrapper>
  );
};
