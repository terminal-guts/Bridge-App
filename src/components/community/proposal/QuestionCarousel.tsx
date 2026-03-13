/**
 * QuestionCarousel, QuestionPage, and RevealCardInline.
 * Deep questions section with card-reveal mechanic.
 * Extracted from ProposalReviewView.tsx.
 */

import React, { useState, useRef, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Animated, Dimensions } from 'react-native';
import * as Haptics from 'expo-haptics';
import { FONTS, FONT_SIZES, LINE_HEIGHTS } from '../../../constants/typography';
import { COLORS } from '../../../theme/colors';
import type { DeepQuestionData } from './proposalHelpers';

const BLUE = COLORS.primary;
const SCREEN_WIDTH = Dimensions.get('window').width;
const CAROUSEL_CONTENT_WIDTH = SCREEN_WIDTH - 32 - 24;

export { CAROUSEL_CONTENT_WIDTH };

// ─── RevealCardInline ────────────────────────────────────────────────────────
function RevealCardInline({
  name,
  answer,
  revealed,
  onReveal,
  scale,
  side,
}: {
  name: string;
  answer: string;
  revealed: boolean;
  onReveal: () => void;
  scale: Animated.Value;
  side: 'left' | 'right' | 'solo';
}) {
  const minH = side === 'solo' ? 70 : 90;
  return (
    <TouchableOpacity
      onPress={onReveal}
      activeOpacity={revealed ? 1 : 0.7}
      style={{ flex: side === 'solo' ? undefined : 1 }}
    >
      <Animated.View style={{
        minHeight: minH,
        borderRadius: 10,
        padding: 12,
        justifyContent: 'center',
        transform: [{ scale }],
        ...(revealed
          ? { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#CBD5E1' }
          : { backgroundColor: '#0F172A', borderWidth: 1, borderColor: 'rgba(99, 131, 255, 0.2)' }),
      }}>
        {revealed ? (
          <>
            <Text style={{
              fontFamily: FONTS.medium, fontWeight: '500', fontSize: FONT_SIZES.xs,
              color: BLUE, marginBottom: 6,
            }}>{name}</Text>
            <Text style={{
              fontFamily: FONTS.regular, fontSize: FONT_SIZES.md,
              color: COLORS.text.muted, lineHeight: LINE_HEIGHTS.base,
            }}>{answer}</Text>
          </>
        ) : side === 'solo' ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={{
              width: 36, height: 36, borderRadius: 18,
              backgroundColor: 'rgba(99, 131, 255, 0.2)',
              alignItems: 'center', justifyContent: 'center',
            }}>
              <Text style={{ fontFamily: FONTS.bold, fontSize: FONT_SIZES.xl, color: '#93A8FF' }}>?</Text>
            </View>
            <View>
              <Text style={{ fontFamily: FONTS.medium, fontSize: FONT_SIZES.md, color: '#FFFFFF' }}>{name}</Text>
              <Text style={{ fontFamily: FONTS.regular, fontSize: FONT_SIZES.xs, color: 'rgba(255,255,255,0.5)' }}>Tap to reveal</Text>
            </View>
          </View>
        ) : (
          <View style={{ alignItems: 'center' }}>
            <View style={{
              width: 38, height: 38, borderRadius: 19,
              backgroundColor: 'rgba(99, 131, 255, 0.2)',
              alignItems: 'center', justifyContent: 'center', marginBottom: 8,
            }}>
              <Text style={{ fontFamily: FONTS.bold, fontSize: FONT_SIZES['2xl'], color: '#93A8FF' }}>?</Text>
            </View>
            <Text style={{ fontFamily: FONTS.medium, fontSize: FONT_SIZES.sm, color: 'rgba(255,255,255,0.75)' }}>{name}</Text>
          </View>
        )}
      </Animated.View>
    </TouchableOpacity>
  );
}

// ─── QuestionPage ────────────────────────────────────────────────────────────
function QuestionPage({
  question,
  userAName,
  userBName,
  width,
}: {
  question: DeepQuestionData;
  userAName: string;
  userBName: string;
  width: number;
}) {
  const hasA = !!question.userAAnswer;
  const hasB = !!question.userBAnswer;
  const bothAnswered = hasA && hasB;
  const [revealedA, setRevealedA] = useState(false);
  const [revealedB, setRevealedB] = useState(false);

  const scaleA = useRef(new Animated.Value(1)).current;
  const scaleB = useRef(new Animated.Value(1)).current;

  const revealA = useCallback(() => {
    if (revealedA || !hasA) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    Animated.sequence([
      Animated.timing(scaleA, { toValue: 0.92, duration: 80, useNativeDriver: true }),
      Animated.spring(scaleA, { toValue: 1, friction: 4, tension: 120, useNativeDriver: true }),
    ]).start();
    setRevealedA(true);
  }, [revealedA, hasA, scaleA]);

  const revealB = useCallback(() => {
    if (revealedB || !hasB) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    Animated.sequence([
      Animated.timing(scaleB, { toValue: 0.92, duration: 80, useNativeDriver: true }),
      Animated.spring(scaleB, { toValue: 1, friction: 4, tension: 120, useNativeDriver: true }),
    ]).start();
    setRevealedB(true);
  }, [revealedB, hasB, scaleB]);

  return (
    <View style={{ width, paddingRight: 0 }}>
      <View style={{
        backgroundColor: COLORS.background,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: COLORS.border,
        padding: 14,
      }}>
          <Text style={{
            fontFamily: FONTS.semiBold, fontWeight: '600',
            fontSize: FONT_SIZES.base, color: COLORS.text.heading, marginBottom: 12, lineHeight: LINE_HEIGHTS.lg,
          }}>
            {question.questionText}
          </Text>

          {bothAnswered ? (
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <RevealCardInline name={userAName} answer={question.userAAnswer!} revealed={revealedA} onReveal={revealA} scale={scaleA} side="left" />
              <RevealCardInline name={userBName} answer={question.userBAnswer!} revealed={revealedB} onReveal={revealB} scale={scaleB} side="right" />
            </View>
          ) : hasA ? (
            <RevealCardInline name={userAName} answer={question.userAAnswer!} revealed={revealedA} onReveal={revealA} scale={scaleA} side="solo" />
          ) : (
            <RevealCardInline name={userBName} answer={question.userBAnswer!} revealed={revealedB} onReveal={revealB} scale={scaleB} side="solo" />
          )}
      </View>
    </View>
  );
}

// ─── QuestionCarousel ────────────────────────────────────────────────────────
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

  const onScroll = useCallback((e: any) => {
    const page = Math.round(e.nativeEvent.contentOffset.x / CAROUSEL_CONTENT_WIDTH);
    setCurrentPage(page);
  }, []);

  return (
    <View>
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onScroll}
        decelerationRate="fast"
        snapToInterval={CAROUSEL_CONTENT_WIDTH}
        contentContainerStyle={{ gap: 0 }}
      >
        {questions.map((q) => (
          <QuestionPage
            key={`qp-${q.questionId}`}
            question={q}
            userAName={userAName}
            userBName={userBName}
            width={CAROUSEL_CONTENT_WIDTH}
          />
        ))}
      </ScrollView>

      {total > 1 && (
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 12, gap: 6 }}>
          {questions.map((_, i) => (
            <View
              key={`qdot-${i}`}
              style={{
                width: i === currentPage ? 18 : 6,
                height: 6,
                borderRadius: 3,
                backgroundColor: i === currentPage ? BLUE : COLORS.borderGray,
              }}
            />
          ))}
          <Text style={{
            fontFamily: FONTS.medium, fontSize: FONT_SIZES.xs,
            color: COLORS.text.disabled, marginLeft: 6,
          }}>
            {currentPage + 1}/{total}
          </Text>
        </View>
      )}
    </View>
  );
}
