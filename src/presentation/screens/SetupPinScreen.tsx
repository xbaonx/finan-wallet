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
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/types';
import { AuthService } from '../../data/services/auth_service';
import { SetupPinUseCase } from '../../domain/usecases/auth_usecases';

type SetupPinScreenNavigationProp = StackNavigationProp<RootStackParamList, 'SetupPin'>;

interface Props {
  navigation: SetupPinScreenNavigationProp;
}

export const SetupPinScreen: React.FC<Props> = ({ navigation }) => {
  const [step, setStep] = useState<'first' | 'confirm'>('first');
  const [firstPin, setFirstPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const authService = new AuthService();
  const setupPinUseCase = new SetupPinUseCase(authService);

  const currentPin = step === 'first' ? firstPin : confirmPin;
  const setCurrentPin = step === 'first' ? setFirstPin : setConfirmPin;

  const handleNumberPress = (number: string) => {
    if (currentPin.length < 6) {
      setCurrentPin(currentPin + number);
    }
  };

  const handleBackspace = () => {
    setCurrentPin(currentPin.slice(0, -1));
  };

  const handleContinue = async () => {
    if (step === 'first') {
      if (currentPin.length < 4) {
        Alert.alert('Lỗi', 'Mã PIN phải có ít nhất 4 chữ số');
        return;
      }
      setStep('confirm');
    } else {
      // Confirm step
      setIsLoading(true);
      
      try {
        const result = await setupPinUseCase.execute(firstPin, confirmPin);
        
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

  const renderPinDots = () => {
    return (
      <View style={styles.pinDotsContainer}>
        {[...Array(6)].map((_, index) => (
          <View
            key={index}
            style={[
              styles.pinDot,
              index < currentPin.length && styles.pinDotFilled,
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
                    disabled={currentPin.length === 0}
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
                  disabled={currentPin.length >= 6}
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

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>
          {step === 'first' ? 'Thiết lập mã PIN' : 'Xác nhận mã PIN'}
        </Text>
        <Text style={styles.subtitle}>
          {step === 'first' 
            ? 'Tạo mã PIN từ 4-6 chữ số để bảo vệ ví của bạn'
            : 'Nhập lại mã PIN để xác nhận'
          }
        </Text>
      </View>

      <View style={styles.content}>
        {renderPinDots()}
        {renderNumberPad()}
        
        <TouchableOpacity
          style={[
            styles.continueButton,
            currentPin.length < 4 && styles.continueButtonDisabled,
            isLoading && styles.continueButtonDisabled,
          ]}
          onPress={handleContinue}
          disabled={currentPin.length < 4 || isLoading}
        >
          <Text style={styles.continueButtonText}>
            {isLoading ? 'Đang xử lý...' : 
             step === 'first' ? 'Tiếp tục' : 'Hoàn thành'}
          </Text>
        </TouchableOpacity>
      </View>

      {step === 'confirm' && (
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => {
            setStep('first');
            setConfirmPin('');
          }}
        >
          <Text style={styles.backButtonText}>← Quay lại</Text>
        </TouchableOpacity>
      )}
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
    paddingTop: 40,
    paddingBottom: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
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
    borderColor: '#ddd',
    marginHorizontal: 8,
  },
  pinDotFilled: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
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
  continueButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 20,
  },
  continueButtonDisabled: {
    backgroundColor: '#ccc',
  },
  continueButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  backButton: {
    position: 'absolute',
    top: 60,
    left: 20,
  },
  backButtonText: {
    fontSize: 16,
    color: '#007AFF',
  },
});
