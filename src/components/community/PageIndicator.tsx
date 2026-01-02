/**
 * PageIndicator
 *
 * Navigation dots for the Community tab's 3-page layout.
 *
 * Features:
 * - Shows 3 dots representing Daily Grid, Proposal Review, Friends Area
 * - Highlights current page
 * - Shows lock icon on Friends Area if locked
 * - Tappable to navigate directly to pages
 * - Smooth animations for page transitions
 *
 * Design: Minimal dots with labels, warm colors, premium feel
 */

import React from 'react';
import { View, TouchableOpacity, Animated } from 'react-native';
import { styled } from 'nativewind';
import { Ionicons } from '@expo/vector-icons';

import { Body } from '../ui';
import { lightHaptic } from '../../utils/haptics';

// Styled components
const StyledView = styled(View);
const StyledTouchableOpacity = styled(TouchableOpacity);

// Types
interface PageIndicatorProps {
  currentPage: 0 | 1 | 2;
  totalPages: 3;
  onPagePress: (pageIndex: 0 | 1 | 2) => void;
  friendsAreaLocked?: boolean;
}

const PAGE_LABELS = ['Daily Grid', 'Proposals', 'Friends'];

export function PageIndicator({
  currentPage,
  totalPages,
  onPagePress,
  friendsAreaLocked = false,
}: PageIndicatorProps) {
  const handlePagePress = (pageIndex: 0 | 1 | 2) => {
    lightHaptic();
    onPagePress(pageIndex);
  };

  return (
    <StyledView className="flex-row items-center justify-center">
      {Array.from({ length: totalPages }).map((_, index) => {
        const isActive = index === currentPage;
        const isLocked = index === 2 && friendsAreaLocked;

        return (
          <StyledTouchableOpacity
            key={index}
            onPress={() => handlePagePress(index as 0 | 1 | 2)}
            activeOpacity={0.7}
            className="items-center"
            style={{ marginLeft: index > 0 ? 24 : 0 }}
            disabled={isLocked && !isActive}
          >
            {/* Dot */}
            <StyledView
              className={`h-2 w-2 rounded-full mb-1 ${
                isActive
                  ? 'bg-rose-500'
                  : isLocked
                  ? 'bg-neutral-300'
                  : 'bg-neutral-400'
              }`}
            />

            {/* Label */}
            <StyledView className="flex-row items-center">
              <Body
                className={`text-xs ${
                  isActive
                    ? 'text-neutral-900 font-semibold'
                    : isLocked
                    ? 'text-neutral-400'
                    : 'text-neutral-600'
                }`}
              >
                {PAGE_LABELS[index]}
              </Body>

              {/* Lock icon for Friends Area */}
              {isLocked && (
                <Ionicons name="lock-closed" size={12} color="#A3A3A3" style={{ marginLeft: 4 }} />
              )}
            </StyledView>
          </StyledTouchableOpacity>
        );
      })}
    </StyledView>
  );
}

export default PageIndicator;
