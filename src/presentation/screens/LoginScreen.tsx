import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
  Vibration,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/types';
import { AuthService } from '../../data/services/auth_service';
import { 
  AuthenticateUseCase, 
  GetBiometricInfoUseCase 
} from '../../domain/usecases/auth_usecases';

type LoginScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Login'>;

interface Props {
  navigation: LoginScreenNavigationProp;
}

export const LoginScreen: React.FC<Props> = ({ navigation }) => {
  const [pin, setPin] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [biometricInfo, setBiometricInfo] = useState<{
    isEnabled: boolean;
    isAvailable: boolean;
    typeName: string;
  }>({ isEnabled: false, isAvailable: false, typeName: 'Sinh trắc học' });

  const authService = new AuthService();
  const authenticateUseCase = new AuthenticateUseCase(authService);
  const getBiometricInfoUseCase = new GetBiometricInfoUseCase(authService);

  useEffect(() => {
    checkBiometricInfo();
    // Tự động thử xác thực bằng sinh trắc học nếu được bật
    setTimeout(() => {
      tryBiometricAuth();
    }, 500);
  }, []);

  const checkBiometricInfo = async () => {
    try {
      const info = await getBiometricInfoUseCase.execute();
      setBiometricInfo({
        isEnabled: info.isEnabled,
        isAvailable: info.isAvailable && info.isEnrolled,
        typeName: info.typeName,
      });
    } catch (error) {
      console.error('Check biometric info error:', error);
    }
  };

  const tryBiometricAuth = async () => {
    if (biometricInfo.isEnabled && biometricInfo.isAvailable) {
      try {
        const result = await authenticateUseCase.executeWithBiometric();
        if (result.success) {
          navigation.replace('MainTabs');
        }
        // Nếu thất bại, không làm gì, để user nhập PIN
      } catch (error) {
        console.error('Auto biometric auth error:', error);
      }
    }
  };

  const handleNumberPress = (number: string) => {
    if (pin.length < 6) {
      setPin(pin + number);
    }
  };

  const handleBackspace = () => {
    setPin(pin.slice(0, -1));
  };

  const handlePinSubmit = async () => {
    if (pin.length < 4) {
      Alert.alert('Lỗi', 'Vui lòng nhập đầy đủ mã PIN');
      return;
    }

    setIsLoading(true);

    try {
      const result = await authenticateUseCase.executeWithPin(pin);
      
      if (result.success) {
        navigation.replace('MainTabs');
      } else {
        Alert.alert('Lỗi', result.error || 'Mã PIN không đúng');
        setPin('');
        Vibration.vibrate(500);
        
        // Nếu là lỗi xóa dữ liệu ví, chuyển về màn hình welcome
        if (result.error?.includes('Dữ liệu ví đã được xóa')) {
          setTimeout(() => {
            navigation.replace('Welcome');
          }, 2000);
        }
      }
    } catch (error: any) {
      Alert.alert('Lỗi', 'Có lỗi xảy ra khi xác thực');
      setPin('');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBiometricAuth = async () => {
    if (!biometricInfo.isEnabled || !biometricInfo.isAvailable) {
      return;
    }

    try {
      const result = await authenticateUseCase.executeWithBiometric();
      
      if (result.success) {
        navigation.replace('MainTabs');
      } else {
        // Nếu user chọn fallback hoặc thất bại, focus vào PIN input
        console.log('Biometric auth failed:', result.error);
      }
    } catch (error: any) {
      console.error('Biometric auth error:', error);
    }
  };

  const renderPinDots = () => {
    return (
      <View style={styles.pinDotsContainer}>
        {[...Array(6)].map((_, index) => (
          <View
            key={index}
            style={[
              styles.pinDot,
              index < pin.length && styles.pinDotFilled,
            ]}
          />
        ))}
      </View>
    );
  };

  const renderNumberPad = () => {
    const numbers = [
      ['1', '2', '3'],
      ['4', '5', '6'],
      ['7', '8', '9'],
      ['', '0', 'backspace'],
    ];

    return (
      <View style={styles.numberPad}>
        {numbers.map((row, rowIndex) => (
          <View key={rowIndex} style={styles.numberRow}>
            {row.map((item, itemIndex) => {
              if (item === '') {
                return <View key={itemIndex} style={styles.numberButton} />;
              }
              
              if (item === 'backspace') {
                return (
                  <TouchableOpacity
                    key={itemIndex}
                    style={styles.numberButton}
                    onPress={handleBackspace}
                    disabled={pin.length === 0 || isLoading}
                  >
                    <Text style={styles.backspaceText}>⌫</Text>
                  </TouchableOpacity>
                );
              }

              return (
                <TouchableOpacity
                  key={itemIndex}
                  style={styles.numberButton}
                  onPress={() => handleNumberPress(item)}
                  disabled={pin.length >= 6 || isLoading}
                >
                  <Text style={styles.numberText}>{item}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </View>
    );
  };

  const getBiometricIcon = () => {
    if (biometricInfo.typeName === 'Face ID') {
      return '🔐';
    } else if (biometricInfo.typeName === 'Vân tay') {
      return '👆';
    }
    return '🔒';
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Mở khóa Finan</Text>
        <Text style={styles.subtitle}>
          Nhập mã PIN để truy cập ví của bạn
        </Text>
      </View>

      <View style={styles.content}>
        {renderPinDots()}
        {renderNumberPad()}
        
        <TouchableOpacity
          style={[
            styles.submitButton,
            (pin.length < 4 || isLoading) && styles.submitButtonDisabled,
          ]}
          onPress={handlePinSubmit}
          disabled={pin.length < 4 || isLoading}
        >
          <Text style={styles.submitButtonText}>
            {isLoading ? 'Đang xác thực...' : 'Mở khóa'}
          </Text>
        </TouchableOpacity>

        {biometricInfo.isEnabled && biometricInfo.isAvailable && (
          <View style={styles.biometricSection}>
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>hoặc</Text>
              <View style={styles.dividerLine} />
            </View>

            <TouchableOpacity
              style={styles.biometricButton}
              onPress={handleBiometricAuth}
              disabled={isLoading}
            >
              <Text style={styles.biometricIcon}>{getBiometricIcon()}</Text>
              <Text style={styles.biometricText}>
                Sử dụng {biometricInfo.typeName}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Finan Wallet - Bảo mật với mã PIN và sinh trắc học
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
  header: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    justifyContent: 'center',
  },
  pinDotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 60,
  },
  pinDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#ddd',
    marginHorizontal: 8,
  },
  pinDotFilled: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  numberPad: {
    alignItems: 'center',
    marginBottom: 30,
  },
  numberRow: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  numberButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  numberText: {
    fontSize: 24,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  backspaceText: {
    fontSize: 24,
    color: '#666',
  },
  submitButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 20,
  },
  submitButtonDisabled: {
    backgroundColor: '#ccc',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  biometricSection: {
    alignItems: 'center',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    width: '100%',
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#ddd',
  },
  dividerText: {
    marginHorizontal: 15,
    fontSize: 14,
    color: '#999',
  },
  biometricButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  biometricIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  biometricText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  footer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
  },
});
