/**
 * @format
 */

import {AppRegistry, Platform} from 'react-native';
import App from './App';
import {name as appName} from './app.json';

// [추가] Headless JS 파일 import
import GeofenceHeadlessTask from './src/native/GeofenceHeadlessTask';

import messaging from '@react-native-firebase/messaging'; // FCM 라이브러리 import
import notifee from '@notifee/react-native';

async function setupNotifications() {
  // iOS 권한 요청
  if (Platform.OS === 'ios') {
    await notifee.requestPermission();
  }

  // Android 알림 채널 생성 (로컬 예약 알림용)
  await notifee.createChannel({
    id: 'location-reminder', // ✨ 우리가 쓸 채널 ID
    name: '위치 전송 알림',
    sound: 'default',
  });

  // (기존 코드에 있던 'default' 채널도 여기서 함께 생성)
  await notifee.createChannel({
    id: 'default',
    name: 'Default Channel',
  });
}

// 앱 시작 시 바로 호출
setupNotifications();

messaging().onMessage(async remoteMessage => {
  console.log('FCM 포그라운드 메시지를 수신했습니다:', remoteMessage);

  // 안드로이드에서는 알림을 표시하기 전에 '채널'이 필요합니다.
  const channelId = await notifee.createChannel({
    id: 'default',
    name: 'Default Channel',
  });

  // Notifee를 사용해서 화면에 알림을 직접 띄웁니다.
  await notifee.displayNotification({
    title: remoteMessage.notification.title,
    body: remoteMessage.notification.body,
    android: {
      channelId,
    },
  });
});

// [추가] Headless JS Task 등록
AppRegistry.registerHeadlessTask('GeofenceEvent', () => GeofenceHeadlessTask);

AppRegistry.registerComponent(appName, () => App);
