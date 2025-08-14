import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  TextInput,
  Modal,
  FlatList,
  ActivityIndicator,
  ScrollView,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
// import { BarCodeScanner } from 'expo-barcode-scanner'; // Requires development build
import { StackNavigationProp } from '@react-navigation/stack';
import { MaterialIcons } from '@expo/vector-icons';
import { RootStackParamList } from '../navigation/types';
import { TransactionUseCases } from '../../domain/usecases/transaction_usecases';
import { SendTransactionRequest } from '../../data/services/transaction_service';
import { formatCurrency, formatTokenBalance, truncateAddress } from '../../core/utils/format_utils';
import { formatUSD, formatCrypto } from '../../core/utils/number_formatter';
import { handleInputChange, sanitizeForAPI, parseInputValue } from '../../core/utils/simple_input_formatter';
import { useThemeColors } from '../../core/theme';
import { LogoComponent } from '../components/LogoComponent';
import { getTokenIcon } from '../../core/utils/token_icon_utils';
import { DashboardBloc } from '../blocs/dashboard_bloc';
import { LoadDashboardEvent } from '../blocs/dashboard_event';
import { ServiceLocator } from '../../core/di/service_locator';

type SendScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Send'>;

interface Props {
  navigation: SendScreenNavigationProp;
}

export const SendScreen: React.FC<Props> = ({ navigation }) => {
  const colors = useThemeColors();
  const [toAddress, setToAddress] = useState('');
  const [amount, setAmount] = useState('');
  const [displayAmount, setDisplayAmount] = useState('');
  const [selectedToken, setSelectedToken] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showTokenSelector, setShowTokenSelector] = useState(false);
  const [showRecentAddresses, setShowRecentAddresses] = useState(false);
  const [selectedFeeOption, setSelectedFeeOption] = useState<'slow' | 'standard' | 'fast'>('standard');
  const [gasEstimate, setGasEstimate] = useState<{
    gasLimit: string;
    gasPrice: string;
    totalFee: string;
    usdValue?: string;
  } | null>(null);
  const [balance, setBalance] = useState<any>(null);
  const [availableTokens, setAvailableTokens] = useState<any[]>([]);
  const [recentAddresses, setRecentAddresses] = useState<string[]>([]);

  const transactionUseCases = new TransactionUseCases();
  const [dashboardBloc] = useState(() => ServiceLocator.get<DashboardBloc>('DashboardBloc'));

  // Load dashboard data
  const loadDashboardData = async () => {
    try {
      // Subscribe to dashboard bloc for balance updates
      const handleStateChange = (newState: any) => {
        console.log('🔄 SendScreen: Nhận dữ liệu từ Dashboard:', newState);
        if (newState.balance) {
          setBalance(newState.balance);
          
          // Tạo danh sách tokens có balance > 0
          const allTokens = [];
          
          // Thêm BNB nếu có balance
          if (newState.balance.nativeToken && parseFloat(newState.balance.nativeToken.balance) > 0) {
            allTokens.push({
              symbol: 'BNB',
              name: 'Binance Coin',
              address: null,
              balance: newState.balance.nativeToken.balance,
              priceUSD: newState.balance.nativeToken.priceUSD || 0
            });
          }
          
          // Thêm các tokens khác có balance > 0
          const otherTokens = newState.balance.tokens?.filter((token: any) => 
            parseFloat(token.balance) > 0
          ) || [];
          
          allTokens.push(...otherTokens);
          
          console.log('💰 SendScreen: Available tokens:', allTokens);
          setAvailableTokens(allTokens);
          
          // Set default token nếu chưa có
          if (!selectedToken && allTokens.length > 0) {
            setSelectedToken(allTokens[0]);
            console.log('🎯 SendScreen: Set default token:', allTokens[0]);
          }
        }
      };
      
      dashboardBloc.addListener(handleStateChange);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    }
  };

  // Load recent addresses from AsyncStorage
  const loadRecentAddresses = async () => {
    try {
      const AsyncStorage = await import('@react-native-async-storage/async-storage');
      const stored = await AsyncStorage.default.getItem('recent_addresses');
      if (stored) {
        const addresses = JSON.parse(stored);
        setRecentAddresses(addresses.slice(0, 10)); // Keep only last 10
      }
    } catch (error) {
      console.error('Error loading recent addresses:', error);
    }
  };

  // Save address to recent addresses
  const saveToRecentAddresses = async (address: string) => {
    try {
      const AsyncStorage = await import('@react-native-async-storage/async-storage');
      const updatedAddresses = [address, ...recentAddresses.filter(addr => addr !== address)];
      const limitedAddresses = updatedAddresses.slice(0, 10);
      await AsyncStorage.default.setItem('recent_addresses', JSON.stringify(limitedAddresses));
      setRecentAddresses(limitedAddresses);
    } catch (error) {
      console.error('Error saving recent address:', error);
    }
  };

  useEffect(() => {
    // Load dashboard data khi component mount
    loadDashboardData();
    loadRecentAddresses();
    
    // Trigger dashboard refresh để lấy latest data
    dashboardBloc.add(new LoadDashboardEvent());
  }, []);

  useEffect(() => {
    // Estimate gas function
    const estimateGas = async () => {
      try {
        // Simple gas estimation - will be improved later
        const estimate = {
          gasLimit: '21000',
          gasPrice: '5',
          totalFee: '0.000105',
          usdValue: '0.25'
        };
        setGasEstimate(estimate);
      } catch (error) {
        console.error('Error estimating gas:', error);
      }
    };

    // Auto estimate gas when inputs change
    if (toAddress && amount && transactionUseCases.validateAddress(toAddress)) {
      estimateGas();
    }
  }, [toAddress, amount, selectedToken]);

  // Load dashboard data and tokens
  useEffect(() => {
    loadDashboardData();
    loadRecentAddresses();
  }, []);





  const handlePasteAddress = async () => {
    try {
      const { getStringAsync } = await import('expo-clipboard');
      const text = await getStringAsync();
      if (text && transactionUseCases.validateAddress(text)) {
        setToAddress(text);
        Alert.alert('Thành công', 'Đã dán địa chỉ thành công!');
      } else {
        Alert.alert('Lỗi', 'Clipboard không chứa địa chỉ ví hợp lệ');
      }
    } catch (error) {
      console.error('Lỗi khi đọc clipboard:', error);
      Alert.alert('Lỗi', 'Không thể đọc dữ liệu từ clipboard');
    }
  };

  // Get current balance for selected token
  const getCurrentBalance = () => {
    if (!selectedToken || !balance) return '0';
    
    if (selectedToken.symbol === 'BNB') {
      return balance.nativeToken?.balance || '0';
    }
    
    const token = balance.tokens?.find((t: any) => t.address === selectedToken.address);
    return token?.balance || '0';
  };

  // Get amount USD value
  const getAmountUSDValue = () => {
    if (!amount || !selectedToken) return '$0.00';
    const usdValue = parseFloat(amount) * (selectedToken.priceUSD || 0);
    return formatUSD(usdValue);
  };

  // Handle max amount
  const handleMaxAmount = () => {
    const currentBalance = getCurrentBalance();
    if (selectedToken?.symbol === 'BNB') {
      // Reserve some BNB for gas fees
      const maxAmount = Math.max(0, parseFloat(currentBalance) - 0.001);
      setAmount(maxAmount.toString());
      setDisplayAmount(formatCrypto(maxAmount, selectedToken.symbol, 6).replace(` ${selectedToken.symbol}`, ''));
    } else {
      setAmount(currentBalance);
      setDisplayAmount(currentBalance);
    }
  };

  const estimateGas = async () => {
    try {
      const request: SendTransactionRequest = {
        toAddress,
        amount,
        tokenAddress: selectedToken?.address || undefined,
      };

      const fee = await transactionUseCases.estimateTransactionFee(request);
      // Calculate USD value for gas fee
      const usdValue = fee.totalFee ? (parseFloat(fee.totalFee) * 2500).toFixed(2) : '0'; // Assume BNB ~$250
      setGasEstimate({ ...fee, usdValue });
    } catch (error: any) {
      console.log('Gas estimation error:', error.message);
      setGasEstimate(null);
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
      `Gửi ${amount} ${selectedToken?.symbol || 'BNB'}\nĐến: ${truncateAddress(toAddress)}\nPhí gas: ${gasEstimate?.totalFee || 'Đang tính...'} BNB (≈$${gasEstimate?.usdValue || '0'})`,
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
        tokenAddress: selectedToken?.address || undefined,
      };

      const result = await transactionUseCases.sendTransaction(request);

      if (result.success) {
        // Save address to recent addresses
        await saveToRecentAddresses(toAddress);
        
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
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header với logo */}
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <LogoComponent size="small" />
          <Text style={[styles.title, { color: colors.text }]}>Gửi tiền</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Balance Card */}
        {selectedToken && (
          <View style={[styles.balanceCard, { backgroundColor: colors.card }]}>
            <View style={styles.balanceHeader}>
              <Text style={[styles.balanceLabel, { color: colors.textSecondary }]}>Số dư khả dụng</Text>
              <TouchableOpacity onPress={handleMaxAmount} style={[styles.maxButton, { backgroundColor: colors.primary }]}>
                <Text style={styles.maxButtonText}>Max</Text>
              </TouchableOpacity>
            </View>
            <Text style={[styles.balanceAmount, { color: colors.text }]}>
              {formatCrypto(parseFloat(getCurrentBalance()), selectedToken.symbol, 4)}
            </Text>
            <Text style={[styles.balanceUSD, { color: colors.textSecondary }]}>
              ≈ {formatUSD(parseFloat(getCurrentBalance()) * (selectedToken.priceUSD || 0))}
            </Text>
          </View>
        )}
        {/* Address Input Card */}
        <View style={[styles.addressCard, { backgroundColor: colors.card }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Địa chỉ nhận</Text>
          <View style={styles.addressInputContainer}>
            <TextInput
              style={[styles.addressInput, { 
                backgroundColor: colors.inputBackground, 
                borderColor: toAddress && !transactionUseCases.validateAddress(toAddress) ? colors.error : colors.inputBorder,
                color: colors.text 
              }]}
              value={toAddress}
              onChangeText={setToAddress}
              placeholder="Nhập địa chỉ ví..."
              placeholderTextColor={colors.textSecondary}
              autoCapitalize="none"
              autoCorrect={false}
            />

            <TouchableOpacity 
              style={styles.pasteButton}
              onPress={handlePasteAddress}
            >
              <MaterialIcons name="content-paste" size={20} color="white" />
            </TouchableOpacity>
          </View>
          {toAddress && !transactionUseCases.validateAddress(toAddress) && (
            <Text style={[styles.errorText, { color: colors.error }]}>Địa chỉ không hợp lệ</Text>
          )}
          <TouchableOpacity 
            style={styles.recentButton}
            onPress={() => setShowRecentAddresses(true)}
          >
            <MaterialIcons name="history" size={16} color={colors.primary} />
            <Text style={[styles.recentButtonText, { color: colors.primary }]}>Địa chỉ gần đây</Text>
          </TouchableOpacity>
        </View>

        {/* Amount Input Card */}
        <View style={[styles.amountCard, { backgroundColor: colors.card }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Số lượng</Text>
          <View style={styles.amountInputContainer}>
            <TextInput
              style={[styles.amountInput, { 
                backgroundColor: colors.inputBackground, 
                borderColor: colors.inputBorder,
                color: colors.text 
              }]}
              value={displayAmount}
              onChangeText={(text) => {
                const { displayValue, rawValue } = handleInputChange(text);
                setDisplayAmount(displayValue);
                setAmount(sanitizeForAPI(rawValue));
              }}
              placeholder="0,00"
              placeholderTextColor={colors.textSecondary}
              keyboardType="decimal-pad"
            />
            {selectedToken && (
              <Text style={[styles.tokenSymbol, { color: colors.textSecondary }]}>
                {selectedToken.symbol}
              </Text>
            )}
          </View>
          {amount && selectedToken && (
            <Text style={[styles.usdValue, { color: colors.textSecondary }]}>≈ {getAmountUSDValue()}</Text>
          )}
        </View>

        {/* Token Selector Card */}
        <View style={[styles.addressCard, { backgroundColor: colors.card }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Token</Text>
          <TouchableOpacity 
            style={[styles.tokenSelector, { 
              backgroundColor: colors.inputBackground, 
              borderColor: colors.inputBorder 
            }]}
            onPress={() => setShowTokenSelector(true)}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              {selectedToken ? (
                <>
                  <View style={[styles.tokenIcon, { backgroundColor: colors.primary }]}>
                    <Text style={styles.tokenIconText}>{selectedToken.symbol.charAt(0)}</Text>
                  </View>
                  <View>
                    <Text style={[styles.tokenSelectorText, { color: colors.text }]}>
                      {selectedToken.name}
                    </Text>
                    <Text style={[styles.tokenSelectorSymbol, { color: colors.textSecondary }]}>
                      {selectedToken.symbol}
                    </Text>
                  </View>
                </>
              ) : (
                <Text style={[styles.tokenSelectorText, { color: colors.textSecondary }]}>
                  Chọn token để gửi
                </Text>
              )}
            </View>
            <MaterialIcons name="keyboard-arrow-down" size={24} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Fee Options Card */}
        <View style={[styles.feeCard, { backgroundColor: colors.card }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Phí giao dịch</Text>
          
          <View style={styles.feeOptions}>
            {['slow', 'standard', 'fast'].map((speed) => (
              <TouchableOpacity
                key={speed}
                style={[styles.feeOption, {
                  backgroundColor: selectedFeeOption === speed ? colors.primary : colors.inputBackground,
                  borderColor: selectedFeeOption === speed ? colors.primary : colors.inputBorder,
                }]}
                onPress={() => setSelectedFeeOption(speed as 'slow' | 'standard' | 'fast')}
              >
                <Text style={[styles.feeOptionText, {
                  color: selectedFeeOption === speed ? 'white' : colors.text
                }]}>
                  {speed === 'slow' ? 'Chậm' : speed === 'standard' ? 'Tiêu chuẩn' : 'Nhanh'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {gasEstimate && (
            <View style={styles.feeDetails}>
              <Text style={[styles.feeLabel, { color: colors.textSecondary }]}>Phí ước tính:</Text>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={[styles.feeAmount, { color: colors.text }]}>~{gasEstimate.totalFee} BNB</Text>
                <Text style={[styles.feeLabel, { color: colors.textSecondary }]}>≈ {formatUSD(parseFloat(gasEstimate.totalFee) * 2500)}</Text>
              </View>
            </View>
          )}
        </View>

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

      {/* Token Selector Modal */}
      <Modal
        visible={showTokenSelector}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowTokenSelector(false)}
      >
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={() => setShowTokenSelector(false)}>
              <MaterialIcons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Chọn Token</Text>
            <View style={{ width: 24 }} />
          </View>
          
          <FlatList
            data={availableTokens}
            keyExtractor={(item) => item.address || item.symbol}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.tokenItem, { backgroundColor: colors.card }]}
                onPress={() => {
                  setSelectedToken(item);
                  setShowTokenSelector(false);
                }}
              >
                <View style={[styles.tokenIcon, { backgroundColor: colors.background }]}>
                  {item.logoUri ? (
                    <Image 
                      source={{ uri: item.logoUri }} 
                      style={{ width: 32, height: 32, borderRadius: 16 }}
                      onError={() => {}}
                    />
                  ) : (
                    <View style={[styles.tokenIconFallback, { backgroundColor: colors.primary }]}>
                      <Text style={styles.tokenIconText}>{item.symbol.charAt(0)}</Text>
                    </View>
                  )}
                  
                  {/* Chain Logo Badge */}
                  {item.chainLogo && (
                    <View style={[styles.chainBadge, { 
                      backgroundColor: colors.background,
                      borderColor: colors.border 
                    }]}>
                      <Image 
                        source={{ uri: item.chainLogo }} 
                        style={{ width: 12, height: 12, borderRadius: 6 }}
                        onError={() => {}}
                      />
                    </View>
                  )}
                </View>
                <View style={styles.tokenInfo}>
                  <Text style={[styles.tokenName, { color: colors.text }]}>{item.name}</Text>
                  <Text style={[styles.tokenSymbol, { color: colors.textSecondary }]}>{item.symbol}</Text>
                </View>
                <View style={styles.tokenBalance}>
                  <Text style={[styles.tokenBalanceAmount, { color: colors.text }]}>
                    {formatCrypto(parseFloat(item.balance), item.symbol, 6)}
                  </Text>
                  <Text style={[styles.tokenBalanceUSD, { color: colors.textSecondary }]}>
                    ≈ {formatUSD(parseFloat(item.balance) * (item.priceUSD || 0))}
                  </Text>
                </View>
              </TouchableOpacity>
            )}
            contentContainerStyle={styles.tokenList}
          />
        </SafeAreaView>
      </Modal>

      {/* Recent Addresses Modal */}
      <Modal
        visible={showRecentAddresses}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowRecentAddresses(false)}
      >
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={() => setShowRecentAddresses(false)}>
              <MaterialIcons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Địa chỉ gần đây</Text>
            <View style={{ width: 24 }} />
          </View>
          
          {recentAddresses.length > 0 ? (
            <FlatList
              data={recentAddresses}
              keyExtractor={(item, index) => `${item}-${index}`}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.addressItem, { backgroundColor: colors.card }]}
                  onPress={() => {
                    setToAddress(item);
                    setShowRecentAddresses(false);
                  }}
                >
                  <MaterialIcons name="account-balance-wallet" size={24} color={colors.primary} />
                  <View style={styles.addressInfo}>
                    <Text style={[styles.addressText, { color: colors.text }]}>
                      {truncateAddress(item)}
                    </Text>
                    <Text style={[styles.addressFull, { color: colors.textSecondary }]}>
                      {item}
                    </Text>
                  </View>
                  <MaterialIcons name="arrow-forward-ios" size={16} color={colors.textSecondary} />
                </TouchableOpacity>
              )}
              contentContainerStyle={styles.addressList}
            />
          ) : (
            <View style={styles.emptyState}>
              <MaterialIcons name="history" size={48} color={colors.textSecondary} />
              <Text style={[styles.emptyStateText, { color: colors.textSecondary }]}>
                Chưa có địa chỉ gần đây
              </Text>
              <Text style={[styles.emptyStateSubtext, { color: colors.textSecondary }]}>
                Các địa chỉ bạn đã gửi sẽ xuất hiện ở đây
              </Text>
            </View>
          )}
        </SafeAreaView>
      </Modal>


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
    borderRadius: 8,
  },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  // Balance Card
  balanceCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  balanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  balanceLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  maxButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  maxButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  balanceAmount: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  balanceUSD: {
    fontSize: 16,
  },
  // Address Card
  addressCard: {
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
    marginBottom: 12,
  },
  addressInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  addressInput: {
    flex: 1,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    borderWidth: 1,
  },
  qrButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 14,
    marginTop: 8,
  },
  recentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    paddingVertical: 8,
  },
  recentButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  // Amount Card
  amountCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  amountInput: {
    flex: 1,
    borderRadius: 12,
    padding: 16,
    fontSize: 20,
    fontWeight: '600',
    borderWidth: 1,
  },
  tokenSymbol: {
    fontSize: 16,
    fontWeight: '600',
  },
  usdValue: {
    fontSize: 16,
    marginTop: 8,
  },
  // Token Selector
  tokenSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
  },
  tokenSelectorText: {
    fontSize: 16,
  },
  tokenSelectorSymbol: {
    fontSize: 12,
    marginTop: 2,
  },
  tokenIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  tokenIconFallback: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tokenIconText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  chainBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Fee Card
  feeCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  feeOptions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  feeOption: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  feeOptionText: {
    fontSize: 14,
    fontWeight: '600',
  },
  feeDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  feeLabel: {
    fontSize: 14,
  },
  feeAmount: {
    fontSize: 16,
    fontWeight: '600',
  },
  // Send Button
  sendButton: {
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
    marginTop: 8,
    marginHorizontal: 16,
    marginBottom: 32,
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  sendButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
  },
  // Gas Info (simplified)
  gasInfo: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  gasTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  gasText: {
    fontSize: 14,
    marginBottom: 4,
  },
  // Modal Styles
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  // Token Selector Styles
  tokenList: {
    padding: 16,
  },
  tokenItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  tokenInfo: {
    flex: 1,
    marginLeft: 12,
  },
  tokenName: {
    fontSize: 16,
    fontWeight: '600',
  },
  tokenBalance: {
    alignItems: 'flex-end',
  },
  tokenBalanceAmount: {
    fontSize: 16,
    fontWeight: '600',
  },
  tokenBalanceUSD: {
    fontSize: 14,
    marginTop: 2,
  },
  // Address Styles
  addressList: {
    padding: 16,
  },
  addressItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  addressInfo: {
    flex: 1,
    marginLeft: 12,
  },
  addressText: {
    fontSize: 16,
    fontWeight: '600',
  },
  addressFull: {
    fontSize: 12,
    marginTop: 2,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    textAlign: 'center',
  },
  emptyStateSubtext: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  // QR Scanner Styles
  qrContainer: {
    flex: 1,
  },
  qrHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 15,
  },
  qrCloseButton: {
    padding: 8,
  },
  qrTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
  },
  qrPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  qrPlaceholderText: {
    fontSize: 18,
    color: 'white',
    marginTop: 20,
    textAlign: 'center',
  },
  qrPlaceholderSubtext: {
    fontSize: 14,
    color: '#ccc',
    marginTop: 8,
    textAlign: 'center',
  },
  qrTempInput: {
    width: '100%',
    marginTop: 40,
  },
  qrInput: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    marginBottom: 16,
  },
  qrConfirmButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  qrConfirmText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  // QR Camera Styles
  qrCameraContainer: {
    flex: 1,
    position: 'relative',
  },
  qrCamera: {
    flex: 1,
  },
  qrOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  qrScanArea: {
    width: 250,
    height: 250,
    position: 'relative',
  },
  qrCorner: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderColor: 'white',
    borderWidth: 3,
  },
  qrCornerTopLeft: {
    top: 0,
    left: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0,
  },
  qrCornerTopRight: {
    top: 0,
    right: 0,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
  },
  qrCornerBottomLeft: {
    bottom: 0,
    left: 0,
    borderRightWidth: 0,
    borderTopWidth: 0,
  },
  qrCornerBottomRight: {
    bottom: 0,
    right: 0,
    borderLeftWidth: 0,
    borderTopWidth: 0,
  },
  qrInstructionText: {
    color: 'white',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 40,
    paddingHorizontal: 20,
  },
  qrRescanButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
    marginTop: 20,
  },
  qrRescanText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  // QR Camera Placeholder Styles
  qrCameraPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  qrCameraPlaceholderText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 16,
    textAlign: 'center',
  },
  qrCameraPlaceholderSubtext: {
    color: '#ccc',
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  qrManualInput: {
    width: '80%',
    marginTop: 30,
  },
  pasteButton: {
    position: 'absolute',
    right: 12,
    top: 12,
    backgroundColor: '#007AFF',
    borderRadius: 8,
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
