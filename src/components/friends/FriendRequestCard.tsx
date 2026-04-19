/**
 * FriendRequestCard Component
 *
 * Displays an incoming friend request with Accept/Decline buttons.
 * Used in FriendsAreaView's "Friend Requests" section.
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { styled } from 'nativewind';
import { FriendRequest } from '../../services/friendService';
import { FONTS, FONT_SIZES } from '../../constants/typography';
import { COLORS } from '../../theme/colors';
import { SHADOWS } from '../../theme/shadows';
import { EvaIcon } from '../icons';
import { getOptimizedPhotoUrl } from '../../utils/imageUtils';

const StyledView = styled(View);
const StyledText = styled(Text);
const StyledTouchable = styled(TouchableOpacity);

interface FriendRequestCardProps {
  request: FriendRequest;
  onAccept: () => void;
  onDecline: () => void;
  isProcessing?: boolean;
}

export const FriendRequestCard: React.FC<FriendRequestCardProps> = ({
  request,
  onAccept,
  onDecline,
  isProcessing = false,
}) => {
  const name = request.senderProfile.firstName || 'Someone';
  const photoUrl = getOptimizedPhotoUrl(request.senderProfile.photos?.[0]?.url, 'avatar') || undefined;
  const photoBlurhash = request.senderProfile.photos?.[0]?.blurhash || undefined;
  const initial = (request.senderProfile.firstName?.[0] ?? '?').toUpperCase();
  return (
    <StyledView style={styles.container}>
      {/* Avatar — photo or initials fallback */}
      {photoUrl ? (
        <Image
          source={{ uri: photoUrl }}
          placeholder={photoBlurhash ? { blurhash: photoBlurhash } : undefined}
          style={styles.avatar}
          cachePolicy="memory-disk"
          transition={300}
        />
      ) : (
        <StyledView style={[styles.avatar, styles.avatarFallback]}>
          <StyledText style={styles.avatarInitial}>{initial}</StyledText>
        </StyledView>
      )}

      {/* Info */}
      <StyledView style={styles.info}>
        <StyledText numberOfLines={1} style={styles.name}>
          {name}
        </StyledText>
      </StyledView>

      {/* Actions */}
      {isProcessing ? (
        <ActivityIndicator size="small" color={COLORS.primaryAccent} />
      ) : (
        <StyledView style={styles.actions}>
          {/* Decline */}
          <StyledTouchable
            onPress={onDecline}
            style={styles.declineButton}
            activeOpacity={0.7}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <EvaIcon name="close" variant="outline" size={18} color={COLORS.text.secondary} />
          </StyledTouchable>

          {/* Accept */}
          <StyledTouchable
            onPress={onAccept}
            style={styles.acceptButton}
            activeOpacity={0.75}
          >
            <StyledText style={styles.acceptText}>Accept</StyledText>
          </StyledTouchable>
        </StyledView>
      )}
    </StyledView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: COLORS.card,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.card,
  },
  avatarFallback: {
    backgroundColor: COLORS.screenBackground,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  avatarInitial: {
    fontFamily: FONTS.bold,
    fontSize: FONT_SIZES.lg,
    color: COLORS.text.secondary,
  },
  info: {
    flex: 1,
    marginLeft: 12,
  },
  name: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    fontFamily: FONTS.bold,
    color: COLORS.text.primary,
  },
  subtitle: {
    fontSize: FONT_SIZES.sm,
    fontFamily: FONTS.regular,
    color: COLORS.text.secondary,
    marginTop: 2,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  declineButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  acceptButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    ...SHADOWS.sm,
  },
  acceptText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '700',
    fontFamily: FONTS.bold,
    color: '#FFFFFF',
  },
});

export default FriendRequestCard;
