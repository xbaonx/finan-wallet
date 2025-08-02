import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { TabParamList } from '../navigation/types';

type SwapScreenNavigationProp = BottomTabNavigationProp<TabParamList, 'Swap'>;

interface Props {
  navigation: SwapScreenNavigationProp;
}

export const SwapScreen: React.FC<Props> = ({ navigation }) => {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Text style={styles.icon}>⇄</Text>
        </View>
        <Text style={styles.title}>Mua/Bán Token</Text>
        <Text style={styles.subtitle}>
          Tính năng swap token sẽ được triển khai trong phần 3 với 1inch Fusion SDK
        </Text>
        <View style={styles.featureList}>
          <Text style={styles.featureItem}>• Swap giữa các token ERC-20</Text>
          <Text style={styles.featureItem}>• Tỷ giá tốt nhất từ nhiều DEX</Text>
          <Text style={styles.featureItem}>• Phí giao dịch thấp</Text>
          <Text style={styles.featureItem}>• Giao diện đơn giản, dễ sử dụng</Text>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  icon: {
    fontSize: 32,
    color: '#6b7280',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  featureList: {
    alignSelf: 'stretch',
  },
  featureItem: {
    fontSize: 16,
    color: '#374151',
    marginBottom: 8,
    lineHeight: 24,
  },
});
