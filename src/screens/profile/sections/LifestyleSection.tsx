import React from 'react';
import { View, Text } from 'react-native';
import { styled } from 'nativewind';
import { Card } from '../../../components/ui/Card';
import { H3, Body } from '../../../components/ui/Typography';
import { Chip } from '../../../components/ui/Chip';
import { COLORS } from '../../../theme/colors';
import { FONTS } from '../../../constants/typography';

const StyledView = styled(View);
const StyledText = styled(Text);

const SectionHeader: React.FC<{ title: string; titleExtra?: React.ReactNode }> = ({ title, titleExtra }) => (
  <StyledView className="mb-3 mt-2">
    <Body className="text-neutral-500 text-xs font-semibold tracking-wider">
      {title}{titleExtra}
    </Body>
  </StyledView>
);

const FREQUENCY_OPTIONS = [
  { value: 'no', label: 'No' },
  { value: 'sometimes', label: 'Sometimes' },
  { value: 'yes', label: 'Yes' },
];

const PREFER_NOT_TO_SAY = { value: 'prefer_not_to_say', label: 'Prefer Not to Say' };

interface LifestyleSectionProps {
  drinkingFrequency?: string;
  cannabisFrequency?: string;
  tobaccoFrequency?: string;
  otherDrugsFrequency?: string;
  onUpdateDrinking: (value: string) => void;
  onUpdateCannabis: (value: string) => void;
  onUpdateTobacco: (value: string) => void;
  onUpdateOtherDrugs: (value: string) => void;
}

export const LifestyleSection = React.memo<LifestyleSectionProps>(({
  drinkingFrequency,
  cannabisFrequency,
  tobaccoFrequency,
  otherDrugsFrequency,
  onUpdateDrinking,
  onUpdateCannabis,
  onUpdateTobacco,
  onUpdateOtherDrugs,
}) => {
  return (
    <Card className="mb-6">
      <H3 className="mb-4">Lifestyle Habits</H3>

      {/* Drinking Frequency */}
      <SectionHeader title="DRINKING" titleExtra={<StyledText style={{ color: COLORS.error, fontFamily: FONTS.regular }}> *</StyledText>} />
      <StyledView className="flex-row flex-wrap mb-5" style={{ gap: 10 }}>
        {[...FREQUENCY_OPTIONS, PREFER_NOT_TO_SAY].map((option) => (
          <Chip
            key={option.value}
            label={option.label}
            selected={drinkingFrequency === option.value}
            onPress={() => onUpdateDrinking(drinkingFrequency === option.value ? '' : option.value)}
          />
        ))}
      </StyledView>

      {/* Cannabis */}
      <SectionHeader title="CANNABIS" titleExtra={<StyledText style={{ color: COLORS.error, fontFamily: FONTS.regular }}> *</StyledText>} />
      <StyledView className="flex-row flex-wrap mb-5" style={{ gap: 10 }}>
        {[...FREQUENCY_OPTIONS, PREFER_NOT_TO_SAY].map((option) => (
          <Chip
            key={option.value}
            label={option.label}
            selected={cannabisFrequency === option.value}
            onPress={() => onUpdateCannabis(cannabisFrequency === option.value ? '' : option.value)}
          />
        ))}
      </StyledView>

      {/* Tobacco/Vaping */}
      <SectionHeader title="TOBACCO/VAPING" titleExtra={<StyledText style={{ color: COLORS.error, fontFamily: FONTS.regular }}> *</StyledText>} />
      <StyledView className="flex-row flex-wrap mb-5" style={{ gap: 10 }}>
        {[...FREQUENCY_OPTIONS, PREFER_NOT_TO_SAY].map((option) => (
          <Chip
            key={option.value}
            label={option.label}
            selected={tobaccoFrequency === option.value}
            onPress={() => onUpdateTobacco(tobaccoFrequency === option.value ? '' : option.value)}
          />
        ))}
      </StyledView>

      {/* Other Drugs */}
      <SectionHeader title="OTHER DRUGS" titleExtra={<StyledText style={{ color: COLORS.error, fontFamily: FONTS.regular }}> *</StyledText>} />
      <StyledView className="flex-row flex-wrap mb-5" style={{ gap: 10 }}>
        {[...FREQUENCY_OPTIONS, PREFER_NOT_TO_SAY].map((option) => (
          <Chip
            key={option.value}
            label={option.label}
            selected={otherDrugsFrequency === option.value}
            onPress={() => onUpdateOtherDrugs(otherDrugsFrequency === option.value ? '' : option.value)}
          />
        ))}
      </StyledView>
    </Card>
  );
});

LifestyleSection.displayName = 'LifestyleSection';
