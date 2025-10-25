import { StyleSheet, Dimensions } from 'react-native';

const { width } = Dimensions.get('window');
const scale = width / 360;

export default StyleSheet.create({
  container: {
    width: '95%', // 너비를 비율로 설정하여 유연하게
    flex: 1, // 남은 공간을 채우도록 flex: 1 추가
    maxHeight: scale * 350,
    backgroundColor: '#fdf3d5',
    borderColor: '#000',
    borderWidth: 0.5,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
    alignSelf: 'center',
    marginVertical: 12,
    padding: 16,
  },
  title: {
    fontSize: 16,
    fontFamily: 'VITRO CORE OTF',
  },
  description: {
    fontSize: 14,
    color: '#444',
  },
  // 👇 추가: 에러 발생 시 텍스트 스타일
  errorText: {
    fontSize: 14,
    color: '#D32F2F', // 가독성 좋은 어두운 빨간색
    fontWeight: '500',
  },
  logListContainer: {
    marginTop: 8,
    flex: 1,
  },
  logEntry: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#f0e5c0', // 박스 배경색보다 약간 어두운 색
  },
  logTime: {
    fontSize: 14,
    color: '#555',
  },
  logEvent: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  headerContainer: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: 4, // 제목과 컨텐츠 목록 사이의 간격
},
reloadButton: {
  padding: 4, // 아이콘 주변의 터치 영역을 확보
},
});