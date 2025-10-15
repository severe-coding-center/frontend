import React from 'react';
import { View, Text, Image } from 'react-native';
import styles from '../style/HeaderStyle';

type HeaderProps = {
  title?: string;
};

const Header = ({ title = '홈' }: HeaderProps) => {
  return (
    <View style={styles.header}>
      <Image source={require('../image/Logo.png')} style={styles.logo} />
      <Text style={styles.headerTitle}>{title}</Text>
    </View>
  );
};

export default Header;
