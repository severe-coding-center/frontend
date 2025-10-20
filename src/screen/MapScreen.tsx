import 'react-native-get-random-values'; // Hermes 환경 필수
import React, { useState, useRef, useEffect } from 'react';
import { View, StyleSheet, ActivityIndicator, Button, Text, Alert, TouchableOpacity } from 'react-native';
import MapView, { Marker, Circle, PROVIDER_GOOGLE, Region, MapPressEvent } from 'react-native-maps';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { GooglePlacesAutocomplete, GooglePlaceDetail } from 'react-native-google-places-autocomplete';
import Slider from '@react-native-community/slider';
import Config from 'react-native-config';
import { SafeAreaView } from 'react-native-safe-area-context';

const GOOGLE_MAPS_API_KEY = Config.GOOGLE_MAPS_API_KEY;

interface Location {
  latitude: number;
  longitude: number;
}

// Geofence 정보 타입을 명확하게 정의
interface GeofenceSettings {
  latitude: number;
  longitude: number;
  radius: number;
}

export default function MapScreen() {
  const [protegeeLocation, setProtegeeLocation] = useState<Location | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [loading, setLoading] = useState(true);
  const [radius, setRadius] = useState(500);
  const mapViewRef = useRef<MapView>(null);

  useEffect(() => {
    let intervalId: number | undefined;

const fetchInitialDataAndStartPolling = async () => {
  try {
    const linkedUserId = await AsyncStorage.getItem('linkedUserId');
    const accessToken = await AsyncStorage.getItem('accessToken');
    if (!linkedUserId || !accessToken) {
      setLoading(false);
      return;
    }

    const headers = { Authorization: `Bearer ${accessToken}` };

    // --- ✨ A. 이미 설정된 지오펜스 정보 가져오기 (이 부분이 새로 추가됨) ---
    try {
      const geofenceUrl = `http://3.37.99.32:8080/api/geofence/${linkedUserId.trim()}`;
      const geofenceRes = await axios.get<GeofenceSettings>(geofenceUrl, { headers });

      if (geofenceRes.data) {
        const { latitude, longitude, radius } = geofenceRes.data;
        // 서버에서 받은 정보로 상태 업데이트
        setSelectedLocation({ latitude, longitude });
        setRadius(radius);
        console.log('[MapScreen] 저장된 지오펜스 정보를 불러왔습니다.');
      }
    } catch (geofenceError) {
       if (axios.isAxiosError(geofenceError) && geofenceError.response?.status === 404) {
          console.log('[MapScreen] 설정된 지오펜스 정보가 없습니다.');
       } else {
          console.error('[MapScreen] 지오펜스 정보 로딩 실패:', geofenceError);
       }
    }

    // --- B. 피보호자의 실시간 위치 가져오기 (기존 로직과 유사) ---
    const fetchProtegeeLocation = async () => {
      try {
        const locationUrl = `http://3.37.99.32:8080/api/location/${linkedUserId.trim()}`;
        const locationRes = await axios.get<Location>(locationUrl, { headers });
        if (locationRes.data) {
          setProtegeeLocation(locationRes.data);
        }
      } catch (err) {
        console.error('[MapScreen] 피보호자 위치 갱신 실패:', err);
      }
    };

    // 최초 위치 호출
    await fetchProtegeeLocation();
    // 30초 간격으로 위치만 다시 가져오도록 설정
    intervalId = setInterval(fetchProtegeeLocation, 30000);

  } catch (err) {
    console.error('[MapScreen] 초기 데이터 로딩 실패:', err);
  } finally {
    setLoading(false); // 모든 최초 로딩 완료
  }
};

fetchInitialDataAndStartPolling();

// 화면이 사라질 때 interval 정리
return () => {
  if(intervalId) clearInterval(intervalId);
};
  }, []);

  const handleMapPress = (event: MapPressEvent) => {
    const { coordinate } = event.nativeEvent;
    setSelectedLocation(coordinate);
  };

  // '피보호자 위치로 이동' 버튼 핸들러
  const goToProtegeeLocation = () => {
    if (protegeeLocation && mapViewRef.current) {
      const region: Region = {
        ...protegeeLocation,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      };
      mapViewRef.current.animateToRegion(region, 1000);
    }
  };

  const handleSetGeofence = async () => {
    if (!selectedLocation) {
      Alert.alert('위치 미선택', '먼저 주소를 검색하여 위치를 선택해주세요.');
      return;
    }

    try {
      const token = await AsyncStorage.getItem('accessToken');
      const linkedUserId = await AsyncStorage.getItem('linkedUserId');

      if (!token || !linkedUserId) {
        Alert.alert('오류', '로그인 정보 또는 피보호자 정보가 없습니다.');
        return;
      }

      const geofenceData = {
        latitude: selectedLocation.latitude,
        longitude: selectedLocation.longitude,
        radius: radius,
      };

      await axios.post(`http://3.37.99.32:8080/api/geofence/${linkedUserId}`, geofenceData, {
        headers: { Authorization: `Bearer ${token}` },
      });

      Alert.alert('성공', '안전 반경이 성공적으로 설정되었습니다.');
    } catch (error) {
      console.error('지오펜스 설정 실패:', error);
      Alert.alert('오류', '안전 반경 설정에 실패했습니다.');
    }
  };

  if (loading) {
    return <ActivityIndicator style={{ flex: 1 }} size="large" color="#000c49" />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <GooglePlacesAutocomplete
        placeholder="집 주소 검색"
        query={{
          key: GOOGLE_MAPS_API_KEY,
          language: 'ko',
          types: 'geocode',
        }}
        fetchDetails={true}
        debounce={200}
        minLength={1}                    // ✅ 기본값 직접 지정 (필수)
        timeout={10000}                  // ✅ 요청 타임아웃
        predefinedPlaces={[]}            // ✅ undefined 방지
        predefinedPlacesAlwaysVisible={false}
        currentLocation={false}
        currentLocationLabel="현재 위치"
        enableHighAccuracyLocation={true}
        enablePoweredByContainer={true}
        keyboardShouldPersistTaps="always"
        nearbyPlacesAPI="GooglePlacesSearch"
        styles={autoCompleteStyles}
        textInputProps={{
    onFocus: () => {},
    onBlur: () => {},
    onChangeText: () => {},
  }} 
        onPress={(data, details: GooglePlaceDetail | null) => {
          if (details) {
            const { lat, lng } = details.geometry.location;
            const newLocation: Location = { latitude: lat, longitude: lng };
            setSelectedLocation(newLocation);

            const region: Region = {
              ...newLocation,
              latitudeDelta: 0.01,
              longitudeDelta: 0.01,
            };
            mapViewRef.current?.animateToRegion(region, 1000);
          }
        }}
        onFail={(error) => {
          console.error('Google Places API Error:', error);
          Alert.alert('Google API 오류', JSON.stringify(error));
        }}
        onNotFound={() => console.warn('검색 결과 없음')}
        onTimeout={() => console.warn('요청 시간 초과')}
      />

      <MapView
        ref={mapViewRef}
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        initialRegion={
          protegeeLocation
            ? {
                ...protegeeLocation,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
              }
            : undefined
        }
        onPress={handleMapPress}
      >
        {protegeeLocation && (
          <Marker
            coordinate={protegeeLocation}
            title="피보호자 위치"
            pinColor="blue"
          />
        )}
        {selectedLocation && (
          <>
            <Marker coordinate={selectedLocation} title="안전지역 중심" />
            <Circle
              center={selectedLocation}
              radius={radius}
              fillColor="rgba(0, 150, 255, 0.2)"
              strokeColor="rgba(0, 150, 255, 0.5)"
            />
          </>
        )}
      </MapView>

      {/* ✨ 4. '피보호자 위치로 이동' 버튼 */}
      <TouchableOpacity style={styles.locationButton} onPress={goToProtegeeLocation}>
        <Text style={styles.locationButtonText}>📍</Text>
      </TouchableOpacity>

      <View style={styles.controlContainer}>
        <Text>안전 반경: {radius}m</Text>
        <Slider
          style={{ width: '80%', height: 40 }}
          minimumValue={100}
          maximumValue={2000}
          step={100}
          value={radius}
          onValueChange={setRadius}
        />
        <Button
          title="이 위치를 안전 반경으로 설정"
          onPress={handleSetGeofence}
          disabled={!selectedLocation}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1,
    backgroundColor: 'white', // 배경색 추가
  },
  map: { flex: 1 },
  controlContainer: {
    padding: 20,
    paddingBottom: 30, // 하단 여백 추가
    backgroundColor: 'white',
    alignItems: 'center',
  },
  locationButton: {
    position: 'absolute',
    bottom: 220, // controlContainer의 높이를 고려한 위치
    right: 20,
    backgroundColor: 'white',
    borderRadius: 30,
    padding: 15,
    elevation: 5, // Android 그림자 효과
    shadowColor: '#000', // iOS 그림자 효과
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  locationButtonText: {
    fontSize: 20,
  },
});

const autoCompleteStyles = {
  container: {
    position: 'absolute',
    // ✨ 3. SafeAreaView 내부에서는 top: 0으로 설정해야 상단에 잘 붙습니다.
    top: 0,
    width: '100%',
    paddingHorizontal: 10, // 좌우 여백 추가
    paddingTop: 40, // 상단 여백 추가
    zIndex: 1,
  },
  textInput: {
    height: 48,
    color: '#5d5d5d',
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: 'white',
    paddingHorizontal: 8,
  },
  listView: {
    backgroundColor: 'white',
    borderRadius: 8,
    marginTop: 8,
  },
};
