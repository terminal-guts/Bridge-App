import React from 'react';
import {
  View,
  Modal,
  ScrollView,
  Image,
  TouchableOpacity,
  useWindowDimensions,
} from 'react-native';
import { styled } from 'nativewind';
import { H1, H2, H3, Body, Card, Avatar } from './ui';
import { UserProfile } from '../types';
import { Ionicons } from '@expo/vector-icons';

const StyledView = styled(View);
const StyledModal = styled(Modal);
const StyledScrollView = styled(ScrollView);
const StyledImage = styled(Image);
const StyledTouchableOpacity = styled(TouchableOpacity);

interface ProfileDetailModalProps {
  profile: UserProfile | null;
  visible: boolean;
  onClose: () => void;
}

export const ProfileDetailModal: React.FC<ProfileDetailModalProps> = ({
  profile,
  visible,
  onClose,
}) => {
  const { width } = useWindowDimensions();

  if (!profile) return null;

  return (
    <StyledModal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <StyledView className="flex-1 bg-neutral-50">
        {/* Header */}
        <StyledView className="bg-white border-b border-neutral-200 px-4 py-4 pt-12">
          <StyledView className="flex-row items-center justify-between">
            <H2 className="text-xl">Profile Details</H2>
            <StyledTouchableOpacity
              onPress={onClose}
              className="w-10 h-10 items-center justify-center bg-neutral-100 rounded-full"
            >
              <Ionicons name="close" size={24} color="#525252" />
            </StyledTouchableOpacity>
          </StyledView>
        </StyledView>

        <StyledScrollView className="flex-1">
          <StyledView className="px-4 py-6">
            {/* Photos Section */}
            <StyledView className="mb-6">
              {profile.photos && profile.photos.length > 0 ? (
                <>
                  <StyledScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    pagingEnabled
                    className="mb-2"
                  >
                    {profile.photos.map((photo, index) => (
                      <StyledView key={photo.id} className="mr-4">
                        <StyledImage
                          source={{ uri: photo.url }}
                          style={{ width: width - 32, height: width - 32 }}
                          className="rounded-2xl"
                        />
                      </StyledView>
                    ))}
                  </StyledScrollView>
                  <Body className="text-neutral-500 text-xs text-center">
                    {profile.photos.length > 1
                      ? `Swipe to see all ${profile.photos.length} photos`
                      : '1 photo'}
                  </Body>
                </>
              ) : (
                <StyledView className="items-center">
                  <Avatar
                    uri={undefined}
                    size={width - 32}
                    rounded="2xl"
                  />
                  <Body className="text-neutral-500 text-xs text-center mt-2">
                    No photos available
                  </Body>
                </StyledView>
              )}
            </StyledView>

            {/* Basic Info Card */}
            <Card className="mb-4">
              <H2 className="mb-1">
                {profile.firstName}, {profile.age}
              </H2>
              {profile.currentJob && (
                <Body className="text-neutral-700 mb-1">{profile.currentJob}</Body>
              )}
              {profile.companyPosition && (
                <Body className="text-neutral-600 text-sm mb-1">{profile.companyPosition}</Body>
              )}
              {profile.school && (
                <Body className="text-neutral-600 text-sm">{profile.school}</Body>
              )}
            </Card>

            {/* Interests */}
            {profile.interests && profile.interests.length > 0 && (
              <Card className="mb-4">
                <H3 className="mb-3">Interests</H3>
                <StyledView className="flex-row flex-wrap -mx-1">
                  {profile.interests.map((interest, index) => (
                    <StyledView key={index} className="px-1 mb-2">
                      <StyledView className="bg-primary-100 px-3 py-2 rounded-full">
                        <Body className="text-primary-700 text-sm">{interest}</Body>
                      </StyledView>
                    </StyledView>
                  ))}
                </StyledView>
              </Card>
            )}

            {/* Values */}
            {profile.values && profile.values.length > 0 && (
              <Card className="mb-4">
                <H3 className="mb-3">Values</H3>
                <StyledView className="flex-row flex-wrap -mx-1">
                  {profile.values.map((value, index) => (
                    <StyledView key={index} className="px-1 mb-2">
                      <StyledView className="bg-purple-100 px-3 py-2 rounded-full">
                        <Body className="text-purple-700 text-sm">{value}</Body>
                      </StyledView>
                    </StyledView>
                  ))}
                </StyledView>
              </Card>
            )}

            {/* Lifestyle */}
            {profile.lifestyle && (
              <Card className="mb-4">
                <H3 className="mb-3">Lifestyle</H3>
                <StyledView className="space-y-2">
                  {profile.lifestyle.drinking && (
                    <StyledView className="flex-row items-center mb-2">
                      <StyledView className="w-8">
                        <Ionicons name="wine" size={20} color="#737373" />
                      </StyledView>
                      <Body className="text-neutral-700 ml-2">
                        Drinking: {profile.lifestyle.drinking}
                      </Body>
                    </StyledView>
                  )}
                  {profile.lifestyle.smoking && (
                    <StyledView className="flex-row items-center mb-2">
                      <StyledView className="w-8">
                        <Ionicons name="ban" size={20} color="#737373" />
                      </StyledView>
                      <Body className="text-neutral-700 ml-2">
                        Smoking: {profile.lifestyle.smoking}
                      </Body>
                    </StyledView>
                  )}
                  {profile.lifestyle.exercise && (
                    <StyledView className="flex-row items-center mb-2">
                      <StyledView className="w-8">
                        <Ionicons name="fitness" size={20} color="#737373" />
                      </StyledView>
                      <Body className="text-neutral-700 ml-2">
                        Exercise: {profile.lifestyle.exercise}
                      </Body>
                    </StyledView>
                  )}
                  {profile.lifestyle.children && (
                    <StyledView className="flex-row items-center mb-2">
                      <StyledView className="w-8">
                        <Ionicons name="people" size={20} color="#737373" />
                      </StyledView>
                      <Body className="text-neutral-700 ml-2">
                        Children: {profile.lifestyle.children}
                      </Body>
                    </StyledView>
                  )}
                  {profile.lifestyle.pets && profile.lifestyle.pets.length > 0 && (
                    <StyledView className="flex-row items-center">
                      <StyledView className="w-8">
                        <Ionicons name="paw" size={20} color="#737373" />
                      </StyledView>
                      <Body className="text-neutral-700 ml-2">
                        Pets: {profile.lifestyle.pets.join(', ')}
                      </Body>
                    </StyledView>
                  )}
                </StyledView>
              </Card>
            )}

            {/* Dealbreakers */}
            {profile.dealbreakers && profile.dealbreakers.length > 0 && (
              <Card className="mb-4 bg-red-50 border-red-200">
                <H3 className="mb-3 text-red-900">Dealbreakers</H3>
                <StyledView className="space-y-2">
                  {profile.dealbreakers.map((dealbreaker, index) => (
                    <StyledView key={dealbreaker.id || index} className="flex-row items-start mb-2">
                      <Ionicons name="close-circle" size={16} color="#DC2626" />
                      <Body className="text-red-700 ml-2 flex-1">{dealbreaker.type}</Body>
                    </StyledView>
                  ))}
                </StyledView>
              </Card>
            )}

            {/* Location */}
            {profile.location && (
              <Card className="mb-4">
                <StyledView className="flex-row items-center">
                  <Ionicons name="location" size={20} color="#437FFF" />
                  <Body className="text-neutral-700 ml-2">{profile.location}</Body>
                </StyledView>
              </Card>
            )}

            {/* Bottom spacing */}
            <StyledView className="h-8" />
          </StyledView>
        </StyledScrollView>
      </StyledView>
    </StyledModal>
  );
};
