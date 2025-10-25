import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, ActivityIndicator, TouchableOpacity, ScrollView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import styles from '../style/RecentActivityBoxStyle';
import Config from 'react-native-config';
import { RefreshCw } from 'lucide-react-native';

// 백엔드 API의 기본 URL (환경 변수나 별도 설정 파일로 관리하는 것이 좋습니다)
const BASE_URL = Config.BACKEND_URL;

// 백엔드에서 오는 AlertLogDto의 타입을 정의합니다.
interface AlertLog {
  eventType: 'SOS' | 'GEOFENCE_EXIT' | 'GEOFENCE_ENTER';
  message: string;
  eventTime: string;
}

// EventType을 한글로 변환하기 위한 맵
const eventTypeToKorean: { [key: string]: string } = {
  SOS: 'SOS 호출',
  GEOFENCE_EXIT: '안전지역 이탈',
  GEOFENCE_ENTER: '안전지역 진입',
};

// 날짜/시간 문자열을 "MM월 DD일 HH:mm" 형식으로 변환하는 함수
const formatDateTime = (isoString: string) => {
  const date = new Date(isoString);
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${month}월 ${day}일 ${hours}:${minutes}`;
};

// 오늘 날짜인지 확인하는 헬퍼 함수
const isToday = (isoString: string) => {
  const date = new Date(isoString);
  const today = new Date();
  // 날짜, 월, 년이 모두 같으면 true 반환
  return date.toDateString() === today.toDateString();
};

const RecentActivityBox = () => {
  // 상태 관리
  const [logs, setLogs] = useState<AlertLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchActivities = useCallback(async () => {
    setIsLoading(true);
    setError(null);
      try {
        // 1. AsyncStorage에서 API 요청에 필요한 정보 가져오기
        const token = await AsyncStorage.getItem('accessToken');
        const linkedUserId = await AsyncStorage.getItem('linkedUserId'); // 피보호자 ID

        if (!token || !linkedUserId) {
          setError('보호자 또는 피보호자 정보를 찾을 수 없습니다.');
          return;
        }

        // 2. 백엔드 API 호출
        const response = await axios.get<AlertLog[]>(
          `${BASE_URL}/api/alerts/${linkedUserId}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        
        const allLogs = response.data;

        const todayLogs = allLogs.filter(log => isToday(log.eventTime));
        todayLogs.sort((a, b) => new Date(b.eventTime).getTime() - new Date(a.eventTime).getTime());
        setLogs(todayLogs);

      } catch (err) {
        console.error('활동 내역 로딩 실패:', err);
        setError('활동 내역을 불러오는 데 실패했습니다.');
      } finally {
        setIsLoading(false);
      }
    }, []); // 빈 배열을 전달하여 컴포넌트가 처음 마운트될 때 한 번만 실행

    useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  const renderContent = () => {
    // 로딩 중일 때는 리스트를 보여주지 않습니다.
  if (isLoading) {
 return <ActivityIndicator size="small" color="#888" style={{ marginTop: 8 }} />;
 }
 if (error) {
 return <Text style={styles.errorText}>{error}</Text>;
 }
 if (logs.length === 0) {
 return <Text style={styles.description}>오늘 활동 내역이 없습니다.</Text>;
 }
  return (
 <ScrollView style={styles.logListContainer}>
 {logs.map((log, index) => (
 <View key={`${log.eventTime}-${index}`} style={styles.logEntry}>
 <Text style={styles.logTime}>{formatDateTime(log.eventTime)}</Text>
 <Text style={styles.logEvent}>
 {eventTypeToKorean[log.eventType] || log.eventType}
 </Text>
 </View>
 ))}
 </ScrollView>
 );
 };

  //  3단계: 최종 UI 구조를 수정하여 헤더와 컨텐츠 영역을 분리합니다.
 return (
 <View style={styles.container}>
      {/* 제목과 새로고침 버튼을 담는 헤더 컨테이너 */}
 <View style={styles.headerContainer}>
 <Text style={styles.title}>최근 활동 내역</Text>
        {/* 새로고침 버튼 */}
 <TouchableOpacity onPress={fetchActivities} style={styles.reloadButton}>
 <RefreshCw size={18} color="#555" />
 </TouchableOpacity>
 </View>
      {/* 실제 컨텐츠 (로딩, 에러, 리스트 등) */}
 {renderContent()}
 </View>
 );
};

export default RecentActivityBox;