/**
 * BadgeManagementScreen
 *
 * Full screen for managing received badges: feature, hide, un-feature.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { FriendBadgeWithGiver } from '../../types/badges';
import { getReceivedBadges, toggleFeatured, toggleHidden } from '../../services/badgeService';
import { BadgeIcon } from '../../components/icons/BadgeIcon';
import { EvaIcon } from '../../components/icons';
import { FONTS, FONT_SIZES } from '../../constants/typography';
import { COLORS } from '../../theme/colors';
import { lightHaptic, successHaptic } from '../../utils/haptics';
import { showToast } from '../../utils/toast';

export const BadgeManagementScreen: React.FC = () => {
  const navigation = useNavigation();
  const [badges, setBadges] = useState<FriendBadgeWithGiver[]>([]);
  const [loading, setLoading] = useState(true);
  const [showHidden, setShowHidden] = useState(false);

  const loadBadges = useCallback(async () => {
    setLoading(true);
    const result = await getReceivedBadges();
    if (result.ok && result.data) {
      setBadges(result.data);
    }
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadBadges();
    }, [loadBadges])
  );

  const featured = badges.filter(b => b.isFeatured && !b.isHidden);
  const visible = badges.filter(b => !b.isFeatured && !b.isHidden);
  const hidden = badges.filter(b => b.isHidden);

  const handleToggleFeatured = async (badge: FriendBadgeWithGiver) => {
    lightHaptic();
    const result = await toggleFeatured(badge.id, !badge.isFeatured);
    if (result.ok) {
      successHaptic();
      loadBadges();
    } else {
      showToast.error(result.error?.message || 'Failed to update');
    }
  };

  const handleToggleHidden = async (badge: FriendBadgeWithGiver) => {
    lightHaptic();
    const result = await toggleHidden(badge.id, !badge.isHidden);
    if (result.ok) {
      loadBadges();
    } else {
      showToast.error(result.error?.message || 'Failed to update');
    }
  };

  const renderBadgeRow = (badge: FriendBadgeWithGiver, dimmed = false) => (
    <View key={badge.id} style={[styles.badgeRow, dimmed && styles.badgeRowDimmed]}>
      <BadgeIcon name={badge.iconName} size={28} />
      <View style={styles.badgeInfo}>
        <Text style={styles.badgeMessage} numberOfLines={1}>{badge.message}</Text>
        <Text style={styles.badgeGiver}>from {badge.giverFirstName}</Text>
      </View>
      <TouchableOpacity
        onPress={() => handleToggleFeatured(badge)}
        style={styles.iconButton}
      >
        <EvaIcon
          name="star"
          variant={badge.isFeatured ? 'fill' : 'outline'}
          size={22}
          color={badge.isFeatured ? '#F59E0B' : COLORS.text.muted}
        />
      </TouchableOpacity>
      <TouchableOpacity
        onPress={() => handleToggleHidden(badge)}
        style={styles.iconButton}
      >
        <EvaIcon
          name={badge.isHidden ? 'eye-off' : 'eye'}
          variant="outline"
          size={22}
          color={COLORS.text.muted}
        />
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color="#437FFF" size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <EvaIcon name="arrow-back" variant="outline" size={24} color={COLORS.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Manage Badges</Text>
        <View style={styles.backBtn} />
      </View>

      {badges.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.emptyTitle}>No badges yet</Text>
          <Text style={styles.emptySubtitle}>
            When friends award you badges, they'll appear here.
          </Text>
        </View>
      ) : (
        <FlatList
          data={[]}
          renderItem={null}
          ListHeaderComponent={
            <>
              {/* Featured Section */}
              {featured.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Featured ({featured.length}/3)</Text>
                  {featured.map(b => renderBadgeRow(b))}
                </View>
              )}

              {/* All Badges Section */}
              {visible.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>All Badges</Text>
                  {visible.map(b => renderBadgeRow(b))}
                </View>
              )}

              {/* Hidden Section */}
              {hidden.length > 0 && (
                <View style={styles.section}>
                  <TouchableOpacity
                    onPress={() => {
                      lightHaptic();
                      setShowHidden(!showHidden);
                    }}
                    style={styles.hiddenToggle}
                  >
                    <Text style={styles.sectionTitle}>Hidden ({hidden.length})</Text>
                    <EvaIcon
                      name={showHidden ? 'chevron-up' : 'chevron-down'}
                      variant="outline"
                      size={20}
                      color={COLORS.text.muted}
                    />
                  </TouchableOpacity>
                  {showHidden && hidden.map(b => renderBadgeRow(b, true))}
                </View>
              )}
            </>
          }
          contentContainerStyle={styles.listContent}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderSubtle,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontFamily: FONTS.bold,
    fontSize: FONT_SIZES.xl,
    color: COLORS.text.primary,
  },
  listContent: {
    padding: 16,
    paddingBottom: 40,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontFamily: FONTS.semiBold,
    fontSize: FONT_SIZES.base,
    color: COLORS.text.muted,
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderSubtle,
    gap: 12,
  },
  badgeRowDimmed: {
    opacity: 0.5,
  },
  badgeInfo: {
    flex: 1,
  },
  badgeMessage: {
    fontFamily: FONTS.medium,
    fontSize: FONT_SIZES.base,
    color: COLORS.text.primary,
  },
  badgeGiver: {
    fontFamily: FONTS.regular,
    fontSize: FONT_SIZES.sm,
    color: COLORS.text.muted,
    marginTop: 2,
  },
  iconButton: {
    padding: 6,
  },
  hiddenToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  emptyTitle: {
    fontFamily: FONTS.semiBold,
    fontSize: FONT_SIZES.lg,
    color: COLORS.text.primary,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontFamily: FONTS.regular,
    fontSize: FONT_SIZES.base,
    color: COLORS.text.muted,
    textAlign: 'center',
  },
});

export default BadgeManagementScreen;
