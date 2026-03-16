/**
 * QuestionCarousel
 *
 * Deep questions section for proposal voting.
 *
 * Design decisions:
 * - Index-based pagination (no horizontal ScrollView) — height adapts to each question's content
 * - Swipe left/right via PanResponder to navigate between questions
 * - Stacked cards per person, full width, readable at any length
 * - F.L. initials (first + last) — privacy, not a full name reveal
 * - Left accent bar: A = primary blue, B = purple
 * - Unrevealed: white card, italic "Tap to reveal →" hint
 * - Revealed: colored border, answer text in primary body color
 * - No minHeight — cards size to content naturally
 * - Tappable dots for navigation
 */

import React, { useState, useCallback, useRef } from 'react';
import { View, Text, TouchableOpacity, PanResponder } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
  withSpring,
  SharedValue,
} from 'react-native-reanimated';
import { SPRINGS } from '../../../constants/animations';
import * as Haptics from 'expo-haptics';
import { FONTS, FONT_SIZES, LINE_HEIGHTS } from '../../../constants/typography';
import { COLORS } from '../../../theme/colors';
import type { DeepQuestionData } from './proposalHelpers';

// Color for person B — distinct from person A's primary blue
const ACCENT_B = COLORS.purple; // #7C3AED

// "Mo Orji" → "M.O."
function toInitials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase() + '.';
  return parts[0].charAt(0).toUpperCase() + '.' + parts[parts.length - 1].charAt(0).toUpperCase() + '.';
}

// ─── PersonAnswerCard ─────────────────────────────────────────────────────────
function PersonAnswerCard({
  initial,
  answer,
  revealed,
  onReveal,
  scaleValue,
  accentColor,
}: {
  initial: string;
  answer: string;
  revealed: boolean;
  onReveal: () => void;
  scaleValue: SharedValue<number>;
  accentColor: string;
}) {
  const scaleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scaleValue.value }],
  }));

  return (
    <TouchableOpacity
      onPress={onReveal}
      activeOpacity={revealed ? 1 : 0.75}
      disabled={revealed}
    >
      <Animated.View style={[scaleStyle, {
        flexDirection: 'row',
        borderRadius: 10,
        overflow: 'hidden',
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: revealed ? accentColor + '55' : '#E2E8F0',
      }]}>

        {/* Left accent bar */}
        <View style={{
          width: 3,
          backgroundColor: accentColor,
          opacity: revealed ? 1 : 0.45,
        }} />

        {/* Content */}
        <View style={{ flex: 1, paddingHorizontal: 12, paddingVertical: 10 }}>
          {/* Initials — always visible */}
          <Text style={{
            fontFamily: FONTS.semiBold,
            fontSize: FONT_SIZES.xs,
            color: accentColor,
            marginBottom: 4,
            letterSpacing: 0.2,
          }}>
            {initial}
          </Text>

          {revealed ? (
            <Text style={{
              fontFamily: FONTS.regular,
              fontSize: FONT_SIZES.base,
              color: COLORS.text.primary,
              lineHeight: LINE_HEIGHTS.base,
            }}>
              {answer}
            </Text>
          ) : (
            <Text style={{
              fontFamily: FONTS.regular,
              fontSize: FONT_SIZES.sm,
              color: COLORS.text.disabled,
              fontStyle: 'italic',
            }}>
              Tap to reveal →
            </Text>
          )}
        </View>
      </Animated.View>
    </TouchableOpacity>
  );
}

// ─── QuestionPage ─────────────────────────────────────────────────────────────
function QuestionPage({
  question,
  userAInitial,
  userBInitial,
}: {
  question: DeepQuestionData;
  userAInitial: string;
  userBInitial: string;
}) {
  const hasA = !!question.userAAnswer;
  const hasB = !!question.userBAnswer;

  const [revealedA, setRevealedA] = useState(false);
  const [revealedB, setRevealedB] = useState(false);

  const scaleA = useSharedValue(1);
  const scaleB = useSharedValue(1);

  const revealA = useCallback(() => {
    if (revealedA || !hasA) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    scaleA.value = withSequence(
      withTiming(0.96, { duration: 70 }),
      withSpring(1, SPRINGS.bouncy),
    );
    setRevealedA(true);
  }, [revealedA, hasA]);

  const revealB = useCallback(() => {
    if (revealedB || !hasB) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    scaleB.value = withSequence(
      withTiming(0.96, { duration: 70 }),
      withSpring(1, SPRINGS.bouncy),
    );
    setRevealedB(true);
  }, [revealedB, hasB]);

  return (
    <View>
      {/* Question text */}
      <Text style={{
        fontFamily: FONTS.semiBold,
        fontSize: FONT_SIZES.base,
        color: COLORS.text.heading,
        lineHeight: LINE_HEIGHTS.lg,
        marginBottom: 10,
      }}>
        {question.questionText}
      </Text>

      {/* Stacked answer cards */}
      <View style={{ gap: 8 }}>
        {hasA && (
          <PersonAnswerCard
            initial={userAInitial}
            answer={question.userAAnswer!}
            revealed={revealedA}
            onReveal={revealA}
            scaleValue={scaleA}
            accentColor={COLORS.primary}
          />
        )}
        {hasB && (
          <PersonAnswerCard
            initial={userBInitial}
            answer={question.userBAnswer!}
            revealed={revealedB}
            onReveal={revealB}
            scaleValue={scaleB}
            accentColor={ACCENT_B}
          />
        )}
      </View>
    </View>
  );
}

// ─── QuestionCarousel ─────────────────────────────────────────────────────────
export function QuestionCarousel({
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

  const userAInitial = toInitials(userAName);
  const userBInitial = toInitials(userBName);

  // Use a ref so the PanResponder callback always has the current total
  const totalRef = useRef(total);
  totalRef.current = total;

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gs) =>
        Math.abs(gs.dx) > 8 && Math.abs(gs.dx) > Math.abs(gs.dy),
      onPanResponderRelease: (_, gs) => {
        if (gs.dx < -40) setCurrentPage(p => Math.min(p + 1, totalRef.current - 1));
        else if (gs.dx > 40) setCurrentPage(p => Math.max(p - 1, 0));
      },
    })
  ).current;

  return (
    <View {...panResponder.panHandlers}>
      {/* Current question only — height adapts to content */}
      <QuestionPage
        key={`qp-${questions[currentPage].questionId}`}
        question={questions[currentPage]}
        userAInitial={userAInitial}
        userBInitial={userBInitial}
      />

      {total > 1 && (
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          marginTop: 12,
          gap: 6,
        }}>
          {questions.map((_, i) => (
            <TouchableOpacity
              key={`qdot-${i}`}
              onPress={() => setCurrentPage(i)}
              hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
            >
              <View
                style={{
                  width: i === currentPage ? 18 : 6,
                  height: 6,
                  borderRadius: 3,
                  backgroundColor: i === currentPage ? COLORS.primary : COLORS.borderGray,
                }}
              />
            </TouchableOpacity>
          ))}
          <Text style={{
            fontFamily: FONTS.medium,
            fontSize: FONT_SIZES.xs,
            color: COLORS.text.disabled,
            marginLeft: 6,
          }}>
            {currentPage + 1}/{total}
          </Text>
        </View>
      )}
    </View>
  );
}
