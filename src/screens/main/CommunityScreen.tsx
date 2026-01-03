/**
 * CommunityScreen
 *
 * Main container for the Community tab with 3-page horizontal navigation.
 *
 * Pages (left to right):
 * 1. Daily Grid - Random matcher assignment (must propose 1 candidate)
 * 2. Proposal Review - Vote on 3 community proposals (Yes/No)
 * 3. Friends Area - View friends' grids and pending/active matches
 *
 * Navigation Rules:
 * - Use tab buttons to navigate between pages
 * - Page 3 (Friends Area) locked until daily tasks complete:
 *   - Must submit 1 proposal from daily grid (Page 1)
 *   - Must vote on 3 proposals (Page 2)
 * - Can always navigate backwards (right to left) freely
 * - Page indicator shows current page and locked state
 *
 * State Machine:
 * - loading: Fetching community data
 * - ready: All data loaded, pages navigable
 * - error: Failed to load data
 *
 * Design Philosophy: "Thoughtful over Flashy" - minimal, warm, premium
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  SafeAreaView,
  StatusBar,
  Animated,
  Dimensions,
  Platform,
  UIManager,
  ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { styled } from 'nativewind';
import { NavigationProp, useFocusEffect, RouteProp, useRoute } from '@react-navigation/native';

import { H1, Body, Button } from '../../components/ui';
import { OfflineBanner } from '../../components/OfflineBanner';
import { ProfileCompletionBanner } from '../../components/ProfileCompletionBanner';
import { DailyGridView } from '../../components/community/DailyGridView';
import { ProposalReviewView } from '../../components/community/ProposalReviewView';
import { FriendsAreaView } from '../../components/community/FriendsAreaView';
import { PageIndicator } from '../../components/community/PageIndicator';
import { GuideTarget } from '../../components/guides';
import { useGuide } from '../../hooks/useGuide';
// import { tabNavigationGuide } from '../../config/guides'; // Tab navigation guide DISABLED - jump straight to Daily Grid

import { MainTabParamList, UserProfile } from '../../types';
import { CommunityTask } from '../../types/community';
import { communityService } from '../../services/communityServiceIndex';
import { getUserProfile } from '../../services/profileService';
import { showToast } from '../../utils/toast';
import { lightHaptic, mediumHaptic } from '../../utils/haptics';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import { FEATURES } from '../../config/features';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// Styled components
const StyledSafeAreaView = styled(SafeAreaView);
const StyledView = styled(View);
const StyledAnimatedView = styled(Animated.View);

// Constants
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.3; // 30% of screen width to trigger page change

// Types
type CommunityScreenState = 'loading' | 'ready' | 'error';

type PageIndex = 0 | 1 | 2;

interface CommunityScreenProps {
  navigation: NavigationProp<MainTabParamList, 'Community'>;
}

export function CommunityScreen({ navigation }: CommunityScreenProps) {
  // ========================================
  // ROUTE & PARAMS
  // ========================================
  const route = useRoute<RouteProp<MainTabParamList, 'Community'>>();
  const initialPage = route.params?.initialPage;

  // ========================================
  // STATE
  // ========================================
  const [screenState, setScreenState] = useState<CommunityScreenState>('loading');
  const [currentPage, setCurrentPage] = useState<PageIndex>(initialPage ?? 0);
  const [taskProgress, setTaskProgress] = useState<CommunityTask | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  // Network status
  const { isOnline } = useNetworkStatus();

  // Guide system
  const { startGuideIfNeeded } = useGuide();

  // Animation values
  const translateX = useRef(new Animated.Value(0)).current;

  // ========================================
  // DERIVED STATE
  // ========================================
  const dailyTasksComplete = FEATURES.DEVELOPMENT_UNLOCK_FRIENDS_AREA ? true : (taskProgress?.allTasksCompleted ?? false);
  const friendsAreaLocked = FEATURES.DEVELOPMENT_UNLOCK_FRIENDS_AREA ? false : (!dailyTasksComplete && currentPage !== 2); // Allow viewing if already on page 3

  // ========================================
  // DATA LOADING
  // ========================================
  const loadCommunityData = useCallback(async () => {
    try {
      setScreenState('loading');

      // Fetch task progress and user profile in parallel
      const [progress, profileResult] = await Promise.all([
        communityService.getCommunityTaskProgress(),
        getUserProfile(),
      ]);

      setTaskProgress(progress);

      // Set profile if successfully loaded
      if (profileResult.ok && profileResult.data) {
        setUserProfile(profileResult.data);
      }

      setScreenState('ready');
    } catch (error: any) {
      console.error('[CommunityScreen] Error loading data:', error);
      setScreenState('error');
      showToast.error('Failed to load', error.message || 'Unable to load Community data');
    }
  }, []);

  // Load on mount and when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadCommunityData();

      // Clear banner dismissal on app start (for development/testing)
      // Remove this in production if you want dismissal to persist
      AsyncStorage.removeItem('@profile_completion_banner_dismissed').catch(console.error);
    }, [loadCommunityData])
  );

  // Tab navigation guide DISABLED - users discover 3-page navigation naturally
  // useEffect(() => {
  //   if (screenState === 'ready') {
  //     const timer = setTimeout(() => {
  //       startGuideIfNeeded(tabNavigationGuide);
  //     }, 800);
  //     return () => clearTimeout(timer);
  //   }
  // }, [screenState, startGuideIfNeeded]);

  // Reload when coming back online
  useEffect(() => {
    if (isOnline && screenState === 'error') {
      loadCommunityData();
    }
  }, [isOnline, screenState, loadCommunityData]);

  // Handle initialPage navigation param (for guide replay)
  useEffect(() => {
    if (initialPage !== undefined && screenState === 'ready') {
      // Animate to the specified page
      Animated.spring(translateX, {
        toValue: -initialPage * SCREEN_WIDTH,
        useNativeDriver: true,
        friction: 9,
        tension: 50,
      }).start();
    }
  }, [initialPage, screenState, translateX]);

  // ========================================
  // REFRESH
  // ========================================
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    lightHaptic();
    await loadCommunityData();
    setRefreshing(false);
  }, [loadCommunityData]);

  // ========================================
  // PAGE NAVIGATION
  // ========================================
  const goToPage = useCallback((pageIndex: PageIndex) => {
    // Check if Friends Area is locked
    if (pageIndex === 2 && !dailyTasksComplete) {
      mediumHaptic();
      showToast.info('Complete Daily Tasks', 'Finish your grid proposal and 3 votes to unlock Friends Area');
      return;
    }

    setCurrentPage(pageIndex);
    lightHaptic();

    // Animate to new page
    Animated.spring(translateX, {
      toValue: -pageIndex * SCREEN_WIDTH,
      useNativeDriver: true,
      friction: 9,
      tension: 50,
    }).start();
  }, [dailyTasksComplete, translateX]);

  // ========================================
  // TASK COMPLETION HANDLERS
  // ========================================
  const handleGridProposalSubmitted = useCallback(async () => {
    // Reload task progress
    const progress = await communityService.getCommunityTaskProgress();
    setTaskProgress(progress);

    // Immediately navigate to Proposals screen (Page 1) after submission
    if (progress.hasCompletedRandomMatch) {
      goToPage(1);
    }
  }, [goToPage]);

  const handleProposalVotesComplete = useCallback(async () => {
    // Reload task progress
    const progress = await communityService.getCommunityTaskProgress();
    setTaskProgress(progress);

    // Navigate to Friends Area (Page 2)
    goToPage(2);

    // Show completion message if all tasks done
    if (progress.allTasksCompleted) {
      showToast.success('Daily Tasks Complete! 🎉', 'Friends Area unlocked. Great work, matchmaker!');
    }
  }, [goToPage]);

  // ========================================
  // RENDER STATES
  // ========================================

  // Loading state
  if (screenState === 'loading') {
    return (
      <StyledSafeAreaView className="flex-1 bg-white">
        <StatusBar barStyle="dark-content" />
        <StyledView className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#1E293B" />
          <Body className="mt-4 text-neutral-600">Loading Community...</Body>
        </StyledView>
      </StyledSafeAreaView>
    );
  }

  // Error state
  if (screenState === 'error') {
    return (
      <StyledSafeAreaView className="flex-1 bg-white">
        <StatusBar barStyle="dark-content" />
        {!isOnline && <OfflineBanner />}
        <StyledView className="flex-1 items-center justify-center px-6">
          <H1 className="text-center mb-2">Unable to Load</H1>
          <Body className="text-center text-neutral-600 mb-6">
            We couldn't load your Community data. Please try again.
          </Body>
          <Button
            onPress={loadCommunityData}
            variant="primary"
          >
            Retry
          </Button>
        </StyledView>
      </StyledSafeAreaView>
    );
  }

  // ========================================
  // MAIN CONTENT (3-PAGE LAYOUT)
  // ========================================
  return (
    <StyledSafeAreaView className="flex-1 bg-white">
      <StatusBar barStyle="dark-content" />
      {!isOnline && <OfflineBanner />}
      <ProfileCompletionBanner
        profile={userProfile}
        onPress={() => {
          // Navigate to Profile tab to complete profile
          navigation.navigate('Profile');
        }}
      />

      {/* Page Indicator */}
      <StyledView className="pt-4 px-6">
        <GuideTarget id="page-indicator">
          <PageIndicator
            currentPage={currentPage}
            totalPages={3}
            onPagePress={goToPage}
            friendsAreaLocked={friendsAreaLocked}
          />
        </GuideTarget>
      </StyledView>

      {/* 3-Page Horizontal Container */}
      <StyledView style={{ flex: 1 }}>
        <StyledAnimatedView
          style={{
            flexDirection: 'row',
            width: SCREEN_WIDTH * 3,
            height: '100%',
            transform: [{ translateX }],
          }}
        >
          {/* Page 1: Daily Grid */}
          <StyledView style={{ width: SCREEN_WIDTH, height: '100%', overflow: 'hidden' }}>
            <DailyGridView
              onProposalSubmitted={handleGridProposalSubmitted}
              taskProgress={taskProgress}
              isActive={currentPage === 0}
            />
          </StyledView>

          {/* Page 2: Proposal Review */}
          <StyledView style={{ width: SCREEN_WIDTH, height: '100%', overflow: 'hidden' }}>
            <ProposalReviewView
              onVotesComplete={handleProposalVotesComplete}
              taskProgress={taskProgress}
              goToPage={goToPage}
              isActive={currentPage === 1}
            />
          </StyledView>

          {/* Page 3: Friends Area */}
          <StyledView style={{ width: SCREEN_WIDTH, height: '100%', overflow: 'hidden' }}>
            {dailyTasksComplete ? (
              <FriendsAreaView isActive={currentPage === 2} />
            ) : (
              <GuideTarget id="friends-area-locked">
                <StyledView style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 }}>
                  <H1 className="text-center mb-2">Friends Area Locked</H1>
                  <Body className="text-center text-neutral-600 mb-6">
                    Complete your daily tasks to unlock:
                    {'\n\n'}
                    {!taskProgress?.hasCompletedRandomMatch && '• Submit proposal from your grid\n'}
                    {(taskProgress?.proposalsVotedCount ?? 0) < 3 && `• Vote on ${3 - (taskProgress?.proposalsVotedCount ?? 0)} more proposal(s)`}
                  </Body>
                  <Button
                    onPress={() => goToPage(0)}
                    variant="primary"
                  >
                    Go to Daily Grid
                  </Button>
                </StyledView>
              </GuideTarget>
            )}
          </StyledView>
        </StyledAnimatedView>
      </StyledView>
    </StyledSafeAreaView>
  );
}

export default CommunityScreen;
