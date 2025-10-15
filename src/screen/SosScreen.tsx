// SosScreen.tsx

import React, { useRef } from 'react';
import { TouchableOpacity, Text, StyleSheet, Vibration, Alert } from 'react-native';
import Tts from 'react-native-tts';
import { sendSosSignal } from '../services/SosService'; // 1번 단계에서 만든 파일을 import 합니다.

export default function SosScreen() {
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handlePressIn = () => {
    // 3초 타이머를 설정합니다.
    pressTimer.current = setTimeout(async () => {
      // 3초가 지나면 SOS 신호를 보냅니다.
      const success = await sendSosSignal();

      if (success) {
        // 성공 시
        Tts.speak('SOS 신호를 보호자에게 전송했습니다');
        Vibration.vibrate(1000); // 1초간 진동
        Alert.alert('전송 완료', 'SOS 신호를 보호자에게 전송했습니다.');
      } else {
        // 실패 시
        Tts.speak('SOS 신호 전송에 실패했습니다. 다시 시도해주세요.');
        Alert.alert('전송 실패', 'SOS 신호 전송에 실패했습니다. 다시 시도해주세요.');
      }
    }, 3000); // 3000ms = 3초
  };

  const handlePressOut = () => {
    // 3초가 되기 전에 손을 떼면 타이머를 취소합니다.
    if (pressTimer.current) {
      clearTimeout(pressTimer.current);
    }
  };

  return (
    <TouchableOpacity
      style={styles.container}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={1}
    >
      <Text style={styles.text}>SOS 긴급 호출</Text>
      <Text style={styles.subText}>3초간 화면을 길게 누르세요</Text>
    </TouchableOpacity>
  );
}

// 스타일 시트 (가독성을 위해 텍스트 스타일 추가)
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FF4D4D',
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    color: '#fff',
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  subText: {
    color: '#fff',
    fontSize: 18,
  },
});