import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Alert,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/types';
import { WalletOnboardingBloc } from '../blocs/wallet_onboarding_bloc';
import { ImportWalletEvent } from '../blocs/wallet_onboarding_event';
import { WalletOnboardingState, WalletOnboardingLoading, WalletImportedState, WalletOnboardingError } from '../blocs/wallet_onboarding_state';
import { ServiceLocator } from '../../core/di/service_locator';

type ImportWalletScreenNavigationProp = StackNavigationProp<RootStackParamList, 'ImportWallet'>;

interface Props {
  navigation: ImportWalletScreenNavigationProp;
}

export const ImportWalletScreen: React.FC<Props> = ({ navigation }) => {
  const [walletName, setWalletName] = useState('Ví đã khôi phục');
  const [mnemonic, setMnemonic] = useState('');
  const [mnemonicWords, setMnemonicWords] = useState<string[]>(Array(12).fill(''));
  const [isLoading, setIsLoading] = useState(false);
  const [inputMode, setInputMode] = useState<'text' | 'grid'>('text');
  
  const [walletBloc, setWalletBloc] = useState<WalletOnboardingBloc | null>(null);

  useEffect(() => {
    // Initialize walletBloc from ServiceLocator
    try {
      const bloc = ServiceLocator.get('WalletOnboardingBloc') as WalletOnboardingBloc;
      setWalletBloc(bloc);
    } catch (error) {
      console.error('Failed to get WalletOnboardingBloc:', error);
      Alert.alert('Lỗi', 'Không thể khởi tạo ví. Vui lòng thử lại.');
    }
  }, []);

  useEffect(() => {
    if (!walletBloc) return;

    const handleStateChange = (state: WalletOnboardingState) => {
      if (state instanceof WalletOnboardingLoading) {
        setIsLoading(true);
      } else if (state instanceof WalletImportedState) {
        setIsLoading(false);
        Alert.alert(
          'Thành công',
          'Ví đã được khôi phục thành công!',
          [{ text: 'OK', onPress: () => {
            // Navigate to dashboard
            navigation.navigate('SetupPin');
          }}]
        );
      } else if (state instanceof WalletOnboardingError) {
        setIsLoading(false);
        Alert.alert('Lỗi', state.message);
      }
    };

    walletBloc.addListener(handleStateChange);
    return () => walletBloc.removeListener(handleStateChange);
  }, [walletBloc]);

  const handleImportWallet = async () => {
    if (!walletName.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập tên ví');
      return;
    }

    const finalMnemonic = inputMode === 'text' 
      ? mnemonic.trim() 
      : mnemonicWords.join(' ').trim();

    if (!finalMnemonic) {
      Alert.alert('Lỗi', 'Vui lòng nhập cụm từ khôi phục');
      return;
    }

    const words = finalMnemonic.split(/\s+/);
    if (words.length !== 12) {
      Alert.alert('Lỗi', 'Cụm từ khôi phục phải có đúng 12 từ');
      return;
    }

    if (!walletBloc) {
      Alert.alert('Lỗi', 'Ví chưa được khởi tạo. Vui lòng thử lại.');
      return;
    }

    await walletBloc.add(new ImportWalletEvent(finalMnemonic, walletName.trim()));
  };

  const handleWordChange = (index: number, word: string) => {
    const newWords = [...mnemonicWords];
    newWords[index] = word.toLowerCase().trim();
    setMnemonicWords(newWords);
  };

  const pasteMnemonic = async () => {
    try {
      // Sử dụng Expo Clipboard API
      const { getStringAsync } = await import('expo-clipboard');
      const text = await getStringAsync();
      if (text) {
        setMnemonic(text);
      } else {
        Alert.alert('Thông báo', 'Clipboard trống');
      }
    } catch (error) {
      console.error('Lỗi khi đọc clipboard:', error);
      Alert.alert('Lỗi', 'Không thể đọc dữ liệu từ clipboard');
    }
  };

  const renderTextInput = () => (
    <View style={styles.inputContainer}>
      <Text style={styles.label}>Cụm từ khôi phục (12 từ)</Text>
      <TextInput
        style={[styles.textArea]}
        value={mnemonic}
        onChangeText={setMnemonic}
        placeholder="Nhập 12 từ cách nhau bởi dấu cách..."
        placeholderTextColor="#9ca3af"
        multiline
        numberOfLines={4}
        textAlignVertical="top"
      />
      <TouchableOpacity
        style={styles.pasteButton}
        onPress={pasteMnemonic}
        activeOpacity={0.8}
      >
        <Text style={styles.pasteButtonText}>📋 Dán</Text>
      </TouchableOpacity>
    </View>
  );

  const renderGridInput = () => (
    <View style={styles.inputContainer}>
      <Text style={styles.label}>Cụm từ khôi phục</Text>
      <View style={styles.wordsGrid}>
        {mnemonicWords.map((word, index) => (
          <View key={index} style={styles.wordInputContainer}>
            <Text style={styles.wordNumber}>{index + 1}</Text>
            <TextInput
              style={styles.wordInput}
              value={word}
              onChangeText={(text) => handleWordChange(index, text)}
              placeholder={`Từ ${index + 1}`}
              placeholderTextColor="#9ca3af"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
        ))}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Khôi phục ví</Text>
          <Text style={styles.subtitle}>
            Nhập cụm từ khôi phục 12 từ để khôi phục ví của bạn
          </Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.label}>Tên ví</Text>
          <TextInput
            style={styles.input}
            value={walletName}
            onChangeText={setWalletName}
            placeholder="Nhập tên ví"
            placeholderTextColor="#9ca3af"
          />
        </View>

        <View style={styles.inputModeSelector}>
          <TouchableOpacity
            style={[
              styles.modeButton,
              inputMode === 'text' && styles.activeModeButton
            ]}
            onPress={() => setInputMode('text')}
            activeOpacity={0.8}
          >
            <Text style={[
              styles.modeButtonText,
              inputMode === 'text' && styles.activeModeButtonText
            ]}>
              Nhập văn bản
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.modeButton,
              inputMode === 'grid' && styles.activeModeButton
            ]}
            onPress={() => setInputMode('grid')}
            activeOpacity={0.8}
          >
            <Text style={[
              styles.modeButtonText,
              inputMode === 'grid' && styles.activeModeButtonText
            ]}>
              Nhập từng từ
            </Text>
          </TouchableOpacity>
        </View>

        {inputMode === 'text' ? renderTextInput() : renderGridInput()}

        <View style={styles.warningBox}>
          <Text style={styles.warningTitle}>🔒 Bảo mật</Text>
          <Text style={styles.warningText}>
            Cụm từ khôi phục của bạn sẽ được mã hóa và lưu trữ an toàn trên thiết bị này.
          </Text>
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.button, styles.primaryButton]}
            onPress={handleImportWallet}
            disabled={isLoading}
            activeOpacity={0.8}
          >
            {isLoading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.primaryButtonText}>Khôi phục ví</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.secondaryButton]}
            onPress={() => navigation.goBack()}
            disabled={isLoading}
            activeOpacity={0.8}
          >
            <Text style={styles.secondaryButtonText}>Quay lại</Text>
          </TouchableOpacity>
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
    paddingHorizontal: 24,
  },
  header: {
    marginTop: 40,
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
    lineHeight: 24,
  },
  form: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    height: 56,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#1f2937',
    backgroundColor: '#f9fafb',
  },
  inputModeSelector: {
    flexDirection: 'row',
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    padding: 4,
    marginBottom: 24,
  },
  modeButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
  },
  activeModeButton: {
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  modeButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
  },
  activeModeButtonText: {
    color: '#374151',
  },
  inputContainer: {
    marginBottom: 24,
  },
  textArea: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#1f2937',
    backgroundColor: '#f9fafb',
    minHeight: 120,
  },
  pasteButton: {
    alignSelf: 'flex-end',
    marginTop: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#e5e7eb',
    borderRadius: 8,
  },
  pasteButtonText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  wordsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  wordInputContainer: {
    width: '48%',
    marginBottom: 12,
  },
  wordNumber: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
    marginLeft: 4,
  },
  wordInput: {
    height: 48,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 16,
    color: '#1f2937',
    backgroundColor: '#f9fafb',
  },
  warningBox: {
    backgroundColor: '#eff6ff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 32,
  },
  warningTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e40af',
    marginBottom: 8,
  },
  warningText: {
    fontSize: 14,
    color: '#1e40af',
    lineHeight: 20,
  },
  buttonContainer: {
    paddingBottom: 40,
  },
  button: {
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  primaryButton: {
    backgroundColor: '#3b82f6',
  },
  secondaryButton: {
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
});
