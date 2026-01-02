import React, { useState, useEffect } from 'react';
import { View } from 'react-native';
import { styled } from 'nativewind';
import { Body } from './ui/Typography';

interface CountdownTimerProps {
  targetTime: Date; // Target time (next 8 PM)
  onComplete?: () => void;
  className?: string;
}

const StyledView = styled(View);

/**
 * CountdownTimer Component
 *
 * Displays countdown to next survey availability (8 PM)
 * Updates every minute
 */
export const CountdownTimer: React.FC<CountdownTimerProps> = ({
  targetTime,
  onComplete,
  className = '',
}) => {
  const [timeRemaining, setTimeRemaining] = useState('');

  useEffect(() => {
    const calculateTimeRemaining = () => {
      const now = new Date();
      const diff = targetTime.getTime() - now.getTime();

      if (diff <= 0) {
        setTimeRemaining('Available now!');
        if (onComplete) {
          onComplete();
        }
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

      setTimeRemaining(`${hours}h ${minutes}m`);
    };

    // Initial calculation
    calculateTimeRemaining();

    // Update every minute
    const interval = setInterval(calculateTimeRemaining, 60000);

    return () => clearInterval(interval);
  }, [targetTime, onComplete]);

  return (
    <StyledView className={className}>
      <Body className="text-neutral-600 font-medium">{timeRemaining}</Body>
    </StyledView>
  );
};
