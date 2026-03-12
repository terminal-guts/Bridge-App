import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  Image,
  Animated,
  Dimensions,
} from 'react-native';
import { styled } from 'nativewind';
import { H1, H2, H3, Body, Button, Card, Chip, ScreenWrapper } from '../../components/ui';
import { valueEmoji, interestEmoji } from '../../utils/emojiMaps';
import { PartialMatch } from '../../types';
import { mockPartialMatch } from '../../services/mockData';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

const StyledView = styled(View);
const StyledScrollView = styled(ScrollView);
const StyledImage = styled(Image);

interface MatchRevealScreenProps {
  onAccept?: () => void;
  onReject?: () => void;
}

export const MatchRevealScreen: React.FC<MatchRevealScreenProps> = ({
  onAccept,
  onReject,
}) => {
  const [match] = useState<PartialMatch>(mockPartialMatch);
  const [fadeAnim] = useState(new Animated.Value(0));
  const [scaleAnim] = useState(new Animated.Value(0.9));
  const [timeLeft, setTimeLeft] = useState(() => {
    const diff = new Date(match.expiresAt).getTime() - Date.now();
    if (diff <= 0) return 'Expired';
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  });

  useEffect(() => {
    // Animate in
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();

    // Update countdown timer
    const interval = setInterval(() => {
      const now = new Date();
      const expires = new Date(match.expiresAt);
      const diff = expires.getTime() - now.getTime();

      if (diff <= 0) {
        setTimeLeft('Expired');
        clearInterval(interval);
      } else {
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        setTimeLeft(`${hours}h ${minutes}m`);
      }
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [match.expiresAt]);

  const handleAccept = () => {
    // Animate out and accept
    Animated.timing(scaleAnim, {
      toValue: 1.1,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      onAccept?.();
    });
  };

  const handleReject = () => {
    // Animate out and reject
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      onReject?.();
    });
  };

  return (
    <ScreenWrapper>
      <StyledScrollView className="flex-1">
        <Animated.View
          style={{
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          }}
        >
          {/* Header with celebration */}
          <StyledView className="bg-primary-500 px-6 py-8">
            <StyledView className="items-center">
              <H1 className="text-white text-center mb-2">You Have a Match!</H1>
              <Body className="text-white/90 text-center">
                The community thinks you two are perfect for each other
              </Body>
              <StyledView className="flex-row items-center mt-4 bg-white/20 px-3 py-2 rounded-full">
                <Ionicons name="people" size={20} color="white" />
                <Body className="text-white font-semibold ml-2">
                  Community Score: {match.communityScore}%
                </Body>
              </StyledView>
            </StyledView>
          </StyledView>

          {/* Timer */}
          <Card className="mx-4 -mt-4 mb-4 bg-white shadow-lg">
            <StyledView className="flex-row justify-between items-center">
              <StyledView>
                <Body className="text-neutral-600 text-sm">Decision Required</Body>
                <H3 className="text-primary-500">{timeLeft || match.timeRemaining}</H3>
              </StyledView>
              <StyledView className="bg-warning/10 px-3 py-1.5 rounded-full">
                <Body className="text-warning font-semibold text-sm">48 Hour Limit</Body>
              </StyledView>
            </StyledView>
          </Card>

          {/* Profile Content */}
          <StyledView className="px-4">
            {/* Photos with blur effect */}
            <StyledView className="mb-6">
              <ScrollView
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                className="rounded-xl overflow-hidden"
              >
                {(match.profile?.photos || []).map((photo, index) => (
                  <StyledView key={photo.id} style={{ width: width - 32 }}>
                    <StyledImage
                      source={{ uri: photo.url }}
                      className="w-full h-96 rounded-xl"
                      blurRadius={8}
                    />
                    <StyledView className="absolute inset-0 items-center justify-center">
                      <StyledView className="bg-neutral-900/60 px-4 py-2 rounded-full">
                        <Body className="text-white font-medium">
                          Photo {index + 1} of {match.profile?.photos?.length || 0} (Blurred)
                        </Body>
                      </StyledView>
                    </StyledView>
                  </StyledView>
                ))}
              </ScrollView>
            </StyledView>

            {/* Basic Info (Visible) */}
            <Card className="mb-4">
              <H2 className="mb-1">{match.profile?.firstName}, {match.profile?.age}</H2>
              <Body className="text-neutral-600 mb-1">{match.profile?.occupation}</Body>
              <StyledView className="flex-row items-center">
                <Ionicons name="location-outline" size={16} color="#667085" />
                <Body className="text-neutral-500 ml-1">New York, NY</Body>
              </StyledView>
            </Card>

            {/* Interests (75% visible) */}
            <Card className="mb-4">
              <H3 className="mb-3">Interests</H3>
              <StyledView className="flex-row flex-wrap -mx-1">
                {(match.profile?.interests || []).map((interest, index) => (
                  <StyledView key={index} className="px-1 mb-2">
                    <Chip label={`${interestEmoji(interest)} ${interest}`} />
                  </StyledView>
                ))}
                <StyledView className="px-1 mb-2">
                  <StyledView className="px-3 py-1.5 rounded-full border border-dashed border-neutral-300">
                    <Body className="text-sm text-neutral-500">
                      +{3} more interests
                    </Body>
                  </StyledView>
                </StyledView>
              </StyledView>
            </Card>

            {/* Values (75% visible) */}
            <Card className="mb-6">
              <H3 className="mb-3">Values</H3>
              <StyledView className="flex-row flex-wrap -mx-1">
                {(match.profile?.values || []).map((value, index) => (
                  <StyledView key={index} className="px-1 mb-2">
                    <Chip label={`${valueEmoji(value)} ${value}`} />
                  </StyledView>
                ))}
                <StyledView className="px-1 mb-2">
                  <StyledView className="px-3 py-1.5 rounded-full border border-dashed border-neutral-300">
                    <Body className="text-sm text-neutral-500">
                      +{2} more values
                    </Body>
                  </StyledView>
                </StyledView>
              </StyledView>
            </Card>

            {/* What You'll Unlock */}
            <Card className="mb-6 bg-primary-50 border border-primary-200">
              <H3 className="mb-2 text-primary-700">What You'll Unlock If You Match</H3>
              <StyledView className="space-y-2">
                <StyledView className="flex-row items-center">
                  <Ionicons name="checkmark-circle" size={20} color="#437FFF" />
                  <Body className="text-neutral-700 ml-2">Full unblurred photos</Body>
                </StyledView>
                <StyledView className="flex-row items-center">
                  <Ionicons name="checkmark-circle" size={20} color="#437FFF" />
                  <Body className="text-neutral-700 ml-2">Complete profile details</Body>
                </StyledView>
                <StyledView className="flex-row items-center">
                  <Ionicons name="checkmark-circle" size={20} color="#437FFF" />
                  <Body className="text-neutral-700 ml-2">All interests and values</Body>
                </StyledView>
                <StyledView className="flex-row items-center">
                  <Ionicons name="checkmark-circle" size={20} color="#437FFF" />
                  <Body className="text-neutral-700 ml-2">Ability to chat</Body>
                </StyledView>
              </StyledView>
            </Card>

            {/* Decision Buttons */}
            <StyledView className="flex-row space-x-3 mb-8">
              <Button
                onPress={handleReject}
                variant="secondary"
                size="lg"
                className="flex-1"
              >
                Pass
              </Button>
              <Button
                onPress={handleAccept}
                variant="primary"
                size="lg"
                className="flex-1"
              >
                Accept Match
              </Button>
            </StyledView>
          </StyledView>
        </Animated.View>
      </StyledScrollView>
    </ScreenWrapper>
  );
};