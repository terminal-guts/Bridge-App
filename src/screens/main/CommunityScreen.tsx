import React, { useState, useEffect, useCallback, useRef, useReducer } from 'react';
import { View, Text, TextInput, ScrollView, SafeAreaView, StatusBar, TouchableOpacity, StyleSheet, Dimensions, Share, Alert, RefreshControl, Modal } from 'react-native';

const SCREEN_HEIGHT = Dimensions.get('window').height;
import { styled } from 'nativewind';
import { UserRow } from '../../components/community/UserRow';
import { ProposalReviewView } from '../../components/community/proposal/ProposalReviewView';
import { GuideTarget } from '../../components/guides';
import { NavigationProp, useFocusEffect } from '@react-navigation/native';
import { EvaIcon } from '../../components/icons';
import { MainTabParamList } from '../../types';
import { OfflineBanner } from '../../components/ui/OfflineBanner';
import { communityService } from '../../services/communityServiceIndex';
import { getUserFriendCode, addFriendByCode } from '../../services/friendService';
import { buildInviteMessage } from '../../services/contactsService';
import { FriendWithGridStatus } from '../../types/community';
import { getUserProfile } from '../../services/profileService';
import { UserProfile } from '../../types';
import { ProfileCompletionBanner } from '../../components/profile/ProfileCompletionBanner';
import { useGuide } from '../../hooks/useGuide';
import { beginnerTourGuide } from '../../config/guides';
import { CommunitySkeleton } from '../../components/ui/SkeletonLoader';
import { getLast7PMCentral } from '../../utils/centralTime';

// ── Match reset countdown timer ───────────────────────────────────────────────
//
// Uses a ref for the target timestamp and a force-render counter.
// `remaining` is computed fresh from Date.now() on every render — never stored
// in state — so React batching and unmount/remount cycles can't stale-lock it.
function MatchResetTimer() {
  // Target timestamp (epoch ms) from the service
  const targetRef = useRef(Number(communityService.getNextResetAt()));
  // Incrementing counter just to force a re-render every second
  const [, tick] = useReducer((n: number) => n + 1, 0);
  const [infoVisible, setInfoVisible] = useState(false);

  useEffect(() => {
    const id = setInterval(() => {
      const ms = targetRef.current - Date.now();
      if (ms <= 0) {
        communityService.triggerReset();
        targetRef.current = Number(communityService.getNextResetAt());
      }
      tick(); // force re-render
    }, 1000);

    // Re-sync when dev toggle / triggerReset changes the reset time
    const unsub = communityService.onStateChange(() => {
      targetRef.current = Number(communityService.getNextResetAt());
      tick();
    });

    return () => {
      clearInterval(id);
      unsub();
    };
  }, []);

  // Computed fresh every render — never stale
  const remaining = Math.max(0, targetRef.current - Date.now());

  const hours   = Math.floor(remaining / 3600000);
  const minutes = Math.floor((remaining % 3600000) / 60000);
  const seconds = Math.floor((remaining % 60000) / 1000);

  let label: string;
  if (hours > 0) {
    label = `${hours}h ${minutes}m`;
  } else if (minutes > 0) {
    label = `${minutes}m ${seconds}s`;
  } else {
    label = `${seconds}s`;
  }

  // Color thresholds: green 12-24h, orange 4-12h, red <4h
  let color: string;
  let bgColor: string;
  let borderColor: string;
  if (remaining > 12 * 3600000) {
    color = '#1D9E50';
    bgColor = 'rgba(52, 199, 89, 0.08)';
    borderColor = 'rgba(52, 199, 89, 0.25)';
  } else if (remaining > 4 * 3600000) {
    color = '#C96B00';
    bgColor = 'rgba(255, 141, 40, 0.08)';
    borderColor = 'rgba(255, 141, 40, 0.25)';
  } else {
    color = '#D92D20';
    bgColor = 'rgba(255, 56, 60, 0.08)';
    borderColor = 'rgba(255, 56, 60, 0.25)';
  }

  return (
    <>
      <TouchableOpacity activeOpacity={0.7} onPress={() => setInfoVisible(true)}>
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: bgColor,
          borderWidth: 1,
          borderColor,
          borderRadius: 10,
          paddingHorizontal: 9,
          height: 34,
          gap: 5,
        }}>
          <EvaIcon name="clock-outline" size={13} color={color} />
          <Text style={{ fontSize: 13, fontWeight: '600', color }}>{label}</Text>
        </View>
      </TouchableOpacity>

      <Modal visible={infoVisible} transparent animationType="fade" onRequestClose={() => setInfoVisible(false)}>
        <TouchableOpacity style={timerInfoStyles.overlay} activeOpacity={1} onPress={() => setInfoVisible(false)}>
          <View style={timerInfoStyles.card}>
            <Text style={timerInfoStyles.title}>Daily Reset</Text>
            <Text style={timerInfoStyles.body}>
              New proposals drop every day at 7 PM. Come back to vote on new matches and maybe get a match yourself!
            </Text>
            <TouchableOpacity style={timerInfoStyles.btn} onPress={() => setInfoVisible(false)} activeOpacity={0.85}>
              <Text style={timerInfoStyles.btnText}>Got it</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const timerInfoStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingHorizontal: 28,
    paddingTop: 28,
    paddingBottom: 22,
    marginHorizontal: 32,
    alignItems: 'center',
  },
  title: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 18,
    color: '#101828',
    marginBottom: 8,
    textAlign: 'center',
  },
  body: {
    fontFamily: 'Outfit_400Regular',
    fontSize: 14,
    color: '#667085',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  btn: {
    backgroundColor: '#2B65F9',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 32,
  },
  btnText: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: 15,
    color: '#FFFFFF',
  },
});

interface CommunityScreenProps {
  navigation: NavigationProp<MainTabParamList, 'Community'>;
}

const StyledSafeAreaView = styled(SafeAreaView);

export function CommunityScreen({ navigation }: CommunityScreenProps) {
  const { startGuideIfNeeded } = useGuide();
  const [usersToMatch, setUsersToMatch] = useState<FriendWithGridStatus[]>([]);
  const [alreadyHelped, setAlreadyHelped] = useState<FriendWithGridStatus[]>([]);
  const [loading, setLoading] = useState(true);
  // null = still checking, true = can see friends area, false = must vote first
  const [hasCompletedVoting, setHasCompletedVoting] = useState<boolean | null>(null);
  const [friendCode, setFriendCode] = useState<string>('');
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [showEnterCode, setShowEnterCode] = useState(false);
  const [enterCodeValue, setEnterCodeValue] = useState('');
  const [enterCodeError, setEnterCodeError] = useState('');
  const [addingCode, setAddingCode] = useState(false);

  const handleEnterCode = useCallback(async () => {
    const code = enterCodeValue.trim().toUpperCase();
    if (!code) { setEnterCodeError('Enter a friend code'); return; }
    if (!/^BRIDGE-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(code)) { setEnterCodeError('Format: BRIDGE-XXXX-XXXX'); return; }
    if (code === friendCode) { setEnterCodeError("That's your own code"); return; }
    setAddingCode(true);
    setEnterCodeError('');
    try {
      const result = await addFriendByCode(code);
      if (result.ok) {
        setEnterCodeValue('');
        setShowEnterCode(false);
        Alert.alert('Friend Added!', `${result.data?.friendProfile?.firstName || 'Friend'} is now your friend`);
      } else {
        const msg = result.error?.message || 'Failed';
        setEnterCodeError(msg.includes('already friends') ? 'Already friends' : msg.includes('not found') ? 'Invalid code' : msg);
      }
    } catch {
      setEnterCodeError('Something went wrong');
    } finally {
      setAddingCode(false);
    }
  }, [enterCodeValue, friendCode]);

  const loadFriendsData = useCallback(async () => {
    try {
      const [data, codeRes] = await Promise.all([
        communityService.getFriendsAreaData(),
        getUserFriendCode()
      ]);

      if (codeRes.ok && codeRes.data) {
        setFriendCode(codeRes.data.code);
      }

      const toMatch = data.friends.filter((f: FriendWithGridStatus) => !f.hasCompletedGrid);
      const helped = data.friends
        .filter((f: FriendWithGridStatus) => f.hasCompletedGrid)
        .sort((a: FriendWithGridStatus, b: FriendWithGridStatus) => (b.karmaScore?.karmaPoints ?? 0) - (a.karmaScore?.karmaPoints ?? 0));
      setUsersToMatch(toMatch);
      setAlreadyHelped(helped);
    } catch (error) {
      console.error("Failed to load community data:", error);
      Alert.alert('Error', 'Failed to load community data. Pull down to refresh.');
    }
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        loadFriendsData(),
        getUserProfile().then(result => {
          if (result.ok && result.data) setProfile(result.data);
        }),
      ]);
    } catch (error) {
      console.error('Pull-to-refresh failed:', error);
    } finally {
      setRefreshing(false);
    }
  }, [loadFriendsData]);

  const initialize = useCallback(async () => {
    const cycleId = String(getLast7PMCentral());

    // ── Fast path: try to render from cache instantly ──────────────────────
    const [cachedVoting, cachedFriends] = await Promise.all([
      communityService.getCachedVotingComplete(cycleId),
      communityService.getCachedFriendsArea(),
    ]);

    // If we have a cached "voting done" and cached friends, render immediately
    if (cachedVoting === true && cachedFriends) {
      const toMatch = cachedFriends.filter((f: FriendWithGridStatus) => !f.hasCompletedGrid);
      const helped = cachedFriends
        .filter((f: FriendWithGridStatus) => f.hasCompletedGrid)
        .sort((a: FriendWithGridStatus, b: FriendWithGridStatus) => b.assistsCount - a.assistsCount);
      setUsersToMatch(toMatch);
      setAlreadyHelped(helped);
      setHasCompletedVoting(true);
      setLoading(false);

      // Background revalidate — update state silently if data changed
      Promise.all([
        loadFriendsData(),
        getUserProfile().then(result => {
          if (result.ok && result.data) setProfile(result.data);
        }),
        // Re-check voting gate in background to self-correct if vote was removed
        (async () => {
          const task = await communityService.getCommunityTaskProgress();
          let votingDone = task.hasVotedOnProposals;
          if (!votingDone) {
            const available = await communityService.getProposalsToVote();
            if (available.length === 0) votingDone = true;
          }
          // Only cache if user actually voted 3+ times; never cache "no proposals"
          if (task.hasVotedOnProposals) {
            communityService.cacheVotingComplete(true, cycleId).catch(() => {});
          } else {
            // Clear any stale cache so new proposals trigger the gate
            communityService.cacheVotingComplete(false, cycleId).catch(() => {});
          }
          if (!votingDone) setHasCompletedVoting(false);
        })(),
      ]).catch(() => {});
      return;
    }

    // ── Slow path: no cache, full network init ────────────────────────────
    setLoading(true);
    try {
      const profilePromise = getUserProfile().then(result => {
        if (result.ok && result.data) setProfile(result.data);
      });

      await communityService.ready;
      const task = await communityService.getCommunityTaskProgress();
      let votingDone = task.hasVotedOnProposals;

      if (!votingDone) {
        const available = await communityService.getProposalsToVote();
        if (available.length === 0) {
          votingDone = true;
        }
      }

      // Only cache "done" if user actually voted on 3+ proposals this cycle.
      // If votingDone is true merely because no proposals exist yet, don't cache —
      // new proposals may appear later in the same cycle.
      if (task.hasVotedOnProposals) {
        communityService.cacheVotingComplete(true, cycleId).catch(() => {});
      }

      setHasCompletedVoting(votingDone);
      if (votingDone) {
        await loadFriendsData();
      }

      await profilePromise;
    } catch (error) {
      console.error("Failed to check task progress:", error);
      setHasCompletedVoting(false);
    } finally {
      setLoading(false);
    }
  }, [loadFriendsData]);

  // Ref must be declared before the useEffect that references it
  const initializedRef = useRef(false);

  useEffect(() => {
    initialize();

    // Reload whenever the dev state toggle changes mock state
    return communityService.onStateChange(() => {
      initializedRef.current = true; // prevent useFocusEffect double-load
      initialize();
    });
  }, [initialize]);
  // Invalidate friends cache + reload when returning from stack screens (e.g. ContactInvite)
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      if (!initializedRef.current) return;
      if ('invalidateFriendsCache' in communityService) {
        (communityService as any).invalidateFriendsCache();
      }
      getUserProfile().then(result => {
        if (result.ok && result.data) setProfile(result.data);
      });
      loadFriendsData();
    });
    return unsubscribe;
  }, [navigation, loadFriendsData]);

  useFocusEffect(useCallback(() => {
    // Check if beginner tour should play (first visit or re-enabled from Settings)
    startGuideIfNeeded(beginnerTourGuide);

    if (!initializedRef.current) {
      initializedRef.current = true;
      return; // skip first focus (handled by the init useEffect)
    }
    // Refresh profile on each tab focus so the completion banner stays current
    getUserProfile().then(result => {
      if (result.ok && result.data) setProfile(result.data);
    });
    // Refresh friends data on every focus — covers return from FriendProposalScreen,
    // tab switches, and any background changes (recommendations, votes).
    loadFriendsData();
  }, [hasCompletedVoting, loadFriendsData, startGuideIfNeeded]));

  const handleVotesComplete = useCallback(async () => {
    // Brief delay to allow the last vote to commit to the database
    // before querying hasCompletedGrid (which checks proposal_votes)
    await new Promise(resolve => setTimeout(resolve, 800));
    await loadFriendsData();
    setHasCompletedVoting(true);
    // Cache so next cold open skips the voting gate
    const cycleId = String(getLast7PMCentral());
    communityService.cacheVotingComplete(true, cycleId).catch(() => {});
    navigation.navigate('Community');
  }, [loadFriendsData, navigation]);

  if (loading || hasCompletedVoting === null) {
    return (
      <StyledSafeAreaView className="flex-1 bg-white">
        <StatusBar barStyle="dark-content" />
        <CommunitySkeleton />
      </StyledSafeAreaView>
    );
  }

  // Gate: must vote on 3 proposals before entering the community area
  if (!hasCompletedVoting) {
    return (
      <StyledSafeAreaView className="flex-1 bg-white">
        <StatusBar barStyle="dark-content" />
        <ProposalReviewView
          onVotesComplete={handleVotesComplete}
          isActive={true}
        />
      </StyledSafeAreaView>
    );
  }

  return (
    <StyledSafeAreaView className="flex-1 bg-white">
      <StatusBar barStyle="dark-content" />
      <OfflineBanner />
      <ProfileCompletionBanner
        profile={profile}
        onPress={() => (navigation as any).navigate('Profile')}
      />

      {/* Header section */}
      <View className="px-6 pt-4">
        <View className="flex-row items-center justify-between">
          <Text style={{ fontFamily: 'Outfit_700Bold', fontWeight: '700', fontSize: 32, lineHeight: 38, color: '#010101', letterSpacing: -0.5 }}>
            Community
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <MatchResetTimer />
            <GuideTarget id="add-friend-button">
              <TouchableOpacity
                onPress={() => (navigation as any).navigate('ContactInvite')}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                activeOpacity={0.7}
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 17,
                  backgroundColor: '#F4F7FF',
                  borderWidth: 1,
                  borderColor: '#D1DEFF',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <EvaIcon name="person-add" size={18} color="#2B65F9" variant="outline" />
              </TouchableOpacity>
            </GuideTarget>
          </View>
        </View>
      </View>

      {usersToMatch.length === 0 && alreadyHelped.length === 0 ? (
        <ScrollView
          contentContainerStyle={{ flex: 1 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2B65F9" />
          }
        >
          <View style={styles.emptyContainer}>
            <Text style={styles.subtitle}>
              Share your friend code to connect with people you know. Once you're friends, you can vote on each other's matches.
            </Text>

            {friendCode ? (
              <>
                <View style={styles.codeContainer}>
                  <Text style={styles.codeLabel}>YOUR FRIEND CODE</Text>
                  <Text style={styles.codeValue}>{friendCode}</Text>
                  <View style={styles.codeButtonRow}>
                    <TouchableOpacity
                      style={styles.enterCodeButton}
                      onPress={async () => { const msg = await buildInviteMessage(friendCode, profile?.firstName); Share.share({ message: msg }); }}
                    >
                      <EvaIcon name="share" size={18} color="#2B65F9" variant="outline" style={{ marginRight: 6 }} />
                      <Text style={styles.enterCodeButtonText}>Share Code</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.enterCodeButton}
                      activeOpacity={0.85}
                      onPress={() => { setShowEnterCode(!showEnterCode); setEnterCodeError(''); }}
                    >
                      <Text style={styles.enterCodeButtonText}>Enter Code</Text>
                    </TouchableOpacity>
                  </View>
                  {showEnterCode && (
                    <View style={styles.enterCodeRow}>
                      <TextInput
                        style={styles.enterCodeInput}
                        placeholder="BRIDGE-XXXX-XXXX"
                        placeholderTextColor="#9CA3AF"
                        value={enterCodeValue}
                        onChangeText={(t) => { setEnterCodeValue(t); setEnterCodeError(''); }}
                        autoCapitalize="characters"
                        autoCorrect={false}
                        autoFocus
                      />
                      <TouchableOpacity
                        style={[styles.enterCodeAddBtn, addingCode && { opacity: 0.5 }]}
                        onPress={handleEnterCode}
                        disabled={addingCode}
                      >
                        <Text style={styles.enterCodeAddBtnText}>{addingCode ? '...' : 'Add'}</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                  {enterCodeError ? (
                    <Text style={styles.enterCodeErrorText}>{enterCodeError}</Text>
                  ) : null}
                </View>
                <TouchableOpacity
                  style={styles.inviteContactsButton}
                  activeOpacity={0.85}
                  onPress={() => (navigation as any).navigate('ContactInvite')}
                >
                  <EvaIcon name="people" size={20} color="#FFFFFF" variant="outline" style={{ marginRight: 8 }} />
                  <Text style={styles.inviteContactsButtonText}>Invite from Contacts</Text>
                </TouchableOpacity>
              </>
            ) : null}
          </View>
        </ScrollView>
      ) : (
        <ScrollView
          className="flex-1"
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2B65F9" />
          }
        >
          {/* Invite nudge banner — show when user has fewer than 5 friends */}
          {(usersToMatch.length + alreadyHelped.length) < 5 && (
            <TouchableOpacity
              style={styles.inviteNudgeBanner}
              activeOpacity={0.85}
              onPress={() => (navigation as any).navigate('ContactInvite')}
            >
              <View style={styles.inviteNudgeLeft}>
                <EvaIcon name="people" size={20} color="#2B65F9" variant="fill" />
                <Text style={styles.inviteNudgeText}>
                  Invite {5 - (usersToMatch.length + alreadyHelped.length)} more friend{5 - (usersToMatch.length + alreadyHelped.length) === 1 ? '' : 's'} for better matches
                </Text>
              </View>
              <EvaIcon name="chevron-right" size={18} color="#2B65F9" />
            </TouchableOpacity>
          )}

          {usersToMatch.length > 0 && (
            <Text style={{ fontFamily: 'Outfit_500Medium', fontSize: 15, color: '#9CA3AF', marginTop: SCREEN_HEIGHT * 0.055, marginBottom: 4, paddingHorizontal: 24 }}>
              Help your friends
            </Text>
          )}
          {/* Main list */}
          <View>
            {usersToMatch.map((user, index) => (
              <UserRow
                key={user.friendId}
                item={user}
                index={index}
                onViewProfile={() => (navigation as any).navigate('ProfileView', { profile: user.friend })}
                onMatch={() => (navigation as any).navigate('FriendProposal', {
                  friendId: user.friendId,
                  friendName: user.friend.firstName,
                  friendPhotoUrl: user.friend.photos?.[0]?.url,
                  friendAge: user.friend.age,
                  friendJob: user.friend.currentJob,
                })}
                onChat={() => (navigation as any).navigate('Chat', {
                  friendshipId: user.friendshipId,
                  recipientId: user.friendId,
                  recipientName: user.friend.firstName,
                  recipientPhoto: user.friend.photos?.[0]?.url,
                  isFriendChat: true,
                })}
              />
            ))}
          </View>

          {/* Already Helped section */}
          {alreadyHelped.length > 0 && (
            <View style={{ marginTop: 20, marginBottom: 4, paddingHorizontal: 24 }}>
              <Text style={{ fontFamily: 'Outfit_500Medium', fontSize: 15, color: '#9CA3AF' }}>
                Sitting tight
              </Text>
            </View>
          )}

          <View className="pb-8">
            {alreadyHelped.map((user, index) => (
              <UserRow
                key={user.friendId}
                item={user}
                index={index}
                onViewProfile={() => (navigation as any).navigate('ProfileView', { profile: user.friend })}
                onChat={() => (navigation as any).navigate('Chat', {
                  friendshipId: user.friendshipId,
                  recipientId: user.friendId,
                  recipientName: user.friend.firstName,
                  recipientPhoto: user.friend.photos?.[0]?.url,
                  isFriendChat: true,
                })}
              />
            ))}
          </View>
        </ScrollView>
      )}
    </StyledSafeAreaView>
  );
}

const styles = StyleSheet.create({
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, paddingBottom: 80, width: '100%' },
  tagline: { fontFamily: 'Outfit_600SemiBold', fontSize: 20, lineHeight: 26, color: '#0B1226', textAlign: 'center', marginBottom: 12 },
  illustration: { width: 300, height: 300, marginBottom: 32 },
  subtitle: { fontFamily: 'Outfit_600SemiBold', fontSize: 17, lineHeight: 24, color: '#0B1226', textAlign: 'center', marginBottom: 20, width: '100%' },
  ctaButton: {
    backgroundColor: '#007AFF',
    width: 250,
    height: 47,
    borderRadius: 9999,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: 'rgba(0, 122, 255, 0.2)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 4,
  },
  ctaText: { fontFamily: 'Outfit_600SemiBold', fontSize: 15, color: '#FFFFFF' },
  codeContainer: {
    backgroundColor: '#F4F7FF',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#D1DEFF',
  },
  codeLabel: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: 12,
    color: '#2B65F9',
    letterSpacing: 1,
    marginBottom: 8,
  },
  codeValue: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 24,
    color: '#010101',
    marginBottom: 16,
  },
  codeButtonRow: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  enterCodeButton: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#2B65F9',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
  },
  enterCodeButtonText: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: 14,
    color: '#2B65F9',
  },
  enterCodeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    width: '100%',
  },
  enterCodeInput: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontFamily: 'Outfit_500Medium',
    fontSize: 14,
    color: '#010101',
    marginRight: 8,
  },
  enterCodeAddBtn: {
    backgroundColor: '#2B65F9',
    borderRadius: 10,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  enterCodeAddBtnText: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: 14,
    color: '#FFFFFF',
  },
  enterCodeErrorText: {
    fontFamily: 'Outfit_500Medium',
    fontSize: 12,
    color: '#EF4444',
    marginTop: 4,
    width: '100%',
  },
  inviteNudgeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#EEF3FF',
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 4,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D1DEFF',
  },
  inviteNudgeLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  inviteNudgeText: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: 13,
    color: '#2B65F9',
    marginLeft: 10,
    flex: 1,
  },
  inviteContactsButton: {
    backgroundColor: '#2B65F9',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    width: '100%',
    marginBottom: 24,
  },
  inviteContactsButtonText: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: 15,
    color: '#FFFFFF',
  },
});

export default CommunityScreen;
