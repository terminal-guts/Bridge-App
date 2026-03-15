import React, { useState, useEffect } from 'react';
import { View, ScrollView, SafeAreaView, TouchableOpacity, Image, Alert, ActivityIndicator } from 'react-native';
import { styled } from 'nativewind';
import { H1, H2, Body, Button, ScreenWrapper } from '../../components/ui';
import { EvaIcon } from '../../components/icons';
import { COLORS } from '../../theme/colors';
import { useNavigation, useRoute } from '@react-navigation/native';
import { supabase } from '../../lib/supabase';

const StyledView = styled(View);
const StyledScrollView = styled(ScrollView);
const StyledTouchableOpacity = styled(TouchableOpacity);
const StyledImage = styled(Image);

export const MatchmakerClaimScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const token = route.params?.token;
  
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [ghostProfile, setGhostProfile] = useState<any>(null);
  const [creator, setCreator] = useState<any>(null);

  useEffect(() => {
    if (token) {
      fetchGhostDetails();
    } else {
      setLoading(false);
    }
  }, [token]);

  const fetchGhostDetails = async () => {
    try {
      const { data, error } = await supabase
        .from('ghost_profiles')
        .select('*, creator:created_by(first_name, last_name)')
        .eq('invite_token', token)
        .single();

      if (error) throw error;
      setGhostProfile(data);
      setCreator(data.creator);
    } catch (error) {
      console.error('Error fetching ghost profile:', error);
      Alert.alert('Invalid Link', 'This invite link is either invalid or has already been claimed.');
      navigation.replace('Welcome');
    } finally {
      setLoading(false);
    }
  };

  const handleClaim = async () => {
    setClaiming(true);
    try {
      // 1. Get current authenticated user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
         // If not authenticated, we should have handled this by routing to Welcome first
         // but as a fallback:
         Alert.alert('Authentication Required', 'Please log in or sign up to claim this profile.');
         navigation.navigate('Welcome');
         return;
      }

      // 2. Claim the profile (Backend logic would ideally be an RPC to ensure atomicity)
      // For now, we update the ghost_profile and the roster entry
      const { error: claimError } = await supabase
        .from('ghost_profiles')
        .update({ 
            claimed_by: user.id, 
            claimed_at: new Date().toISOString() 
        })
        .eq('id', ghostProfile.id);

      if (claimError) throw claimError;

      const { error: rosterError } = await supabase
        .from('roster')
        .update({ 
            user_id: user.id,
            ghost_profile_id: null, // Move to real user
            status: 'active' 
        })
        .eq('ghost_profile_id', ghostProfile.id);
      
      if (rosterError) throw rosterError;

      // 3. Update user's own profile with the ghost data (if they want)
      // This is the "fully edit everything before going live" part
      Alert.alert(
          'Success!', 
          `You've claimed your profile! Your friend ${creator?.first_name} has already started a roster for you.`,
          [{ text: 'View My Profile', onPress: () => navigation.navigate('MainTabs', { screen: 'Profile' }) }]
      );

    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to claim profile');
    } finally {
      setClaiming(false);
    }
  };

  if (loading) {
    return (
      <StyledView className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color={COLORS.primaryAccent} />
      </StyledView>
    );
  }

  return (
    <ScreenWrapper>
      <ScrollView className="flex-1 bg-white">
        <StyledView className="px-6 pt-12 items-center">
            <StyledView className="w-24 h-24 bg-primary-100 rounded-full items-center justify-center mb-6">
                <EvaIcon name="gift" variant="fill" size={48} color={COLORS.primaryAccent} />
            </StyledView>
            <H1 className="text-center text-3xl font-bold mb-2">You've Been Invited!</H1>
            <Body className="text-center text-neutral-500 mb-8 max-w-[80%]">
                {creator?.first_name || 'A friend'} thinks you're a catch and wants to help you find someone on Bridge.
            </Body>

            <StyledView className="w-full bg-neutral-50 rounded-[32px] p-8 border border-neutral-100 mb-10">
                <H2 className="text-center mb-6">What they wrote...</H2>
                
                <StyledView className="items-center mb-6">
                    <StyledView className="w-32 h-32 rounded-[40px] bg-neutral-200 overflow-hidden shadow-sm">
                        {ghostProfile?.photos?.[0] ? (
                            <StyledImage source={{ uri: ghostProfile.photos[0] }} className="w-full h-full" />
                        ) : (
                            <StyledView className="w-full h-full items-center justify-center">
                                <EvaIcon name="person" size={48} color={COLORS.text.placeholder} />
                            </StyledView>
                        )}
                    </StyledView>
                    <H2 className="mt-4">{ghostProfile?.name}, {ghostProfile?.age}</H2>
                </StyledView>

                <StyledView className="bg-white p-6 rounded-2xl border border-neutral-100 shadow-sm">
                    <EvaIcon name="quote-left" size={20} color={COLORS.primaryAccent} style={{ marginBottom: 8 }} />
                    <Body className="italic text-neutral-600 leading-relaxed">
                        {ghostProfile?.bio || "No bio yet, but they clearly think you're awesome!"}
                    </Body>
                </StyledView>
            </StyledView>

            <Button 
                onPress={handleClaim} 
                loading={claiming}
                className="w-full mb-4"
            >
                Claim This Profile
            </Button>
            
            <StyledTouchableOpacity 
                onPress={() => navigation.navigate('Welcome')}
                className="py-4"
            >
                <Body className="text-neutral-400">Not interested? Go to home</Body>
            </StyledTouchableOpacity>
        </StyledView>
      </ScrollView>
    </ScreenWrapper>
  );
};
