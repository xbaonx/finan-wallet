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
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/types';
import { useThemeColors } from '../../core/theme';
import { AuthService } from '../../data/services/auth_service';
import { 
  AuthenticateUseCase, 
  GetBiometricInfoUseCase 
} from '../../domain/usecases/auth_usecases';
import { LogoComponent } from '../components/LogoComponent';

type LoginScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Login'>;

interface Props {
  navigation: LoginScreenNavigationProp;
}

export const LoginScreen: React.FC<Props> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const styles = createStyles(colors);
  const [pin, setPin] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [pinLength, setPinLength] = useState<4 | 6>(6); // Mặc định 6 số
  const [biometricInfo, setBiometricInfo] = useState<{
    isEnabled: boolean;
    isAvailable: boolean;
    typeName: string;
  }>({ isEnabled: false, isAvailable: false, typeName: 'Sinh trắc học' });

  const authService = new AuthService();
  const authenticateUseCase = new AuthenticateUseCase(authService);
  const getBiometricInfoUseCase = new GetBiometricInfoUseCase(authService);

  useEffect(() => {
    initializeAuth();
  }, []);

  const initializeAuth = async () => {
    try {
      console.log('Initializing auth...');
      // Lấy thông tin PIN length đã được thiết lập
      const savedPinLength = await authService.getPinLength();
      console.log('Saved PIN length:', savedPinLength);
      setPinLength(savedPinLength);
      
      console.log('Checking biometric info...');
      await checkBiometricInfo();
      console.log('Biometric info checked, scheduling auto biometric auth...');
      // Tự động thử xác thực bằng sinh trắc học nếu được bật
      setTimeout(() => {
        console.log('Auto biometric auth timeout triggered');
        tryBiometricAuth();
      }, 500);
    } catch (error) {
      console.error('Initialize auth error:', error);
    }
  };

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
    console.log('tryBiometricAuth called with biometricInfo:', biometricInfo);
    
    // Kiểm tra lại biometric info trực tiếp từ service
    try {
      const freshBiometricInfo = await getBiometricInfoUseCase.execute();
      console.log('Fresh biometric info:', freshBiometricInfo);
      
      // Chỉ cần hardware available và enrolled là đủ, không cần check isEnabled
      if (freshBiometricInfo.isAvailable && freshBiometricInfo.isEnrolled) {
        console.log('Starting biometric authentication...');
        const result = await authenticateUseCase.executeWithBiometric();
        console.log('Biometric auth result:', result);
        if (result.success) {
          console.log('Biometric auth successful, navigating to MainTabs');
          navigation.replace('MainTabs');
        } else {
          console.log('Biometric auth failed, fallback to PIN');
        }
      } else {
        console.log('Biometric not available or not enrolled:', {
          isAvailable: freshBiometricInfo.isAvailable,
          isEnrolled: freshBiometricInfo.isEnrolled,
          isEnabled: freshBiometricInfo.isEnabled
        });
      }
    } catch (error) {
      console.error('Auto biometric auth error:', error);
    }
  };

  const handleNumberPress = (number: string) => {
    if (pin.length < pinLength) {
      const newPin = pin + number;
      setPin(newPin);
      
      // Auto-submit khi nhập đủ số PIN
      if (newPin.length === pinLength) {
        setTimeout(() => {
          submitPinWithValue(newPin);
        }, 100); // Delay nhỏ để UI cập nhật
      }
    }
  };

  const handleBackspace = () => {
    setPin(pin.slice(0, -1));
  };

  const submitPinWithValue = async (pinValue: string) => {
    if (pinValue.length < pinLength) {
      Alert.alert('Lỗi', `Vui lòng nhập đầy đủ ${pinLength} số PIN`);
      return;
    }

    setIsLoading(true);

    try {
      const result = await authenticateUseCase.executeWithPin(pinValue);
      
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

  const handlePinSubmit = async () => {
    await submitPinWithValue(pin);
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
        {[...Array(pinLength)].map((_, index) => (
          <View
            key={index}
            style={[
              styles.pinDot,
              { borderColor: colors.border },
              index < pin.length && [styles.pinDotFilled, { backgroundColor: colors.primary, borderColor: colors.primary }],
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
                    style={[styles.numberButton, { backgroundColor: colors.surface }]}
                    onPress={handleBackspace}
                    disabled={pin.length === 0 || isLoading}
                  >
                    <MaterialIcons name="backspace" size={24} color={colors.textSecondary} />
                  </TouchableOpacity>
                );
              }

              return (
                <TouchableOpacity
                  key={itemIndex}
                  style={[styles.numberButton, { backgroundColor: colors.surface }]}
                  onPress={() => handleNumberPress(item)}
                  disabled={pin.length >= pinLength || isLoading}
                >
                  <Text style={[styles.numberText, { color: colors.text }]}>{item}</Text>
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
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <LogoComponent size="small" style={{ marginRight: 8 }} />
          <Text style={[styles.title, { color: colors.text }]}>Mở khóa Finan</Text>
        </View>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Nhập mã PIN để truy cập ví của bạn
        </Text>
      </View>

      <View style={styles.content}>
        {renderPinDots()}
        {renderNumberPad()}
        
        {/* Đã ẩn nút mở khóa vì có auto-submit khi nhập đủ PIN */}

        {biometricInfo.isEnabled && biometricInfo.isAvailable && (
          <View style={styles.biometricSection}>
            <View style={styles.divider}>
              <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
              <Text style={[styles.dividerText, { color: colors.textSecondary }]}>hoặc</Text>
              <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
            </View>

            <TouchableOpacity
              style={[styles.biometricButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={handleBiometricAuth}
              disabled={isLoading}
            >
              <Text style={styles.biometricIcon}>{getBiometricIcon()}</Text>
              <Text style={[styles.biometricText, { color: colors.text }]}>
                Sử dụng {biometricInfo.typeName}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <View style={styles.footer}>
        <Text style={[styles.footerText, { color: colors.textSecondary }]}>
          Finan Wallet - Bảo mật với mã PIN và sinh trắc học
        </Text>
      </View>
    </SafeAreaView>
  );
};

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: 24,
    paddingBottom: 20,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
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
    borderColor: colors.border,
    marginHorizontal: 8,
  },
  pinDotFilled: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  numberPad: {
    alignItems: 'center',
    marginBottom: 40,
  },
  numberRow: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  numberButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 15,
    borderWidth: 1,
    borderColor: colors.border,
  },
  numberText: {
    fontSize: 24,
    fontWeight: '600',
    color: colors.text,
  },
  submitButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 20,
  },
  submitButtonDisabled: {
    backgroundColor: colors.border,
  },
  submitButtonText: {
    color: colors.surface,
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
    backgroundColor: colors.border,
  },
  dividerText: {
    marginHorizontal: 15,
    fontSize: 14,
    color: colors.textSecondary,
  },
  biometricButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  biometricIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  biometricText: {
    fontSize: 16,
    color: colors.text,
    fontWeight: '500',
  },
  footer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
