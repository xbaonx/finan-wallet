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
import { useThemeColors } from '../../core/theme';
import { WalletOnboardingBloc } from '../blocs/wallet_onboarding_bloc';
import { ImportWalletEvent } from '../blocs/wallet_onboarding_event';
import { WalletOnboardingState, WalletOnboardingLoading, WalletImportedState, WalletOnboardingError } from '../blocs/wallet_onboarding_state';
import { ServiceLocator } from '../../core/di/service_locator';

type ImportWalletScreenNavigationProp = StackNavigationProp<RootStackParamList, 'ImportWallet'>;

interface Props {
  navigation: ImportWalletScreenNavigationProp;
}

export const ImportWalletScreen: React.FC<Props> = ({ navigation }) => {
  const colors = useThemeColors();
  const styles = createStyles(colors);
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
      <Text style={[styles.label, { color: colors.text }]}>Cụm từ khôi phục (12 từ)</Text>
      <TextInput
        style={[styles.textArea, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
        value={mnemonic}
        onChangeText={setMnemonic}
        placeholder="Nhập 12 từ cách nhau bởi dấu cách..."
        placeholderTextColor={colors.textSecondary}
        multiline
        numberOfLines={4}
        textAlignVertical="top"
      />
      <TouchableOpacity
        style={[styles.pasteButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
        onPress={pasteMnemonic}
        activeOpacity={0.8}
      >
        <Text style={[styles.pasteButtonText, { color: colors.text }]}>📋 Dán</Text>
      </TouchableOpacity>
    </View>
  );

  const renderGridInput = () => (
    <View style={styles.inputContainer}>
      <Text style={[styles.label, { color: colors.text }]}>Cụm từ khôi phục</Text>
      <View style={styles.wordsGrid}>
        {mnemonicWords.map((word, index) => (
          <View key={index} style={styles.wordInputContainer}>
            <Text style={[styles.wordNumber, { color: colors.textSecondary }]}>{index + 1}</Text>
            <TextInput
              style={[styles.wordInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
              value={word}
              onChangeText={(text) => handleWordChange(index, text)}
              placeholder={`Từ ${index + 1}`}
              placeholderTextColor={colors.textSecondary}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
        ))}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>Khôi phục ví</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Nhập cụm từ khôi phục 12 từ để khôi phục ví của bạn
          </Text>
        </View>

        <View style={styles.form}>
          <Text style={[styles.label, { color: colors.text }]}>Tên ví</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
            value={walletName}
            onChangeText={setWalletName}
            placeholder="Nhập tên ví"
            placeholderTextColor={colors.textSecondary}
          />
        </View>

        <View style={[styles.inputModeSelector, { backgroundColor: colors.surface }]}>
          <TouchableOpacity
            style={[
              styles.modeButton,
              inputMode === 'text' && [styles.activeModeButton, { backgroundColor: colors.background }]
            ]}
            onPress={() => setInputMode('text')}
            activeOpacity={0.8}
          >
            <Text style={[
              styles.modeButtonText,
              { color: colors.textSecondary },
              inputMode === 'text' && [styles.activeModeButtonText, { color: colors.text }]
            ]}>
              Nhập văn bản
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.modeButton,
              inputMode === 'grid' && [styles.activeModeButton, { backgroundColor: colors.background }]
            ]}
            onPress={() => setInputMode('grid')}
            activeOpacity={0.8}
          >
            <Text style={[
              styles.modeButtonText,
              { color: colors.textSecondary },
              inputMode === 'grid' && [styles.activeModeButtonText, { color: colors.text }]
            ]}>
              Nhập từng từ
            </Text>
          </TouchableOpacity>
        </View>

        {inputMode === 'text' ? renderTextInput() : renderGridInput()}

        <View style={[styles.warningBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.warningTitle, { color: colors.primary }]}>🔒 Bảo mật</Text>
          <Text style={[styles.warningText, { color: colors.textSecondary }]}>
            Cụm từ khôi phục của bạn sẽ được mã hóa và lưu trữ an toàn trên thiết bị này.
          </Text>
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.button, styles.primaryButton, { backgroundColor: colors.primary }]}
            onPress={handleImportWallet}
            disabled={isLoading}
            activeOpacity={0.8}
          >
            {isLoading ? (
              <ActivityIndicator color={colors.surface} />
            ) : (
              <Text style={[styles.primaryButtonText, { color: colors.surface }]}>Khôi phục ví</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.secondaryButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={() => navigation.goBack()}
            disabled={isLoading}
            activeOpacity={0.8}
          >
            <Text style={[styles.secondaryButtonText, { color: colors.text }]}>Quay lại</Text>
          </TouchableOpacity>
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
    paddingHorizontal: 24,
  },
  header: {
    marginTop: 40,
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    lineHeight: 24,
  },
  form: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  input: {
    height: 56,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    color: colors.text,
    backgroundColor: colors.surface,
  },
  inputModeSelector: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 4,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modeButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
  },
  activeModeButton: {
    backgroundColor: colors.background,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  modeButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  activeModeButtonText: {
    color: colors.text,
  },
  inputContainer: {
    marginBottom: 24,
  },
  textArea: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: colors.text,
    backgroundColor: colors.surface,
    minHeight: 120,
  },
  pasteButton: {
    alignSelf: 'flex-end',
    marginTop: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pasteButtonText: {
    fontSize: 14,
    color: colors.text,
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
    color: colors.textSecondary,
    marginBottom: 4,
    marginLeft: 4,
  },
  wordInput: {
    height: 48,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 16,
    color: colors.text,
    backgroundColor: colors.surface,
  },
  warningBox: {
    backgroundColor: colors.surface,
    padding: 16,
    borderRadius: 12,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: colors.border,
  },
  warningTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
    marginBottom: 8,
  },
  warningText: {
    fontSize: 14,
    color: colors.textSecondary,
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
    backgroundColor: colors.primary,
  },
  secondaryButton: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.surface,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
});
