import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
  Image,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/types';
import { AuthService } from '../../data/services/auth_service';
import { SetupBiometricUseCase, GetBiometricInfoUseCase } from '../../domain/usecases/auth_usecases';

type BiometricPromptScreenNavigationProp = StackNavigationProp<RootStackParamList, 'BiometricPrompt'>;

interface Props {
  navigation: BiometricPromptScreenNavigationProp;
}

export const BiometricPromptScreen: React.FC<Props> = ({ navigation }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [biometricInfo, setBiometricInfo] = useState<{
    isAvailable: boolean;
    typeName: string;
  }>({ isAvailable: false, typeName: 'Sinh trắc học' });

  const authService = new AuthService();
  const setupBiometricUseCase = new SetupBiometricUseCase(authService);
  const getBiometricInfoUseCase = new GetBiometricInfoUseCase(authService);

  useEffect(() => {
    checkBiometricAvailability();
  }, []);

  const checkBiometricAvailability = async () => {
    try {
      const info = await getBiometricInfoUseCase.execute();
      setBiometricInfo({
        isAvailable: info.isAvailable && info.isEnrolled,
        typeName: info.typeName,
      });
    } catch (error) {
      console.error('Check biometric availability error:', error);
    }
  };

  const handleEnableBiometric = async () => {
    setIsLoading(true);
    
    try {
      const result = await setupBiometricUseCase.execute(true);
      
      if (result.success) {
        Alert.alert(
          'Thành công',
          `${biometricInfo.typeName} đã được bật thành công!`,
          [{ text: 'OK', onPress: () => navigation.replace('MainTabs') }]
        );
      } else {
        Alert.alert('Lỗi', result.error || 'Không thể bật sinh trắc học');
      }
    } catch (error: any) {
      Alert.alert('Lỗi', 'Có lỗi xảy ra khi thiết lập sinh trắc học');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkip = () => {
    Alert.alert(
      'Xác nhận',
      'Bạn có thể bật sinh trắc học sau trong Cài đặt. Tiếp tục không bật?',
      [
        { text: 'Hủy', style: 'cancel' },
        { 
          text: 'Tiếp tục', 
          onPress: () => navigation.replace('MainTabs') 
        },
      ]
    );
  };

  const getBiometricIcon = () => {
    if (biometricInfo.typeName === 'Face ID') {
      return '🔐'; // Face ID icon
    } else if (biometricInfo.typeName === 'Vân tay') {
      return '👆'; // Fingerprint icon
    }
    return '🔒'; // Generic security icon
  };

  if (!biometricInfo.isAvailable) {
    // Hiển thị thông báo thiết bị không hỗ trợ sinh trắc học
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <View style={styles.iconContainer}>
            <Text style={styles.icon}>⚠️</Text>
          </View>
          
          <Text style={styles.title}>Sinh trắc học không khả dụng</Text>
          <Text style={styles.subtitle}>
            Thiết bị này không hỗ trợ sinh trắc học hoặc chưa được thiết lập.
            Bạn có thể bật tính năng này sau trong Cài đặt.
          </Text>
          
          <View style={styles.buttonContainer}>
            <TouchableOpacity 
              style={styles.primaryButton} 
              onPress={() => navigation.replace('MainTabs')}
            >
              <Text style={styles.primaryButtonText}>Tiếp tục</Text>
            </TouchableOpacity>
          </View>
          
          <Text style={styles.note}>
            💡 Để sử dụng sinh trắc học, hãy thiết lập vân tay hoặc Face ID trong Cài đặt thiết bị
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Text style={styles.icon}>{getBiometricIcon()}</Text>
        </View>

        <Text style={styles.title}>
          Bật {biometricInfo.typeName}?
        </Text>
        
        <Text style={styles.subtitle}>
          Bạn có muốn bật xác thực bằng {biometricInfo.typeName} để đăng nhập nhanh hơn không?
        </Text>

        <View style={styles.benefitsList}>
          <View style={styles.benefitItem}>
            <Text style={styles.benefitIcon}>✅</Text>
            <Text style={styles.benefitText}>Đăng nhập nhanh và an toàn</Text>
          </View>
          <View style={styles.benefitItem}>
            <Text style={styles.benefitIcon}>🔒</Text>
            <Text style={styles.benefitText}>Bảo mật cao với sinh trắc học</Text>
          </View>
          <View style={styles.benefitItem}>
            <Text style={styles.benefitIcon}>⚡</Text>
            <Text style={styles.benefitText}>Không cần nhớ mã PIN</Text>
          </View>
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.enableButton, isLoading && styles.buttonDisabled]}
            onPress={handleEnableBiometric}
            disabled={isLoading}
          >
            <Text style={styles.enableButtonText}>
              {isLoading ? 'Đang thiết lập...' : `Bật ${biometricInfo.typeName}`}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.skipButton}
            onPress={handleSkip}
            disabled={isLoading}
          >
            <Text style={styles.skipButtonText}>Để sau</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.note}>
          Bạn có thể thay đổi cài đặt này bất kỳ lúc nào trong phần Cài đặt
        </Text>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 30,
  },
  icon: {
    fontSize: 48,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 40,
  },
  benefitsList: {
    alignSelf: 'stretch',
    marginBottom: 40,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 20,
  },
  benefitIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  benefitText: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  buttonContainer: {
    alignSelf: 'stretch',
    marginBottom: 20,
  },
  enableButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  enableButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  skipButton: {
    backgroundColor: 'transparent',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  skipButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '500',
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  note: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    lineHeight: 18,
  },
  primaryButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
});
