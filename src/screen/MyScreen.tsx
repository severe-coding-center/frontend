import React, { useEffect, useState } from 'react';
import {
  ScrollView,
  Alert,
  Dimensions,
  StyleSheet,
  View,
  Text
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import Header from '../content/Header';
import UserInfo from '../content/UserInfo';
import FeatureCard from '../content/FeatureCard';
import { RootStackParamList } from '../navigation/navigationType';
import CookieManager from '@react-native-cookies/cookies';
import BottomNavigation from '../content/BottomNavigation';
import axios from 'axios';
import Config from 'react-native-config';

import { stopBackgroundLocation } from '../services/BackgroundLocationService';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const BASE_URL = Config.BACKEND_URL;

type MyScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Main'>;

export default function MyScreen({ embedded = false }: { embedded?: boolean }) {
  const [userType, setUserType] = useState<'user' | 'guardian' | null>(null);
  const [linkingCode, setLinkingCode] = useState<string | null>(null);
  const navigation = useNavigation<MyScreenNavigationProp>();

  useEffect(() => {
    const getUserType = async () => {
      const type = await AsyncStorage.getItem('userType');
      if (type === 'user' || type === 'guardian') {
        setUserType(type);

        if (type === 'user') {
      const code = await AsyncStorage.getItem('linkingCode');
      setLinkingCode(code);
    }
      }
    };
    getUserType();
  }, []);

  const handleLogout = async () => {
    try {
      const type = await AsyncStorage.getItem('userType');

      await CookieManager.clearAll(true);
      console.log('[MyScreen] WebView 쿠키 삭제 완료');

      if (type === 'user') {
        stopBackgroundLocation();
        await AsyncStorage.multiRemove(['userType', 'protectedUserId', 'uniqueCode']);
      } else if (type === 'guardian') {
        await AsyncStorage.multiRemove([
          'userType',
          'guardianId',
          'accessToken',
          'refreshToken',
          'linkedUserId',
          'relationshipId',
        ]);
      }

      navigation.reset({
        index: 0,
        routes: [{ name: 'LoginType' }],
      });
    } catch (error) {
      console.error('로그아웃 중 오류 발생:', error);
      Alert.alert('오류', '로그아웃에 실패했습니다.');
    }
  };

  const handleLogoutPress = () => {
    Alert.alert(
      '로그아웃 확인',
      '정말 로그아웃 하시겠습니까?',
      [
        { text: '취소', style: 'cancel' },
        { text: '로그아웃', onPress: handleLogout, style: 'destructive' },
      ],
      { cancelable: true }
    );
  };

  const handleUnlink = async () => {
  // 로컬 데이터를 정리하고 화면을 이동시키는 헬퍼 함수 (재사용)
  const cleanupAndNavigate = (title:string, message:string) => {
    AsyncStorage.removeItem('linkedUserId');
    AsyncStorage.removeItem('relationshipId');

    Alert.alert(
      title,
      message,
      [{
        text: '확인',
        onPress: () => navigation.reset({
          index: 0,
          routes: [{ name: 'GuardianLink' }],
        })
      }],
      { cancelable: false }
    );
  };

  try {
    const token = await AsyncStorage.getItem('accessToken');
    const relationshipId = await AsyncStorage.getItem('relationshipId');

    // 기기에 relationshipId가 없는 경우, 바로 정리하고 이동
    if (!relationshipId) {
      cleanupAndNavigate(
        "정보 없음",
        "연결된 피보호자 정보가 없습니다. 연결 화면으로 이동합니다."
      );
      return;
    }

    // 서버에 정상적으로 삭제 요청
    await axios.delete(`${BASE_URL}/api/relationship/${relationshipId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    // ✅ Case 1: 서버에서 삭제 성공 (2xx 응답)
    // 이 부분은 axios 요청이 성공했을 때만 실행됩니다.
    cleanupAndNavigate(
      "연결 해제 성공",
      "연결이 해제되었습니다. 다시 코드를 연결해주세요."
    );

  } catch (error) {
    console.error("연결 해제 실패:", error);

    // axios 에러인지, 응답이 있는지 확인
    if (axios.isAxiosError(error) && error.response) {
      // ✅ Case 2: 서버에 이미 관계가 없음 (404 Not Found 응답)
      // 데이터가 꼬인 핵심 원인. 이 경우엔 서버는 정상이므로 클라이언트만 정리합니다.
      if (error.response.status === 404) {
        cleanupAndNavigate(
          "정보 동기화",
          "서버에 이미 연결 정보가 없습니다. 기기 정보를 정리합니다."
        );
      } else {
        // ✅ Case 3: 그 외 서버 오류 (500, 403 등)
        // 진짜 서버 문제일 수 있으므로, 로컬 데이터는 건드리지 않고 오류만 알립니다.
        Alert.alert(
          "오류",
          `연결 해제에 실패했습니다. 잠시 후 다시 시도해주세요. (오류 코드: ${error.response.status})`
        );
      }
    } else {
      // 네트워크 연결 문제 등 axios 요청 자체가 실패한 경우
      Alert.alert(
        "네트워크 오류",
        "연결 해제 요청에 실패했습니다. 인터넷 연결을 확인해주세요."
      );
    }
  }
};

  const handleUnlinkPress = () => {
    Alert.alert(
      '피보호자 연결 해제',
      '정말로 연결을 해제하시겠습니까? 이 작업은 되돌릴 수 없습니다.',
      [
        { text: '취소', style: 'cancel' },
        { text: '해제', onPress: handleUnlink, style: 'destructive' },
      ],
      { cancelable: true }
    );
  };

  if (!userType) return null;

  return (
    <SafeAreaView style={styles.container}>
      {!embedded && <Header title="마이" />}
      <ScrollView contentContainerStyle={{ paddingBottom: embedded ? 0 : 100 }}>
        <UserInfo />
        {userType === 'user' && linkingCode && (
          <View style={styles.codeContainer}>
            <Text style={styles.codeLabel}>나의 연결 코드</Text>
            <Text style={styles.codeText}>{linkingCode}</Text>
            </View>
          )}
        <FeatureCard label="공지사항" height={SCREEN_HEIGHT * 0.07} />
        {userType === 'guardian' && (
            <FeatureCard
                label="피보호자 연결 해제"
                height={SCREEN_HEIGHT * 0.07}
                onPress={handleUnlinkPress}
                // isDestructive={true} // (선택) FeatureCard가 빨간색 텍스트를 지원한다면 사용
            />
        )}
        <FeatureCard
          label="계정 로그아웃"
          height={SCREEN_HEIGHT * 0.07}
          onPress={handleLogoutPress}
        />
      </ScrollView>

      {userType === 'guardian' && (
        <BottomNavigation active="my" userType="guardian" />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  codeContainer: {
    marginHorizontal: 20,
    marginTop: 24,
    marginBottom: 8,
    padding: 20,
    backgroundColor: '#f0f4ff', // 연한 파란색 배경
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#dde5ff',
  },
  codeLabel: {
    fontSize: 16,
    color: '#505a75',
    marginBottom: 8,
  },
  codeText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#000c49', // 앱의 메인 색상
    letterSpacing: 5, // 코드가 잘 보이도록 글자 간격 조정
  },
});
