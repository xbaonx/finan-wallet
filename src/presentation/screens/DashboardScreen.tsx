import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Image,
  Alert,
} from 'react-native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { TabParamList } from '../navigation/types';
import { DashboardBloc } from '../blocs/dashboard_bloc';
import { LoadDashboardEvent, RefreshDashboardEvent } from '../blocs/dashboard_event';
import { DashboardState, DashboardLoading, DashboardLoaded, DashboardRefreshing, DashboardError } from '../blocs/dashboard_state';
import { ServiceLocator } from '../../core/di/service_locator';
import { testMoralisAPI } from '../../data/services/moralis_test';
import { formatCurrency, formatTokenBalance, truncateAddress } from '../../core/utils/format_utils';
import { TokenEntity } from '../../domain/entities/token_entity';

type DashboardScreenNavigationProp = BottomTabNavigationProp<TabParamList, 'Dashboard'>;

interface Props {
  navigation: DashboardScreenNavigationProp;
}

export const DashboardScreen: React.FC<Props> = ({ navigation }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [wallet, setWallet] = useState<any>(null);
  const [balance, setBalance] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [dashboardBloc, setDashboardBloc] = useState<DashboardBloc | null>(null);

  useEffect(() => {
    // Initialize dashboardBloc from ServiceLocator
    try {
      const bloc = ServiceLocator.get('DashboardBloc') as DashboardBloc;
      setDashboardBloc(bloc);
    } catch (error) {
      console.error('Failed to get DashboardBloc:', error);
      Alert.alert('Lỗi', 'Không thể khởi tạo dashboard. Vui lòng thử lại.');
    }
  }, []);

  useEffect(() => {
    if (!dashboardBloc) return;

    const handleStateChange = (state: DashboardState) => {
      if (state instanceof DashboardLoading) {
        setIsLoading(true);
        setIsRefreshing(false);
        setError(null);
      } else if (state instanceof DashboardLoaded) {
        setIsLoading(false);
        setIsRefreshing(false);
        setWallet(state.wallet);
        setBalance(state.balance);
        setError(null);
      } else if (state instanceof DashboardRefreshing) {
        setIsLoading(false);
        setIsRefreshing(true);
        setWallet(state.wallet);
        setBalance(state.balance);
        setError(null);
      } else if (state instanceof DashboardError) {
        setIsLoading(false);
        setIsRefreshing(false);
        setError(state.message);
      }
    };

    dashboardBloc.addListener(handleStateChange);
    
    // Load dashboard data on mount
    dashboardBloc.add(new LoadDashboardEvent());

    return () => dashboardBloc.removeListener(handleStateChange);
  }, [dashboardBloc]);

  const handleRefresh = async () => {
    if (!dashboardBloc) {
      Alert.alert('Lỗi', 'Dashboard chưa được khởi tạo. Vui lòng thử lại.');
      return;
    }
    // Test Moralis API first
    const testAddress = '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d3b6'; // Vitalik's address for testing
    console.log('Testing Moralis API...');
    await testMoralisAPI(testAddress);
    
    await dashboardBloc.add(new RefreshDashboardEvent());
  };

  const handleSend = () => {
    // Navigate to send screen (to be implemented)
    Alert.alert('Thông báo', 'Tính năng gửi sẽ được thêm trong phiên bản tiếp theo');
  };

  const handleReceive = () => {
    // Navigate to receive screen (to be implemented)
    Alert.alert('Thông báo', 'Tính năng nhận sẽ được thêm trong phiên bản tiếp theo');
  };

  const handleSwap = () => {
    // Navigate to swap screen
    navigation.navigate('Swap');
  };

  const renderTokenItem = (token: TokenEntity, index: number) => {
    const tokenValue = parseFloat(token.balance) * token.priceUSD;
    
    return (
      <View key={`${token.address}-${index}`} style={styles.tokenItem}>
        <View style={styles.tokenLeft}>
          <View style={styles.tokenIcon}>
            {token.logoUri ? (
              <Image source={{ uri: token.logoUri }} style={styles.tokenLogo} />
            ) : (
              <Text style={styles.tokenIconText}>{token.symbol.charAt(0)}</Text>
            )}
          </View>
          <View style={styles.tokenInfo}>
            <Text style={styles.tokenName}>{token.name}</Text>
            <Text style={styles.tokenSymbol}>{token.symbol}</Text>
          </View>
        </View>
        <View style={styles.tokenRight}>
          <Text style={styles.tokenBalance}>
            {formatTokenBalance(token.balance, token.symbol)} {token.symbol}
          </Text>
          <Text style={styles.tokenValue}>
            {token.priceUSD > 0 ? formatCurrency(tokenValue) : 'Không xác định'}
          </Text>
        </View>
      </View>
    );
  };

  if (isLoading && !wallet) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={styles.loadingText}>Đang tải dữ liệu ví...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error && !wallet) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Có lỗi xảy ra</Text>
          <Text style={styles.errorMessage}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => dashboardBloc.add(new LoadDashboardEvent())}
            activeOpacity={0.8}
          >
            <Text style={styles.retryButtonText}>Thử lại</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            colors={['#3b82f6']}
            tintColor="#3b82f6"
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.greeting}>Xin chào!</Text>
          <Text style={styles.walletAddress}>
            {wallet ? truncateAddress(wallet.address) : 'Đang tải...'}
          </Text>
        </View>

        {/* Total Balance */}
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Tổng số dư</Text>
          <Text style={styles.balanceAmount}>
            {balance ? formatCurrency(balance.totalBalanceUSD) : '$0.00'}
          </Text>
          <Text style={styles.balanceSubtext}>
            {balance ? `${balance.tokens.length} token` : '0 token'}
          </Text>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleSend}
            activeOpacity={0.8}
          >
            <View style={styles.actionIcon}>
              <Text style={styles.actionIconText}>↑</Text>
            </View>
            <Text style={styles.actionText}>Gửi</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleReceive}
            activeOpacity={0.8}
          >
            <View style={styles.actionIcon}>
              <Text style={styles.actionIconText}>↓</Text>
            </View>
            <Text style={styles.actionText}>Nhận</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleSwap}
            activeOpacity={0.8}
          >
            <View style={styles.actionIcon}>
              <Text style={styles.actionIconText}>⇄</Text>
            </View>
            <Text style={styles.actionText}>Mua/Bán</Text>
          </TouchableOpacity>
        </View>

        {/* Token List */}
        <View style={styles.tokenSection}>
          <Text style={styles.sectionTitle}>Tài sản</Text>
          {balance && balance.tokens.length > 0 ? (
            balance.tokens.map((token: TokenEntity, index: number) => 
              renderTokenItem(token, index)
            )
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>Không có token nào</Text>
            </View>
          )}
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
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6b7280',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ef4444',
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 16,
  },
  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  walletAddress: {
    fontSize: 14,
    color: '#6b7280',
    fontFamily: 'monospace',
  },
  balanceCard: {
    marginHorizontal: 24,
    backgroundColor: '#3b82f6',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 24,
  },
  balanceLabel: {
    fontSize: 16,
    color: '#dbeafe',
    marginBottom: 8,
  },
  balanceAmount: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  balanceSubtext: {
    fontSize: 14,
    color: '#dbeafe',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 24,
    marginBottom: 32,
  },
  actionButton: {
    alignItems: 'center',
  },
  actionIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  actionIconText: {
    fontSize: 24,
    color: '#374151',
  },
  actionText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  tokenSection: {
    paddingHorizontal: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 16,
  },
  tokenItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  tokenLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  tokenIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  tokenLogo: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  tokenIconText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#374151',
  },
  tokenInfo: {
    flex: 1,
  },
  tokenName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 2,
  },
  tokenSymbol: {
    fontSize: 14,
    color: '#6b7280',
  },
  tokenRight: {
    alignItems: 'flex-end',
  },
  tokenBalance: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 2,
  },
  tokenValue: {
    fontSize: 14,
    color: '#6b7280',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#6b7280',
  },
});
