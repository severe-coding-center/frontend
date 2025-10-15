import 'react-native-geolocation-service';

declare module 'react-native-geolocation-service' {
  // 라이브러리가 실제로 받는 안드로이드 전용 옵션
  interface AndroidForegroundServiceOptions {
    notificationTitle: string;
    notificationText: string;
    notificationIcon?: string; // 선택
  }

  interface GeoWatchOptions {
    // 타입 보강: watchPosition 옵션에 foregroundService 허용
    foregroundService?: AndroidForegroundServiceOptions;
  }
}
