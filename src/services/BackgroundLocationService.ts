import Geolocation from 'react-native-geolocation-service';
import { PermissionsAndroid, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

const BASE_URL = 'http://3.37.99.32:8080';
let watchId: number | null = null;

async function requestAndroidPerms() {
  if (Platform.OS !== 'android') return true;

  const req: string[] = [
    PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
    PermissionsAndroid.PERMISSIONS.ACCESS_BACKGROUND_LOCATION,
  ];
  if (Platform.Version >= 33) {
    // @ts-ignore
    req.push(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
  }

  console.log('[BG] 권한 요청 시작');
  const res = await PermissionsAndroid.requestMultiple(req as any);
  console.log('[BG] 권한 결과:', res);

  const ok = Object.values(res).every(v => v === PermissionsAndroid.RESULTS.GRANTED);
  if (!ok) console.log('[BG] 권한 거부 → 초기화 중단');
  return ok;
}

async function sendLocationToServer(p: Geolocation.GeoPosition) {
  // 피보호자 앱은 본인의 accessToken만 필요합니다. 서버가 토큰에서 ID를 알아냅니다.
  const token = await AsyncStorage.getItem('accessToken'); 

  if (!token) {
    console.log('[BG] 토큰 없음, 전송 중단');
    return;
  }

  const { latitude, longitude } = p.coords;
  console.log(`[BG] 전송 시도: ${latitude}, ${longitude}`);
  try {
    // ✨ 수정된 부분: URL에서 protectedUserId를 제거하여 백엔드 API 주소와 일치시킵니다.
    await axios.post(`${BASE_URL}/api/location`, {
      latitude,
      longitude,
      recordedAt: new Date(p.timestamp).toISOString(),
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('[BG] 전송 성공');
  } catch (e: any) {
    console.log('[BG] 전송 실패:', e.response?.data ?? e.message ?? e);
  }
}

export async function initBackgroundLocation() {
  console.log('[BG] initBackgroundLocation 진입');

  const ok = await requestAndroidPerms();
  if (!ok) return;

  if (watchId !== null) { 
    console.log('[BG] 이미 실행 중'); 
    return; 
  }

  console.log('[BG] watchPosition 등록 시도');
  watchId = Geolocation.watchPosition(
    (pos) => { 
      console.log('[BG] 위치 업데이트:', pos.coords); 
      sendLocationToServer(pos); 
    },
    (err) => { 
      console.log('[BG] watchPosition 에러:', err); 
    },
    {
      accuracy: { android: 'high', ios: 'best' },
      enableHighAccuracy: true,
      distanceFilter: 0,
      interval: 15000,
      fastestInterval: 15000,
      forceRequestLocation: true,
      showLocationDialog: true,
      foregroundService: {
        notificationTitle: '위치 추적 중',
        notificationText: '백그라운드에서 위치를 전송하고 있습니다.',
        notificationIcon: 'ic_notification',
      },
    }
  );
  console.log('[BG] watchPosition 등록 완료, watchId =', watchId);
}

export function stopBackgroundLocation() {
  if (watchId !== null) {
    Geolocation.clearWatch(watchId);
    console.log('[BG] watchPosition 해제');
    watchId = null;
  }
}

