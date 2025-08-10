import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/types';
import { TransactionUseCases } from '../../domain/usecases/transaction_usecases';
import { SendTransactionRequest } from '../../data/services/transaction_service';
import { formatCurrency, formatTokenBalance, truncateAddress } from '../../core/utils/format_utils';
import { handleInputChange, sanitizeForAPI, parseInputValue } from '../../core/utils/simple_input_formatter';

type SendScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Send'>;

interface Props {
  navigation: SendScreenNavigationProp;
}

export const SendScreen: React.FC<Props> = ({ navigation }) => {
  const [toAddress, setToAddress] = useState('');
  const [amount, setAmount] = useState('');
  const [displayAmount, setDisplayAmount] = useState('');
  const [tokenAddress, setTokenAddress] = useState(''); // Empty for ETH
  const [isLoading, setIsLoading] = useState(false);
  const [gasFee, setGasFee] = useState<{
    gasLimit: string;
    gasPrice: string;
    totalFee: string;
  } | null>(null);

  const transactionUseCases = new TransactionUseCases();

  useEffect(() => {
    // Auto estimate gas when inputs change
    if (toAddress && amount && transactionUseCases.validateAddress(toAddress)) {
      estimateGas();
    }
  }, [toAddress, amount, tokenAddress]);

  const estimateGas = async () => {
    try {
      const request: SendTransactionRequest = {
        toAddress,
        amount,
        tokenAddress: tokenAddress || undefined,
      };

      const fee = await transactionUseCases.estimateTransactionFee(request);
      setGasFee(fee);
    } catch (error: any) {
      console.log('Gas estimation error:', error.message);
      setGasFee(null);
    }
  };

  const handleSend = async () => {
    if (!toAddress || !amount) {
      Alert.alert('Lỗi', 'Vui lòng nhập đầy đủ thông tin');
      return;
    }

    if (!transactionUseCases.validateAddress(toAddress)) {
      Alert.alert('Lỗi', 'Địa chỉ nhận không hợp lệ');
      return;
    }

    if (parseFloat(amount) <= 0) {
      Alert.alert('Lỗi', 'Số lượng phải lớn hơn 0');
      return;
    }

    // Confirm transaction
    Alert.alert(
      'Xác nhận giao dịch',
      `Gửi ${amount} ${tokenAddress ? 'Token' : 'ETH'}\nĐến: ${transactionUseCases.formatAddress(toAddress)}\nPhí gas: ${gasFee?.totalFee || 'Đang tính...'} ETH`,
      [
        { text: 'Hủy', style: 'cancel' },
        { text: 'Xác nhận', onPress: confirmSend },
      ]
    );
  };

  const confirmSend = async () => {
    setIsLoading(true);

    try {
      const request: SendTransactionRequest = {
        toAddress,
        amount,
        tokenAddress: tokenAddress || undefined,
      };

      const result = await transactionUseCases.sendTransaction(request);

      if (result.success) {
        Alert.alert(
          'Thành công',
          `Giao dịch đã được gửi!\nHash: ${result.hash}`,
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      } else {
        Alert.alert('Lỗi', result.error || 'Gửi giao dịch thất bại');
      }
    } catch (error: any) {
      Alert.alert('Lỗi', error.message || 'Có lỗi xảy ra');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>← Quay lại</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Gửi</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Địa chỉ nhận</Text>
          <TextInput
            style={styles.input}
            value={toAddress}
            onChangeText={setToAddress}
            placeholder="0x..."
            placeholderTextColor="#999"
            autoCapitalize="none"
            autoCorrect={false}
          />
          {toAddress && !transactionUseCases.validateAddress(toAddress) && (
            <Text style={styles.errorText}>Địa chỉ không hợp lệ</Text>
          )}
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Số lượng</Text>
          <TextInput
            style={styles.input}
            value={displayAmount}
            onChangeText={(text) => {
              const { displayValue, rawValue } = handleInputChange(text);
              setDisplayAmount(displayValue);
              setAmount(sanitizeForAPI(rawValue)); // Giữ raw value cho API
            }}
            placeholder="0,00"
            placeholderTextColor="#999"
            keyboardType="decimal-pad"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Địa chỉ Token (để trống cho ETH)</Text>
          <TextInput
            style={styles.input}
            value={tokenAddress}
            onChangeText={setTokenAddress}
            placeholder="0x... (tùy chọn)"
            placeholderTextColor="#999"
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        {gasFee && (
          <View style={styles.gasInfo}>
            <Text style={styles.gasTitle}>Thông tin phí gas</Text>
            <Text style={styles.gasText}>Gas Limit: {gasFee.gasLimit}</Text>
            <Text style={styles.gasText}>Gas Price: {gasFee.gasPrice} Gwei</Text>
            <Text style={styles.gasText}>Tổng phí: {gasFee.totalFee} ETH</Text>
          </View>
        )}

        <TouchableOpacity
          style={[
            styles.sendButton,
            (!toAddress || !amount || isLoading) && styles.sendButtonDisabled,
          ]}
          onPress={handleSend}
          disabled={!toAddress || !amount || isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.sendButtonText}>Gửi</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
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
  content: {
    flex: 1,
    padding: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  errorText: {
    color: '#ff4444',
    fontSize: 14,
    marginTop: 5,
  },
  gasInfo: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 20,
  },
  gasTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 10,
  },
  gasText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  sendButton: {
    backgroundColor: '#007AFF',
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
    marginTop: 20,
  },
  sendButtonDisabled: {
    backgroundColor: '#ccc',
  },
  sendButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
