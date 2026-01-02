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

import React, { useState } from 'react';
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
} from '../services/developerService';
import { supabase } from '../lib/supabase';
import * as Clipboard from 'expo-clipboard';

const StyledView = styled(View);
const StyledTouchableOpacity = styled(TouchableOpacity);
const StyledScrollView = styled(ScrollView);

export const DeveloperMenu: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [appState, setAppState] = useState<any>(null);
  const navigation = useNavigation<any>();

  const openMenu = async () => {
    setIsVisible(true);
    const state = await getAppState();
    setAppState(state);
  };

  const closeMenu = () => setIsVisible(false);

  // Quick Navigation
  const navigateTo = (screen: string, params?: any) => {
    closeMenu();
    setTimeout(() => {
      navigation.navigate(screen, params);
    }, 100);
  };

  // Data Management Actions
  const handleResetData = () => {
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
  };

  const handleGenerateMockData = async () => {
    await generateMockData();
    Alert.alert('Success', 'Mock data generated!');
    openMenu(); // Refresh state
  };

  const handleAddMatch = async (status: 'pending' | 'accepted') => {
    await quickAddMatch(status);
    Alert.alert('Success', `${status} match added!`);
    openMenu(); // Refresh state
  };

  const handleCompleteProfile = async () => {
    await completeProfile();
    Alert.alert('Success', 'Profile completed to 100%');
  };

  const handleClearProfile = async () => {
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
  };

  const handleExtendMatches = async () => {
    await extendAllMatches();
    Alert.alert('Success', 'All matches extended by 30 days');
  };

  const handleCopyUserId = async () => {
    const userId = await getCurrentUserId();
    if (userId) {
      await Clipboard.setStringAsync(userId);
      Alert.alert('Copied', 'User ID copied to clipboard');
    }
  };

  const handleClearStorage = () => {
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
  };

  const handleSignOut = () => {
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
  };

  const handleViewState = async () => {
    const state = await getAppState();
    Alert.alert(
      'App State',
      JSON.stringify(state, null, 2),
      [{ text: 'OK' }]
    );
  };

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
            {/* Quick Navigation */}
            <StyledView className="mb-6">
              <H3 className="mb-3 text-neutral-900">🚀 Quick Navigation</H3>
              <StyledView className="bg-white rounded-xl p-4 space-y-2">
                <Button variant="secondary" size="sm" onPress={() => navigateTo('MainTabs')}>
                  Home (Dashboard)
                </Button>
                <Button variant="secondary" size="sm" onPress={() => navigateTo('Profile')}>
                  Profile
                </Button>
                <Button variant="secondary" size="sm" onPress={() => navigateTo('Onboarding')}>
                  Onboarding Flow
                </Button>
                <Button variant="secondary" size="sm" onPress={() => navigateTo('MatchDetail', { matchId: 'mock' })}>
                  Match Detail (Mock)
                </Button>
                <Button variant="secondary" size="sm" onPress={() => navigateTo('Chat', { matchId: 'mock' })}>
                  Chat (Mock)
                </Button>
                <Button variant="secondary" size="sm" onPress={() => navigateTo('FriendList')}>
                  Friends List
                </Button>
                <Button variant="secondary" size="sm" onPress={() => navigateTo('Settings')}>
                  Settings
                </Button>
                <Button variant="secondary" size="sm" onPress={() => navigateTo('DeepQuestions')}>
                  Deep Questions
                </Button>
                <Button variant="secondary" size="sm" onPress={() => navigateTo('MatchPreferences')}>
                  Match Preferences
                </Button>
              </StyledView>
            </StyledView>

            {/* Community Testing */}
            <StyledView className="mb-6">
              <H3 className="mb-3 text-neutral-900">💕 Community Testing</H3>
              <StyledView className="bg-white rounded-xl p-4 space-y-2">
                <Button variant="primary" size="sm" onPress={async () => {
                  try {
                    const today = new Date().toISOString().split('T')[0];
                    const devUserId = '00000000-0000-0000-0000-000000000001';

                    // Reset community_tasks - this controls the isComplete flag
                    const { error: taskError } = await supabase.from('community_tasks').update({
                      has_voted_on_proposals: false,
                      proposals_voted_count: 0,
                      has_created_proposal: false,
                      has_completed_random_match: false,
                      completed_grid_id: null,
                      grid_completed_at: null,
                      all_tasks_complete: false,
                      tasks_completed_count: 0,
                    }).eq('user_id', devUserId).eq('task_date', today);

                    if (taskError) throw new Error(`Tasks: ${taskError.message}`);

                    // Reset daily_grids - this controls grid selection
                    const { error: gridError } = await supabase.from('daily_grids').update({
                      has_proposed: false,
                      selected_candidate_id: null,
                      proposed_at: null,
                    }).eq('anchor_user_id', devUserId).eq('grid_date', today);

                    if (gridError) throw new Error(`Grid: ${gridError.message}`);

                    // Also delete any votes made today
                    await supabase.from('proposal_votes').delete().eq('voter_user_id', devUserId);

                    Alert.alert(
                      'Grid Unlocked!',
                      'To apply the change:\n\n1. Close this menu\n2. Navigate to a different tab (Profile, Settings, etc.)\n3. Navigate back to Community\n\nOr restart the app.',
                      [{ text: 'OK', onPress: () => closeMenu() }]
                    );
                  } catch (e: any) {
                    Alert.alert('Error', e.message);
                  }
                }}>
                  Reset Daily Grid (Unlock Clicks)
                </Button>
                <Button variant="secondary" size="sm" onPress={async () => {
                  try {
                    const today = new Date().toISOString().split('T')[0];
                    const expires = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
                    const { error } = await supabase.from('proposals').insert({
                      user_a_id: '00000000-0000-0000-0000-000000000002',
                      user_b_id: '00000000-0000-0000-0000-000000000001',
                      anchor_user_id: '00000000-0000-0000-0000-000000000002',
                      selected_candidate_id: '00000000-0000-0000-0000-000000000001',
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
                }}>
                  Add Pending Match Proposal
                </Button>
                <Button variant="secondary" size="sm" onPress={async () => {
                  try {
                    const today = new Date().toISOString().split('T')[0];
                    const { data: proposal, error: proposalError } = await supabase.from('proposals').insert({
                      user_a_id: '00000000-0000-0000-0000-000000000001',
                      user_b_id: '00000000-0000-0000-0000-000000000002',
                      anchor_user_id: '00000000-0000-0000-0000-000000000001',
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
                        user_a_id: '00000000-0000-0000-0000-000000000001',
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
                }}>
                  Add Active Match
                </Button>
                <Button variant="destructive" size="sm" onPress={async () => {
                  try {
                    await supabase.from('active_matches').delete().or('user_a_id.eq.00000000-0000-0000-0000-000000000001,user_b_id.eq.00000000-0000-0000-0000-000000000001');
                    await supabase.from('proposal_votes').delete().eq('voter_user_id', '00000000-0000-0000-0000-000000000001');
                    Alert.alert('Success', 'Cleared active matches and votes');
                  } catch (e: any) {
                    Alert.alert('Error', e.message);
                  }
                }}>
                  Clear Matches & Votes
                </Button>
                <Button variant="secondary" size="sm" onPress={async () => {
                  try {
                    const devUserId = '00000000-0000-0000-0000-000000000001';
                    const today = new Date().toISOString().split('T')[0];

                    // Reset friend grids (so you can help them again)
                    const { error } = await supabase.from('daily_grids')
                      .update({
                        has_proposed: false,
                        selected_candidate_id: null,
                        proposed_at: null,
                      })
                      .eq('grid_date', today)
                      .neq('anchor_user_id', devUserId); // All grids except own

                    if (error) throw error;

                    Alert.alert(
                      'Friend Grids Reset!',
                      'You can now help your friends again. Navigate away and back to Community to see the changes.',
                      [{ text: 'OK', onPress: () => closeMenu() }]
                    );
                  } catch (e: any) {
                    Alert.alert('Error', e.message);
                  }
                }}>
                  Reset Friend Grids (Repeatable)
                </Button>
                <Button variant="destructive" size="sm" onPress={async () => {
                  try {
                    const devUserId = '00000000-0000-0000-0000-000000000001';
                    const today = new Date().toISOString().split('T')[0];

                    // Delete all proposals involving dev user
                    await supabase.from('proposals').delete()
                      .or(`user_a_id.eq.${devUserId},user_b_id.eq.${devUserId}`);

                    // Delete all votes by dev user
                    await supabase.from('proposal_votes').delete()
                      .eq('voter_user_id', devUserId);

                    // Reset community_tasks for dev user
                    await supabase.from('community_tasks').update({
                      has_voted_on_proposals: false,
                      proposals_voted_count: 0,
                      has_created_proposal: false,
                      has_completed_random_match: false,
                      completed_grid_id: null,
                      grid_completed_at: null,
                      all_tasks_complete: false,
                      tasks_completed_count: 0,
                    }).eq('user_id', devUserId).eq('task_date', today);

                    // Reset daily_grids for dev user
                    await supabase.from('daily_grids').update({
                      has_proposed: false,
                      selected_candidate_id: null,
                      proposed_at: null,
                    }).eq('anchor_user_id', devUserId).eq('grid_date', today);

                    Alert.alert(
                      'Full Reset Complete!',
                      'Cleared all proposals, votes, and reset your daily tasks. Navigate away and back to Community.',
                      [{ text: 'OK', onPress: () => closeMenu() }]
                    );
                  } catch (e: any) {
                    Alert.alert('Error', e.message);
                  }
                }}>
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
                <Button variant="secondary" size="sm" onPress={() => handleAddMatch('pending')}>
                  Add Pending Match
                </Button>
                <Button variant="secondary" size="sm" onPress={() => handleAddMatch('accepted')}>
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
