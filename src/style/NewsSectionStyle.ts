import { StyleSheet, Dimensions } from 'react-native';

const { width } = Dimensions.get('window');
// 화면 너비 360을 기준으로 스케일 값을 계산합니다.
const scale = width / 360;

const styles = StyleSheet.create({
  section: {
    width: '100%',
    paddingHorizontal: scale * 10,
    marginTop: scale * 10,
    marginBottom: scale * 10,
    //flex: 1, // 화면을 채우도록 flex: 1 추가
  },
  title: {
    fontSize: scale * 18,
    fontFamily: 'VITRO CORE OTF',
    marginBottom: scale * 8,
    marginLeft: scale * 5,
    color: '#333',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: scale * 12,
    padding: scale * 16,
    // 그림자 효과 (iOS & Android)
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 5,
    justifyContent: 'space-between',
    // flex: 1, // 화면을 채우도록 flex: 1 추가
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: scale * 12,
  },
  urgencyBadge: {
    paddingVertical: scale * 4,
    paddingHorizontal: scale * 10,
    borderRadius: scale * 20,
  },
  // 긴급도 '경보' 스타일
  urgencyWarning: {
    backgroundColor: '#FFDCDC', // 연한 빨강
  },
  // 긴급도 '주의' 스타일
  urgencyCaution: {
    backgroundColor: '#FFF5CC', // 연한 노랑
  },
  // 긴급도 '안전' 스타일
  urgencySafe: {
    backgroundColor: '#E6F4EA', // 연한 초록
  },
  urgencyText: {
    fontSize: scale * 13,
    fontFamily: 'Pretendard-Bold',
    color: '#222',
  },
  summaryText: {
    fontSize: scale * 15,
    fontFamily: 'Pretendard-Medium',
    color: '#444',
    lineHeight: scale * 22, // 줄 간격 설정으로 가독성 향상
  },
  ttsButton: {
    backgroundColor: '#007AFF', // 시선을 끄는 파란색 계열
    borderRadius: scale * 8,
    paddingVertical: scale * 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: scale * 16,
    flexDirection: 'row',
  },
  ttsButtonText: {
    fontSize: scale * 15,
    fontFamily: 'Pretendard-SemiBold',
    color: '#FFFFFF',
  },
  // --- 💡 [신규] 이용자(User) 전체 화면 스타일 ---
 fullScreen_container: {
  flex: 1,
  justifyContent: 'center',
  alignItems: 'center',
  paddingHorizontal: 30, // 좌우 여백
 },
 // '경보' 배경 (빨강)
 fullScreen_warningBg: {
  backgroundColor: '#FF4D4D',
 },
 // '주의' 배경 (주황/노랑)
 fullScreen_cautionBg: {
  backgroundColor: '#FFA500', 
 },
 // '안전' 배경 (초록)
 fullScreen_safeBg: {
  backgroundColor: '#28a745', 
 },
 // (User) 로딩 중일 때 배경 (안전과 동일)
 fullScreen_loadingContainer: {
  flex: 1,
  justifyContent: 'center',
  alignItems: 'center',
  backgroundColor: '#E6F4EA', // 기존 '안전' 카드 배경색
 },
 // (User) 긴급도 텍스트 (예: "경보")
 fullScreen_urgencyText: {
  color: '#fff',
  fontSize: scale * 32,
  fontFamily: 'VITRO CORE OTF', // 폰트 일관성
  marginBottom: scale * 12,
  textAlign: 'center',
 },
 // (User) 요약 텍스트
 fullScreen_summaryText: {
  color: '#fff',
  fontSize: scale * 20, // 카드보다 크게
 fontFamily: 'VITRO PRIDE OTF', // 폰트 일관성
  lineHeight: scale * 30, // 줄 간격
  textAlign: 'center',
 },
});

export default styles;