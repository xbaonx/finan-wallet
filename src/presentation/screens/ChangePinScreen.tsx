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
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/types';
import { useThemeColors } from '../../core/theme';
import { AuthService } from '../../data/services/auth_service';
import { ChangePinUseCase } from '../../domain/usecases/auth_usecases';
import { LogoComponent } from '../components/LogoComponent';

type ChangePinScreenNavigationProp = StackNavigationProp<RootStackParamList, 'ChangePin'>;

interface Props {
  navigation: ChangePinScreenNavigationProp;
}

type Step = 'current' | 'new' | 'confirm';

export const ChangePinScreen: React.FC<Props> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const styles = createStyles(colors);
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
              { borderColor: colors.border },
              index < currentPinValue.length && [styles.pinDotFilled, { backgroundColor: colors.primary, borderColor: colors.primary }],
            ]}
          />
        ))}
      </View>
    );
  };

  const renderPinLengthSelector = () => {
    if (step !== 'new') return null;

    return (
      <TouchableOpacity
        style={styles.pinLengthOption}
        onPress={() => {
          const newLength = pinLength === 4 ? 6 : 4;
          setPinLength(newLength);
          setNewPin('');
        }}
        activeOpacity={0.7}
      >
        <View style={[styles.checkbox, { borderColor: colors.primary }]}>
          {pinLength === 4 && <MaterialIcons name="check" size={16} color={colors.primary} />}
        </View>
        <Text style={[styles.optionText, { color: colors.text }]}>Sử dụng PIN 4 số</Text>
      </TouchableOpacity>
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
                    onPress={handleDeletePress}
                    disabled={getCurrentPin().length === 0}
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
                  disabled={getCurrentPin().length >= getTargetLength()}
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
            {getTitle()}
          </Text>
        </View>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          {getSubtitle()}
        </Text>
        
        {renderPinLengthSelector()}
      </View>

      <View style={styles.content}>
        {renderPinDots()}
        {renderNumberPad()}
      </View>

      {step !== 'current' && (
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => {
            if (step === 'confirm') {
              setStep('new');
              setConfirmPin('');
            } else if (step === 'new') {
              setStep('current');
              setNewPin('');
              setConfirmPin('');
            }
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
  backButton: {
    position: 'absolute',
    top: 60,
    left: 24,
    zIndex: 1,
  },
});
