import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { View, SafeAreaView, StatusBar, ScrollView, TouchableOpacity, TextInput, Image, Alert, Modal, Switch, Animated, Keyboard, Linking, Platform, Text } from 'react-native';
import { styled } from 'nativewind';
import { H2, H3, Body, Card, Button, Chip, Input } from '../../components/ui';
import { NavigationProp } from '@react-navigation/native';
import { RootStackParamList, UserProfile } from '../../types';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { getCurrentUser } from '../../services/authService';
import { getUserProfile, updateUserProfile } from '../../services/profileService';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import { OfflineBanner } from '../../components/OfflineBanner';
import { PhotoCompletionBanner } from '../../components/PhotoCompletionBanner';
import { lightHaptic, mediumHaptic } from '../../utils/haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { calculateEditProfileCompleteness } from '../../utils/profileCompleteness';
import { InterestsSection } from './sections/InterestsSection';
import { ValuesSection } from './sections/ValuesSection';
import { LifestyleSection } from './sections/LifestyleSection';

interface ProfileEditScreenProps {
  navigation: NavigationProp<RootStackParamList, 'ProfileEdit'>;
}

const StyledSafeAreaView = styled(SafeAreaView);
const StyledView = styled(View);
const StyledScrollView = styled(ScrollView);
const StyledTouchableOpacity = styled(TouchableOpacity);
const StyledTextInput = styled(TextInput);
const StyledImage = styled(Image);
const StyledAnimatedView = styled(Animated.View);
const StyledText = styled(Text);

// Section Header Component (matching About Me view)
const SectionHeader: React.FC<{ title: string; titleExtra?: React.ReactNode }> = ({ title, titleExtra }) => (
  <StyledView className="mb-3 mt-2">
    <Body className="text-neutral-500 text-xs font-semibold tracking-wider">
      {title}{titleExtra}
    </Body>
  </StyledView>
);

const PRONOUN_OPTIONS = [
  'He', 'Him', 'His',
  'She', 'Her', 'Hers',
  'They', 'Them', 'Theirs',
  'Ze', 'Zir',
];

const MAX_PRONOUNS = 4;
const MIN_INTERESTS = 3;
const MAX_INTERESTS = 8;
const MIN_VALUES = 3;
const MAX_VALUES = 8;

const GENDER_OPTIONS = [
  { value: 'male', label: 'Man' },
  { value: 'female', label: 'Woman' },
  { value: 'non-binary', label: 'Non-binary' },
  { value: 'genderfluid', label: 'Genderfluid' },
  { value: 'agender', label: 'Agender' },
  { value: 'two_spirit', label: 'Two-Spirit' },
  { value: 'genderqueer', label: 'Genderqueer' },
];

const ETHNICITY_OPTIONS = [
  'Asian',
  'Black',
  'Caribbean',
  'Central Asian',
  'East Asian',
  'Hispanic',
  'Middle Eastern',
  'Native American',
  'North African',
  'Pacific Islander',
  'South Asian',
  'Southeast Asian',
  'Sub-Saharan African',
  'White',
];

const RELIGION_OPTIONS = [
  'Agnostic',
  'Atheist',
  'Buddhist',
  'Catholic',
  'Christian',
  'Hindu',
  'Jewish',
  'Mormon',
  'Muslim',
  'Sikh',
  'Spiritual',
  'Orthodox',
  'Protestant',
  'Evangelical',
  'Baha\'i',
  'Jain',
  'Shinto',
  'Taoist',
  'Pagan',
  'Unitarian',
  'Non-religious',
];

const POLITICAL_OPTIONS = [
  { value: 'very_liberal', label: 'Very Liberal' },
  { value: 'liberal', label: 'Liberal' },
  { value: 'moderate', label: 'Moderate' },
  { value: 'conservative', label: 'Conservative' },
  { value: 'very_conservative', label: 'Very Conservative' },
  { value: 'not_political', label: 'Not Political' },
  { value: 'prefer_not_to_say', label: 'Prefer Not to Say' },
];

const CHILDREN_STATUS_OPTIONS = [
  { value: 'yes', label: 'Yes' },
  { value: 'no', label: 'No' },
];

const FAMILY_PLANS_OPTIONS = [
  { value: 'want_children', label: 'Want children' },
  { value: 'dont_want_children', label: "Don't want children" },
  { value: 'not_sure', label: 'Not sure yet' },
];

// Deprecated constants removed: MARRIAGE_STATUS_OPTIONS, MARRIAGE_GOAL_OPTIONS, COMMON_ACTIVITIES

const EDUCATION_LEVELS = [
  { value: 'no_high_school', label: 'No High School Degree' },
  { value: 'high_school', label: 'High School' },
  { value: 'trade_school', label: 'Trade School' },
  { value: 'associates', label: "Associate's Degree" },
  { value: 'bachelors', label: "Bachelor's Degree" },
  { value: 'masters', label: "Master's Degree" },
  { value: 'beyond_masters', label: 'Beyond Masters' },
];

const AVAILABLE_INTERESTS = [
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

const AVAILABLE_VALUES = [
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

export const ProfileEditScreen: React.FC<ProfileEditScreenProps> = ({ navigation }) => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Optimized profile update function - uses functional form for better performance
  const updateProfile = useCallback((updates: Partial<UserProfile>) => {
    setProfile(prev => {
      if (!prev) return prev;
      return { ...prev, ...updates };
    });
  }, []);

  // CRITICAL FIX: Stable callback references to prevent breaking React.memo
  const handleUpdateDrinking = useCallback((value: string) => {
    updateProfile({ drinkingFrequency: value });
  }, [updateProfile]);

  const handleUpdateCannabis = useCallback((value: string) => {
    updateProfile({ cannabisFrequency: value });
  }, [updateProfile]);

  const handleUpdateTobacco = useCallback((value: string) => {
    updateProfile({ tobaccoFrequency: value });
  }, [updateProfile]);

  const handleUpdateOtherDrugs = useCallback((value: string) => {
    updateProfile({ otherDrugsFrequency: value });
  }, [updateProfile]);

  const handleToggleValue = useCallback((value: string) => {
    setProfile(prev => {
      if (!prev) return prev;
      const currentValues = prev.values || [];
      const isSelected = currentValues.includes(value);

      if (isSelected) {
        // Remove value
        return { ...prev, values: currentValues.filter(v => v !== value) };
      } else {
        // Check if limit reached
        if (currentValues.length >= 8) {
          Alert.alert(
            'Maximum Values Reached',
            'You can only select up to 8 values. Please deselect one before adding another.',
            [{ text: 'OK' }]
          );
          return prev;
        }
        // Add value
        return { ...prev, values: [...currentValues, value] };
      }
    });
  }, []);

  const handleToggleInterest = useCallback((interest: string) => {
    setProfile(prev => {
      if (!prev) return prev;
      const currentInterests = prev.interests || [];
      const isSelected = currentInterests.includes(interest);

      if (isSelected) {
        // Remove interest
        return { ...prev, interests: currentInterests.filter(i => i !== interest) };
      } else {
        // Check if limit reached
        if (currentInterests.length >= 8) {
          Alert.alert(
            'Maximum Interests Reached',
            'You can only select up to 8 interests. Please deselect one before adding another.',
            [{ text: 'OK' }]
          );
          return prev;
        }
        // Add interest
        return { ...prev, interests: [...currentInterests, interest] };
      }
    });
  }, []);

  const handleShowCustomInterestModal = useCallback(() => {
    setShowCustomInterestModal(true);
  }, []);

  const handleShowCustomValueModal = useCallback(() => {
    setShowCustomValueModal(true);
  }, []);

  // Step 1b: Memoize ethnicity parsing to avoid repeated split/filter operations
  const ethnicityArray = useMemo(() => {
    return profile?.ethnicity ?
      profile.ethnicity.split(' / ').filter(e => e.trim() !== '') : [];
  }, [profile?.ethnicity]);

  // Step 1c: Memoize custom interests/values filtering
  const customInterests = useMemo(() => {
    return profile?.interests?.filter(
      (interest) => !AVAILABLE_INTERESTS.includes(interest)
    ) || [];
  }, [profile?.interests]);

  const customValues = useMemo(() => {
    return profile?.values?.filter(
      (value) => !AVAILABLE_VALUES.includes(value)
    ) || [];
  }, [profile?.values]);

  const [newInterest, setNewInterest] = useState('');
  const [newValue, setNewValue] = useState('');
  const [isHeightFocused, setIsHeightFocused] = useState(false);
  const [heightError, setHeightError] = useState<string>('');
  const [showVisibilityModal, setShowVisibilityModal] = useState(false);

  // "Other" custom input modals
  const [showCustomGenderModal, setShowCustomGenderModal] = useState(false);
  const [customGenderValue, setCustomGenderValue] = useState('');
  const customGenderModalAnim = useRef(new Animated.Value(0)).current;

  const [showCustomEthnicityModal, setShowCustomEthnicityModal] = useState(false);
  const [customEthnicityValue, setCustomEthnicityValue] = useState('');
  const customEthnicityModalAnim = useRef(new Animated.Value(0)).current;

  const [showCustomEducationModal, setShowCustomEducationModal] = useState(false);
  const [customEducationValue, setCustomEducationValue] = useState('');
  const customEducationModalAnim = useRef(new Animated.Value(0)).current;

  const [showCustomPoliticalModal, setShowCustomPoliticalModal] = useState(false);
  const [customPoliticalValue, setCustomPoliticalValue] = useState('');
  const customPoliticalModalAnim = useRef(new Animated.Value(0)).current;

  const [showCustomReligionModal, setShowCustomReligionModal] = useState(false);
  const [customReligionValue, setCustomReligionValue] = useState('');
  const customReligionModalAnim = useRef(new Animated.Value(0)).current;

  const [showCustomChildrenModal, setShowCustomChildrenModal] = useState(false);
  const [customChildrenValue, setCustomChildrenValue] = useState('');
  const customChildrenModalAnim = useRef(new Animated.Value(0)).current;

  const [showCustomFamilyPlansModal, setShowCustomFamilyPlansModal] = useState(false);
  const [customFamilyPlansValue, setCustomFamilyPlansValue] = useState('');
  const customFamilyPlansModalAnim = useRef(new Animated.Value(0)).current;

  const [showCustomInterestModal, setShowCustomInterestModal] = useState(false);
  const [customInterestValue, setCustomInterestValue] = useState('');
  const customInterestModalAnim = useRef(new Animated.Value(0)).current;

  const [showCustomValueModal, setShowCustomValueModal] = useState(false);
  const [customValueInputValue, setCustomValueInputValue] = useState('');
  const customValueModalAnim = useRef(new Animated.Value(0)).current;

  // Track original profile for change detection
  const originalProfileRef = useRef<string | null>(null);

  // Section visibility controls - all default to true (visible)
  const [sectionVisibility, setSectionVisibility] = useState({
    religion: true,
    politics: true,
    occupation: true,
    company: true,
    educationLevel: true,
    school: true,
    hometown: true,
    family: true,
    lifestyle: true,
  });
  const { isOffline } = useNetworkStatus();
  const visibilityModalAnim = useRef(new Animated.Value(0)).current;


  // Calculate "About Me" section completion percentage in real-time
  // NOTE: This is intentionally different from overall profile strength
  // This screen only edits About Me fields (19 fields), not Match Prefs/Photos/Questions
  const profileCompletion = useMemo(() => {
    return calculateEditProfileCompleteness(profile);
  }, [profile]);
  useEffect(() => {
    loadProfile();
  }, []);

  useEffect(() => {
    Animated.spring(visibilityModalAnim, {
      toValue: showVisibilityModal ? 1 : 0,
      useNativeDriver: true,
      tension: 65,
      friction: 11,
    }).start();
  }, [showVisibilityModal]);

  useEffect(() => {
    Animated.spring(customGenderModalAnim, {
      toValue: showCustomGenderModal ? 1 : 0,
      useNativeDriver: true,
      tension: 65,
      friction: 11,
    }).start();
  }, [showCustomGenderModal]);

  useEffect(() => {
    Animated.spring(customEthnicityModalAnim, {
      toValue: showCustomEthnicityModal ? 1 : 0,
      useNativeDriver: true,
      tension: 65,
      friction: 11,
    }).start();
  }, [showCustomEthnicityModal]);

  useEffect(() => {
    Animated.spring(customEducationModalAnim, {
      toValue: showCustomEducationModal ? 1 : 0,
      useNativeDriver: true,
      tension: 65,
      friction: 11,
    }).start();
  }, [showCustomEducationModal]);

  useEffect(() => {
    Animated.spring(customPoliticalModalAnim, {
      toValue: showCustomPoliticalModal ? 1 : 0,
      useNativeDriver: true,
      tension: 65,
      friction: 11,
    }).start();
  }, [showCustomPoliticalModal]);

  useEffect(() => {
    Animated.spring(customReligionModalAnim, {
      toValue: showCustomReligionModal ? 1 : 0,
      useNativeDriver: true,
      tension: 65,
      friction: 11,
    }).start();
  }, [showCustomReligionModal]);

  useEffect(() => {
    Animated.spring(customChildrenModalAnim, {
      toValue: showCustomChildrenModal ? 1 : 0,
      useNativeDriver: true,
      tension: 65,
      friction: 11,
    }).start();
  }, [showCustomChildrenModal]);

  useEffect(() => {
    Animated.spring(customFamilyPlansModalAnim, {
      toValue: showCustomFamilyPlansModal ? 1 : 0,
      useNativeDriver: true,
      tension: 65,
      friction: 11,
    }).start();
  }, [showCustomFamilyPlansModal]);

  useEffect(() => {
    Animated.spring(customInterestModalAnim, {
      toValue: showCustomInterestModal ? 1 : 0,
      useNativeDriver: true,
      tension: 65,
      friction: 11,
    }).start();
  }, [showCustomInterestModal]);

  useEffect(() => {
    Animated.spring(customValueModalAnim, {
      toValue: showCustomValueModal ? 1 : 0,
      useNativeDriver: true,
      tension: 65,
      friction: 11,
    }).start();
  }, [showCustomValueModal]);

  // Helper: Deep equality check for arrays
  const arraysEqual = (a?: any[], b?: any[]): boolean => {
    if (!a && !b) return true; // both null/undefined
    if (!a || !b) return false; // one is null/undefined
    if (a.length !== b.length) return false;
    return JSON.stringify(a) === JSON.stringify(b);
  };

  // Optimized change detection - checks specific fields instead of JSON.stringify
  const hasProfileChanged = useCallback((current: UserProfile | null, originalJson: string): boolean => {
    if (!current || !originalJson) return false;

    try {
      const original = JSON.parse(originalJson) as UserProfile;

      // Compare editable fields only (avoid expensive full object comparison)
      const fieldsToCheck: (keyof UserProfile)[] = [
        'firstName', 'lastName', 'age', 'height',
        'ethnicity', 'religion', 'politicalLeaning', 'customPoliticalLeaning',
        'currentJob', 'companyPosition', 'educationLevel', 'customEducationLevel', 'school',
        'location', 'hometown',
        'hasChildren', 'familyPlans',
        'drinkingFrequency', 'cannabisFrequency', 'tobaccoFrequency', 'otherDrugsFrequency',
        'bio'
      ];

      // Check simple fields
      for (const field of fieldsToCheck) {
        if (current[field] !== original[field]) return true;
      }

      // Check array fields (gender, pronounsList, interests, values, photos)
      const arrayFieldsToCheck: (keyof UserProfile)[] = ['gender', 'pronounsList', 'interests', 'values'];
      for (const field of arrayFieldsToCheck) {
        const currentArray = current[field] as any[] | undefined;
        const originalArray = original[field] as any[] | undefined;
        if (!arraysEqual(currentArray, originalArray)) return true;
      }

      // Check photos array separately (compare lengths and URLs)
      if (current.photos?.length !== original.photos?.length) return true;

      return false;
    } catch {
      return false;
    }
  }, []);

  // Detect changes to profile (now optimized)
  useEffect(() => {
    if (profile && originalProfileRef.current && !loading) {
      const hasChanges = hasProfileChanged(profile, originalProfileRef.current);
      setHasUnsavedChanges(hasChanges);
    }
  }, [profile, hasProfileChanged, loading]);

  const loadProfile = async () => {
    try {
      const userResult = await getCurrentUser();
      if (!userResult.ok || !userResult.data) {
        Alert.alert('Error', 'User not authenticated');
        setLoading(false);
        return;
      }

      // SECURITY FIX: getUserProfile() now gets userId from auth session automatically
      const profileResult = await getUserProfile();
      if (profileResult.ok && profileResult.data) {
        setProfile(profileResult.data);
        // Store original profile for change detection
        originalProfileRef.current = JSON.stringify(profileResult.data);

        // Load sectionVisibility from profile, default to all visible if not set
        if (profileResult.data.sectionVisibility) {
          const saved = profileResult.data.sectionVisibility;
          setSectionVisibility({
            religion: saved.religion ?? true,
            politics: saved.politics ?? true,
            occupation: saved.occupation ?? true,
            company: saved.company ?? true,
            educationLevel: saved.educationLevel ?? true,
            school: saved.school ?? true,
            hometown: saved.hometown ?? true,
            family: saved.family ?? true,
            lifestyle: saved.lifestyle ?? true,
          });
        }
      } else {
        Alert.alert('Error', 'Failed to load profile');
      }
    } catch (error) {
      console.error('Failed to load profile:', error);
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

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
    console.log('🚀 handleSave called!');
    if (!profile) {
      console.log('❌ No profile, returning early');
      return;
    }

    if (isOffline) {
      Alert.alert('Offline', 'Cannot save changes while offline. Please check your connection and try again.');
      return;
    }

    // No validation - users can save without filling mandatory fields
    // Mandatory fields (marked with *) only affect profile strength percentage

    setSaving(true);
    try {
      // Include sectionVisibility in the profile update
      const profileWithVisibility = {
        ...profile,
        sectionVisibility,
      };

      const result = await updateUserProfile(profileWithVisibility);

      if (result.ok) {
        navigation.goBack();
      } else {
        Alert.alert('Error', result.error?.message || 'Failed to update profile');
      }
    } catch (error: any) {
      console.error('🔥 Save exception:', error);
      Alert.alert('Error', error?.message || 'An unexpected error occurred');
    } finally {
      setSaving(false);
    }
  };

  const handleAddPhoto = () => {
    Alert.alert(
      'Add Photo',
      'Choose how to add a photo',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Take Photo',
          onPress: () => launchCamera(),
        },
        {
          text: 'Choose from Library',
          onPress: () => launchLibrary(),
        },
      ]
    );
  };

  const launchCamera = async () => {
    // Request camera permission
    const { status } = await ImagePicker.requestCameraPermissionsAsync();

    if (status !== 'granted') {
      Alert.alert(
        'Camera Access Required',
        'Bridge needs access to your camera to take profile photos. Please enable it in Settings.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Open Settings',
            onPress: () => {
              if (Platform.OS === 'ios') {
                Linking.openURL('app-settings:');
              } else {
                Linking.openSettings();
              }
            },
          },
        ]
      );
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [3, 4],
      quality: 1,
    });

    handlePhotoResult(result);
  };

  const launchLibrary = async () => {
    // First check current permission status
    const { status: existingStatus } = await ImagePicker.getMediaLibraryPermissionsAsync();

    let finalStatus = existingStatus;

    // If not determined yet, request permission
    if (existingStatus !== 'granted') {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      // Permission denied - show alert with option to open settings
      Alert.alert(
        'Photo Access Required',
        'Bridge needs access to your photo library to add profile photos. Please enable it in Settings.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Open Settings',
            onPress: () => {
              if (Platform.OS === 'ios') {
                Linking.openURL('app-settings:');
              } else {
                Linking.openSettings();
              }
            },
          },
        ]
      );
      return;
    }

    // Calculate how many more photos can be added (max 6)
    const remainingSlots = Math.max(0, 6 - (profile?.photos.length || 0));

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      selectionLimit: remainingSlots,
      quality: 1,
    });

    handleMultiplePhotoResult(result);
  };

  const handlePhotoResult = (result: ImagePicker.ImagePickerResult) => {
    if (!result.canceled && result.assets[0] && profile) {
      const newPhoto = {
        id: Date.now().toString(),
        url: result.assets[0].uri,
        isMain: profile.photos.length === 0,
        order: profile.photos.length,
      };

      setProfile({
        ...profile,
        photos: [...profile.photos, newPhoto],
      });
    }
  };

  const handleMultiplePhotoResult = (result: ImagePicker.ImagePickerResult) => {
    if (!result.canceled && result.assets && result.assets.length > 0 && profile) {
      const currentPhotosCount = profile.photos.length;
      const newPhotos = result.assets.map((asset, index) => ({
        id: `${Date.now()}-${index}`,
        url: asset.uri,
        isMain: currentPhotosCount === 0 && index === 0,
        order: currentPhotosCount + index,
      }));

      // Limit to 6 total photos
      const maxNewPhotos = Math.min(newPhotos.length, 6 - currentPhotosCount);
      const photosToAdd = newPhotos.slice(0, maxNewPhotos);

      if (photosToAdd.length > 0) {
        setProfile({
          ...profile,
          photos: [...profile.photos, ...photosToAdd],
        });
      }

      // Notify user if some photos were skipped
      if (newPhotos.length > maxNewPhotos) {
        Alert.alert(
          'Photo Limit Reached',
          `Only ${maxNewPhotos} photo${maxNewPhotos !== 1 ? 's were' : ' was'} added. Maximum is 6 photos.`
        );
      }
    }
  };

  const handleRemovePhoto = (photoId: string) => {
    if (!profile) return;

    Alert.alert('Remove Photo', 'Are you sure you want to remove this photo?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => {
          setProfile({
            ...profile,
            photos: profile.photos.filter(p => p.id !== photoId),
          });
        },
      },
    ]);
  };

  const handleMovePhotoUp = (index: number) => {
    if (!profile || index === 0) return;

    const newPhotos = [...profile.photos];
    [newPhotos[index - 1], newPhotos[index]] = [newPhotos[index], newPhotos[index - 1]];

    // Update order property
    newPhotos.forEach((photo, idx) => {
      photo.order = idx;
    });

    setProfile({
      ...profile,
      photos: newPhotos,
    });
  };

  const handleMovePhotoDown = (index: number) => {
    if (!profile || index === profile.photos.length - 1) return;

    const newPhotos = [...profile.photos];
    [newPhotos[index + 1], newPhotos[index]] = [newPhotos[index], newPhotos[index + 1]];

    // Update order property
    newPhotos.forEach((photo, idx) => {
      photo.order = idx;
    });

    setProfile({
      ...profile,
      photos: newPhotos,
    });
  };

  // Helper function to format height from inches to feet'inches"
  const formatHeight = (inches: string): string => {
    if (!inches || inches === '0') return '';
    const inchesNum = parseInt(inches, 10);
    if (isNaN(inchesNum)) return '';
    const feet = Math.floor(inchesNum / 12);
    const remainingInches = inchesNum % 12;
    return `${feet}'${remainingInches}"`;
  };

  // Helper function to extract inches from formatted height or raw number
  const parseHeightToInches = (value: string): string => {
    // If it's already just a number, return it
    if (/^\d+$/.test(value)) return value;
    // If it's in format like "5'8\"" or "5'8", extract inches
    const match = value.match(/(\d+)'(\d+)/);
    if (match) {
      const feet = parseInt(match[1], 10);
      const inches = parseInt(match[2], 10);
      return (feet * 12 + inches).toString();
    }
    return value;
  };

  const handleSetMainPhoto = (index: number) => {
    if (!profile) return;

    const newPhotos = [...profile.photos];

    // Remove isMain from all photos
    newPhotos.forEach(photo => {
      photo.isMain = false;
    });

    // Get the selected photo and remove it from its current position
    const selectedPhoto = newPhotos.splice(index, 1)[0];

    // Set it as main
    selectedPhoto.isMain = true;

    // Insert it at the front
    newPhotos.unshift(selectedPhoto);

    // Update order property for all photos
    newPhotos.forEach((photo, idx) => {
      photo.order = idx;
    });

    setProfile({
      ...profile,
      photos: newPhotos,
    });

    mediumHaptic();
  };

  const handleAddInterest = (interest: string) => {
    setProfile(prevProfile => {
      if (!prevProfile || prevProfile.interests.includes(interest)) return prevProfile;

      // Check if limit is reached
      if (prevProfile.interests.length >= MAX_INTERESTS) {
        Alert.alert(
          'Maximum Interests Reached',
          `You can only select up to ${MAX_INTERESTS} interests. Please deselect one before adding another.`,
          [{ text: 'OK' }]
        );
        return prevProfile;
      }

      return {
        ...prevProfile,
        interests: [...prevProfile.interests, interest],
      };
    });
  };

  const handleRemoveInterest = (interest: string) => {
    setProfile(prevProfile => {
      if (!prevProfile) return prevProfile;
      return {
        ...prevProfile,
        interests: prevProfile.interests.filter(i => i !== interest),
      };
    });
  };

  const handleAddCustomInterest = () => {
    if (!newInterest.trim() || !profile) return;
    if (profile.interests.includes(newInterest.trim())) {
      setNewInterest('');
      return;
    }

    handleAddInterest(newInterest.trim());
    setNewInterest('');
  };

  const handleAddValue = (value: string) => {
    setProfile(prevProfile => {
      if (!prevProfile || prevProfile.values.includes(value)) return prevProfile;

      // Check if limit is reached
      if (prevProfile.values.length >= MAX_VALUES) {
        Alert.alert(
          'Maximum Values Reached',
          `You can only select up to ${MAX_VALUES} values. Please deselect one before adding another.`,
          [{ text: 'OK' }]
        );
        return prevProfile;
      }

      return {
        ...prevProfile,
        values: [...prevProfile.values, value],
      };
    });
  };

  const handleRemoveValue = (value: string) => {
    setProfile(prevProfile => {
      if (!prevProfile) return prevProfile;
      return {
        ...prevProfile,
        values: prevProfile.values.filter(v => v !== value),
      };
    });
  };

  const handleAddCustomValue = () => {
    if (!newValue.trim() || !profile) return;
    if (profile.values.includes(newValue.trim())) {
      setNewValue('');
      return;
    }

    handleAddValue(newValue.trim());
    setNewValue('');
  };

  // Deprecated activity helper functions removed (activities no longer in onboarding)

  const toggleVisibility = (field: keyof typeof sectionVisibility) => {
    setSectionVisibility(prev => ({
      ...prev,
      [field]: !prev[field],
    }));
    lightHaptic();
  };

  if (loading) {
    return (
      <StyledSafeAreaView className="flex-1 bg-neutral-50">
        <StatusBar barStyle="dark-content" />
        <StyledView className="flex-1 justify-center items-center">
          <Body className="text-neutral-500">Loading profile...</Body>
        </StyledView>
      </StyledSafeAreaView>
    );
  }

  if (!profile) {
    return (
      <StyledSafeAreaView className="flex-1 bg-neutral-50">
        <StatusBar barStyle="dark-content" />
        <StyledView className="flex-1 justify-center items-center px-6">
          <Body className="text-neutral-500 mb-4">Failed to load profile</Body>
          <Button onPress={loadProfile} variant="primary">
            Retry
          </Button>
        </StyledView>
      </StyledSafeAreaView>
    );
  }

  return (
    <StyledSafeAreaView className="flex-1 bg-neutral-50">
      <StatusBar barStyle="dark-content" />
      <OfflineBanner />

      {/* Header */}
      <StyledView className="bg-white border-b border-neutral-200 px-4 py-3">
        <StyledView className="flex-row items-center justify-between">
          <StyledTouchableOpacity onPress={handleClose} className="mr-3">
            <Ionicons name="close" size={24} color="#101828" />
          </StyledTouchableOpacity>
          <StyledView className="flex-1">
            <H3>Edit Profile</H3>
          </StyledView>
          <StyledTouchableOpacity onPress={handleSave} disabled={saving}>
            <Body className={saving ? "text-neutral-400" : "text-primary-500 font-medium"}>
              {saving ? 'Saving...' : 'Save'}
            </Body>
          </StyledTouchableOpacity>
        </StyledView>

        {/* Completion Progress Bar - Only show when incomplete */}
        {profileCompletion.completedCount < profileCompletion.totalCount && (
          <StyledView className="mt-3">
            <StyledView className="flex-row items-center justify-between mb-1.5">
              <Body className="text-xs text-neutral-600">
                {profileCompletion.completedCount} of {profileCompletion.totalCount} completed
              </Body>
              <Body className="text-xs font-semibold" style={{ color: '#437FFF' }}>
                {profileCompletion.percentage}%
              </Body>
            </StyledView>
            <StyledView className="bg-neutral-200 rounded-full h-1.5 overflow-hidden">
              <StyledView
                className="h-full rounded-full transition-all"
                style={{
                  width: `${profileCompletion.percentage}%`,
                  backgroundColor: '#437FFF',
                }}
              />
            </StyledView>
          </StyledView>
        )}
      </StyledView>

      <PhotoCompletionBanner
        profile={profile}
        onPress={() => {
          // Scroll to photos section
          // Note: You may need to implement scrolling to the photos section if needed
        }}
      />

      <StyledScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <StyledView className="px-4 py-6">
          {/* Preview Profile Button */}
          <StyledTouchableOpacity
            onPress={() => {
              // Pass current profile state with unsaved visibility changes
              const previewProfile = profile ? {
                ...profile,
                sectionVisibility,
              } : undefined;
              navigation.navigate('ProfilePreview', { previewProfile });
            }}
            className="mb-4 bg-neutral-100 border border-neutral-300 rounded-lg px-4 py-3 flex-row items-center justify-center"
          >
            <Ionicons name="eye-outline" size={20} color="#437FFF" />
            <Body className="text-primary-500 font-semibold ml-2">Preview Profile</Body>
          </StyledTouchableOpacity>

          {/* Photos */}
          <Card className="mb-6">
            <StyledView className="flex-row items-center justify-between mb-2">
              <StyledView className="flex-row items-center">
                <H3>Photos <StyledText style={{ color: '#EF4444' }}>*</StyledText></H3>
              </StyledView>
              <Body className={`text-sm font-semibold ${profile.photos.length === 6 ? 'text-success' : 'text-error'}`}>
                {profile.photos.length}/6
              </Body>
            </StyledView>
            <Body className="text-neutral-600 text-sm mb-4">
              {profile.photos.length < 6
                ? `Upload 6 photos for a complete profile. ${6 - profile.photos.length} more recommended.`
                : 'Great! You have a complete photo set. Use ⭐ to set your main photo.'}
            </Body>

            <StyledView className="flex-row flex-wrap -mx-2">
              {profile.photos.map((photo, index) => (
                <StyledView key={photo.id} className="w-1/3 px-2 mb-4">
                  <StyledView className="relative aspect-[3/4] rounded-lg overflow-hidden">
                    <StyledImage source={{ uri: photo.url }} className="w-full h-full" resizeMode="cover" />

                    {/* Main Photo Badge */}
                    {photo.isMain && (
                      <StyledView className="absolute top-2 left-2 bg-primary-500 px-2 py-1 rounded">
                        <Body className="text-white text-xs font-semibold">Main</Body>
                      </StyledView>
                    )}

                    {/* Remove Button */}
                    <StyledTouchableOpacity
                      onPress={() => handleRemovePhoto(photo.id)}
                      className="absolute top-2 right-2 bg-black/60 rounded-full p-1"
                    >
                      <Ionicons name="close" size={16} color="white" />
                    </StyledTouchableOpacity>

                    {/* Reorder Controls */}
                    <StyledView className="absolute bottom-0 left-0 right-0 bg-black/60 flex-row justify-around py-1">
                      {/* Move Left */}
                      <StyledTouchableOpacity
                        onPress={() => handleMovePhotoUp(index)}
                        disabled={index === 0}
                        className="px-2 py-1"
                      >
                        <Ionicons
                          name="chevron-back"
                          size={18}
                          color={index === 0 ? '#666' : 'white'}
                        />
                      </StyledTouchableOpacity>

                      {/* Set as Main */}
                      <StyledTouchableOpacity
                        onPress={() => handleSetMainPhoto(index)}
                        className="px-2 py-1"
                      >
                        <Ionicons
                          name={photo.isMain ? "star" : "star-outline"}
                          size={18}
                          color={photo.isMain ? "#FCD34D" : "white"}
                        />
                      </StyledTouchableOpacity>

                      {/* Move Right */}
                      <StyledTouchableOpacity
                        onPress={() => handleMovePhotoDown(index)}
                        disabled={index === profile.photos.length - 1}
                        className="px-2 py-1"
                      >
                        <Ionicons
                          name="chevron-forward"
                          size={18}
                          color={index === profile.photos.length - 1 ? '#666' : 'white'}
                        />
                      </StyledTouchableOpacity>
                    </StyledView>
                  </StyledView>
                </StyledView>
              ))}

              {profile.photos.length < 6 && (
                <StyledView className="w-1/3 px-2 mb-4">
                  <StyledTouchableOpacity
                    onPress={handleAddPhoto}
                    className="aspect-[3/4] rounded-lg border-2 border-dashed border-primary-300 bg-primary-50 items-center justify-center"
                  >
                    <Ionicons name="add-circle" size={32} color="#437FFF" />
                    <Body className="text-primary-500 text-xs mt-2 text-center px-1">
                      {profile.photos.length === 0
                        ? 'Add Photos'
                        : `+ ${6 - profile.photos.length} more`}
                    </Body>
                  </StyledTouchableOpacity>
                </StyledView>
              )}
            </StyledView>
          </Card>

          {/* About Me */}
          <Card className="mb-6">
            <H3 className="mb-4">About Me</H3>

            {/* DEMOGRAPHICS */}
            <SectionHeader title="DEMOGRAPHICS" />
            <Input
              label="First Name"
              required
              value={profile.firstName}
              onChangeText={(text) => {
                // Only allow letters, spaces, hyphens, and apostrophes
                const lettersOnly = text.replace(/[^a-zA-Z\s'-]/g, '');
                updateProfile({ firstName: lettersOnly });
              }}
              placeholder="Enter your first name"
              containerClassName="mb-4"
            />
            <Input
              label="Last Name"
              required
              value={profile.lastName}
              onChangeText={(text) => {
                // Only allow letters, spaces, hyphens, and apostrophes
                const lettersOnly = text.replace(/[^a-zA-Z\s'-]/g, '');
                updateProfile({ lastName: lettersOnly });
              }}
              placeholder="Enter your last name"
              containerClassName="mb-4"
            />
            <Input
              label="Age"
              required
              value={profile.age.toString()}
              onChangeText={(text) => {
                // Allow only numeric input
                const numericOnly = text.replace(/[^0-9]/g, '');
                const age = numericOnly ? parseInt(numericOnly, 10) : 0;
                updateProfile({ age });
              }}
              keyboardType="numeric"
              placeholder="Enter your age (18+)"
              containerClassName="mb-4"
            />
            <Input
              label="Height"
              required
              value={isHeightFocused ? profile.height : formatHeight(profile.height)}
              onChangeText={(text) => {
                // Allow only numeric input when focused
                const numericOnly = text.replace(/[^0-9]/g, '');
                updateProfile({ height: numericOnly });
                setHeightError(''); // Clear error on change
              }}
              onFocus={() => {
                setIsHeightFocused(true);
                setHeightError(''); // Clear error on focus
              }}
              onBlur={() => {
                setIsHeightFocused(false);
                // Validate and ensure we have valid height in inches stored
                if (profile.height) {
                  const inches = parseHeightToInches(profile.height);
                  let validatedHeight = parseInt(inches, 10);

                  if (validatedHeight < 48) {
                    validatedHeight = 48;
                    setHeightError('Height must be at least 48 inches');
                  } else if (validatedHeight > 84) {
                    validatedHeight = 84;
                    setHeightError('Height cannot exceed 84 inches');
                  } else {
                    setHeightError('');
                  }

                  updateProfile({ height: validatedHeight.toString() });
                }
              }}
              placeholder="e.g., 68"
              keyboardType="numeric"
              containerClassName="mb-4"
            />
            {heightError && (
              <Body className="text-error text-sm -mt-2 mb-4">{heightError}</Body>
            )}
            {/* Ethnicity (Multi-select with chips) */}
            <Body className="text-xs font-medium text-neutral-700 mb-2 mt-4">
              Ethnicity <StyledText style={{ color: '#EF4444' }}>*</StyledText> (Select all that apply)
            </Body>
            <StyledView className="flex-row flex-wrap gap-2 mb-4">
              {/* Predefined ethnicity options */}
              {ETHNICITY_OPTIONS.map((option) => {
                const isSelected = ethnicityArray.includes(option);
                return (
                  <StyledTouchableOpacity
                    key={option}
                    activeOpacity={1}
                    delayPressIn={0}
                    onPress={() => {
                      lightHaptic();
                      let updatedEthnicities: string[];

                      if (isSelected) {
                        // Remove ethnicity
                        updatedEthnicities = ethnicityArray.filter(e => e !== option);
                      } else {
                        // Add ethnicity
                        updatedEthnicities = [...ethnicityArray, option];
                      }

                      // Join back into string for storage, filter empties
                      updateProfile({ ethnicity: updatedEthnicities.filter(e => e.trim() !== '').join(' / ') });
                    }}
                    className={`px-3 py-2 rounded-lg border ${
                      isSelected
                        ? 'bg-primary-500 border-primary-500'
                        : 'bg-white border-neutral-300'
                    }`}
                  >
                    <Body
                      className={`text-sm ${
                        isSelected
                          ? 'text-white font-medium'
                          : 'text-neutral-700'
                      }`}
                    >
                      {option}
                    </Body>
                  </StyledTouchableOpacity>
                );
              })}

              {/* Custom ethnicity values as chips */}
              {(() => {
                const customEthnicities = ethnicityArray.filter(e => !ETHNICITY_OPTIONS.includes(e) && e.trim() !== '');
                return customEthnicities.map((customEthnicity) => (
                  <StyledTouchableOpacity
                    key={customEthnicity}
                    onPress={() => {
                      const updatedEthnicities = ethnicityArray.filter(e => e !== customEthnicity);
                      updateProfile({
                        ethnicity: updatedEthnicities.filter(e => e.trim() !== '').join(' / '),
                      });
                      mediumHaptic();
                    }}
                    className="px-3 py-2 rounded-lg border bg-primary-500 border-primary-500"
                  >
                    <Body className="text-sm text-white font-medium">{customEthnicity}</Body>
                  </StyledTouchableOpacity>
                ));
              })()}

              {/* "Other" Button */}
              <StyledTouchableOpacity
                onPress={() => {
                  lightHaptic();
                  setShowCustomEthnicityModal(true);
                }}
                className="px-3 py-2 rounded-lg border bg-white border-neutral-300"
              >
                <Body className="text-sm text-neutral-700">Other</Body>
              </StyledTouchableOpacity>
            </StyledView>

            {/* IDENTITY & ATTRACTION */}
            <SectionHeader title="IDENTITY & ATTRACTION" />
            <Body className="text-xs font-medium text-neutral-700 mb-2">
              Pronouns <StyledText style={{ color: '#EF4444' }}>*</StyledText> (Select up to {MAX_PRONOUNS})
            </Body>
            <Body className="text-primary-500 text-xs font-semibold mb-2">
              {(profile.pronounsList?.length || 0)}/{MAX_PRONOUNS} selected
            </Body>
            <StyledView className="flex-row flex-wrap gap-1.5 mb-4">
              {PRONOUN_OPTIONS.map((pronoun) => {
                const isSelected = profile.pronounsList?.includes(pronoun);
                return (
                  <StyledTouchableOpacity
                    key={pronoun}
                    activeOpacity={1}
                    delayPressIn={0}
                    onPress={() => {
                      lightHaptic();
                      const currentPronouns = profile.pronounsList || [];
                      let updatedPronouns: string[];

                      if (isSelected) {
                        // Remove pronoun
                        updatedPronouns = currentPronouns.filter(p => p !== pronoun);
                      } else {
                        // Add pronoun if under limit
                        if (currentPronouns.length >= MAX_PRONOUNS) {
                          Alert.alert('Limit Reached', `You can only select up to ${MAX_PRONOUNS} pronouns`);
                          return;
                        }
                        updatedPronouns = [...currentPronouns, pronoun];
                      }

                      updateProfile({ pronounsList: updatedPronouns });
                    }}
                    className={`px-2.5 py-1.5 rounded-lg border ${
                      isSelected
                        ? 'bg-primary-500 border-primary-500'
                        : 'bg-white border-neutral-300'
                    }`}
                  >
                    <Body
                      className={`text-xs ${
                        isSelected
                          ? 'text-white font-medium'
                          : 'text-neutral-700'
                      }`}
                    >
                      {pronoun}
                    </Body>
                  </StyledTouchableOpacity>
                );
              })}
            </StyledView>

            {/* Gender Identity */}
            <Body className="text-xs font-medium text-neutral-700 mb-2 mt-4">
              Gender <StyledText style={{ color: '#EF4444' }}>*</StyledText> (Select all that apply)
            </Body>
            <StyledView className="flex-row flex-wrap gap-2 mb-4">
              {/* Predefined gender options */}
              {GENDER_OPTIONS.map((option) => {
                const isSelected = profile.gender?.includes(option.value);
                return (
                  <StyledTouchableOpacity
                    key={option.value}
                    activeOpacity={1}
                    delayPressIn={0}
                    onPress={() => {
                      lightHaptic();
                      const currentGenders = profile.gender || [];
                      let updatedGenders: string[];

                      if (isSelected) {
                        // Remove gender
                        updatedGenders = currentGenders.filter(g => g !== option.value);
                      } else {
                        // Add gender
                        updatedGenders = [...currentGenders, option.value];
                      }

                      updateProfile({ gender: updatedGenders });
                    }}
                    className={`px-3 py-2 rounded-lg border ${
                      isSelected
                        ? 'bg-primary-500 border-primary-500'
                        : 'bg-white border-neutral-300'
                    }`}
                  >
                    <Body
                      className={`text-sm ${
                        isSelected
                          ? 'text-white font-medium'
                          : 'text-neutral-700'
                      }`}
                    >
                      {option.label}
                    </Body>
                  </StyledTouchableOpacity>
                );
              })}

              {/* Custom gender value chip (from customMyGender field) */}
              {profile.customMyGender && (
                <StyledTouchableOpacity
                  onPress={() => {
                    setProfile({
                      ...profile,
                      customMyGender: '',
                    });
                    mediumHaptic();
                  }}
                  className="px-3 py-2 rounded-lg border bg-primary-500 border-primary-500"
                >
                  <Body className="text-sm text-white font-medium">{profile.customMyGender}</Body>
                </StyledTouchableOpacity>
              )}

              {/* "Other" Button */}
              <StyledTouchableOpacity
                onPress={() => {
                  lightHaptic();
                  setShowCustomGenderModal(true);
                }}
                className="px-3 py-2 rounded-lg border bg-white border-neutral-300"
              >
                <Body className="text-sm text-neutral-700">Other</Body>
              </StyledTouchableOpacity>
            </StyledView>

            {/* BACKGROUND & BELIEFS */}
            <SectionHeader title="BACKGROUND & BELIEFS" />
            {/* Religion */}
            <StyledView className="flex-row items-center justify-between mb-2">
              <Body className="text-xs font-medium text-neutral-700">Religion <StyledText style={{ color: '#EF4444' }}>*</StyledText></Body>
              <StyledTouchableOpacity
                onPress={() => toggleVisibility('religion')}
                className="flex-row items-center"
              >
                <Body className="text-xs text-neutral-500 mr-2">Show on profile</Body>
                <StyledView className={`w-5 h-5 rounded border ${
                  sectionVisibility.religion ? 'bg-purple-500 border-purple-500' : 'border-neutral-300'
                } items-center justify-center`}>
                  {sectionVisibility.religion && (
                    <Ionicons name="checkmark" size={14} color="white" />
                  )}
                </StyledView>
              </StyledTouchableOpacity>
            </StyledView>
            <StyledView className="flex-row flex-wrap gap-2 mb-4">
              {RELIGION_OPTIONS.map((option) => (
                <StyledTouchableOpacity
                  key={option}
                  activeOpacity={1}
                  delayPressIn={0}
                  onPress={() => {
                    lightHaptic();
                    // Toggle behavior: deselect if already selected
                    updateProfile({ religion: profile.religion === option ? '' : option });
                  }}
                  className={`px-3 py-2 rounded-lg border ${
                    profile.religion === option
                      ? 'bg-primary-500 border-primary-500'
                      : 'bg-white border-neutral-300'
                  }`}
                >
                  <Body
                    className={`text-sm ${
                      profile.religion === option
                        ? 'text-white font-medium'
                        : 'text-neutral-700'
                    }`}
                  >
                    {option}
                  </Body>
                </StyledTouchableOpacity>
              ))}

              {/* "Other" Button */}
              <StyledTouchableOpacity
                onPress={() => {
                  lightHaptic();
                  setShowCustomReligionModal(true);
                }}
                className="px-3 py-2 rounded-lg border bg-white border-neutral-300"
              >
                <Body className="text-sm text-neutral-700">Other</Body>
              </StyledTouchableOpacity>
            </StyledView>

            {/* Political Leaning */}
            <StyledView className="flex-row items-center justify-between mb-2">
              <Body className="text-xs font-medium text-neutral-700">Political Leaning <StyledText style={{ color: '#EF4444' }}>*</StyledText></Body>
              <StyledTouchableOpacity
                onPress={() => toggleVisibility('politics')}
                className="flex-row items-center"
              >
                <Body className="text-xs text-neutral-500 mr-2">Show on profile</Body>
                <StyledView className={`w-5 h-5 rounded border ${
                  sectionVisibility.politics ? 'bg-purple-500 border-purple-500' : 'border-neutral-300'
                } items-center justify-center`}>
                  {sectionVisibility.politics && (
                    <Ionicons name="checkmark" size={14} color="white" />
                  )}
                </StyledView>
              </StyledTouchableOpacity>
            </StyledView>
            <StyledView className="flex-row flex-wrap gap-2">
              {POLITICAL_OPTIONS.map((option) => (
                <StyledTouchableOpacity
                  key={option.value}
                  activeOpacity={1}
                  delayPressIn={0}
                  onPress={() => {
                    lightHaptic();
                    // Toggle behavior: deselect if already selected
                    updateProfile({ politicalLeaning: profile.politicalLeaning === option.value ? '' : option.value });
                  }}
                  className={`px-3 py-2 rounded-lg border ${
                    profile.politicalLeaning === option.value
                      ? 'bg-primary-500 border-primary-500'
                      : 'bg-white border-neutral-300'
                  }`}
                >
                  <Body
                    className={`text-sm ${
                      profile.politicalLeaning === option.value
                        ? 'text-white font-medium'
                        : 'text-neutral-700'
                    }`}
                  >
                    {option.label}
                  </Body>
                </StyledTouchableOpacity>
              ))}

              {/* Custom political leaning value chip (when 'other' is selected) */}
              {profile.politicalLeaning === 'other' && profile.customPoliticalLeaning && (
                  <StyledTouchableOpacity
                    onPress={() => {
                      updateProfile({ politicalLeaning: '', customPoliticalLeaning: '' });
                      mediumHaptic();
                    }}
                    className="px-3 py-2 rounded-lg border bg-primary-500 border-primary-500"
                  >
                    <Body className="text-sm text-white font-medium">
                      {profile.customPoliticalLeaning}
                    </Body>
                  </StyledTouchableOpacity>
                )}

              {/* "Other" Button */}
              <StyledTouchableOpacity
                onPress={() => {
                  lightHaptic();
                  setShowCustomPoliticalModal(true);
                }}
                className="px-3 py-2 rounded-lg border bg-white border-neutral-300"
              >
                <Body className="text-sm text-neutral-700">Other</Body>
              </StyledTouchableOpacity>
            </StyledView>
          </Card>

          {/* Professional & Education */}
          <Card className="mb-6">
            <H3 className="mb-4">Professional & Education</H3>

            <StyledView className="mb-4">
              <StyledView className="flex-row items-center justify-between mb-2">
                <Body className="text-xs font-medium text-neutral-700">Occupation <StyledText style={{ color: '#EF4444' }}>*</StyledText></Body>
                <StyledTouchableOpacity
                  onPress={() => toggleVisibility('occupation')}
                  className="flex-row items-center"
                >
                  <Body className="text-xs text-neutral-500 mr-2">Show on profile</Body>
                  <StyledView className={`w-5 h-5 rounded border ${
                    sectionVisibility.occupation ? 'bg-purple-500 border-purple-500' : 'border-neutral-300'
                  } items-center justify-center`}>
                    {sectionVisibility.occupation && (
                      <Ionicons name="checkmark" size={14} color="white" />
                    )}
                  </StyledView>
                </StyledTouchableOpacity>
              </StyledView>
              <Input
                value={profile.currentJob || ''}
                onChangeText={(text) => updateProfile({ currentJob: text })}
                placeholder="What do you do?"
              />
            </StyledView>
            <StyledView className="mb-4">
              <StyledView className="flex-row items-center justify-between mb-2">
                <Body className="text-xs font-medium text-neutral-700">
                  Company/Position <Body className="text-[11px] text-neutral-400">(optional)</Body>
                </Body>
                <StyledTouchableOpacity
                  onPress={() => toggleVisibility('company')}
                  className="flex-row items-center"
                >
                  <Body className="text-xs text-neutral-500 mr-2">Show on profile</Body>
                  <StyledView className={`w-5 h-5 rounded border ${
                    sectionVisibility.company ? 'bg-purple-500 border-purple-500' : 'border-neutral-300'
                  } items-center justify-center`}>
                    {sectionVisibility.company && (
                      <Ionicons name="checkmark" size={14} color="white" />
                    )}
                  </StyledView>
                </StyledTouchableOpacity>
              </StyledView>
              <Input
                value={profile.companyPosition || ''}
                onChangeText={(text) => updateProfile({ companyPosition: text })}
                placeholder="Where do you work?"
              />
            </StyledView>

            {/* Education Level */}
            <StyledView className="flex-row items-center justify-between mb-2">
              <Body className="text-xs font-medium text-neutral-700">
                Education Level <Body className="text-[11px] text-neutral-400">(optional)</Body>
              </Body>
              <StyledTouchableOpacity
                onPress={() => toggleVisibility('educationLevel')}
                className="flex-row items-center"
              >
                <Body className="text-xs text-neutral-500 mr-2">Show on profile</Body>
                <StyledView className={`w-5 h-5 rounded border ${
                  sectionVisibility.educationLevel ? 'bg-purple-500 border-purple-500' : 'border-neutral-300'
                } items-center justify-center`}>
                  {sectionVisibility.educationLevel && (
                    <Ionicons name="checkmark" size={14} color="white" />
                  )}
                </StyledView>
              </StyledTouchableOpacity>
            </StyledView>
            <StyledView className="flex-row flex-wrap gap-2 mb-4">
              {EDUCATION_LEVELS.map((option) => (
                <StyledTouchableOpacity
                  key={option.value}
                  activeOpacity={1}
                  delayPressIn={0}
                  onPress={() => {
                    lightHaptic();
                    if (profile.educationLevel === option.value) {
                      // Deselect if already selected
                      updateProfile({ educationLevel: '' });
                    } else {
                      // Select the option
                      updateProfile({ educationLevel: option.value });
                    }
                  }}
                  className={`px-3 py-2 rounded-lg border ${
                    profile.educationLevel === option.value
                      ? 'bg-primary-500 border-primary-500'
                      : 'bg-white border-neutral-300'
                  }`}
                >
                  <Body
                    className={`text-sm ${
                      profile.educationLevel === option.value
                        ? 'text-white font-medium'
                        : 'text-neutral-700'
                    }`}
                  >
                    {option.label}
                  </Body>
                </StyledTouchableOpacity>
              ))}

              {/* Custom education value chip (when 'other' is selected) */}
              {profile.educationLevel === 'other' && profile.customEducationLevel && (
                  <StyledTouchableOpacity
                    onPress={() => {
                      updateProfile({ educationLevel: '', customEducationLevel: '' });
                      mediumHaptic();
                    }}
                    className="px-3 py-2 rounded-lg border bg-primary-500 border-primary-500"
                  >
                    <Body className="text-sm text-white font-medium">
                      {profile.customEducationLevel}
                    </Body>
                  </StyledTouchableOpacity>
                )}

              {/* "Other" Button */}
              <StyledTouchableOpacity
                onPress={() => {
                  lightHaptic();
                  setShowCustomEducationModal(true);
                }}
                className="px-3 py-2 rounded-lg border bg-white border-neutral-300"
              >
                <Body className="text-sm text-neutral-700">Other</Body>
              </StyledTouchableOpacity>
            </StyledView>

            <StyledView className="mb-4">
              <StyledView className="flex-row items-center justify-between mb-2">
                <Body className="text-xs font-medium text-neutral-700">
                  School / University <Body className="text-[11px] text-neutral-400">(optional)</Body>
                </Body>
                <StyledTouchableOpacity
                  onPress={() => toggleVisibility('school')}
                  className="flex-row items-center"
                >
                  <Body className="text-xs text-neutral-500 mr-2">Show on profile</Body>
                  <StyledView className={`w-5 h-5 rounded border ${
                    sectionVisibility.school ? 'bg-purple-500 border-purple-500' : 'border-neutral-300'
                  } items-center justify-center`}>
                    {sectionVisibility.school && (
                      <Ionicons name="checkmark" size={14} color="white" />
                    )}
                  </StyledView>
                </StyledTouchableOpacity>
              </StyledView>
              <Input
                value={profile.school || ''}
                onChangeText={(text) => updateProfile({ school: text })}
                placeholder="e.g., Harvard Business School"
              />
            </StyledView>
          </Card>

          {/* Location */}
          <Card className="mb-6">
            <H3 className="mb-4">Location</H3>

            <Input
              label="Current Location"
              required
              value={profile.location || ''}
              onChangeText={(text) => updateProfile({ location: text })}
              placeholder="Where do you live?"
              containerClassName="mb-4"
            />
            <StyledView>
              <StyledView className="flex-row items-center justify-between mb-2">
                <Body className="text-xs font-medium text-neutral-700">
                  Hometown <Body className="text-[11px] text-neutral-400">(optional)</Body>
                </Body>
                <StyledTouchableOpacity
                  onPress={() => toggleVisibility('hometown')}
                  className="flex-row items-center"
                >
                  <Body className="text-xs text-neutral-500 mr-2">Show on profile</Body>
                  <StyledView className={`w-5 h-5 rounded border ${
                    sectionVisibility.hometown ? 'bg-purple-500 border-purple-500' : 'border-neutral-300'
                  } items-center justify-center`}>
                    {sectionVisibility.hometown && (
                      <Ionicons name="checkmark" size={14} color="white" />
                    )}
                  </StyledView>
                </StyledTouchableOpacity>
              </StyledView>
              <Input
                value={profile.hometown || ''}
                onChangeText={(text) => updateProfile({ hometown: text })}
                placeholder="Where are you from?"
              />
            </StyledView>
          </Card>

          {/* Family & Children */}
          <Card className="mb-6">
            <H3 className="mb-4">Family & Children</H3>

            {/* Do you have children? */}
            <Body className="text-xs font-medium text-neutral-700 mb-2">
              Do you have children? <StyledText style={{ color: '#EF4444' }}>*</StyledText>
            </Body>
            <StyledView className="flex-row flex-wrap gap-2 mb-4">
              {CHILDREN_STATUS_OPTIONS.map((option) => (
                <StyledTouchableOpacity
                  key={option.value}
                  activeOpacity={1}
                  delayPressIn={0}
                  onPress={() => {
                    lightHaptic();
                    updateProfile({ hasChildren: option.value });
                  }}
                  className={`px-3 py-2 rounded-lg border ${
                    profile.hasChildren === option.value
                      ? 'bg-primary-500 border-primary-500'
                      : 'bg-white border-neutral-300'
                  }`}
                >
                  <Body
                    className={`text-sm ${
                      profile.hasChildren === option.value
                        ? 'text-white font-medium'
                        : 'text-neutral-700'
                    }`}
                  >
                    {option.label}
                  </Body>
                </StyledTouchableOpacity>
              ))}
            </StyledView>
            {/* Family Plans */}
            <Body className="text-xs font-medium text-neutral-700 mb-2">
              Family Plans <StyledText style={{ color: '#EF4444' }}>*</StyledText>
            </Body>
            <StyledView className="flex-row flex-wrap gap-2 mb-4">
              {FAMILY_PLANS_OPTIONS.map((option) => (
                <StyledTouchableOpacity
                  key={option.value}
                  activeOpacity={1}
                  delayPressIn={0}
                  onPress={() => {
                    lightHaptic();
                    updateProfile({ familyPlans: option.value });
                  }}
                  className={`px-3 py-2 rounded-lg border ${
                    profile.familyPlans === option.value
                      ? 'bg-primary-500 border-primary-500'
                      : 'bg-white border-neutral-300'
                  }`}
                >
                  <Body
                    className={`text-sm ${
                      profile.familyPlans === option.value
                        ? 'text-white font-medium'
                        : 'text-neutral-700'
                    }`}
                  >
                    {option.label}
                  </Body>
                </StyledTouchableOpacity>
              ))}
            </StyledView>

          </Card>

          {/* Lifestyle Habits - Extracted to separate component for performance */}
          <LifestyleSection
            drinkingFrequency={profile.drinkingFrequency}
            cannabisFrequency={profile.cannabisFrequency}
            tobaccoFrequency={profile.tobaccoFrequency}
            otherDrugsFrequency={profile.otherDrugsFrequency}
            onUpdateDrinking={handleUpdateDrinking}
            onUpdateCannabis={handleUpdateCannabis}
            onUpdateTobacco={handleUpdateTobacco}
            onUpdateOtherDrugs={handleUpdateOtherDrugs}
          />

          {/* Values - Extracted to separate component for performance */}
          <ValuesSection
            values={profile.values}
            onToggleValue={handleToggleValue}
            onShowCustomValueModal={handleShowCustomValueModal}
          />

          {/* Interests - Extracted to separate component for performance */}
          <InterestsSection
            interests={profile.interests}
            onToggleInterest={handleToggleInterest}
            onShowCustomInterestModal={handleShowCustomInterestModal}
          />
        </StyledView>
      </StyledScrollView>

      {/* Profile Visibility Settings Modal */}
      <Modal
        visible={showVisibilityModal}
        animationType="none"
        transparent
        onRequestClose={() => setShowVisibilityModal(false)}
      >
        <StyledAnimatedView
          className="flex-1 bg-black/50 justify-end"
          style={{
            opacity: visibilityModalAnim,
          }}
        >
          <StyledAnimatedView
            className="bg-white rounded-t-3xl max-h-[85%]"
            style={{
              transform: [{
                translateY: visibilityModalAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [600, 0],
                }),
              }],
            }}
          >
            {/* Header - Outside scrollable area, fixed at top */}
            <StyledView className="px-6 pt-6 pb-4 border-b border-neutral-100 bg-white rounded-t-3xl">
              <StyledView className="flex-row items-center justify-between mb-2">
                <StyledView className="flex-row items-center">
                  <Ionicons name="eye-off" size={24} color="#475467" />
                  <H3 className="ml-2">Profile Visibility</H3>
                </StyledView>
                <StyledTouchableOpacity
                  onPress={() => setShowVisibilityModal(false)}
                  accessibilityLabel="Close"
                  accessibilityRole="button"
                >
                  <Ionicons name="close" size={24} color="#101828" />
                </StyledTouchableOpacity>
              </StyledView>

              <Body className="text-neutral-600 text-sm">
                Choose which sections of your profile are visible to others
              </Body>
            </StyledView>

            {/* Scrollable Content */}
            <StyledScrollView className="px-6 py-4" showsVerticalScrollIndicator={false}>
                {/* Info Card */}
                <Card className="bg-blue-50 border border-blue-200 mb-4">
                  <StyledView className="flex-row items-start">
                    <Ionicons name="information-circle" size={20} color="#437FFF" />
                    <Body className="flex-1 text-blue-900 text-sm ml-2">
                      Control visibility of sensitive profile information. Hidden sections won't appear on your public profile but may still be used for matching.
                    </Body>
                  </StyledView>
                </Card>

                {/* Section Toggles - Only 4 sensitive sections */}
                <StyledView className="space-y-3">
                  {/* Religion */}
                  <StyledView className="flex-row items-center justify-between py-3 border-b border-neutral-100">
                    <StyledView className="flex-1">
                      <Body className="text-neutral-900 font-semibold mb-1">Religion</Body>
                      <Body className="text-neutral-600 text-sm">Your religious beliefs</Body>
                    </StyledView>
                    <Switch
                      value={sectionVisibility.religion}
                      onValueChange={(value) => {
                        mediumHaptic();
                        setSectionVisibility({...sectionVisibility, religion: value});
                      }}
                      trackColor={{ false: '#D0D5DD', true: '#B4D4FF' }}
                      thumbColor={sectionVisibility.religion ? '#437FFF' : '#F4F4F5'}
                    />
                  </StyledView>

                  {/* Politics */}
                  <StyledView className="flex-row items-center justify-between py-3 border-b border-neutral-100">
                    <StyledView className="flex-1">
                      <Body className="text-neutral-900 font-semibold mb-1">Politics</Body>
                      <Body className="text-neutral-600 text-sm">Your political views</Body>
                    </StyledView>
                    <Switch
                      value={sectionVisibility.politics}
                      onValueChange={(value) => {
                        mediumHaptic();
                        setSectionVisibility({...sectionVisibility, politics: value});
                      }}
                      trackColor={{ false: '#D0D5DD', true: '#B4D4FF' }}
                      thumbColor={sectionVisibility.politics ? '#437FFF' : '#F4F4F5'}
                    />
                  </StyledView>

                  {/* Family & Relationships */}
                  <StyledView className="flex-row items-center justify-between py-3 border-b border-neutral-100">
                    <StyledView className="flex-1">
                      <Body className="text-neutral-900 font-semibold mb-1">Family & Relationships</Body>
                      <Body className="text-neutral-600 text-sm">Children status, family plans</Body>
                    </StyledView>
                    <Switch
                      value={sectionVisibility.family}
                      onValueChange={(value) => {
                        mediumHaptic();
                        setSectionVisibility({...sectionVisibility, family: value});
                      }}
                      trackColor={{ false: '#D0D5DD', true: '#B4D4FF' }}
                      thumbColor={sectionVisibility.family ? '#437FFF' : '#F4F4F5'}
                    />
                  </StyledView>

                  {/* Lifestyle & Habits */}
                  <StyledView className="flex-row items-center justify-between py-3">
                    <StyledView className="flex-1">
                      <Body className="text-neutral-900 font-semibold mb-1">Lifestyle & Habits</Body>
                      <Body className="text-neutral-600 text-sm">Drinking, cannabis, tobacco use</Body>
                    </StyledView>
                    <Switch
                      value={sectionVisibility.lifestyle}
                      onValueChange={(value) => {
                        mediumHaptic();
                        setSectionVisibility({...sectionVisibility, lifestyle: value});
                      }}
                      trackColor={{ false: '#D0D5DD', true: '#B4D4FF' }}
                      thumbColor={sectionVisibility.lifestyle ? '#437FFF' : '#F4F4F5'}
                    />
                  </StyledView>
                </StyledView>
            </StyledScrollView>

            {/* Footer - Fixed at bottom */}
            <StyledView className="px-6 py-4 border-t border-neutral-100 bg-white">
              <Button
                onPress={() => setShowVisibilityModal(false)}
                variant="primary"
                fullWidth
              >
                Done
              </Button>
            </StyledView>
          </StyledAnimatedView>
        </StyledAnimatedView>
      </Modal>

      {/* Gender "Other" Custom Input Modal */}
      <Modal
        visible={showCustomGenderModal}
        animationType="none"
        transparent
        onRequestClose={() => setShowCustomGenderModal(false)}
      >
        <StyledAnimatedView
          className="flex-1 bg-black/50 justify-start items-center px-6 pt-24"
          style={{
            opacity: customGenderModalAnim,
          }}
        >
          <StyledTouchableOpacity
            activeOpacity={1}
            onPress={() => {
              Keyboard.dismiss();
              setShowCustomGenderModal(false);
              setCustomGenderValue('');
            }}
            className="absolute inset-0"
          />

          <StyledAnimatedView
            className="bg-white rounded-2xl w-full max-w-md"
            style={{
              transform: [{
                scale: customGenderModalAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.9, 1],
                }),
              }],
            }}
          >
            {/* Header */}
            <StyledView className="px-6 pt-6 pb-4 border-b border-neutral-100">
              <H3 className="mb-2">Add Custom Gender</H3>
              <Body className="text-neutral-600 text-sm">
                Enter your gender identity
              </Body>
            </StyledView>

            {/* Input Field */}
            <StyledView className="px-6 py-5">
              <StyledTextInput
                value={customGenderValue}
                onChangeText={setCustomGenderValue}
                placeholder="Type your gender identity"
                className="bg-neutral-50 border border-neutral-200 rounded-lg px-4 py-3 text-base text-neutral-900"
                placeholderTextColor="#9CA3AF"
                autoFocus
                returnKeyType="done"
                onSubmitEditing={() => {
                  if (customGenderValue.trim()) {
                    setProfile({
                      ...profile!,
                      customMyGender: customGenderValue.trim(),
                    });
                    mediumHaptic();
                    setCustomGenderValue('');
                    setShowCustomGenderModal(false);
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
                  setShowCustomGenderModal(false);
                  setCustomGenderValue('');
                  Keyboard.dismiss();
                }}
                className="flex-1 bg-neutral-100 rounded-lg py-3 items-center"
              >
                <Body className="text-neutral-700 font-semibold">Cancel</Body>
              </StyledTouchableOpacity>

              <StyledTouchableOpacity
                onPress={() => {
                  if (customGenderValue.trim()) {
                    setProfile({
                      ...profile!,
                      customMyGender: customGenderValue.trim(),
                    });
                    mediumHaptic();
                    setCustomGenderValue('');
                    setShowCustomGenderModal(false);
                    Keyboard.dismiss();
                  }
                }}
                className={`flex-1 rounded-lg py-3 items-center ${
                  customGenderValue.trim()
                    ? 'bg-primary-500'
                    : 'bg-neutral-200'
                }`}
                disabled={!customGenderValue.trim()}
              >
                <Body className={`font-semibold ${
                  customGenderValue.trim()
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

      {/* Ethnicity "Other" Custom Input Modal */}
      <Modal
        visible={showCustomEthnicityModal}
        animationType="none"
        transparent
        onRequestClose={() => setShowCustomEthnicityModal(false)}
      >
        <StyledAnimatedView
          className="flex-1 bg-black/50 justify-start items-center px-6 pt-24"
          style={{
            opacity: customEthnicityModalAnim,
          }}
        >
          <StyledTouchableOpacity
            activeOpacity={1}
            onPress={() => {
              Keyboard.dismiss();
              setShowCustomEthnicityModal(false);
              setCustomEthnicityValue('');
            }}
            className="absolute inset-0"
          />

          <StyledAnimatedView
            className="bg-white rounded-2xl w-full max-w-md"
            style={{
              transform: [{
                scale: customEthnicityModalAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.9, 1],
                }),
              }],
            }}
          >
            {/* Header */}
            <StyledView className="px-6 pt-6 pb-4 border-b border-neutral-100">
              <H3 className="mb-2">Add Custom Ethnicity</H3>
              <Body className="text-neutral-600 text-sm">
                Enter your ethnicity
              </Body>
            </StyledView>

            {/* Input Field */}
            <StyledView className="px-6 py-5">
              <StyledTextInput
                value={customEthnicityValue}
                onChangeText={setCustomEthnicityValue}
                placeholder="Type your ethnicity"
                className="bg-neutral-50 border border-neutral-200 rounded-lg px-4 py-3 text-base text-neutral-900"
                placeholderTextColor="#9CA3AF"
                autoFocus
                returnKeyType="done"
                onSubmitEditing={() => {
                  if (customEthnicityValue.trim()) {
                    const updatedEthnicities = [...ethnicityArray, customEthnicityValue.trim()];
                    updateProfile({
                      ethnicity: updatedEthnicities.filter(e => e.trim() !== '').join(' / '),
                    });
                    mediumHaptic();
                    setCustomEthnicityValue('');
                    setShowCustomEthnicityModal(false);
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
                  setShowCustomEthnicityModal(false);
                  setCustomEthnicityValue('');
                  Keyboard.dismiss();
                }}
                className="flex-1 bg-neutral-100 rounded-lg py-3 items-center"
              >
                <Body className="text-neutral-700 font-semibold">Cancel</Body>
              </StyledTouchableOpacity>

              <StyledTouchableOpacity
                onPress={() => {
                  if (customEthnicityValue.trim()) {
                    const updatedEthnicities = [...ethnicityArray, customEthnicityValue.trim()];
                    updateProfile({
                      ethnicity: updatedEthnicities.filter(e => e.trim() !== '').join(' / '),
                    });
                    mediumHaptic();
                    setCustomEthnicityValue('');
                    setShowCustomEthnicityModal(false);
                    Keyboard.dismiss();
                  }
                }}
                className={`flex-1 rounded-lg py-3 items-center ${
                  customEthnicityValue.trim()
                    ? 'bg-primary-500'
                    : 'bg-neutral-200'
                }`}
                disabled={!customEthnicityValue.trim()}
              >
                <Body className={`font-semibold ${
                  customEthnicityValue.trim()
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

      {/* Education Level "Other" Custom Input Modal */}
      <Modal
        visible={showCustomEducationModal}
        animationType="none"
        transparent
        onRequestClose={() => setShowCustomEducationModal(false)}
      >
        <StyledAnimatedView
          className="flex-1 bg-black/50 justify-start items-center px-6 pt-24"
          style={{
            opacity: customEducationModalAnim,
          }}
        >
          <StyledTouchableOpacity
            activeOpacity={1}
            onPress={() => {
              Keyboard.dismiss();
              setShowCustomEducationModal(false);
              setCustomEducationValue('');
            }}
            className="absolute inset-0"
          />

          <StyledAnimatedView
            className="bg-white rounded-2xl w-full max-w-md"
            style={{
              transform: [{
                scale: customEducationModalAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.9, 1],
                }),
              }],
            }}
          >
            {/* Header */}
            <StyledView className="px-6 pt-6 pb-4 border-b border-neutral-100">
              <H3 className="mb-2">Add Custom Education Level</H3>
              <Body className="text-neutral-600 text-sm">
                Enter your education level
              </Body>
            </StyledView>

            {/* Input Field */}
            <StyledView className="px-6 py-5">
              <StyledTextInput
                value={customEducationValue}
                onChangeText={setCustomEducationValue}
                placeholder="Type your education level"
                className="bg-neutral-50 border border-neutral-200 rounded-lg px-4 py-3 text-base text-neutral-900"
                placeholderTextColor="#9CA3AF"
                autoFocus
                returnKeyType="done"
                onSubmitEditing={() => {
                  if (customEducationValue.trim()) {
                    setProfile({
                      ...profile!,
                      educationLevel: 'other',
                      customEducationLevel: customEducationValue.trim(),
                    });
                    mediumHaptic();
                    setCustomEducationValue('');
                    setShowCustomEducationModal(false);
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
                  setShowCustomEducationModal(false);
                  setCustomEducationValue('');
                  Keyboard.dismiss();
                }}
                className="flex-1 bg-neutral-100 rounded-lg py-3 items-center"
              >
                <Body className="text-neutral-700 font-semibold">Cancel</Body>
              </StyledTouchableOpacity>

              <StyledTouchableOpacity
                onPress={() => {
                  if (customEducationValue.trim()) {
                    setProfile({
                      ...profile!,
                      educationLevel: 'other',
                      customEducationLevel: customEducationValue.trim(),
                    });
                    mediumHaptic();
                    setCustomEducationValue('');
                    setShowCustomEducationModal(false);
                    Keyboard.dismiss();
                  }
                }}
                className={`flex-1 rounded-lg py-3 items-center ${
                  customEducationValue.trim()
                    ? 'bg-primary-500'
                    : 'bg-neutral-200'
                }`}
                disabled={!customEducationValue.trim()}
              >
                <Body className={`font-semibold ${
                  customEducationValue.trim()
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

      {/* Political Leaning "Other" Custom Input Modal */}
      <Modal
        visible={showCustomPoliticalModal}
        animationType="none"
        transparent
        onRequestClose={() => setShowCustomPoliticalModal(false)}
      >
        <StyledAnimatedView
          className="flex-1 bg-black/50 justify-start items-center px-6 pt-24"
          style={{
            opacity: customPoliticalModalAnim,
          }}
        >
          <StyledTouchableOpacity
            activeOpacity={1}
            onPress={() => {
              Keyboard.dismiss();
              setShowCustomPoliticalModal(false);
              setCustomPoliticalValue('');
            }}
            className="absolute inset-0"
          />

          <StyledAnimatedView
            className="bg-white rounded-2xl w-full max-w-md"
            style={{
              transform: [{
                scale: customPoliticalModalAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.9, 1],
                }),
              }],
            }}
          >
            {/* Header */}
            <StyledView className="px-6 pt-6 pb-4 border-b border-neutral-100">
              <H3 className="mb-2">Add Custom Political Leaning</H3>
              <Body className="text-neutral-600 text-sm">
                Enter your political leaning
              </Body>
            </StyledView>

            {/* Input Field */}
            <StyledView className="px-6 py-5">
              <StyledTextInput
                value={customPoliticalValue}
                onChangeText={setCustomPoliticalValue}
                placeholder="Type your political leaning"
                className="bg-neutral-50 border border-neutral-200 rounded-lg px-4 py-3 text-base text-neutral-900"
                placeholderTextColor="#9CA3AF"
                autoFocus
                returnKeyType="done"
                onSubmitEditing={() => {
                  if (customPoliticalValue.trim()) {
                    // Check if input matches existing option (case-insensitive)
                    const matchingOption = POLITICAL_OPTIONS.find(
                      opt => opt.label.toLowerCase() === customPoliticalValue.trim().toLowerCase()
                    );

                    if (matchingOption) {
                      // Select the existing option
                      setProfile({
                        ...profile!,
                        politicalLeaning: matchingOption.value,
                        customPoliticalLeaning: '',
                      });
                    } else {
                      // Create custom value
                      setProfile({
                        ...profile!,
                        politicalLeaning: 'other',
                        customPoliticalLeaning: customPoliticalValue.trim(),
                      });
                    }
                    mediumHaptic();
                    setCustomPoliticalValue('');
                    setShowCustomPoliticalModal(false);
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
                  setShowCustomPoliticalModal(false);
                  setCustomPoliticalValue('');
                  Keyboard.dismiss();
                }}
                className="flex-1 bg-neutral-100 rounded-lg py-3 items-center"
              >
                <Body className="text-neutral-700 font-semibold">Cancel</Body>
              </StyledTouchableOpacity>

              <StyledTouchableOpacity
                onPress={() => {
                  if (customPoliticalValue.trim()) {
                    // Check if input matches existing option (case-insensitive)
                    const matchingOption = POLITICAL_OPTIONS.find(
                      opt => opt.label.toLowerCase() === customPoliticalValue.trim().toLowerCase()
                    );

                    if (matchingOption) {
                      // Select the existing option
                      setProfile({
                        ...profile!,
                        politicalLeaning: matchingOption.value,
                        customPoliticalLeaning: '',
                      });
                    } else {
                      // Create custom value
                      setProfile({
                        ...profile!,
                        politicalLeaning: 'other',
                        customPoliticalLeaning: customPoliticalValue.trim(),
                      });
                    }
                    mediumHaptic();
                    setCustomPoliticalValue('');
                    setShowCustomPoliticalModal(false);
                    Keyboard.dismiss();
                  }
                }}
                className={`flex-1 rounded-lg py-3 items-center ${
                  customPoliticalValue.trim()
                    ? 'bg-primary-500'
                    : 'bg-neutral-200'
                }`}
                disabled={!customPoliticalValue.trim()}
              >
                <Body className={`font-semibold ${
                  customPoliticalValue.trim()
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

      {/* Religion "Other" Custom Input Modal */}
      <Modal
        visible={showCustomReligionModal}
        animationType="none"
        transparent
        onRequestClose={() => setShowCustomReligionModal(false)}
      >
        <StyledAnimatedView
          className="flex-1 bg-black/50 justify-start items-center px-6 pt-24"
          style={{
            opacity: customReligionModalAnim,
          }}
        >
          <StyledTouchableOpacity
            activeOpacity={1}
            onPress={() => {
              Keyboard.dismiss();
              setShowCustomReligionModal(false);
              setCustomReligionValue('');
            }}
            className="absolute inset-0"
          />

          <StyledAnimatedView
            className="bg-white rounded-2xl w-full max-w-md"
            style={{
              transform: [{
                scale: customReligionModalAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.9, 1],
                }),
              }],
            }}
          >
            {/* Header */}
            <StyledView className="px-6 pt-6 pb-4 border-b border-neutral-100">
              <H3 className="mb-2">Add Custom Religion</H3>
              <Body className="text-neutral-600 text-sm">
                Enter your religious belief
              </Body>
            </StyledView>

            {/* Input Field */}
            <StyledView className="px-6 py-5">
              <StyledTextInput
                value={customReligionValue}
                onChangeText={setCustomReligionValue}
                placeholder="Type your religion"
                className="bg-neutral-50 border border-neutral-200 rounded-lg px-4 py-3 text-base text-neutral-900"
                placeholderTextColor="#9CA3AF"
                autoFocus
                returnKeyType="done"
                onSubmitEditing={() => {
                  if (customReligionValue.trim()) {
                    // Check if input matches existing option (case-insensitive)
                    const matchingOption = RELIGION_OPTIONS.find(
                      opt => opt.toLowerCase() === customReligionValue.trim().toLowerCase()
                    );

                    setProfile({
                      ...profile!,
                      religion: matchingOption || customReligionValue.trim(),
                    });
                    mediumHaptic();
                    setCustomReligionValue('');
                    setShowCustomReligionModal(false);
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
                  setShowCustomReligionModal(false);
                  setCustomReligionValue('');
                  Keyboard.dismiss();
                }}
                className="flex-1 bg-neutral-100 rounded-lg py-3 items-center"
              >
                <Body className="text-neutral-700 font-semibold">Cancel</Body>
              </StyledTouchableOpacity>

              <StyledTouchableOpacity
                onPress={() => {
                  if (customReligionValue.trim()) {
                    // Check if input matches existing option (case-insensitive)
                    const matchingOption = RELIGION_OPTIONS.find(
                      opt => opt.toLowerCase() === customReligionValue.trim().toLowerCase()
                    );

                    setProfile({
                      ...profile!,
                      religion: matchingOption || customReligionValue.trim(),
                    });
                    mediumHaptic();
                    setCustomReligionValue('');
                    setShowCustomReligionModal(false);
                    Keyboard.dismiss();
                  }
                }}
                className={`flex-1 rounded-lg py-3 items-center ${
                  customReligionValue.trim()
                    ? 'bg-primary-500'
                    : 'bg-neutral-200'
                }`}
                disabled={!customReligionValue.trim()}
              >
                <Body className={`font-semibold ${
                  customReligionValue.trim()
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

      {/* Has Children "Other" Custom Input Modal */}
      <Modal
        visible={showCustomChildrenModal}
        animationType="none"
        transparent
        onRequestClose={() => setShowCustomChildrenModal(false)}
      >
        <StyledAnimatedView
          className="flex-1 bg-black/50 justify-start items-center px-6 pt-24"
          style={{
            opacity: customChildrenModalAnim,
          }}
        >
          <StyledTouchableOpacity
            activeOpacity={1}
            onPress={() => {
              Keyboard.dismiss();
              setShowCustomChildrenModal(false);
              setCustomChildrenValue('');
            }}
            className="absolute inset-0"
          />

          <StyledAnimatedView
            className="bg-white rounded-2xl w-full max-w-md"
            style={{
              transform: [{
                scale: customChildrenModalAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.9, 1],
                }),
              }],
            }}
          >
            {/* Header */}
            <StyledView className="px-6 pt-6 pb-4 border-b border-neutral-100">
              <H3 className="mb-2">Custom Children Status</H3>
              <Body className="text-neutral-600 text-sm">
                Enter your children status
              </Body>
            </StyledView>

            {/* Input Field */}
            <StyledView className="px-6 py-5">
              <StyledTextInput
                value={customChildrenValue}
                onChangeText={setCustomChildrenValue}
                placeholder="Type your children status"
                className="bg-neutral-50 border border-neutral-200 rounded-lg px-4 py-3 text-base text-neutral-900"
                placeholderTextColor="#9CA3AF"
                autoFocus
                returnKeyType="done"
                onSubmitEditing={() => {
                  if (customChildrenValue.trim()) {
                    setProfile({
                      ...profile!,
                      hasChildren: customChildrenValue.trim(),
                    });
                    mediumHaptic();
                    setCustomChildrenValue('');
                    setShowCustomChildrenModal(false);
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
                  setShowCustomChildrenModal(false);
                  setCustomChildrenValue('');
                  Keyboard.dismiss();
                }}
                className="flex-1 bg-neutral-100 rounded-lg py-3 items-center"
              >
                <Body className="text-neutral-700 font-semibold">Cancel</Body>
              </StyledTouchableOpacity>

              <StyledTouchableOpacity
                onPress={() => {
                  if (customChildrenValue.trim()) {
                    setProfile({
                      ...profile!,
                      hasChildren: customChildrenValue.trim(),
                    });
                    mediumHaptic();
                    setCustomChildrenValue('');
                    setShowCustomChildrenModal(false);
                    Keyboard.dismiss();
                  }
                }}
                className={`flex-1 rounded-lg py-3 items-center ${
                  customChildrenValue.trim()
                    ? 'bg-primary-500'
                    : 'bg-neutral-200'
                }`}
                disabled={!customChildrenValue.trim()}
              >
                <Body className={`font-semibold ${
                  customChildrenValue.trim()
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

      {/* Family Plans "Other" Custom Input Modal */}
      <Modal
        visible={showCustomFamilyPlansModal}
        animationType="none"
        transparent
        onRequestClose={() => setShowCustomFamilyPlansModal(false)}
      >
        <StyledAnimatedView
          className="flex-1 bg-black/50 justify-start items-center px-6 pt-24"
          style={{
            opacity: customFamilyPlansModalAnim,
          }}
        >
          <StyledTouchableOpacity
            activeOpacity={1}
            onPress={() => {
              Keyboard.dismiss();
              setShowCustomFamilyPlansModal(false);
              setCustomFamilyPlansValue('');
            }}
            className="absolute inset-0"
          />

          <StyledAnimatedView
            className="bg-white rounded-2xl w-full max-w-md"
            style={{
              transform: [{
                scale: customFamilyPlansModalAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.9, 1],
                }),
              }],
            }}
          >
            {/* Header */}
            <StyledView className="px-6 pt-6 pb-4 border-b border-neutral-100">
              <H3 className="mb-2">Custom Family Plans</H3>
              <Body className="text-neutral-600 text-sm">
                Enter your family plans
              </Body>
            </StyledView>

            {/* Input Field */}
            <StyledView className="px-6 py-5">
              <StyledTextInput
                value={customFamilyPlansValue}
                onChangeText={setCustomFamilyPlansValue}
                placeholder="Type your family plans"
                className="bg-neutral-50 border border-neutral-200 rounded-lg px-4 py-3 text-base text-neutral-900"
                placeholderTextColor="#9CA3AF"
                autoFocus
                returnKeyType="done"
                onSubmitEditing={() => {
                  if (customFamilyPlansValue.trim()) {
                    setProfile({
                      ...profile!,
                      familyPlans: customFamilyPlansValue.trim(),
                    });
                    mediumHaptic();
                    setCustomFamilyPlansValue('');
                    setShowCustomFamilyPlansModal(false);
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
                  setShowCustomFamilyPlansModal(false);
                  setCustomFamilyPlansValue('');
                  Keyboard.dismiss();
                }}
                className="flex-1 bg-neutral-100 rounded-lg py-3 items-center"
              >
                <Body className="text-neutral-700 font-semibold">Cancel</Body>
              </StyledTouchableOpacity>

              <StyledTouchableOpacity
                onPress={() => {
                  if (customFamilyPlansValue.trim()) {
                    setProfile({
                      ...profile!,
                      familyPlans: customFamilyPlansValue.trim(),
                    });
                    mediumHaptic();
                    setCustomFamilyPlansValue('');
                    setShowCustomFamilyPlansModal(false);
                    Keyboard.dismiss();
                  }
                }}
                className={`flex-1 rounded-lg py-3 items-center ${
                  customFamilyPlansValue.trim()
                    ? 'bg-primary-500'
                    : 'bg-neutral-200'
                }`}
                disabled={!customFamilyPlansValue.trim()}
              >
                <Body className={`font-semibold ${
                  customFamilyPlansValue.trim()
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

      {/* Interest "Other" Custom Input Modal */}
      <Modal
        visible={showCustomInterestModal}
        animationType="none"
        transparent
        onRequestClose={() => setShowCustomInterestModal(false)}
      >
        <StyledAnimatedView
          className="flex-1 bg-black/50 justify-start items-center px-6 pt-24"
          style={{
            opacity: customInterestModalAnim,
          }}
        >
          <StyledTouchableOpacity
            activeOpacity={1}
            onPress={() => {
              Keyboard.dismiss();
              setShowCustomInterestModal(false);
              setCustomInterestValue('');
            }}
            className="absolute inset-0"
          />

          <StyledAnimatedView
            className="bg-white rounded-2xl w-full max-w-md"
            style={{
              transform: [{
                scale: customInterestModalAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.9, 1],
                }),
              }],
            }}
          >
            {/* Header */}
            <StyledView className="px-6 pt-6 pb-4 border-b border-neutral-100">
              <H3 className="mb-2">Add Interest</H3>
              <Body className="text-neutral-600 text-sm">
                Enter your interest
              </Body>
            </StyledView>

            {/* Input Field */}
            <StyledView className="px-6 py-5">
              <StyledTextInput
                value={customInterestValue}
                onChangeText={setCustomInterestValue}
                placeholder="Type your interest"
                className="bg-neutral-50 border border-neutral-200 rounded-lg px-4 py-3 text-base text-neutral-900"
                placeholderTextColor="#9CA3AF"
                autoFocus
                returnKeyType="done"
                onSubmitEditing={() => {
                  if (customInterestValue.trim()) {
                    handleAddInterest(customInterestValue.trim());
                    setCustomInterestValue('');
                    setShowCustomInterestModal(false);
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
                  setShowCustomInterestModal(false);
                  setCustomInterestValue('');
                  Keyboard.dismiss();
                }}
                className="flex-1 bg-neutral-100 rounded-lg py-3 items-center"
              >
                <Body className="text-neutral-700 font-semibold">Cancel</Body>
              </StyledTouchableOpacity>

              <StyledTouchableOpacity
                onPress={() => {
                  if (customInterestValue.trim()) {
                    handleAddInterest(customInterestValue.trim());
                    setCustomInterestValue('');
                    setShowCustomInterestModal(false);
                    Keyboard.dismiss();
                  }
                }}
                className={`flex-1 rounded-lg py-3 items-center ${
                  customInterestValue.trim()
                    ? 'bg-primary-500'
                    : 'bg-neutral-200'
                }`}
                disabled={!customInterestValue.trim()}
              >
                <Body className={`font-semibold ${
                  customInterestValue.trim()
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

      {/* Value "Other" Custom Input Modal */}
      <Modal
        visible={showCustomValueModal}
        animationType="none"
        transparent
        onRequestClose={() => setShowCustomValueModal(false)}
      >
        <StyledAnimatedView
          className="flex-1 bg-black/50 justify-start items-center px-6 pt-24"
          style={{
            opacity: customValueModalAnim,
          }}
        >
          <StyledTouchableOpacity
            activeOpacity={1}
            onPress={() => {
              Keyboard.dismiss();
              setShowCustomValueModal(false);
              setCustomValueInputValue('');
            }}
            className="absolute inset-0"
          />

          <StyledAnimatedView
            className="bg-white rounded-2xl w-full max-w-md"
            style={{
              transform: [{
                scale: customValueModalAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.9, 1],
                }),
              }],
            }}
          >
            {/* Header */}
            <StyledView className="px-6 pt-6 pb-4 border-b border-neutral-100">
              <H3 className="mb-2">Add Value</H3>
              <Body className="text-neutral-600 text-sm">
                Enter a value that matters to you
              </Body>
            </StyledView>

            {/* Input Field */}
            <StyledView className="px-6 py-5">
              <StyledTextInput
                value={customValueInputValue}
                onChangeText={setCustomValueInputValue}
                placeholder="Type your value"
                className="bg-neutral-50 border border-neutral-200 rounded-lg px-4 py-3 text-base text-neutral-900"
                placeholderTextColor="#9CA3AF"
                autoFocus
                returnKeyType="done"
                onSubmitEditing={() => {
                  if (customValueInputValue.trim()) {
                    handleAddValue(customValueInputValue.trim());
                    setCustomValueInputValue('');
                    setShowCustomValueModal(false);
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
                  setShowCustomValueModal(false);
                  setCustomValueInputValue('');
                  Keyboard.dismiss();
                }}
                className="flex-1 bg-neutral-100 rounded-lg py-3 items-center"
              >
                <Body className="text-neutral-700 font-semibold">Cancel</Body>
              </StyledTouchableOpacity>

              <StyledTouchableOpacity
                onPress={() => {
                  if (customValueInputValue.trim()) {
                    handleAddValue(customValueInputValue.trim());
                    setCustomValueInputValue('');
                    setShowCustomValueModal(false);
                    Keyboard.dismiss();
                  }
                }}
                className={`flex-1 rounded-lg py-3 items-center ${
                  customValueInputValue.trim()
                    ? 'bg-primary-500'
                    : 'bg-neutral-200'
                }`}
                disabled={!customValueInputValue.trim()}
              >
                <Body className={`font-semibold ${
                  customValueInputValue.trim()
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
