import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Alert,
  Switch,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { CompositeNavigationProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { TabParamList, RootStackParamList } from '../navigation/types';
import { ServiceLocator } from '../../core/di/service_locator';
import { LogoutWalletUseCase } from '../../domain/usecases/wallet_usecases';
import { CacheService } from '../../data/services/cache_service';
import { useThemeColors, useTheme } from '../../core/theme';
import { HybridBalanceService } from '../../data/services/hybrid_balance_service';
import { LogoComponent } from '../components/LogoComponent';

type SettingsScreenNavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<TabParamList, 'Settings'>,
  StackNavigationProp<RootStackParamList>
>;

interface Props {
  navigation: SettingsScreenNavigationProp;
}

export const SettingsScreen: React.FC<Props> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const { themeMode, setThemeMode } = useTheme();
  const styles = createStyles(colors);
  const handleBackupWallet = () => {
    Alert.alert('Thông báo', 'Tính năng sao lưu ví sẽ được thêm trong phiên bản tiếp theo');
  };

  const handleSecurity = () => {
    navigation.navigate('Security');
  };

  const [notificationsEnabled, setNotificationsEnabled] = useState(false);

  useEffect(() => {
    const loadNotificationSettings = async () => {
      try {
        const hybridService = HybridBalanceService.getInstance();
        const isEnabled = await hybridService.getNotificationSettings();
        setNotificationsEnabled(isEnabled.enabled);
      } catch (error) {
        console.log('Error loading notification settings:', error);
      }
    };
    loadNotificationSettings();
  }, []);

  const handleNotificationToggle = async (value: boolean) => {
    try {
      const hybridService = HybridBalanceService.getInstance();
      if (value) {
        await hybridService.enableNotifications();
      } else {
        await hybridService.disableNotifications();
      }
      setNotificationsEnabled(value);
    } catch (error) {
      console.log('Error toggling notifications:', error);
      Alert.alert('Lỗi', 'Không thể thay đổi cài đặt thông báo');
    }
  };

  const handleSupport = () => {
    Alert.alert('Hỗ trợ', 'Liên hệ: support@finan.vn');
  };

  const handleThemeToggle = () => {
    const nextTheme = themeMode === 'light' ? 'dark' : themeMode === 'dark' ? 'system' : 'light';
    setThemeMode(nextTheme);
  };

  const getThemeText = () => {
    switch (themeMode) {
      case 'light': return 'Sáng';
      case 'dark': return 'Tối';
      case 'system': return 'Theo hệ thống';
      default: return 'Sáng';
    }
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

  const renderSettingItem = (title: string, subtitle: string, onPress: () => void, iconName: string) => (
    <TouchableOpacity
      style={styles.settingItem}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={styles.settingLeft}>
        <View style={styles.settingIcon}>
          <MaterialIcons name={iconName as any} size={24} color={colors.primary} />
        </View>
        <View style={styles.settingInfo}>
          <Text style={styles.settingTitle}>{title}</Text>
          <Text style={styles.settingSubtitle}>{subtitle}</Text>
        </View>
      </View>
      <MaterialIcons name="chevron-right" size={20} color={colors.textSecondary} />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView 
        style={[styles.scrollView, { backgroundColor: colors.background }]} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 20) }}
      >
        <View style={[styles.header, { paddingTop: Math.max(insets.top, 20) }]}>
          <View style={styles.headerContent}>
            <LogoComponent size="medium" style={{ marginRight: 12 }} />
            <Text style={[styles.title, { color: colors.text }]}>Cài đặt</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Bảo mật</Text>
          {renderSettingItem(
            'Sao lưu ví',
            'Sao lưu cụm từ khôi phục',
            handleBackupWallet,
            'backup'
          )}
          {renderSettingItem(
            'Bảo mật sinh trắc học',
            'Mở khóa bằng vân tay/Face ID',
            handleSecurity,
            'fingerprint'
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Thông báo</Text>
          <View style={styles.settingItem}>
            <View style={styles.settingContent}>
              <MaterialIcons name="notifications" size={24} color={colors.primary} />
              <View style={styles.settingTextContainer}>
                <Text style={[styles.settingTitle, { color: colors.text }]}>Thông báo biến động số dư</Text>
                <Text style={[styles.settingSubtitle, { color: colors.textSecondary }]}>Nhận thông báo khi có giao dịch</Text>
              </View>
            </View>
            <Switch
              value={notificationsEnabled}
              onValueChange={handleNotificationToggle}
              trackColor={{ false: colors.border, true: colors.primary + '40' }}
              thumbColor={notificationsEnabled ? colors.primary : colors.textSecondary}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Giao diện</Text>
          {renderSettingItem(
            'Chế độ giao diện',
            `Hiện tại: ${getThemeText()}`,
            handleThemeToggle,
            'palette'
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Hỗ trợ</Text>
          {renderSettingItem(
            'Trung tâm hỗ trợ',
            'Câu hỏi thường gặp và hướng dẫn',
            handleSupport,
            'help'
          )}
          {renderSettingItem(
            'Liên hệ',
            'Gửi phản hồi cho chúng tôi',
            handleSupport,
            'email'
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
                <MaterialIcons name="logout" size={24} color="#dc2626" />
              </View>
              <View style={styles.settingInfo}>
                <Text style={[styles.settingTitle, styles.dangerText]}>Đăng xuất ví</Text>
                <Text style={styles.settingSubtitle}>Xóa ví khỏi thiết bị này</Text>
              </View>
            </View>
            <MaterialIcons name="chevron-right" size={20} color="#dc2626" />
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

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 16,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
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
    borderBottomColor: colors.border,
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
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  settingIconText: {
    fontSize: 18,
    color: colors.text,
  },
  settingInfo: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
  },
  settingSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  settingArrow: {
    fontSize: 20,
    color: colors.textSecondary,
  },
  settingContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingTextContainer: {
    flex: 1,
    marginLeft: 12,
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
    color: colors.text,
  },
  infoValue: {
    fontSize: 16,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  footer: {
    paddingHorizontal: 24,
    paddingVertical: 32,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    color: colors.textSecondary,
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
