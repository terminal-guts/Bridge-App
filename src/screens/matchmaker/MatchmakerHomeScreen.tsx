import React, { useState, useEffect, useCallback } from 'react';
import { View, TouchableOpacity, ScrollView, ActivityIndicator, Image, Modal, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { styled } from 'nativewind';
import { H1, H2, H3, Body, Button } from '../../components/ui';
import { EvaIcon } from '../../components/icons';
import { COLORS } from '../../theme/colors';
import { UserProfile } from '../../types';
import {
  getRoster,
  browseCandidates,
  getIntroductions,
  suggestIntroduction,
  RosterEntry,
  Introduction,
  GhostProfile
} from '../../services/matchmakerService';
import { LinearGradient } from 'expo-linear-gradient';

const StyledView = styled(View);
const StyledSafeAreaView = styled(SafeAreaView);
const StyledTouchableOpacity = styled(TouchableOpacity);
const StyledScrollView = styled(ScrollView);
const StyledImage = styled(Image);
const StyledLinearGradient = styled(LinearGradient);

type TabID = 'browse' | 'roster' | 'tracker';

export const MatchmakerHomeScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const [activeTab, setActiveTab] = useState<TabID>('browse');

  // Data state
  const [candidates, setCandidates] = useState<UserProfile[]>([]);
  const [roster, setRoster] = useState<RosterEntry[]>([]);
  const [introductions, setIntroductions] = useState<Introduction[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Suggest Modal
  const [suggestModalVisible, setSuggestModalVisible] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState<UserProfile | null>(null);
  const [selectedRosterFriend, setSelectedRosterFriend] = useState<RosterEntry | null>(null);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const loadData = async () => {
    // Only show loading indicator on first load to prevent flickering
    if (candidates.length === 0 && roster.length === 0) {
      setIsLoading(true);
    }
    
    const [browseRes, rosterRes, introRes] = await Promise.all([
      browseCandidates(),
      getRoster(),
      getIntroductions()
    ]);
    
    if (browseRes.ok && browseRes.data) setCandidates(browseRes.data);
    if (rosterRes.ok && rosterRes.data) setRoster(rosterRes.data);
    if (introRes.ok && introRes.data) setIntroductions(introRes.data);
    setIsLoading(false);
  };

  const handleSuggest = (candidate: UserProfile) => {
    setSelectedCandidate(candidate);
    setSelectedRosterFriend(null);
    setSuggestModalVisible(true);
  };

  const submitSuggestion = async () => {
    if (!selectedCandidate || !selectedRosterFriend) return;
    
    // We expect the selected friend to be a real user in MVP
    const friendId = selectedRosterFriend.user_id || selectedRosterFriend.ghost_profile_id;
    if (!friendId) return;

    setSuggestModalVisible(false);
    setIsLoading(true);

    const res = await suggestIntroduction(friendId, selectedCandidate.id, "I think you guys would be great together!");
    
    if (res.ok) {
      Alert.alert('Introduction Sent!', 'We let both people know you suggested them.');
      loadData(); // refresh introductions easily
    } else {
      Alert.alert('Error', 'Failed to send introduction');
    }
    
    setIsLoading(false);
  };

  // --- RENDER HELPERS ---

  const renderTabBar = () => (
    <StyledView className="flex-row border-b border-neutral-200 bg-white">
      {[
        { id: 'browse', label: 'Candidates', icon: 'search' },
        { id: 'roster', label: 'Roster', icon: 'people' },
        { id: 'tracker', label: 'Tracker', icon: 'activity' }
      ].map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <StyledTouchableOpacity
            key={tab.id}
            className={`flex-1 py-4 items-center justify-center border-b-2 flex-row`}
            style={{ borderBottomColor: isActive ? COLORS.primaryAccent : 'transparent' }}
            onPress={() => setActiveTab(tab.id as TabID)}
          >
            <EvaIcon 
              name={tab.icon} 
              variant={isActive ? 'fill' : 'outline'} 
              size={18} 
              color={isActive ? COLORS.primaryAccent : COLORS.text.secondary} 
            />
            <Body 
              className={`ml-2 font-medium ${isActive ? 'text-primary-600' : 'text-neutral-500'}`}
            >
              {tab.label}
            </Body>
          </StyledTouchableOpacity>
        );
      })}
    </StyledView>
  );

  const getProfileName = (entry: Record<string, any>) => {
      if (entry.user) return entry.user.firstName;
      if (entry.ghost_profile) return entry.ghost_profile.name;
      return "Friend";
  };
  
  const getProfilePhoto = (entry: Record<string, any>) => {
      if (entry.user && entry.user.photos?.[0]) return entry.user.photos[0].url;
      if (entry.ghost_profile && entry.ghost_profile.photos?.[0]) return entry.ghost_profile.photos[0];
      return null;
  };

  const renderBrowse = () => (
    <StyledScrollView className="flex-1" contentContainerStyle={{ paddingHorizontal: 20, paddingVertical: 20 }}>
      {roster.length === 0 ? (
        <StyledView className="items-center py-20 bg-white rounded-3xl border border-neutral-100 px-6">
          <EvaIcon name="people-outline" size={48} color={COLORS.text.placeholder} />
          <H3 className="text-center mt-4">Your Roster is Empty</H3>
          <Body className="text-neutral-500 mt-2 text-center">
            Add friends or create ghost profiles to start finding matches for them!
          </Body>
          <Button 
            className="mt-6 px-8" 
            onPress={() => setActiveTab('roster')}
          >
            Go to Roster
          </Button>
        </StyledView>
      ) : (
        <>
          <StyledView className="mb-6">
            <H2 className="text-2xl font-bold">Candidate Stack</H2>
            <Body className="text-neutral-500">People matching your roster's preferences</Body>
          </StyledView>

          {candidates.length === 0 ? (
            <StyledView className="items-center py-20 bg-white rounded-3xl border border-neutral-100">
              <EvaIcon name="smiling-face-outline" size={48} color={COLORS.text.placeholder} />
              <Body className="text-neutral-500 mt-4">Searching for fresh faces...</Body>
            </StyledView>
          ) : (
            candidates.map((candidate) => (
              <StyledView key={candidate.id} className="bg-white rounded-[32px] overflow-hidden mb-8 shadow-md border border-neutral-100">
                <StyledView className="w-full aspect-[4/5] bg-neutral-100">
                  {candidate.photos[0]?.url ? (
                    <StyledImage source={{ uri: candidate.photos[0].url }} className="w-full h-full" resizeMode="cover" />
                  ) : (
                    <StyledView className="w-full h-full items-center justify-center">
                      <EvaIcon name="person" size={64} color={COLORS.text.placeholder} />
                    </StyledView>
                  )}
                  
                  <StyledLinearGradient 
                    colors={['transparent', 'rgba(0,0,0,0.8)']}
                    className="absolute bottom-0 w-full p-6"
                  >
                    <StyledView className="flex-row items-end justify-between">
                      <StyledView>
                        <H2 className="text-white text-3xl font-bold">{candidate.firstName}, {candidate.age}</H2>
                        <StyledView className="flex-row items-center mt-1">
                          <EvaIcon name="pin-outline" size={14} color="rgba(255,255,255,0.7)" />
                          <Body className="text-white/70 ml-1 text-sm">{candidate.school || 'Houston, TX'}</Body>
                        </StyledView>
                      </StyledView>
                    </StyledView>
                  </StyledLinearGradient>
                </StyledView>
                
                <StyledView className="p-6">
                  <StyledView className="mb-6">
                    <H3 className="mb-2 text-neutral-800">Bio</H3>
                    <Body className="text-neutral-600 leading-relaxed italic">
                      "{candidate.bio || 'No bio provided yet.'}"
                    </Body>
                  </StyledView>

                  <Button
                    onPress={() => handleSuggest(candidate)}
                    variant="secondary"
                    className="bg-primary-50 border-primary-100"
                  >
                    <StyledView className="flex-row items-center">
                      <Body className="mr-2 font-bold text-primary-600">Suggest for...</Body>
                      <EvaIcon name="paper-plane" variant="fill" size={18} color={COLORS.primaryAccent} />
                    </StyledView>
                  </Button>
                </StyledView>
              </StyledView>
            ))
          )}
        </>
      )}
    </StyledScrollView>
  );

  const renderRoster = () => (
    <StyledScrollView className="flex-1" contentContainerStyle={{ paddingHorizontal: 20, paddingVertical: 20 }}>
      <StyledView className="mb-8 flex-row items-center justify-between">
        <StyledView>
          <H2 className="text-2xl font-bold">Your Roster</H2>
          <Body className="text-neutral-500">Manage your stable of singles</Body>
        </StyledView>
        <StyledTouchableOpacity 
          className="bg-primary-500 w-12 h-12 rounded-2xl items-center justify-center shadow-lg"
          onPress={() => navigation.navigate('MatchmakerGhostProfile')}
        >
          <EvaIcon name="plus" variant="outline" size={24} color="white" />
        </StyledTouchableOpacity>
      </StyledView>
      
      {roster.length === 0 ? (
        <StyledView className="items-center py-20">
          <EvaIcon name="person-add-outline" size={48} color={COLORS.text.placeholder} />
          <Body className="text-neutral-400 mt-4">Tap the + to add someone</Body>
        </StyledView>
      ) : (
        roster.map((person) => {
          const name = getProfileName(person);
          const photo = getProfilePhoto(person);
          const isGhost = !!person.ghost_profile_id;
          const status = person.status;

          return (
            <StyledView key={person.id} className="bg-white p-5 rounded-[24px] mb-4 border border-neutral-100 shadow-sm flex-row items-center">
              <StyledView className="w-16 h-16 rounded-2xl bg-neutral-100 items-center justify-center overflow-hidden mr-5">
                {photo ? (
                  <StyledImage source={{ uri: photo }} className="w-full h-full" />
                ) : (
                  <EvaIcon name="person" variant="fill" size={32} color={COLORS.text.placeholder} />
                )}
              </StyledView>
              
              <StyledView className="flex-1">
                <H3 className="text-lg font-bold">{name}</H3>
                <StyledView className="flex-row items-center mt-1">
                  <StyledView 
                    className={`px-2 py-0.5 rounded-full mr-2 ${
                      status === 'active' ? 'bg-success/10' : 
                      status === 'pending_invite' ? 'bg-warning/10' : 'bg-neutral-100'
                    }`}
                  >
                    <Body 
                      className={`text-[10px] font-bold uppercase tracking-wider ${
                        status === 'active' ? 'text-success' : 
                        status === 'pending_invite' ? 'text-warning' : 'text-neutral-500'
                      }`}
                    >
                      {status === 'pending_invite' ? 'Pending Claim' : isGhost ? 'Ghost Mode' : 'Ready'}
                    </Body>
                  </StyledView>
                  {isGhost && (
                    <EvaIcon name="ghost-outline" size={14} color={COLORS.text.placeholder} />
                  )}
                </StyledView>
              </StyledView>

              <StyledTouchableOpacity className="w-10 h-10 items-center justify-center rounded-full bg-neutral-50">
                <EvaIcon name="chevron-right-outline" size={20} color={COLORS.text.secondary} />
              </StyledTouchableOpacity>
            </StyledView>
          );
        })
      )}
    </StyledScrollView>
  );

  const renderTracker = () => (
    <StyledScrollView className="flex-1 px-4" contentContainerStyle={{ paddingVertical: 16 }}>
      {introductions.length === 0 ? (
        <StyledView className="items-center py-20 bg-white rounded-3xl border border-neutral-100 px-6">
          <EvaIcon name="navigation-2-outline" size={48} color={COLORS.text.placeholder} />
          <H3 className="text-center mt-4">No Introductions Yet</H3>
          <Body className="text-neutral-500 mt-2 text-center">
            When you suggest a match, you'll be able to track their responses here.
          </Body>
        </StyledView>
      ) : (
        introductions.map((intro) => {
          const personAName = intro.person_a?.firstName || "Dater A";
          const personBName = intro.person_b?.firstName || "Dater B";
          
          return (
            <StyledView key={intro.id} className="bg-white p-5 rounded-[24px] mb-4 border border-neutral-100 shadow-sm">
              <StyledView className="flex-row justify-between items-center mb-4">
                <StyledView 
                    className={`px-3 py-1 rounded-full ${
                    intro.status === 'mutual_accept' ? 'bg-success/10' : 
                    intro.status === 'declined' ? 'bg-error/10' : 'bg-primary-50'
                    }`}
                >
                    <Body className={`text-xs font-bold ${
                        intro.status === 'mutual_accept' ? 'text-success' : 
                        intro.status === 'declined' ? 'text-error' : 'text-primary-600'
                    }`}>
                        {intro.status.replace('_', ' ').toUpperCase()}
                    </Body>
                </StyledView>
                <Body className="text-xs text-neutral-400">
                    {new Date(intro.created_at).toLocaleDateString()}
                </Body>
              </StyledView>

              <StyledView className="flex-row items-center justify-between mb-4">
                 <StyledView className="flex-1 items-center bg-neutral-50 p-4 rounded-2xl border border-neutral-100">
                    <Body className="font-bold text-neutral-800">{personAName}</Body>
                    <Body className="text-[10px] text-neutral-400 mt-1 uppercase">Roster</Body>
                 </StyledView>
                 <StyledView className="px-4">
                    <EvaIcon name="heart" variant="fill" size={24} color={COLORS.primaryAccent} />
                 </StyledView>
                 <StyledView className="flex-1 items-center bg-neutral-50 p-4 rounded-2xl border border-neutral-100">
                    <Body className="font-bold text-neutral-800">{personBName}</Body>
                    <Body className="text-[10px] text-neutral-400 mt-1 uppercase">Candidate</Body>
                 </StyledView>
              </StyledView>
              
              {intro.note && (
                  <StyledView className="bg-primary-50/30 p-3 rounded-xl border border-primary-50">
                    <Body className="text-xs text-neutral-600 italic leading-relaxed">
                        "{intro.note}"
                    </Body>
                  </StyledView>
              )}
            </StyledView>
          );
        })
      )}
    </StyledScrollView>
  );

  return (
    <StyledSafeAreaView edges={['top']} className="flex-1 bg-neutral-50">
      <StyledView className="flex-row items-center justify-between px-6 py-4">
        <H1 className="text-3xl font-bold">Matchmaker</H1>
        <StyledTouchableOpacity 
             className="w-10 h-10 rounded-full bg-white items-center justify-center shadow-sm"
             onPress={() => Alert.alert('Settings', 'Matchmaker settings coming soon.')}
        >
          <EvaIcon name="settings-2-outline" size={24} color={COLORS.text.primary} />
        </StyledTouchableOpacity>
      </StyledView>

      {renderTabBar()}

      <StyledView className="flex-1">
        {isLoading ? (
          <StyledView className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color={COLORS.primaryAccent} />
          </StyledView>
        ) : (
          <>
            {activeTab === 'browse' && renderBrowse()}
            {activeTab === 'roster' && renderRoster()}
            {activeTab === 'tracker' && renderTracker()}
          </>
        )}
      </StyledView>

      {/* Suggest Modal */}
      <Modal visible={suggestModalVisible} transparent animationType="slide">
        <StyledView className="flex-1 justify-end" style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}>
          <StyledView className="bg-white rounded-t-[40px] p-8 min-h-[60%] shadow-2xl">
            <StyledView className="flex-row justify-between items-center mb-8">
              <StyledView>
                <H2 className="text-2xl">Suggest {selectedCandidate?.firstName}</H2>
                <Body className="text-neutral-500">Pick someone from your roster</Body>
              </StyledView>
              <StyledTouchableOpacity 
                   onPress={() => setSuggestModalVisible(false)}
                   className="w-10 h-10 bg-neutral-50 rounded-full items-center justify-center"
              >
                <EvaIcon name="close" variant="outline" size={24} color={COLORS.text.primary} />
              </StyledTouchableOpacity>
            </StyledView>

            <StyledScrollView className="flex-1" showsVerticalScrollIndicator={false}>
              {roster.filter(r => r.status === 'active').length === 0 ? (
                <StyledView className="items-center py-10">
                   <Body className="text-neutral-400 text-center">
                      Only active roster members can be suggested.
                   </Body>
                </StyledView>
              ) : (
                roster.filter(r => r.status === 'active').map(friend => (
                  <StyledTouchableOpacity
                    key={friend.id}
                    className={`flex-row items-center p-5 rounded-[24px] mb-4 border-2 ${selectedRosterFriend?.id === friend.id ? 'border-primary-500 bg-primary-50' : 'border-neutral-100 bg-neutral-50'}`}
                    onPress={() => setSelectedRosterFriend(friend)}
                  >
                    <StyledView className="w-14 h-14 rounded-2xl bg-white shadow-sm mr-4 overflow-hidden items-center justify-center">
                       {getProfilePhoto(friend) ? (
                          <StyledImage source={{ uri: getProfilePhoto(friend) as string }} className="w-full h-full" />
                       ) : (
                          <EvaIcon name="person" variant="fill" size={24} color={COLORS.text.placeholder} />
                       )}
                    </StyledView>
                    <H3 className="text-lg font-bold">{getProfileName(friend)}</H3>
                    <StyledView className="flex-1 items-end">
                      {selectedRosterFriend?.id === friend.id && (
                         <EvaIcon name="checkmark-circle-2" variant="fill" size={28} color={COLORS.primaryAccent} />
                      )}
                    </StyledView>
                  </StyledTouchableOpacity>
                ))
              )}
            </StyledScrollView>

            <StyledView className="pt-6">
              <Button 
                disabled={!selectedRosterFriend}
                onPress={submitSuggestion}
                size="lg"
                className="rounded-2xl"
              >
                Send Introduction
              </Button>
            </StyledView>
          </StyledView>
        </StyledView>
      </Modal>
    </StyledSafeAreaView>
  );
};
