import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
  FlatList,
  Alert,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeColors } from '../../core/theme';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { CompositeNavigationProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { TabParamList, RootStackParamList } from '../navigation/types';
import { DashboardBloc } from '../blocs/dashboard_bloc';
import { LoadDashboardEvent, RefreshDashboardEvent } from '../blocs/dashboard_event';
import { DashboardState, DashboardLoading, DashboardLoaded, DashboardRefreshing, DashboardError } from '../blocs/dashboard_state';
import { ServiceLocator } from '../../core/di/service_locator';

import { formatCurrency, formatTokenBalance, truncateAddress } from '../../core/utils/format_utils';
import { TokenEntity } from '../../domain/entities/token_entity';

type DashboardScreenNavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<TabParamList, 'Dashboard'>,
  StackNavigationProp<RootStackParamList>
>;

interface Props {
  navigation: DashboardScreenNavigationProp;
}

export const DashboardScreen: React.FC<Props> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
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
    
    await dashboardBloc.add(new RefreshDashboardEvent());
  };

  const handleSend = () => {
    // Navigate to send screen
    navigation.navigate('Send');
  };

  const handleReceive = () => {
    // Navigate to receive screen
    navigation.navigate('Receive');
  };

  const handleSwap = () => {
    // Navigate to swap screen
    navigation.navigate('Swap');
  };

  const renderTokenItem = (token: TokenEntity, index: number) => {
    const tokenValue = parseFloat(token.balance) * token.priceUSD;
    
    return (
      <View key={`${token.address}-${index}`} style={{
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        backgroundColor: colors.background,
      }}>
        {/* Token Info */}
        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
          <View style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: colors.surfaceSecondary,
            marginRight: 12,
            justifyContent: 'center',
            alignItems: 'center',
            position: 'relative',
          }}>
            {token.logoUri ? (
              <Image 
                source={{ uri: token.logoUri }} 
                style={{ width: 32, height: 32, borderRadius: 16 }}
                onError={() => {}}
              />
            ) : (
              <Text style={{ fontSize: 16, fontWeight: 'bold', color: colors.textSecondary }}>
                {token.symbol.charAt(0)}
              </Text>
            )}
            
            {/* Chain Logo Badge */}
            {token.chainLogo && (
              <View style={{
                position: 'absolute',
                bottom: -2,
                right: -2,
                width: 16,
                height: 16,
                borderRadius: 8,
                backgroundColor: colors.background,
                borderWidth: 1,
                borderColor: colors.border,
                justifyContent: 'center',
                alignItems: 'center',
              }}>
                <Image 
                  source={{ uri: token.chainLogo }} 
                  style={{ width: 12, height: 12, borderRadius: 6 }}
                  onError={() => {}}
                />
              </View>
            )}
          </View>
          
          <View style={{ flex: 1 }}>
            <Text style={{
              fontSize: 16,
              fontWeight: '600',
              color: colors.text,
              marginBottom: 2,
            }}>
              {token.symbol}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={{
                fontSize: 14,
                color: colors.textSecondary,
              }}>
                {token.name}
              </Text>
              {token.balance && parseFloat(token.balance) > 0 && (
                <Text style={{
                  fontSize: 14,
                  color: '#047857',
                  fontWeight: '500',
                  marginLeft: 8,
                }}>
                  {formatTokenBalance(token.balance, token.symbol)} {token.symbol}
                </Text>
              )}
            </View>
          </View>
        </View>

        {/* Price Info */}
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={{
            fontSize: 16,
            fontWeight: '600',
            color: colors.text,
          }}>
            {token.priceUSD > 0 ? formatCurrency(tokenValue) : 'N/A'}
          </Text>
        </View>
      </View>
    );
  };

  if (isLoading && !wallet) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.text }]}>Đang tải dữ liệu ví...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error && !wallet) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.errorContainer}>
          <Text style={[styles.errorTitle, { color: colors.text }]}>Có lỗi xảy ra</Text>
          <Text style={[styles.errorMessage, { color: colors.textSecondary }]}>{error}</Text>
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: colors.primary }]}
            onPress={() => dashboardBloc?.add(new LoadDashboardEvent())}
            activeOpacity={0.8}
          >
            <Text style={[styles.retryButtonText, { color: colors.textInverse }]}>Thử lại</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        style={[styles.scrollView, { backgroundColor: colors.background }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
      >
        {/* Header */}
        <View style={[styles.header, { paddingTop: Math.max(insets.top, 20) }]}>
          <Text style={[styles.greeting, { color: colors.text }]}>Xin chào!</Text>
          <Text style={[styles.walletAddress, { color: colors.textSecondary }]}>
            {wallet ? truncateAddress(wallet.address) : 'Đang tải...'}
          </Text>
        </View>

        {/* Total Balance */}
        <View style={[styles.balanceCard, { backgroundColor: colors.card }]}>
          <Text style={[styles.balanceLabel, { color: colors.textSecondary }]}>Tổng số dư</Text>
          <Text style={[styles.balanceAmount, { color: colors.text }]}>
            {balance ? formatCurrency(balance.totalBalanceUSD) : '$0.00'}
          </Text>
          <Text style={[styles.balanceSubtext, { color: colors.textTertiary }]}>
            {balance ? `${balance.tokens.length} token` : '0 token'}
          </Text>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colors.card }]}
            onPress={handleSend}
            activeOpacity={0.8}
          >
            <View style={[styles.actionIcon, { backgroundColor: colors.primary }]}>
              <Text style={[styles.actionIconText, { color: colors.textInverse }]}>↑</Text>
            </View>
            <Text style={[styles.actionText, { color: colors.text }]}>Gửi</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colors.card }]}
            onPress={handleReceive}
            activeOpacity={0.8}
          >
            <View style={[styles.actionIcon, { backgroundColor: colors.primary }]}>
              <Text style={[styles.actionIconText, { color: colors.textInverse }]}>↓</Text>
            </View>
            <Text style={[styles.actionText, { color: colors.text }]}>Nhận</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colors.card }]}
            onPress={handleSwap}
            activeOpacity={0.8}
          >
            <View style={[styles.actionIcon, { backgroundColor: colors.primary }]}>
              <Text style={[styles.actionIconText, { color: colors.textInverse }]}>⇄</Text>
            </View>
            <Text style={[styles.actionText, { color: colors.text }]}>Mua/Bán</Text>
          </TouchableOpacity>
        </View>

        {/* Token List Header */}
        <View style={{ paddingHorizontal: 16, paddingVertical: 16, backgroundColor: colors.background }}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Tài sản</Text>
        </View>
      </ScrollView>

      {/* Token List - Separate FlatList for better spacing */}
      {balance && balance.tokens.length > 0 ? (
        <FlatList
          data={balance.tokens}
          renderItem={({ item, index }: { item: TokenEntity, index: number }) => renderTokenItem(item, index)}
          keyExtractor={(item: TokenEntity, index: number) => `${item.address}-${index}`}
          showsVerticalScrollIndicator={false}
          style={{ flex: 1, marginBottom: -88 }}
          contentContainerStyle={{ paddingBottom: 88 }}
        />
      ) : (
        <View style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          paddingHorizontal: 32,
        }}>
          <Text style={{
            fontSize: 16,
            color: colors.textSecondary,
            textAlign: 'center',
          }}>
            Không có token nào
          </Text>
        </View>
      )}
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
    position: 'relative',
  },
  tokenLogo: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  chainBadge: {
    width: 16,
    height: 16,
    borderRadius: 8,
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
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
