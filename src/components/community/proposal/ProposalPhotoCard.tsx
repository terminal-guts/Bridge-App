/**
 * ProposalPhotoCard — Photo carousel with gradient overlay and name/age.
 * Extracted from ProposalReviewView.tsx.
 */

import React, { useState, useCallback, useMemo, useRef } from 'react';
import { View, Text, ScrollView, Dimensions, NativeScrollEvent, NativeSyntheticEvent } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { FONTS, FONT_SIZES } from '../../../constants/typography';
import { COLORS } from '../../../theme/colors';
import { getOptimizedPhotoUrl } from '../../../utils/imageUtils';

const SCREEN_HEIGHT = Dimensions.get('window').height;
const PHOTO_HEIGHT = Math.max(220, Math.min(Math.round(SCREEN_HEIGHT * 0.36), 340));
const PHOTO_RADIUS = 16;

export { PHOTO_HEIGHT, PHOTO_RADIUS };

export const ProposalPhotoCard = React.memo(function ProposalPhotoCard({
  photos,
  name,
  age,
  width,
  height,
  side,
  proposalId,
}: {
  photos: Array<{ url?: string; isMain?: boolean; blurhash?: string }>;
  name: string;
  age?: number;
  width: number;
  height: number;
  side: 'left' | 'right';
  proposalId: string;
}) {
  const [currentPage, setCurrentPage] = useState(0);
  const scrollRef = useRef<ScrollView>(null);
  const validPhotos = useMemo(() => (photos || []).filter((p: any) => p.url).map((p: any) => ({
    ...p,
    url: getOptimizedPhotoUrl(p.url, 'card') || p.url,
    blurhash: p.blurhash,
  })), [photos]);
  const showCarousel = validPhotos.length > 1;
  const mainPhoto = validPhotos.find((p: any) => p.isMain) || validPhotos[0];

  // Wrap-around carousel: [last, ...originals, first]
  const loopPhotos = useMemo(() => {
    if (!showCarousel) return validPhotos;
    return [validPhotos[validPhotos.length - 1], ...validPhotos, validPhotos[0]];
  }, [validPhotos, showCarousel]);

  const handleScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (!showCarousel) return;
    const rawPage = Math.round(e.nativeEvent.contentOffset.x / width);
    const total = validPhotos.length;

    if (rawPage === 0) {
      // Swiped left past first → jump to real last
      scrollRef.current?.scrollTo({ x: total * width, animated: false });
      setCurrentPage(total - 1);
    } else if (rawPage === total + 1) {
      // Swiped right past last → jump to real first
      scrollRef.current?.scrollTo({ x: width, animated: false });
      setCurrentPage(0);
    } else {
      setCurrentPage(rawPage - 1);
    }
  }, [width, showCarousel, validPhotos.length]);

  const borderRadiusStyle = side === 'left'
    ? { borderTopLeftRadius: PHOTO_RADIUS, borderBottomLeftRadius: PHOTO_RADIUS, borderTopRightRadius: 0, borderBottomRightRadius: 0 }
    : { borderTopLeftRadius: 0, borderBottomLeftRadius: 0, borderTopRightRadius: PHOTO_RADIUS, borderBottomRightRadius: PHOTO_RADIUS };

  return (
    <View style={{ width, height, ...borderRadiusStyle, overflow: 'hidden' }}>
      {showCarousel ? (
        <ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={handleScroll}
          bounces={false}
          contentOffset={{ x: width, y: 0 }}
          style={{ width, height }}
        >
          {loopPhotos.map((photo: any, i: number) => (
            <Image
              key={`${proposalId}-${side}-loop-${i}`}
              source={{ uri: photo.url }}
              placeholder={photo.blurhash ? { blurhash: photo.blurhash } : undefined}
              style={{ width, height, backgroundColor: COLORS.backgroundGrayMedium }}
              contentFit="cover"
              transition={300}
              cachePolicy="memory-disk"
              priority={i <= 1 ? 'high' : 'normal'}
              recyclingKey={`${proposalId}-${side}-loop-${i}`}
            />
          ))}
        </ScrollView>
      ) : (
        <Image
          source={mainPhoto?.url ? { uri: mainPhoto.url } : null}
          placeholder={mainPhoto?.blurhash ? { blurhash: mainPhoto.blurhash } : undefined}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, ...borderRadiusStyle, backgroundColor: COLORS.backgroundGrayMedium }}
          contentFit="cover"
          transition={300}
          cachePolicy="memory-disk"
          priority="high"
          recyclingKey={`${proposalId}-${side}`}
        />
      )}
      <LinearGradient
        colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.65)', 'rgba(0,0,0,0.92)']}
        locations={[0.45, 0.75, 1]}
        style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: Math.round(PHOTO_HEIGHT * 0.43) }}
        pointerEvents="none"
      />
      {showCarousel && (
        <View
          style={{
            position: 'absolute',
            top: 10,
            left: 0,
            right: 0,
            flexDirection: 'row',
            justifyContent: 'center',
            gap: 4,
          }}
          pointerEvents="none"
        >
          {validPhotos.map((_: any, i: number) => (
            <View
              key={`dot-${side}-${i}`}
              style={{
                width: i === currentPage ? 18 : 6,
                height: 4,
                borderRadius: 2,
                backgroundColor: i === currentPage ? '#FFFFFF' : 'rgba(255,255,255,0.45)',
              }}
            />
          ))}
        </View>
      )}
      <View style={{ position: 'absolute', bottom: 14, left: 14 }} pointerEvents="none">
        <Text style={{ fontFamily: FONTS.bold, fontWeight: '700', fontSize: FONT_SIZES['5xl'], color: COLORS.card, letterSpacing: -0.3 }}>
          {name.split(' ').map(n => n.charAt(0).toUpperCase()).join('').slice(0, 2).split('').join('.')}{age ? `, ${age}` : ''}
        </Text>
      </View>
    </View>
  );
});
