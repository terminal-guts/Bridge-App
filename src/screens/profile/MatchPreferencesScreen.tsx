import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { View, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { styled } from 'nativewind';
import { H3, Body, BodySmall, ScreenWrapper, BackHeader, LoadingState, ErrorState } from '../../components/ui';
import { NavigationProp } from '@react-navigation/native';
import { RootStackParamList, UserProfile } from '../../types';
import NetInfo, { useNetInfo } from '@react-native-community/netinfo';
import { getCurrentUser } from '../../services/authService';
import { getUserProfile, updateUserProfile } from '../../services/profileService';
import { calculateMatchPreferencesCompleteness } from '../../utils/profileCompleteness';
import { createLogger } from '../../utils/secureLogger';
import { COLORS } from '../../theme/colors';
import { EvaIcon } from '../../components/icons';

// Extracted section components and constants
import {
  Thumb,
  Rail,
  RailSelected,
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
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
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
  const netInfo = useNetInfo();
  const isOffline = netInfo.isConnected === false;

  // Track original data for change detection
  const originalDataRef = useRef<string | null>(null);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const userResult = await getCurrentUser();
      if (!userResult.ok || !userResult.data) {
        setLoadError(true);
        return;
      }

      const profileResult = await getUserProfile();
      if (!profileResult.ok || !profileResult.data) {
        setLoadError(true);
        return;
      }

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
    } catch (error) {
      logger.error('Failed to load profile:', error);
      setLoadError(true);
    } finally {
      setLoading(false);
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
    if (!hasUnsavedChanges || isOffline) {
      navigation.goBack();
      return;
    }
    // Auto-save on back -- handleSave navigates on success
    handleSave();
  };

  const renderThumb = useCallback(() => <Thumb />, []);
  const renderRail = useCallback(() => <Rail />, []);
  const renderRailSelected = useCallback(() => <RailSelected />, []);
  const handleHeightValueChanged = useCallback((low: number, high: number) => {
    setPreferences((prev) => ({ ...prev, heightMin: low, heightMax: high }));
  }, []);

  const handleSave = async () => {
    if (!profile || saving) return;

    // Check network connectivity
    const networkState = await NetInfo.fetch();
    if (!networkState.isConnected) {
      Alert.alert('No Internet Connection', 'Please check your connection and try again.');
      return;
    }

    // Clamp age values to valid range (stepper constrains to 18-35, but guard anyway)
    const clampedAgeMin = Math.max(18, Math.min(preferences.ageMin, 35));
    const clampedAgeMax = Math.max(18, Math.min(preferences.ageMax, 35));
    if (clampedAgeMin >= clampedAgeMax) {
      Alert.alert('Invalid Age Range', 'Minimum age must be less than maximum age.');
      return;
    }

    // Validate height range (both are always set, use numeric comparison not truthy)
    if (preferences.heightMin > preferences.heightMax) {
      Alert.alert('Invalid Height Range', 'Minimum height cannot be greater than maximum height.');
      return;
    }

    // Validate all mandatory fields
    const missing: string[] = [];
    // No validation gate — users can save partial preferences freely.
    // The profile completion gate on the Match screen handles enforcement.
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
          ageMin: clampedAgeMin,
          ageMax: clampedAgeMax,
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
        Alert.alert(
          'Couldn\'t Save',
          'Something went wrong saving your preferences.',
          [
            { text: 'Try Again', onPress: handleSave },
            { text: 'Discard', style: 'destructive', onPress: () => navigation.goBack() },
          ]
        );
      }
    } catch (error) {
      logger.error('Save preferences failed:', error);
      Alert.alert(
        'Couldn\'t Save',
        'An unexpected error occurred. Check your connection and try again.',
        [
          { text: 'Try Again', onPress: handleSave },
          { text: 'Discard', style: 'destructive', onPress: () => navigation.goBack() },
        ]
      );
    } finally {
      setSaving(false);
    }
  };

  // Calculate match preferences completion for current editing state
  const matchPrefsCompletion = useMemo(() => {
    if (!profile) return { percentage: 0, completedCount: 0, totalCount: 4, missingFields: [] };

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

  // Loading state
  if (loading) {
    return (
      <ScreenWrapper>
        <LoadingState fullScreen message="Loading preferences..." />
      </ScreenWrapper>
    );
  }

  // Error state
  if (loadError || !profile) {
    return (
      <ScreenWrapper>
        <ErrorState
          title="Couldn't load preferences"
          message="Check your connection and try again."
          onRetry={loadProfile}
        />
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper>

      {/* Offline banner */}
      {isOffline && (
        <StyledView className="bg-amber-50 border-b border-amber-200 px-4 py-2 flex-row items-center">
          <EvaIcon name="wifi-off-outline" variant="outline" size={16} color={COLORS.amber} />
          <BodySmall className="text-amber-700 ml-2">
            You're offline. Changes won't be saved until you reconnect.
          </BodySmall>
        </StyledView>
      )}

      {/* Header */}
      <StyledView className="border-b px-4 py-3" style={{ backgroundColor: COLORS.card, borderBottomColor: COLORS.border }}>
        <StyledView className="flex-row items-center justify-between">
          <StyledTouchableOpacity onPress={handleBack} disabled={saving} className="mr-2 items-center justify-center" style={{ minWidth: 44, minHeight: 44 }} accessibilityRole="button" accessibilityLabel="Go back">
            <EvaIcon name="arrow-ios-back" variant="outline" size={24} color={saving ? COLORS.text.tertiary : COLORS.text.primary} />
          </StyledTouchableOpacity>
          <StyledView className="flex-1">
            <H3>Match Preferences</H3>
          </StyledView>
          {saving && (
            <StyledView className="flex-row items-center">
              <ActivityIndicator size="small" color={COLORS.primaryAccent} />
              <Body className="text-primary-500 text-xs font-medium ml-1.5">Saving...</Body>
            </StyledView>
          )}
          {!saving && hasUnsavedChanges && (
            <Body className="text-primary-500 text-xs font-medium">
              Auto-saves on back
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
            <StyledView className="rounded-full h-1.5 overflow-hidden" style={{ backgroundColor: COLORS.card }}>
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

      <StyledScrollView
        className="flex-1"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
        pointerEvents={saving ? 'none' : 'auto'}
      >
        <StyledView className="px-4 py-4" style={saving ? { opacity: 0.5 } : undefined}>
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
