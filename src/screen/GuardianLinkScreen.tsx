import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios, { isAxiosError } from 'axios';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/navigationType';
import Tts from 'react-native-tts';
import styles from '../style/GuardianLinkStyles';
import Config from 'react-native-config';

type NavProp = NativeStackNavigationProp<RootStackParamList, 'GuardianLink'>;
const BASE_URL = Config.BACKEND_URL;

export default function GuardianLinkScreen() {
  const navigation = useNavigation<NavProp>();
  const [uniqueCode, setUniqueCode] = useState('');

  useEffect(() => {
    Tts.speak('보호자 로그인 화면입니다. 이용자 코드를 입력하세요.');
    const checkLinked = async () => {
      const linkedUserId = await AsyncStorage.getItem('linkedUserId');
      if (linkedUserId) navigation.reset({ index: 0, routes: [{ name: 'Main' }] });
    };
    checkLinked();
  }, [navigation]);

  const handleRegister = async () => {
  if (!uniqueCode.trim()) {
    Alert.alert('오류', '이용자 코드를 입력하세요.');
    return;
  }

  try {
    const accessToken = await AsyncStorage.getItem('accessToken');
    const res = await axios.post(`${BASE_URL}/api/relationship/link`, 
      { linkingCode: uniqueCode }, 
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    // ✨ 백엔드 응답에서 id(relationshipId)와 protectedUser 객체를 받습니다.
    const { id: relationshipId, protectedUser } = res.data;

    // ✨ 두 개의 ID를 AsyncStorage에 저장합니다.
    await AsyncStorage.setItem('linkedUserId', String(protectedUser.id));
    await AsyncStorage.setItem('relationshipId', String(relationshipId)); // 이 줄 추가!

    Tts.speak('등록이 완료되었습니다. 메인 화면으로 이동합니다.');
    Alert.alert('성공', '피보호자 등록 완료');
    navigation.reset({ index: 0, routes: [{ name: 'Main' }] });
  } catch (err) {
    console.error('[GuardianLink] 등록 실패:', err);
    // 서버에서 오는 에러 메시지를 보여주면 더 좋습니다.
    let errorMessage = '피보호자 등록에 실패했습니다.';
      if (isAxiosError(err) && err.response?.data?.message) {
        errorMessage = err.response.data.message;
      }
      Alert.alert('오류', errorMessage);
  }
};

  return (
    <View style={styles.container}>
      <Text style={styles.title}>이용자 코드 연결</Text>

      <TextInput
        placeholder="이용자 코드 입력"
        value={uniqueCode}
        onChangeText={setUniqueCode}
        style={styles.input}
        placeholderTextColor="#999"
      />

      <TouchableOpacity style={styles.button} onPress={handleRegister}>
        <Text style={styles.buttonText}>등록하기</Text>
      </TouchableOpacity>
    </View>
  );
}
