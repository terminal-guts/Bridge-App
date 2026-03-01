import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, Image, ScrollView, ActivityIndicator, TouchableOpacity, RefreshControl } from 'react-native';
import { styled } from 'nativewind';
import { Ionicons } from '@expo/vector-icons';
import { getDailyPairing, generateDailyPairings } from '../../services/proposalApiService';
import { CompatibilityBreakdown } from './CompatibilityBreakdown';

const StyledView = styled(View);
const StyledText = styled(Text);
const StyledScrollView = styled(ScrollView);
const StyledImage = styled(Image);
const StyledTouchableOpacity = styled(TouchableOpacity);

interface DailyPairingViewProps {
  userId: string;
  isActive?: boolean;
}

interface PairingData {
  id: string;
  compatibility_score: number;
  category_scores: Record<string, number>;
  weighted_scores: Record<string, number>;
  partner_profile: {
    id: string;
    first_name: string;
    age: number;
    gender: string[];
    location: string;
    interests: string[];
    values: string[];
    bio: string;
    photos: Array<{ url: string; is_main: boolean }>;
    height_inches?: number;
    ethnicity?: string;
    religion?: string;
    education_level?: string;
    current_job?: string;
  };
  expires_at: string;
}

export function DailyPairingView({ userId, isActive = true }: DailyPairingViewProps) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pairing, setPairing] = useState<PairingData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadPairing = useCallback(async () => {
    try {
      setError(null);
      const result = await getDailyPairing(userId);

      if (result.status === 'success' && result.pairing) {
        setPairing(result.pairing as PairingData);
      } else if (result.status === 'no_pairing') {
        try {
          await generateDailyPairings();
          const retry = await getDailyPairing(userId);
          if (retry.status === 'success' && retry.pairing) {
            setPairing(retry.pairing as PairingData);
          }
        } catch {
          // generation not possible
        }
      }
    } catch (err) {
      setError('Unable to load your daily match');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userId]);

  useEffect(() => {
    if (isActive) {
      loadPairing();
    }
  }, [isActive, loadPairing]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadPairing();
  }, [loadPairing]);

  if (loading) {
    return (
      <StyledView className="flex-1 items-center justify-center bg-[#FBF9F6]">
        <ActivityIndicator size="large" color="#78716C" />
        <StyledText className="text-neutral-500 mt-3 text-sm">
          Finding your match...
        </StyledText>
      </StyledView>
    );
  }

  if (error) {
    return (
      <StyledView className="flex-1 items-center justify-center px-8 bg-[#FBF9F6]">
        <Ionicons name="alert-circle-outline" size={48} color="#94A3B8" />
        <StyledText className="text-neutral-600 text-center mt-3">{error}</StyledText>
        <StyledTouchableOpacity className="mt-4 px-6 py-2 bg-[#4A4540] rounded-lg" onPress={loadPairing}>
          <StyledText className="text-white font-medium">Try Again</StyledText>
        </StyledTouchableOpacity>
      </StyledView>
    );
  }

  if (!pairing) {
    return (
      <StyledView className="flex-1 items-center justify-center px-8 bg-[#FBF9F6]">
        <Ionicons name="moon-outline" size={48} color="#94A3B8" />
        <StyledText className="text-lg font-semibold text-neutral-900 text-center mt-4">
          No Match Yet
        </StyledText>
        <StyledText className="text-neutral-500 text-center mt-2 leading-5">
          New matches drop daily at midnight. Check back soon!
        </StyledText>
      </StyledView>
    );
  }

  const partner = pairing.partner_profile;
  const mainPhoto = partner.photos?.find(p => p.is_main) || partner.photos?.[0];

  return (
    <StyledScrollView
      className="flex-1 bg-[#FBF9F6]"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#78716C" />}
    >
      <StyledView className="items-center pt-4 pb-2 px-4">
        <StyledText className="text-xs font-medium text-neutral-400 uppercase tracking-wider mb-3">
          Your Daily Match
        </StyledText>

        {mainPhoto && (
          <StyledImage
            source={{ uri: mainPhoto.url }}
            className="w-72 h-80 rounded-2xl"
            resizeMode="cover"
          />
        )}

        <StyledView className="items-center mt-3">
          <StyledText className="text-2xl font-bold text-neutral-900">
            {partner.first_name}, {partner.age}
          </StyledText>
          {partner.current_job && (
            <StyledText className="text-sm text-neutral-500 mt-1">
              {partner.current_job}
            </StyledText>
          )}
        </StyledView>
      </StyledView>

      <CompatibilityBreakdown
        categoryScores={pairing.category_scores}
        totalScore={pairing.compatibility_score}
      />

      {partner.bio && (
        <StyledView className="bg-white rounded-2xl p-4 mx-4 mb-4">
          <StyledText className="text-sm font-semibold text-neutral-700 mb-2">About</StyledText>
          <StyledText className="text-sm text-neutral-600 leading-5">{partner.bio}</StyledText>
        </StyledView>
      )}

      {partner.interests && partner.interests.length > 0 && (
        <StyledView className="bg-white rounded-2xl p-4 mx-4 mb-4">
          <StyledText className="text-sm font-semibold text-neutral-700 mb-2">Interests</StyledText>
          <StyledView className="flex-row flex-wrap">
            {partner.interests.map((interest, i) => (
              <StyledView key={i} className="bg-neutral-100 rounded-full px-3 py-1 mr-2 mb-2">
                <StyledText className="text-xs text-neutral-600">{interest}</StyledText>
              </StyledView>
            ))}
          </StyledView>
        </StyledView>
      )}

      {partner.values && partner.values.length > 0 && (
        <StyledView className="bg-white rounded-2xl p-4 mx-4 mb-6">
          <StyledText className="text-sm font-semibold text-neutral-700 mb-2">Values</StyledText>
          <StyledView className="flex-row flex-wrap">
            {partner.values.map((value, i) => (
              <StyledView key={i} className="bg-amber-50 rounded-full px-3 py-1 mr-2 mb-2">
                <StyledText className="text-xs text-amber-700">{value}</StyledText>
              </StyledView>
            ))}
          </StyledView>
        </StyledView>
      )}
    </StyledScrollView>
  );
}
