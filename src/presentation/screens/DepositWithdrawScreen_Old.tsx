import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeColors } from '../../core/theme';
import { DashboardBloc } from '../blocs/dashboard_bloc';
import { LoadDashboardEvent } from '../blocs/dashboard_event';
import { DashboardState, DashboardLoading, DashboardLoaded, DashboardError } from '../blocs/dashboard_state';
import { ServiceLocator } from '../../core/di/service_locator';
import { VietnamBankingService, BankInfo, RECEIVER_BANK } from '../../data/services/vietnam_banking_service';
import { finanBackendService, ExchangeRates } from '../../data/services/finan_backend_service';
import { GetCurrentWalletUseCase } from '../../domain/usecases/dashboard_usecases';

// Import new UI components
import { TabSelector } from '../components/ui';
import { DepositForm } from '../components/deposit';
import { WithdrawForm } from '../components/withdraw';

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

  // Vietnam Banking states
  const [selectedBank, setSelectedBank] = useState<BankInfo | null>(null);
  const [exchangeRate, setExchangeRate] = useState(24500);
  const [vndAmount, setVndAmount] = useState(0);
  const [transactionId, setTransactionId] = useState('');
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [showBankSelection, setShowBankSelection] = useState(false);
  const [showPaymentDetails, setShowPaymentDetails] = useState(false);
  const [showPaymentInfo, setShowPaymentInfo] = useState(false); // Dropdown toggle

  // Backend integration states
  const [backendExchangeRates, setBackendExchangeRates] = useState<ExchangeRates | null>(null);
  const [backendConnected, setBackendConnected] = useState<boolean>(false);

  // Vietnam Banking Service
  const bankingService = VietnamBankingService.getInstance();

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
    
    // Kiểm tra current state của DashboardBloc
    const currentState = dashboardBloc.state;
    console.log('🔍 DepositWithdraw checking current state:', currentState?.constructor?.name);
    
    if (currentState instanceof DashboardLoaded) {
      setIsLoading(false);
      setBalance(currentState.balance);
      console.log('✅ DepositWithdraw sử dụng balance có sẵn từ Dashboard:', currentState.balance);
    } else if (currentState instanceof DashboardError) {
      setIsLoading(false);
      console.error('Dashboard error:', currentState.message);
    } else {
      // Nếu Dashboard chưa load data, trigger load một lần
      console.log('🔄 Dashboard chưa có data, trigger load...');
      dashboardBloc.add(new LoadDashboardEvent());
    }
    
    // Fallback: Nếu sau 5 giây vẫn loading, tự động tắt spinner
    const fallbackTimer = setTimeout(() => {
      setIsLoading(false);
      console.log('⏰ DepositWithdraw timeout - tắt loading spinner (fallback)');
    }, 5000);
    
    console.log('👂 DepositWithdraw screen listening for balance updates (passive mode)');

    return () => {
      dashboardBloc.removeListener(handleStateChange);
      clearTimeout(fallbackTimer);
    };
  }, [dashboardBloc]); // Chỉ depend vào dashboardBloc, không depend vào isLoading

  // Get USDT balance from dashboard data
  const getUSDTBalance = (): string => {
    console.log('🔍 getUSDTBalance called - balance:', balance);
    
    if (!balance || !balance.tokens) {
      console.log('❌ No balance or tokens data available');
      return '0.00';
    }
    
    console.log('📋 Available tokens:', balance.tokens.map((t: any) => `${t.symbol}: ${t.balance}`));
    
    const usdtToken = balance.tokens.find((token: any) => 
      token.symbol === 'USDT' || token.address?.toLowerCase().includes('usdt')
    );
    
    if (usdtToken) {
      const formattedBalance = parseFloat(usdtToken.balance || '0').toFixed(2);
      console.log('✅ Found USDT token:', usdtToken.symbol, 'balance:', formattedBalance);
      return formattedBalance;
    } else {
      console.log('❌ USDT token not found in balance data');
      return '0.00';
    }
  };

  const tokenInfo = {
    symbol: 'USDT',
    name: 'Tether USD',
    balance: getUSDTBalance(),
    icon: '💵'
  };

  // Load exchange rate và backend data khi component mount
  useEffect(() => {
    loadExchangeRate();
    loadBackendData();
  }, []);



  // Update VND amount khi USDT amount thay đổi
  useEffect(() => {
    if (amount && !isNaN(parseFloat(amount))) {
      const usdtAmount = parseFloat(amount);
      
      // FIX: Sử dụng tỷ giá từ backend thay vì banking service
      // Ưu tiên: backendExchangeRates > exchangeRate (fallback) > banking service
      let baseRate = exchangeRate; // Fallback từ banking service
      
      if (backendExchangeRates && backendExchangeRates.usdToVnd) {
        baseRate = backendExchangeRates.usdToVnd; // Ưu tiên tỷ giá từ backend
        console.log('💰 Sử dụng tỷ giá backend làm base rate:', baseRate);
      } else {
        console.log('💰 Sử dụng tỷ giá fallback làm base rate:', baseRate);
      }
      
      // SPREAD LOGIC: Tab rút tiền thấp hơn tab nạp tiền 600 VND
      const SPREAD_AMOUNT = 600; // VND
      let rateToUse = baseRate;
      
      if (activeTab === 'withdraw') {
        // Tab rút tiền: Tỷ giá thấp hơn (user nhận ít VND khi bán USDT)
        rateToUse = baseRate - SPREAD_AMOUNT;
        console.log(`💸 Tab RÚT TIỀN: ${baseRate} - ${SPREAD_AMOUNT} = ${rateToUse} VND/USD`);
      } else {
        // Tab nạp tiền: Tỷ giá gốc (user trả nhiều VND để mua USDT)
        rateToUse = baseRate;
        console.log(`💰 Tab NẠP TIỀN: ${rateToUse} VND/USD (tỷ giá gốc)`);
      }
      
      const calculatedVND = Math.ceil(usdtAmount * rateToUse);
      setVndAmount(calculatedVND);
      
      console.log(`💱 Tính toán VND [${activeTab.toUpperCase()}]: ${usdtAmount} USDT × ${rateToUse} = ${calculatedVND} VND`);
    } else {
      setVndAmount(0);
    }
  }, [amount, exchangeRate, backendExchangeRates, activeTab]);

  const loadExchangeRate = async () => {
    try {
      const rate = await bankingService.getExchangeRate();
      setExchangeRate(rate);
      console.log('💱 Tỷ giá USD/VND từ banking service:', rate);
    } catch (error) {
      console.error('❌ Lỗi load tỷ giá từ banking service:', error);
    }
  };

  const loadBackendData = async () => {
    try {
      console.log('🔄 Đang load dữ liệu backend (chỉ tỷ giá)...');

      // Load exchange rates from backend
      console.log('🔄 Đang tải tỷ giá từ Finan Backend...');
      const rates = await finanBackendService.getExchangeRates();
      
      // DEBUG: Kiểm tra chi tiết response từ backend
      console.log('🔍 DEBUG Backend Exchange Rates Response:');
      console.log('   - Raw response:', JSON.stringify(rates, null, 2));
      console.log('   - rates type:', typeof rates);
      console.log('   - rates.success:', rates?.success);
      console.log('   - rates.rates?.usdToVnd:', rates?.rates?.usdToVnd);
      console.log('   - rates.rates?.lastUpdated:', rates?.rates?.lastUpdated);
      
      // FIX: Backend trả về { success: true, rates: { usdToVnd, lastUpdated } }
      // Cần truy cập rates.rates thay vì rates trực tiếp
      const exchangeRatesData = rates?.rates;
      
      if (exchangeRatesData) {
        setBackendExchangeRates(exchangeRatesData);
        setBackendConnected(rates?.success === true);
        
        // Sử dụng tỷ giá từ backend nếu có
        if (exchangeRatesData.usdToVnd) {
          setExchangeRate(exchangeRatesData.usdToVnd);
          console.log('✅ Sử dụng tỷ giá từ backend:', exchangeRatesData.usdToVnd);
        } else {
          console.warn('⚠️ Backend không trả về tỷ giá hợp lệ');
        }
      } else {
        console.warn('⚠️ Backend response không có rates data');
        setBackendConnected(false);
      }
      
      console.log('✅ Tỷ giá backend đã tải:', rates);
    } catch (error) {
      console.warn('⚠️ Không thể tải dữ liệu từ backend:', error);
      setBackendConnected(false);
      // Fallback to banking service exchange rate
    }
  };

  // Get wallet address from DashboardBloc (không cần load orders)
  useEffect(() => {
    const getCurrentWallet = async () => {
      try {
        const getCurrentWalletUseCase = ServiceLocator.get('GetCurrentWalletUseCase') as GetCurrentWalletUseCase;
        const wallet = await getCurrentWalletUseCase.execute();
        console.log('✅ Đã lấy wallet address (không load orders)');
      } catch (error) {
        console.error('Failed to get wallet address:', error);
      }
    };

    getCurrentWallet();
  }, []);

  const handleDeposit = () => {
    if (!amount || parseFloat(amount) <= 0) {
      Alert.alert('Lỗi', 'Vui lòng nhập số lượng USDT hợp lệ');
      return;
    }

    // Sử dụng tài khoản nhận cố định (RECEIVER_BANK)
    setSelectedBank(RECEIVER_BANK);
    
    // Tạo transaction ID và QR code
    const txId = bankingService.generateTransactionId();
    setTransactionId(txId);
    
    const content = bankingService.generateTransferContent(txId, parseFloat(amount));
    const qrUrl = bankingService.generateVietQRCode(RECEIVER_BANK, vndAmount, content);
    setQrCodeUrl(qrUrl);
    
    setShowPaymentDetails(true);
  };

  const handleBankSelection = (userBank: BankInfo) => {
    setShowBankSelection(false);
    
    // Tài khoản nhận luôn là MB Bank của bạn
    const receiverBank = VIETNAM_BANKS[0]; // MB Bank
    setSelectedBank(receiverBank);
    
    // Tạo transaction ID và QR code
    const txId = bankingService.generateTransactionId();
    setTransactionId(txId);
    
    const content = bankingService.generateTransferContent(txId, parseFloat(amount));
    const qrUrl = bankingService.generateVietQRCode(receiverBank, vndAmount, content);
    setQrCodeUrl(qrUrl);
    
    setShowPaymentDetails(true);
  };

  const handleOpenBankingApp = async () => {
    if (!selectedBank) return;
    
    const content = bankingService.generateTransferContent(transactionId, parseFloat(amount));
    const success = await bankingService.openBankingApp(selectedBank, vndAmount, content);
    
    if (success) {
      Alert.alert(
        'Thành công',
        'Đã mở ứng dụng ngân hàng. Vui lòng hoàn tất giao dịch chuyển khoản.',
        [{ text: 'OK' }]
      );
    }
  };



  const handleCopyAccountInfo = () => {
    if (!selectedBank) return;
    
    const accountInfo = `${selectedBank.shortName}\nSTK: ${selectedBank.accountNumber}\nTên: ${selectedBank.accountName}\nSố tiền: ${(vndAmount || 0).toLocaleString('vi-VN')} VND\nNội dung: ${bankingService.generateTransferContent(transactionId, parseFloat(amount))}`;
    
    Clipboard.setString(accountInfo);
    Alert.alert('Thành công', 'Đã sao chép thông tin tài khoản');
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
    // Vietnam Banking styles
    exchangeRateCard: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 16,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: '#e5e7eb',
    },
    exchangeRateText: {
      fontSize: 14,
      color: colors.textSecondary,
      textAlign: 'center',
    },
    vndAmountText: {
      fontSize: 16,
      fontWeight: '600',
      color: '#059669',
      textAlign: 'center',
      marginTop: 4,
    },
    bankSelectionModal: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1000,
    },
    bankSelectionContent: {
      backgroundColor: colors.background,
      borderRadius: 16,
      padding: 20,
      margin: 20,
      maxHeight: '80%',
    },
    bankSelectionTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 8,
      textAlign: 'center',
    },
    bankSelectionSubtitle: {
      fontSize: 14,
      color: colors.textSecondary,
      marginBottom: 16,
      textAlign: 'center',
    },
    bankItem: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
      backgroundColor: colors.surface,
      borderRadius: 12,
      marginBottom: 12,
    },
    bankLogo: {
      fontSize: 24,
      marginRight: 12,
    },
    bankInfo: {
      flex: 1,
    },
    bankName: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
    },
    bankAccount: {
      fontSize: 12,
      color: colors.textSecondary,
      marginTop: 2,
    },
    paymentDetailsModal: {
      position: 'absolute',
      top: insets.top, // Respect safe area
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: colors.background,
      zIndex: 1000,
    },
    paymentHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 20,
      paddingTop: 16, // Reduce top padding since we already have insets.top
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    paymentTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.text,
    },
    closeButton: {
      padding: 8,
    },
    closeButtonText: {
      fontSize: 16,
      color: '#3b82f6',
    },
    paymentContent: {
      flex: 1,
      padding: 20,
    },
    qrCodeContainer: {
      alignItems: 'center',
      marginBottom: 24,
    },
    qrCodeImage: {
      width: 200,
      height: 200,
      borderRadius: 12,
    },
    paymentInfoCard: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 16,
      marginBottom: 16,
    },
    paymentInfoHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16,
      paddingBottom: 12,
      borderBottomWidth: 1,
      borderBottomColor: '#e5e7eb',
    },
    paymentInfoTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
    },
    copyIconButton: {
      padding: 8,
      borderRadius: 8,
      backgroundColor: '#f3f4f6',
    },
    copyIcon: {
      fontSize: 18,
    },
    headerActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    dropdownIcon: {
      fontSize: 16,
      color: colors.textSecondary,
    },
    paymentInfoRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    paymentInfoLabel: {
      fontSize: 14,
      color: colors.textSecondary,
    },
    paymentInfoValue: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.text,
      flex: 1,
      textAlign: 'right',
    },
    actionButtonsContainer: {
      flexDirection: 'row',
      gap: 12,
      marginTop: 20,
    },
    actionButton: {
      flex: 1,
      backgroundColor: '#3b82f6',
      borderRadius: 12,
      padding: 16,
      alignItems: 'center',
    },
    secondaryActionButton: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    actionButtonText: {
      fontSize: 16,
      fontWeight: '600',
      color: 'white',
    },
    secondaryActionButtonText: {
      color: colors.text,
    },
    // Bank Apps Grid styles
    bankAppsContainer: {
      marginTop: 20,
    },
    bankAppsTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 16,
      textAlign: 'center',
    },
    bankAppsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
      gap: 12,
    },
    bankAppButton: {
      width: '30%',
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 12,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.border,
    },
    bankAppLogo: {
      fontSize: 24,
      marginBottom: 4,
    },
    bankAppLogoImage: {
      width: 40,
      height: 40,
      marginBottom: 4,
    },
    bankAppName: {
      fontSize: 12,
      color: colors.text,
      textAlign: 'center',
      fontWeight: '500',
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



          {/* Exchange Rate Card - hiển thị cho cả nạp tiền và rút tiền */}
          {amount && parseFloat(amount) > 0 && (
            <View style={styles.exchangeRateCard}>
              <Text style={styles.exchangeRateText}>
                Tỷ giá {activeTab === 'deposit' ? 'nạp tiền' : 'rút tiền'}: 1 USDT = {(() => {
                  // Tính tỷ giá hiển thị theo tab
                  let baseRate = exchangeRate || 0;
                  if (backendExchangeRates && backendExchangeRates.usdToVnd) {
                    baseRate = backendExchangeRates.usdToVnd;
                  }
                  const displayRate = activeTab === 'withdraw' ? baseRate - 600 : baseRate;
                  return displayRate.toLocaleString('vi-VN');
                })()} VND
              </Text>
              <Text style={styles.vndAmountText}>
                ≈ {(vndAmount || 0).toLocaleString('vi-VN')} VND
              </Text>
              {activeTab === 'withdraw' && (
                <Text style={{
                  fontSize: 12,
                  color: '#dc2626',
                  marginTop: 4,
                  fontStyle: 'italic',
                  textAlign: 'center',
                }}>
                  Bạn sẽ nhận được số VND trên khi rút {parseFloat(amount || '0')} USDT
                </Text>
              )}
            </View>
          )}

          <TouchableOpacity
            style={styles.button}
            onPress={activeTab === 'deposit' ? handleDeposit : handleWithdraw}
          >
            <Text style={styles.buttonText}>
              {activeTab === 'deposit' ? '🔄 Nạp tiền' : '💸 Rút tiền'}
            </Text>
          </TouchableOpacity>
        </View>

      </ScrollView>



      {/* Payment Details Modal */}
      {showPaymentDetails && selectedBank && (
        <View style={styles.paymentDetailsModal}>
          <View style={styles.paymentHeader}>
            <Text style={styles.paymentTitle}>Thông tin chuyển khoản</Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowPaymentDetails(false)}
            >
              <Text style={styles.closeButtonText}>Đóng</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.paymentContent} showsVerticalScrollIndicator={false}>
            {/* QR Code */}
            <View style={styles.qrCodeContainer}>
              <Image
                source={{ uri: qrCodeUrl }}
                style={styles.qrCodeImage}
                resizeMode="contain"
              />
              <Text style={styles.exchangeRateText}>
                Quét mã QR để chuyển khoản
              </Text>
            </View>

            {/* Payment Information */}
            <View style={styles.paymentInfoCard}>
              <TouchableOpacity 
                style={styles.paymentInfoHeader}
                onPress={() => setShowPaymentInfo(!showPaymentInfo)}
              >
                <Text style={styles.paymentInfoTitle}>Thông tin chuyển khoản</Text>
                <View style={styles.headerActions}>
                  <TouchableOpacity
                    style={styles.copyIconButton}
                    onPress={handleCopyAccountInfo}
                  >
                    <Text style={styles.copyIcon}>📋</Text>
                  </TouchableOpacity>
                  <Text style={styles.dropdownIcon}>
                    {showPaymentInfo ? '▲' : '▼'}
                  </Text>
                </View>
              </TouchableOpacity>
              
              {showPaymentInfo && (
                <>
                  <View style={styles.paymentInfoRow}>
                    <Text style={styles.paymentInfoLabel}>Ngân hàng:</Text>
                    <Text style={styles.paymentInfoValue}>{selectedBank.shortName}</Text>
                  </View>
                  <View style={styles.paymentInfoRow}>
                    <Text style={styles.paymentInfoLabel}>Số tài khoản:</Text>
                    <Text style={styles.paymentInfoValue}>{selectedBank.accountNumber}</Text>
                  </View>
                  <View style={styles.paymentInfoRow}>
                    <Text style={styles.paymentInfoLabel}>Tên tài khoản:</Text>
                    <Text style={styles.paymentInfoValue}>{selectedBank.accountName}</Text>
                  </View>
                  <View style={styles.paymentInfoRow}>
                    <Text style={styles.paymentInfoLabel}>Số tiền:</Text>
                    <Text style={[styles.paymentInfoValue, { color: '#059669', fontWeight: 'bold' }]}>
                      {(vndAmount || 0).toLocaleString('vi-VN')} VND
                    </Text>
                  </View>
                  <View style={styles.paymentInfoRow}>
                    <Text style={styles.paymentInfoLabel}>Nội dung:</Text>
                    <Text style={styles.paymentInfoValue}>
                      {bankingService.generateTransferContent(transactionId, parseFloat(amount))}
                    </Text>
                  </View>
                  <View style={styles.paymentInfoRow}>
                    <Text style={styles.paymentInfoLabel}>Mã giao dịch:</Text>
                    <Text style={styles.paymentInfoValue}>{transactionId}</Text>
                  </View>
                </>
              )}
            </View>


          </ScrollView>
        </View>
      )}
    </SafeAreaView>
  );
};
