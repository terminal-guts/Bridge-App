import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, View } from 'react-native';
import { supabase } from '../lib/supabase';
import { FEATURES } from '../config/features';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Auth Screens
import {
  WelcomeScreen,
  LoginScreen,
  PhoneVerificationScreen,
} from '../screens/auth';

// Main Screens
import {
  ProfileScreen,
  CommunityScreen,
} from '../screens/main';
import { DeepQuestionsScreen } from '../screens/main/DeepQuestionsScreen';
import { FriendGridScreen } from '../screens/community/FriendGridScreen';

// Onboarding
import { OnboardingScreen } from '../screens/onboarding/OnboardingScreen';

// Match Screens
import { MatchRevealScreen } from '../screens/match/MatchRevealScreen';
import { MatchDetailScreen } from '../screens/match/MatchDetailScreen';
import { MatchProposalScreen } from '../screens/match/MatchProposalScreen';

// Chat
import ChatScreen from '../screens/ChatScreen';

// Profile Screens
import { SettingsScreen } from '../screens/profile/SettingsScreen';
import { ProfileEditScreen } from '../screens/profile/ProfileEditScreen';
import { ProfileScreen as ProfileViewerScreen } from '../screens/profile/ProfileScreen';
import { MatchPreferencesScreen } from '../screens/profile/MatchPreferencesScreen';
import { ProfileVerificationScreen } from '../screens/profile/ProfileVerificationScreen';
import { BlockedUsersScreen } from '../screens/profile/BlockedUsersScreen';
import { PauseProfileScreen } from '../screens/profile/PauseProfileScreen';
import { ChangePhoneNumberScreen } from '../screens/profile/ChangePhoneNumberScreen';

// Legal Screens
import { TermsOfService } from '../screens/legal/TermsOfService';
import { PrivacyPolicy } from '../screens/legal/PrivacyPolicy';

// Support Screens
import { HelpSupportScreen } from '../screens/support/HelpSupportScreen';

// Friend Screens
import { FriendCodeScreen } from '../screens/friends/FriendCodeScreen';
import { FriendListScreen } from '../screens/friends/FriendListScreen';

// Types
import { RootStackParamList, MainTabParamList } from '../types';
import { createDevelopmentData } from '../services/developmentDataService';
import { DeveloperMenu } from '../components/DeveloperMenu';

const Stack = createStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

// Main Tab Navigator
const MainTabs = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap = 'people';

          if (route.name === 'Community') {
            // Using people icon to represent community matching
            iconName = focused ? 'people' : 'people-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person' : 'person-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#437FFF',
        tabBarInactiveTintColor: '#667085',
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopWidth: 1,
          borderTopColor: '#E4E7EC',
          paddingBottom: 8,
          paddingTop: 8,
          height: 75,
          shadowColor: '#000',
          shadowOffset: {
            width: 0,
            height: -2,
          },
          shadowOpacity: 0.05,
          shadowRadius: 3,
          elevation: 5,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginTop: 2,
        },
        tabBarIconStyle: {
          marginBottom: 2,
        },
        headerShown: false,
      })}
    >
      <Tab.Screen name="Community" component={CommunityScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
};

// Root Stack Navigator
export const AppNavigator = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    let isMounted = true;

    // Check for existing session on app start
    const initializeAuth = async () => {
      try {
        // Generate new session key for this app launch
        const sessionKey = Date.now().toString();
        await AsyncStorage.setItem('appSessionKey', sessionKey);

        // DEVELOPMENT MODE: Optionally start from welcome screen for testing
        // Controlled by FEATURES.DEVELOPMENT_FORCE_FRESH_SESSION flag
        if (FEATURES.DEVELOPMENT_FORCE_FRESH_SESSION) {
          await supabase.auth.signOut();
        }

        // IMPORTANT: Use getUser() instead of getSession() to verify with the server
        // getSession() only checks AsyncStorage cache which may contain stale sessions
        // getUser() validates the session with the Supabase server
        const { data: { user }, error } = await supabase.auth.getUser();

        if (!isMounted) return;

        if (error) {
          console.log('Auth verification failed:', error.message);
          // Clear any stale session data
          await supabase.auth.signOut();
          setIsAuthenticated(false);
        } else {
          setIsAuthenticated(!!user);
        }
      } catch (err) {
        console.error('Error getting session:', err);
        // Clear any stale session data on error
        await supabase.auth.signOut();
        if (isMounted) {
          setIsAuthenticated(false);
        }
      }
    };

    initializeAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isMounted) return;
      setIsAuthenticated(!!session);

      // Create mock data on sign in (development only)
      if (event === 'SIGNED_IN' && session?.user && FEATURES.DEVELOPMENT_CREATE_MOCK_DATA) {
        console.log('[DevData] User signed in, creating mock data...');
        try {
          await createDevelopmentData(session.user.id);
        } catch (error) {
          console.error('[DevData] Failed to create mock data:', error);
        }
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // Show loading screen while checking auth
  if (isAuthenticated === null) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F9FAFB' }}>
        <ActivityIndicator size="large" color="#437FFF" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <>
        <Stack.Navigator
          initialRouteName={isAuthenticated ? 'MainTabs' : 'Welcome'}
          screenOptions={{
            headerShown: false,
            cardStyle: { backgroundColor: '#F9FAFB' },
          }}
        >
          {/* Auth Stack */}
          <Stack.Screen name="Welcome" component={WelcomeScreen} />
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="PhoneVerification" component={PhoneVerificationScreen} />

          {/* Onboarding */}
          <Stack.Screen name="Onboarding" component={OnboardingScreen} />

          {/* Main App */}
          <Stack.Screen name="MainTabs" component={MainTabs} />

          {/* Community Screens */}
          <Stack.Screen name="FriendGrid" component={FriendGridScreen} />

          {/* Match Screens */}
          <Stack.Screen name="MatchDetail" component={MatchDetailScreen} />
          <Stack.Screen name="MatchReveal" component={MatchRevealScreen} />
          <Stack.Screen name="MatchProposal" component={MatchProposalScreen} />

          {/* Chat */}
          <Stack.Screen name="Chat" component={ChatScreen} />

          {/* Profile & Settings */}
          <Stack.Screen name="Settings" component={SettingsScreen} />
          <Stack.Screen name="ProfileEdit" component={ProfileEditScreen} />
          <Stack.Screen name="ProfilePreview" component={ProfileViewerScreen} />
          <Stack.Screen name="ProfileView" component={ProfileViewerScreen} />
          <Stack.Screen name="DeepQuestions" component={DeepQuestionsScreen} />
          <Stack.Screen name="MatchPreferences" component={MatchPreferencesScreen} />
          <Stack.Screen name="ProfileVerification" component={ProfileVerificationScreen} />
          <Stack.Screen name="BlockedUsers" component={BlockedUsersScreen} />
          <Stack.Screen name="PauseProfile" component={PauseProfileScreen} />
          <Stack.Screen name="ChangePhoneNumber" component={ChangePhoneNumberScreen} />

          {/* Legal & Support */}
          <Stack.Screen name="TermsOfService" component={TermsOfService} />
          <Stack.Screen name="PrivacyPolicy" component={PrivacyPolicy} />
          <Stack.Screen name="HelpSupport" component={HelpSupportScreen} />

          {/* Friends */}
          <Stack.Screen name="FriendCode" component={FriendCodeScreen} />
          <Stack.Screen name="FriendList" component={FriendListScreen} />

          {/* Additional Screens - To be implemented */}
          {/*
          - ProfileEdit
          - ShareCandidate
          - ReportUser
          - StrikeWarning
          */}
        </Stack.Navigator>
        {/* Developer Menu - Must be inside NavigationContainer to use useNavigation */}
        {FEATURES.ENABLE_DEVELOPER_MENU && <DeveloperMenu />}
      </>
    </NavigationContainer>
  );
};