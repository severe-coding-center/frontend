import React, { useEffect, useState } from 'react';
import { View, Text } from 'react-native';
import { User } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import styles from '../style/UserInfoStyle';

export default function UserInfo() {
  const [name, setName] = useState<string | null>(null);
  const [subtitle, setSubtitle] = useState<string | null>(null);

  useEffect(() => {
    const fetchUserInfo = async () => {
      try {
        const userType = await AsyncStorage.getItem('userType');

        if (userType === 'guardian') {
          // --- 보호자인 경우 ---
          // KakaoLoginWebView에서 저장한 'nickname'을 가져옵니다.
          const guardianName = await AsyncStorage.getItem('nickname');
          
          setName(guardianName || '보호자'); // 닉네임이 혹시 없으면 '보호자'로 표시
          setSubtitle('보호자 계정');

        } else if (userType === 'user') {
          // --- 이용자(피보호자)인 경우 ---
          setName('이용자');
          setSubtitle('코드로 보호자와 연결하세요');

        } else {
          setName('정보 없음');
          setSubtitle('로그인 정보가 없습니다.');
        }
      } catch (error) {
        console.error('UserInfo fetch 실패:', error);
        setName('정보 없음');
        setSubtitle('정보를 불러오지 못했습니다.');
      }
    };

    fetchUserInfo();
  }, []);

  // 로딩 중 표시 (name이 null일 때)
  if (name === null) {
    return (
      <View style={styles.container}>
        <View style={[styles.avatar, styles.fallback]}>
          <User size={36} color="#fff" style={{ alignSelf: 'center', marginTop: 7 }} />
        </View>
        <View style={styles.textBox}>
          <Text style={styles.name}>로딩 중...</Text>
          <Text style={styles.sub}>사용자 정보를 불러오는 중</Text>
        </View>
      </View>
    );
  }

  // 로딩 완료 후
  return (
    <View style={styles.container}>
      {/* 아바타 대용 아이콘 */}
      <View style={[styles.avatar, styles.fallback]}>
        <User size={36} color="#fff" style={{ alignSelf: 'center', marginTop: 7 }} />
      </View>

      {/* 텍스트 박스 (state 값으로 렌더링) */}
      <View style={styles.textBox}>
        <Text style={styles.name}>{name}</Text>
        
        {/* 부제가 있을 때만 렌더링 */}
        {subtitle && (
          <Text style={styles.sub}>{subtitle}</Text>
        )}
      </View>
    </View>
  );
}