import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Modal,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useThemeColors } from '../../core/theme';
import { TransactionHistoryBloc } from '../blocs/transaction_history_bloc';
import { TransactionHistoryState, TransactionHistoryLoading, TransactionHistoryLoaded, TransactionHistoryEmpty, TransactionHistoryError } from '../blocs/transaction_history_state';
import { LoadTransactionHistory, RefreshTransactionHistory, LoadMoreTransactions, FilterTransactionHistory } from '../blocs/transaction_history_event';
import { TransactionEntity, TransactionType, TransactionStatus, TransactionFilter } from '../../domain/entities/transaction_entity';
import { SecureStorageService } from '../../data/services/secure_storage_service';
import { getTokenIcon } from '../../core/utils/token_icon_utils';
import { getTransactionHistoryStrings } from '../../core/localization/transaction_history_strings';

interface TransactionHistoryScreenProps {
  transactionHistoryBloc: TransactionHistoryBloc;
}

const TransactionHistoryScreen: React.FC<TransactionHistoryScreenProps> = ({
  transactionHistoryBloc,
}) => {
  const colors = useThemeColors();
  const [state, setState] = useState<TransactionHistoryState>(transactionHistoryBloc.state);
  const [walletAddress, setWalletAddress] = useState<string>('');
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [currentFilter, setCurrentFilter] = useState<TransactionFilter | undefined>();
  
  // Get localized strings (default to Vietnamese)
  const strings = getTransactionHistoryStrings('vi');

  useEffect(() => {
    // Subscribe to bloc state changes
    const unsubscribe = transactionHistoryBloc.listen((newState) => {
      setState(newState);
    });

    // Load wallet address and initial data
    loadWalletAndTransactions();

    return unsubscribe;
  }, []);

  const loadWalletAndTransactions = async () => {
    try {
      const secureStorage = new SecureStorageService();
      const wallet = await secureStorage.getWallet();
      
      if (wallet) {
        setWalletAddress(wallet.address);
        transactionHistoryBloc.add(new LoadTransactionHistory(wallet.address));
      } else {
        Alert.alert('Lỗi', 'Không tìm thấy thông tin ví');
      }
    } catch (error) {
      Alert.alert('Lỗi', 'Không thể tải thông tin ví');
    }
  };

  const handleRefresh = useCallback(() => {
    if (walletAddress) {
      transactionHistoryBloc.add(new RefreshTransactionHistory(walletAddress));
    }
  }, [walletAddress]);

  const handleLoadMore = useCallback(() => {
    if (walletAddress && state instanceof TransactionHistoryLoaded && !state.isLoadingMore) {
      transactionHistoryBloc.add(new LoadMoreTransactions(walletAddress));
    }
  }, [walletAddress, state]);

  const handleFilter = (filter: TransactionFilter) => {
    setCurrentFilter(filter);
    setShowFilterModal(false);
    if (walletAddress) {
      transactionHistoryBloc.add(new FilterTransactionHistory(walletAddress, filter));
    }
  };

  const clearFilter = () => {
    setCurrentFilter(undefined);
    setShowFilterModal(false);
    if (walletAddress) {
      transactionHistoryBloc.add(new LoadTransactionHistory(walletAddress, undefined, true));
    }
  };

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
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
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

  const renderTransactionItem = ({ item }: { item: TransactionEntity }) => {
    const tokenIconInfo = getTokenIcon(item.tokenSymbol);
    
    return (
      <TouchableOpacity
        style={[styles.transactionItem, { backgroundColor: colors.card, borderBottomColor: colors.border }]}
        onPress={() => {
          // Navigate to transaction detail screen
          // This would be implemented with navigation
        }}
      >
        <View style={[
          styles.transactionIcon,
          { backgroundColor: tokenIconInfo.backgroundColor }
        ]}>
          <Text style={[
            styles.tokenSymbol,
            { color: tokenIconInfo.textColor }
          ]}>
            {tokenIconInfo.icon}
          </Text>
        </View>
      
      <View style={styles.transactionInfo}>
        <View style={styles.transactionHeader}>
          <Text style={[styles.transactionType, { color: colors.text }]}>
            {formatTransactionType(item.type)} {item.tokenSymbol}
          </Text>
          <Text style={[styles.amount, { color: item.type === TransactionType.RECEIVE ? '#10B981' : '#EF4444' }]}>
            {item.type === TransactionType.RECEIVE ? '+' : '-'}{formatAmount(item.amount, item.tokenSymbol)}
          </Text>
        </View>
        
        <View style={styles.transactionDetails}>
          <Text style={[styles.timestamp, { color: colors.textSecondary }]}>{formatDate(item.timestamp)}</Text>
          <View style={styles.statusContainer}>
            <View style={[styles.statusDot, { backgroundColor: getStatusColor(item.status) }]} />
            <Text style={[styles.status, { color: getStatusColor(item.status) }]}>
              {getStatusText(item.status)}
            </Text>
          </View>
        </View>
        
        {item.amountUSD && (
          <Text style={[styles.usdAmount, { color: colors.text }]}>≈ ${item.amountUSD.toFixed(2)}</Text>
        )}
      </View>
    </TouchableOpacity>
  )};

  const renderFilterModal = () => (
    <Modal
      visible={showFilterModal}
      transparent
      animationType="slide"
      onRequestClose={() => setShowFilterModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Lọc giao dịch</Text>
          
          <TouchableOpacity
            style={styles.filterOption}
            onPress={() => handleFilter({ type: TransactionType.SEND })}
          >
            <Text style={styles.filterOptionText}>Chỉ giao dịch gửi</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.filterOption}
            onPress={() => handleFilter({ type: TransactionType.RECEIVE })}
          >
            <Text style={styles.filterOptionText}>Chỉ giao dịch nhận</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.filterOption}
            onPress={() => handleFilter({ type: TransactionType.SWAP })}
          >
            <Text style={styles.filterOptionText}>Chỉ giao dịch hoán đổi</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.filterOption}
            onPress={clearFilter}
          >
            <Text style={styles.filterOptionText}>Xóa bộ lọc</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => setShowFilterModal(false)}
          >
            <Text style={styles.cancelButtonText}>Hủy</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  const renderEmptyState = () => (
    <View style={[styles.emptyState, { backgroundColor: colors.background }]}>
      <Text style={[styles.emptyStateTitle, { color: colors.text }]}>Chưa có giao dịch nào</Text>
      <Text style={[styles.emptyStateSubtitle, { color: colors.textSecondary }]}>
        {currentFilter ? 'Không có giao dịch nào phù hợp với bộ lọc' : 'Bạn chưa thực hiện giao dịch nào'}
      </Text>
    </View>
  );

  const renderError = (message: string) => (
    <View style={styles.errorState}>
      <Text style={styles.errorTitle}>Có lỗi xảy ra</Text>
      <Text style={styles.errorMessage}>{message}</Text>
      <TouchableOpacity style={styles.retryButton} onPress={handleRefresh}>
        <Text style={styles.retryButtonText}>Thử lại</Text>
      </TouchableOpacity>
    </View>
  );

  const renderContent = () => {
    if (state instanceof TransactionHistoryLoading && !(state as TransactionHistoryLoading).isRefresh) {
      return (
        <View style={[styles.loadingState, { backgroundColor: colors.background }]}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Đang tải lịch sử giao dịch...</Text>
        </View>
      );
    }

    if (state instanceof TransactionHistoryError) {
      return renderError(state.message);
    }

    if (state instanceof TransactionHistoryEmpty) {
      return renderEmptyState();
    }

    if (state instanceof TransactionHistoryLoaded) {
      return (
        <FlatList
          data={state.transactions}
          keyExtractor={(item) => `${item.id}_${item.tokenSymbol}`}
          renderItem={renderTransactionItem}
          refreshControl={
            <RefreshControl
              refreshing={state instanceof TransactionHistoryLoading && (state as TransactionHistoryLoading).isRefresh}
              onRefresh={handleRefresh}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
          onEndReached={state.hasMore ? handleLoadMore : undefined}
          onEndReachedThreshold={0.1}
          ListFooterComponent={
            state.isLoadingMore ? (
              <View style={styles.loadMoreIndicator}>
                <ActivityIndicator size="small" color={colors.primary} />
              </View>
            ) : null
          }
          contentContainerStyle={styles.listContainer}
        />
      );
    }

    return renderEmptyState();
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Lịch sử giao dịch</Text>
        <TouchableOpacity
          style={[styles.filterButton, { backgroundColor: colors.primary }]}
          onPress={() => setShowFilterModal(true)}
        >
          <Text style={[styles.filterButtonText, { color: colors.textInverse }]}>Lọc</Text>
        </TouchableOpacity>
      </View>
      
      {currentFilter && (
        <View style={[styles.filterIndicator, { backgroundColor: colors.surfaceSecondary }]}>
          <Text style={[styles.filterIndicatorText, { color: colors.text }]}>
            {strings.filtering} {currentFilter.type ? formatTransactionType(currentFilter.type) : strings.custom}
          </Text>
          <TouchableOpacity onPress={clearFilter}>
            <Text style={[styles.clearFilterText, { color: colors.primary }]}>{strings.clearFilter}</Text>
          </TouchableOpacity>
        </View>
      )}

      {renderContent()}
      {renderFilterModal()}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // backgroundColor được override bởi theme colors
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    // backgroundColor và borderBottomColor được override bởi theme colors
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    // color được override bởi theme colors
  },
  filterButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    // backgroundColor được override bởi theme colors
    borderRadius: 6,
  },
  filterButtonText: {
    // color được override bởi theme colors
    fontSize: 14,
    fontWeight: '500',
  },
  filterIndicator: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    // backgroundColor và borderBottomColor được override bởi theme colors
    borderBottomWidth: 1,
  },
  filterIndicatorText: {
    fontSize: 14,
    // color được override bởi theme colors
  },
  clearFilterText: {
    fontSize: 14,
    // color được override bởi theme colors
    fontWeight: '500',
  },
  listContainer: {
    paddingVertical: 8,
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    // backgroundColor và borderBottomColor được override bởi theme colors
    borderBottomWidth: 1,
  },
  transactionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  tokenSymbol: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
  },
  transactionInfo: {
    flex: 1,
  },
  transactionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  transactionType: {
    fontSize: 16,
    fontWeight: '600',
    // color được override bởi theme colors
    marginBottom: 4,
  },
  amount: {
    fontSize: 16,
    fontWeight: '600',
  },
  transactionDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  timestamp: {
    fontSize: 12,
    // color được override bởi theme colors
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 4,
  },
  status: {
    fontSize: 12,
    fontWeight: '500',
  },
  usdAmount: {
    fontSize: 12,
    // color được override bởi theme colors
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
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  emptyStateSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
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
  loadMoreIndicator: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingVertical: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 20,
  },
  filterOption: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  filterOptionText: {
    fontSize: 16,
    color: '#374151',
  },
  cancelButton: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    marginTop: 8,
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#EF4444',
    textAlign: 'center',
    fontWeight: '500',
  },
});

export { TransactionHistoryScreen };
export default TransactionHistoryScreen;
