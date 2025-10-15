import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Platform } from 'react-native';
import Sound from 'react-native-sound';
import RNFS from 'react-native-fs';
import styles from '../style/NewsSectionStyle';
import Config from 'react-native-config';

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

const AI_SERVER_URL = Config.AI_SERVER_URL;

const NewsSection = ({ disasterInfo, isLoading, isTouchable = false }: NewsSectionProps) => {
  const [isTtsLoading, setIsTtsLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  const handlePressTTS = async () => {
    if (isTtsLoading || isPlaying || !disasterInfo?.summary) return;

    setIsTtsLoading(true);
    const path = `${RNFS.CachesDirectoryPath}/temp_audio.mp3`;

    try {
      const formData = new FormData();
      formData.append('text', disasterInfo.summary);

      const ttsResponse = await fetch(`${AI_SERVER_URL}/tts`, {
        method: 'POST',
        body: formData,
      });

      if (!ttsResponse.ok) throw new Error(`TTS Server error: ${ttsResponse.status}`);
      
      const audioBlob = await ttsResponse.blob();
      const reader = new FileReader();
      reader.readAsDataURL(audioBlob);
      reader.onloadend = () => {
        const base64data = (reader.result as string).split(',')[1];
        RNFS.writeFile(path, base64data, 'base64').then(() => {
          const sound = new Sound(path, '', (error) => {
            setIsTtsLoading(false);
            if (error) return console.log('음성 파일 로드 실패', error);
            
            setIsPlaying(true);
            sound.play(() => {
              setIsPlaying(false);
              sound.release();
              RNFS.unlink(path).catch(err => console.log("임시 파일 삭제 실패", err));
            });
          });
        }).catch(err => {
          console.log('파일 쓰기 오류', err);
          setIsTtsLoading(false);
        });
      };
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