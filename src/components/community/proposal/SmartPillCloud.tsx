/**
 * Smart Pill Components — tag pills and cloud sections for Interests/Values matching.
 * Extracted from ProposalReviewView.tsx.
 */

import React from 'react';
import { View, Text } from 'react-native';
import { FONTS, FONT_SIZES } from '../../../constants/typography';
import { SPACING } from '../../../constants/dimensions';
import { COLORS } from '../../../theme/colors';
import { SHADOWS } from '../../../theme/shadows';
import { MatchResult, MatchStatus } from '../../../utils/proposalMatching';
import { EvaIcon, IconScoutIcon } from '../../icons';
import { valueIconName, interestIconName } from '../../../utils/emojiMaps';
import type { SmartPillResult } from './proposalHelpers';

// ─── Design tokens ───────────────────────────────────────────────────────────
const GREEN = COLORS.success;
const BOX_BORDER = 'rgba(1, 1, 1, 0.04)';
const TAG_BG = 'rgba(1, 1, 1, 0.02)';
const CARD_BORDER = 'rgba(1, 1, 1, 0.1)';

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

// ─── TagPill (grey/neutral) ──────────────────────────────────────────────────
export function TagPill({ label, type, isVerified }: { label: string; type: 'value' | 'interest'; isVerified?: boolean }) {
  const icon = type === 'value' ? valueIconName(label) : interestIconName(label);
  return (
    <View style={{
      backgroundColor: TAG_BG,
      borderWidth: 1,
      borderColor: BOX_BORDER,
      borderRadius: 40,
      paddingHorizontal: 10,
      paddingVertical: 6,
      alignSelf: 'flex-start',
      flexDirection: 'row',
      alignItems: 'center',
    }}>
      {icon && <IconScoutIcon name={icon} size={14} style={{ marginRight: 6 }} />}
      <Text style={{ fontFamily: FONTS.medium, fontWeight: '500', fontSize: FONT_SIZES.base, color: COLORS.text.black, opacity: 0.85 }}>{label}</Text>
      {isVerified && (
        <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center', marginLeft: 4 }}>
          <EvaIcon name="sparkles" variant="fill" size={8} color="#FFF" />
        </View>
      )}
    </View>
  );
}

// ─── GreenPill (exact match) ─────────────────────────────────────────────────
export function GreenPill({ label, type, isVerified }: { label: string; type: 'value' | 'interest'; isVerified?: boolean }) {
  const icon = type === 'value' ? valueIconName(label) : interestIconName(label);
  return (
    <View style={{
      backgroundColor: COLORS.backgroundSuccessBadge,
      borderWidth: 1,
      borderColor: GREEN,
      borderRadius: 40,
      paddingHorizontal: 10,
      paddingVertical: 6,
      alignSelf: 'flex-start',
      flexDirection: 'row',
      alignItems: 'center',
    }}>
      {icon && <IconScoutIcon name={icon} size={14} style={{ marginRight: 6 }} />}
      <Text style={{ fontFamily: FONTS.medium, fontWeight: '500', fontSize: FONT_SIZES.base, color: GREEN }}>{label}</Text>
      {isVerified && (
        <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center', marginLeft: 4 }}>
          <EvaIcon name="sparkles" variant="fill" size={8} color="#FFF" />
        </View>
      )}
    </View>
  );
}

// ─── YellowPill (similar match) ──────────────────────────────────────────────
export function YellowPill({ label, type, isVerified }: { label: string; type: 'value' | 'interest'; isVerified?: boolean }) {
  // label might be "Item A <-> Item B"
  const items = label.split(' \u2194 ');
  const icon = type === 'value' ? valueIconName(items[0]) : interestIconName(items[0]);

  return (
    <View style={{
      backgroundColor: COLORS.backgroundSoftYellow,
      borderWidth: 1,
      borderColor: COLORS.warning.icon,
      borderRadius: 40,
      paddingHorizontal: 10,
      paddingVertical: 6,
      alignSelf: 'flex-start',
      flexDirection: 'row',
      alignItems: 'center',
    }}>
      {icon && <IconScoutIcon name={icon} size={14} style={{ marginRight: 6 }} />}
      <Text style={{ fontFamily: FONTS.medium, fontWeight: '500', fontSize: FONT_SIZES.base, color: COLORS.warning.text }}>{label}</Text>
      {isVerified && (
        <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center', marginLeft: 4 }}>
          <EvaIcon name="sparkles" variant="fill" size={8} color="#FFF" />
        </View>
      )}
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
        {leftTags.map(t => <TagPill key={t} label={t} type="interest" />)}
      </View>
      <MatchIcon status={result.status} />
      <View style={{ flex: 1, gap: 8 }}>
        {rightTags.map(t => <TagPill key={t} label={t} type="interest" />)}
      </View>
    </View>
  );
}

// ─── TagCloudSection (two-column grey pills) ─────────────────────────────────
export function TagCloudSection({ leftTags, rightTags }: { leftTags: string[]; rightTags: string[] }) {
  return (
    <View style={{ flexDirection: 'row', gap: 0 }}>
      <View style={{ flex: 1, gap: 8 }}>
        {leftTags.map((t) => <TagPill key={t} label={t} type="interest" />)}
      </View>
      <View style={{ width: 1, backgroundColor: COLORS.border, marginHorizontal: SPACING.lg }} />
      <View style={{ flex: 1, gap: 8 }}>
        {rightTags.map((t) => <TagPill key={t} label={t} type="interest" />)}
      </View>
    </View>
  );
}

// ─── SmartPillCloudSection ───────────────────────────────────────────────────
export function SmartPillCloudSection({
  pillResult,
  userAName,
  userBName,
  type,
  verifiedA = new Set(),
  verifiedB = new Set(),
}: {
  pillResult: SmartPillResult;
  userAName: string;
  userBName: string;
  type: 'value' | 'interest';
  verifiedA?: Set<string>;
  verifiedB?: Set<string>;
}) {
  const { greenPairs, yellowPairs, greyA, greyB } = pillResult;

  return (
    <View>
      {/* Green pairs (exact matches) */}
      {greenPairs.length > 0 && (
        <View style={{ marginBottom: (yellowPairs.length > 0 || greyA.length > 0 || greyB.length > 0) ? 10 : 0 }}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {greenPairs.map(p => {
                const labelLower = p.item.toLowerCase();
                const isVerified = verifiedA.has(labelLower) || verifiedB.has(labelLower);
                return (
                    <GreenPill key={`green-${p.item}`} label={p.item} type={type} isVerified={isVerified} />
                );
            })}
          </View>
        </View>
      )}

      {/* Yellow pairs (similar matches) */}
      {yellowPairs.length > 0 && (
        <View style={{ marginBottom: (greyA.length > 0 || greyB.length > 0) ? 10 : 0 }}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {yellowPairs.map(p => {
                const isVerified = verifiedA.has(p.itemA.toLowerCase()) || verifiedB.has(p.itemB.toLowerCase());
                return (
                    <YellowPill
                        key={`yellow-${p.itemA}-${p.itemB}`}
                        label={`${p.itemA} \u2194 ${p.itemB}`}
                        type={type}
                        isVerified={isVerified}
                    />
                );
            })}
          </View>
        </View>
      )}

      {/* Grey pills (unique to each person) */}
      {(greyA.length > 0 || greyB.length > 0) && (
        <View style={{ flexDirection: 'row', gap: 0 }}>
          <View style={{ flex: 1, gap: 8 }}>
            {greyA.length > 0 && (
              <Text style={{ fontFamily: FONTS.regular, fontSize: FONT_SIZES.xs, color: COLORS.text.disabled, marginBottom: 4 }}>{userAName}</Text>
            )}
            {greyA.map(t => (
                <TagPill
                    key={`greyA-${t}`}
                    label={t}
                    type={type}
                    isVerified={verifiedA.has(t.toLowerCase())}
                />
            ))}
          </View>
          <View style={{ width: 1, backgroundColor: COLORS.border, marginHorizontal: SPACING.lg }} />
          <View style={{ flex: 1, gap: 8 }}>
            {greyB.length > 0 && (
              <Text style={{ fontFamily: FONTS.regular, fontSize: FONT_SIZES.xs, color: COLORS.text.disabled, marginBottom: 4 }}>{userBName}</Text>
            )}
            {greyB.map(t => (
                <TagPill
                    key={`greyB-${t}`}
                    label={t}
                    type={type}
                    isVerified={verifiedB.has(t.toLowerCase())}
                />
            ))}
          </View>
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
  const AMBER_BG = 'rgba(255, 204, 0, 0.1)';
  const bg = allMatch ? GREEN_BG : noneMatch ? RED_BG : AMBER_BG;
  const color = allMatch ? GREEN : noneMatch ? COLORS.rejectRed : COLORS.brightAmber;
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
  const AMBER_BG = 'rgba(255, 204, 0, 0.1)';
  const bg = allMatch ? GREEN_BG : noneMatch ? RED_BG : AMBER_BG;
  const color = allMatch ? GREEN : noneMatch ? COLORS.rejectRed : COLORS.brightAmber;

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
