import React from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DeviceInfo from 'react-native-device-info';
import axios from 'axios';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/navigationType';
import { initBackgroundLocation } from '../services/BackgroundLocationService';
import Tts from 'react-native-tts'; // 시각장애 접근성용
import styles from '../style/LoginTypeStyles'; 

type NavProp = NativeStackNavigationProp<RootStackParamList, 'LoginType'>;
const BASE_URL = 'http://3.37.99.32:8080';

export default function LoginTypeScreen() {
  const navigation = useNavigation<NavProp>();

  const handleUserLogin = async () => {
    try {
      const deviceId = await DeviceInfo.getUniqueId();
      const res = await axios.post(`${BASE_URL}/api/protected/register`, { deviceId });
      const { protectedUserId, linkingCode, accessToken, refreshToken } = res.data;

      await AsyncStorage.multiSet([
        ['userType', 'user'],
        ['protectedUserId', String(protectedUserId)],
        ['linkingCode', linkingCode],
        ['accessToken', accessToken],
        ['refreshToken', refreshToken],
      ]);

      await initBackgroundLocation();
      Tts.speak('이용자로 로그인합니다.');
      Alert.alert('로그인 성공', '이용자로 로그인되었습니다.');
      navigation.reset({ index: 0, routes: [{ name: 'Main' }] });
    } catch (err) {
      console.error('[LoginType] User login 실패:', err);
      Alert.alert('오류', '이용자 로그인에 실패했습니다.');
    }
  };

  const handleGuardianLogin = async () => {
    try {
      await AsyncStorage.setItem('userType', 'guardian');
      Tts.speak('보호자로 로그인합니다.');
      navigation.navigate('KakaoLoginWebView');
    } catch (err) {
      console.error('[LoginType] Guardian userType 저장 실패:', err);
      Alert.alert('오류', '로그인 유형을 저장하는 데 실패했습니다.');
    }
  };

  return (
    <View style={styles.container}>
      {/* 상단: 이용자 로그인 */}
      <TouchableOpacity
        style={styles.userSection}
        onPress={handleUserLogin}
        activeOpacity={0.8}
      >
        <Text style={styles.textLarge}>이용자로 로그인</Text>
      </TouchableOpacity>

      {/* 하단: 보호자 로그인 */}
      <TouchableOpacity
        style={styles.guardianSection}
        onPress={handleGuardianLogin}
        activeOpacity={0.8}
      >
        <Text style={styles.textLarge}>보호자로 로그인</Text>
      </TouchableOpacity>
    </View>
  );
}
