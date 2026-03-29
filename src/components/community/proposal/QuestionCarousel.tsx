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
import { SPRINGS, DURATIONS } from '../../../constants/animations';
import * as Haptics from 'expo-haptics';
import { FONTS, FONT_SIZES, LINE_HEIGHTS } from '../../../constants/typography';
import { COLORS } from '../../../theme/colors';
import { EvaIcon } from '../../icons';
import type { DeepQuestionData } from './proposalHelpers';

// Color for person B — distinct from person A's primary blue
const ACCENT_B = COLORS.purple; // #7C3AED

// Decorative open-quote color — cyan accent at reduced opacity
const QUOTE_COLOR = '#06B6D4';

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
  // Animated background + border color for reveal transition
  const bgOpacity = useSharedValue(revealed ? 0 : 1);
  const borderFlash = useSharedValue(revealed ? 0 : 0);

  const scaleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scaleValue.value }],
  }));

  const cardStyle = useAnimatedStyle(() => ({
    // Tinted bg fades to white on reveal
    backgroundColor: `rgba(${accentColor === COLORS.primary ? '37, 99, 235' : '124, 58, 237'}, ${bgOpacity.value * 0.04})`,
    borderColor: `rgba(${accentColor === COLORS.primary ? '37, 99, 235' : '124, 58, 237'}, ${0.15 + borderFlash.value * 0.4})`,
  }));

  // Trigger reveal animation
  const handleReveal = useCallback(() => {
    if (revealed) return;
    onReveal();
    // Fade tint to white
    bgOpacity.value = withTiming(0, { duration: DURATIONS.normal });
    // Flash border then settle
    borderFlash.value = withSequence(
      withTiming(1, { duration: 100 }),
      withTiming(0.3, { duration: 400 }),
    );
  }, [revealed, onReveal]);

  return (
    <TouchableOpacity
      onPress={handleReveal}
      activeOpacity={revealed ? 1 : 0.75}
      disabled={revealed}
      accessibilityRole="button"
      accessibilityLabel={revealed ? `${initial}'s answer: ${answer}` : `${initial}'s answer, hidden`}
      accessibilityHint={revealed ? undefined : 'Double tap to reveal their answer'}
    >
      <Animated.View style={[scaleStyle, cardStyle, {
        flexDirection: 'row',
        borderRadius: 10,
        overflow: 'hidden',
        borderWidth: 1,
      }]}>

        {/* Left accent bar */}
        <View style={{
          width: 4,
          backgroundColor: accentColor,
          opacity: revealed ? 1 : 0.45,
        }} />

        {/* Content */}
        <View style={{ flex: 1, paddingHorizontal: 12, paddingVertical: 10 }}>
          {/* Initials — always visible */}
          <Text style={{
            fontFamily: FONTS.semiBold,
            fontWeight: '600',
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
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              <EvaIcon name="lock" variant="outline" size={14} color={accentColor} style={{ opacity: 0.6 }} />
              <Text style={{
                fontFamily: FONTS.regular,
                fontSize: FONT_SIZES.sm,
                color: COLORS.text.secondary,
                fontStyle: 'italic',
              }}>
                Tap to reveal
              </Text>
            </View>
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
      {/* Question prompt — italic with inline decorative quote mark */}
      <Text style={{
        fontFamily: FONTS.medium,
        fontWeight: '500',
        fontSize: FONT_SIZES.lg,
        fontStyle: 'italic',
        color: COLORS.text.heading,
        lineHeight: LINE_HEIGHTS.xl,
        marginBottom: 12,
      }}>
        <Text style={{ fontFamily: FONTS.bold, fontWeight: '700', fontSize: FONT_SIZES['3xl'], color: QUOTE_COLOR, opacity: 0.25 }}>{'\u201C'}{' '}</Text>
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
  // Clamp currentPage if questions array shrinks (e.g., proposal change)
  const safePage = Math.min(currentPage, Math.max(0, total - 1));
  if (safePage !== currentPage) setCurrentPage(safePage);

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
        key={`qp-${questions[safePage].questionId}`}
        question={questions[safePage]}
        userAInitial={userAInitial}
        userBInitial={userBInitial}
      />

      {total > 1 && (
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          marginTop: 14,
          gap: 8,
        }}>
          {questions.map((_, i) => {
            const isActive = i === safePage;
            return (
              <TouchableOpacity
                key={`qdot-${i}`}
                onPress={() => setCurrentPage(i)}
                hitSlop={{ top: 10, bottom: 10, left: 8, right: 8 }}
                accessibilityRole="button"
                accessibilityLabel={`Question ${i + 1} of ${total}`}
              >
                <View style={{
                  width: 22,
                  height: 22,
                  borderRadius: 11,
                  backgroundColor: isActive ? COLORS.primary : 'transparent',
                  borderWidth: isActive ? 0 : 1,
                  borderColor: COLORS.borderGray,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <Text style={{
                    fontFamily: FONTS.semiBold,
                    fontWeight: '600',
                    fontSize: FONT_SIZES.xs,
                    color: isActive ? COLORS.card : COLORS.text.secondary,
                  }}>
                    {i + 1}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </View>
  );
}
