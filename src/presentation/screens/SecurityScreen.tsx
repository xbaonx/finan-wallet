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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/types';
import { AuthService } from '../../data/services/auth_service';
import { GetBiometricInfoUseCase, SetupBiometricUseCase } from '../../domain/usecases/auth_usecases';

type SecurityScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Security'>;

interface Props {
  navigation: SecurityScreenNavigationProp;
}

export const SecurityScreen: React.FC<Props> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
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
    icon: string,
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
          <Text style={styles.settingIconText}>{icon}</Text>
        </View>
        <View style={styles.settingInfo}>
          <Text style={styles.settingTitle}>{title}</Text>
          <Text style={styles.settingSubtitle}>{subtitle}</Text>
        </View>
      </View>
      {rightComponent || <Text style={styles.settingArrow}>›</Text>}
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
          <TouchableOpacity
            style={[styles.backButton, { top: Math.max(insets.top + 20, 40) }]}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>‹ Quay lại</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Bảo mật</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Xác thực</Text>
          
          {renderSettingItem(
            'Đổi mã PIN',
            'Thay đổi mã PIN hiện tại',
            handleChangePIN,
            '🔢'
          )}

          {renderSettingItem(
            biometricType,
            biometricAvailable 
              ? (biometricEnabled ? 'Đã bật' : 'Đã tắt')
              : 'Không khả dụng',
            () => {},
            '👆',
            <Switch
              value={biometricEnabled}
              onValueChange={handleToggleBiometric}
              disabled={!biometricAvailable || isLoading}
              trackColor={{ false: '#E5E5E5', true: '#007AFF' }}
              thumbColor={biometricEnabled ? '#FFFFFF' : '#FFFFFF'}
            />
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tuân thủ</Text>
          
          {renderSettingItem(
            'KYC - Xác minh danh tính',
            'Sắp ra mắt - Tăng cường bảo mật',
            handleKYC,
            '🆔'
          )}
        </View>

        <View style={styles.infoSection}>
          <Text style={styles.infoText}>
            💡 Mẹo bảo mật: Luôn bật sinh trắc học để bảo vệ ví của bạn tốt hơn.
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
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    position: 'relative',
  },
  backButton: {
    position: 'absolute',
    left: 20,
    top: 20,
    zIndex: 1,
  },
  backButtonText: {
    fontSize: 18,
    color: '#007AFF',
    fontWeight: '500',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1a1a1a',
    textAlign: 'center',
    marginTop: 10,
  },
  section: {
    marginTop: 30,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666666',
    marginBottom: 15,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
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
    backgroundColor: '#e3f2fd',
    alignItems: 'center',
    justifyContent: 'center',
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
    color: '#1a1a1a',
    marginBottom: 2,
  },
  settingSubtitle: {
    fontSize: 14,
    color: '#666666',
  },
  settingArrow: {
    fontSize: 20,
    color: '#cccccc',
    fontWeight: '300',
  },
  infoSection: {
    marginTop: 30,
    paddingHorizontal: 20,
  },
  infoText: {
    fontSize: 14,
    color: '#666666',
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
    lineHeight: 20,
  },
});
