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
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/types';
import { useThemeColors } from '../../core/theme';
import { AuthService } from '../../data/services/auth_service';
import { GetBiometricInfoUseCase, SetupBiometricUseCase } from '../../domain/usecases/auth_usecases';
import { LogoComponent } from '../components/LogoComponent';

type SecurityScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Security'>;

interface Props {
  navigation: SecurityScreenNavigationProp;
}

export const SecurityScreen: React.FC<Props> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const styles = createStyles(colors);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricType, setBiometricType] = useState('Sinh trắc học');
  const [isLoading, setIsLoading] = useState(false);

  const authService = new AuthService();
  const getBiometricInfoUseCase = new GetBiometricInfoUseCase(authService);
  const setupBiometricUseCase = new SetupBiometricUseCase(authService);

  useEffect(() => {
    loadBiometricInfo();
  }, []);

  const loadBiometricInfo = async () => {
    try {
      const biometricInfo = await getBiometricInfoUseCase.execute();
      setBiometricAvailable(biometricInfo.isAvailable && biometricInfo.isEnrolled);
      setBiometricEnabled(biometricInfo.isEnabled);
      setBiometricType(biometricInfo.typeName);
    } catch (error) {
      console.error('Load biometric info error:', error);
    }
  };

  const handleChangePIN = () => {
    Alert.alert(
      'Đổi mã PIN',
      'Bạn có chắc chắn muốn đổi mã PIN?',
      [
        { text: 'Hủy', style: 'cancel' },
        { 
          text: 'Đổi PIN', 
          onPress: () => {
            // Navigate to change PIN flow
            navigation.navigate('ChangePin');
          }
        }
      ]
    );
  };

  const handleToggleBiometric = async (value: boolean) => {
    if (!biometricAvailable) {
      Alert.alert(
        'Không khả dụng',
        'Thiết bị không hỗ trợ sinh trắc học hoặc chưa được thiết lập. Vui lòng thiết lập vân tay/Face ID trong Cài đặt thiết bị.'
      );
      return;
    }

    setIsLoading(true);
    try {
      const result = await setupBiometricUseCase.execute(value);
      if (result.success) {
        setBiometricEnabled(value);
        Alert.alert(
          'Thành công',
          value 
            ? `${biometricType} đã được bật thành công`
            : `${biometricType} đã được tắt`
        );
      } else {
        Alert.alert('Lỗi', result.error || 'Không thể thay đổi cài đặt sinh trắc học');
      }
    } catch (error) {
      console.error('Toggle biometric error:', error);
      Alert.alert('Lỗi', 'Có lỗi xảy ra khi thay đổi cài đặt');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKYC = () => {
    Alert.alert(
      'KYC - Xác minh danh tính',
      'Tính năng KYC sẽ được ra mắt trong phiên bản tiếp theo để tăng cường bảo mật và tuân thủ quy định.',
      [{ text: 'Đã hiểu' }]
    );
  };

  const renderSettingItem = (
    title: string, 
    subtitle: string, 
    onPress: () => void, 
    iconName: string,
    rightComponent?: React.ReactNode
  ) => (
    <TouchableOpacity
      style={styles.settingItem}
      onPress={onPress}
      activeOpacity={rightComponent ? 1 : 0.8}
      disabled={!!rightComponent}
    >
      <View style={styles.settingLeft}>
        <View style={styles.settingIcon}>
          <MaterialIcons name={iconName as any} size={24} color={colors.primary} />
        </View>
        <View style={styles.settingInfo}>
          <Text style={[styles.settingTitle, { color: colors.text }]}>{title}</Text>
          <Text style={[styles.settingSubtitle, { color: colors.textSecondary }]}>{subtitle}</Text>
        </View>
      </View>
      {rightComponent || <MaterialIcons name="chevron-right" size={20} color={colors.textSecondary} />}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView 
        style={[styles.scrollView, { backgroundColor: colors.background }]} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 20) }}
      >
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            activeOpacity={0.8}
          >
            <MaterialIcons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <LogoComponent size="small" style={{ marginRight: 8 }} />
            <Text style={[styles.title, { color: colors.text }]}>Bảo mật</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Xác thực</Text>
          
          {renderSettingItem(
            'Đổi mã PIN',
            'Thay đổi mã PIN hiện tại',
            handleChangePIN,
            'pin'
          )}

          {renderSettingItem(
            biometricType,
            biometricAvailable 
              ? (biometricEnabled ? 'Đã bật' : 'Đã tắt')
              : 'Không khả dụng',
            () => {},
            'fingerprint',
            <Switch
              value={biometricEnabled}
              onValueChange={handleToggleBiometric}
              disabled={!biometricAvailable || isLoading}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={colors.surface}
            />
          )}
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Tuân thủ</Text>
          
          {renderSettingItem(
            'KYC - Xác minh danh tính',
            'Sắp ra mắt - Tăng cường bảo mật',
            handleKYC,
            'verified-user'
          )}
        </View>

        <View style={styles.infoSection}>
          <Text style={[styles.infoText, { color: colors.textSecondary, backgroundColor: colors.surface, borderLeftColor: colors.primary }]}>
            💡 Mẹo bảo mật: Luôn bật sinh trắc học để bảo vệ ví của bạn tốt hơn.
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
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    marginRight: 16,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text,
  },
  section: {
    marginTop: 32,
    paddingHorizontal: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 16,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: colors.surface,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
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
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: colors.border,
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
  infoSection: {
    marginTop: 30,
    paddingHorizontal: 24,
  },
  infoText: {
    fontSize: 14,
    color: colors.textSecondary,
    backgroundColor: colors.surface,
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
    lineHeight: 20,
  },
});
