import React, { useEffect } from 'react';
import { View, Image, Text, StyleSheet } from 'react-native';
import Tts from 'react-native-tts';

export default function IntroScreen() {
  useEffect(() => {
    Tts.stop();
    Tts.speak('경호원 앱에 오신 것을 환영합니다. 화면을 왼쪽으로 밀면 서비스를 이용할 수 있습니다.');
  }, []);

  return (
    <View style={styles.container}>
      <Image
        source={require('../image/Logo.png')} // 👈 로고 이미지 경로 맞게 조정
        style={styles.logo}
      />
      <Text style={styles.title}>경호원</Text>
      <Text style={styles.subtitle}>AI 기반 재난·안전 알림 서비스</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1E6BFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    width: 160,
    height: 160,
    marginBottom: 20,
    resizeMode: 'contain',
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 18,
    color: '#e6e6e6',
  },
});
