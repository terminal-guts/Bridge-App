import React, { useMemo, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl, useWindowDimensions } from 'react-native';
import ReanimatedAnimated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MatchCard } from '../../components/matches/MatchCard';
import { OfflineBanner } from '../../components/ui/OfflineBanner';
import { ClockIcon } from '../../components/icons/Icons';
import { ProfileCompletionBanner } from '../../components/profile/ProfileCompletionBanner';
import { ShareMatchSheet } from '../../components/matches/ShareMatchSheet';
import { ShareableMatchCard } from '../../components/matches/ShareableMatchCard';
import { computeApprovalPercent } from '../../utils/matchCardGenerator';
import { Image } from 'expo-image';
import { getOptimizedPhotoUrl } from '../../utils/imageUtils';
import { COLORS } from '../../theme/colors';
import { useMatchesScreen } from './useMatchesScreen';

import {
    type ScreenState,
    CARD_STATUS,
    MatchesLoadingView,
    MatchesLockedView,
    EmptyStateView,
    EndedMatchPopupModal,
    EndMatchModal,
    TimerInfoModal,
    ConfettiOverlay,
    computeTimerInfo,
    buildCardProps,
    styles,
} from './MatchesScreen.components';

// ── Main screen ──────────────────────────────────────────────────────────────
export function MatchesScreen() {
    const state = useMatchesScreen();
    const { height: windowHeight } = useWindowDimensions();
    const insets = useSafeAreaInsets();

    // All spacing proportional to screen height — scales across iPhone SE to Pro Max
    const headerPad = Math.round(windowHeight * 0.011);
    const scrollMargin = Math.round(windowHeight * 0.009);
    const cardMB = Math.round(windowHeight * 0.018);
    const tabBarH = Math.round(windowHeight * 0.057) + insets.bottom;
    const headerTotal = headerPad + 38 + 8 + scrollMargin;
    const activeCardHeight = windowHeight - insets.top - headerTotal - tabBarH - cardMB;

    // ── Loading state ────────────────────────────────────────────────────────
    if (state.loading && !state.popupEvent) {
        return <MatchesLoadingView />;
    }

    // ── Profile incomplete gate ──────────────────────────────────────────────
    if (state.isLocked) {
        state.wasLockedRef.current = true;
        return (
            <MatchesLockedView
                profile={state.profile}
                navigation={state.navigation}
                handleRefresh={state.handleRefresh}
                refreshing={state.refreshing}
            />
        );
    }

    // Check if we just transitioned from locked state
    const animateEntrance = state.wasLockedRef.current;
    if (state.wasLockedRef.current) state.wasLockedRef.current = false;

    // ── Empty state ──────────────────────────────────────────────────────────
    if (state.screenState === 'empty') {
        return (
            <EmptyStateView
                profile={state.profile}
                navigation={state.navigation}
                refreshing={state.refreshing}
                handleRefresh={state.handleRefresh}
                emptyCountdown={state.emptyCountdown}
                animateEntrance={animateEntrance}
                popupEvent={state.popupEvent}
                handlePopupContinue={state.handlePopupContinue}
                headerPad={headerPad}
            />
        );
    }

    // ── Active match / proposal view ─────────────────────────────────────────
    // Timer label updates every second — isolated so it doesn't bust cardProps memo
    const timerInfo = useMemo(() => computeTimerInfo(
        state.screenState,
        state.activeMatch,
        state.currentProposal,
        state.now,
    ), [state.screenState, state.activeMatch, state.currentProposal, state.now]);
    const { timerLabel, timerClr, timerBg, timerBdrClr } = timerInfo;

    // Card props do NOT depend on `now` — only recompute when match/proposal data changes
    const cardProps = useMemo(() =>
        buildCardProps(state.screenState, state.activeMatch, state.currentProposal),
        [state.screenState, state.activeMatch, state.currentProposal],
    );
    const { partner, partnerPhoto, partnerPhotoBlurhash, partnerName, partnerAge, endorserAvatars, endorserNames, matchDate } = cardProps;

    const handleCardPress = useCallback(() => {
        if (state.screenState === 'active_match') {
            const match = state.activeMatch;
            if (!match) return;
            state.navigation.navigate('Chat', {
                matchId: match.matchId ?? match.id,
                recipientName: partnerName,
                recipientId: partner?.userId ?? partner?.id,
                recipientPhoto: partnerPhoto,
            });
        } else {
            const proposal = state.currentProposal;
            if (!proposal) return;
            const heroUrl = getOptimizedPhotoUrl(
                proposal.partnerProfile?.photos?.[0]?.url, 'profile'
            );
            if (heroUrl) Image.prefetch(heroUrl).catch(() => {});
            state.navigation.navigate('ProposalProfile', {
                partnerProfile: proposal.partnerProfile,
                communityScore: computeApprovalPercent(proposal.proposalId || ''),
                endorsers: proposal.endorsers ?? [],
                screenState: state.screenState,
                proposalId: proposal.proposalId,
            });
        }
    }, [state.screenState, state.activeMatch, state.currentProposal, state.navigation, partnerName, partner, partnerPhoto]);

    const handleDismiss = useCallback(() => state.setEndMatchModalVisible(true), [state.setEndMatchModalVisible]);

    return (
        <View style={{ flex: 1, backgroundColor: COLORS.screenBackground }}>
            {/* Safe area spacer */}
            <View style={{ paddingTop: insets.top, backgroundColor: COLORS.screenBackground }}>
                <OfflineBanner />
            </View>
            {state.screenState !== 'active_match' && (
                <ProfileCompletionBanner
                    profile={state.profile}
                    onPress={() => state.navigation.navigate('Profile')}
                />
            )}
            {/* Header */}
            <View style={[styles.headerRow, { paddingTop: headerPad }]}>
                <Text style={styles.headerTitle} accessibilityRole="header">Match</Text>
                {timerLabel && state.screenState !== 'active_match' && (
                    <TouchableOpacity activeOpacity={0.7} onPress={() => state.setTimerInfoVisible(true)} accessibilityRole="button" accessibilityLabel={`Timer: ${timerLabel}`}>
                        <View style={[styles.timerBadge, { backgroundColor: timerBg, borderColor: timerBdrClr }]}>
                            <ClockIcon size={13} color={timerClr} />
                            <Text style={[styles.timerText, { color: timerClr }]}>{timerLabel}</Text>
                        </View>
                    </TouchableOpacity>
                )}
            </View>

            <ScrollView
                style={{ flex: 1, paddingHorizontal: 16, marginTop: scrollMargin }}
                refreshControl={
                    <RefreshControl refreshing={state.refreshing} onRefresh={state.handleRefresh} tintColor={COLORS.primary} />
                }
            >
                <ReanimatedAnimated.View style={[{ marginBottom: cardMB, height: activeCardHeight }, state.cardEntranceStyle]}>
                    <MatchCard
                        status={CARD_STATUS[state.screenState as Exclude<ScreenState, 'empty'>]}
                        name={partnerName}
                        age={partnerAge}
                        matchDate={matchDate}
                        imageUrl={partnerPhoto}
                        imageBlurhash={partnerPhotoBlurhash}
                        matchedByAvatars={endorserAvatars}
                        hasUnread={state.hasUnreadMatch}
                        celebrate={state.celebrationActive}
                        messagePreview={state.screenState === 'active_match' ? (state.firstMatchMessage ?? undefined) : undefined}
                        onPress={handleCardPress}
                        onDismiss={state.screenState === 'active_match' ? handleDismiss : undefined}
                        onShare={state.screenState === 'active_match' ? state.handleSharePress : undefined}
                    />
                </ReanimatedAnimated.View>
            </ScrollView>

            {/* Confetti celebration overlay */}
            <ConfettiOverlay active={state.celebrationActive} confettiRef={state.confettiRef} />

            {/* Ended Match Popup */}
            <EndedMatchPopupModal popupEvent={state.popupEvent} onContinue={state.handlePopupContinue} />

            {/* End Match Modal */}
            <EndMatchModal
                visible={state.endMatchModalVisible}
                endMatchReason={state.endMatchReason}
                endMatchCustomReason={state.endMatchCustomReason}
                endMatchSubmitting={state.endMatchSubmitting}
                onReasonSelect={state.setEndMatchReason}
                onCustomReasonChange={state.setEndMatchCustomReason}
                onConfirm={state.handleEndMatchConfirm}
                onDismiss={state.handleEndMatchDismiss}
            />

            {/* Offscreen shareable card (for ViewShot capture) */}
            {state.screenState === 'active_match' && state.activeMatch && (
                <ShareableMatchCard
                    ref={state.viewShotRef}
                    user1Photo={state.profile?.photos?.[0]?.url ?? null}
                    user1Name={state.profile?.firstName ?? 'You'}
                    user2Photo={state.activeMatch.partnerProfile?.photos?.[0]?.url ?? null}
                    user2Name={state.activeMatch.partnerProfile?.firstName ?? 'Match'}
                    approvalPercent={computeApprovalPercent(state.activeMatch.proposalId ?? state.activeMatch.matchId ?? state.activeMatch.id ?? '')}
                    matchedByCount={endorserAvatars.length}
                    matchedByAvatars={endorserAvatars}
                    matchedByNames={endorserNames}
                />
            )}

            {/* Share Match Sheet */}
            <ShareMatchSheet
                visible={state.shareSheetVisible}
                imageUri={state.shareImageUri}
                loading={state.shareLoading}
                onShareSnapchat={state.handleShareSnapchat}
                onShareMessages={state.handleShareMessages}
                onShareMore={state.handleShareMore}
                onSaveToPhotos={state.handleSaveToPhotos}
                onClose={state.handleCloseShareSheet}
            />

            {/* Timer Info Modal */}
            <TimerInfoModal
                visible={state.timerInfoVisible}
                screenState={state.screenState}
                onClose={() => state.setTimerInfoVisible(false)}
            />
        </View>
    );
}

export default MatchesScreen;
