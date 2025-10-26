import Geolocation from 'react-native-geolocation-service';
import { PermissionsAndroid, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import Config from 'react-native-config';
import notifee, { TimestampTrigger, TriggerType } from '@notifee/react-native';

const BASE_URL = Config.BACKEND_URL;
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

// 알림을 예약하는 별도 함수 생성
async function scheduleReminderNotification() {
  try {
    // (중요) 기존에 예약된 알림 모두 취소
    // (사용자가 앱을 켤 때마다 타이머를 리셋하기 위함)
    await notifee.cancelAllNotifications();
    console.log('[BG-NOTI] 기존 예약 알림 취소');

    // 2시간 뒤에 울릴 새 알림 예약
    const trigger: TimestampTrigger = {
      type: TriggerType.TIMESTAMP,
      timestamp: Date.now() + (60 * 60 * 1000), // 1시간 후 (밀리초 단위)
      // (테스트 시에는 (10 * 1000) (10초)로 설정)
      //timestamp: Date.now() + (10 * 1000),
    };

    await notifee.createTriggerNotification(
      {
        title: '위치 전송이 중단되었을 수 있어요',
        body: '보호자가 위치를 확인할 수 있도록 앱을 열어주세요.',
        android: {
          channelId: 'location-reminder', // 2단계에서 만든 채널 ID
          pressAction: {
            id: 'default', // 알림 클릭 시 앱 실행
          },
        },
        ios: {
          sound: 'default',
        }
      },
      trigger,
    );
    
    console.log('[BG-NOTI] 2시간 뒤 알림 예약 완료');

  } catch (e) {
    console.error('[BG-NOTI] 알림 설정/예약 실패:', e);
  }
}

export async function initBackgroundLocation() {
  console.log('[BG] initBackgroundLocation 진입');

  const ok = await requestAndroidPerms();
  if (!ok) return;

  // 알림 예약 함수를 먼저 호출
  // (이미 실행 중이든 아니든, 앱을 켰다는 사실이 중요하므로 타이머 리셋)
  await scheduleReminderNotification();

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

    // 위치 추적 중지 시, 예약된 알림도 모두 취소
    notifee.cancelAllNotifications().then(() => {
      console.log('[BG-NOTI] 모든 예약 알림 취소 (추적 중지)');
    });
  }
}

