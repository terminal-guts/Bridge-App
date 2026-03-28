/**
 * BadgeComparisonSection Component
 *
 * Side-by-side display of featured badges for two users in the proposal voting screen.
 * Wrapped in SectionCard for visual consistency with other proposal sections.
 * Shows up to 3 featured badges per person. No giver names shown (privacy).
 * If one person has no badges, shows "No friend badges yet" on their side.
 * If BOTH have no badges, returns null (section hidden entirely).
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { FriendBadgeWithGiver } from '../../types/badges';
import { getFeaturedBadges } from '../../services/badgeService';
import { BadgeCard } from './BadgeCard';
import { FONTS, FONT_SIZES } from '../../constants/typography';
import { COLORS } from '../../theme/colors';
import { SHADOWS } from '../../theme/shadows';
import { createLogger } from '../../utils/secureLogger';

const logger = createLogger('BadgeComparisonSection');

// Match SectionCard design tokens from SmartPillCloud.tsx
const CARD_BORDER = 'rgba(1, 1, 1, 0.1)';
// Spectrum position 1 of 6 — brand blue anchors the cool→warm→violet sweep
const ACCENT_COLOR = COLORS.primaryAccent;

interface BadgeComparisonSectionProps {
  userAId: string;
  userBId: string;
}

export const BadgeComparisonSection: React.FC<BadgeComparisonSectionProps> = React.memo(({
  userAId,
  userBId,
}) => {
  const [badgesA, setBadgesA] = useState<FriendBadgeWithGiver[]>([]);
  const [badgesB, setBadgesB] = useState<FriendBadgeWithGiver[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let mounted = true;

    // Reset state when user IDs change (prevents stale data during proposal transitions)
    setBadgesA([]);
    setBadgesB([]);
    setLoaded(false);

    Promise.all([
      getFeaturedBadges(userAId),
      getFeaturedBadges(userBId),
    ]).then(([resultA, resultB]) => {
      if (!mounted) return;
      if (resultA.ok && resultA.data) setBadgesA(resultA.data);
      if (resultB.ok && resultB.data) setBadgesB(resultB.data);
      setLoaded(true);
    }).catch((err) => {
      if (!mounted) return;
      logger.error('Failed to fetch featured badges:', err?.message);
      setLoaded(true);
    });

    return () => { mounted = false; };
  }, [userAId, userBId]);

  // Don't render until loaded, and hide if both empty
  if (!loaded) return null;
  if (badgesA.length === 0 && badgesB.length === 0) return null;

  return (
    <View style={styles.card}>
      {/* Section header — matches SectionCard pattern */}
      <View style={styles.header}>
        <Text style={styles.title}>Friend Badges</Text>
      </View>

      <View style={styles.columns}>
        {/* Left column — User A */}
        <View style={styles.column}>
          {badgesA.length > 0 ? (
            badgesA.map(badge => (
              <BadgeCard
                key={badge.id}
                badge={badge}
                revealAuthor={false}
                hideGiverName
                compact
                maxLines={2}
              />
            ))
          ) : (
            <Text style={styles.emptyText}>No friend badges yet</Text>
          )}
        </View>

        {/* Divider */}
        <View style={styles.divider} />

        {/* Right column — User B */}
        <View style={styles.column}>
          {badgesB.length > 0 ? (
            badgesB.map(badge => (
              <BadgeCard
                key={badge.id}
                badge={badge}
                revealAuthor={false}
                hideGiverName
                compact
                maxLines={2}
              />
            ))
          ) : (
            <Text style={styles.emptyText}>No friend badges yet</Text>
          )}
        </View>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    borderLeftWidth: 3,
    borderLeftColor: ACCENT_COLOR,
    ...SHADOWS.sm,
    padding: 16,
    marginBottom: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontFamily: FONTS.bold,
    fontWeight: '700' as const,
    fontSize: FONT_SIZES.xl,
    color: COLORS.primary,
  },
  columns: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  column: {
    flex: 1,
    gap: 6,
  },
  divider: {
    width: 12,
  },
  emptyText: {
    fontFamily: FONTS.regular,
    fontSize: FONT_SIZES.sm,
    color: COLORS.text.disabled,
    fontStyle: 'italic',
    paddingVertical: 8,
    textAlign: 'center',
  },
});
