import React, { useState } from 'react';
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
import { SetupPinUseCase } from '../../domain/usecases/auth_usecases';
import { LogoComponent } from '../components/LogoComponent';

type SetupPinScreenNavigationProp = StackNavigationProp<RootStackParamList, 'SetupPin'>;

interface Props {
  navigation: SetupPinScreenNavigationProp;
}

export const SetupPinScreen: React.FC<Props> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const styles = createStyles(colors);
  const [step, setStep] = useState<'first' | 'confirm'>('first');
  const [firstPin, setFirstPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [pinLength, setPinLength] = useState<4 | 6>(6); // Mặc định 6 số

  const authService = new AuthService();
  const setupPinUseCase = new SetupPinUseCase(authService);

  const currentPin = step === 'first' ? firstPin : confirmPin;

  const handleNumberPress = (number: string) => {
    if (step === 'first') {
      if (firstPin.length < pinLength) {
        const newPin = firstPin + number;
        setFirstPin(newPin);
        
        // Auto-submit khi nhập đủ số PIN
        if (newPin.length === pinLength) {
          setTimeout(() => {
            handleContinueWithPin(newPin);
          }, 100);
        }
      }
    } else {
      if (confirmPin.length < pinLength) {
        const newPin = confirmPin + number;
        setConfirmPin(newPin);
        
        // Auto-submit khi nhập đủ số PIN
        if (newPin.length === pinLength) {
          setTimeout(() => {
            handleContinueWithPin(newPin);
          }, 100);
        }
      }
    }
  };

  const handleBackspace = () => {
    if (step === 'first') {
      setFirstPin(firstPin.slice(0, -1));
    } else {
      setConfirmPin(confirmPin.slice(0, -1));
    }
  };

  const handleContinueWithPin = async (pinValue: string) => {
    console.log('handleContinueWithPin called with:', { pinValue, pinLength, step });
    if (step === 'first') {
      if (pinValue.length !== pinLength) {
        console.log('PIN length validation failed:', pinValue.length, 'vs', pinLength);
        Alert.alert('Lỗi', `Mã PIN phải có đúng ${pinLength} chữ số`);
        return;
      }
      console.log('Setting firstPin and moving to confirm step');
      setFirstPin(pinValue);
      setConfirmPin(''); // Reset confirm PIN
      setStep('confirm');
    } else {
      // Confirm step
      console.log('Confirm step - executing with:', { firstPin, pinValue, pinLength });
      setIsLoading(true);
      setConfirmPin(pinValue);
      
      try {
        const result = await setupPinUseCase.execute(firstPin, pinValue, pinLength);
        console.log('SetupPinUseCase result:', result);
        
        if (result.success) {
          // Chuyển đến màn hình hỏi bật sinh trắc học
          navigation.replace('BiometricPrompt');
        } else {
          Alert.alert('Lỗi', result.error || 'Không thể thiết lập mã PIN');
          // Reset về bước đầu nếu PIN không khớp
          if (result.error?.includes('không khớp')) {
            setStep('first');
            setFirstPin('');
            setConfirmPin('');
            Vibration.vibrate(500);
          }
        }
      } catch (error: any) {
        Alert.alert('Lỗi', 'Có lỗi xảy ra khi thiết lập mã PIN');
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleContinue = async () => {
    await handleContinueWithPin(currentPin);
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
              index < currentPin.length && [styles.pinDotFilled, { backgroundColor: colors.primary, borderColor: colors.primary }],
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
                    disabled={currentPin.length === 0}
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
                  disabled={currentPin.length >= pinLength}
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

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <LogoComponent size="small" style={{ marginRight: 8 }} />
          <Text style={[styles.title, { color: colors.text }]}>
            {step === 'first' ? 'Thiết lập mã PIN' : 'Xác nhận mã PIN'}
          </Text>
        </View>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          {step === 'first' 
            ? 'Tạo mã PIN để bảo vệ ví của bạn'
            : 'Nhập lại mã PIN để xác nhận'
          }
        </Text>
        
        {step === 'first' && (
          <TouchableOpacity
            style={styles.pinLengthOption}
            onPress={() => setPinLength(pinLength === 4 ? 6 : 4)}
            activeOpacity={0.7}
          >
            <View style={[styles.checkbox, { borderColor: colors.primary }]}>
              {pinLength === 4 && <MaterialIcons name="check" size={16} color={colors.primary} />}
            </View>
            <Text style={[styles.optionText, { color: colors.text }]}>Sử dụng PIN 4 số</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.content}>
        {renderPinDots()}
        {renderNumberPad()}
        
        {/* Đã ẩn nút xác nhận vì có auto-submit khi nhập đủ PIN */}
      </View>

      {step === 'confirm' && (
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => {
            setStep('first');
            setConfirmPin('');
          }}
          activeOpacity={0.8}
        >
          <MaterialIcons name="arrow-back" size={24} color={colors.primary} />
        </TouchableOpacity>
      )}
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
  continueButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 20,
  },
  continueButtonDisabled: {
    backgroundColor: colors.border,
  },
  continueButtonText: {
    color: colors.surface,
    fontSize: 18,
    fontWeight: '600',
  },
  backButton: {
    position: 'absolute',
    top: 60,
    left: 24,
    zIndex: 1,
  },
  pinLengthOption: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    paddingHorizontal: 20,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: colors.primary,
    borderRadius: 4,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  optionText: {
    fontSize: 16,
    color: colors.text,
    fontWeight: '500',
  },
});
