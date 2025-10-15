// src/services/SosService.ts

import axios from 'axios';
import Config from 'react-native-config';
import AsyncStorage from '@react-native-async-storage/async-storage';

// LoginTypeScreen.tsx 와 동일한 서버 주소
const BASE_URL = Config.BACKEND_URL;

/**
 * 서버에 SOS 신호를 보내는 함수
 */
export const sendSosSignal = async (): Promise<boolean> => {
  try {
    // 1. AsyncStorage에서 로그인 시 저장된 AccessToken을 가져옵니다.
    const accessToken = await AsyncStorage.getItem('accessToken');

    if (!accessToken) {
      console.error('[SOS Service] accessToken이 없습니다. 로그인이 필요합니다.');
      return false;
    }

    // 2. 백엔드의 /api/sos 엔드포인트로 POST 요청을 보냅니다.
    //    이때 헤더에 Authorization을 포함하여 인증된 사용자임을 증명합니다.
    await axios.post(
      `${BASE_URL}/api/sos`,
      {}, // SOS API는 별도의 body 데이터가 필요 없습니다.
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    console.log('[SOS Service] 서버에 SOS 신호를 성공적으로 전송했습니다.');
    return true;
  } catch (error) {
    console.error('[SOS Service] SOS 신호 전송 실패:', error);
    return false;
  }
};