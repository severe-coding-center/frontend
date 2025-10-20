import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Platform } from 'react-native';
import Sound from 'react-native-sound';
import RNFS from 'react-native-fs';
import styles from '../style/NewsSectionStyle';
import Config from 'react-native-config';
import RNFetchBlob from 'react-native-blob-util';
import AsyncStorage from '@react-native-async-storage/async-storage';

if (Platform.OS === 'android') {
  Sound.setCategory('Playback');
}

interface DisasterInfo {
  urgency: '주의' | '경보' | '안전';
  summary: string;
}

interface NewsSectionProps {
  disasterInfo: DisasterInfo | null;
  isLoading: boolean;
  isTouchable?: boolean; // 화면 전체 터치 여부를 결정하는 prop 추가
}

const BASE_URL = Config.BACKEND_URL;

const NewsSection = ({ disasterInfo, isLoading, isTouchable = false }: NewsSectionProps) => {
  const [isTtsLoading, setIsTtsLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  const handlePressTTS = async () => {
    if (isTtsLoading || isPlaying || !disasterInfo?.summary) return;

    setIsTtsLoading(true);
    const path = `${RNFS.CachesDirectoryPath}/temp_audio.mp3`;

    try {
      const accessToken = await AsyncStorage.getItem('accessToken');
      // TtsController가 application/json을 받으므로 JSON으로 전송
      const ttsResp = await RNFetchBlob.fetch('POST',
        `${BASE_URL}/api/tts`, // 👈 백엔드 API 엔드포인트
        {
          'Content-Type': 'application/json', // 👈 JSON 타입 명시
          ...(accessToken && { 'Authorization': `Bearer ${accessToken}` })
        },
        // TtsRequestDto 형식에 맞게 { "text": "..." } JSON 문자열 전송
        JSON.stringify({ text: disasterInfo.summary })
      );

      // 서버 오류 확인
      if (ttsResp.info().status !== 200) {
        throw new Error(`[TTS] 서버 오류: ${ttsResp.info().status}`);
      }

      // 4. 수정: FileReader 대신 .base64()로 바로 변환
      const audioBase64 = ttsResp.base64();

      // 5. 수정: .then() 콜백 대신 async/await 사용
      await RNFS.writeFile(path, audioBase64, 'base64');

      // (기존과 동일) 사운드 로드 및 재생
      const sound = new Sound(path, '', (error) => {
        setIsTtsLoading(false); // 로딩 완료 (성공 또는 실패)
        if (error) {
          console.log('음성 파일 로드 실패', error);
          return;
        }
        
        setIsPlaying(true);
        sound.play(() => {
          setIsPlaying(false);
          sound.release();
          RNFS.unlink(path).catch(err => console.log("임시 파일 삭제 실패", err));
        });
      });

    } catch (error) {
      console.error('TTS 요청 오류:', error);
      setIsTtsLoading(false);
    }
  };

  const getUrgencyStyle = (urgency: '주의' | '경보' | '안전') => {
    switch (urgency) {
      case '경보': return styles.urgencyWarning;
      case '주의': return styles.urgencyCaution;
      default: return styles.urgencySafe;
    }
  };

  return (
    <View style={styles.section}>
      <Text style={styles.title}>AI 안전 정보</Text>
      <TouchableOpacity 
        style={styles.card} 
        onPress={handlePressTTS} 
        disabled={!isTouchable || isTtsLoading || isPlaying}
        activeOpacity={0.9}
      >
        {isLoading ? (
          <ActivityIndicator size="large" color="#007AFF" />
        ) : (
          disasterInfo && (
          <>
            <View>
              <View style={styles.header}>
                <View style={[styles.urgencyBadge, getUrgencyStyle(disasterInfo.urgency)]}>
                  <Text style={styles.urgencyText}>{disasterInfo.urgency}</Text>
                </View>
              </View>
              <Text style={styles.summaryText}>{disasterInfo.summary}</Text>
            </View>
            
            {/* isTouchable이 false일 때만 (보호자 화면) 버튼을 보여줍니다. */}
            {!isTouchable && (
              <TouchableOpacity
                style={styles.ttsButton}
                onPress={handlePressTTS}
                disabled={isTtsLoading || isPlaying}
                activeOpacity={0.7}
              >
                {isTtsLoading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.ttsButtonText}>
                    {isPlaying ? '재생 중...' : '음성으로 듣기'}
                  </Text>
                )}
              </TouchableOpacity>
            )}
          </>
          )
        )}
      </TouchableOpacity>
    </View>
  );
};

export default NewsSection;