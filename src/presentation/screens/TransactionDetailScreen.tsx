import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StyleSheet,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TransactionHistoryBloc } from '../blocs/transaction_history_bloc';
import { TransactionHistoryState, TransactionDetailLoading, TransactionDetailLoaded, TransactionDetailError } from '../blocs/transaction_history_state';
import { LoadTransactionDetail } from '../blocs/transaction_history_event';
import { TransactionEntity, TransactionType, TransactionStatus } from '../../domain/entities/transaction_entity';

interface TransactionDetailScreenProps {
  transactionHistoryBloc: TransactionHistoryBloc;
  transactionHash: string;
  onBack: () => void;
}

const TransactionDetailScreen: React.FC<TransactionDetailScreenProps> = ({
  transactionHistoryBloc,
  transactionHash,
  onBack,
}) => {
  const [state, setState] = useState<TransactionHistoryState>(transactionHistoryBloc.state);

  useEffect(() => {
    // Subscribe to bloc state changes
    const unsubscribe = transactionHistoryBloc.listen((newState) => {
      setState(newState);
    });

    // Load transaction detail
    transactionHistoryBloc.add(new LoadTransactionDetail(transactionHash));

    return unsubscribe;
  }, [transactionHash]);

  const formatTransactionType = (type: TransactionType): string => {
    switch (type) {
      case TransactionType.SEND:
        return 'Gửi';
      case TransactionType.RECEIVE:
        return 'Nhận';
      case TransactionType.SWAP:
        return 'Hoán đổi';
      default:
        return 'Không xác định';
    }
  };

  const formatAmount = (amount: string, symbol: string): string => {
    const numAmount = parseFloat(amount);
    if (numAmount === 0) return `0 ${symbol}`;
    
    if (numAmount < 0.001) {
      return `< 0.001 ${symbol}`;
    }
    
    return `${numAmount.toFixed(6).replace(/\.?0+$/, '')} ${symbol}`;
  };

  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('vi-VN', {
      weekday: 'long',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const formatAddress = (address: string): string => {
    if (address.length <= 10) return address;
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };

  const getStatusColor = (status: TransactionStatus): string => {
    switch (status) {
      case TransactionStatus.SUCCESS:
        return '#10B981';
      case TransactionStatus.PENDING:
        return '#F59E0B';
      case TransactionStatus.FAILED:
        return '#EF4444';
      default:
        return '#6B7280';
    }
  };

  const getStatusText = (status: TransactionStatus): string => {
    switch (status) {
      case TransactionStatus.SUCCESS:
        return 'Thành công';
      case TransactionStatus.PENDING:
        return 'Đang xử lý';
      case TransactionStatus.FAILED:
        return 'Thất bại';
      default:
        return 'Không xác định';
    }
  };

  const openInEtherscan = (hash: string) => {
    const url = `https://etherscan.io/tx/${hash}`;
    Linking.openURL(url).catch(() => {
      Alert.alert('Lỗi', 'Không thể mở liên kết');
    });
  };

  const copyToClipboard = async (text: string, label: string) => {
    try {
      // Import clipboard dynamically to avoid issues
      const Clipboard = await import('@react-native-clipboard/clipboard');
      await Clipboard.default.setString(text);
      Alert.alert('Đã sao chép', `${label} đã được sao chép vào clipboard`);
    } catch (error) {
      Alert.alert('Lỗi', 'Không thể sao chép');
    }
  };

  const renderDetailRow = (label: string, value: string, onPress?: () => void) => (
    <TouchableOpacity
      style={styles.detailRow}
      onPress={onPress}
      disabled={!onPress}
    >
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={[styles.detailValue, onPress && styles.clickableValue]}>
        {value}
      </Text>
    </TouchableOpacity>
  );

  const renderSwapDetails = (transaction: TransactionEntity) => {
    if (!transaction.swapData) return null;

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Chi tiết hoán đổi</Text>
        {renderDetailRow('Từ token', `${formatAmount(transaction.swapData.fromAmount, transaction.swapData.fromTokenSymbol)}`)}
        {renderDetailRow('Sang token', `${formatAmount(transaction.swapData.toAmount, transaction.swapData.toTokenSymbol)}`)}
        {transaction.swapData.exchangeRate && (
          renderDetailRow('Tỷ giá', `1 ${transaction.swapData.fromTokenSymbol} = ${transaction.swapData.exchangeRate.toFixed(6)} ${transaction.swapData.toTokenSymbol}`)
        )}
      </View>
    );
  };

  const renderContent = () => {
    if (state instanceof TransactionDetailLoading) {
      return (
        <View style={styles.loadingState}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={styles.loadingText}>Đang tải chi tiết giao dịch...</Text>
        </View>
      );
    }

    if (state instanceof TransactionDetailError) {
      return (
        <View style={styles.errorState}>
          <Text style={styles.errorTitle}>Có lỗi xảy ra</Text>
          <Text style={styles.errorMessage}>{state.message}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => transactionHistoryBloc.add(new LoadTransactionDetail(transactionHash))}
          >
            <Text style={styles.retryButtonText}>Thử lại</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (state instanceof TransactionDetailLoaded) {
      const transaction = state.transaction;
      
      return (
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          {/* Transaction Status */}
          <View style={styles.statusSection}>
            <View style={[styles.statusIndicator, { backgroundColor: getStatusColor(transaction.status) }]}>
              <Text style={styles.statusText}>{getStatusText(transaction.status)}</Text>
            </View>
            <Text style={styles.transactionType}>
              {formatTransactionType(transaction.type)} {transaction.tokenSymbol}
            </Text>
            <Text style={styles.amount}>
              {transaction.type === TransactionType.RECEIVE ? '+' : '-'}
              {formatAmount(transaction.amount, transaction.tokenSymbol)}
            </Text>
            {transaction.amountUSD && (
              <Text style={styles.usdAmount}>≈ ${transaction.amountUSD.toFixed(2)}</Text>
            )}
          </View>

          {/* Basic Information */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Thông tin cơ bản</Text>
            {renderDetailRow('Thời gian', formatDate(transaction.timestamp))}
            {renderDetailRow('Token', `${transaction.tokenSymbol} (${formatAddress(transaction.tokenAddress)})`)}
            {transaction.blockNumber && renderDetailRow('Block', transaction.blockNumber.toString())}
          </View>

          {/* Addresses */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Địa chỉ</Text>
            {renderDetailRow(
              'Từ',
              formatAddress(transaction.fromAddress),
              () => copyToClipboard(transaction.fromAddress, 'Địa chỉ gửi')
            )}
            {renderDetailRow(
              'Đến',
              formatAddress(transaction.toAddress),
              () => copyToClipboard(transaction.toAddress, 'Địa chỉ nhận')
            )}
          </View>

          {/* Swap Details */}
          {renderSwapDetails(transaction)}

          {/* Gas Information */}
          {(transaction.gasUsed || transaction.gasPrice) && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Thông tin gas</Text>
              {transaction.gasUsed && renderDetailRow('Gas đã sử dụng', transaction.gasUsed)}
              {transaction.gasPrice && renderDetailRow('Giá gas', `${transaction.gasPrice} wei`)}
              {transaction.gasFeeUSD && renderDetailRow('Phí gas', `$${transaction.gasFeeUSD.toFixed(4)}`)}
            </View>
          )}

          {/* Transaction Hash */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Hash giao dịch</Text>
            {renderDetailRow(
              'Hash',
              formatAddress(transaction.hash),
              () => copyToClipboard(transaction.hash, 'Hash giao dịch')
            )}
          </View>

          {/* Actions */}
          <View style={styles.actionsSection}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => openInEtherscan(transaction.hash)}
            >
              <Text style={styles.actionButtonText}>Xem trên Etherscan</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      );
    }

    return null;
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>← Quay lại</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Chi tiết giao dịch</Text>
        <View style={styles.headerSpacer} />
      </View>

      {renderContent()}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    paddingVertical: 8,
  },
  backButtonText: {
    fontSize: 16,
    color: '#3B82F6',
    fontWeight: '500',
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    textAlign: 'center',
  },
  headerSpacer: {
    width: 60,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingVertical: 16,
  },
  statusSection: {
    alignItems: 'center',
    paddingVertical: 24,
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statusIndicator: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginBottom: 12,
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  transactionType: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  amount: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  usdAmount: {
    fontSize: 16,
    color: '#6B7280',
  },
  section: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    paddingVertical: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  detailLabel: {
    fontSize: 14,
    color: '#6B7280',
    flex: 1,
  },
  detailValue: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '500',
    flex: 2,
    textAlign: 'right',
  },
  clickableValue: {
    color: '#3B82F6',
  },
  actionsSection: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  actionButton: {
    backgroundColor: '#3B82F6',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6B7280',
  },
  errorState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#EF4444',
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
  },
  retryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#3B82F6',
    borderRadius: 6,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
});

export default TransactionDetailScreen;
