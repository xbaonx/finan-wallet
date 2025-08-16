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
  Image,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/types';
import { useThemeColors } from '../../core/theme';
import { WalletOnboardingBloc } from '../blocs/wallet_onboarding_bloc';
import { CreateWalletEvent } from '../blocs/wallet_onboarding_event';
import { WalletOnboardingState, WalletOnboardingLoading, WalletCreatedState, WalletOnboardingError } from '../blocs/wallet_onboarding_state';
import { ServiceLocator } from '../../core/di/service_locator';

type CreateWalletScreenNavigationProp = StackNavigationProp<RootStackParamList, 'CreateWallet'>;

interface Props {
  navigation: CreateWalletScreenNavigationProp;
}

export const CreateWalletScreen: React.FC<Props> = ({ navigation }) => {
  const colors = useThemeColors();
  const styles = createStyles(colors);
  const [walletName, setWalletName] = useState('Ví của tôi');
  const [isLoading, setIsLoading] = useState(false);
  const [mnemonic, setMnemonic] = useState<string[]>([]);
  const [showMnemonic, setShowMnemonic] = useState(false);
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
      } else if (state instanceof WalletCreatedState) {
        setIsLoading(false);
        // Get the real mnemonic from the state
        if (state.mnemonic) {
          const mnemonicWords = state.mnemonic.split(' ');
          setMnemonic(mnemonicWords);
          setShowMnemonic(true);
        } else {
          Alert.alert('Lỗi', 'Không thể lấy cụm từ khôi phục. Vui lòng thử lại.');
        }
      } else if (state instanceof WalletOnboardingError) {
        setIsLoading(false);
        Alert.alert('Lỗi', state.message);
      }
    };

    walletBloc.addListener(handleStateChange);
    return () => walletBloc.removeListener(handleStateChange);
  }, [walletBloc]);

  const handleCreateWallet = async () => {
    if (!walletName.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập tên ví');
      return;
    }

    if (!walletBloc) {
      Alert.alert('Lỗi', 'Ví chưa được khởi tạo. Vui lòng thử lại.');
      return;
    }

    await walletBloc.add(new CreateWalletEvent(walletName.trim()));
  };

  const handleContinue = () => {
    Alert.alert(
      'Xác nhận',
      'Bạn đã sao lưu cụm từ khôi phục an toàn chưa?',
      [
        { text: 'Chưa', style: 'cancel' },
        { 
          text: 'Đã sao lưu', 
          onPress: () => {
            // Navigate to PIN setup after wallet creation
            navigation.navigate('SetupPin');
          }
        }
      ]
    );
  };

  const copyMnemonic = async () => {
    try {
      const mnemonicString = mnemonic.join(' ');
      await Clipboard.setString(mnemonicString);
      Alert.alert('Đã sao chép', 'Cụm từ khôi phục đã được sao chép vào clipboard');
    } catch (error) {
      Alert.alert('Lỗi', 'Không thể sao chép cụm từ khôi phục');
    }
  };

  if (showMnemonic) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.text }]}>Sao lưu cụm từ khôi phục</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Ghi lại 12 từ này theo đúng thứ tự và bảo quản an toàn
            </Text>
          </View>

          <View style={styles.warningBox}>
            <Text style={styles.warningTitle}>⚠️ Quan trọng</Text>
            <Text style={styles.warningText}>
              • Không chia sẻ cụm từ này với bất kỳ ai{'\n'}
              • Lưu trữ ở nơi an toàn, ngoại tuyến{'\n'}
              • Mất cụm từ = mất toàn bộ tài sản
            </Text>
          </View>

          <View style={styles.mnemonicContainer}>
            {mnemonic.map((word, index) => (
              <View key={index} style={[styles.wordContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.wordNumber, { color: colors.textSecondary }]}>{index + 1}</Text>
                <Text style={[styles.word, { color: colors.text }]}>{word}</Text>
              </View>
            ))}
          </View>

          <TouchableOpacity
            style={[styles.button, styles.secondaryButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={copyMnemonic}
            activeOpacity={0.8}
          >
            <Text style={[styles.secondaryButtonText, { color: colors.text }]}>📋 Sao chép</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.primaryButton, { backgroundColor: colors.primary }]}
            onPress={handleContinue}
            activeOpacity={0.8}
          >
            <Text style={[styles.primaryButtonText, { color: colors.surface }]}>Tôi đã sao lưu</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Image 
            source={require('../../../assets/images/logo.png')} 
            style={styles.logo} 
            resizeMode="contain"
          />
          <Text style={[styles.title, { color: colors.text }]}>Tạo ví mới</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Tạo một ví mã hóa mới để bắt đầu quản lý tài sản của bạn
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

        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>🔐 Bảo mật</Text>
          <Text style={styles.infoText}>
            Ví của bạn sẽ được bảo vệ bằng cụm từ khôi phục 12 từ. 
            Hãy lưu trữ cụm từ này một cách an toàn.
          </Text>
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.button, styles.primaryButton, { backgroundColor: colors.primary }]}
            onPress={handleCreateWallet}
            disabled={isLoading}
            activeOpacity={0.8}
          >
            {isLoading ? (
              <ActivityIndicator color={colors.surface} />
            ) : (
              <Text style={[styles.primaryButtonText, { color: colors.surface }]}>Tạo Ví</Text>
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
      </View>
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
  content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'space-between',
  },
  header: {
    marginTop: 40,
    marginBottom: 32,
    alignItems: 'center',
  },
  logo: {
    width: 100,
    height: 100,
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    lineHeight: 24,
    textAlign: 'center',
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
  infoBox: {
    backgroundColor: colors.surface,
    padding: 16,
    borderRadius: 12,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: colors.border,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  warningBox: {
    backgroundColor: '#fef3c7',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#f59e0b',
  },
  warningTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#92400e',
    marginBottom: 8,
  },
  warningText: {
    fontSize: 14,
    color: '#92400e',
    lineHeight: 20,
  },
  mnemonicContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 32,
  },
  wordContainer: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  wordNumber: {
    fontSize: 12,
    color: colors.textSecondary,
    marginRight: 8,
    minWidth: 20,
  },
  word: {
    fontSize: 16,
    color: colors.text,
    fontWeight: '500',
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
