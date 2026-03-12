/**
 * Match Card Image Generator
 *
 * Generates a shareable match card image (1080x1920, Instagram Story format).
 * Uses expo-view-shot to capture the offscreen ShareableMatchCard component.
 */

import React, { createRef } from 'react';
import ViewShot from 'react-native-view-shot';

// ──────────────────────────────────────────────────────────────────────────────
// Hash-based decorative approval score (CLAUDE.md: LOCKED)
// Seeded by match/proposal ID — always 70–99, stable per ID
// ──────────────────────────────────────────────────────────────────────────────
export function computeApprovalPercent(id: string): number {
  return 70 + (id.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % 30);
}

// ──────────────────────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────────────────────
export interface MatchCardInput {
  matchId: string;
  user1Photo: string | null;
  user1Name: string;
  user2Photo: string | null;
  user2Name: string;
  endorserAvatars: string[];
  endorserCount: number;
}

export interface MatchCardResult {
  uri: string;
  approvalPercent: number;
}

// ──────────────────────────────────────────────────────────────────────────────
// Capture helper
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Captures the match card image from a ViewShot ref.
 * The caller is responsible for rendering <ShareableMatchCard ref={viewShotRef} />
 * offscreen and passing the ref here.
 */
export async function captureMatchCard(viewShotRef: React.RefObject<ViewShot | null>): Promise<string> {
  if (!viewShotRef.current?.capture) {
    throw new Error('ViewShot ref is not ready — ensure ShareableMatchCard is mounted');
  }
  const uri = await viewShotRef.current.capture();
  return uri;
}

/**
 * Creates a ref for the ViewShot component and returns it along with
 * helpers to build the props for <ShareableMatchCard>.
 */
export function prepareMatchCard(input: MatchCardInput) {
  const viewShotRef = createRef<ViewShot>();
  const approvalPercent = computeApprovalPercent(input.matchId);

  const cardProps = {
    user1Photo: input.user1Photo,
    user1Name: input.user1Name,
    user2Photo: input.user2Photo,
    user2Name: input.user2Name,
    approvalPercent,
    matchedByCount: input.endorserCount,
    matchedByAvatars: input.endorserAvatars,
  };

  return {
    viewShotRef,
    cardProps,
    approvalPercent,
    capture: () => captureMatchCard(viewShotRef),
  };
}
