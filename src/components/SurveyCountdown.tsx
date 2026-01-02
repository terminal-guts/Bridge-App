/**
 * SurveyCountdown Component
 *
 * Displays countdown timer to next survey (8 PM daily)
 * Used in the Survey Completed empty state
 */

import React, { useState, useEffect } from 'react';
import { View } from 'react-native';
import { styled } from 'nativewind';
import { H2, Body } from './ui';
import { Ionicons } from '@expo/vector-icons';

const StyledView = styled(View);

interface SurveyCountdownProps {
  targetTime?: Date;
  onCountdownComplete?: () => void;
}

/**
 * Calculate time remaining until 8 PM today or tomorrow
 */
const getTimeUntilNextSurvey = (): { hours: number; minutes: number; seconds: number } => {
  const now = new Date();
  const targetHour = 20; // 8 PM

  let target = new Date();
  target.setHours(targetHour, 0, 0, 0);

  // If it's past 8 PM, target is tomorrow
  if (now >= target) {
    target.setDate(target.getDate() + 1);
  }

  const diff = target.getTime() - now.getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);

  return { hours, minutes, seconds };
};

export const SurveyCountdown: React.FC<SurveyCountdownProps> = ({
  onCountdownComplete,
}) => {
  const [timeLeft, setTimeLeft] = useState(getTimeUntilNextSurvey());

  useEffect(() => {
    const interval = setInterval(() => {
      const newTime = getTimeUntilNextSurvey();
      setTimeLeft(newTime);

      // Check if countdown completed
      if (newTime.hours === 0 && newTime.minutes === 0 && newTime.seconds === 0) {
        onCountdownComplete?.();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [onCountdownComplete]);

  const formatTime = (value: number): string => {
    return value.toString().padStart(2, '0');
  };

  return (
    <StyledView className="bg-white p-5 rounded-2xl border border-neutral-100" style={{
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 8,
      elevation: 3,
    }}>
      <StyledView className="flex-row items-center mb-4">
        <StyledView className="w-12 h-12 bg-primary-100 rounded-full items-center justify-center mr-3">
          <Ionicons name="time-outline" size={24} color="#437FFF" />
        </StyledView>
        <StyledView className="flex-1">
          <Body className="text-neutral-500 text-sm">Next Survey In</Body>
        </StyledView>
      </StyledView>

      {/* Countdown Display */}
      <StyledView className="flex-row justify-center items-center">
        {/* Hours */}
        <StyledView className="items-center">
          <StyledView className="bg-neutral-100 rounded-xl px-4 py-3 min-w-[60px] items-center">
            <H2 className="text-2xl font-bold text-neutral-900">
              {formatTime(timeLeft.hours)}
            </H2>
          </StyledView>
          <Body className="text-neutral-500 text-xs mt-1">hours</Body>
        </StyledView>

        <Body className="text-neutral-400 text-2xl font-bold mx-2">:</Body>

        {/* Minutes */}
        <StyledView className="items-center">
          <StyledView className="bg-neutral-100 rounded-xl px-4 py-3 min-w-[60px] items-center">
            <H2 className="text-2xl font-bold text-neutral-900">
              {formatTime(timeLeft.minutes)}
            </H2>
          </StyledView>
          <Body className="text-neutral-500 text-xs mt-1">mins</Body>
        </StyledView>

        <Body className="text-neutral-400 text-2xl font-bold mx-2">:</Body>

        {/* Seconds */}
        <StyledView className="items-center">
          <StyledView className="bg-neutral-100 rounded-xl px-4 py-3 min-w-[60px] items-center">
            <H2 className="text-2xl font-bold text-primary-500">
              {formatTime(timeLeft.seconds)}
            </H2>
          </StyledView>
          <Body className="text-neutral-500 text-xs mt-1">secs</Body>
        </StyledView>
      </StyledView>
    </StyledView>
  );
};
