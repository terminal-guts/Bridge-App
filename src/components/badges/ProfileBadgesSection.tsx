/**
 * ProfileBadgesSection Component
 *
 * Displays up to 3 featured badges on a profile.
 * Returns null if the user has no featured badges.
 */

import React, { useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { FriendBadgeWithGiver } from '../../types/badges';
import { getFeaturedBadges } from '../../services/badgeService';
import { BadgeCard } from './BadgeCard';

interface ProfileBadgesSectionProps {
  userId: string;
  revealAuthor?: boolean;
}

export const ProfileBadgesSection: React.FC<ProfileBadgesSectionProps> = React.memo(({
  userId,
  revealAuthor = true,
}) => {
  const [badges, setBadges] = useState<FriendBadgeWithGiver[]>([]);

  useEffect(() => {
    let mounted = true;
    getFeaturedBadges(userId).then(result => {
      if (mounted && result.ok && result.data) {
        setBadges(result.data);
      }
    });
    return () => { mounted = false; };
  }, [userId]);

  if (badges.length === 0) return null;

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        {badges.map(badge => (
          <BadgeCard
            key={badge.id}
            badge={badge}
            revealAuthor={revealAuthor}
            compact
          />
        ))}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
});
