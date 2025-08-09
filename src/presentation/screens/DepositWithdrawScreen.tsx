import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeColors } from '../../core/theme';
import { DashboardBloc } from '../blocs/dashboard_bloc';
import { LoadDashboardEvent } from '../blocs/dashboard_event';
import { DashboardState, DashboardLoading, DashboardLoaded, DashboardError } from '../blocs/dashboard_state';
import { ServiceLocator } from '../../core/di/service_locator';

export const DepositWithdrawScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const [activeTab, setActiveTab] = useState<'deposit' | 'withdraw'>('deposit');
  const [amount, setAmount] = useState('');
  const selectedToken = 'USDT'; // Chỉ hỗ trợ USDT

  // Dashboard integration states
  const [isLoading, setIsLoading] = useState(true);
  const [balance, setBalance] = useState<any>(null);
  const [dashboardBloc, setDashboardBloc] = useState<DashboardBloc | null>(null);

  // Initialize DashboardBloc
  useEffect(() => {
    try {
      const bloc = ServiceLocator.get('DashboardBloc') as DashboardBloc;
      setDashboardBloc(bloc);
    } catch (error) {
      console.error('Failed to get DashboardBloc:', error);
      setIsLoading(false);
    }
  }, []);

  // Listen to dashboard state changes (passive mode - không trigger API)
  useEffect(() => {
    if (!dashboardBloc) return;

    const handleStateChange = (state: DashboardState) => {
      if (state instanceof DashboardLoading) {
        setIsLoading(true);
      } else if (state instanceof DashboardLoaded) {
        setIsLoading(false);
        setBalance(state.balance);
        console.log('✅ DepositWithdraw nhận balance từ Dashboard (passive)');
      } else if (state instanceof DashboardError) {
        setIsLoading(false);
        console.error('Dashboard error:', state.message);
      }
    };

    dashboardBloc.addListener(handleStateChange);
    
    // KHÔNG gọi LoadDashboardEvent để tránh duplicate API calls
    // Chỉ listen data từ Dashboard screen
    console.log('👂 DepositWithdraw screen listening for balance updates (passive mode)');

    return () => dashboardBloc.removeListener(handleStateChange);
  }, [dashboardBloc]);

  // Get USDT balance from dashboard data
  const getUSDTBalance = (): string => {
    if (!balance || !balance.tokens) return '0.00';
    
    const usdtToken = balance.tokens.find((token: any) => 
      token.symbol === 'USDT' || token.address?.toLowerCase().includes('usdt')
    );
    
    return usdtToken ? parseFloat(usdtToken.balance || '0').toFixed(2) : '0.00';
  };

  const tokenInfo = {
    symbol: 'USDT',
    name: 'Tether USD',
    balance: getUSDTBalance(),
    icon: '💵'
  };

  const handleDeposit = () => {
    Alert.alert(
      'Nạp tiền',
      `Tính năng nạp ${amount} ${selectedToken} sẽ được phát triển trong phiên bản tiếp theo.`,
      [{ text: 'Đóng' }]
    );
  };

  const handleWithdraw = () => {
    Alert.alert(
      'Rút tiền',
      `Tính năng rút ${amount} ${selectedToken} sẽ được phát triển trong phiên bản tiếp theo.`,
      [{ text: 'Đóng' }]
    );
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      paddingHorizontal: 20,
      paddingTop: 20,
      paddingBottom: 16,
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
    },
    tabContainer: {
      flexDirection: 'row',
      marginHorizontal: 20,
      marginBottom: 24,
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 4,
    },
    tab: {
      flex: 1,
      paddingVertical: 12,
      alignItems: 'center',
      borderRadius: 8,
    },
    activeTab: {
      backgroundColor: '#3b82f6',
    },
    tabText: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    activeTabText: {
      color: 'white',
    },
    content: {
      flex: 1,
      paddingHorizontal: 20,
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 20,
      marginBottom: 20,
    },
    cardTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 16,
    },
    tokenSelector: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: colors.background,
      borderRadius: 12,
      padding: 16,
      marginBottom: 16,
    },
    tokenInfo: {
      flex: 1,
    },
    tokenSymbol: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
    },
    tokenName: {
      fontSize: 14,
      color: colors.textSecondary,
      marginTop: 2,
    },
    tokenBalance: {
      fontSize: 14,
      color: colors.textSecondary,
      textAlign: 'right',
    },
    inputContainer: {
      marginBottom: 20,
    },
    inputLabel: {
      fontSize: 14,
      fontWeight: '500',
      color: colors.text,
      marginBottom: 8,
    },
    input: {
      backgroundColor: colors.background,
      borderRadius: 12,
      padding: 16,
      fontSize: 16,
      color: colors.text,
      borderWidth: 1,
      borderColor: colors.border,
    },
    button: {
      backgroundColor: '#3b82f6',
      borderRadius: 12,
      paddingVertical: 16,
      alignItems: 'center',
      marginTop: 8,
    },
    buttonText: {
      color: 'white',
      fontSize: 16,
      fontWeight: '600',
    },
    infoCard: {
      backgroundColor: '#f0f9ff',
      borderRadius: 12,
      padding: 16,
      marginBottom: 20,
    },
    infoTitle: {
      fontSize: 14,
      fontWeight: '600',
      color: '#0369a1',
      marginBottom: 8,
    },
    infoText: {
      fontSize: 13,
      color: '#0369a1',
      lineHeight: 18,
    },
  });

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Nạp/Rút tiền</Text>
        <Text style={styles.subtitle}>Quản lý số dư trong ví của bạn</Text>
      </View>

      {/* Tab Selector */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'deposit' && styles.activeTab]}
          onPress={() => setActiveTab('deposit')}
        >
          <Text style={[styles.tabText, activeTab === 'deposit' && styles.activeTabText]}>
            💰 Nạp tiền
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'withdraw' && styles.activeTab]}
          onPress={() => setActiveTab('withdraw')}
        >
          <Text style={[styles.tabText, activeTab === 'withdraw' && styles.activeTabText]}>
            💸 Rút tiền
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* USDT Balance Display */}
        <View style={styles.card}>
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            <Text style={[styles.cardTitle, { marginBottom: 0 }]}>💵 Số dư USDT</Text>
            {isLoading ? (
              <ActivityIndicator size="small" color="#16a34a" />
            ) : (
              <Text style={{
                fontSize: 18,
                fontWeight: 'bold',
                color: '#16a34a',
              }}>
                {tokenInfo.balance} USDT
              </Text>
            )}
          </View>
        </View>

        {/* Amount Input */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            {activeTab === 'deposit' ? 'Số tiền nạp' : 'Số tiền rút'}
          </Text>
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Nhập số lượng {selectedToken}</Text>
            <TextInput
              style={styles.input}
              value={amount}
              onChangeText={setAmount}
              placeholder={`0.00 ${selectedToken}`}
              placeholderTextColor={colors.textSecondary}
              keyboardType="decimal-pad"
            />
          </View>

          <TouchableOpacity
            style={styles.button}
            onPress={activeTab === 'deposit' ? handleDeposit : handleWithdraw}
          >
            <Text style={styles.buttonText}>
              {activeTab === 'deposit' ? '🔄 Nạp tiền' : '💸 Rút tiền'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Info Card */}
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>
            {activeTab === 'deposit' ? '📝 Hướng dẫn nạp tiền' : '⚠️ Lưu ý khi rút tiền'}
          </Text>
          <Text style={styles.infoText}>
            {activeTab === 'deposit'
              ? 'Tính năng nạp tiền sẽ hỗ trợ chuyển khoản ngân hàng, ví điện tử và các phương thức thanh toán khác. Hiện tại đang trong quá trình phát triển.'
              : 'Tính năng rút tiền sẽ cho phép chuyển token về ví ngoài hoặc chuyển đổi thành tiền mặt. Vui lòng chờ cập nhật trong phiên bản tiếp theo.'
            }
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};
