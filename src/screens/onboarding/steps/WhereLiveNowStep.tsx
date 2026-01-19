import React, { useState, useEffect, useRef } from 'react';
import { View, TouchableOpacity, ActivityIndicator, TextInput, Alert, Platform } from 'react-native';
import { styled } from 'nativewind';
// Conditional imports for maps to prevent web crashes
const MapView = Platform.OS !== 'web' ? require('react-native-maps').default : View;
const Marker = Platform.OS !== 'web' ? require('react-native-maps').Marker : View;
import * as Location from 'expo-location';
import { H1, Body } from '../../../components/ui';
import { OnboardingData } from '../../../types';
import { OnboardingLayout } from '../../../components/OnboardingLayout';

// local type for Region to avoid import issues on web
interface Region {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
}

interface WhereLiveNowStepProps {
  data: Partial<OnboardingData>;
  updateData: (data: Partial<OnboardingData>) => void;
  onNext: () => void;
  onBack: () => void;
  isFirstStep: boolean;
  isLastStep: boolean;
}

const StyledView = styled(View);
const StyledTouchableOpacity = styled(TouchableOpacity);
const StyledTextInput = styled(TextInput);

// Default location (NYC) if location permission denied
const DEFAULT_REGION = {
  latitude: 40.7128,
  longitude: -74.0060,
  latitudeDelta: 0.05,
  longitudeDelta: 0.05,
};

export const WhereLiveNowStep: React.FC<WhereLiveNowStepProps> = ({
  data,
  updateData,
  onNext,
  onBack,
}) => {
  const [region, setRegion] = useState<Region>(DEFAULT_REGION);
  const [markerPosition, setMarkerPosition] = useState({
    latitude: DEFAULT_REGION.latitude,
    longitude: DEFAULT_REGION.longitude,
  });
  const [locationName, setLocationName] = useState(data.location || '');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [hasLocationPermission, setHasLocationPermission] = useState(false);
  const mapRef = useRef<any>(null);

  useEffect(() => {
    requestLocationPermission();
  }, []);

  const requestLocationPermission = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status === 'granted') {
        setHasLocationPermission(true);
        await getCurrentLocation();
      } else {
        setHasLocationPermission(false);
        setLoading(false);
        // Use default location (NYC) if permission denied
        setRegion(DEFAULT_REGION);
        setMarkerPosition({
          latitude: DEFAULT_REGION.latitude,
          longitude: DEFAULT_REGION.longitude,
        });
      }
    } catch (err) {
      console.error('Error requesting location permission:', err);
      setLoading(false);
      setHasLocationPermission(false);
    }
  };

  const getCurrentLocation = async () => {
    try {
      setLoading(true);
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const newRegion = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      };

      setRegion(newRegion);
      setMarkerPosition({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });

      // Reverse geocode to get location name
      const addresses = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });

      if (addresses.length > 0) {
        const address = addresses[0];
        const locationStr = `${address.city || ''}, ${address.region || ''}`.trim();
        setLocationName(locationStr);
      }

      setLoading(false);
    } catch (err) {
      console.error('Error getting current location:', err);
      setLoading(false);
    }
  };

  const handleMapPress = async (event: any) => {
    const { latitude, longitude } = event.nativeEvent.coordinate;
    setMarkerPosition({ latitude, longitude });

    // Reverse geocode to get location name
    try {
      const addresses = await Location.reverseGeocodeAsync({ latitude, longitude });
      if (addresses.length > 0) {
        const address = addresses[0];
        const locationStr = `${address.city || ''}, ${address.region || ''}`.trim();
        setLocationName(locationStr);
      }
    } catch (err) {
      console.error('Error reverse geocoding:', err);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setError('Please enter a location to search');
      return;
    }

    try {
      setLoading(true);
      setError('');

      const results = await Location.geocodeAsync(searchQuery);

      if (results.length > 0) {
        const result = results[0];
        const newRegion = {
          latitude: result.latitude,
          longitude: result.longitude,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        };

        setRegion(newRegion);
        setMarkerPosition({
          latitude: result.latitude,
          longitude: result.longitude,
        });
        setLocationName(searchQuery);

        // Animate map to new location
        mapRef.current?.animateToRegion(newRegion, 500);
      } else {
        setError('Location not found. Please try another search.');
      }

      setLoading(false);
    } catch (err) {
      console.error('Error searching location:', err);
      setError('Error searching for location. Please try again.');
      setLoading(false);
    }
  };

  const handleCurrentLocationPress = async () => {
    if (!hasLocationPermission) {
      Alert.alert(
        'Location Permission Required',
        'Please enable location services to use this feature.',
        [{ text: 'OK' }]
      );
      return;
    }

    await getCurrentLocation();
    if (mapRef.current && region) {
      mapRef.current.animateToRegion(region, 500);
    }
  };

  const validateAndContinue = () => {
    if (!markerPosition.latitude || !markerPosition.longitude) {
      setError('Please select a location on the map');
      return;
    }

    updateData({
      location: locationName || `${markerPosition.latitude.toFixed(4)}, ${markerPosition.longitude.toFixed(4)}`,
      coordinates: {
        latitude: markerPosition.latitude,
        longitude: markerPosition.longitude,
      },
    });
    onNext();
  };

  return (
    <OnboardingLayout
      onBack={onBack}
      onContinue={validateAndContinue}
      hasTextInput={false}
    >
      <StyledView className="mt-8 flex-1">
        <H1 className="mb-3">Where do you live now?</H1>
        <Body className="text-neutral-600 mb-4">
          Drop a pin or search for your city.
        </Body>

        {/* Search Bar */}
        <StyledView className="flex-row mb-4">
          <StyledTextInput
            className="flex-1 bg-white border border-neutral-300 rounded-lg px-4 py-3 mr-2"
            placeholder="Search for a city or address..."
            value={searchQuery}
            onChangeText={(text) => {
              setSearchQuery(text);
              if (error) setError('');
            }}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
          />
          <StyledTouchableOpacity
            onPress={handleSearch}
            className="bg-primary-500 rounded-lg px-4 py-3 justify-center"
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Body className="text-white font-semibold">Search</Body>
            )}
          </StyledTouchableOpacity>
        </StyledView>

        {/* Selected Location Display */}
        {locationName && (
          <StyledView className="bg-primary-50 border border-primary-200 rounded-lg px-4 py-3 mb-4">
            <Body className="text-primary-700 font-medium">
              📍 {locationName}
            </Body>
          </StyledView>
        )}

        {/* Map View */}
        <StyledView className="rounded-lg overflow-hidden border border-neutral-300 mb-4" style={{ height: 320 }}>
          {loading && !markerPosition.latitude ? (
            <StyledView className="flex-1 items-center justify-center bg-neutral-100">
              <ActivityIndicator size="large" color="#000" />
              <Body className="text-neutral-600 mt-4">Loading map...</Body>
            </StyledView>
          ) : (
            <MapView
              ref={mapRef}
              style={{ flex: 1 }}
              region={region}
              onPress={handleMapPress}
              showsUserLocation={hasLocationPermission}
              showsMyLocationButton={false}
            >
              <Marker
                coordinate={markerPosition}
                draggable
                onDragEnd={handleMapPress}
              />
            </MapView>
          )}
        </StyledView>

        {/* Help Text */}
        <Body className="text-neutral-500 text-sm mb-4">
          Tap anywhere on the map to replace the pin.
        </Body>

        {error && (
          <Body className="text-error text-sm mt-2">{error}</Body>
        )}
      </StyledView>
    </OnboardingLayout>
  );
};
