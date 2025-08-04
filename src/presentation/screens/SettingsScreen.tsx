import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { CompositeNavigationProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { TabParamList, RootStackParamList } from '../navigation/types';
import { ServiceLocator } from '../../core/di/service_locator';
import { LogoutWalletUseCase } from '../../domain/usecases/wallet_usecases';
import { CacheService } from '../../data/services/cache_service';

type SettingsScreenNavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<TabParamList, 'Settings'>,
  StackNavigationProp<RootStackParamList>
>;

interface Props {
  navigation: SettingsScreenNavigationProp;
}

export const SettingsScreen: React.FC<Props> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const handleBackupWallet = () => {
    Alert.alert('Thông báo', 'Tính năng sao lưu ví sẽ được thêm trong phiên bản tiếp theo');
  };

  const handleSecurity = () => {
    navigation.navigate('Security');
  };

  const handleSupport = () => {
    Alert.alert('Hỗ trợ', 'Liên hệ: support@finan.vn');
  };

  const handleLogoutWallet = () => {
    Alert.alert(
      'Đăng xuất ví',
      'Bạn có chắc chắn muốn đăng xuất ví? Hãy đảm bảo bạn đã sao lưu cụm từ khôi phục trước khi tiếp tục.',
      [
        {
          text: 'Hủy',
          style: 'cancel',
        },
        {
          text: 'Đăng xuất',
          style: 'destructive',
          onPress: async () => {
            try {
              const logoutWalletUseCase = ServiceLocator.get<LogoutWalletUseCase>('LogoutWalletUseCase');
              await logoutWalletUseCase.execute();
              
              // Clear cache when logging out
              const cacheService = CacheService.getInstance();
              cacheService.clearCache();
              
              Alert.alert('Thành công', 'Đã đăng xuất ví thành công', [
                {
                  text: 'OK',
                  onPress: () => {
                    // Navigate to welcome screen
                    navigation.reset({
                      index: 0,
                      routes: [{ name: 'Welcome' as any }],
                    });
                  },
                },
              ]);
            } catch (error) {
              Alert.alert('Lỗi', `Không thể đăng xuất ví: ${error}`);
            }
          },
        },
      ]
    );
  };

  const renderSettingItem = (title: string, subtitle: string, onPress: () => void, icon: string) => (
    <TouchableOpacity
      style={styles.settingItem}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={styles.settingLeft}>
        <View style={styles.settingIcon}>
          <Text style={styles.settingIconText}>{icon}</Text>
        </View>
        <View style={styles.settingInfo}>
          <Text style={styles.settingTitle}>{title}</Text>
          <Text style={styles.settingSubtitle}>{subtitle}</Text>
        </View>
      </View>
      <Text style={styles.settingArrow}>›</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        style={styles.scrollView} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 20) }}
      >
        <View style={[styles.header, { paddingTop: Math.max(insets.top, 20) }]}>
          <Text style={styles.title}>Cài đặt</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Bảo mật</Text>
          {renderSettingItem(
            'Sao lưu ví',
            'Sao lưu cụm từ khôi phục',
            handleBackupWallet,
            '🔐'
          )}
          {renderSettingItem(
            'Bảo mật sinh trắc học',
            'Mở khóa bằng vân tay/Face ID',
            handleSecurity,
            '👆'
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Hỗ trợ</Text>
          {renderSettingItem(
            'Trung tâm hỗ trợ',
            'Câu hỏi thường gặp và hướng dẫn',
            handleSupport,
            '❓'
          )}
          {renderSettingItem(
            'Liên hệ',
            'Gửi phản hồi cho chúng tôi',
            handleSupport,
            '📧'
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quản lý ví</Text>
          <TouchableOpacity
            style={[styles.settingItem, styles.dangerItem]}
            onPress={handleLogoutWallet}
            activeOpacity={0.8}
          >
            <View style={styles.settingLeft}>
              <View style={[styles.settingIcon, styles.dangerIcon]}>
                <Text style={styles.settingIconText}>🚪</Text>
              </View>
              <View style={styles.settingInfo}>
                <Text style={[styles.settingTitle, styles.dangerText]}>Đăng xuất ví</Text>
                <Text style={styles.settingSubtitle}>Xóa ví khỏi thiết bị này</Text>
              </View>
            </View>
            <Text style={[styles.settingArrow, styles.dangerText]}>›</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Thông tin</Text>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Phiên bản</Text>
            <Text style={styles.infoValue}>1.0.0</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Mạng</Text>
            <Text style={styles.infoValue}>Ethereum Mainnet</Text>
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Finan - Ví tiền mã hóa an toàn cho người Việt
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 16,
    marginHorizontal: 24,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  settingIconText: {
    fontSize: 18,
  },
  settingInfo: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 2,
  },
  settingSubtitle: {
    fontSize: 14,
    color: '#6b7280',
  },
  settingArrow: {
    fontSize: 20,
    color: '#9ca3af',
  },
  infoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  infoLabel: {
    fontSize: 16,
    color: '#374151',
  },
  infoValue: {
    fontSize: 16,
    color: '#6b7280',
    fontWeight: '500',
  },
  footer: {
    paddingHorizontal: 24,
    paddingVertical: 32,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
  },
  // Danger styles for logout wallet
  dangerItem: {
    borderBottomColor: '#fef2f2',
  },
  dangerIcon: {
    backgroundColor: '#fef2f2',
  },
  dangerText: {
    color: '#dc2626',
  },
});
