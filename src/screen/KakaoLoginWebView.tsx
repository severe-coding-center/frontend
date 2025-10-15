// KakaoLoginWebView.tsx

import React, { useRef } from 'react';
import { View } from 'react-native';
import { WebView } from 'react-native-webview';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/navigationType';
import CookieManager from '@react-native-cookies/cookies';
import Config from 'react-native-config';
import axios from 'axios';
import messaging from '@react-native-firebase/messaging'; // 👈 Firebase 메시징 import

import 'react-native-url-polyfill/auto';

const REST_API_KEY = Config.REST_API_KEY;
const REDIRECT_URI = Config.REDIRECT_URI;
const KAKAO_AUTH_URL =
  `https://kauth.kakao.com/oauth/authorize?client_id=${REST_API_KEY}&redirect_uri=${REDIRECT_URI}&response_type=code&state=guardian`;

const BASE_URL = "http://3.37.99.32:8080";

// 💡 [추가] FCM 토큰 등록 함수
const registerFcmToken = async (accessToken: string) => {
  try {
    const fcmToken = await messaging().getToken();
    console.log('[FCM] 보호자 기기 토큰:', fcmToken);

    await axios.post(
      `${BASE_URL}/api/users/fcm-token`,
      { fcmToken: fcmToken },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );
    console.log('[FCM] 서버에 FCM 토큰 등록 성공');
  } catch (error) {
    console.error('[FCM] 서버에 FCM 토큰 등록 실패:', error);
  }
};


export default function KakaoLoginWebView() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const handledRef = useRef(false);

  const parseDeepLinkParams = (url: string) => {
    try {
      const u = new URL(url);
      const q = u.searchParams;
      return {
        accessToken: q.get('accessToken') ?? '',
        refreshToken: q.get('refreshToken') ?? '',
        nickname: q.get('nickname') ?? '',
        kakaoId: q.get('kakaoId') ?? '',
      };
    } catch (e) {
      console.warn('[KakaoLoginWebView] URL 파싱 실패 → 수동 파싱 폴백 사용:', e);
      const [, qs] = url.split('?');
      const out: Record<string, string> = {};
      if (qs) {
        qs.split('&').forEach((kv) => {
          const [k, v = ''] = kv.split('=');
          if (k) out[k] = decodeURIComponent(v);
        });
      }
      return {
        accessToken:  out['accessToken']  ?? '',
        refreshToken: out['refreshToken'] ?? '',
        nickname:     out['nickname']     ?? '',
        kakaoId:      out['kakaoId']      ?? '',
      };
    }
  };

  const checkLinkStatusFromServer = async (accessToken: string): Promise<boolean> => {
    try {
      console.log('[KakaoLoginWebView] 서버에 사용자 정보 요청 시작');
      const response = await axios.get(`${BASE_URL}/api/users/me`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      const linkedUserId = response.data?.linkedUserId;

      if (linkedUserId) {
        console.log(`[KakaoLoginWebView] 서버 확인 결과: 연결됨 (linkedUserId: ${linkedUserId})`);
        await AsyncStorage.setItem('linkedUserId', String(linkedUserId));
        return true;
      } else {
        console.log('[KakaoLoginWebView] 서버 확인 결과: 연결되지 않음');
        await AsyncStorage.removeItem('linkedUserId');
        return false;
      }
    } catch (error) {
      console.error('[KakaoLoginWebView] 사용자 정보 조회 API 호출 실패:', error);
      return false;
    }
  };

  const handleOpenAppLink = async (url: string, from: 'shouldStart' | 'stateChange') => {
    if (handledRef.current) return;
    
    try {
      const { accessToken, refreshToken, nickname, kakaoId } = parseDeepLinkParams(url);
      if (!accessToken) return;

      await AsyncStorage.setItem('accessToken', accessToken);
      if (refreshToken) await AsyncStorage.setItem('refreshToken', refreshToken);
      if (nickname)     await AsyncStorage.setItem('nickname', nickname);
      if (kakaoId)      await AsyncStorage.setItem('guardianId', kakaoId);
      
      const userType = (await AsyncStorage.getItem('userType')) as 'user' | 'guardian' | null;
      handledRef.current = true;
      
      if (userType === 'guardian') {
        // 💡 [핵심] FCM 토큰을 서버에 등록하는 함수 호출!
        await registerFcmToken(accessToken);
        
        const isLinked = await checkLinkStatusFromServer(accessToken);
        
        if (isLinked) {
          navigation.reset({ index: 0, routes: [{ name: 'Main' }] });
        } else {
          navigation.reset({ index: 0, routes: [{ name: 'GuardianLink' }] });
        }
      } else {
        navigation.reset({ index: 0, routes: [{ name: 'Main' }] });
      }

    } catch (e) {
      console.error('[KakaoLoginWebView] 딥링크 처리 오류:', e);
    }
  };
  
  return (
    <View style={{ flex: 1 }}>
      <WebView
        source={{ uri: KAKAO_AUTH_URL }}
        javaScriptEnabled
        originWhitelist={['*']}
        sharedCookiesEnabled
        thirdPartyCookiesEnabled
        onShouldStartLoadWithRequest={(req) => {
          const url = req?.url ?? '';
          if (url.startsWith('guard://')) {
            handleOpenAppLink(url, 'shouldStart');
            return false;
          }
          return true;
        }}
        onNavigationStateChange={(state) => {
          const url = state?.url ?? '';
          if (url.startsWith('guard://')) {
            handleOpenAppLink(url, 'stateChange');
          }
        }}
        onLoadEnd={() => {
          CookieManager.flush().then(() => console.log('[WebView] 쿠키 flush 완료'));
        }}
      />
    </View>
  );
}