import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Alert,
  Clipboard,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/types';
import { useTheme } from '../../core/theme';
import { ServiceLocator } from '../../core/di/service_locator';
import { GetWalletMnemonicUseCase } from '../../domain/usecases/wallet_usecases';
import { LogoComponent } from '../components/LogoComponent';

type BackupWalletScreenNavigationProp = StackNavigationProp<RootStackParamList, 'BackupWallet'>;

interface Props {
  navigation: BackupWalletScreenNavigationProp;
}

export const BackupWalletScreen: React.FC<Props> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const colors = theme.colors;
  const styles = createStyles(colors);
  const [mnemonic, setMnemonic] = useState<string>('');
  const [isRevealed, setIsRevealed] = useState(false);
  const [mnemonicWords, setMnemonicWords] = useState<string[]>([]);

  useEffect(() => {
    loadMnemonic();
  }, []);

  const loadMnemonic = async () => {
    try {
      const getWalletMnemonicUseCase = ServiceLocator.get<GetWalletMnemonicUseCase>('GetWalletMnemonicUseCase');
      const walletMnemonic = await getWalletMnemonicUseCase.execute();
      setMnemonic(walletMnemonic);
      setMnemonicWords(walletMnemonic.split(' '));
    } catch (error) {
      console.error('Error loading mnemonic:', error);
      Alert.alert('Lỗi', 'Không thể tải cụm từ khôi phục');
    }
  };

  const handleRevealMnemonic = () => {
    Alert.alert(
      'Cảnh báo bảo mật',
      'Cụm từ khôi phục là chìa khóa duy nhất để truy cập ví của bạn. Hãy đảm bảo không ai khác có thể nhìn thấy màn hình này.',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Tôi hiểu',
          onPress: () => setIsRevealed(true),
        },
      ]
    );
  };

  const handleCopyMnemonic = () => {
    Clipboard.setString(mnemonic);
    Alert.alert('Đã sao chép', 'Cụm từ khôi phục đã được sao chép vào clipboard');
  };

  const renderMnemonicWord = (word: string, index: number) => (
    <View key={index} style={styles.wordContainer}>
      <Text style={styles.wordNumber}>{index + 1}</Text>
      <Text style={styles.wordText}>{word}</Text>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.8}
        >
          <MaterialIcons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <LogoComponent size="small" style={{ marginRight: 8 }} />
          <Text style={[styles.title, { color: colors.text }]}>Sao lưu ví</Text>
        </View>
      </View>

      <ScrollView 
        style={styles.scrollView} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 20) }}
      >
        <View style={styles.content}>
          <View style={[styles.warningCard, { backgroundColor: theme.isDark ? '#451a03' : '#fef3c7', borderColor: theme.isDark ? '#92400e' : '#f59e0b' }]}>
            <MaterialIcons name="warning" size={32} color={theme.isDark ? '#fed7aa' : '#f59e0b'} />
            <Text style={[styles.warningTitle, { color: theme.isDark ? '#fed7aa' : '#92400e' }]}>Quan trọng!</Text>
            <Text style={[styles.warningText, { color: theme.isDark ? '#fed7aa' : '#92400e' }]}>
              Cụm từ khôi phục là cách duy nhất để khôi phục ví của bạn. Hãy lưu trữ nó ở nơi an toàn và không chia sẻ với bất kỳ ai.
            </Text>
          </View>

          <View style={styles.instructionCard}>
            <Text style={styles.instructionTitle}>Hướng dẫn sao lưu:</Text>
            <View style={styles.instructionItem}>
              <Text style={styles.instructionNumber}>1.</Text>
              <Text style={styles.instructionText}>Viết ra giấy và cất giữ ở nơi an toàn</Text>
            </View>
            <View style={styles.instructionItem}>
              <Text style={styles.instructionNumber}>2.</Text>
              <Text style={styles.instructionText}>Không chụp ảnh hoặc lưu trên thiết bị</Text>
            </View>
            <View style={styles.instructionItem}>
              <Text style={styles.instructionNumber}>3.</Text>
              <Text style={styles.instructionText}>Không chia sẻ với bất kỳ ai</Text>
            </View>
            <View style={styles.instructionItem}>
              <Text style={styles.instructionNumber}>4.</Text>
              <Text style={styles.instructionText}>Kiểm tra lại thứ tự các từ</Text>
            </View>
          </View>

          {!isRevealed ? (
            <TouchableOpacity
              style={styles.revealButton}
              onPress={handleRevealMnemonic}
              activeOpacity={0.8}
            >
              <MaterialIcons name="visibility" size={24} color={colors.background} />
              <Text style={styles.revealButtonText}>Hiển thị cụm từ khôi phục</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.mnemonicContainer}>
              <Text style={styles.mnemonicTitle}>Cụm từ khôi phục của bạn:</Text>
              <View style={styles.mnemonicGrid}>
                {mnemonicWords.map((word, index) => renderMnemonicWord(word, index))}
              </View>
              
              <TouchableOpacity
                style={styles.copyButton}
                onPress={handleCopyMnemonic}
                activeOpacity={0.8}
              >
                <MaterialIcons name="content-copy" size={20} color={colors.primary} />
                <Text style={styles.copyButtonText}>Sao chép</Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.securityTips}>
            <Text style={styles.securityTitle}>Lưu ý bảo mật:</Text>
            <Text style={styles.securityText}>
              • Không bao giờ nhập cụm từ này vào website hoặc ứng dụng không tin cậy{'\n'}
              • Finan sẽ không bao giờ yêu cầu bạn cung cấp cụm từ khôi phục{'\n'}
              • Nếu mất cụm từ này, bạn sẽ mất quyền truy cập vào ví vĩnh viễn
            </Text>
          </View>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 24,
  },
  warningCard: {
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 1,
  },
  warningTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 8,
    marginBottom: 8,
  },
  warningText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  instructionCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
  },
  instructionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 16,
  },
  instructionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  instructionNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
    marginRight: 8,
    minWidth: 20,
  },
  instructionText: {
    fontSize: 14,
    color: colors.textSecondary,
    flex: 1,
    lineHeight: 20,
  },
  revealButton: {
    backgroundColor: colors.primary,
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  revealButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.background,
    marginLeft: 8,
  },
  mnemonicContainer: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
  },
  mnemonicTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 16,
    textAlign: 'center',
  },
  mnemonicGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  wordContainer: {
    width: '48%',
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  wordNumber: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    marginRight: 8,
    minWidth: 16,
  },
  wordText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
    flex: 1,
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  copyButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
    marginLeft: 8,
  },
  securityTips: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
  },
  securityTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  securityText: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
});
