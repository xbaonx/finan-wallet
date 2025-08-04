import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Alert,
  Vibration,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/types';
import { AuthService } from '../../data/services/auth_service';
import { ChangePinUseCase } from '../../domain/usecases/auth_usecases';

type ChangePinScreenNavigationProp = StackNavigationProp<RootStackParamList, 'ChangePin'>;

interface Props {
  navigation: ChangePinScreenNavigationProp;
}

type Step = 'current' | 'new' | 'confirm';

export const ChangePinScreen: React.FC<Props> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState<Step>('current');
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [pinLength, setPinLength] = useState<4 | 6>(4);
  const [isLoading, setIsLoading] = useState(false);
  const [currentPinLength, setCurrentPinLength] = useState<4 | 6>(4);

  const authService = new AuthService();
  const changePinUseCase = new ChangePinUseCase(authService);

  useEffect(() => {
    loadCurrentPinLength();
  }, []);

  const loadCurrentPinLength = async () => {
    try {
      const savedPinLength = await authService.getPinLength();
      setCurrentPinLength(savedPinLength);
      setPinLength(savedPinLength); // Default new PIN length to current
    } catch (error) {
      console.error('Load PIN length error:', error);
    }
  };

  const handleNumberPress = (number: string) => {
    if (step === 'current') {
      if (currentPin.length < currentPinLength) {
        const newCurrentPin = currentPin + number;
        setCurrentPin(newCurrentPin);
        
        if (newCurrentPin.length === currentPinLength) {
          // Auto-proceed to next step
          setTimeout(() => {
            setStep('new');
          }, 100);
        }
      }
    } else if (step === 'new') {
      if (newPin.length < pinLength) {
        const newNewPin = newPin + number;
        setNewPin(newNewPin);
        
        if (newNewPin.length === pinLength) {
          // Auto-proceed to confirm step
          setTimeout(() => {
            setStep('confirm');
          }, 100);
        }
      }
    } else if (step === 'confirm') {
      if (confirmPin.length < pinLength) {
        const newConfirmPin = confirmPin + number;
        setConfirmPin(newConfirmPin);
        
        if (newConfirmPin.length === pinLength) {
          // Auto-submit when complete
          setTimeout(() => {
            handleChangePin(currentPin, newPin, newConfirmPin);
          }, 100);
        }
      }
    }
  };

  const handleDeletePress = () => {
    if (step === 'current') {
      setCurrentPin(prev => prev.slice(0, -1));
    } else if (step === 'new') {
      setNewPin(prev => prev.slice(0, -1));
    } else if (step === 'confirm') {
      setConfirmPin(prev => prev.slice(0, -1));
    }
  };

  const handleChangePin = async (current: string, newPinValue: string, confirmPinValue: string) => {
    setIsLoading(true);
    try {
      const result = await changePinUseCase.execute(current, newPinValue, confirmPinValue, pinLength);
      if (result.success) {
        Alert.alert(
          'Thành công',
          'Mã PIN đã được thay đổi thành công',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      } else {
        Alert.alert('Lỗi', result.error || 'Không thể thay đổi mã PIN');
        if (result.error?.includes('hiện tại không đúng')) {
          // Reset to current PIN step
          setStep('current');
          setCurrentPin('');
          setNewPin('');
          setConfirmPin('');
          Vibration.vibrate(500);
        } else if (result.error?.includes('không khớp')) {
          // Reset to new PIN step
          setStep('new');
          setNewPin('');
          setConfirmPin('');
          Vibration.vibrate(500);
        }
      }
    } catch (error) {
      Alert.alert('Lỗi', 'Có lỗi xảy ra khi thay đổi mã PIN');
    } finally {
      setIsLoading(false);
    }
  };

  const getCurrentPin = () => {
    switch (step) {
      case 'current': return currentPin;
      case 'new': return newPin;
      case 'confirm': return confirmPin;
      default: return '';
    }
  };

  const getTargetLength = () => {
    return step === 'current' ? currentPinLength : pinLength;
  };

  const getTitle = () => {
    switch (step) {
      case 'current': return 'Nhập mã PIN hiện tại';
      case 'new': return 'Nhập mã PIN mới';
      case 'confirm': return 'Xác nhận mã PIN mới';
      default: return '';
    }
  };

  const getSubtitle = () => {
    switch (step) {
      case 'current': return `Nhập ${currentPinLength} chữ số`;
      case 'new': return `Nhập ${pinLength} chữ số`;
      case 'confirm': return `Nhập lại ${pinLength} chữ số`;
      default: return '';
    }
  };

  const renderPinDots = () => {
    const targetLength = getTargetLength();
    const currentPinValue = getCurrentPin();
    
    return (
      <View style={styles.pinDotsContainer}>
        {Array.from({ length: targetLength }, (_, index) => (
          <View
            key={index}
            style={[
              styles.pinDot,
              index < currentPinValue.length && styles.pinDotFilled,
            ]}
          />
        ))}
      </View>
    );
  };

  const renderPinLengthSelector = () => {
    if (step !== 'new') return null;

    return (
      <View style={styles.pinLengthContainer}>
        <Text style={styles.pinLengthLabel}>Độ dài mã PIN mới:</Text>
        <View style={styles.pinLengthOptions}>
          <TouchableOpacity
            style={[
              styles.pinLengthOption,
              pinLength === 4 && styles.pinLengthOptionSelected,
            ]}
            onPress={() => {
              setPinLength(4);
              setNewPin('');
            }}
          >
            <Text style={[
              styles.pinLengthOptionText,
              pinLength === 4 && styles.pinLengthOptionTextSelected,
            ]}>
              4 số
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.pinLengthOption,
              pinLength === 6 && styles.pinLengthOptionSelected,
            ]}
            onPress={() => {
              setPinLength(6);
              setNewPin('');
            }}
          >
            <Text style={[
              styles.pinLengthOptionText,
              pinLength === 6 && styles.pinLengthOptionTextSelected,
            ]}>
              6 số
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderNumberPad = () => {
    const numbers = [
      ['1', '2', '3'],
      ['4', '5', '6'],
      ['7', '8', '9'],
      ['', '0', '⌫'],
    ];

    return (
      <View style={styles.numberPad}>
        {numbers.map((row, rowIndex) => (
          <View key={rowIndex} style={styles.numberRow}>
            {row.map((number, colIndex) => (
              <TouchableOpacity
                key={colIndex}
                style={[
                  styles.numberButton,
                  number === '' && styles.numberButtonEmpty,
                ]}
                onPress={() => {
                  if (number === '⌫') {
                    handleDeletePress();
                  } else if (number !== '') {
                    handleNumberPress(number);
                  }
                }}
                disabled={number === '' || isLoading}
              >
                <Text style={styles.numberButtonText}>{number}</Text>
              </TouchableOpacity>
            ))}
          </View>
        ))}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: Math.max(insets.top + 20, 40) }]}>
        <TouchableOpacity
          style={[styles.backButton, { top: Math.max(insets.top + 20, 40) }]}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>‹ Quay lại</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Đổi mã PIN</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.pinSection}>
          <Text style={styles.pinTitle}>{getTitle()}</Text>
          <Text style={styles.pinSubtitle}>{getSubtitle()}</Text>
          
          {renderPinDots()}
          {renderPinLengthSelector()}
        </View>

        {renderNumberPad()}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
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
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  pinSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 50,
  },
  pinTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#1a1a1a',
    textAlign: 'center',
    marginBottom: 8,
  },
  pinSubtitle: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    marginBottom: 40,
  },
  pinDotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 30,
  },
  pinDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#E5E5E5',
    marginHorizontal: 8,
  },
  pinDotFilled: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  pinLengthContainer: {
    alignItems: 'center',
    marginTop: 20,
  },
  pinLengthLabel: {
    fontSize: 16,
    color: '#666666',
    marginBottom: 15,
  },
  pinLengthOptions: {
    flexDirection: 'row',
    gap: 15,
  },
  pinLengthOption: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    backgroundColor: '#F8F9FA',
  },
  pinLengthOptionSelected: {
    borderColor: '#007AFF',
    backgroundColor: '#007AFF',
  },
  pinLengthOptionText: {
    fontSize: 14,
    color: '#666666',
    fontWeight: '500',
  },
  pinLengthOptionTextSelected: {
    color: '#FFFFFF',
  },
  numberPad: {
    paddingBottom: 30,
  },
  numberRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  numberButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#F8F9FA',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  numberButtonEmpty: {
    backgroundColor: 'transparent',
    borderColor: 'transparent',
  },
  numberButtonText: {
    fontSize: 24,
    fontWeight: '600',
    color: '#1a1a1a',
  },
});
