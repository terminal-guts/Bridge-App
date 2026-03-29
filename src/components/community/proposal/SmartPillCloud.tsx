/**
 * Smart Pill Components — tag pills and cloud sections for Interests/Values matching.
 * Extracted from ProposalReviewView.tsx.
 *
 * Visual hierarchy (bold → muted):
 *   1. Green pills (shared) — largest, glowing, with checkmark icon
 *   2. Yellow pills (similar) — paired mini-pills connected by "~", dashed border
 *   3. Grey pills (unique) — smallest, ghost-style, collapsed to "+N more" if >3
 */

import React from 'react';
import { View, Text } from 'react-native';
import { FONTS, FONT_SIZES } from '../../../constants/typography';
import { SPACING } from '../../../constants/dimensions';
import { COLORS } from '../../../theme/colors';
import { SHADOWS } from '../../../theme/shadows';
import { MatchResult, MatchStatus } from '../../../utils/proposalMatching';
import { EvaIcon } from '../../icons';
import type { SmartPillResult } from './proposalHelpers';

// ─── Design tokens ───────────────────────────────────────────────────────────
const GREEN = COLORS.success;
const GREEN_TEXT = '#15803D';  // green-700 — WCAG AA compliant on light green bg
const BOX_BORDER = '#E0DAD1'; // warm border — visible on white
const TAG_BG = '#F5F2EE';     // warm fill — visible on white
const CARD_BORDER = 'rgba(1, 1, 1, 0.1)';

// Grey/unique pill tokens — intentionally ghosted
const GREY_BG = '#F8F6F3';      // barely-there warm fill
const GREY_BORDER = '#EDE9E3';   // very faint warm border
const GREY_TEXT = COLORS.text.secondary; // #64748B — muted

// Yellow/similar pill tokens
const YELLOW_BORDER = COLORS.warning.icon; // #F59E0B
const YELLOW_BG = COLORS.backgroundSoftYellow; // #FFFBEB
const YELLOW_TEXT = COLORS.warning.text; // #92400E
// Max unique pills shown per person before collapsing to "+N more"
const MAX_UNIQUE_PILLS = 3;

// ─── MatchIcon ───────────────────────────────────────────────────────────────
export function MatchIcon({ status }: { status: MatchStatus }) {
  if (status === 'both_happy') {
    return <EvaIcon name="checkmark" variant="outline" size={20} color={COLORS.emerald} />;
  }
  if (status === 'neither_happy') {
    return <EvaIcon name="close" variant="outline" size={20} color={COLORS.error} />;
  }
  if (status === 'left_happy' || status === 'right_happy') {
    return <EvaIcon name="alert-triangle" variant="outline" size={18} color={COLORS.warningIcon} />;
  }
  return null;
}

// ─── TagPill (grey/neutral — ghosted, small) ────────────────────────────────
export function TagPill({ label }: { label: string }) {
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
      <Text style={{ fontFamily: FONTS.medium, fontWeight: '500', fontSize: FONT_SIZES.base, color: COLORS.text.black }}>{label}</Text>
    </View>
  );
}

// ─── UniquePill (grey/neutral — ghosted, physically smaller than green/yellow)
export function UniquePill({ label }: { label: string }) {
  return (
    <View style={{
      backgroundColor: GREY_BG,
      borderWidth: 1,
      borderColor: GREY_BORDER,
      borderRadius: 40,
      paddingHorizontal: 8,
      paddingVertical: 4,
      alignSelf: 'flex-start',
    }}>
      <Text style={{ fontFamily: FONTS.regular, fontWeight: '400', fontSize: FONT_SIZES.sm, color: GREY_TEXT }}>{label}</Text>
    </View>
  );
}

// ─── UniqueOverflow — "+N more" count pill ──────────────────────────────────
function UniqueOverflowPill({ count }: { count: number }) {
  return (
    <View style={{
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: GREY_BORDER,
      borderStyle: 'dashed',
      borderRadius: 40,
      paddingHorizontal: 8,
      paddingVertical: 4,
      alignSelf: 'flex-start',
    }}>
      <Text style={{ fontFamily: FONTS.medium, fontWeight: '500', fontSize: FONT_SIZES.sm, color: COLORS.text.light }}>+{count} more</Text>
    </View>
  );
}

// ─── GreenPill (exact match — same size as other pills, green color is the signal)
export function GreenPill({ label }: { label: string }) {
  return (
    <View style={{
      backgroundColor: COLORS.backgroundSuccessBadge,
      borderWidth: 1,
      borderColor: GREEN,
      borderRadius: 40,
      paddingHorizontal: 10,
      paddingVertical: 6,
      alignSelf: 'flex-start',
    }}>
      <Text style={{ fontFamily: FONTS.medium, fontWeight: '500', fontSize: FONT_SIZES.base, color: GREEN_TEXT }}>{label}</Text>
    </View>
  );
}

// ─── SimilarPairPill (single pill with inline tilde — compact, won't overflow)
export function SimilarPairPill({ itemA, itemB }: { itemA: string; itemB: string }) {
  return (
    <View style={{
      backgroundColor: YELLOW_BG,
      borderWidth: 1,
      borderStyle: 'dashed',
      borderColor: YELLOW_BORDER,
      borderRadius: 40,
      paddingHorizontal: 10,
      paddingVertical: 6,
      alignSelf: 'flex-start',
    }}>
      <Text style={{ fontFamily: FONTS.medium, fontWeight: '500', fontSize: FONT_SIZES.base, color: YELLOW_TEXT }}>
        {itemA} {'~'} {itemB}
      </Text>
    </View>
  );
}

// Legacy export — kept for backward compat with any external refs
export function YellowPill({ label }: { label: string }) {
  return (
    <View style={{
      backgroundColor: YELLOW_BG,
      borderWidth: 1,
      borderStyle: 'dashed',
      borderColor: YELLOW_BORDER,
      borderRadius: 40,
      paddingHorizontal: 9,
      paddingVertical: 5,
      alignSelf: 'flex-start',
    }}>
      <Text style={{ fontFamily: FONTS.medium, fontWeight: '500', fontSize: FONT_SIZES.base, color: YELLOW_TEXT }}>{label}</Text>
    </View>
  );
}

// ─── ValueBox ────────────────────────────────────────────────────────────────
export function ValueBox({ label, value }: { label: string; value: string }) {
  return (
    <View style={{
      flex: 1,
      height: 58,
      backgroundColor: 'rgba(1, 1, 1, 0.02)',
      borderWidth: 1,
      borderColor: BOX_BORDER,
      borderRadius: 12,
      padding: 10,
      justifyContent: 'space-between',
    }}>
      <Text style={{ fontFamily: FONTS.regular, fontWeight: '400', fontSize: FONT_SIZES.md, color: COLORS.text.label }}>{label}</Text>
      <Text style={{ fontFamily: FONTS.semiBold, fontWeight: '600', fontSize: FONT_SIZES.lg, color: COLORS.text.black }} numberOfLines={1}>{value || '—'}</Text>
    </View>
  );
}

// ─── ComparisonValueRow ──────────────────────────────────────────────────────
export function ComparisonValueRow({ result, label }: { result: MatchResult; label: string }) {
  if (result.status === 'unknown') return null;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 }}>
      <ValueBox label={label} value={result.leftValue} />
      <MatchIcon status={result.status} />
      <ValueBox label={label} value={result.rightValue} />
    </View>
  );
}

// ─── EthnicityComparisonRow ──────────────────────────────────────────────────
export function EthnicityComparisonRow({ result }: { result: MatchResult }) {
  if (result.status === 'unknown') return null;
  const leftTags = result.leftValue ? [result.leftValue] : [];
  const rightTags = result.rightValue ? [result.rightValue] : [];
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 }}>
      <View style={{ flex: 1, gap: 8 }}>
        {leftTags.map(t => <TagPill key={t} label={t} />)}
      </View>
      <MatchIcon status={result.status} />
      <View style={{ flex: 1, gap: 8 }}>
        {rightTags.map(t => <TagPill key={t} label={t} />)}
      </View>
    </View>
  );
}

// ─── TagCloudSection (two-column grey pills) ─────────────────────────────────
export function TagCloudSection({ leftTags, rightTags }: { leftTags: string[]; rightTags: string[] }) {
  return (
    <View style={{ flexDirection: 'row', gap: 0 }}>
      <View style={{ flex: 1, gap: 8 }}>
        {leftTags.map((t) => <TagPill key={t} label={t} />)}
      </View>
      <View style={{ width: 1, backgroundColor: COLORS.border, marginHorizontal: SPACING.lg }} />
      <View style={{ flex: 1, gap: 8 }}>
        {rightTags.map((t) => <TagPill key={t} label={t} />)}
      </View>
    </View>
  );
}

// ─── Tier label — quiet signpost, not a competing heading ──────────────────
function TierLabel({ text, color }: { text: string; color?: string }) {
  return (
    <Text style={{
      fontFamily: FONTS.medium,
      fontWeight: '500',
      fontSize: FONT_SIZES.xs,
      color: color || COLORS.text.secondary,
      marginBottom: 6,
    }}>
      {text}
    </Text>
  );
}

// ─── Unique pills column (with overflow) ────────────────────────────────────
function UniquePillColumn({ tags, label }: { tags: string[]; label: string }) {
  if (tags.length === 0) return null;
  const visible = tags.slice(0, MAX_UNIQUE_PILLS);
  const overflow = tags.length - MAX_UNIQUE_PILLS;

  return (
    <View style={{ flex: 1 }}>
      <TierLabel text={label} color={COLORS.text.light} />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
        {visible.map(t => <UniquePill key={t} label={t} />)}
        {overflow > 0 && <UniqueOverflowPill count={overflow} />}
      </View>
    </View>
  );
}

// ─── SmartPillCloudSection ───────────────────────────────────────────────────
export function SmartPillCloudSection({
  pillResult,
  userAName,
  userBName,
}: {
  pillResult: SmartPillResult;
  userAName: string;
  userBName: string;
}) {
  const { greenPairs, yellowPairs, greyA, greyB } = pillResult;
  const hasYellow = yellowPairs.length > 0;
  const hasGrey = greyA.length > 0 || greyB.length > 0;

  return (
    <View>
      {/* ── Tier 1: Green (shared) — hero treatment ────────────────────── */}
      {greenPairs.length > 0 && (
        <View style={{ marginBottom: (hasYellow || hasGrey) ? 12 : 0 }}>
          <TierLabel text="In common" color={GREEN_TEXT} />
          <View style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: 8,
          }}>
            {greenPairs.map(p => (
              <GreenPill key={`green-${p.item}`} label={p.item} />
            ))}
          </View>
        </View>
      )}

      {/* ── Tier 2: Yellow (similar) — single pill with inline tilde ──── */}
      {hasYellow && (
        <View style={{ marginBottom: hasGrey ? 12 : 0 }}>
          <TierLabel text="Similar" />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {yellowPairs.map(p => (
              <SimilarPairPill
                key={`yellow-${p.itemA}-${p.itemB}`}
                itemA={p.itemA}
                itemB={p.itemB}
              />
            ))}
          </View>
        </View>
      )}

      {/* ── Tier 3: Grey (unique) — ghosted, small, with overflow ──────── */}
      {hasGrey && (
        <View style={{ flexDirection: 'row', gap: 0 }}>
          <UniquePillColumn tags={greyA} label={`Only ${userAName}`} />
          {greyA.length > 0 && greyB.length > 0 && (
            <View style={{ width: 1, backgroundColor: GREY_BORDER, marginHorizontal: SPACING.md }} />
          )}
          <UniquePillColumn tags={greyB} label={`Only ${userBName}`} />
        </View>
      )}
    </View>
  );
}

// ─── SectionCard ─────────────────────────────────────────────────────────────
export const MatchBadge = React.memo(function MatchBadge({ matched, total }: { matched: number; total: number }) {
  const allMatch = matched === total;
  const noneMatch = matched === 0;
  const GREEN_BG = 'rgba(52, 199, 89, 0.1)';
  const RED_BG = 'rgba(255, 56, 60, 0.1)';
  const AMBER_BG = 'rgba(245, 158, 11, 0.12)';
  const bg = allMatch ? GREEN_BG : noneMatch ? RED_BG : AMBER_BG;
  const color = allMatch ? GREEN_TEXT : noneMatch ? '#B91C1C' : COLORS.warning.text; // WCAG AA compliant
  const label = total === 1
    ? allMatch ? 'Match' : 'No Match'
    : `${matched}/${total} Match`;

  return (
    <View style={{ paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, backgroundColor: bg }}>
      <Text style={{ fontFamily: FONTS.medium, fontWeight: '500', fontSize: FONT_SIZES.sm, color }}>{label}</Text>
    </View>
  );
});

export const PercentBadge = React.memo(function PercentBadge({ percent }: { percent: number }) {
  const allMatch = percent >= 70;
  const noneMatch = percent === 0;
  const GREEN_BG = 'rgba(52, 199, 89, 0.1)';
  const RED_BG = 'rgba(255, 56, 60, 0.1)';
  const AMBER_BG = 'rgba(245, 158, 11, 0.12)';
  const bg = allMatch ? GREEN_BG : noneMatch ? RED_BG : AMBER_BG;
  const color = allMatch ? GREEN_TEXT : noneMatch ? '#B91C1C' : COLORS.warning.text; // WCAG AA compliant

  return (
    <View style={{ paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, backgroundColor: bg }}>
      <Text style={{ fontFamily: FONTS.medium, fontWeight: '500', fontSize: FONT_SIZES.sm, color }}>{percent}% Match</Text>
    </View>
  );
});

export const SectionCard = React.memo(function SectionCard({
  title,
  matched,
  total,
  percentBadge,
  accentColor,
  children,
}: {
  title: string;
  matched?: number;
  total?: number;
  percentBadge?: number;
  accentColor?: string;
  children: React.ReactNode;
}) {
  return (
    <View style={{
      backgroundColor: COLORS.card,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: CARD_BORDER,
      borderLeftWidth: accentColor ? 3 : 1,
      borderLeftColor: accentColor || CARD_BORDER,
      ...SHADOWS.sm,
      padding: 16,
      marginBottom: 20,
    }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <Text style={{ fontFamily: FONTS.bold, fontWeight: '700', fontSize: FONT_SIZES.xl, color: COLORS.primary }}>{title}</Text>
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
