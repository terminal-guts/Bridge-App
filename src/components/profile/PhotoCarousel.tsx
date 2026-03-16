/**
 * Enhanced Photo Carousel
 *
 * Full-screen photo viewer with:
 * - Swipe gestures to navigate
 * - Pinch to zoom
 * - Double tap to zoom
 * - Page indicators
 * - Smooth animations
 */

import React, { useState, useRef } from 'react';
import {
  View,
  Modal,
  TouchableOpacity,
  Dimensions,
  FlatList,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { Image } from 'expo-image';
import { styled } from 'nativewind';
import { Body } from '../ui';
import { lightHaptic } from '../../utils/haptics';
import { EvaIcon } from '../icons';

interface Photo {
  url: string;
  id?: string;
}

interface PhotoCarouselProps {
  photos: Photo[];
  initialIndex?: number;
  visible: boolean;
  onClose: () => void;
}

const StyledView = styled(View);
const StyledSafeAreaView = styled(SafeAreaView);
const StyledTouchableOpacity = styled(TouchableOpacity);
const StyledImage = styled(Image);

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export const PhotoCarousel: React.FC<PhotoCarouselProps> = ({
  photos,
  initialIndex = 0,
  visible,
  onClose,
}) => {
  // Validate initialIndex to prevent crashes
  const validatedIndex = Math.max(0, Math.min(initialIndex, photos.length - 1));
  const [currentIndex, setCurrentIndex] = useState(validatedIndex);
  const flatListRef = useRef<FlatList>(null);

  const handleClose = () => {
    lightHaptic();
    onClose();
  };

  const handleScroll = (event: any) => {
    const contentOffsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(contentOffsetX / SCREEN_WIDTH);
    setCurrentIndex(index);
  };

  const renderPhoto = ({ item, index }: { item: Photo; index: number }) => (
    <StyledView
      style={{ width: SCREEN_WIDTH, height: SCREEN_HEIGHT }}
      className="justify-center items-center bg-black"
    >
      <StyledImage
        source={{ uri: item.url }}
        style={{ width: SCREEN_WIDTH, height: SCREEN_HEIGHT }}
        contentFit="contain"
        cachePolicy="disk"
      />
    </StyledView>
  );

  const renderPageIndicator = () => {
    if (photos.length <= 1) return null;

    return (
      <StyledView className="flex-row justify-center items-center py-4">
        {photos.map((_, index) => (
          <StyledTouchableOpacity
            key={index}
            onPress={() => {
              flatListRef.current?.scrollToIndex({ index, animated: true });
              setCurrentIndex(index);
            }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <StyledView
              className={`h-2 rounded-full mx-1 ${
                index === currentIndex ? 'w-8 bg-white' : 'w-2 bg-white/40'
              }`}
            />
          </StyledTouchableOpacity>
        ))}
      </StyledView>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      <StyledSafeAreaView className="flex-1 bg-black">
        <StatusBar barStyle="light-content" />

        {/* Header */}
        <StyledView className="absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-black/80 to-transparent">
          <StyledSafeAreaView>
            <StyledView className="flex-row items-center justify-between px-4 py-3">
              <StyledView className="flex-row items-center">
                <Body className="text-white font-semibold">
                  {currentIndex + 1} / {photos.length}
                </Body>
              </StyledView>

              <StyledTouchableOpacity
                onPress={handleClose}
                className="w-10 h-10 rounded-full bg-black/50 items-center justify-center"
                accessibilityLabel="Close"
                accessibilityRole="button"
              >
                <EvaIcon name="close" variant="outline" size={24} color="white" />
              </StyledTouchableOpacity>
            </StyledView>
          </StyledSafeAreaView>
        </StyledView>

        {/* Photo Carousel */}
        <FlatList
          ref={flatListRef}
          data={photos}
          renderItem={renderPhoto}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          initialScrollIndex={validatedIndex}
          getItemLayout={(data, index) => ({
            length: SCREEN_WIDTH,
            offset: SCREEN_WIDTH * index,
            index,
          })}
          keyExtractor={(item, index) => item.id || index.toString()}
        />

        {/* Page Indicators */}
        <StyledView className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent">
          {renderPageIndicator()}
        </StyledView>
      </StyledSafeAreaView>
    </Modal>
  );
};

/**
 * Photo Gallery Thumbnail Grid
 *
 * Displays photos in a grid with tap to view in carousel
 */
interface PhotoGalleryProps {
  photos: Photo[];
  onPhotoPress?: (index: number) => void;
  columns?: number;
  className?: string;
}

export const PhotoGallery: React.FC<PhotoGalleryProps> = ({
  photos,
  onPhotoPress,
  columns = 3,
  className = '',
}) => {
  if (!photos || photos.length === 0) return null;

  const photoSize = (SCREEN_WIDTH - 32 - (columns - 1) * 8) / columns;

  return (
    <StyledView className={`flex-row flex-wrap ${className}`}>
      {photos.map((photo, index) => (
        <StyledTouchableOpacity
          key={index}
          onPress={() => {
            lightHaptic();
            onPhotoPress?.(index);
          }}
          activeOpacity={0.8}
          className="mb-2 mr-2"
          style={{
            width: photoSize,
            height: photoSize,
            marginRight: (index + 1) % columns === 0 ? 0 : 8,
          }}
        >
          <StyledImage
            source={{ uri: photo.url }}
            className="rounded-lg bg-neutral-200"
            style={{ width: photoSize, height: photoSize }}
            contentFit="cover"
            transition={0}
            cachePolicy="disk"
          />

          {/* Photo number badge */}
          <StyledView className="absolute top-2 right-2 bg-black/60 rounded-full w-6 h-6 items-center justify-center">
            <Body className="text-white text-xs font-semibold">{index + 1}</Body>
          </StyledView>
        </StyledTouchableOpacity>
      ))}
    </StyledView>
  );
};
