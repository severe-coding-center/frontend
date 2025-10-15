import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

export default function MapScreen() {
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
  const fetchLocation = async () => {
    try {
      // ✅ AsyncStorage에서 피보호자 ID 가져오기
      const linkedUserId = await AsyncStorage.getItem('linkedUserId');
      console.log('[MapScreen] linkedUserId:', linkedUserId);

      // ✨ 1. AsyncStorage에서 액세스 토큰 가져오기
      const accessToken = await AsyncStorage.getItem('accessToken'); 

      if (!linkedUserId) {
        console.warn('[MapScreen] linkedUserId 없음: GuardianRegisterScreen에서 등록 필요');
        setLoading(false); // 로딩 중단
        return;
      }
      
      // ✨ 2. 토큰이 없는 경우에 대한 예외 처리
      if (!accessToken) {
        console.error('[MapScreen] accessToken이 없습니다. 로그인이 필요합니다.');
        setLoading(false); // 로딩 중단
        return;
      }

      const url = `http://3.37.99.32:8080/api/location/${linkedUserId.trim()}`;
      console.log('[MapScreen] 요청 URL:', url);

      // ✨ 3. axios 요청 시 headers에 Authorization 추가
      const res = await axios.get(url, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });
      
      console.log('[MapScreen] 서버 응답:', res.data);

      const { latitude, longitude } = res.data;
      setLocation({ latitude, longitude });
    } catch (err) {
      console.error('[MapScreen] 피보호자 위치 불러오기 실패:', err);
    } finally {
      setLoading(false); // 성공/실패 여부와 관계없이 로딩 종료
    }
  };

  fetchLocation();

  // 5초마다 위치 갱신
  const interval = setInterval(fetchLocation, 5000);
  return () => clearInterval(interval);
}, []);

  if (loading || !location) {
    return <ActivityIndicator style={{ flex: 1 }} size="large" color="#000c49" />;
  }

  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        initialRegion={{
          ...location,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }}
      >
        <Marker coordinate={location} title="피보호자 현재 위치" />
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
});
