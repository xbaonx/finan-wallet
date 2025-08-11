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
  Image,
  Clipboard,
  Share,
  Platform,
} from 'react-native';
import { useRoute } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';
import * as MediaLibrary from 'expo-media-library';
import * as FileSystem from 'expo-file-system';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeColors } from '../../core/theme';
import { DashboardBloc } from '../blocs/dashboard_bloc';
import { LoadDashboardEvent } from '../blocs/dashboard_event';
import { DashboardState, DashboardLoading, DashboardLoaded, DashboardError } from '../blocs/dashboard_state';
import { ServiceLocator } from '../../core/di/service_locator';
import { VietnamBankingService, BankInfo, VIETNAM_BANKS, RECEIVER_BANK } from '../../data/services/vietnam_banking_service';
import { finanBackendService, ExchangeRates, ExchangeRatesResponse, DepositOrderResponse } from '../../data/services/finan_backend_service';
import { GetCurrentWalletUseCase } from '../../domain/usecases/dashboard_usecases';
import { formatVND, formatUSD, formatCrypto, formatExchangeRate } from '../../core/utils/number_formatter';
import { handleInputChange, sanitizeForAPI, parseInputValue } from '../../core/utils/simple_input_formatter';

export const DepositWithdrawScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const route = useRoute();
  const params = route.params as { prefilledAmount?: string; token?: string } | undefined;
  
  const [activeTab, setActiveTab] = useState<'deposit' | 'withdraw'>('deposit');
  const [amount, setAmount] = useState('');
  const [displayAmount, setDisplayAmount] = useState('');
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
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);
  const [currentOrderId, setCurrentOrderId] = useState<string | null>(null);

  // Vietnam Banking Service
  const bankingService = VietnamBankingService.getInstance();

  // Handle navigation params for autofill
  useEffect(() => {
    if (params?.prefilledAmount && params?.token === 'USDT') {
      console.log('🔄 DepositWithdraw nhận params từ SwapScreen:', params);
      
      // Set tab to deposit (nạp tiền)
      setActiveTab('deposit');
      
      // Autofill amount
      const prefilledAmount = params.prefilledAmount;
      setAmount(prefilledAmount);
      setDisplayAmount(prefilledAmount);
      
      // Tính VND amount dựa trên exchange rate
      const numAmount = parseFloat(prefilledAmount);
      if (!isNaN(numAmount)) {
        setVndAmount(numAmount * exchangeRate);
      }
      
      console.log('✅ Đã autofill số lượng USDT cần nạp:', prefilledAmount);
    }
  }, [params, exchangeRate]);

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
      const formattedBalance = formatCrypto(parseFloat(usdtToken.balance || '0'), 'USDT', 2);
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

  const handleDeposit = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      Alert.alert('Lỗi', 'Vui lòng nhập số lượng USDT hợp lệ');
      return;
    }

    // Kiểm tra có wallet address không
    const getCurrentWalletUseCase = ServiceLocator.get('GetCurrentWalletUseCase') as GetCurrentWalletUseCase;
    const currentWallet = await getCurrentWalletUseCase.execute();
    
    if (!currentWallet) {
      Alert.alert('Lỗi', 'Không tìm thấy ví hiện tại. Vui lòng tạo hoặc import ví trước.');
      return;
    }

    setIsSubmittingOrder(true);
    
    try {
      // Tạo transaction ID trước khi gửi lên backend
      const txId = bankingService.generateTransactionId();
      
      // Tạo đơn hàng nạp tiền trên backend
      const orderData = {
        walletAddress: currentWallet.address,
        usdtAmount: parseFloat(amount),
        vndAmount: vndAmount,
        transactionId: txId, // Thêm transactionId theo yêu cầu backend
        bankInfo: {
          bankName: RECEIVER_BANK.name,
          accountNumber: RECEIVER_BANK.accountNumber,
          accountName: RECEIVER_BANK.accountName
        },
        transactionInfo: `Nạp ${amount} USDT từ mobile app - ${new Date().toLocaleString('vi-VN')}`
      };

      console.log('🔄 Đang tạo đơn hàng nạp tiền:', orderData);
      const response: DepositOrderResponse = await finanBackendService.createDepositOrder(orderData);
      
      // Backend trả về: { success: true, message: "...", order: {...} }
      const order = response.order;
      
      console.log('✅ Đơn hàng nạp tiền đã được tạo:', {
        orderId: order.id,
        status: order.status,
        usdtAmount: order.usdtAmount,
        vndAmount: order.vndAmount
      });

      // Lưu order ID và sử dụng transaction ID đã tạo
      setCurrentOrderId(order.id);
      setTransactionId(txId);
      
      // Sử dụng tài khoản nhận cố định (RECEIVER_BANK)
      setSelectedBank(RECEIVER_BANK);
      
      // Tạo QR code với transaction ID đã tạo
      const content = bankingService.generateTransferContent(txId, parseFloat(amount));
      const qrUrl = bankingService.generateVietQRCode(RECEIVER_BANK, vndAmount, content);
      setQrCodeUrl(qrUrl);
      
      setShowPaymentDetails(true);
      
      // Thông báo thành công
      Alert.alert(
        'Thành công',
        `Đơn hàng nạp tiền đã được tạo!\n\nMã đơn hàng: ${order.id}\nSố tiền: ${formatCrypto(order.usdtAmount, 'USDT', 6)}\nTương đương: ${formatVND(order.vndAmount, true)}\n\nVui lòng chuyển khoản theo thông tin bên dưới.`,
        [{ text: 'OK' }]
      );
      
    } catch (error) {
      console.error('❌ Lỗi tạo đơn hàng nạp tiền:', error);
      Alert.alert(
        'Lỗi',
        'Không thể tạo đơn hàng nạp tiền. Vui lòng kiểm tra kết nối mạng và thử lại.\n\n' + 
        (error instanceof Error ? error.message : 'Lỗi không xác định'),
        [{ text: 'Đóng' }]
      );
    } finally {
      setIsSubmittingOrder(false);
    }
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
    
    const accountInfo = `${selectedBank.shortName}\nSTK: ${selectedBank.accountNumber}\nTên: ${selectedBank.accountName}\nSố tiền: ${formatVND(vndAmount || 0)}\nNội dung: ${bankingService.generateTransferContent(transactionId, parseFloat(amount))}`;
    
    Clipboard.setString(accountInfo);
    Alert.alert('Thành công', 'Đã sao chép thông tin tài khoản');
  };

  // Enhanced copy functions for individual items
  const handleCopyText = (text: string, label: string) => {
    Clipboard.setString(text);
    Alert.alert('Đã sao chép', `${label}: ${text}`);
  };

  const handleCopyBankAccount = () => {
    if (!selectedBank) return;
    handleCopyText(selectedBank.accountNumber, 'Số tài khoản');
  };

  const handleCopyAccountName = () => {
    if (!selectedBank) return;
    handleCopyText(selectedBank.accountName, 'Tên tài khoản');
  };

  const handleCopyAmount = () => {
    const amountText = formatVND(vndAmount || 0);
    handleCopyText(amountText, 'Số tiền');
  };

  const handleCopyTransferContent = () => {
    const content = bankingService.generateTransferContent(transactionId, parseFloat(amount));
    handleCopyText(content, 'Nội dung chuyển khoản');
  };

  const handleCopyTransactionId = () => {
    handleCopyText(transactionId, 'Mã giao dịch');
  };

  // QR Code save functionality - Lưu trực tiếp vào thư viện ảnh
  const handleSaveQRCode = async () => {
    try {
      // Yêu cầu quyền truy cập thư viện ảnh
      const { status } = await MediaLibrary.requestPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert(
          'Cần quyền truy cập',
          'Ứng dụng cần quyền truy cập thư viện ảnh để lưu QR code. Vui lòng cấp quyền trong Cài đặt.',
          [
            { text: 'Hủy', style: 'cancel' },
            { text: 'Mở Cài đặt', onPress: () => {
              Alert.alert('Hướng dẫn', 'Vui lòng vào Cài đặt > Finan > Ảnh và cấp quyền truy cập.');
            }}
          ]
        );
        return;
      }

      // Tải và lưu ảnh QR code (không hiển thị loading popup)
      const fileUri = FileSystem.documentDirectory + `qr_code_${transactionId}.png`;
      const downloadResult = await FileSystem.downloadAsync(qrCodeUrl, fileUri);
      
      if (downloadResult.status === 200) {
        // Lưu ảnh vào thư viện
        const asset = await MediaLibrary.createAssetAsync(downloadResult.uri);
        
        // Tạo album riêng cho Finan (tùy chọn)
        try {
          const album = await MediaLibrary.getAlbumAsync('Finan Wallet');
          if (album == null) {
            await MediaLibrary.createAlbumAsync('Finan Wallet', asset, false);
          } else {
            await MediaLibrary.addAssetsToAlbumAsync([asset], album, false);
          }
        } catch (albumError) {
          console.log('Không thể tạo album, lưu vào thư viện chính:', albumError);
        }

        // Xóa file tạm
        await FileSystem.deleteAsync(fileUri, { idempotent: true });

        // Chỉ hiển thị 1 popup thành công duy nhất
        Alert.alert(
          'Lưu thành công! 🎉',
          `QR code đã được lưu vào thư viện ảnh.\n\nMã giao dịch: ${transactionId}`,
          [{ text: 'OK' }]
        );
      } else {
        throw new Error('Không thể tải ảnh QR code');
      }
    } catch (error) {
      console.error('Lỗi lưu QR code:', error);
      Alert.alert(
        'Lỗi lưu ảnh',
        'Không thể lưu QR code. Bạn có thể chụp màn hình để lưu.',
        [{ text: 'OK' }]
      );
    }
  };

  // QR Code share functionality
  const handleShareQRCode = async () => {
    try {
      // Tạo nội dung chia sẻ với định dạng rõ ràng và dễ đọc
      const transferContent = bankingService.generateTransferContent(transactionId, parseFloat(amount));
      
      const shareContent = {
        title: 'Thông tin chuyển khoản - Finan Wallet',
        message: `✨ THÔNG TIN CHUYỂN KHOẢN ✨\n\n` +
                `• Ngân hàng: ${selectedBank?.shortName}\n` +
                `• Số tài khoản: ${selectedBank?.accountNumber}\n` +
                `• Tên tài khoản: ${selectedBank?.accountName}\n` +
                `• Số tiền: ${formatVND(vndAmount || 0)}\n` +
                `• Nội dung chuyển khoản: ${transferContent}\n\n` +
                `💳 Số tiền nạp: ${formatCrypto(parseFloat(amount), 'USDT', 2)}\n` +
                `🔑 Mã giao dịch: ${transactionId}\n\n` +
                `📷 Quét mã QR hoặc truy cập: ${qrCodeUrl}\n\n` +
                `👉 Sau khi chuyển khoản, USDT sẽ được cộng vào ví của bạn trong vòng 5-15 phút.`,
        url: qrCodeUrl, // QR code URL
      };

      // Hiển thị hộp thoại xác nhận trước khi chia sẻ
      Alert.alert(
        'Chia sẻ thông tin chuyển khoản',
        'Bạn có muốn chia sẻ thông tin chuyển khoản và mã QR?',
        [
          { text: 'Hủy', style: 'cancel' },
          { 
            text: 'Chia sẻ', 
            onPress: async () => {
              try {
                const result = await Share.share(shareContent);
                
                if (result.action === Share.sharedAction) {
                  if (result.activityType) {
                    console.log('Shared with activity type:', result.activityType);
                  } else {
                    console.log('QR Code shared successfully');
                    // Thông báo thành công (tùy chọn)
                    // Alert.alert('Thành công', 'Thông tin chuyển khoản đã được chia sẻ');
                  }
                }
              } catch (error) {
                console.error('Share error:', error);
                Alert.alert('Lỗi', 'Không thể chia sẻ thông tin. Vui lòng thử lại.');
              }
            } 
          }
        ]
      );
    } catch (error) {
      Alert.alert('Lỗi', 'Không thể chia sẻ QR code. Vui lòng thử lại.');
      console.error('Share error:', error);
    }
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
      alignItems: 'flex-start',
      marginBottom: 12,
      paddingVertical: 8,
      paddingHorizontal: 12,
      backgroundColor: colors.surface,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
    },
    paymentInfoLabel: {
      fontSize: 14,
      color: colors.textSecondary,
      fontWeight: '500',
      minWidth: 100,
      marginRight: 12,
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
    buttonDisabled: {
      opacity: 0.6,
    },
    buttonLoadingContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
    },
    buttonLoader: {
      marginRight: 8,
    },
    // QR Code Section Styles
    qrCodeSection: {
      alignItems: 'center',
      marginBottom: 24,
    },
    qrCodeTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 16,
      textAlign: 'center',
    },
    qrCodeWrapper: {
      backgroundColor: 'white',
      padding: 16,
      borderRadius: 16,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 4,
      marginBottom: 16,
    },
    qrCodeActions: {
      flexDirection: 'row',
      justifyContent: 'center',
      gap: 16,
    },
    qrActionButton: {
      backgroundColor: colors.surface,
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderRadius: 12,
      alignItems: 'center',
      minWidth: 80,
      borderWidth: 1,
      borderColor: colors.border,
    },
    qrActionButtonIcon: {
      fontSize: 20,
      marginBottom: 4,
    },
    qrActionButtonText: {
      fontSize: 12,
      color: colors.text,
      fontWeight: '500',
    },
    // Order Summary Styles
    orderSummaryCard: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 16,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: '#e3f2fd',
    },
    orderSummaryTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 12,
      textAlign: 'center',
    },
    orderSummaryRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    orderSummaryLabel: {
      fontSize: 14,
      color: colors.textSecondary,
    },
    orderSummaryValue: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.text,
    },
    highlightAmount: {
      color: '#059669',
      fontWeight: 'bold',
      fontSize: 16,
    },
    copyableText: {
      color: colors.primary,
      flex: 1,
      textAlign: 'right',
      marginRight: 8,
    },
    // Updated Payment Info Styles
    copyAllButton: {
      backgroundColor: colors.surface,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.primary,
      flexDirection: 'row',
      alignItems: 'center',
    },
    copyAllButtonText: {
      fontSize: 12,
      color: colors.primary,
      fontWeight: '500',
      marginLeft: 6,
    },
    copyableRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 8,
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: 8,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    copyableContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
      justifyContent: 'flex-end',
    },
    detailCopyIcon: {
      marginLeft: 8,
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
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
            <MaterialIcons name="trending-up" size={16} color={activeTab === 'deposit' ? 'white' : colors.textSecondary} style={{ marginRight: 6 }} />
            <Text style={[styles.tabText, activeTab === 'deposit' && styles.activeTabText]}>
              Nạp tiền
            </Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'withdraw' && styles.activeTab]}
          onPress={() => setActiveTab('withdraw')}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
            <MaterialIcons name="trending-down" size={16} color={activeTab === 'withdraw' ? 'white' : colors.textSecondary} style={{ marginRight: 6 }} />
            <Text style={[styles.tabText, activeTab === 'withdraw' && styles.activeTabText]}>
              Rút tiền
            </Text>
          </View>
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
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <MaterialIcons name="account-balance-wallet" size={18} color={colors.text} style={{ marginRight: 8 }} />
              <Text style={[styles.cardTitle, { marginBottom: 0 }]}>Số dư USDT</Text>
            </View>
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
              value={displayAmount}
              onChangeText={(text) => {
                const { displayValue, rawValue } = handleInputChange(text);
                setDisplayAmount(displayValue);
                setAmount(sanitizeForAPI(rawValue)); // Giữ raw value cho API
              }}
              placeholder={`0,00 ${selectedToken}`}
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
                  return formatVND(displayRate, false);
                })()} VND
              </Text>
              <Text style={styles.vndAmountText}>
                ≈ {formatVND(vndAmount || 0)}
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
            style={[styles.button, (isSubmittingOrder && activeTab === 'deposit') && styles.buttonDisabled]}
            onPress={activeTab === 'deposit' ? handleDeposit : handleWithdraw}
            disabled={isSubmittingOrder && activeTab === 'deposit'}
          >
            {isSubmittingOrder && activeTab === 'deposit' ? (
              <View style={styles.buttonLoadingContainer}>
                <ActivityIndicator size="small" color="white" style={styles.buttonLoader} />
                <Text style={styles.buttonText}>Đang tạo đơn hàng...</Text>
              </View>
            ) : (
              <Text style={styles.buttonText}>
                {activeTab === 'deposit' ? 'Nạp tiền' : 'Rút tiền'}
              </Text>
            )}
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
            {/* QR Code Section */}
            <View style={styles.qrCodeSection}>
              <Text style={styles.qrCodeTitle}>Quét mã QR để chuyển khoản</Text>
              <View style={styles.qrCodeContainer}>
                <View style={styles.qrCodeWrapper}>
                  <Image
                    source={{ uri: qrCodeUrl }}
                    style={styles.qrCodeImage}
                    resizeMode="contain"
                  />
                </View>
                <View style={styles.qrCodeActions}>
                  <TouchableOpacity 
                    style={styles.qrActionButton}
                    onPress={handleSaveQRCode}
                  >
                    <MaterialIcons name="save-alt" size={20} color={colors.primary} />
                    <Text style={styles.qrActionButtonText}>Lưu QR</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.qrActionButton}
                    onPress={handleShareQRCode}
                  >
                    <MaterialIcons name="share" size={20} color={colors.primary} />
                    <Text style={styles.qrActionButtonText}>Chia sẻ</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* Order Summary */}
            <View style={styles.orderSummaryCard}>
              <Text style={styles.orderSummaryTitle}>Thông tin đơn hàng</Text>
              <View style={styles.orderSummaryRow}>
                <Text style={styles.orderSummaryLabel}>Số tiền nạp:</Text>
                <Text style={styles.orderSummaryValue}>{formatCrypto(parseFloat(amount), 'USDT', 2)}</Text>
              </View>
              <View style={styles.orderSummaryRow}>
                <Text style={styles.orderSummaryLabel}>Số tiền chuyển:</Text>
                <Text style={[styles.orderSummaryValue, styles.highlightAmount]}>{formatVND(vndAmount || 0)}</Text>
              </View>
              <View style={styles.orderSummaryRow}>
                <Text style={styles.orderSummaryLabel}>Mã giao dịch:</Text>
                <TouchableOpacity onPress={handleCopyTransactionId} style={styles.copyableContainer}>
                  <Text style={[styles.orderSummaryValue, styles.copyableText]}>{transactionId}</Text>
                  <MaterialIcons name="content-copy" size={16} color={colors.primary} style={styles.detailCopyIcon} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Payment Information */}
            <View style={styles.paymentInfoCard}>
              <View style={styles.paymentInfoHeader}>
                <Text style={styles.paymentInfoTitle}>Thông tin chuyển khoản</Text>
                <TouchableOpacity
                  style={styles.copyAllButton}
                  onPress={handleCopyAccountInfo}
                >
                  <MaterialIcons name="content-copy" size={16} color={colors.primary} />
                  <Text style={styles.copyAllButtonText}>Sao chép tất cả</Text>
                </TouchableOpacity>
              </View>
              
              <View style={styles.paymentInfoRow}>
                <Text style={styles.paymentInfoLabel}>Ngân hàng:</Text>
                <Text style={styles.paymentInfoValue}>{selectedBank.shortName}</Text>
              </View>
              <TouchableOpacity 
                style={styles.copyableRow}
                onPress={handleCopyBankAccount}
              >
                <Text style={styles.paymentInfoLabel}>Số tài khoản:</Text>
                <View style={styles.copyableContainer}>
                  <Text style={[styles.paymentInfoValue, styles.copyableText]}>{selectedBank.accountNumber}</Text>
                  <MaterialIcons name="content-copy" size={16} color={colors.primary} style={styles.detailCopyIcon} />
                </View>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.copyableRow}
                onPress={handleCopyAccountName}
              >
                <Text style={styles.paymentInfoLabel}>Tên tài khoản:</Text>
                <View style={styles.copyableContainer}>
                  <Text style={[styles.paymentInfoValue, styles.copyableText]}>{selectedBank.accountName}</Text>
                  <MaterialIcons name="content-copy" size={16} color={colors.primary} style={styles.detailCopyIcon} />
                </View>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.copyableRow}
                onPress={handleCopyAmount}
              >
                <Text style={styles.paymentInfoLabel}>Số tiền:</Text>
                <View style={styles.copyableContainer}>
                  <Text style={[styles.paymentInfoValue, styles.highlightAmount]}>
                    {formatVND(vndAmount || 0)}
                  </Text>
                  <MaterialIcons name="content-copy" size={16} color={colors.primary} style={styles.detailCopyIcon} />
                </View>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.copyableRow}
                onPress={handleCopyTransferContent}
              >
                <Text style={styles.paymentInfoLabel}>Nội dung:</Text>
                <View style={styles.copyableContainer}>
                  <Text style={[styles.paymentInfoValue, styles.copyableText]}>
                    {bankingService.generateTransferContent(transactionId, parseFloat(amount))}
                  </Text>
                  <MaterialIcons name="content-copy" size={16} color={colors.primary} style={styles.detailCopyIcon} />
                </View>
              </TouchableOpacity>
            </View>

          </ScrollView>
        </View>
      )}
    </SafeAreaView>
  );
};
