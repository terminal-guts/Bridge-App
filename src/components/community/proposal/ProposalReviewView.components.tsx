/**
 * ProposalReviewView Sub-Components
 * Extracted from ProposalReviewView.tsx for maintainability.
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Modal,
  ActivityIndicator,
} from 'react-native';
import Animated from 'react-native-reanimated';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';

import { COLORS } from '../../../theme/colors';
import { FONTS, FONT_SIZES } from '../../../constants/typography';
import { OVERLAYS } from '../../../theme/shadows';
import { EvaIcon } from '../../icons';
import { proposalStyles, styles, BLUE, BOX_BG, BOX_BORDER } from './ProposalReviewView.styles';

// Section accent — merged Lifestyle & Beliefs
const ACCENT_LIFESTYLE_BELIEFS = '#F97316'; // orange
import { MatchResult } from '../../../utils/proposalMatching';
import { SectionCard, ComparisonValueRow } from './SmartPillCloud';
import { getOptimizedPhotoUrl } from '../../../utils/imageUtils';

// ─── ProgressDots ────────────────────────────────────────────────────────────

interface ProgressDotsProps {
  proposals: { id: string }[];
  currentIndex: number;
  activeDotStyle: any;
}

export function ProgressDots({ proposals, currentIndex, activeDotStyle }: ProgressDotsProps) {
  return (
    <View style={styles.progressDotsRow}>
      {proposals.map((_, i) => {
        const isActive = i === currentIndex;
        const isPast = i < currentIndex;
        const dotStyle = {
          height: 10,
          width: 40,
          borderRadius: 5,
          backgroundColor: isActive ? BLUE : isPast ? COLORS.primaryAccent : COLORS.tier1.bg,
        };
        return isActive ? (
          <Animated.View key={`dot-${i}`} style={[dotStyle, activeDotStyle]} />
        ) : (
          <View key={`dot-${i}`} style={dotStyle} />
        );
      })}
      {proposals.length > 1 && (
        <Text style={styles.progressLabel}>
          {currentIndex + 1} of {proposals.length}
        </Text>
      )}
    </View>
  );
}

// ─── VoteButtons ─────────────────────────────────────────────────────────────

interface VoteButtonsProps {
  voting: boolean;
  handleVote: (vote: 'yes' | 'no') => void;
  handleForFriendPress: () => void;
  yesButtonAnimatedStyle: any;
  noButtonAnimatedStyle: any;
  recommendButtonAnimatedStyle: any;
  bottomInset?: number;
}

export function VoteButtons({
  voting,
  handleVote,
  handleForFriendPress,
  yesButtonAnimatedStyle,
  noButtonAnimatedStyle,
  recommendButtonAnimatedStyle,
  bottomInset = 0,
}: VoteButtonsProps) {
  return (
    <View style={[styles.voteContainer, { paddingBottom: bottomInset > 0 ? Math.round(bottomInset * 0.5) : 8 }]}>
      {/* Yes button — primary action, largest touch target */}
      <Animated.View style={yesButtonAnimatedStyle}>
        <TouchableOpacity
          onPress={() => handleVote('yes')}
          disabled={voting}
          activeOpacity={0.85}
          style={[
            styles.yesButton,
            {
              backgroundColor: voting ? COLORS.tier1.border : BLUE,
              shadowColor: BLUE,
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: voting ? 0 : 0.3,
              shadowRadius: 8,
              elevation: voting ? 0 : 4,
            },
          ]}
          accessibilityRole="button"
          accessibilityLabel="Vote yes"
          accessibilityState={{ disabled: voting }}
        >
          <EvaIcon name="checkmark" variant="outline" size={20} color={COLORS.card} />
          <Text style={styles.yesButtonText}>Yes</Text>
        </TouchableOpacity>
      </Animated.View>

      {/* No / Recommend — secondary row, horizontal layout */}
      <View style={styles.secondaryButtonsRow}>
        {/* No */}
        <Animated.View style={noButtonAnimatedStyle}>
          <TouchableOpacity
            onPress={() => handleVote('no')}
            disabled={voting}
            activeOpacity={0.8}
            style={[styles.secondaryButton, voting && { opacity: 0.5 }]}
            accessibilityRole="button"
            accessibilityLabel="Vote no"
            accessibilityState={{ disabled: voting }}
          >
            <EvaIcon name="close" variant="outline" size={16} color={COLORS.text.muted} />
            <Text style={styles.secondaryButtonText}>No</Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Recommend */}
        <Animated.View style={recommendButtonAnimatedStyle}>
          <TouchableOpacity
            onPress={handleForFriendPress}
            disabled={voting}
            activeOpacity={0.8}
            style={[styles.secondaryButton, voting && { opacity: 0.5 }]}
            accessibilityRole="button"
            accessibilityLabel="Recommend to a friend"
            accessibilityState={{ disabled: voting }}
          >
            <EvaIcon name="person-add" variant="outline" size={16} color={COLORS.text.muted} />
            <Text style={styles.secondaryButtonText}>Recommend</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </View>
  );
}

// ─── ForFriendModal ──────────────────────────────────────────────────────────

interface ForFriendModalProps {
  visible: boolean;
  forFriendStep: 1 | 2;
  userA: { firstName: string; age?: number; id: string };
  userB: { firstName: string; age?: number; id: string };
  photoAUrl: string | undefined;
  photoBUrl: string | undefined;
  photoABlurhash?: string;
  photoBBlurhash?: string;
  proposalId: string;
  selectedPersonSide: 'userA' | 'userB' | null;
  selectedFriendId: string | null;
  friendsList: any[];
  loadingFriends: boolean;
  onPersonSelect: (side: 'userA' | 'userB') => void;
  onFriendSelect: (friendId: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
}

export function ForFriendModal({
  visible,
  forFriendStep,
  userA,
  userB,
  photoAUrl,
  photoBUrl,
  photoABlurhash,
  photoBBlurhash,
  proposalId,
  selectedPersonSide,
  selectedFriendId,
  friendsList,
  loadingFriends,
  onPersonSelect,
  onFriendSelect,
  onCancel,
  onConfirm,
}: ForFriendModalProps) {
  // Filter out the recommended person from the friend list
  const recPersonId = selectedPersonSide === 'userA' ? userA.id : userB.id;
  const filteredFriends = friendsList.filter(item => item.friendId !== recPersonId);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={{
        ...styles.modalOverlay,
        backgroundColor: OVERLAYS.medium,
      }}>
        <View style={styles.modalCard}>

          {forFriendStep === 1 ? (
            /* ── Step 1: Pick which person to recommend ── */
            <View style={styles.modalContent}>
              <Text style={styles.modalHeading}>Recommend</Text>
              <Text style={styles.modalSubtext}>Who would you like to recommend?</Text>

              <View style={styles.modalPersonRow}>
                {/* UserA card */}
                <TouchableOpacity
                  onPress={() => onPersonSelect('userA')}
                  activeOpacity={0.85}
                  style={styles.modalPersonCard}
                >
                  <Image
                    source={photoAUrl ? { uri: photoAUrl } : null}
                    placeholder={photoABlurhash ? { blurhash: photoABlurhash } : undefined}
                    style={{ width: '100%', height: '100%', backgroundColor: COLORS.backgroundGrayMedium }}
                    contentFit="cover"
                    transition={300}
                    cachePolicy="memory-disk"
                    priority="high"
                    recyclingKey={`${proposalId}-modal-a`}
                  />
                  <LinearGradient
                    colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.82)']}
                    style={styles.modalPersonGradient}
                  />
                  <View style={styles.modalPersonInfo}>
                    <Text style={styles.modalPersonName}>{userA.firstName}</Text>
                    {userA.age ? <Text style={styles.modalPersonAge}>{userA.age} yrs</Text> : null}
                  </View>
                </TouchableOpacity>

                {/* UserB card */}
                <TouchableOpacity
                  onPress={() => onPersonSelect('userB')}
                  activeOpacity={0.85}
                  style={styles.modalPersonCard}
                >
                  <Image
                    source={photoBUrl ? { uri: photoBUrl } : null}
                    placeholder={photoBBlurhash ? { blurhash: photoBBlurhash } : undefined}
                    style={{ width: '100%', height: '100%', backgroundColor: COLORS.backgroundGrayMedium }}
                    contentFit="cover"
                    transition={300}
                    cachePolicy="memory-disk"
                    priority="high"
                    recyclingKey={`${proposalId}-modal-b`}
                  />
                  <LinearGradient
                    colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.82)']}
                    style={styles.modalPersonGradient}
                  />
                  <View style={styles.modalPersonInfo}>
                    <Text style={styles.modalPersonName}>{userB.firstName}</Text>
                    {userB.age ? <Text style={styles.modalPersonAge}>{userB.age} yrs</Text> : null}
                  </View>
                </TouchableOpacity>
              </View>

              <TouchableOpacity onPress={onCancel} style={styles.modalCancelLink}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>

          ) : (
            /* ── Step 2: Pick a friend ── */
            <View>
              <View style={styles.modalStep2Header}>
                <Text style={styles.modalHeading}>Send to a Friend</Text>
                <Text style={styles.modalSubtextNoMargin}>
                  Recommend {selectedPersonSide === 'userA' ? userA.firstName : userB.firstName} to...
                </Text>
              </View>

              {loadingFriends ? (
                <View style={styles.modalLoadingContainer}>
                  <ActivityIndicator size="large" color={BLUE} />
                </View>
              ) : filteredFriends.length === 0 ? (
                <View style={styles.modalLoadingContainer}>
                  <EvaIcon name="people" variant="outline" size={32} color={COLORS.text.disabled} />
                  <Text style={{ fontFamily: FONTS.medium, fontSize: FONT_SIZES.base, color: COLORS.text.secondary, textAlign: 'center', marginTop: 12, paddingHorizontal: 24 }}>
                    No friends to recommend to yet. Add friends first!
                  </Text>
                </View>
              ) : (
                <ScrollView
                  style={styles.modalFriendsList}
                  contentContainerStyle={styles.modalFriendsContent}
                  showsVerticalScrollIndicator={false}
                >
                  {filteredFriends.map(item => {
                    const isSelected = selectedFriendId === item.friendId;
                    const friendPhoto = getOptimizedPhotoUrl(item.friend?.photos?.[0]?.url, 'avatar');
                    const friendBlurhash = item.friend?.photos?.[0]?.blurhash;
                    return (
                      <TouchableOpacity
                        key={item.friendId}
                        onPress={() => onFriendSelect(item.friendId)}
                        activeOpacity={0.8}
                        style={[
                          styles.modalFriendItem,
                          {
                            backgroundColor: isSelected ? 'rgba(37, 99, 235, 0.07)' : BOX_BG,
                            borderColor: isSelected ? BLUE : BOX_BORDER,
                          },
                        ]}
                      >
                        <Image
                          source={friendPhoto ? { uri: friendPhoto } : null}
                          placeholder={friendBlurhash ? { blurhash: friendBlurhash } : undefined}
                          style={[styles.modalFriendAvatar, { backgroundColor: COLORS.backgroundGrayMedium }]}
                          contentFit="cover"
                          transition={300}
                          cachePolicy="memory-disk"
                        />
                        <View style={{ flex: 1 }}>
                          <Text style={styles.modalFriendName}>{item.friend?.firstName}</Text>
                          {item.friend?.currentJob ? (
                            <Text style={styles.modalFriendJob} numberOfLines={1}>
                              {item.friend.currentJob}
                            </Text>
                          ) : null}
                        </View>
                        {isSelected && (
                          <View style={styles.modalCheckCircle}>
                            <EvaIcon name="checkmark" variant="outline" size={14} color={COLORS.card} />
                          </View>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              )}

              {/* Cancel / Confirm */}
              <View style={styles.modalFooter}>
                <TouchableOpacity
                  onPress={onCancel}
                  activeOpacity={0.8}
                  style={[styles.modalFooterBtn, { borderWidth: 1, borderColor: BOX_BORDER, backgroundColor: BOX_BG }]}
                >
                  <Text style={styles.modalCancelText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={onConfirm}
                  disabled={!selectedFriendId}
                  activeOpacity={0.85}
                  style={[styles.modalFooterBtn, { backgroundColor: selectedFriendId ? BLUE : COLORS.tier1.bg }]}
                >
                  <Text style={styles.modalFooterBtnText}>Confirm</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

        </View>
      </View>
    </Modal>
  );
}

// ─── LifestyleBeliefsSection (merged) ────────────────────────────────────────

interface LifestyleBeliefsSectionProps {
  lifestyleResults: MatchResult[];
  drinkResult: MatchResult;
  weedResult: MatchResult;
  tobaccoResult: MatchResult;
  otherSubstancesResult: MatchResult;
  beliefsResults: MatchResult[];
  politicsResult: MatchResult;
  religionResult: MatchResult;
}

export function LifestyleBeliefsSection({
  lifestyleResults,
  drinkResult,
  weedResult,
  tobaccoResult,
  otherSubstancesResult,
  beliefsResults,
  politicsResult,
  religionResult,
}: LifestyleBeliefsSectionProps) {
  const allResults = [...lifestyleResults, ...beliefsResults];
  const countMatch = (results: MatchResult[]) =>
    results.filter(r => r.status === 'both_happy').length;
  const countKnown = (results: MatchResult[]) =>
    results.filter(r => r.status !== 'unknown').length;

  const knownResults = allResults.filter(r => r.status !== 'unknown');
  if (knownResults.length === 0) return null;

  return (
    <SectionCard
      title="Lifestyle & Beliefs"
      matched={countMatch(knownResults)}
      total={countKnown(allResults)}
      accentColor={ACCENT_LIFESTYLE_BELIEFS}
    >
      {drinkResult.status !== 'unknown' && (
        <ComparisonValueRow result={drinkResult} label="Drink" />
      )}
      {weedResult.status !== 'unknown' && (
        <ComparisonValueRow result={weedResult} label="Weed" />
      )}
      {tobaccoResult.status !== 'unknown' && (
        <ComparisonValueRow result={tobaccoResult} label="Tobacco" />
      )}
      {otherSubstancesResult.status !== 'unknown' && (
        <ComparisonValueRow result={otherSubstancesResult} label="Other Substances" />
      )}
      {politicsResult.status !== 'unknown' && (
        <ComparisonValueRow result={politicsResult} label="Politics" />
      )}
      {religionResult.status !== 'unknown' && (
        <ComparisonValueRow result={religionResult} label="Religion" />
      )}
    </SectionCard>
  );
}
