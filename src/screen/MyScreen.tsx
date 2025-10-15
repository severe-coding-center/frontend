import React, { useEffect, useState } from 'react';
import {
  ScrollView,
  Alert,
  Dimensions,
  StyleSheet
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

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

type MyScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Main'>;

export default function MyScreen({ embedded = false }: { embedded?: boolean }) {
  const [userType, setUserType] = useState<'user' | 'guardian' | null>(null);
  const navigation = useNavigation<MyScreenNavigationProp>();

  useEffect(() => {
    const getUserType = async () => {
      const type = await AsyncStorage.getItem('userType');
      if (type === 'user' || type === 'guardian') {
        setUserType(type);
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
        await AsyncStorage.multiRemove(['userType', 'protectedUserId', 'uniqueCode']);
      } else if (type === 'guardian') {
        await AsyncStorage.multiRemove([
          'userType',
          'guardianId',
          'accessToken',
          'refreshToken',
          'linkedUserId',
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

  if (!userType) return null;

  return (
    <SafeAreaView style={styles.container}>
      {!embedded && <Header title="마이" />}
      <ScrollView contentContainerStyle={{ paddingBottom: embedded ? 0 : 100 }}>
        <UserInfo />
        <FeatureCard label="대피소 찾기" height={SCREEN_HEIGHT * 0.1} />
        <FeatureCard label="재난 상황별 행동요령" height={SCREEN_HEIGHT * 0.07} />
        <FeatureCard label="공지사항" height={SCREEN_HEIGHT * 0.07} />
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
});
