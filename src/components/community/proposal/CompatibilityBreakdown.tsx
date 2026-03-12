import React from 'react';
import { View, Text } from 'react-native';
import { styled } from 'nativewind';
import { FONTS } from '../../../constants/typography';

const StyledView = styled(View);
const StyledText = styled(Text);

const CATEGORY_LABELS: Record<string, string> = {
  age_range: 'Age',
  distance: 'Distance',
  lifestyle_substances: 'Lifestyle',
  values: 'Values',
  interests: 'Interests',
  family: 'Family',
  religion: 'Religion',
  politics: 'Politics',
  height: 'Height',
  ethnicity: 'Ethnicity',
  deep_questions: 'Deep Questions',
  education: 'Education',
  career: 'Career',
};

const CATEGORY_ORDER = [
  'age_range', 'distance', 'lifestyle_substances', 'values', 'interests',
  'family', 'religion', 'politics', 'height', 'ethnicity', 'deep_questions',
  'education', 'career',
];

function getBarColor(score: number): string {
  if (score >= 80) return '#22C55E';
  if (score >= 60) return '#84CC16';
  if (score >= 40) return '#EAB308';
  if (score >= 20) return '#F97316';
  return '#EF4444';
}

interface CompatibilityBreakdownProps {
  categoryScores: Record<string, number>;
  totalScore: number;
}

export function CompatibilityBreakdown({ categoryScores, totalScore }: CompatibilityBreakdownProps) {
  const categories = CATEGORY_ORDER.filter(key => key in categoryScores);

  return (
    <StyledView className="bg-white rounded-2xl p-4 mx-4 mb-4">
      <StyledView className="flex-row items-center justify-between mb-4">
        <StyledText className="text-lg font-semibold text-neutral-900" style={{ fontFamily: FONTS.semiBold }}>
          Compatibility
        </StyledText>
        <StyledView className="bg-green-50 rounded-full px-3 py-1">
          <StyledText className="text-green-700 font-bold text-base" style={{ fontFamily: FONTS.bold }}>
            {Math.round(totalScore)}%
          </StyledText>
        </StyledView>
      </StyledView>

      {categories.map((key) => {
        const score = categoryScores[key] ?? 0;
        const label = CATEGORY_LABELS[key] || key;
        const color = getBarColor(score);

        return (
          <StyledView key={key} className="flex-row items-center mb-2.5">
            <StyledText className="text-xs text-neutral-500 w-24" numberOfLines={1}>
              {label}
            </StyledText>
            <StyledView className="flex-1 h-2.5 bg-neutral-100 rounded-full mx-2 overflow-hidden">
              <StyledView
                className="h-full rounded-full"
                style={{ width: `${Math.min(100, Math.max(0, score))}%`, backgroundColor: color }}
              />
            </StyledView>
            <StyledText className="text-xs text-neutral-400 w-8 text-right">
              {Math.round(score)}
            </StyledText>
          </StyledView>
        );
      })}
    </StyledView>
  );
}
