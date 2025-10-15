import React, { useEffect, useState } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Swiper from 'react-native-swiper';
import Tts from 'react-native-tts';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MessageCircle } from 'lucide-react-native';
import Config from 'react-native-config';

import Header from '../content/Header';
import IntroScreen from '../screen/IntroScreen';
import NewsSection from '../content/NewsSection';
import SosScreen from '../screen/SosScreen';
import MyScreen from '../screen/MyScreen';
import RecentActivityBox from '../content/RecentActivityBox';
import BottomNavigation from '../content/BottomNavigation';
import { RootStackParamList } from '../navigation/navigationType';
import navStyles from '../style/BottomNavigationStyle';

// 필요한 타입 및 환경 변수 선언
interface DisasterInfo {
  urgency: '주의' | '경보' | '안전';
  summary: string;
}

// UserMain 컴포넌트의 props 타입을 정의합니다.
interface UserMainProps {
  disasterInfo: DisasterInfo | null;
  isLoadingNews: boolean;
  handleIndexChange: (index: number) => void;
  handleCenterButtonPress: () => void;
}

// GuardianMain 컴포넌트의 props 타입을 정의합니다.
interface GuardianMainProps {
  disasterInfo: DisasterInfo | null;
  isLoadingNews: boolean;
}


const SAFETY_DATA_API_KEY = Config.SAFETY_DATA_API_KEY;
const AI_SERVER_URL = Config.AI_SERVER_URL;

const UserMain = ({ disasterInfo, isLoadingNews, handleIndexChange, handleCenterButtonPress }: UserMainProps) => (
    <SafeAreaView style={styles.container}>
      <Header title="경호원" />
      <Swiper loop={false} showsPagination onIndexChanged={handleIndexChange} dotColor="#ccc" activeDotColor="#1E6BFF">
        <View style={styles.slide}><IntroScreen /></View>
        <View style={styles.slide}><NewsSection disasterInfo={disasterInfo} isLoading={isLoadingNews} isTouchable={true} /></View>
        <View style={styles.slide}><SosScreen /></View>
        <View style={styles.slide}><MyScreen embedded /></View>
      </Swiper>
      <TouchableOpacity style={[navStyles.centerButton, { position: 'absolute', alignSelf: 'center', bottom: 25 }]} onPress={handleCenterButtonPress} activeOpacity={0.8}>
        <MessageCircle color="#fff" size={navStyles.iconSize.width} />
      </TouchableOpacity>
    </SafeAreaView>
  );

  const GuardianMain = ({ disasterInfo, isLoadingNews }: GuardianMainProps) => (
    <SafeAreaView style={styles.container}>
      <Header />
      <View style={styles.guardianContent}>
        <NewsSection disasterInfo={disasterInfo} isLoading={isLoadingNews} />
        <RecentActivityBox />
      </View>
      <BottomNavigation active="home" userType="guardian" />
    </SafeAreaView>
  );

export default function MainScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [userType, setUserType] = useState<'user' | 'guardian' | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  const [isLoadingNews, setIsLoadingNews] = useState(true);
  const [disasterInfo, setDisasterInfo] = useState<DisasterInfo | null>(null);

  useEffect(() => {
    const getUserType = async () => {
      const type = await AsyncStorage.getItem('userType');
      if (type === 'user' || type === 'guardian') setUserType(type);
    };
    getUserType();
  }, []);

  useEffect(() => {
    let isMounted = true; // 메모리 누수 방지를 위한 마운트 상태 추적

    const fetchAndProcessDisasterInfo = async () => {
      if (isMounted) setIsLoadingNews(true);
      
      const isApiDown = true; // API 복구 시 false로 변경

      if (isApiDown) {
        if (isMounted) {
          setDisasterInfo({
            summary: '현재 국가 재난안전정보 API 서비스가 점검 중입니다. 잠시 후 다시 시도해주세요.',
            urgency: '주의',
          });
          setIsLoadingNews(false);
        }
        return;
      }
      
      // --- ✨ 생략되었던 실제 API 호출 로직 전체 ---
      if (!SAFETY_DATA_API_KEY) {
        console.error("SAFETY_DATA_API_KEY가 .env 파일에 설정되지 않았습니다.");
        if (isMounted) {
            setDisasterInfo({ summary: 'API 키 설정 오류.', urgency: '경보' });
            setIsLoadingNews(false);
        }
        return;
      }

      try {
        const serviceKey = encodeURIComponent(SAFETY_DATA_API_KEY);
        const url = `https://www.safetydata.go.kr/V2/api/DSSP-IF-00247?serviceKey=${serviceKey}&pageNo=1&numOfRows=1&returnType=json`;
        const response = await fetch(url);
        if (!response.ok) throw new Error(`API 서버 응답 오류: ${response.status}`);
        
        const data = await response.json();
        const rawMessage = data?.body?.[0]?.MSG_CN;

        if (!rawMessage) {
            if (isMounted) setDisasterInfo({ summary: '현재 새로운 재난 정보가 없습니다.', urgency: '안전' });
            return;
        }

        let summaryText = rawMessage;
        try {
            const formData = new FormData();
            formData.append('text', rawMessage);
            const summaryResponse = await fetch(`${AI_SERVER_URL}/summarize`, {
                method: 'POST',
                body: formData,
            });
            if (summaryResponse.ok) {
                const summaryData = await summaryResponse.json();
                summaryText = summaryData.summary;
            }
        } catch (e) {
            console.error("요약 요청 중 오류 발생:", e);
        }

        if (isMounted) {
            setDisasterInfo({
                summary: summaryText,
                urgency: rawMessage.includes('경보') ? '경보' : (rawMessage.includes('주의') ? '주의' : '안전'),
            });
        }
      } catch (error) {
        console.error("재난 정보 처리 오류:", error);
        if (isMounted) {
            setDisasterInfo({ summary: '정보를 불러오는 데 실패했습니다.', urgency: '안전' });
        }
      } finally {
        if (isMounted) setIsLoadingNews(false);
      }
    };

    fetchAndProcessDisasterInfo();
    
    return () => { isMounted = false; }; // Cleanup 함수
  }, []);

  if (!userType) return null;

  const handleIndexChange = (index: number) => {
    setCurrentIndex(index);
    const messages = [
      '현재는 안내 화면입니다. 왼쪽으로 밀면 서비스를 이용할 수 있습니다.',
      '현재 화면은 재난정보 서비스입니다.',
      '현재 화면은 긴급 SOS 서비스입니다.',
      '현재 화면은 마이페이지입니다.',
    ];
    Tts.stop();
    Tts.speak(messages[index]);
  };

  const handleCenterButtonPress = () => {
    if (userType === 'guardian') {
      navigation.navigate('MapScreen');
    } else {
      navigation.navigate('CameraScreen');
    }
  };

  

  return userType === 'guardian' ? (
    <GuardianMain disasterInfo={disasterInfo} isLoadingNews={isLoadingNews} />
  ) : (
    <UserMain 
      disasterInfo={disasterInfo} 
      isLoadingNews={isLoadingNews} 
      handleIndexChange={handleIndexChange}
      handleCenterButtonPress={handleCenterButtonPress}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  slide: { flex: 1 },
  guardianContent: {
    flex: 1,
    paddingBottom: 8, // 하단 네비게이션과 겹치지 않도록 패딩 추가
  },
});