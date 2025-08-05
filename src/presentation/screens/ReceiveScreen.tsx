import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
  Share,
  Clipboard,
  Dimensions,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/types';
import { ReceiveUseCases } from '../../domain/usecases/receive_usecases';
import { ReceiveAddressInfo } from '../../data/services/receive_service';
import QRCode from 'react-native-qrcode-svg';

type ReceiveScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Receive'>;

interface Props {
  navigation: ReceiveScreenNavigationProp;
}

const { width } = Dimensions.get('window');
const QR_SIZE = width * 0.6;

export const ReceiveScreen: React.FC<Props> = ({ navigation }) => {
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
      return 'ethereum:0x0000000000000000000000000000000000000000'; // Fallback address
    }
    
    // Tạo QR code khác nhau cho BNB và USDT
    if (selectedToken === 'BNB') {
      // BNB address
      return `binancecoin:${addressInfo.address}`;
    } else {
      // USDT contract address trên BSC mainnet
      const usdtAddress = '0x55d398326f99059fF775485246999027B3197955';
      return `binancecoin:${usdtAddress}@56?address=${addressInfo.address}`;
    }
  };

  const handleTokenSelect = (token: 'BNB' | 'USDT') => {
    setSelectedToken(token);
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backButton}>← Quay lại</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Nhận</Text>
          <View style={{ width: 60 }} />
        </View>
        <View style={styles.loadingContainer}>
          <Text>Đang tải...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>← Quay lại</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Nhận</Text>
        <View style={{ width: 60 }} />
      </View>

      <View style={styles.content}>
        {/* Token Selection */}
        <View style={styles.tokenSelector}>
          <TouchableOpacity
            style={[
              styles.tokenButton,
              selectedToken === 'BNB' && styles.tokenButtonActive,
            ]}
            onPress={() => handleTokenSelect('BNB')}
          >
            <Text
              style={[
                styles.tokenButtonText,
                selectedToken === 'BNB' && styles.tokenButtonTextActive,
              ]}
            >
              BNB
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.tokenButton,
              selectedToken === 'USDT' && styles.tokenButtonActive,
            ]}
            onPress={() => handleTokenSelect('USDT')}
          >
            <Text
              style={[
                styles.tokenButtonText,
                selectedToken === 'USDT' && styles.tokenButtonTextActive,
              ]}
            >
              USDT
            </Text>
          </TouchableOpacity>
        </View>

        {/* QR Code */}
        <View style={styles.qrContainer}>
          <View style={styles.qrWrapper}>
            <QRCode
              value={getQRValue()}
              size={QR_SIZE}
              backgroundColor="white"
              color="black"
            />
          </View>
          <Text style={styles.qrLabel}>
            Quét QR code để gửi {selectedToken}
          </Text>
        </View>

        {/* Address Info */}
        <View style={styles.addressContainer}>
          <Text style={styles.addressLabel}>Địa chỉ ví của bạn:</Text>
          <View style={styles.addressBox}>
            <Text style={styles.addressText}>
              {addressInfo?.formattedAddress}
            </Text>
            <TouchableOpacity
              style={styles.copyButton}
              onPress={handleCopyAddress}
            >
              <Text style={styles.copyButtonText}>Sao chép</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.fullAddress}>
            {addressInfo?.address}
          </Text>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={styles.shareButton}
            onPress={handleShare}
          >
            <Text style={styles.shareButtonText}>Chia sẻ địa chỉ</Text>
          </TouchableOpacity>
        </View>

        {/* Warning */}
        <View style={styles.warningContainer}>
          <Text style={styles.warningTitle}>⚠️ Lưu ý quan trọng:</Text>
          <Text style={styles.warningText}>
            • Chỉ gửi {selectedToken} đến địa chỉ này
          </Text>
          <Text style={styles.warningText}>
            • Kiểm tra kỹ địa chỉ trước khi gửi
          </Text>
          <Text style={styles.warningText}>
            • Giao dịch trên blockchain không thể hoàn tác
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  backButton: {
    fontSize: 16,
    color: '#007AFF',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  tokenSelector: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 4,
    marginBottom: 30,
  },
  tokenButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
  },
  tokenButtonActive: {
    backgroundColor: '#007AFF',
  },
  tokenButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#666',
  },
  tokenButtonTextActive: {
    color: '#fff',
  },
  qrContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  qrWrapper: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  qrLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 15,
    textAlign: 'center',
  },
  addressContainer: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
    marginBottom: 20,
  },
  addressLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 10,
  },
  addressBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    padding: 15,
    marginBottom: 10,
  },
  addressText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    flex: 1,
  },
  copyButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 6,
  },
  copyButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  fullAddress: {
    fontSize: 12,
    color: '#999',
    fontFamily: 'monospace',
  },
  actionButtons: {
    marginBottom: 20,
  },
  shareButton: {
    backgroundColor: '#34C759',
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
  },
  shareButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  warningContainer: {
    backgroundColor: '#fff3cd',
    borderRadius: 10,
    padding: 15,
    borderLeftWidth: 4,
    borderLeftColor: '#ffc107',
  },
  warningTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#856404',
    marginBottom: 8,
  },
  warningText: {
    fontSize: 14,
    color: '#856404',
    marginBottom: 4,
  },
});
