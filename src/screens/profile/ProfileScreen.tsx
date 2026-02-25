import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  ImageBackground, Image, ActivityIndicator, StatusBar, FlatList,
  Dimensions, TouchableWithoutFeedback
} from 'react-native';
import { ArrowLeft, Star, Heart, Sparkles } from 'lucide-react-native';
import { NavigationProp, RouteProp } from '@react-navigation/native';
import { RootStackParamList, UserProfile, DeepQuestionAnswer } from '../../types';
import { getUserProfile } from '../../services/profileService';
import { getCurrentUser } from '../../services/authService';


const { width: SCREEN_WIDTH } = Dimensions.get('window');

const cardStyle = {
  backgroundColor: '#FFFFFF',
  borderWidth: 1,
  borderColor: 'rgba(1,1,1,0.1)',
  borderRadius: 12,
  shadowColor: '#000',
  shadowOpacity: 0.05,
  shadowOffset: { width: 0, height: 4 },
  shadowRadius: 4,
  elevation: 2,
  padding: 12,
  marginBottom: 16,
};

function Tag({ emoji, text }: { emoji: string; text: string }) {
  return (
    <View style={{
      flexDirection: 'row', alignItems: 'center',
      paddingVertical: 6, paddingHorizontal: 10,
      backgroundColor: 'rgba(1,1,1,0.02)', borderRadius: 40,
      marginRight: 10, marginBottom: 10,
    }}>
      <Text style={{ fontFamily: 'Outfit_400Regular', fontSize: 14, lineHeight: 18, color: 'rgba(1,1,1,0.8)' }}>
        {emoji} {text}
      </Text>
    </View>
  );
}

interface ProfileScreenProps {
  navigation: NavigationProp<RootStackParamList>;
  route: RouteProp<RootStackParamList, 'ProfilePreview'> | RouteProp<RootStackParamList, 'ProfileView'>;
  mode?: 'preview' | 'view';
}

export const ProfileScreen: React.FC<ProfileScreenProps> = ({ navigation, route, mode: explicitMode }) => {
  const inferredMode = ('previewProfile' in (route.params || {})) ? 'preview' :
    ('userId' in (route.params || {})) ? 'view' : 'preview';
  const mode = explicitMode || inferredMode;

  const previewParams = mode === 'preview' && route.params ? (route.params as any) : {};
  const viewParams = mode === 'view' && route.params ? (route.params as any) : {};

  const passedProfile = mode === 'preview' ? previewParams.previewProfile : viewParams.profile;
  const showActions = mode === 'view' ? viewParams.showActions : false;
  const onAccept = mode === 'view' ? viewParams.onAccept : undefined;
  const onPass = mode === 'view' ? viewParams.onPass : undefined;

  const [profile, setProfile] = useState<UserProfile | null>(passedProfile || null);
  const [loading, setLoading] = useState(!passedProfile);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const isMountedRef = useRef(true);
  const passedProfileId = passedProfile?.id ?? null;

  useEffect(() => {
    return () => { isMountedRef.current = false; };
  }, []);

  const loadOwnProfile = useCallback(async () => {
    try {
      const userResult = await getCurrentUser();
      if (!userResult.ok || !userResult.data) {
        if (isMountedRef.current) navigation.goBack();
        return;
      }
      const profileResult = await getUserProfile();
      if (!isMountedRef.current) return;
      if (profileResult.ok && profileResult.data) {
        setProfile(profileResult.data);
      } else {
        navigation.goBack();
      }
    } catch {
      if (isMountedRef.current) navigation.goBack();
    } finally {
      if (isMountedRef.current) setLoading(false);
    }
  }, [navigation]);

  useEffect(() => {
    if (!passedProfileId) {
      if (mode === 'preview') {
        loadOwnProfile();
      } else {
        setLoading(false);
      }
    }
  }, [mode, passedProfileId, loadOwnProfile]);

  const photos = useMemo(() => profile?.photos || [], [profile]);
  const displayedImg = useMemo(
    () => photos.length > 0 ? { uri: photos[currentPhotoIndex].url } : require('../../../assets/favicon.png'),
    [photos, currentPhotoIndex]
  );
  const questions = useMemo(() => {
    if (!profile) return [];
    return (profile.displayedQuestions || [])
      .map(id => profile.deepQuestions?.find(q => q.questionId === id))
      .filter((q): q is DeepQuestionAnswer => q !== undefined);
  }, [profile]);

  const photoDots = useMemo(() =>
    photos.map((_, i) => (
      <View key={`dot-${i}`} style={{ width: 16, height: 4, backgroundColor: i === currentPhotoIndex ? '#FFFFFF' : 'rgba(217,217,217,0.4)', borderRadius: 20 }} />
    )),
    [photos, currentPhotoIndex],
  );

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
        <Text>Profile not found</Text>
      </View>
    );
  }

  const matchPercentage = 85;
  const karmaPts = profile.karma?.score || 80;

  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      <StatusBar barStyle="light-content" />
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: showActions ? 120 : 40 }} showsVerticalScrollIndicator={false}>

        <View style={{ width: '100%', height: 451, position: 'relative' }}>
          <ImageBackground source={displayedImg} style={{ width: '100%', height: '100%' }} imageStyle={{ borderRadius: 30, backgroundColor: '#D9D9D9' }} resizeMode="cover">
            {photos.length > 1 && (
              <View style={{ position: 'absolute', top: 50, left: 0, right: 0, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 }}>
                {photoDots}
              </View>
            )}
            {photos.length > 1 && (
              <>
                <TouchableWithoutFeedback onPress={() => currentPhotoIndex > 0 && setCurrentPhotoIndex(currentPhotoIndex - 1)}>
                  <View style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: SCREEN_WIDTH * 0.35 }} />
                </TouchableWithoutFeedback>
                <TouchableWithoutFeedback onPress={() => currentPhotoIndex < photos.length - 1 && setCurrentPhotoIndex(currentPhotoIndex + 1)}>
                  <View style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: SCREEN_WIDTH * 0.35 }} />
                </TouchableWithoutFeedback>
              </>
            )}

            {/* Back arrow rendered after tap zones so it sits on top */}
            <View style={{ position: 'absolute', top: 64, left: 16 }}>
              <TouchableOpacity onPress={() => navigation.goBack()}>
                <ArrowLeft size={24} color="#FFFFFF" strokeWidth={2} />
              </TouchableOpacity>
            </View>

            <View style={{ position: 'absolute', bottom: 40, right: 16, flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 8, paddingHorizontal: 10, backgroundColor: 'rgba(52,199,89,0.1)', borderWidth: 1, borderColor: '#34C759', borderRadius: 8 }}>
              <Star size={14} color="#34C759" />
              <Text style={{ fontFamily: 'Outfit_600SemiBold', fontSize: 12, color: '#34C759' }}>
                Karma Pts : {karmaPts} pts
              </Text>
            </View>
          </ImageBackground>
        </View>

        <View style={{ paddingHorizontal: 16, marginTop: -24 }}>
          <View style={cardStyle}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <Text style={{ fontFamily: 'Outfit_600SemiBold', fontSize: 24, lineHeight: 30, color: '#010101' }}>
                {profile.firstName}, {profile.age}
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 3, paddingHorizontal: 8, backgroundColor: 'rgba(52,199,89,0.1)', borderWidth: 1, borderColor: '#34C759', borderRadius: 8 }}>
                <Star size={11} color="#34C759" />
                <Text style={{ fontFamily: 'Outfit_600SemiBold', fontSize: 12, color: '#34C759' }}>{karmaPts} pts</Text>
              </View>
            </View>
            {mode === 'view' && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Heart size={22} color="#010101" />
                <Text style={{ fontFamily: 'Outfit_400Regular', fontSize: 14, color: 'rgba(1,1,1,0.7)' }}>Matched by :</Text>
                <View style={{ flexDirection: 'row' }}>
                  {[1, 2, 3].map((_, i) => (
                    <View key={i} style={{ width: 22, height: 22, borderRadius: 11, borderWidth: 1, borderColor: '#fff', marginLeft: i === 0 ? 0 : -6, backgroundColor: '#D9D9D9' }} />
                  ))}
                </View>
              </View>
            )}
          </View>

          {mode === 'view' && (
            <View style={cardStyle}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <Text style={{ fontFamily: 'Outfit_500Medium', fontSize: 16, color: '#2563EB' }}>Community validation</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6, paddingHorizontal: 8, backgroundColor: 'rgba(37,99,235,0.1)', borderWidth: 1, borderColor: '#2563EB', borderRadius: 20 }}>
                  <Sparkles size={15} color="#2563EB" />
                  <Text style={{ fontFamily: 'Outfit_400Regular', fontSize: 12, color: '#2563EB' }}>Why this match</Text>
                </View>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View style={{ flex: 1, height: 8, backgroundColor: 'rgba(1,1,1,0.04)', borderRadius: 40, overflow: 'hidden' }}>
                  <View style={{ width: `${matchPercentage}%`, height: '100%', backgroundColor: '#2563EB', borderRadius: 40 }} />
                </View>
                <Text style={{ fontFamily: 'Outfit_600SemiBold', fontSize: 21, color: '#010101' }}>{matchPercentage}%</Text>
              </View>
            </View>
          )}

          {profile.values && profile.values.length > 0 && (
            <View style={cardStyle}>
              <Text style={{ fontFamily: 'Outfit_500Medium', fontSize: 16, color: '#2563EB', marginBottom: 10 }}>Values</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                {profile.values.map((v) => <Tag key={v} emoji="💎" text={v} />)}
              </View>
            </View>
          )}

          {profile.interests && profile.interests.length > 0 && (
            <View style={cardStyle}>
              <Text style={{ fontFamily: 'Outfit_500Medium', fontSize: 16, color: '#2563EB', marginBottom: 10 }}>Interests</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                {profile.interests.map((v) => <Tag key={v} emoji="🌟" text={v} />)}
              </View>
            </View>
          )}

          {questions.length > 0 && (
            <>
              <Text style={{ fontFamily: 'Outfit_500Medium', fontSize: 16, color: '#2563EB', marginBottom: 12 }}>Deep questions</Text>
              {questions.map((item, index) => (
                <View key={item.questionId} style={cardStyle}>
                  <Text style={{ fontFamily: 'Outfit_500Medium', fontSize: 16, lineHeight: 22, color: '#010101', marginBottom: 4 }}>
                    {index + 1}. {item?.question}
                  </Text>
                  <Text style={{ fontFamily: 'Outfit_400Regular', fontSize: 15, lineHeight: 22, color: 'rgba(1,1,1,0.5)' }}>
                    {item?.answer}
                  </Text>
                </View>
              ))}
            </>
          )}
        </View>
      </ScrollView>

      {showActions && (
        <View style={{ position: 'absolute', bottom: 34, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 28 }}>
          <TouchableOpacity onPress={onPass} style={{ width: 62, height: 62, borderRadius: 31, backgroundColor: '#565164', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.28, shadowOffset: { width: 0, height: -5 }, shadowRadius: 24, elevation: 8 }}>
            <Text style={{ color: '#fff', fontSize: 22 }}>✕</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onAccept} style={{ width: 62, height: 62, borderRadius: 31, backgroundColor: '#2563EB', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.28, shadowOffset: { width: 0, height: -5 }, shadowRadius: 24, elevation: 8 }}>
            <Text style={{ color: '#fff', fontSize: 26 }}>♡</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

export default ProfileScreen;
