/**
 * ProposalReviewView Component
 *
 * Sequential proposal voting interface matching Figma design.
 *
 * Features:
 * - Shows ONE proposal per screen (sequential flow)
 * - Progress indicator (1 of 3, 2 of 3, 3 of 3)
 * - Split photo header with compatibility badge
 * - Live vote bar with animated counts
 * - Deep Questions section with card-reveal mechanic
 * - Smart pill matching for Interests & Values
 * - Section cards: Questions, Interests, Values, Lifestyle, Beliefs
 * - Vote buttons: Yes (primary) + No / For Friend / Not Sure (secondary)
 * - Auto-advances after each vote, navigates to Friends Area after 3rd vote
 * - +1 Karma popup on vote
 */

import { FONTS } from '../../../constants/typography';
import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Platform,
  UIManager,
  Dimensions,
  Modal,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { Image, ImageBackground } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { GuideTarget } from '../../guides';
import { UserProfile } from '../../../types';
import { Proposal, CommunityTask } from '../../../types/community';
import { MatchResult, MatchStatus } from '../../../utils/proposalMatching';
import { RateLimiter } from '../../../utils/inputValidation';
import { showToast } from '../../../utils/toast';
import {
  matchAge,
  matchHeight,
  matchEthnicity,
  matchPolitics,
  matchReligion,
  matchDrinking,
  matchCannabis,
  matchTobacco,
  matchOtherSubstances,
  matchValues,
  matchInterests,
} from '../../../utils/proposalMatching';
import { communityService } from '../../../services/communityServiceIndex';
import { createLogger } from '../../../utils/secureLogger';
import { OVERLAYS } from '../../../theme/shadows';
import { getQuestionById } from '../../../utils/deepQuestions';

const logger = createLogger('ProposalReviewView');

// ─── Pure helpers (no component state) ────────────────────────────────────────
const countMatch = (results: MatchResult[]) =>
  results.filter(r => r.status === 'both_happy').length;
const countKnown = (results: MatchResult[]) =>
  results.filter(r => r.status !== 'unknown').length;

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const SCREEN_WIDTH = Dimensions.get('window').width;
const DIVIDER_WIDTH = 13;
const PHOTO_WIDTH = (SCREEN_WIDTH - 32 - DIVIDER_WIDTH) / 2;
const PHOTO_HEIGHT = 300;
const PHOTO_RADIUS = 16;

// ─── Design tokens ────────────────────────────────────────────────────────────
const BLUE = '#2563EB';
const GREEN = '#34C759';
const RED = '#FF383C';
const AMBER = '#FFCC00';
const GREEN_BG = 'rgba(52, 199, 89, 0.1)';
const RED_BG = 'rgba(255, 56, 60, 0.1)';
const AMBER_BG = 'rgba(255, 204, 0, 0.1)';
const BOX_BG = 'rgba(1, 1, 1, 0.02)';
const BOX_BORDER = 'rgba(1, 1, 1, 0.04)';
const CARD_BORDER = 'rgba(1, 1, 1, 0.1)';
const SCROLL_CONTENT_STYLE = { paddingHorizontal: 16, paddingBottom: 160 } as const;
const TAG_BG = 'rgba(1, 1, 1, 0.02)';
const GREY_VOTE = '#9CA3AF';

// ─── Similarity maps for smart pill matching ──────────────────────────────────
const INTERESTS_SIMILARITY: Record<string, string[]> = {
  'Baking': ['Cooking'],
  'Cooking': ['Baking'],
  'Lifting': ['Yoga', 'Pilates', 'Climbing', 'Swimming', 'Running', 'Cycling', 'Fitness'],
  'Yoga': ['Lifting', 'Pilates', 'Wellness', 'Fitness'],
  'Pilates': ['Lifting', 'Yoga', 'Wellness', 'Fitness'],
  'Climbing': ['Lifting', 'Hiking', 'Skiing', 'Fitness'],
  'Swimming': ['Lifting', 'Fitness'],
  'Running': ['Lifting', 'Cycling', 'Fitness'],
  'Cycling': ['Lifting', 'Running', 'Fitness'],
  'Fitness': ['Lifting', 'Yoga', 'Pilates', 'Climbing', 'Swimming', 'Running', 'Cycling'],
  'Live Sports': ['Watching Sports', 'Soccer', 'Basketball', 'Tennis', 'Golf'],
  'Watching Sports': ['Live Sports', 'Soccer', 'Basketball', 'Tennis', 'Golf'],
  'Soccer': ['Live Sports', 'Watching Sports', 'Basketball', 'Tennis', 'Golf'],
  'Basketball': ['Live Sports', 'Watching Sports', 'Soccer', 'Tennis', 'Golf'],
  'Tennis': ['Live Sports', 'Watching Sports', 'Soccer', 'Basketball', 'Golf'],
  'Golf': ['Live Sports', 'Watching Sports', 'Soccer', 'Basketball', 'Tennis'],
  'Coffee': ['Fine Dining', 'Dinner Parties'],
  'Fine Dining': ['Coffee', 'Dinner Parties'],
  'Dinner Parties': ['Coffee', 'Fine Dining'],
  'Travel': ['International Travel', 'Weekend Trips', 'Camping', 'Hiking'],
  'International Travel': ['Travel', 'Weekend Trips', 'Camping', 'Hiking'],
  'Weekend Trips': ['Travel', 'International Travel', 'Camping', 'Hiking'],
  'Camping': ['Travel', 'International Travel', 'Weekend Trips', 'Hiking'],
  'Hiking': ['Travel', 'International Travel', 'Weekend Trips', 'Camping', 'Skiing', 'Climbing'],
  'Karaoke': ['Live Music', 'Concerts', 'Music', 'Dancing'],
  'Live Music': ['Karaoke', 'Concerts', 'Music', 'Dancing'],
  'Concerts': ['Karaoke', 'Live Music', 'Music', 'Dancing'],
  'Music': ['Karaoke', 'Live Music', 'Concerts', 'Dancing'],
  'Dancing': ['Karaoke', 'Live Music', 'Concerts', 'Music'],
  'Game Nights': ['Video Games', 'Poker'],
  'Video Games': ['Game Nights', 'Poker'],
  'Poker': ['Game Nights', 'Video Games'],
  'Art Galleries': ['Museums', 'Photography', 'Film'],
  'Museums': ['Art Galleries', 'Photography', 'Film'],
  'Photography': ['Art Galleries', 'Museums', 'Film'],
  'Film': ['Art Galleries', 'Museums', 'Photography'],
  'Reading': ['Writing'],
  'Writing': ['Reading'],
  'Wellness': ['Yoga', 'Pilates'],
  'Skiing': ['Hiking', 'Climbing'],
};

const VALUES_SIMILARITY: Record<string, string[]> = {
  'Honesty': ['Integrity', 'Authenticity', 'Trust', 'Respect'],
  'Integrity': ['Honesty', 'Authenticity', 'Trust', 'Respect'],
  'Authenticity': ['Honesty', 'Integrity', 'Trust'],
  'Trust': ['Honesty', 'Integrity', 'Authenticity', 'Loyalty'],
  'Loyalty': ['Commitment', 'Trust', 'Friendship First'],
  'Commitment': ['Loyalty', 'Trust', 'Stability', 'Friendship First'],
  'Friendship First': ['Loyalty', 'Commitment', 'Community', 'Kindness'],
  'Independence': ['Ambition', 'Career', 'Leadership'],
  'Ambition': ['Independence', 'Career', 'Leadership', 'Growth Mindset', 'Success'],
  'Career': ['Independence', 'Ambition', 'Leadership', 'Success'],
  'Leadership': ['Independence', 'Ambition', 'Career'],
  'Empathy': ['Kindness', 'Emotional Intelligence', 'Communication'],
  'Kindness': ['Empathy', 'Emotional Intelligence', 'Communication', 'Community', 'Friendship First'],
  'Emotional Intelligence': ['Empathy', 'Kindness', 'Communication'],
  'Communication': ['Empathy', 'Kindness', 'Emotional Intelligence', 'Romance'],
  'Growth Mindset': ['Self-Improvement', 'Ambition'],
  'Self-Improvement': ['Growth Mindset', 'Ambition'],
  'Stability': ['Work-Life Balance', 'Health', 'Commitment'],
  'Work-Life Balance': ['Stability', 'Health'],
  'Health': ['Stability', 'Work-Life Balance'],
  'Community': ['Friendship First', 'Kindness'],
  'Adventure': ['Creativity'],
  'Creativity': ['Adventure', 'Innovation'],
  'Romance': ['Communication'],
  'Success': ['Ambition', 'Career'],
  'Respect': ['Integrity', 'Honesty'],
  'Innovation': ['Creativity'],
};

// ─── Deep Question Data interface ─────────────────────────────────────────────
export interface DeepQuestionData {
  questionId: number;
  questionText: string;
  userAAnswer?: string;
  userBAnswer?: string;
}

// ─── Smart pill matching helper ───────────────────────────────────────────────
interface SmartPillResult {
  greenPairs: { item: string }[];
  yellowPairs: { itemA: string; itemB: string }[];
  greyA: string[];
  greyB: string[];
  percentMatch: number;
}

function computeSmartPills(
  tagsA: string[],
  tagsB: string[],
  similarityMap: Record<string, string[]>,
): SmartPillResult {
  const setB = new Set(tagsB);
  const setA = new Set(tagsA);

  // Green: exact matches
  const greenPairs: { item: string }[] = [];
  const usedA = new Set<string>();
  const usedB = new Set<string>();

  for (const item of tagsA) {
    if (setB.has(item)) {
      greenPairs.push({ item });
      usedA.add(item);
      usedB.add(item);
    }
  }

  // Yellow: similar matches (only for items not already green-matched)
  const yellowPairs: { itemA: string; itemB: string }[] = [];
  for (const itemA of tagsA) {
    if (usedA.has(itemA)) continue;
    const similars = similarityMap[itemA] || [];
    for (const sim of similars) {
      if (setB.has(sim) && !usedB.has(sim)) {
        yellowPairs.push({ itemA, itemB: sim });
        usedA.add(itemA);
        usedB.add(sim);
        break;
      }
    }
  }

  // Grey: unmatched items
  const greyA = tagsA.filter(t => !usedA.has(t));
  const greyB = tagsB.filter(t => !usedB.has(t));

  // Percentage
  const maxLen = Math.max(tagsA.length, tagsB.length, 1);
  const score = (greenPairs.length * 1.0 + yellowPairs.length * 0.5) / maxLen * 100;
  const percentMatch = Math.round(score);

  return { greenPairs, yellowPairs, greyA, greyB, percentMatch };
}

// ─── Helper: icon for match status ────────────────────────────────────────────
function MatchIcon({ status }: { status: MatchStatus }) {
  if (status === 'both_happy') {
    return <Ionicons name="checkmark" size={20} color={GREEN} />;
  }
  if (status === 'neither_happy') {
    return <Ionicons name="close" size={20} color={RED} />;
  }
  if (status === 'left_happy' || status === 'right_happy') {
    return <Ionicons name="warning" size={18} color="#FFA629" />;
  }
  return null;
}

// ─── Helper: badge for section match score ─────────────────────────────────────
const MatchBadge = React.memo(function MatchBadge({ matched, total }: { matched: number; total: number }) {
  const allMatch = matched === total;
  const noneMatch = matched === 0;
  const bg = allMatch ? GREEN_BG : noneMatch ? RED_BG : AMBER_BG;
  const color = allMatch ? GREEN : noneMatch ? RED : AMBER;
  const label = total === 1
    ? allMatch ? 'Match' : 'No Match'
    : `${matched}/${total} Match`;

  return (
    <View style={{
      backgroundColor: bg,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
    }}>
      <Text style={{
        fontFamily: FONTS.medium,
        fontWeight: '500',
        fontSize: 12,
        color,
      }}>
        {label}
      </Text>
    </View>
  );
});

// ─── Helper: percentage match badge ───────────────────────────────────────────
const PercentBadge = React.memo(function PercentBadge({ percent }: { percent: number }) {
  const allMatch = percent >= 80;
  const noneMatch = percent === 0;
  const bg = allMatch ? GREEN_BG : noneMatch ? RED_BG : AMBER_BG;
  const color = allMatch ? GREEN : noneMatch ? RED : AMBER;

  return (
    <View style={{
      backgroundColor: bg,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
    }}>
      <Text style={{
        fontFamily: FONTS.medium,
        fontWeight: '500',
        fontSize: 12,
        color,
      }}>
        {percent}% Match
      </Text>
    </View>
  );
});

// ─── Helper: section card wrapper ─────────────────────────────────────────────
const SectionCard = React.memo(function SectionCard({
  title,
  matched,
  total,
  percentBadge,
  children,
}: {
  title: string;
  matched?: number;
  total?: number;
  percentBadge?: number;
  children: React.ReactNode;
}) {
  return (
    <View style={{
      backgroundColor: '#FFFFFF',
      borderRadius: 12,
      borderWidth: 1,
      borderColor: CARD_BORDER,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.05,
      shadowRadius: 4,
      elevation: 2,
      padding: 12,
      marginBottom: 16,
    }}>
      {/* Section header */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <Text style={{ fontFamily: FONTS.bold, fontWeight: '700', fontSize: 16, color: BLUE }}>{title}</Text>
        {percentBadge !== undefined ? (
          <PercentBadge percent={percentBadge} />
        ) : matched !== undefined && total !== undefined ? (
          <MatchBadge matched={matched} total={total} />
        ) : null}
      </View>
      {children}
    </View>
  );
});

// ─── Helper: value box (138px, shows label + value) ───────────────────────────
function ValueBox({ label, value }: { label: string; value: string }) {
  return (
    <View style={{
      flex: 1,
      height: 58,
      backgroundColor: BOX_BG,
      borderWidth: 1,
      borderColor: BOX_BORDER,
      borderRadius: 12,
      padding: 10,
      justifyContent: 'space-between',
    }}>
      <Text style={{ fontFamily: FONTS.regular, fontWeight: '400', fontSize: 13, color: '#6B7280' }}>{label}</Text>
      <Text style={{ fontFamily: FONTS.semiBold, fontWeight: '600', fontSize: 15, color: '#010101' }} numberOfLines={1}>{value || '—'}</Text>
    </View>
  );
}

// ─── Helper: single comparison row (value + icon + value) ─────────────────────
function ComparisonValueRow({ result, label }: { result: MatchResult; label: string }) {
  if (result.status === 'unknown') return null;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 }}>
      <ValueBox label={label} value={result.leftValue} />
      <MatchIcon status={result.status} />
      <ValueBox label={label} value={result.rightValue} />
    </View>
  );
}

// ─── Helper: tag pill ─────────────────────────────────────────────────────────
function TagPill({ label }: { label: string }) {
  return (
    <View style={{
      backgroundColor: TAG_BG,
      borderWidth: 1,
      borderColor: BOX_BORDER,
      borderRadius: 40,
      paddingHorizontal: 10,
      paddingVertical: 6,
      alignSelf: 'flex-start',
    }}>
      <Text style={{ fontFamily: FONTS.medium, fontWeight: '500', fontSize: 14, color: '#010101', opacity: 0.85 }}>{label}</Text>
    </View>
  );
}

// ─── Helper: green pill (exact match) ─────────────────────────────────────────
function GreenPill({ label }: { label: string }) {
  return (
    <View style={{
      backgroundColor: '#EDFCF2',
      borderWidth: 1,
      borderColor: GREEN,
      borderRadius: 40,
      paddingHorizontal: 10,
      paddingVertical: 6,
      alignSelf: 'flex-start',
    }}>
      <Text style={{ fontFamily: FONTS.medium, fontWeight: '500', fontSize: 14, color: GREEN }}>{label}</Text>
    </View>
  );
}

// ─── Helper: yellow pill (similar match) ──────────────────────────────────────
function YellowPill({ label }: { label: string }) {
  return (
    <View style={{
      backgroundColor: '#FFFBEB',
      borderWidth: 1,
      borderColor: '#F59E0B',
      borderRadius: 40,
      paddingHorizontal: 10,
      paddingVertical: 6,
      alignSelf: 'flex-start',
    }}>
      <Text style={{ fontFamily: FONTS.medium, fontWeight: '500', fontSize: 14, color: '#92400E' }}>{label}</Text>
    </View>
  );
}

// ─── Helper: ethnicity comparison row (tag pills + icon + tag pills) ───────────
function EthnicityComparisonRow({ result }: { result: MatchResult }) {
  if (result.status === 'unknown') return null;
  const leftTags = result.leftValue ? [result.leftValue] : [];
  const rightTags = result.rightValue ? [result.rightValue] : [];

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      <View style={{ flex: 1, flexDirection: 'row', flexWrap: 'wrap' }}>
        {leftTags.map((t) => <TagPill key={t} label={t} />)}
      </View>
      <MatchIcon status={result.status} />
      <View style={{ flex: 1, flexDirection: 'row', flexWrap: 'wrap' }}>
        {rightTags.map((t) => <TagPill key={t} label={t} />)}
      </View>
    </View>
  );
}

// ─── Helper: tag cloud section (two columns with vertical stacking + divider) ──
function TagCloudSection({ leftTags, rightTags }: { leftTags: string[]; rightTags: string[] }) {
  return (
    <View style={{ flexDirection: 'row', gap: 0 }}>
      {/* Left Column */}
      <View style={{ flex: 1, gap: 6 }}>
        {leftTags.map((t) => <TagPill key={t} label={t} />)}
      </View>

      {/* Divider */}
      <View style={{ width: 1, backgroundColor: '#E2E8F0', marginHorizontal: 10 }} />

      {/* Right Column */}
      <View style={{ flex: 1, gap: 6 }}>
        {rightTags.map((t) => <TagPill key={t} label={t} />)}
      </View>
    </View>
  );
}

// ─── Helper: Smart pill cloud section ─────────────────────────────────────────
function SmartPillCloudSection({
  pillResult,
  userAName,
  userBName,
}: {
  pillResult: SmartPillResult;
  userAName: string;
  userBName: string;
}) {
  const { greenPairs, yellowPairs, greyA, greyB } = pillResult;

  return (
    <View>
      {/* Green pairs (exact matches) */}
      {greenPairs.length > 0 && (
        <View style={{ marginBottom: greenPairs.length > 0 && (yellowPairs.length > 0 || greyA.length > 0 || greyB.length > 0) ? 10 : 0 }}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {greenPairs.map(p => (
              <GreenPill key={`green-${p.item}`} label={p.item} />
            ))}
          </View>
        </View>
      )}

      {/* Yellow pairs (similar matches) */}
      {yellowPairs.length > 0 && (
        <View style={{ marginBottom: yellowPairs.length > 0 && (greyA.length > 0 || greyB.length > 0) ? 10 : 0 }}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {yellowPairs.map(p => (
              <YellowPill
                key={`yellow-${p.itemA}-${p.itemB}`}
                label={`${p.itemA} \u2194 ${p.itemB}`}
              />
            ))}
          </View>
        </View>
      )}

      {/* Grey pills (unique to each person) */}
      {(greyA.length > 0 || greyB.length > 0) && (
        <View style={{ flexDirection: 'row', gap: 0 }}>
          <View style={{ flex: 1, gap: 6 }}>
            {greyA.length > 0 && (
              <Text style={{ fontFamily: FONTS.regular, fontSize: 11, color: '#9CA3AF', marginBottom: 4 }}>{userAName}</Text>
            )}
            {greyA.map(t => <TagPill key={`greyA-${t}`} label={t} />)}
          </View>
          <View style={{ width: 1, backgroundColor: '#E2E8F0', marginHorizontal: 10 }} />
          <View style={{ flex: 1, gap: 6 }}>
            {greyB.length > 0 && (
              <Text style={{ fontFamily: FONTS.regular, fontSize: 11, color: '#9CA3AF', marginBottom: 4 }}>{userBName}</Text>
            )}
            {greyB.map(t => <TagPill key={`greyB-${t}`} label={t} />)}
          </View>
        </View>
      )}
    </View>
  );
}

// ─── Helper: Photo card with optional carousel ──────────────────────────────
function ProposalPhotoCard({
  photos,
  name,
  age,
  width,
  height,
  side,
  proposalId,
}: {
  photos: Array<{ url?: string; isMain?: boolean }>;
  name: string;
  age?: number;
  width: number;
  height: number;
  side: 'left' | 'right';
  proposalId: string;
}) {
  const [currentPage, setCurrentPage] = useState(0);
  const validPhotos = (photos || []).filter((p: any) => p.url);
  const showCarousel = validPhotos.length > 1;
  const mainPhoto = validPhotos.find((p: any) => p.isMain) || validPhotos[0];

  const handleScroll = useCallback((e: any) => {
    const page = Math.round(e.nativeEvent.contentOffset.x / width);
    setCurrentPage(page);
  }, [width]);

  const borderRadiusStyle = side === 'left'
    ? { borderTopLeftRadius: PHOTO_RADIUS, borderBottomLeftRadius: PHOTO_RADIUS, borderTopRightRadius: 0, borderBottomRightRadius: 0 }
    : { borderTopLeftRadius: 0, borderBottomLeftRadius: 0, borderTopRightRadius: PHOTO_RADIUS, borderBottomRightRadius: PHOTO_RADIUS };

  return (
    <View style={{ width, height, ...borderRadiusStyle, overflow: 'hidden' }}>
      {showCarousel ? (
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={handleScroll}
          bounces={false}
          style={{ width, height }}
        >
          {validPhotos.map((photo: any, i: number) => (
            <Image
              key={`${proposalId}-${side}-${i}`}
              source={{ uri: photo.url }}
              style={{ width, height }}
              contentFit="cover"
              transition={200}
              cachePolicy="disk"
              recyclingKey={`${proposalId}-${side}-${i}`}
            />
          ))}
        </ScrollView>
      ) : (
        <Image
          source={{ uri: mainPhoto?.url || 'https://via.placeholder.com/200' }}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, ...borderRadiusStyle }}
          contentFit="cover"
          transition={200}
          cachePolicy="disk"
          recyclingKey={`${proposalId}-${side}`}
        />
      )}
      <LinearGradient
        colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.65)', 'rgba(0,0,0,0.92)']}
        locations={[0.45, 0.75, 1]}
        style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 130 }}
        pointerEvents="none"
      />
      {showCarousel && (
        <View
          style={{
            position: 'absolute',
            top: 10,
            left: 0,
            right: 0,
            flexDirection: 'row',
            justifyContent: 'center',
            gap: 4,
          }}
          pointerEvents="none"
        >
          {validPhotos.map((_: any, i: number) => (
            <View
              key={`dot-${side}-${i}`}
              style={{
                width: i === currentPage ? 18 : 6,
                height: 4,
                borderRadius: 2,
                backgroundColor: i === currentPage ? '#FFFFFF' : 'rgba(255,255,255,0.45)',
              }}
            />
          ))}
        </View>
      )}
      <View style={{ position: 'absolute', bottom: 14, left: 14 }} pointerEvents="none">
        <Text style={{ fontFamily: FONTS.bold, fontWeight: '700', fontSize: 28, color: '#FFF', letterSpacing: -0.3 }}>
          {name}{age ? `, ${age}` : ''}
        </Text>
      </View>
    </View>
  );
}

// ─── Helper: Single reveal card inside a carousel page ───────────────────────
function RevealCardInline({
  name,
  answer,
  revealed,
  onReveal,
  scale,
  side,
}: {
  name: string;
  answer: string;
  revealed: boolean;
  onReveal: () => void;
  scale: Animated.Value;
  side: 'left' | 'right' | 'solo';
}) {
  const minH = side === 'solo' ? 70 : 90;
  return (
    <TouchableOpacity
      onPress={onReveal}
      activeOpacity={revealed ? 1 : 0.7}
      style={{ flex: side === 'solo' ? undefined : 1 }}
    >
      <Animated.View style={{
        minHeight: minH,
        borderRadius: 10,
        padding: 12,
        justifyContent: 'center',
        transform: [{ scale }],
        ...(revealed
          ? { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#CBD5E1' }
          : { backgroundColor: '#0F172A', borderWidth: 1, borderColor: 'rgba(99, 131, 255, 0.2)' }),
      }}>
        {revealed ? (
          <>
            <Text style={{
              fontFamily: FONTS.medium, fontWeight: '500', fontSize: 11,
              color: BLUE, marginBottom: 6,
            }}>{name}</Text>
            <Text style={{
              fontFamily: FONTS.regular, fontSize: 13,
              color: '#334155', lineHeight: 18,
            }}>{answer}</Text>
          </>
        ) : side === 'solo' ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={{
              width: 36, height: 36, borderRadius: 18,
              backgroundColor: 'rgba(99, 131, 255, 0.2)',
              alignItems: 'center', justifyContent: 'center',
            }}>
              <Text style={{ fontFamily: FONTS.bold, fontSize: 16, color: '#93A8FF' }}>?</Text>
            </View>
            <View>
              <Text style={{ fontFamily: FONTS.medium, fontSize: 13, color: '#FFFFFF' }}>{name}</Text>
              <Text style={{ fontFamily: FONTS.regular, fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>Tap to reveal</Text>
            </View>
          </View>
        ) : (
          <View style={{ alignItems: 'center' }}>
            <View style={{
              width: 38, height: 38, borderRadius: 19,
              backgroundColor: 'rgba(99, 131, 255, 0.2)',
              alignItems: 'center', justifyContent: 'center', marginBottom: 8,
            }}>
              <Text style={{ fontFamily: FONTS.bold, fontSize: 18, color: '#93A8FF' }}>?</Text>
            </View>
            <Text style={{ fontFamily: FONTS.medium, fontSize: 12, color: 'rgba(255,255,255,0.75)' }}>{name}</Text>
          </View>
        )}
      </Animated.View>
    </TouchableOpacity>
  );
}

// ─── Helper: Question Carousel — swipeable card deck ─────────────────────────
const CAROUSEL_CONTENT_WIDTH = SCREEN_WIDTH - 32 - 24; // SectionCard padding (12*2) + outer padding (16*2)

function QuestionCarousel({
  questions,
  userAName,
  userBName,
}: {
  questions: DeepQuestionData[];
  userAName: string;
  userBName: string;
}) {
  const [currentPage, setCurrentPage] = useState(0);
  const total = questions.length;

  const onScroll = useCallback((e: any) => {
    const page = Math.round(e.nativeEvent.contentOffset.x / CAROUSEL_CONTENT_WIDTH);
    setCurrentPage(page);
  }, []);

  return (
    <View>
      {/* Carousel */}
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onScroll}
        decelerationRate="fast"
        snapToInterval={CAROUSEL_CONTENT_WIDTH}
        contentContainerStyle={{ gap: 0 }}
      >
        {questions.map((q, idx) => (
          <QuestionPage
            key={`qp-${q.questionId}`}
            question={q}
            userAName={userAName}
            userBName={userBName}
            width={CAROUSEL_CONTENT_WIDTH}
          />
        ))}
      </ScrollView>

      {/* Dots + counter */}
      {total > 1 && (
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 12, gap: 6 }}>
          {questions.map((_, i) => (
            <View
              key={`qdot-${i}`}
              style={{
                width: i === currentPage ? 18 : 6,
                height: 6,
                borderRadius: 3,
                backgroundColor: i === currentPage ? BLUE : '#D1D5DB',
              }}
            />
          ))}
          <Text style={{
            fontFamily: FONTS.medium, fontSize: 11,
            color: '#9CA3AF', marginLeft: 6,
          }}>
            {currentPage + 1}/{total}
          </Text>
        </View>
      )}
    </View>
  );
}

// ─── Helper: Single page inside question carousel ────────────────────────────
function QuestionPage({
  question,
  userAName,
  userBName,
  width,
}: {
  question: DeepQuestionData;
  userAName: string;
  userBName: string;
  width: number;
}) {
  const hasA = !!question.userAAnswer;
  const hasB = !!question.userBAnswer;
  const bothAnswered = hasA && hasB;
  const [revealedA, setRevealedA] = useState(false);
  const [revealedB, setRevealedB] = useState(false);

  const scaleA = useRef(new Animated.Value(1)).current;
  const scaleB = useRef(new Animated.Value(1)).current;

  const revealA = useCallback(() => {
    if (revealedA || !hasA) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    Animated.sequence([
      Animated.timing(scaleA, { toValue: 0.92, duration: 80, useNativeDriver: true }),
      Animated.spring(scaleA, { toValue: 1, friction: 4, tension: 120, useNativeDriver: true }),
    ]).start();
    setRevealedA(true);
  }, [revealedA, hasA, scaleA]);

  const revealB = useCallback(() => {
    if (revealedB || !hasB) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    Animated.sequence([
      Animated.timing(scaleB, { toValue: 0.92, duration: 80, useNativeDriver: true }),
      Animated.spring(scaleB, { toValue: 1, friction: 4, tension: 120, useNativeDriver: true }),
    ]).start();
    setRevealedB(true);
  }, [revealedB, hasB, scaleB]);

  return (
    <View style={{ width, paddingRight: 0 }}>
      <View style={{
        backgroundColor: '#F8FAFC',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        padding: 14,
      }}>
          <Text style={{
            fontFamily: FONTS.semiBold, fontWeight: '600',
            fontSize: 14, color: '#1E293B', marginBottom: 12, lineHeight: 20,
          }}>
            {question.questionText}
          </Text>

          {bothAnswered ? (
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <RevealCardInline name={userAName} answer={question.userAAnswer!} revealed={revealedA} onReveal={revealA} scale={scaleA} side="left" />
              <RevealCardInline name={userBName} answer={question.userBAnswer!} revealed={revealedB} onReveal={revealB} scale={scaleB} side="right" />
            </View>
          ) : hasA ? (
            <RevealCardInline name={userAName} answer={question.userAAnswer!} revealed={revealedA} onReveal={revealA} scale={scaleA} side="solo" />
          ) : (
            <RevealCardInline name={userBName} answer={question.userBAnswer!} revealed={revealedB} onReveal={revealB} scale={scaleB} side="solo" />
          )}
      </View>
    </View>
  );
}

// ─── Helper: Live Vote Bar ────────────────────────────────────────────────────
function LiveVoteBar({
  yesVotes,
  noVotes,
  totalVotes,
}: {
  yesVotes: number;
  noVotes: number;
  totalVotes: number;
}) {
  const unsureVotes = Math.max(0, totalVotes - yesVotes - noVotes);
  const total = yesVotes + noVotes + unsureVotes;

  // Animated widths (JS-driven, not native driver)
  const yesWidth = useRef(new Animated.Value(0)).current;
  const noWidth = useRef(new Animated.Value(0)).current;
  const unsureWidth = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (total === 0) return;
    const yesPct = (yesVotes / total) * 100;
    const noPct = (noVotes / total) * 100;
    const unsurePct = (unsureVotes / total) * 100;

    Animated.parallel([
      Animated.timing(yesWidth, { toValue: yesPct, duration: 400, useNativeDriver: false }),
      Animated.timing(noWidth, { toValue: noPct, duration: 400, useNativeDriver: false }),
      Animated.timing(unsureWidth, { toValue: unsurePct, duration: 400, useNativeDriver: false }),
    ]).start();
  }, [yesVotes, noVotes, unsureVotes, total, yesWidth, noWidth, unsureWidth]);

  if (total === 0) {
    return (
      <View style={{ marginTop: 10, marginBottom: 4, alignItems: 'center' }}>
        {/* Empty capsule bar */}
        <View style={{
          height: 14, borderRadius: 7, width: '100%', marginBottom: 8,
          backgroundColor: '#F1F5F9',
          shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.06, shadowRadius: 2, elevation: 1,
          overflow: 'hidden',
        }}>
          {/* Top highlight for 3D capsule */}
          <LinearGradient
            colors={['rgba(255,255,255,0.8)', 'rgba(255,255,255,0)', 'rgba(0,0,0,0.03)']}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
          />
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: BLUE }} />
          <Text style={{ fontFamily: FONTS.medium, fontSize: 12, color: BLUE }}>
            Be the first to weigh in!
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={{ marginTop: 10, marginBottom: 4 }}>
      {/* Liquid 3D capsule bar */}
      <View style={{
        height: 14, borderRadius: 7, overflow: 'hidden',
        backgroundColor: '#F1F5F9',
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08, shadowRadius: 3, elevation: 2,
      }}>
        {/* Inner shadow (bottom darkening for depth) */}
        <LinearGradient
          colors={['rgba(0,0,0,0.04)', 'transparent', 'rgba(0,0,0,0.06)']}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 0 }}
        />
        {/* Colored segments */}
        <View style={{ flexDirection: 'row', height: 14, zIndex: 1 }}>
          {yesVotes > 0 && (
            <Animated.View style={{
              height: 14,
              overflow: 'hidden',
              width: yesWidth.interpolate({
                inputRange: [0, 100],
                outputRange: ['0%', '100%'],
              }),
            }}>
              <LinearGradient
                colors={['#4ADE80', GREEN, '#22C55E']}
                start={{ x: 0.5, y: 0 }}
                end={{ x: 0.5, y: 1 }}
                style={{ flex: 1 }}
              />
            </Animated.View>
          )}
          {noVotes > 0 && (
            <Animated.View style={{
              height: 14,
              overflow: 'hidden',
              width: noWidth.interpolate({
                inputRange: [0, 100],
                outputRange: ['0%', '100%'],
              }),
            }}>
              <LinearGradient
                colors={['#FF6B6B', RED, '#E11D48']}
                start={{ x: 0.5, y: 0 }}
                end={{ x: 0.5, y: 1 }}
                style={{ flex: 1 }}
              />
            </Animated.View>
          )}
          {unsureVotes > 0 && (
            <Animated.View style={{
              height: 14,
              overflow: 'hidden',
              width: unsureWidth.interpolate({
                inputRange: [0, 100],
                outputRange: ['0%', '100%'],
              }),
            }}>
              <LinearGradient
                colors={['#C4C9D4', GREY_VOTE, '#8B93A1']}
                start={{ x: 0.5, y: 0 }}
                end={{ x: 0.5, y: 1 }}
                style={{ flex: 1 }}
              />
            </Animated.View>
          )}
        </View>
        {/* Top glossy highlight sheen */}
        <LinearGradient
          colors={['rgba(255,255,255,0.45)', 'rgba(255,255,255,0.1)', 'transparent']}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 7, zIndex: 2 }}
          pointerEvents="none"
        />
      </View>

      {/* Vote counts + sentiment */}
      <View style={{ alignItems: 'center', marginTop: 8, gap: 2 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 12 }}>
          <Text style={{ fontFamily: FONTS.medium, fontSize: 12, color: GREEN }}>
            {yesVotes} Yes
          </Text>
          <Text style={{ fontFamily: FONTS.medium, fontSize: 12, color: '#CBD5E1' }}>&middot;</Text>
          <Text style={{ fontFamily: FONTS.medium, fontSize: 12, color: RED }}>
            {noVotes} No
          </Text>
          <Text style={{ fontFamily: FONTS.medium, fontSize: 12, color: '#CBD5E1' }}>&middot;</Text>
          <Text style={{ fontFamily: FONTS.medium, fontSize: 12, color: GREY_VOTE }}>
            {unsureVotes} Unsure
          </Text>
        </View>
        <Text style={{ fontFamily: FONTS.regular, fontSize: 11, color: '#9CA3AF' }}>
          {total} voted{' \u00b7 '}
          {yesVotes > noVotes + unsureVotes ? 'strong yes' :
           noVotes > yesVotes + unsureVotes ? 'strong no' :
           yesVotes === noVotes && unsureVotes === 0 ? 'evenly split' :
           'community is split'}
        </Text>
      </View>
    </View>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────
interface ProposalReviewViewProps {
  onVotesComplete?: () => void;
  taskProgress?: CommunityTask | null;
  goToPage?: (page: number) => void;
  isActive?: boolean;
  initialProposals?: Proposal[];
  showBackButton?: boolean;
  onBack?: () => void;
  onVoteComplete?: () => void;
  deepQuestions?: DeepQuestionData[];
}

// ─── Main component ───────────────────────────────────────────────────────────
export function ProposalReviewView({
  onVotesComplete,
  taskProgress,
  goToPage,
  isActive = false,
  initialProposals,
  showBackButton = false,
  onBack,
  onVoteComplete,
  deepQuestions,
}: ProposalReviewViewProps) {
  const [proposals, setProposals] = useState<Proposal[]>(initialProposals ?? []);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(!initialProposals);
  const [voting, setVoting] = useState(false);

  // +1 Karma popup animation
  const karmaOpacity = useRef(new Animated.Value(0)).current;
  const karmaTranslateY = useRef(new Animated.Value(0)).current;
  const [showKarmaPopup, setShowKarmaPopup] = useState(false);

  // For Friend modal state
  const [showForFriendModal, setShowForFriendModal] = useState(false);
  const [forFriendStep, setForFriendStep] = useState<1 | 2>(1);
  const [selectedPersonSide, setSelectedPersonSide] = useState<'userA' | 'userB' | null>(null);
  const [selectedFriendId, setSelectedFriendId] = useState<string | null>(null);
  const [friendsList, setFriendsList] = useState<any[]>([]);
  const [loadingFriends, setLoadingFriends] = useState(false);

  const rateLimiterRef = useRef(new RateLimiter());
  const isMountedRef = useRef(true);
  const voteTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (voteTimeoutRef.current) clearTimeout(voteTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    if (initialProposals) return; // skip fetch if proposals provided externally
    const load = async () => {
      try {
        setLoading(true);
        const result = await communityService.getProposalsToVote();
        if (isMountedRef.current) {
          setProposals(result);
        }
      } catch (error) {
        logger.error('[ProposalReviewView] Error loading proposals:', error);
      } finally {
        if (isMountedRef.current) {
          setLoading(false);
        }
      }
    };
    load();
  }, []);

  // Trigger +1 Karma popup animation
  const triggerKarmaPopup = useCallback(() => {
    setShowKarmaPopup(true);
    karmaOpacity.setValue(1);
    karmaTranslateY.setValue(0);

    Animated.parallel([
      Animated.timing(karmaOpacity, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(karmaTranslateY, {
        toValue: -40,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setShowKarmaPopup(false);
    });
  }, [karmaOpacity, karmaTranslateY]);

  // Advance to the next proposal or trigger completion callbacks.
  // Used by both handleVote and handleForFriendConfirm.
  const advanceProposal = useCallback(() => {
    if (voteTimeoutRef.current) clearTimeout(voteTimeoutRef.current);
    voteTimeoutRef.current = setTimeout(() => {
      if (!isMountedRef.current) return;
      setVoting(false);
      if (currentIndex >= proposals.length - 1) {
        // Single-proposal (friend) mode: go back; otherwise complete voting gate
        if (onVoteComplete) {
          onVoteComplete();
        } else if (onBack) {
          onBack();
        } else {
          setTimeout(() => onVotesComplete?.(), 500);
        }
      } else {
        setCurrentIndex(prev => prev + 1);
      }
    }, 1000);
  }, [currentIndex, proposals.length, onVoteComplete, onBack, onVotesComplete]);

  const handleVote = useCallback(async (vote: 'yes' | 'no' | 'unsure') => {
    if (voting || currentIndex >= proposals.length) return;
    const current = proposals[currentIndex];
    if (!current) return;

    if (!rateLimiterRef.current.isAllowed('vote', 20, 60000)) {
      showToast.info('Slow down!', 'Please wait a moment before voting again');
      return;
    }

    setVoting(true);

    // Haptics — distinct feel per vote type, fire and forget
    if (vote === 'yes') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } else if (vote === 'no') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }

    // Submit vote — wait for server confirmation before advancing
    try {
      await communityService.submitProposalVote(current.id, vote);
    } catch (err: any) {
      logger.error('[ProposalReviewView] Vote submission failed:', err);
      if (isMountedRef.current) {
        setVoting(false);
        showToast.error('Vote failed', 'Check your connection and try again');
      }
      return;
    }

    if (!isMountedRef.current) return;

    // Update local vote counts after confirmed
    setProposals(prev => prev.map((p, i) => {
      if (i !== currentIndex) return p;
      return {
        ...p,
        yesVotes: vote === 'yes' ? (p.yesVotes ?? 0) + 1 : (p.yesVotes ?? 0),
        noVotes: vote === 'no' ? (p.noVotes ?? 0) + 1 : (p.noVotes ?? 0),
        totalVotes: (p.totalVotes ?? 0) + 1,
      };
    }));

    // Trigger +1 Karma popup
    triggerKarmaPopup();

    // Advance after confirmed
    advanceProposal();
  }, [voting, currentIndex, proposals, advanceProposal, triggerKarmaPopup]);

  // ── For Friend handlers ───────────────────────────────────────────────────
  const handleForFriendPress = useCallback(() => {
    if (voting) return;
    setShowForFriendModal(true);
    setForFriendStep(1);
    setSelectedPersonSide(null);
    setSelectedFriendId(null);
  }, [voting]);

  const handlePersonSelect = useCallback(async (side: 'userA' | 'userB') => {
    setSelectedPersonSide(side);
    setForFriendStep(2);
    if (friendsList.length === 0) {
      setLoadingFriends(true);
      try {
        const data = await communityService.getFriendsAreaData();
        if (isMountedRef.current) {
          setFriendsList(data.friends);
        }
      } catch (err) {
        logger.error('[ProposalReviewView] Error loading friends for recommendation:', err);
      } finally {
        if (isMountedRef.current) {
          setLoadingFriends(false);
        }
      }
    }
  }, [friendsList]);

  const handleForFriendCancel = useCallback(() => {
    setShowForFriendModal(false);
    setForFriendStep(1);
    setSelectedPersonSide(null);
    setSelectedFriendId(null);
  }, []);

  const handleForFriendConfirm = useCallback(async () => {
    if (!selectedFriendId) return;
    const current = proposals[currentIndex];
    if (current) {
      const recommendedPersonId = selectedPersonSide === 'userA' ? current.userA.id : current.userB.id;

      logger.info('[ProposalReviewView] Friend recommendation submitted:', {
        proposalId: current.id,
        recommendedPersonId,
        toFriendId: selectedFriendId,
      });

      // Await recommendation so DB row exists before friends area queries
      try {
        await communityService.submitRecommendation(recommendedPersonId, selectedFriendId, current.id);
      } catch (err: any) {
        logger.error('[ProposalReviewView] Friend recommendation error:', err);
      }
    }
    setShowForFriendModal(false);
    // Haptics for recommendation confirmation
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => { });
    // Advance to next proposal — recommendation counts as a completed action
    advanceProposal();
  }, [selectedFriendId, proposals, currentIndex, selectedPersonSide, advanceProposal]);

  // ── Match computations (memoized) ────────────────────────────────────────
  const matchData = useMemo(() => {
    if (proposals.length === 0 || currentIndex >= proposals.length) return null;
    const proposal = proposals[currentIndex];
    const userA = proposal.userA;
    const userB = proposal.userB;
    const photoA = userA.photos?.find((p: any) => p.isMain) || userA.photos?.[0];
    const photoB = userB.photos?.find((p: any) => p.isMain) || userB.photos?.[0];
    const heightResult = matchHeight(userA, userB);
    const ethnicityResult = matchEthnicity(userA, userB);
    const politicsResult = matchPolitics(userA, userB);
    const religionResult = matchReligion(userA, userB);
    const drinkResult = matchDrinking(userA, userB);
    const weedResult = matchCannabis(userA, userB);
    const tobaccoResult = matchTobacco(userA, userB);
    const otherSubstancesResult = matchOtherSubstances(userA, userB);
    const valuesResult = matchValues(userA, userB);
    const interestsResult = matchInterests(userA, userB);
    const beliefsResults = [politicsResult, religionResult];
    const lifestyleResults = [drinkResult, weedResult, tobaccoResult, otherSubstancesResult];
    const allResults = [heightResult, ethnicityResult, politicsResult, religionResult, drinkResult, weedResult, tobaccoResult, otherSubstancesResult];
    const totalKnown = countKnown(allResults);
    const totalMatch = countMatch(allResults);

    // Compatibility score: display-only value, seeded by proposal ID for render stability.
    // This is intentionally decorative and has no connection to the matchmaking algorithm.
    const idHash = proposal.id.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
    const compatScore = 70 + (idHash % 30);

    // Smart pill matching for values & interests
    const valuesPillResult = computeSmartPills(
      userA.values || [],
      userB.values || [],
      VALUES_SIMILARITY,
    );
    const interestsPillResult = computeSmartPills(
      userA.interests || [],
      userB.interests || [],
      INTERESTS_SIMILARITY,
    );

    // x/4 tracker: 4 core compatibility dimensions — age, religion, politics, lifestyle(drinking)
    const coreResults = [
      matchAge(userA, userB),
      religionResult,
      politicsResult,
      drinkResult,
    ];
    const userATrackerCount = coreResults.filter(
      r => r.status === 'both_happy' || r.status === 'left_happy',
    ).length;
    const userBTrackerCount = coreResults.filter(
      r => r.status === 'both_happy' || r.status === 'right_happy',
    ).length;

    return {
      proposal, userA, userB, photoA, photoB,
      heightResult, ethnicityResult, politicsResult, religionResult,
      drinkResult, weedResult, tobaccoResult, otherSubstancesResult,
      beliefsResults, lifestyleResults,
      compatScore, valuesPillResult, interestsPillResult,
      userATrackerCount, userBTrackerCount,
    };
  }, [currentIndex, proposals]);

  const progressDots = useMemo(() =>
    proposals.map((_, i) => (
      <View
        key={`dot-${i}`}
        style={{
          height: 8,
          width: 40,
          borderRadius: 4,
          marginHorizontal: 6,
          backgroundColor: i === currentIndex ? BLUE : i < currentIndex ? '#93C5FD' : '#DBEAFE',
        }}
      />
    )),
    [proposals, currentIndex],
  );

  // ── Loading ──────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFF' }}>
        <Text style={{ fontSize: 16, color: '#78716C', fontFamily: FONTS.regular }}>Loading proposals...</Text>
      </View>
    );
  }

  // ── Empty ────────────────────────────────────────────────────────────────
  if (proposals.length === 0 || currentIndex >= proposals.length) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFF', paddingHorizontal: 24 }}>
        <Text style={{ fontSize: 24, fontFamily: FONTS.bold, color: '#010101', marginBottom: 12, textAlign: 'center' }}>
          No proposals today
        </Text>
        <Text style={{ fontSize: 16, fontFamily: FONTS.regular, color: '#6B7280', textAlign: 'center', lineHeight: 22 }}>
          Check back tomorrow — your friends will propose new matches for you.
        </Text>
      </View>
    );
  }

  // ── Data ─────────────────────────────────────────────────────────────────
  if (!matchData) return null;
  const {
    proposal, userA, userB, photoA, photoB,
    heightResult, ethnicityResult, politicsResult, religionResult,
    drinkResult, weedResult, tobaccoResult, otherSubstancesResult,
    beliefsResults, lifestyleResults,
    compatScore, valuesPillResult, interestsPillResult,
    userATrackerCount, userBTrackerCount,
  } = matchData;

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      {!showBackButton && !loading && proposals.length > 0 && (
        <View style={{ backgroundColor: '#F4F7FF', paddingVertical: 10, paddingHorizontal: 20, alignItems: 'center' }}>
          <Text style={{ fontFamily: FONTS.semiBold, fontSize: 13, color: '#2B65F9', textAlign: 'center' }}>
            Vote on {proposals.length} proposal{proposals.length > 1 ? 's' : ''} to unlock the Friends Area
          </Text>
        </View>
      )}

      {/* Header row */}
      {showBackButton ? (
        // Friend proposal mode: back button only, no progress dots
        <View style={{
          paddingTop: 48,
          paddingBottom: 16,
          paddingHorizontal: 16,
        }}>
          <TouchableOpacity
            onPress={onBack}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={24} color="#010101" />
          </TouchableOpacity>
        </View>
      ) : (
        // Community voting mode: centered progress dots, no back button
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingTop: 48,
          paddingBottom: 16,
          paddingHorizontal: 16,
        }}>
          <View style={{ width: 40 }} />
          <View style={{ flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center' }}>
            <GuideTarget id="matching-gates">
              <View style={{ flexDirection: 'row' }}>
                {progressDots}
              </View>
            </GuideTarget>
          </View>
          <View style={{ width: 40 }} />
        </View>
      )}

      {/* Scrollable content */}
      <ScrollView
        key={proposal.id}
        style={{ flex: 1 }}
        contentContainerStyle={SCROLL_CONTENT_STYLE}
        showsVerticalScrollIndicator={false}
      >

        {/* ── Profile header ─────────────────────────────────────────── */}
        <View style={{ marginBottom: 12 }}>
          <View style={{ position: 'relative' }}>
            {/* Two independent photo cards — no outer wrapper so each card
                clips its own corners at all 4 sides via overflow:hidden + borderRadius.
                borderRadius is also set directly on the Image style to ensure
                the native image layer is rounded independently. */}
            <View style={{ flexDirection: 'row' }}>

              {/* Left photo card */}
              <ProposalPhotoCard
                photos={userA.photos || []}
                name={userA.firstName}
                age={userA.age}
                width={PHOTO_WIDTH}
                height={PHOTO_HEIGHT}
                side="left"
                proposalId={proposal.id}
              />

              {/* Gap between cards */}
              <View style={{ width: DIVIDER_WIDTH }} />

              {/* Right photo card */}
              <ProposalPhotoCard
                photos={userB.photos || []}
                name={userB.firstName}
                age={userB.age}
                width={PHOTO_WIDTH}
                height={PHOTO_HEIGHT}
                side="right"
                proposalId={proposal.id}
              />
            </View>

            {/* Compatibility badge — centered between photos */}
            <View style={{
              position: 'absolute',
              top: '40%',
              left: 0,
              right: 0,
              alignItems: 'center',
            }}>
              <View style={{
                backgroundColor: BLUE,
                borderRadius: 28,
                paddingHorizontal: 10,
                paddingVertical: 6,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                borderWidth: 3,
                borderColor: '#FFFFFF',
              }}>
                <Ionicons name="sparkles" size={16} color="#FFFFFF" />
                <Text style={{ fontFamily: FONTS.semiBold, fontWeight: '600', fontSize: 16, color: '#FFFFFF' }}>
                  {compatScore} %
                </Text>
              </View>
            </View>
          </View>

          {/* Live Vote Bar — replaces "Are they a match?" subtitle */}
          <View style={{ position: 'relative' }}>
            <LiveVoteBar
              yesVotes={proposal.yesVotes ?? 0}
              noVotes={proposal.noVotes ?? 0}
              totalVotes={proposal.totalVotes ?? 0}
            />

            {/* +1 Karma popup */}
            {showKarmaPopup && (
              <Animated.View style={{
                position: 'absolute',
                top: -10,
                alignSelf: 'center',
                left: 0,
                right: 0,
                alignItems: 'center',
                opacity: karmaOpacity,
                transform: [{ translateY: karmaTranslateY }],
              }}>
                <View style={{
                  backgroundColor: GREEN,
                  paddingHorizontal: 12,
                  paddingVertical: 4,
                  borderRadius: 12,
                }}>
                  <Text style={{
                    fontFamily: FONTS.semiBold,
                    fontWeight: '600',
                    fontSize: 13,
                    color: '#FFFFFF',
                  }}>
                    +1 Karma
                  </Text>
                </View>
              </Animated.View>
            )}
          </View>
        </View>

        {/* ── Questions (Deep Questions with card reveal) ─────────────── */}
        {deepQuestions && deepQuestions.length > 0 && (
          <SectionCard title="Questions" matched={undefined} total={undefined}>
            <QuestionCarousel
              questions={deepQuestions}
              userAName={userA.firstName}
              userBName={userB.firstName}
            />
          </SectionCard>
        )}

        {/* ── Interests (Smart Pills) ─────────────────────────────────── */}
        {((userA.interests?.length ?? 0) > 0 || (userB.interests?.length ?? 0) > 0) && (
          <SectionCard
            title="Interests"
            percentBadge={interestsPillResult.percentMatch}
          >
            <SmartPillCloudSection
              pillResult={interestsPillResult}
              userAName={userA.firstName}
              userBName={userB.firstName}
            />
          </SectionCard>
        )}

        {/* ── Values (Smart Pills) ────────────────────────────────────── */}
        {((userA.values?.length ?? 0) > 0 || (userB.values?.length ?? 0) > 0) && (
          <SectionCard
            title="Values"
            percentBadge={valuesPillResult.percentMatch}
          >
            <SmartPillCloudSection
              pillResult={valuesPillResult}
              userAName={userA.firstName}
              userBName={userB.firstName}
            />
          </SectionCard>
        )}

        {/* ── Lifestyle ──────────────────────────────────────────────── */}
        <SectionCard
          title="Lifestyle"
          matched={countMatch(lifestyleResults.filter(r => r.status !== 'unknown'))}
          total={countKnown(lifestyleResults)}
        >
          {drinkResult.status !== 'unknown' && (
            <ComparisonValueRow result={drinkResult} label="Drink" />
          )}
          {weedResult.status !== 'unknown' && (
            <ComparisonValueRow result={weedResult} label="Weed" />
          )}
          {tobaccoResult.status !== 'unknown' && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              <ValueBox label="Tobacco" value={tobaccoResult.leftValue} />
              <MatchIcon status={tobaccoResult.status} />
              <ValueBox label="Tobacco" value={tobaccoResult.rightValue} />
            </View>
          )}
          {otherSubstancesResult.status !== 'unknown' && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              <ValueBox label="Other Substances" value={otherSubstancesResult.leftValue} />
              <MatchIcon status={otherSubstancesResult.status} />
              <ValueBox label="Other Substances" value={otherSubstancesResult.rightValue} />
            </View>
          )}
        </SectionCard>

        {/* ── Beliefs ────────────────────────────────────────────────── */}
        <SectionCard
          title="Beliefs"
          matched={countMatch(beliefsResults.filter(r => r.status !== 'unknown'))}
          total={countKnown(beliefsResults)}
        >
          {politicsResult.status !== 'unknown' && (
            <ComparisonValueRow result={politicsResult} label="Politics" />
          )}
          {religionResult.status !== 'unknown' && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <ValueBox label="Religion" value={religionResult.leftValue} />
              <MatchIcon status={religionResult.status} />
              <ValueBox label="Religion" value={religionResult.rightValue} />
            </View>
          )}
        </SectionCard>

      </ScrollView>

      {/* ── Fixed bottom vote buttons ───────────────────────────────── */}
      <View style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: 16,
        borderTopWidth: 1,
        borderTopColor: '#F0F0F0',
        gap: 12,
      }}>
        {/* Yes button */}
        <TouchableOpacity
          onPress={() => handleVote('yes')}
          disabled={voting}
          activeOpacity={0.85}
          style={{
            backgroundColor: voting ? '#93C5FD' : BLUE,
            borderRadius: 10,
            height: 46,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
          }}
        >
          <Ionicons name="checkmark" size={18} color="#FFFFFF" />
          <Text style={{ fontFamily: FONTS.medium, fontWeight: '500', fontSize: 16, color: '#FFFFFF' }}>Yes</Text>
        </TouchableOpacity>

        {/* No / For Friend / Not Sure */}
        <View style={{ flexDirection: 'row', gap: 12 }}>
          {/* No */}
          <TouchableOpacity
            onPress={() => handleVote('no')}
            disabled={voting}
            activeOpacity={0.8}
            style={{
              flex: 1,
              height: 63,
              backgroundColor: BOX_BG,
              borderWidth: 1,
              borderColor: BOX_BORDER,
              borderRadius: 12,
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: 10,
            }}
          >
            <Ionicons name="close-outline" size={18} color="#010101" style={{ opacity: 0.5 }} />
            <Text style={{ fontFamily: FONTS.medium, fontWeight: '500', fontSize: 14, color: '#010101', opacity: 0.5 }}>No</Text>
          </TouchableOpacity>

          {/* Recommend */}
          <TouchableOpacity
            onPress={handleForFriendPress}
            disabled={voting}
            activeOpacity={0.8}
            style={{
              flex: 1,
              height: 63,
              backgroundColor: BOX_BG,
              borderWidth: 1,
              borderColor: BOX_BORDER,
              borderRadius: 12,
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: 10,
            }}
          >
            <Ionicons name="person-add-outline" size={18} color="#010101" style={{ opacity: 0.5 }} />
            <Text style={{ fontFamily: FONTS.medium, fontWeight: '500', fontSize: 14, color: '#010101', opacity: 0.5 }}>Recommend</Text>
          </TouchableOpacity>

          {/* Not Sure */}
          <TouchableOpacity
            onPress={() => handleVote('unsure')}
            disabled={voting}
            activeOpacity={0.8}
            style={{
              flex: 1,
              height: 63,
              backgroundColor: BOX_BG,
              borderWidth: 1,
              borderColor: BOX_BORDER,
              borderRadius: 12,
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: 10,
            }}
          >
            <Ionicons name="information-circle-outline" size={18} color="#010101" style={{ opacity: 0.5 }} />
            <Text style={{ fontFamily: FONTS.medium, fontWeight: '500', fontSize: 14, color: '#010101', opacity: 0.5 }}>Not Sure</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── For Friend Modal ──────────────────────────────────────────── */}
      <Modal
        visible={showForFriendModal}
        transparent
        animationType="fade"
        onRequestClose={handleForFriendCancel}
      >
        <View style={{
          flex: 1,
          backgroundColor: OVERLAYS.medium,
          justifyContent: 'center',
          alignItems: 'center',
          paddingHorizontal: 20,
        }}>
          <View style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 20,
            width: '100%',
            overflow: 'hidden',
          }}>

            {forFriendStep === 1 ? (
              /* ── Step 1: Pick which person to recommend ── */
              <View style={{ padding: 24 }}>
                <Text style={{ fontFamily: FONTS.semiBold, fontSize: 20, color: '#010101', textAlign: 'center', marginBottom: 6 }}>
                  Recommend
                </Text>
                <Text style={{ fontFamily: FONTS.regular, fontSize: 14, color: '#010101', opacity: 0.6, textAlign: 'center', marginBottom: 20 }}>
                  Who would you like to recommend?
                </Text>

                <View style={{ flexDirection: 'row', gap: 12 }}>
                  {/* UserA card */}
                  <TouchableOpacity
                    onPress={() => handlePersonSelect('userA')}
                    activeOpacity={0.85}
                    style={{ flex: 1, borderRadius: 14, overflow: 'hidden', height: 180 }}
                  >
                    <Image
                      source={{ uri: photoA?.url || 'https://via.placeholder.com/200' }}
                      style={{ width: '100%', height: '100%' }}
                      contentFit="cover"
                      transition={200}
                      cachePolicy="disk"
                      recyclingKey={`${proposal.id}-modal-a`}
                    />
                    <LinearGradient
                      colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.82)']}
                      style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 90 }}
                    />
                    <View style={{ position: 'absolute', bottom: 12, left: 12 }}>
                      <Text style={{ fontFamily: FONTS.semiBold, fontSize: 16, color: '#FFF' }}>
                        {userA.firstName}
                      </Text>
                      {userA.age ? (
                        <Text style={{ fontFamily: FONTS.regular, fontSize: 12, color: '#FFF', opacity: 0.85 }}>
                          {userA.age} yrs
                        </Text>
                      ) : null}
                    </View>
                  </TouchableOpacity>

                  {/* UserB card */}
                  <TouchableOpacity
                    onPress={() => handlePersonSelect('userB')}
                    activeOpacity={0.85}
                    style={{ flex: 1, borderRadius: 14, overflow: 'hidden', height: 180 }}
                  >
                    <Image
                      source={{ uri: photoB?.url || 'https://via.placeholder.com/200' }}
                      style={{ width: '100%', height: '100%' }}
                      contentFit="cover"
                      transition={200}
                      cachePolicy="disk"
                      recyclingKey={`${proposal.id}-modal-b`}
                    />
                    <LinearGradient
                      colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.82)']}
                      style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 90 }}
                    />
                    <View style={{ position: 'absolute', bottom: 12, left: 12 }}>
                      <Text style={{ fontFamily: FONTS.semiBold, fontSize: 16, color: '#FFF' }}>
                        {userB.firstName}
                      </Text>
                      {userB.age ? (
                        <Text style={{ fontFamily: FONTS.regular, fontSize: 12, color: '#FFF', opacity: 0.85 }}>
                          {userB.age} yrs
                        </Text>
                      ) : null}
                    </View>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  onPress={handleForFriendCancel}
                  style={{ marginTop: 16, alignItems: 'center', paddingVertical: 12 }}
                >
                  <Text style={{ fontFamily: FONTS.medium, fontSize: 15, color: '#010101', opacity: 0.45 }}>Cancel</Text>
                </TouchableOpacity>
              </View>

            ) : (
              /* ── Step 2: Pick a friend ── */
              <View>
                <View style={{ paddingHorizontal: 24, paddingTop: 24, paddingBottom: 12 }}>
                  <Text style={{ fontFamily: FONTS.semiBold, fontSize: 20, color: '#010101', textAlign: 'center', marginBottom: 6 }}>
                    Send to a Friend
                  </Text>
                  <Text style={{ fontFamily: FONTS.regular, fontSize: 14, color: '#010101', opacity: 0.6, textAlign: 'center' }}>
                    Recommend {selectedPersonSide === 'userA' ? userA.firstName : userB.firstName} to...
                  </Text>
                </View>

                {loadingFriends ? (
                  <View style={{ paddingVertical: 40, alignItems: 'center' }}>
                    <ActivityIndicator size="large" color={BLUE} />
                  </View>
                ) : (
                  <ScrollView
                    style={{ maxHeight: 280 }}
                    contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 12, paddingBottom: 8 }}
                    showsVerticalScrollIndicator={false}
                  >
                    {friendsList.filter(item => {
                      // Don't show the recommended person in the friend list (can't recommend someone to themselves)
                      const recPersonId = selectedPersonSide === 'userA' ? proposal.userA.id : proposal.userB.id;
                      return item.friendId !== recPersonId;
                    }).map(item => {
                      const isSelected = selectedFriendId === item.friendId;
                      const friendPhoto = item.friend?.photos?.[0]?.url;
                      return (
                        <TouchableOpacity
                          key={item.friendId}
                          onPress={() => setSelectedFriendId(item.friendId)}
                          activeOpacity={0.8}
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            paddingVertical: 10,
                            paddingHorizontal: 12,
                            borderRadius: 12,
                            marginBottom: 8,
                            backgroundColor: isSelected ? 'rgba(37, 99, 235, 0.07)' : BOX_BG,
                            borderWidth: 1,
                            borderColor: isSelected ? BLUE : BOX_BORDER,
                          }}
                        >
                          <Image
                            source={{ uri: friendPhoto || 'https://via.placeholder.com/50' }}
                            style={{ width: 46, height: 46, borderRadius: 23, marginRight: 12 }}
                            contentFit="cover"
                            transition={200}
                            cachePolicy="disk"
                          />
                          <View style={{ flex: 1 }}>
                            <Text style={{ fontFamily: FONTS.semiBold, fontSize: 15, color: '#010101' }}>
                              {item.friend?.firstName}
                            </Text>
                            {item.friend?.currentJob ? (
                              <Text style={{ fontFamily: FONTS.regular, fontSize: 13, color: '#010101', opacity: 0.55 }} numberOfLines={1}>
                                {item.friend.currentJob}
                              </Text>
                            ) : null}
                          </View>
                          {isSelected && (
                            <View style={{
                              width: 22,
                              height: 22,
                              borderRadius: 11,
                              backgroundColor: BLUE,
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}>
                              <Ionicons name="checkmark" size={14} color="#FFF" />
                            </View>
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                )}

                {/* Cancel / Confirm */}
                <View style={{
                  flexDirection: 'row',
                  gap: 12,
                  paddingHorizontal: 24,
                  paddingTop: 16,
                  paddingBottom: 24,
                  borderTopWidth: 1,
                  borderTopColor: '#F0F0F0',
                  marginTop: 8,
                }}>
                  <TouchableOpacity
                    onPress={handleForFriendCancel}
                    activeOpacity={0.8}
                    style={{
                      flex: 1,
                      height: 46,
                      borderRadius: 10,
                      borderWidth: 1,
                      borderColor: BOX_BORDER,
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: BOX_BG,
                    }}
                  >
                    <Text style={{ fontFamily: FONTS.medium, fontSize: 15, color: '#010101', opacity: 0.7 }}>Cancel</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={handleForFriendConfirm}
                    disabled={!selectedFriendId}
                    activeOpacity={0.85}
                    style={{
                      flex: 1,
                      height: 46,
                      borderRadius: 10,
                      backgroundColor: selectedFriendId ? BLUE : '#DBEAFE',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Text style={{ fontFamily: FONTS.medium, fontSize: 15, color: '#FFFFFF' }}>Confirm</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

          </View>
        </View>
      </Modal>

    </View>
  );
}

export default ProposalReviewView;
