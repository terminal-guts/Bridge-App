/**
 * Developer Menu
 *
 * 🚨 DEVELOPMENT ONLY 🚨
 *
 * Floating developer menu for quick access to:
 * - Screen navigation
 * - Data management
 * - Feature flags
 * - Auth controls
 * - Profile management
 *
 * TO REMOVE FOR PRODUCTION:
 * Set FEATURES.ENABLE_DEVELOPER_MENU to false
 */

import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Modal,
  TouchableOpacity,
  ScrollView,
  Alert,
  Platform,
} from 'react-native';
import { styled } from 'nativewind';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { H2, H3, Body, Button } from './ui';
import {
  getCurrentUserId,
  quickAddMatch,
  resetAllData,
  generateMockData,
  completeProfile,
  clearProfile,
  extendAllMatches,
  getAppState,
  clearAsyncStorage,
  quickSignOut,
  signInAsAlex,
} from '../services/developerService';
import { supabase } from '../lib/supabase';
import * as Clipboard from 'expo-clipboard';

const StyledView = styled(View);
const StyledTouchableOpacity = styled(TouchableOpacity);
const StyledScrollView = styled(ScrollView);

const DEV_USER_ID = '00000000-0000-0000-0000-000000000001';

export const DeveloperMenu: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [appState, setAppState] = useState<any>(null);
  const navigation = useNavigation<any>();

  const openingRef = useRef(false);
  const openMenu = useCallback(async () => {
    if (openingRef.current) return; // debounce rapid double-taps
    openingRef.current = true;
    setIsVisible(true);
    try {
      const state = await getAppState();
      setAppState(state);
    } finally {
      openingRef.current = false;
    }
  }, []);

  const closeMenu = useCallback(() => setIsVisible(false), []);

  // Quick Navigation
  const navigateTo = useCallback((screen: string, params?: any) => {
    closeMenu();
    setTimeout(() => {
      navigation.navigate(screen, params);
    }, 100);
  }, [closeMenu, navigation]);

  // Data Management Actions
  const handleResetData = useCallback(() => {
    Alert.alert(
      'Reset All Data',
      'This will delete all matches, surveys, friends, and messages. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            await resetAllData();
            Alert.alert('Success', 'All data has been reset');
            openMenu(); // Refresh state
          },
        },
      ]
    );
  }, [openMenu]);

  const handleGenerateMockData = useCallback(async () => {
    await generateMockData();
    Alert.alert('Success', 'Mock data generated!');
    openMenu(); // Refresh state
  }, [openMenu]);

  const handleAddMatch = useCallback(async (status: 'pending' | 'accepted') => {
    await quickAddMatch(status);
    Alert.alert('Success', `${status} match added!`);
    openMenu(); // Refresh state
  }, [openMenu]);

  const handleAddPendingMatch = useCallback(() => handleAddMatch('pending'), [handleAddMatch]);
  const handleAddAcceptedMatch = useCallback(() => handleAddMatch('accepted'), [handleAddMatch]);

  const handleCompleteProfile = useCallback(async () => {
    await completeProfile();
    Alert.alert('Success', 'Profile completed to 100%');
  }, []);

  const handleClearProfile = useCallback(() => {
    Alert.alert(
      'Clear Profile',
      'This will remove photos, interests, values, and deep questions. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            await clearProfile();
            Alert.alert('Success', 'Profile cleared');
          },
        },
      ]
    );
  }, []);

  const handleExtendMatches = useCallback(async () => {
    await extendAllMatches();
    Alert.alert('Success', 'All matches extended by 30 days');
  }, []);

  const handleCopyUserId = useCallback(async () => {
    const userId = await getCurrentUserId();
    if (userId) {
      await Clipboard.setStringAsync(userId);
      Alert.alert('Copied', 'User ID copied to clipboard');
    }
  }, []);

  const handleClearStorage = useCallback(() => {
    Alert.alert(
      'Clear Storage',
      'This will clear all AsyncStorage data. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            await clearAsyncStorage();
            Alert.alert('Success', 'AsyncStorage cleared');
          },
        },
      ]
    );
  }, []);

  const handleSignOut = useCallback(() => {
    Alert.alert('Sign Out', 'Sign out of the app?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        onPress: async () => {
          await quickSignOut();
          closeMenu();
        },
      },
    ]);
  }, [closeMenu]);

  const handleSignInAsAlex = useCallback(async () => {
    const result = await signInAsAlex();
    if (!result.success) {
      Alert.alert('Error', result.error || 'Failed to sign in as Alex');
      return;
    }
    closeMenu();
    // AppNavigator's onAuthStateChange will automatically navigate to MainTabs
  }, [closeMenu]);

  const handleViewState = useCallback(async () => {
    const state = await getAppState();
    Alert.alert(
      'App State',
      JSON.stringify(state, null, 2),
      [{ text: 'OK' }]
    );
  }, []);

  // Community Testing Actions
  const handleResetDailyGrid = useCallback(async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const { error: taskError } = await supabase.from('community_tasks').update({
        has_voted_on_proposals: false,
        proposals_voted_count: 0,
        has_created_proposal: false,
        has_completed_random_match: false,
        completed_grid_id: null,
        grid_completed_at: null,
        all_tasks_complete: false,
        tasks_completed_count: 0,
      }).eq('user_id', DEV_USER_ID).eq('task_date', today);
      if (taskError) throw new Error(`Tasks: ${taskError.message}`);
      const { error: gridError } = await supabase.from('daily_grids').update({
        has_proposed: false,
        selected_candidate_id: null,
        proposed_at: null,
      }).eq('anchor_user_id', DEV_USER_ID).eq('grid_date', today);
      if (gridError) throw new Error(`Grid: ${gridError.message}`);
      await supabase.from('proposal_votes').delete().eq('voter_user_id', DEV_USER_ID);
      Alert.alert(
        'Grid Unlocked!',
        'To apply the change:\n\n1. Close this menu\n2. Navigate to a different tab (Profile, Settings, etc.)\n3. Navigate back to Community\n\nOr restart the app.',
        [{ text: 'OK', onPress: closeMenu }]
      );
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  }, [closeMenu]);

  const handleAddPendingProposal = useCallback(async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const expires = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
      const { error } = await supabase.from('proposals').insert({
        user_a_id: '00000000-0000-0000-0000-000000000002',
        user_b_id: DEV_USER_ID,
        anchor_user_id: '00000000-0000-0000-0000-000000000002',
        selected_candidate_id: DEV_USER_ID,
        proposal_date: today,
        compatibility_score: 87.5,
        status: 'approved',
        yes_votes: 25,
        no_votes: 3,
        voting_threshold: 20,
        user_a_decision: 'accepted',
        user_b_decision: 'pending',
        proposal_expires_at: expires,
      });
      if (error) throw error;
      Alert.alert('Success', 'Pending match proposal created! Pull to refresh Friends Area.');
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  }, []);

  const handleAddActiveMatch = useCallback(async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const { data: proposal, error: proposalError } = await supabase.from('proposals').insert({
        user_a_id: DEV_USER_ID,
        user_b_id: '00000000-0000-0000-0000-000000000002',
        anchor_user_id: DEV_USER_ID,
        selected_candidate_id: '00000000-0000-0000-0000-000000000002',
        proposal_date: today,
        compatibility_score: 92.0,
        status: 'accepted',
        yes_votes: 30,
        no_votes: 2,
        voting_threshold: 20,
        user_a_decision: 'accepted',
        user_b_decision: 'accepted',
      }).select().single();
      if (proposalError) throw proposalError;
      if (proposal) {
        const { error: matchError } = await supabase.from('active_matches').insert({
          proposal_id: proposal.id,
          user_a_id: DEV_USER_ID,
          user_b_id: '00000000-0000-0000-0000-000000000002',
          status: 'active',
          matched_at: new Date().toISOString(),
          can_end_at: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
        });
        if (matchError) throw matchError;
      }
      Alert.alert('Success', 'Active match created! Pull to refresh Friends Area.');
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  }, []);

  const handleClearMatchesAndVotes = useCallback(async () => {
    try {
      await supabase.from('active_matches').delete().or(`user_a_id.eq.${DEV_USER_ID},user_b_id.eq.${DEV_USER_ID}`);
      await supabase.from('proposal_votes').delete().eq('voter_user_id', DEV_USER_ID);
      Alert.alert('Success', 'Cleared active matches and votes');
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  }, []);

  const handleResetFriendGrids = useCallback(async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const { error } = await supabase.from('daily_grids')
        .update({ has_proposed: false, selected_candidate_id: null, proposed_at: null })
        .eq('grid_date', today)
        .neq('anchor_user_id', DEV_USER_ID);
      if (error) throw error;
      Alert.alert(
        'Friend Grids Reset!',
        'You can now help your friends again. Navigate away and back to Community to see the changes.',
        [{ text: 'OK', onPress: closeMenu }]
      );
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  }, [closeMenu]);

  const handleFullReset = useCallback(async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      await supabase.from('proposals').delete()
        .or(`user_a_id.eq.${DEV_USER_ID},user_b_id.eq.${DEV_USER_ID}`);
      await supabase.from('proposal_votes').delete().eq('voter_user_id', DEV_USER_ID);
      await supabase.from('community_tasks').update({
        has_voted_on_proposals: false,
        proposals_voted_count: 0,
        has_created_proposal: false,
        has_completed_random_match: false,
        completed_grid_id: null,
        grid_completed_at: null,
        all_tasks_complete: false,
        tasks_completed_count: 0,
      }).eq('user_id', DEV_USER_ID).eq('task_date', today);
      await supabase.from('daily_grids').update({
        has_proposed: false,
        selected_candidate_id: null,
        proposed_at: null,
      }).eq('anchor_user_id', DEV_USER_ID).eq('grid_date', today);
      Alert.alert(
        'Full Reset Complete!',
        'Cleared all proposals, votes, and reset your daily tasks. Navigate away and back to Community.',
        [{ text: 'OK', onPress: closeMenu }]
      );
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  }, [closeMenu]);

  return (
    <>
      {/* Floating Action Button */}
      <StyledTouchableOpacity
        onPress={openMenu}
        className="absolute bottom-24 right-6 w-14 h-14 bg-purple-600 rounded-full items-center justify-center shadow-lg z-50"
        style={{
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 6,
          elevation: 8,
        }}
      >
        <Ionicons name="code-slash" size={24} color="white" />
      </StyledTouchableOpacity>

      {/* Developer Menu Modal */}
      <Modal
        visible={isVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={closeMenu}
      >
        <StyledView className="flex-1 bg-neutral-50">
          {/* Header */}
          <StyledView className="bg-purple-600 pt-12 pb-6 px-6">
            <StyledView className="flex-row items-center justify-between">
              <StyledView>
                <H2 className="text-white mb-1">Developer Menu</H2>
                {appState && (
                  <Body className="text-purple-100 text-sm">
                    {appState.matchCount} matches • {appState.surveyCount} surveys • {appState.friendCount} friends
                  </Body>
                )}
              </StyledView>
              <StyledTouchableOpacity onPress={closeMenu}>
                <Ionicons name="close" size={28} color="white" />
              </StyledTouchableOpacity>
            </StyledView>
          </StyledView>

          <StyledScrollView className="flex-1 px-6 py-6">
            {/* Community Navigation */}
            <StyledView className="mb-6">
              <H3 className="mb-3 text-neutral-900">🚀 Community Navigation</H3>
              <StyledView className="bg-white rounded-xl p-4 space-y-2">
                <Button variant="primary" size="sm" onPress={() => navigateTo('Community', { initialPage: 0 })}>
                  Jump to Proposals
                </Button>
                <Button variant="secondary" size="sm" onPress={() => navigateTo('Community', { initialPage: 1 })}>
                  Jump to Friends (Bypass Lock)
                </Button>
              </StyledView>
            </StyledView>

            {/* Community Testing */}
            <StyledView className="mb-6">
              <H3 className="mb-3 text-neutral-900">💕 Community Testing</H3>
              <StyledView className="bg-white rounded-xl p-4 space-y-2">
                <Button variant="primary" size="sm" onPress={handleResetDailyGrid}>
                  Reset Daily Grid (Unlock Clicks)
                </Button>
                <Button variant="secondary" size="sm" onPress={handleAddPendingProposal}>
                  Add Pending Match Proposal
                </Button>
                <Button variant="secondary" size="sm" onPress={handleAddActiveMatch}>
                  Add Active Match
                </Button>
                <Button variant="destructive" size="sm" onPress={handleClearMatchesAndVotes}>
                  Clear Matches & Votes
                </Button>
                <Button variant="secondary" size="sm" onPress={handleResetFriendGrids}>
                  Reset Friend Grids (Repeatable)
                </Button>
                <Button variant="destructive" size="sm" onPress={handleFullReset}>
                  Full Reset (Clear Everything)
                </Button>
              </StyledView>
            </StyledView>

            {/* Data Management */}
            <StyledView className="mb-6">
              <H3 className="mb-3 text-neutral-900">💾 Data Management</H3>
              <StyledView className="bg-white rounded-xl p-4 space-y-2">
                <Button variant="primary" size="sm" onPress={handleGenerateMockData}>
                  Generate Full Mock Data
                </Button>
                <Button variant="secondary" size="sm" onPress={handleAddPendingMatch}>
                  Add Pending Match
                </Button>
                <Button variant="secondary" size="sm" onPress={handleAddAcceptedMatch}>
                  Add Accepted Match
                </Button>
                <Button variant="secondary" size="sm" onPress={handleExtendMatches}>
                  Extend All Match Expiry
                </Button>
                <Button variant="destructive" size="sm" onPress={handleResetData}>
                  Reset All Data
                </Button>
              </StyledView>
            </StyledView>

            {/* Profile Management */}
            <StyledView className="mb-6">
              <H3 className="mb-3 text-neutral-900">👤 Profile Management</H3>
              <StyledView className="bg-white rounded-xl p-4 space-y-2">
                <Button variant="primary" size="sm" onPress={handleCompleteProfile}>
                  Complete Profile (100%)
                </Button>
                <Button variant="destructive" size="sm" onPress={handleClearProfile}>
                  Clear Profile Data
                </Button>
                <Button variant="secondary" size="sm" onPress={() => navigateTo('ProfileEdit')}>
                  Edit Profile
                </Button>
                <Button variant="secondary" size="sm" onPress={() => navigateTo('ProfilePreview')}>
                  Preview Profile
                </Button>
              </StyledView>
            </StyledView>

            {/* Auth & System */}
            <StyledView className="mb-6">
              <H3 className="mb-3 text-neutral-900">🔐 Auth & System</H3>
              <StyledView className="bg-white rounded-xl p-4 space-y-2">
                <Button variant="primary" size="sm" onPress={handleSignInAsAlex}>
                  Sign In as Alex (Mock Profile)
                </Button>
                <Button variant="secondary" size="sm" onPress={handleCopyUserId}>
                  Copy User ID
                </Button>
                <Button variant="secondary" size="sm" onPress={handleViewState}>
                  View App State
                </Button>
                <Button variant="secondary" size="sm" onPress={handleClearStorage}>
                  Clear AsyncStorage
                </Button>
                <Button variant="destructive" size="sm" onPress={handleSignOut}>
                  Sign Out
                </Button>
              </StyledView>
            </StyledView>

            {/* Info */}
            <StyledView className="mb-6 bg-purple-50 rounded-xl p-4">
              <Body className="text-purple-900 text-xs">
                💡 This menu is only visible in development mode.{'\n'}
                Set ENABLE_DEVELOPER_MENU to false to remove it.
              </Body>
            </StyledView>
          </StyledScrollView>
        </StyledView>
      </Modal>
    </>
  );
};
