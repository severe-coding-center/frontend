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
    fontWeight: 'bold',
    marginBottom: 10,
  },
  description: {
    fontSize: 14,
    color: '#444',
  },
});