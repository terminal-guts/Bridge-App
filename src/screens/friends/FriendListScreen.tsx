import React, { useState, useEffect, useCallback } from 'react';
import { View, SafeAreaView, StatusBar, FlatList, TouchableOpacity, Image, Alert, RefreshControl, ScrollView } from 'react-native';
import { styled } from 'nativewind';
import { H1, H3, Body, Card, EmptyState, LoadingState } from '../../components/ui';
import { NavigationProp } from '@react-navigation/native';
import { RootStackParamList } from '../../types';
import { EvaIcon } from '../../components/icons';
import { getFriends, removeFriend, FriendWithProfile } from '../../services/friendService';
import { supabase } from '../../lib/supabase';
import { createLogger } from '../../utils/secureLogger';

const logger = createLogger('FriendListScreen');

interface FriendListScreenProps {
  navigation: NavigationProp<RootStackParamList>;
}

const StyledSafeAreaView = styled(SafeAreaView);
const StyledView = styled(View);
const StyledTouchableOpacity = styled(TouchableOpacity);
const StyledImage = styled(Image);
const StyledScrollView = styled(ScrollView);

export const FriendListScreen: React.FC<FriendListScreenProps> = ({ navigation }) => {
  const [friends, setFriends] = useState<FriendWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    loadCurrentUser();
  }, []);

  useEffect(() => {
    if (currentUserId) {
      loadFriends();
    }
  }, [currentUserId]);

  const loadCurrentUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);
      } else {
        Alert.alert('Error', 'You must be logged in to view this page');
        navigation.goBack();
      }
    } catch (error) {
      logger.error('Failed to get current user:', error);
      Alert.alert('Error', 'Failed to load user information');
    }
  };

  const loadFriends = useCallback(async (isRefresh = false) => {
    if (!currentUserId) return;

    if (!isRefresh) setLoading(true);
    try {
      const result = await getFriends();
      if (result.ok && result.data) {
        setFriends(result.data);
      } else {
        logger.error('Failed to load friends:', result.error);
        Alert.alert('Error', 'Failed to load friends');
      }
    } catch (error) {
      logger.error('Failed to load friends:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [currentUserId]);

  // Pull-to-refresh handler
  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadFriends(true);
  }, [loadFriends]);

  const handleRemoveFriend = useCallback((friendId: string, friendName: string) => {
    if (!currentUserId) return;

    Alert.alert(
      'Remove Friend',
      `Are you sure you want to remove ${friendName} from your friends?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            const result = await removeFriend(friendId);
            if (result.ok) {
              setFriends(prev => prev.filter(f => f.friendId !== friendId));
              Alert.alert('Success', `${friendName} has been removed from your friends`);
            } else {
              Alert.alert('Error', result.error?.message || 'Failed to remove friend');
            }
          },
        },
      ]
    );
  }, [currentUserId]);

  // Performance: Memoized render function for FlatList items
  const renderFriendItem = useCallback(({ item: friend }: { item: FriendWithProfile }) => (
    <Card className="mb-3 mx-4">
      <StyledView className="flex-row">
        {friend.profile.photos && friend.profile.photos.length > 0 ? (
          <StyledImage
            source={{ uri: (friend.profile.photos.find(p => p.isMain) || friend.profile.photos[0]).url }}
            className="w-16 h-16 rounded-full mr-3"
          />
        ) : (
          <StyledView className="w-16 h-16 rounded-full mr-3 bg-neutral-200 items-center justify-center">
            <EvaIcon name="person" variant="outline" color="neutral" size={32} />
          </StyledView>
        )}
        <StyledView className="flex-1">
          <StyledView className="flex-row items-center justify-between mb-1">
            <H3>{friend.profile.firstName}</H3>
            <StyledTouchableOpacity
              onPress={() => handleRemoveFriend(friend.friendId, friend.profile.firstName)}
            >
              <EvaIcon name="more-horizontal" variant="outline" color="text-secondary" size={20} />
            </StyledTouchableOpacity>
          </StyledView>
          <Body className="text-neutral-600 text-sm mb-2">
            {friend.profile.currentJob || 'No occupation listed'}
          </Body>
          <Body className="text-neutral-500 text-xs">
            Friends since {new Date(friend.addedAt).toLocaleDateString()}
          </Body>
        </StyledView>
      </StyledView>
    </Card>
  ), [handleRemoveFriend]);

  // Performance: Memoized key extractor
  const keyExtractor = useCallback((item: FriendWithProfile) => item.friendshipId, []);

  // Header component for FlatList
  const ListHeaderComponent = useCallback(() => (
    <StyledView className="px-4 pt-4">
      {/* Stats Card */}
      <Card className="mb-4 bg-primary-50 border border-primary-200">
        <StyledView className="flex-row justify-around">
          <StyledView className="items-center">
            <H1 className="text-primary-500">{friends.length}</H1>
            <Body className="text-neutral-600">Friends</Body>
          </StyledView>
        </StyledView>
      </Card>

      {/* Friends List Header */}
      <H3 className="mb-3">All Friends ({friends.length})</H3>
    </StyledView>
  ), [friends.length]);

  if (loading) {
    return (
      <StyledSafeAreaView className="flex-1 bg-neutral-50">
        <StatusBar barStyle="dark-content" />
        <LoadingState fullScreen message="Loading your friends..." />
      </StyledSafeAreaView>
    );
  }

  return (
    <StyledSafeAreaView className="flex-1 bg-neutral-50">
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <StyledView className="flex-row items-center justify-between px-4 py-3 border-b border-neutral-200 bg-white">
        <StyledTouchableOpacity onPress={() => navigation.goBack()}>
          <EvaIcon name="arrow-back" variant="outline" color="text" size={24} />
        </StyledTouchableOpacity>
        <H3>My Friends</H3>
        <StyledTouchableOpacity onPress={() => navigation.navigate('FriendCode')}>
          <EvaIcon name="person-add" variant="outline" color="primary" size={24} />
        </StyledTouchableOpacity>
      </StyledView>

      {friends.length === 0 ? (
        <EmptyState
          icon={<Body className="text-5xl">👥</Body>}
          title="No Friends Yet"
          description="Add friends to share survey candidates and help each other find perfect matches!"
          action={{
            label: 'Add Friends',
            onPress: () => navigation.navigate('FriendCode'),
          }}
        />
      ) : (
        <FlatList
          data={friends}
          renderItem={renderFriendItem}
          keyExtractor={keyExtractor}
          ListHeaderComponent={ListHeaderComponent}
          contentContainerStyle={{ paddingBottom: 16 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor="#437FFF"
            />
          }
          // Performance optimizations
          initialNumToRender={10}
          maxToRenderPerBatch={5}
          windowSize={5}
          removeClippedSubviews={true}
          showsVerticalScrollIndicator={false}
        />
      )}
    </StyledSafeAreaView>
  );
};