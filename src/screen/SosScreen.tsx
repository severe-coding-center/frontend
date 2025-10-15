import React, { useRef } from 'react';
import { TouchableOpacity, Text, StyleSheet, Vibration } from 'react-native';
import Tts from 'react-native-tts';
//import { sendKakaoAlert } from '../services/SosService'; // 실제 경로 맞게 수정

export default function SosScreen() {
  const pressTimer = useRef<NodeJS.Timeout | null>(null);

  const handlePressIn = () => {
    pressTimer.current = setTimeout(() => {
      Tts.speak('SOS 신호를 보호자에게 전송했습니다');
      Vibration.vibrate(1000);
      sendKakaoAlert(); // 실제 보호자 알림 함수
    }, 3000);
  };

  const handlePressOut = () => {
    if (pressTimer.current) clearTimeout(pressTimer.current);
  };

  return (
    <TouchableOpacity
      style={styles.container}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={1}
    >
      <Text style={styles.text}>3초간 화면을 누르고 계세요</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FF4D4D',
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    color: '#fff',
    fontSize: 22,
    fontWeight: 'bold',
  },
});
