import React, { useState, useEffect, useRef, useMemo } from 'react';
import { View, SafeAreaView, StatusBar, ScrollView, TouchableOpacity, Alert, Modal, Animated, Keyboard, TextInput, Text } from 'react-native';
import { styled } from 'nativewind';
import { H3, Body, Card, Button } from '../../components/ui';
import { NavigationProp } from '@react-navigation/native';
import { RootStackParamList, UserProfile } from '../../types';
import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import NetInfo from '@react-native-community/netinfo';
import { getCurrentUser } from '../../services/authService';
import { getUserProfile, updateUserProfile } from '../../services/profileService';
import { lightHaptic, mediumHaptic } from '../../utils/haptics';
import { calculateMatchPreferencesCompleteness } from '../../utils/profileCompleteness';

interface MatchPreferencesScreenProps {
  navigation: NavigationProp<RootStackParamList>;
}

const StyledSafeAreaView = styled(SafeAreaView);
const StyledView = styled(View);
const StyledScrollView = styled(ScrollView);
const StyledTouchableOpacity = styled(TouchableOpacity);
const StyledTextInput = styled(TextInput);
const StyledAnimatedView = styled(Animated.View);
const StyledText = styled(Text);

// Gender options - values must match database storage format (male/female, not man/woman)
const GENDER_OPTIONS = [
  { value: 'male', label: 'Man' },
  { value: 'female', label: 'Woman' },
  { value: 'non-binary', label: 'Non-binary' },
  { value: 'genderfluid', label: 'Genderfluid' },
  { value: 'agender', label: 'Agender' },
  { value: 'two_spirit', label: 'Two-Spirit' },
  { value: 'genderqueer', label: 'Genderqueer' },
];

const LIFESTYLE_FREQUENCY_OPTIONS = [
  { value: 'no', label: 'No' },
  { value: 'sometimes', label: 'Sometimes' },
  { value: 'yes', label: 'Yes' },
  { value: 'dont_care', label: "Don't Care" },
];

const COMMON_VALUES = [
  // Personal Values
  'Honesty', 'Integrity', 'Loyalty', 'Trust', 'Respect', 'Authenticity',
  'Kindness', 'Compassion', 'Empathy', 'Generosity',

  // Relationship Values
  'Communication', 'Commitment', 'Partnership', 'Independence', 'Interdependence',
  'Romance', 'Intimacy', 'Friendship First',

  // Life Values
  'Family', 'Career', 'Ambition', 'Success', 'Work-Life Balance',
  'Adventure', 'Stability', 'Growth Mindset', 'Learning', 'Creativity',

  // Social Values
  'Community', 'Social Justice', 'Environmentalism', 'Equality', 'Diversity',
  'Tradition', 'Innovation', 'Service', 'Leadership',

  // Personal Growth
  'Self-Improvement', 'Mindfulness', 'Spirituality', 'Health', 'Fitness',
  'Mental Health', 'Emotional Intelligence',
];

const COMMON_INTERESTS = [
  // Activities
  'Tennis', 'Golf', 'Running', 'Yoga', 'Pilates', 'CrossFit', 'Hiking', 'Skiing',
  'Cycling', 'Swimming', 'Basketball', 'Soccer', 'Climbing',

  // Culture & Entertainment
  'Museums', 'Art Galleries', 'Theater', 'Live Music', 'Concerts', 'Comedy Shows',
  'Film', 'Documentaries', 'Reading', 'Writing', 'Photography',

  // Food & Drink
  'Cooking', 'Baking', 'Wine Tasting', 'Craft Beer', 'Coffee', 'Cocktails',
  'Fine Dining', 'Food Markets', 'Brunch',

  // Travel & Adventure
  'Travel', 'Weekend Trips', 'International Travel', 'Road Trips', 'Camping',

  // Lifestyle
  'Startups', 'Investing', 'Real Estate', 'Fashion', 'Interior Design',
  'Meditation', 'Wellness', 'Volunteering', 'Podcasts',

  // Social
  'Dinner Parties', 'Game Nights', 'Dancing', 'Karaoke', 'Trivia Nights',
];

const ETHNICITY_OPTIONS = [
  'Asian',
  'Black / African Descent',
  'Hispanic',
  'Middle Eastern',
  'Native American',
  'Pacific Islander',
  'South Asian',
  'White',
  'Caribbean',
  'East Asian',
  'Southeast Asian',
  'Central Asian',
  'North African',
  'Sub-Saharan African',
  'No Preference',
];

const POLITICAL_OPTIONS = [
  'Liberal',
  'Conservative',
  'Moderate',
  'Progressive',
  'Libertarian',
  'Socialist',
  'Apolitical',
  'No Preference',
];

const NON_NEGOTIABLES_LIST = [
  { id: 'outside_age_range', label: 'Outside of Age Range' },
  { id: 'outside_height_range', label: 'Outside of Height Range' },
  { id: 'different_politics', label: 'Different Politics' },
  { id: 'different_religion', label: 'Different Religion' },
  { id: 'heavy_drinking', label: 'Heavy Drinking' },
  { id: 'smoking', label: 'Tobacco/Vaping Use' },
  { id: 'drugs', label: 'Drug Use' },
  { id: 'has_children', label: 'Has Children' },
  { id: 'no_children', label: "Doesn't Want Children" },
];

export const MatchPreferencesScreen: React.FC<MatchPreferencesScreenProps> = ({ navigation }) => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [preferences, setPreferences] = useState({
    ageMin: 24,
    ageMax: 32,
    gender: 'female' as 'male' | 'female' | 'both',
    lookingFor: 'relationship' as 'relationship' | 'casual' | 'friendship' | 'unsure',
    heightMin: 60, // 5'0"
    heightMax: 84, // 7'0"
    maxDistance: 50 as number | null, // null means "don't care"
  });
  const [partnerPreferences, setPartnerPreferences] = useState({
    partnerDrinking: [] as string[],
    partnerCannabis: [] as string[],
    partnerTobacco: [] as string[],
    partnerOtherDrugs: [] as string[],
  });
  const [preferredEthnicities, setPreferredEthnicities] = useState<string[]>([]);
  const [interestedInGenders, setInterestedInGenders] = useState<string[]>([]);
  const [preferredPolitics, setPreferredPolitics] = useState<string[]>([]);
  const [nonNegotiables, setNonNegotiables] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Visibility settings for profile - all default to true (visible)
  const [preferenceVisibility, setPreferenceVisibility] = useState({
    ageRange: true,
    interestedInGenders: true,
    heightPreference: true,
    datingDistance: true,
    partnerLifestyle: true,
    preferredEthnicities: true,
    politicalPreferences: true,
    nonNegotiables: true,
  });

  // Track original data for change detection
  const originalDataRef = useRef<string | null>(null);

  // "Other" custom input modal state
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [customModalType, setCustomModalType] = useState<'gender' | 'values' | 'interests' | 'ethnicity' | 'non_negotiable'>('non_negotiable');
  const [customInputValue, setCustomInputValue] = useState('');
  const customModalAnim = useRef(new Animated.Value(0)).current;

  // Legacy non-negotiable modal state (kept for backwards compatibility)
  const [showCustomNonNegotiableModal, setShowCustomNonNegotiableModal] = useState(false);
  const [customNonNegotiableValue, setCustomNonNegotiableValue] = useState('');
  const customNonNegotiableModalAnim = useRef(new Animated.Value(0)).current;

  // Helper function to convert inches to feet and inches
  const formatHeight = (inches: number): string => {
    const feet = Math.floor(inches / 12);
    const remainingInches = inches % 12;
    return `${feet}'${remainingInches}"`;
  };

  useEffect(() => {
    loadProfile();
  }, []);

  useEffect(() => {
    Animated.spring(customNonNegotiableModalAnim, {
      toValue: showCustomNonNegotiableModal ? 1 : 0,
      useNativeDriver: true,
      tension: 65,
      friction: 11,
    }).start();
  }, [showCustomNonNegotiableModal]);

  // Animation for the reusable custom modal
  useEffect(() => {
    Animated.spring(customModalAnim, {
      toValue: showCustomModal ? 1 : 0,
      useNativeDriver: true,
      tension: 65,
      friction: 11,
    }).start();
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
          maxDistance: loadedPrefs.maxDistance !== undefined ? loadedPrefs.maxDistance : 50,
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

        // Load interested in genders
        setInterestedInGenders(profileResult.data.interestedInGenders || []);

        // Load preferred politics
        setPreferredPolitics(profileResult.data.preferredPolitics || []);

        // Load preference visibility settings (default all to true if not set)
        if (profileResult.data.preferenceVisibility) {
          setPreferenceVisibility({
            ageRange: profileResult.data.preferenceVisibility.ageRange ?? true,
            interestedInGenders: profileResult.data.preferenceVisibility.interestedInGenders ?? true,
            heightPreference: profileResult.data.preferenceVisibility.heightPreference ?? true,
            datingDistance: profileResult.data.preferenceVisibility.datingDistance ?? true,
            partnerLifestyle: profileResult.data.preferenceVisibility.partnerLifestyle ?? true,
            preferredEthnicities: profileResult.data.preferenceVisibility.preferredEthnicities ?? true,
            politicalPreferences: profileResult.data.preferenceVisibility.politicalPreferences ?? true,
            nonNegotiables: profileResult.data.preferenceVisibility.nonNegotiables ?? true,
          });
        }

        // Extract dealbreaker IDs from dealbreakers array
        const nonNegotiableIds = (profileResult.data.nonNegotiables || []).map(d => d.type);
        setNonNegotiables(nonNegotiableIds);

        // Store original data for change detection
        const originalPrefs = profileResult.data.partnerLifestylePreferences || {};
        originalDataRef.current = JSON.stringify({
          preferences: {
            ageMin: loadedPrefs.ageMin,
            ageMax: loadedPrefs.ageMax,
            gender: loadedPrefs.gender,
            lookingFor: 'relationship', // Include lookingFor to match current state structure
            heightMin: loadedPrefs.heightMin ?? 60,
            heightMax: loadedPrefs.heightMax ?? 84,
            maxDistance: loadedPrefs.maxDistance !== undefined ? loadedPrefs.maxDistance : 50,
          },
          partnerPreferences: {
            partnerDrinking: Array.isArray(originalPrefs.drinking) ? originalPrefs.drinking : (originalPrefs.drinking ? [originalPrefs.drinking] : []),
            partnerCannabis: Array.isArray(originalPrefs.cannabis) ? originalPrefs.cannabis : (originalPrefs.cannabis ? [originalPrefs.cannabis] : []),
            partnerTobacco: Array.isArray(originalPrefs.tobacco) ? originalPrefs.tobacco : (originalPrefs.tobacco ? [originalPrefs.tobacco] : []),
            partnerOtherDrugs: Array.isArray(originalPrefs.otherDrugs) ? originalPrefs.otherDrugs : (originalPrefs.otherDrugs ? [originalPrefs.otherDrugs] : []),
          },
          preferredEthnicities: profileResult.data.preferredEthnicities || [],
          interestedInGenders: profileResult.data.interestedInGenders || [],
          preferredPolitics: profileResult.data.preferredPolitics || [],
          preferenceVisibility: profileResult.data.preferenceVisibility || {
            ageRange: true,
            interestedInGenders: true,
            heightPreference: true,
            datingDistance: true,
            partnerLifestyle: true,
            preferredEthnicities: true,
            politicalPreferences: true,
            nonNegotiables: true,
          },
          nonNegotiables: nonNegotiableIds,
        });
      }
    } catch (error) {
      console.error('Failed to load profile:', error);
    }
  };

  // Detect changes for unsaved changes warning
  useEffect(() => {
    if (originalDataRef.current) {
      const currentData = JSON.stringify({
        preferences,
        partnerPreferences,
        preferredEthnicities,
        interestedInGenders,
        preferredPolitics,
        preferenceVisibility,
        nonNegotiables,
      });
      setHasUnsavedChanges(currentData !== originalDataRef.current);
    }
  }, [preferences, partnerPreferences, preferredEthnicities, interestedInGenders, preferredPolitics, preferenceVisibility, nonNegotiables]);

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
      // Convert dealbreaker IDs to Dealbreaker objects
      const nonNegotiableObjects = nonNegotiables.map(id => ({
        id,
        type: id,
        value: true,
      }));

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
        nonNegotiables: nonNegotiableObjects,
        interestedInGenders: interestedInGenders,
        preferredPolitics: preferredPolitics,
        preferenceVisibility: preferenceVisibility,
        // Partner preferences
        partnerLifestylePreferences: {
          drinking: partnerPreferences.partnerDrinking,
          cannabis: partnerPreferences.partnerCannabis,
          tobacco: partnerPreferences.partnerTobacco,
          otherDrugs: partnerPreferences.partnerOtherDrugs,
        },
        preferredEthnicities: preferredEthnicities,
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

  const toggleNonNegotiable = (id: string) => {
    setNonNegotiables(prev => {
      if (prev.includes(id)) {
        // Deselecting - always allow
        return [];
      } else {
        // Only allow one selection - replace any previous selection
        return [id];
      }
    });
  };

  const toggleVisibility = (field: keyof typeof preferenceVisibility) => {
    setPreferenceVisibility(prev => ({
      ...prev,
      [field]: !prev[field],
    }));
    lightHaptic();
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
      preferredPolitics,
    };

    return calculateMatchPreferencesCompleteness(currentProfile);
  }, [profile, preferences, partnerPreferences, interestedInGenders, preferredEthnicities, preferredPolitics]);

  // Calculate match preferences completion for SAVED profile (for banner visibility)
  // This prevents banner from disappearing until changes are actually saved
  const savedMatchPrefsCompletion = useMemo(() => {
    if (!profile) return { percentage: 0 };
    return calculateMatchPreferencesCompleteness(profile);
  }, [profile]);

  return (
    <StyledSafeAreaView className="flex-1 bg-neutral-50">
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <StyledView className="bg-white border-b border-neutral-200 px-4 py-3">
        <StyledView className="flex-row items-center justify-between">
          <StyledTouchableOpacity onPress={handleClose} className="mr-3">
            <Ionicons name="close" size={24} color="#101828" />
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
              <Body className="text-xs font-semibold text-purple-600">
                {matchPrefsCompletion.percentage}%
              </Body>
            </StyledView>
            <StyledView className="bg-neutral-200 rounded-full h-1.5 overflow-hidden">
              <StyledView
                className="h-full rounded-full transition-all"
                style={{
                  width: `${matchPrefsCompletion.percentage}%`,
                  backgroundColor: '#7C3AED',
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
            <StyledView className="p-4 rounded-lg border bg-purple-50 border-purple-500">
              <StyledView className="flex-row items-center justify-between">
                <StyledView className="flex-1">
                  <Body className="text-base font-semibold mb-1 text-purple-700">
                    Relationship
                  </Body>
                  <Body className="text-sm text-neutral-600">
                    Long-term relationship
                  </Body>
                </StyledView>
                <Ionicons name="checkmark-circle" size={24} color="#9333ea" />
              </StyledView>
            </StyledView>
          </Card>

          {/* Interested In Genders */}
          <Card className="mb-6">
            <H3 className="mb-2">Gender <StyledText style={{ color: '#EF4444' }}>*</StyledText></H3>
            <Body className="text-neutral-600 text-sm mb-4">
              Select all gender identities you're open to matching with
            </Body>
            <StyledView className="flex-row flex-wrap gap-2">
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
                    className={`px-3 py-2 rounded-lg border ${
                      isSelected
                        ? 'bg-purple-500 border-purple-500'
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
                    className="px-3 py-2 rounded-lg border bg-purple-500 border-purple-500"
                  >
                    <Body className="text-sm text-white font-medium">{customGender}</Body>
                  </StyledTouchableOpacity>
                ))}
              {/* Other button */}
              <StyledTouchableOpacity
                onPress={() => openCustomModal('gender')}
                className="px-3 py-2 rounded-lg border border-dashed border-neutral-400 bg-neutral-50"
              >
                <Body className="text-sm text-neutral-600">+ Other</Body>
              </StyledTouchableOpacity>
            </StyledView>
          </Card>

          {/* Age Range */}
          <Card className="mb-6">
            <StyledView className="flex-row items-center justify-between mb-4">
              <H3>Age Range <StyledText style={{ color: '#EF4444' }}>*</StyledText></H3>
              <StyledTouchableOpacity
                onPress={() => toggleVisibility('ageRange')}
                className="flex-row items-center"
              >
                <Body className="text-xs text-neutral-500 mr-2">Show on profile</Body>
                <StyledView className={`w-5 h-5 rounded border ${
                  preferenceVisibility.ageRange ? 'bg-purple-500 border-purple-500' : 'border-neutral-300'
                } items-center justify-center`}>
                  {preferenceVisibility.ageRange && (
                    <Ionicons name="checkmark" size={14} color="white" />
                  )}
                </StyledView>
              </StyledTouchableOpacity>
            </StyledView>
            <StyledView className="mb-4">
              <StyledView className="flex-row justify-between mb-2">
                <Body className="text-neutral-600">Minimum Age</Body>
                <Body className="text-neutral-900 font-semibold">{preferences.ageMin}</Body>
              </StyledView>
              <Slider
                key="age-min-slider"
                value={preferences.ageMin}
                onValueChange={(value) =>
                  setPreferences((prev) => ({ ...prev, ageMin: Math.round(value) }))
                }
                minimumValue={18}
                maximumValue={preferences.ageMax}
                step={1}
                minimumTrackTintColor="#437FFF"
                maximumTrackTintColor="#D0D5DD"
                thumbTintColor="#437FFF"
              />
            </StyledView>

            <StyledView>
              <StyledView className="flex-row justify-between mb-2">
                <Body className="text-neutral-600">Maximum Age</Body>
                <Body className="text-neutral-900 font-semibold">{preferences.ageMax}</Body>
              </StyledView>
              <Slider
                key="age-max-slider"
                value={preferences.ageMax}
                onValueChange={(value) =>
                  setPreferences((prev) => ({ ...prev, ageMax: Math.round(value) }))
                }
                minimumValue={preferences.ageMin}
                maximumValue={80}
                step={1}
                minimumTrackTintColor="#437FFF"
                maximumTrackTintColor="#D0D5DD"
                thumbTintColor="#437FFF"
              />
            </StyledView>
          </Card>

          {/* Height Preference */}
          <Card className="mb-6">
            <StyledView className="flex-row items-center justify-between mb-3">
              <H3>Height <StyledText style={{ color: '#EF4444' }}>*</StyledText></H3>
              <StyledTouchableOpacity
                onPress={() => toggleVisibility('heightPreference')}
                className="flex-row items-center"
              >
                <Body className="text-xs text-neutral-500 mr-2">Show on profile</Body>
                <StyledView className={`w-5 h-5 rounded border ${
                  preferenceVisibility.heightPreference ? 'bg-purple-500 border-purple-500' : 'border-neutral-300'
                } items-center justify-center`}>
                  {preferenceVisibility.heightPreference && (
                    <Ionicons name="checkmark" size={14} color="white" />
                  )}
                </StyledView>
              </StyledTouchableOpacity>
            </StyledView>
            <Body className="text-neutral-600 text-sm mb-4">
              Set your height preferences for potential matches
            </Body>

            <StyledView className="mb-4">
              <StyledView className="flex-row justify-between mb-2">
                <Body className="text-neutral-600">Minimum Height</Body>
                <Body className="text-neutral-900 font-semibold">{formatHeight(preferences.heightMin || 60)}</Body>
              </StyledView>
              <Slider
                key="height-min-slider"
                value={preferences.heightMin || 60}
                onValueChange={(value) =>
                  setPreferences((prev) => ({ ...prev, heightMin: Math.round(value) }))
                }
                minimumValue={48} // 4'0"
                maximumValue={preferences.heightMax || 84}
                step={1}
                minimumTrackTintColor="#437FFF"
                maximumTrackTintColor="#D0D5DD"
                thumbTintColor="#437FFF"
              />
            </StyledView>

            <StyledView>
              <StyledView className="flex-row justify-between mb-2">
                <Body className="text-neutral-600">Maximum Height</Body>
                <Body className="text-neutral-900 font-semibold">{formatHeight(preferences.heightMax || 84)}</Body>
              </StyledView>
              <Slider
                key="height-max-slider"
                value={preferences.heightMax || 84}
                onValueChange={(value) =>
                  setPreferences((prev) => ({ ...prev, heightMax: Math.round(value) }))
                }
                minimumValue={preferences.heightMin || 60}
                maximumValue={84} // 7'0"
                step={1}
                minimumTrackTintColor="#437FFF"
                maximumTrackTintColor="#D0D5DD"
                thumbTintColor="#437FFF"
              />
            </StyledView>
          </Card>

          {/* Dating Distance */}
          <Card className="mb-6">
            <StyledView className="flex-row items-center justify-between mb-3">
              <H3>Dating Distance <StyledText style={{ color: '#EF4444' }}>*</StyledText></H3>
              <StyledTouchableOpacity
                onPress={() => toggleVisibility('datingDistance')}
                className="flex-row items-center"
              >
                <Body className="text-xs text-neutral-500 mr-2">Show on profile</Body>
                <StyledView className={`w-5 h-5 rounded border ${
                  preferenceVisibility.datingDistance ? 'bg-purple-500 border-purple-500' : 'border-neutral-300'
                } items-center justify-center`}>
                  {preferenceVisibility.datingDistance && (
                    <Ionicons name="checkmark" size={14} color="white" />
                  )}
                </StyledView>
              </StyledTouchableOpacity>
            </StyledView>
            <Body className="text-neutral-600 text-sm mb-4">
              How far would you be willing to date?
            </Body>

            <StyledView className="mb-4">
              <StyledView className="flex-row justify-between mb-2">
                <Body className="text-neutral-600">Maximum Distance</Body>
                <Body className="text-neutral-900 font-semibold">
                  {(preferences.maxDistance === null || preferences.maxDistance === 200)
                    ? "Distance doesn't matter"
                    : `${preferences.maxDistance} miles`}
                </Body>
              </StyledView>
              <Slider
                key="distance-slider"
                value={preferences.maxDistance === null ? 200 : preferences.maxDistance}
                onValueChange={(value) => {
                  const roundedValue = Math.round(value);
                  setPreferences((prev) => ({
                    ...prev,
                    maxDistance: roundedValue === 200 ? null : roundedValue,
                  }));
                }}
                minimumValue={1}
                maximumValue={200}
                step={1}
                minimumTrackTintColor="#437FFF"
                maximumTrackTintColor="#D0D5DD"
                thumbTintColor="#437FFF"
              />
              <StyledView className="flex-row justify-between mt-2">
                <Body className="text-xs text-neutral-500">1 mi</Body>
                <Body className="text-xs text-neutral-500">No limit</Body>
              </StyledView>
            </StyledView>
          </Card>

          {/* Preferred Ethnicities */}
          <Card className="mb-6">
            <StyledView className="flex-row items-center justify-between mb-2">
              <StyledView className="flex-1 flex-shrink mr-2">
                <H3>Ethnicity <StyledText style={{ color: '#EF4444' }}>*</StyledText></H3>
              </StyledView>
              <StyledTouchableOpacity
                onPress={() => toggleVisibility('preferredEthnicities')}
                className="flex-row items-center flex-shrink-0"
              >
                <Body className="text-xs text-neutral-500 mr-2">Show on profile</Body>
                <StyledView className={`w-5 h-5 rounded border ${
                  preferenceVisibility.preferredEthnicities ? 'bg-purple-500 border-purple-500' : 'border-neutral-300'
                } items-center justify-center`}>
                  {preferenceVisibility.preferredEthnicities && (
                    <Ionicons name="checkmark" size={14} color="white" />
                  )}
                </StyledView>
              </StyledTouchableOpacity>
            </StyledView>
            <Body className="text-neutral-600 text-sm mb-4">
              Select the ethnicities you're interested in for potential matches
            </Body>
            <StyledView className="flex-row flex-wrap gap-2">
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
                      } else {
                        setPreferredEthnicities(prev => [...prev, ethnicity]);
                      }
                    }}
                    className={`px-3 py-2 rounded-full border ${
                      isSelected
                        ? 'bg-purple-100 border-purple-500'
                        : 'bg-white border-neutral-300'
                    }`}
                  >
                    <Body className={`text-sm ${
                      isSelected ? 'text-purple-700 font-medium' : 'text-neutral-700'
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
                    className="px-3 py-2 rounded-full border bg-purple-100 border-purple-500"
                  >
                    <Body className="text-sm text-purple-700 font-medium">{customEthnicity}</Body>
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

          {/* Preferred Politics */}
          <Card className="mb-6">
            <StyledView className="flex-row items-center justify-between mb-2">
              <H3>Politics <StyledText style={{ color: '#EF4444' }}>*</StyledText></H3>
              <StyledTouchableOpacity
                onPress={() => toggleVisibility('politicalPreferences')}
                className="flex-row items-center"
              >
                <Body className="text-xs text-neutral-500 mr-2">Show on profile</Body>
                <StyledView className={`w-5 h-5 rounded border ${
                  preferenceVisibility.politicalPreferences ? 'bg-purple-500 border-purple-500' : 'border-neutral-300'
                } items-center justify-center`}>
                  {preferenceVisibility.politicalPreferences && (
                    <Ionicons name="checkmark" size={14} color="white" />
                  )}
                </StyledView>
              </StyledTouchableOpacity>
            </StyledView>
            <Body className="text-neutral-600 text-sm mb-4">
              Select the political views you're open to matching with
            </Body>
            <StyledView className="flex-row flex-wrap gap-2">
              {POLITICAL_OPTIONS.map(politics => {
                const isSelected = preferredPolitics.includes(politics);
                return (
                  <StyledTouchableOpacity
                    key={politics}
                    activeOpacity={1}
                    onPress={() => {
                      lightHaptic();
                      if (isSelected) {
                        setPreferredPolitics(prev => prev.filter(p => p !== politics));
                      } else {
                        setPreferredPolitics(prev => [...prev, politics]);
                      }
                    }}
                    className={`px-3 py-2 rounded-full border ${
                      isSelected
                        ? 'bg-purple-100 border-purple-500'
                        : 'bg-white border-neutral-300'
                    }`}
                  >
                    <Body className={`text-sm ${
                      isSelected ? 'text-purple-700 font-medium' : 'text-neutral-700'
                    }`}>{politics}</Body>
                  </StyledTouchableOpacity>
                );
              })}
              {/* Custom politics (not in predefined list) */}
              {preferredPolitics
                .filter(p => !POLITICAL_OPTIONS.includes(p))
                .map((customPolitics) => (
                  <StyledTouchableOpacity
                    key={customPolitics}
                    activeOpacity={1}
                    onPress={() => {
                      lightHaptic();
                      setPreferredPolitics(prev => prev.filter(p => p !== customPolitics));
                    }}
                    className="px-3 py-2 rounded-full border bg-purple-100 border-purple-500"
                  >
                    <Body className="text-sm text-purple-700 font-medium">{customPolitics}</Body>
                  </StyledTouchableOpacity>
                ))}
            </StyledView>
          </Card>

          {/* Lifestyle */}
          <Card className="mb-6">
            <StyledView className="flex-row items-center justify-between mb-2">
              <StyledView className="flex-1 flex-shrink mr-2">
                <H3>Lifestyle <StyledText style={{ color: '#EF4444' }}>*</StyledText></H3>
              </StyledView>
              <StyledTouchableOpacity
                onPress={() => toggleVisibility('partnerLifestyle')}
                className="flex-row items-center flex-shrink-0"
              >
                <Body className="text-xs text-neutral-500 mr-2">Show on profile</Body>
                <StyledView className={`w-5 h-5 rounded border ${
                  preferenceVisibility.partnerLifestyle ? 'bg-purple-500 border-purple-500' : 'border-neutral-300'
                } items-center justify-center`}>
                  {preferenceVisibility.partnerLifestyle && (
                    <Ionicons name="checkmark" size={14} color="white" />
                  )}
                </StyledView>
              </StyledTouchableOpacity>
            </StyledView>
            <Body className="text-neutral-600 text-sm mb-4">
              What lifestyle habits do you prefer in a partner?
            </Body>

            {/* Drinking */}
            <StyledView className="mb-4">
              <Body className="text-neutral-700 text-sm font-medium mb-2">Drinking</Body>
              <StyledView className="flex-row flex-wrap gap-2">
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
                      className={`px-3 py-2 rounded-lg border ${
                        isSelected
                          ? 'bg-purple-500 border-purple-500'
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
              <StyledView className="flex-row flex-wrap gap-2">
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
                      className={`px-3 py-2 rounded-lg border ${
                        isSelected
                          ? 'bg-purple-500 border-purple-500'
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
              <StyledView className="flex-row flex-wrap gap-2">
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
                      className={`px-3 py-2 rounded-lg border ${
                        isSelected
                          ? 'bg-purple-500 border-purple-500'
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
              <StyledView className="flex-row flex-wrap gap-2">
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
                      className={`px-3 py-2 rounded-lg border ${
                        isSelected
                          ? 'bg-purple-500 border-purple-500'
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

          {/* Non-Negotiables */}
          <Card className="mb-8">
            <StyledView className="flex-row items-center justify-between mb-2">
              <StyledView className="flex-row items-center">
                <H3>Non-Negotiables</H3>
                <Body className="text-neutral-400 text-sm ml-2">(optional)</Body>
              </StyledView>
              <StyledTouchableOpacity
                onPress={() => toggleVisibility('nonNegotiables')}
                className="flex-row items-center"
              >
                <Body className="text-xs text-neutral-500 mr-2">Show on profile</Body>
                <StyledView className={`w-5 h-5 rounded border ${
                  preferenceVisibility.nonNegotiables ? 'bg-purple-500 border-purple-500' : 'border-neutral-300'
                } items-center justify-center`}>
                  {preferenceVisibility.nonNegotiables && (
                    <Ionicons name="checkmark" size={14} color="white" />
                  )}
                </StyledView>
              </StyledTouchableOpacity>
            </StyledView>
            <Body className="text-neutral-600 text-sm mb-4">
              Select one characteristic that is a no-go for you
            </Body>
            <StyledView className="space-y-3">
              {NON_NEGOTIABLES_LIST.map(option => {
                const isSelected = nonNegotiables.includes(option.id);
                return (
                  <StyledTouchableOpacity
                    key={option.id}
                    onPress={() => {
                      lightHaptic();
                      toggleNonNegotiable(option.id);
                    }}
                    className={`flex-row items-center p-3 rounded-lg border ${
                      isSelected
                        ? 'bg-error/5 border-error'
                        : 'bg-white border-neutral-300'
                    }`}
                  >
                    <Body className={`flex-1 font-medium ${isSelected ? 'text-error' : 'text-neutral-900'}`}>
                      {option.label}
                    </Body>
                    <StyledView className={`w-5 h-5 rounded border ${
                      isSelected ? 'bg-error border-error' : 'border-neutral-300'
                    } items-center justify-center`}>
                      {isSelected && (
                        <Ionicons name="checkmark" size={14} color="white" />
                      )}
                    </StyledView>
                  </StyledTouchableOpacity>
                );
              })}

              {/* Custom non-negotiables (not in predefined list) */}
              {nonNegotiables.filter(db => !NON_NEGOTIABLES_LIST.some(opt => opt.id === db)).map((customNonNegotiable) => (
                <StyledTouchableOpacity
                  key={customNonNegotiable}
                  onPress={() => {
                    lightHaptic();
                    toggleNonNegotiable(customNonNegotiable);
                  }}
                  className="flex-row items-center p-3 rounded-lg border bg-error/5 border-error"
                >
                  <Body className="flex-1 font-medium text-error">{customNonNegotiable}</Body>
                  <StyledView className="w-5 h-5 rounded border bg-error border-error items-center justify-center">
                    <Ionicons name="checkmark" size={14} color="white" />
                  </StyledView>
                </StyledTouchableOpacity>
              ))}

            </StyledView>
          </Card>
        </StyledView>
      </StyledScrollView>

      {/* Custom Non-Negotiable "Other" Modal */}
      <Modal
        visible={showCustomNonNegotiableModal}
        animationType="none"
        transparent
        onRequestClose={() => setShowCustomNonNegotiableModal(false)}
      >
        <StyledAnimatedView
          className="flex-1 bg-black/50 justify-start items-center px-6 pt-24"
          style={{
            opacity: customNonNegotiableModalAnim,
          }}
        >
          <StyledTouchableOpacity
            activeOpacity={1}
            onPress={() => {
              Keyboard.dismiss();
              setShowCustomNonNegotiableModal(false);
              setCustomNonNegotiableValue('');
            }}
            className="absolute inset-0"
          />

          <StyledAnimatedView
            className="bg-white rounded-2xl w-full max-w-md"
            style={{
              transform: [{
                scale: customNonNegotiableModalAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.9, 1],
                }),
              }],
            }}
          >
            {/* Header */}
            <StyledView className="px-6 pt-6 pb-4 border-b border-neutral-100">
              <H3 className="mb-2">Add Custom Non-Negotiable</H3>
              <Body className="text-neutral-600 text-sm">
                Enter a characteristic that's a non-negotiable for you
              </Body>
            </StyledView>

            {/* Input Field */}
            <StyledView className="px-6 py-5">
              <StyledTextInput
                value={customNonNegotiableValue}
                onChangeText={setCustomNonNegotiableValue}
                placeholder="Type your dealbreaker"
                className="bg-neutral-50 border border-neutral-200 rounded-lg px-4 py-3 text-base text-neutral-900"
                placeholderTextColor="#9CA3AF"
                autoFocus
                returnKeyType="done"
                onSubmitEditing={() => {
                  if (customNonNegotiableValue.trim()) {
                    setNonNegotiables([...nonNegotiables, customNonNegotiableValue.trim()]);
                    mediumHaptic();
                    setCustomNonNegotiableValue('');
                    setShowCustomNonNegotiableModal(false);
                    Keyboard.dismiss();
                  }
                }}
              />
            </StyledView>

            {/* Action Buttons */}
            <StyledView className="px-6 pb-6 flex-row gap-3">
              <StyledTouchableOpacity
                onPress={() => {
                  lightHaptic();
                  setShowCustomNonNegotiableModal(false);
                  setCustomNonNegotiableValue('');
                  Keyboard.dismiss();
                }}
                className="flex-1 bg-neutral-100 rounded-lg py-3 items-center"
              >
                <Body className="text-neutral-700 font-semibold">Cancel</Body>
              </StyledTouchableOpacity>

              <StyledTouchableOpacity
                onPress={() => {
                  if (customNonNegotiableValue.trim()) {
                    setNonNegotiables([...nonNegotiables, customNonNegotiableValue.trim()]);
                    mediumHaptic();
                    setCustomNonNegotiableValue('');
                    setShowCustomNonNegotiableModal(false);
                    Keyboard.dismiss();
                  }
                }}
                className={`flex-1 rounded-lg py-3 items-center ${
                  customNonNegotiableValue.trim()
                    ? 'bg-error'
                    : 'bg-neutral-200'
                }`}
                disabled={!customNonNegotiableValue.trim()}
              >
                <Body className={`font-semibold ${
                  customNonNegotiableValue.trim()
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

      {/* Reusable Custom Input Modal */}
      <Modal
        visible={showCustomModal}
        animationType="none"
        transparent
        onRequestClose={() => setShowCustomModal(false)}
      >
        <StyledAnimatedView
          className="flex-1 bg-black/50 justify-start items-center px-6 pt-24"
          style={{
            opacity: customModalAnim,
          }}
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
            style={{
              transform: [{
                scale: customModalAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.9, 1],
                }),
              }],
            }}
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
                placeholderTextColor="#9CA3AF"
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
                    ? 'bg-purple-500'
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
    </StyledSafeAreaView>
  );
};