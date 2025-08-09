import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { TabParamList } from '../navigation/types';
import { useThemeColors } from '../../core/theme';

type HistoryScreenNavigationProp = BottomTabNavigationProp<TabParamList, 'History'>;

interface Props {
  navigation: HistoryScreenNavigationProp;
}

export const HistoryScreen: React.FC<Props> = ({ navigation }) => {
  const colors = useThemeColors();
  
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        <View style={[styles.iconContainer, { backgroundColor: colors.surfaceSecondary }]}>
          <Text style={styles.icon}>📋</Text>
        </View>
        <Text style={[styles.title, { color: colors.text }]}>Lịch sử giao dịch</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Theo dõi tất cả các giao dịch của bạn
        </Text>
        <View style={styles.featureList}>
          <Text style={[styles.featureItem, { color: colors.textSecondary }]}>• Lịch sử gửi và nhận token</Text>
          <Text style={[styles.featureItem, { color: colors.textSecondary }]}>• Chi tiết giao dịch đầy đủ</Text>
          <Text style={[styles.featureItem, { color: colors.textSecondary }]}>• Trạng thái giao dịch real-time</Text>
          <Text style={[styles.featureItem, { color: colors.textSecondary }]}>• Xuất báo cáo giao dịch</Text>
        </View>
        <Text style={[styles.comingSoon, { color: colors.primary }]}>Sắp ra mắt...</Text>
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
    marginBottom: 24,
  },
  featureItem: {
    fontSize: 16,
    color: '#374151',
    marginBottom: 8,
    lineHeight: 24,
  },
  comingSoon: {
    fontSize: 14,
    color: '#f59e0b',
    fontWeight: '600',
    backgroundColor: '#fef3c7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
});
