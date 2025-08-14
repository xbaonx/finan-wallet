import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Share,
  Clipboard,
  Dimensions,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StackNavigationProp } from '@react-navigation/stack';
import { MaterialIcons } from '@expo/vector-icons';
import { RootStackParamList } from '../navigation/types';
import { ReceiveUseCases } from '../../domain/usecases/receive_usecases';
import { ReceiveAddressInfo } from '../../data/services/receive_service';
import { useThemeColors } from '../../core/theme';
import { LogoComponent } from '../components/LogoComponent';
import { getTokenIcon } from '../../core/utils/token_icon_utils';
import QRCode from 'react-native-qrcode-svg';

type ReceiveScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Receive'>;

interface Props {
  navigation: ReceiveScreenNavigationProp;
}

const { width } = Dimensions.get('window');
const QR_SIZE = width * 0.6;

export const ReceiveScreen: React.FC<Props> = ({ navigation }) => {
  const colors = useThemeColors();
  const [addressInfo, setAddressInfo] = useState<ReceiveAddressInfo | null>(null);
  const [selectedToken, setSelectedToken] = useState<'BNB' | 'USDT'>('BNB');
  const [isLoading, setIsLoading] = useState(true);

  const receiveUseCases = new ReceiveUseCases();

  useEffect(() => {
    loadAddressInfo();
  }, []);

  const loadAddressInfo = async () => {
    try {
      setIsLoading(true);
      const info = await receiveUseCases.getReceiveAddress();
      setAddressInfo(info);
    } catch (error: any) {
      Alert.alert('Lỗi', error.message || 'Không thể lấy địa chỉ ví');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyAddress = async () => {
    if (!addressInfo) return;

    try {
      await Clipboard.setString(addressInfo.address);
      Alert.alert('Thành công', 'Đã sao chép địa chỉ vào clipboard');
    } catch (error) {
      Alert.alert('Lỗi', 'Không thể sao chép địa chỉ');
    }
  };

  const handleShare = async () => {
    if (!addressInfo) return;

    try {
      const shareText = receiveUseCases.generateShareText(addressInfo.address, selectedToken);
      
      await Share.share({
        message: shareText,
        title: 'Địa chỉ ví của tôi',
      });
    } catch (error) {
      console.log('Share error:', error);
    }
  };

  const getQRValue = () => {
    if (!addressInfo || !addressInfo.address) {
      console.log('⚠️ QR Debug: addressInfo không có hoặc address rỗng');
      return '0x0000000000000000000000000000000000000000'; // Simple fallback
    }
    
    console.log('🔍 QR Debug: addressInfo.address =', addressInfo.address);
    console.log('🔍 QR Debug: selectedToken =', selectedToken);
    
    // Đơn giản hóa QR value - chỉ dùng địa chỉ ví thôi
    const qrValue = addressInfo.address;
    console.log('📱 QR Debug: Final QR value =', qrValue);
    
    return qrValue;
  };

  const handleTokenSelect = (token: 'BNB' | 'USDT') => {
    setSelectedToken(token);
  };

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <TouchableOpacity 
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <MaterialIcons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.text }]}>Nhận tiền</Text>
          <LogoComponent size="small" />
        </View>
        
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Đang tải địa chỉ ví...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity 
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <MaterialIcons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Nhận tiền</Text>
        <LogoComponent size="small" />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Token Selection Card */}
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Chọn loại token</Text>
          <View style={[styles.tokenSelector, { backgroundColor: colors.background }]}>
            <TouchableOpacity
              style={[
                styles.tokenButton,
                selectedToken === 'BNB' && { backgroundColor: colors.primary },
              ]}
              onPress={() => handleTokenSelect('BNB')}
            >
              <Text
                style={[
                  styles.tokenButtonText,
                  { color: selectedToken === 'BNB' ? colors.surface : colors.textSecondary },
                ]}
              >
                BNB
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.tokenButton,
                selectedToken === 'USDT' && { backgroundColor: colors.primary },
              ]}
              onPress={() => handleTokenSelect('USDT')}
            >
              <Text
                style={[
                  styles.tokenButtonText,
                  { color: selectedToken === 'USDT' ? colors.surface : colors.textSecondary },
                ]}
              >
                USDT
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* QR Code Card */}
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Mã QR nhận {selectedToken}</Text>
          <View style={styles.qrContainer}>
            <View style={[styles.qrWrapper, { backgroundColor: colors.surface }]}>
              {addressInfo && addressInfo.address ? (
                <QRCode
                  value={getQRValue()}
                  size={QR_SIZE}
                  backgroundColor={colors.surface}
                  color={colors.text}
                />
              ) : (
                <View style={[styles.qrPlaceholder, { backgroundColor: colors.background }]}>
                  <MaterialIcons name="qr-code" size={80} color={colors.textSecondary} />
                  <Text style={[styles.qrPlaceholderText, { color: colors.textSecondary }]}>
                    Đang tải QR code...
                  </Text>
                </View>
              )}
            </View>
            <Text style={[styles.qrLabel, { color: colors.textSecondary }]}>
              Quét mã QR để nhận {selectedToken}
            </Text>
          </View>
        </View>

        {/* Address Display Card */}
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Địa chỉ ví của bạn</Text>
          <View style={[styles.addressBox, { backgroundColor: colors.background }]}>
            <Text style={[styles.addressText, { color: colors.text }]} numberOfLines={1}>
              {addressInfo?.address ? `${addressInfo.address.slice(0, 20)}...` : 'Đang tải...'}
            </Text>
            <TouchableOpacity 
              style={[styles.copyButton, { backgroundColor: colors.primary }]} 
              onPress={handleCopyAddress}
            >
              <MaterialIcons name="content-copy" size={16} color={colors.surface} />
              <Text style={[styles.copyButtonText, { color: colors.surface }]}>Copy</Text>
            </TouchableOpacity>
          </View>
          <Text style={[styles.fullAddress, { color: colors.textSecondary }]}>
            {addressInfo?.address || 'Đang tải địa chỉ...'}
          </Text>
        </View>

        {/* Action Buttons */}
        <TouchableOpacity
          style={[styles.shareButton, { backgroundColor: colors.success }]}
          onPress={handleShare}
        >
          <MaterialIcons name="share" size={20} color={colors.surface} />
          <Text style={[styles.shareButtonText, { color: colors.surface }]}>Chia sẻ địa chỉ</Text>
        </TouchableOpacity>

        {/* Warning Card */}
        <View style={[styles.warningContainer, { backgroundColor: colors.warning + '20', borderLeftColor: colors.warning }]}>
          <View style={styles.warningHeader}>
            <MaterialIcons name="warning" size={20} color={colors.warning} />
            <Text style={[styles.warningTitle, { color: colors.warning }]}>Lưu ý quan trọng</Text>
          </View>
          <Text style={[styles.warningText, { color: colors.textSecondary }]}>
            • Chỉ gửi {selectedToken} đến địa chỉ này
          </Text>
          <Text style={[styles.warningText, { color: colors.textSecondary }]}>
            • Kiểm tra kỹ địa chỉ trước khi gửi
          </Text>
          <Text style={[styles.warningText, { color: colors.textSecondary }]}>
            • Giao dịch trên blockchain không thể hoàn tác
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    marginTop: 10,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  card: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
  },
  tokenSelector: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 4,
  },
  tokenButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
  },
  tokenButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  qrContainer: {
    alignItems: 'center',
  },
  qrWrapper: {
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  qrLabel: {
    fontSize: 14,
    marginTop: 16,
    textAlign: 'center',
  },
  qrPlaceholder: {
    width: QR_SIZE,
    height: QR_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
  },
  qrPlaceholderText: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  addressBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  addressText: {
    fontSize: 16,
    fontWeight: '500',
    flex: 1,
    marginRight: 12,
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  copyButtonText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  fullAddress: {
    fontSize: 12,
    fontFamily: 'monospace',
    lineHeight: 16,
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  shareButtonText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  warningContainer: {
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    marginBottom: 20,
  },
  warningHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  warningTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  warningText: {
    fontSize: 14,
    marginBottom: 4,
    lineHeight: 20,
  },
});
