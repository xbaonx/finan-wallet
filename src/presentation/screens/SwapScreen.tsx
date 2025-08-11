import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
  Modal,
  Dimensions,
  Platform,
  Keyboard,
  Image,
  FlatList,
  RefreshControl,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeColors } from '../../core/theme';
import { SwapBloc } from '../blocs/swap_bloc';
import { SwapState, SwapInitialState, SwapLoadingState, TokensLoadedState, QuoteLoadingState, QuoteLoadedState, SwapSuccessState, SwapFailedState, SwapErrorState, ApprovingTokenState, TokenApprovedState } from '../blocs/swap_state';
import { LoadSupportedTokensEvent, GetSwapQuoteEvent, ConfirmSwapEvent, ApproveTokenEvent, ResetSwapEvent, RefreshTokenBalancesEvent } from '../blocs/swap_event';
import { formatCurrency, formatTokenBalance, truncateAddress } from '../../core/utils/format_utils';
import { formatUSD, formatCrypto, formatLargeNumber, formatPercentage } from '../../core/utils/number_formatter';
import { handleInputChange, sanitizeForAPI, parseInputValue } from '../../core/utils/simple_input_formatter';
import { TokenInfo, SwapType, SwapRequest } from '../../domain/entities/swap_entity';
import { GetCurrentWalletUseCase } from '../../domain/usecases/dashboard_usecases';
import { BinancePriceService } from '../../data/services/binance_price_service';
import { GlobalTokenService } from '../../services/GlobalTokenService';
import { finanBackendService, SwapConfig } from '../../data/services/finan_backend_service';
import { ethers } from 'ethers';
import { ServiceLocator } from '../../core/di/service_locator';

interface CoinListItemProps {
  token: TokenInfo;
  onBuyPress: (token: TokenInfo) => void;
  onSellPress: (token: TokenInfo) => void;
  showBuyButton: boolean;
  showSellButton: boolean;
  tokenPrices: Map<string, number>;
  priceLoading: boolean;
}

const CoinListItem: React.FC<CoinListItemProps> = ({ token, onBuyPress, onSellPress, showBuyButton, showSellButton, tokenPrices, priceLoading }) => {
  const colors = useThemeColors();
  const formatPrice = (price?: number) => {
    if (!price) return '$0,00';
    return formatUSD(price, true, price < 0.01 ? 6 : 2);
  };

  // Debug log để kiểm tra giá token
  const currentPrice = tokenPrices.get(token.symbol) || token.priceUSD;
  if (token.symbol === 'BNB' || token.symbol === 'ETH' || token.symbol === 'USDT') {
    console.log(`💰 [${token.symbol}] Price from tokenPrices: ${tokenPrices.get(token.symbol)}, fallback: ${token.priceUSD}, final: ${currentPrice}`);
  }

  const formatBalance = (balance?: string) => {
    if (!balance) return '0';
    const balanceNum = parseFloat(balance);
    if (balanceNum === 0) return '0';
    if (balanceNum < 0.0001) return '< 0,0001';
    return formatLargeNumber(balanceNum, balanceNum < 1 ? 4 : 2);
  };

  return (
    <View style={{
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
          backgroundColor: '#f3f4f6',
          marginRight: 12,
          justifyContent: 'center',
          alignItems: 'center',
          position: 'relative',
        }}>
          {token.logoURI ? (
            <Image 
              source={{ uri: token.logoURI }} 
              style={{ width: 32, height: 32, borderRadius: 16 }}
              onError={() => {}}
            />
          ) : (
            <Text style={{ fontSize: 16, fontWeight: 'bold', color: colors.textSecondary }}>
              {token.symbol.charAt(0)}
            </Text>
          )}
          
          {/* Chain Logo Badge */}
          {(token as any).chainLogo && (
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
                source={{ uri: (token as any).chainLogo }} 
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
                {formatBalance(token.balance)} {token.symbol}
              </Text>
            )}
          </View>
        </View>
      </View>

      {/* Price Info */}
      <View style={{ alignItems: 'flex-end', marginRight: 16 }}>
        {priceLoading ? (
          <ActivityIndicator size="small" color="#10b981" />
        ) : (
          <Text style={{
            fontSize: 16,
            fontWeight: '600',
            color: colors.text,
          }}>
            {formatPrice(tokenPrices.get(token.symbol) || token.priceUSD)}
          </Text>
        )}
      </View>

      {/* Action Buttons */}
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {showBuyButton && (
          <TouchableOpacity
            style={{
              backgroundColor: '#10b981',
              paddingHorizontal: 16,
              paddingVertical: 8,
              borderRadius: 8,
            }}
            onPress={() => onBuyPress(token)}
          >
            <Text style={{
              color: 'white',
              fontSize: 14,
              fontWeight: '600',
            }}>
              Mua
            </Text>
          </TouchableOpacity>
        )}
        
        {showSellButton && (
          <TouchableOpacity
            style={{
              backgroundColor: '#ef4444',
              paddingHorizontal: 16,
              paddingVertical: 8,
              borderRadius: 8,
            }}
            onPress={() => onSellPress(token)}
          >
            <Text style={{
              color: 'white',
              fontSize: 14,
              fontWeight: '600',
            }}>
              Bán
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

interface SwapModalProps {
  visible: boolean;
  onClose: () => void;
  token: TokenInfo | null;
  swapType: SwapType;
  onGetQuote: (amount: string) => void;  // Chỉ lấy quote
  onConfirm: (amount: string) => void;   // Thực hiện swap
  onApprove?: (amount: string) => void;  // Approve token
  loading?: boolean;
  needsApproval?: boolean;
  allowanceAmount?: string;
  sellableTokens?: TokenInfo[];  // Thêm sellableTokens để hiển thị USDT balance
  approvingToken?: boolean;
  tokenPrices: Map<string, number>;
  priceLoading: boolean;
  platformFeePercentage: number;  // Thêm phí nền tảng từ backend
  quote?: {
    fromAmount: string;
    toAmount: string;
    fromToken: TokenInfo;
    toToken: TokenInfo;
  };
}

const SwapModal: React.FC<SwapModalProps> = ({ 
  visible, 
  onClose, 
  token, 
  swapType, 
  onGetQuote, 
  onConfirm, 
  onApprove,
  loading = false,
  needsApproval = false,
  allowanceAmount = '0',
  approvingToken = false,
  tokenPrices,
  priceLoading,
  platformFeePercentage,
  quote,
  sellableTokens = []
}) => {
  // Debug log khi props thay đổi
  React.useEffect(() => {
    if (visible) {
      console.log('💵 SwapModal state:', {
        token: token?.symbol,
        swapType,
        needsApproval,
        allowanceAmount,
        approvingToken,
        hasQuote: !!quote
      });
    }
  }, [visible, token, swapType, needsApproval, allowanceAmount, approvingToken, quote]);
  const [amount, setAmount] = useState('');
  const [displayAmount, setDisplayAmount] = useState('');
  const insets = useSafeAreaInsets();
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const screenHeight = Dimensions.get('window').height;
  const [quoteTimeout, setQuoteTimeout] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', (event) => {
      console.log('🎹 Keyboard Show - Height:', event.endCoordinates.height);
      console.log('🎹 Screen Height:', screenHeight);
      console.log('🎹 Insets Bottom:', insets.bottom);
      console.log('🎹 Platform:', Platform.OS);
      console.log('🎹 Calculated bottom position:', Platform.OS === 'ios' ? event.endCoordinates.height - insets.bottom : event.endCoordinates.height);
      setKeyboardHeight(event.endCoordinates.height);
    });
    const keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', () => {
      console.log('🎹 Keyboard Hide');
      setKeyboardHeight(0);
    });

    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, []);

  const getTitle = () => {
    if (!token) return '';
    return swapType === SwapType.BUY ? `Mua ${token.symbol}` : `Bán ${token.symbol}`;
  };

  const getFromToken = () => {
    return swapType === SwapType.BUY ? 'USDT' : token?.symbol || '';
  };

  const getToToken = () => {
    return swapType === SwapType.BUY ? token?.symbol || '' : 'USDT';
  };

  // Validation cho cả tab MUA và BÁN - kiểm tra số lượng có hợp lệ không
  const isValidAmount = () => {
    if (!amount || !token) return false;
    
    // Cho tab MUA - kiểm tra amount <= USDT balance
    if (swapType === SwapType.BUY) {
      const usdtToken = sellableTokens.find((t: any) => t.symbol === 'USDT');
      if (usdtToken?.balance) {
        const amountNum = parseFloat(amount);
        const usdtBalanceNum = parseFloat(usdtToken.balance);
        return amountNum > 0 && amountNum <= usdtBalanceNum;
      }
      return parseFloat(amount) > 0;
    }
    
    // Cho tab BÁN - kiểm tra amount <= balance
    if (swapType === SwapType.SELL && token.balance) {
      const amountNum = parseFloat(amount);
      const balanceNum = parseFloat(token.balance);
      return amountNum > 0 && amountNum <= balanceNum;
    }
    
    return parseFloat(amount) > 0;
  };

  const handleAmountChange = (newAmount: string) => {
    setAmount(newAmount);
    
    // Clear existing timeout
    if (quoteTimeout) {
      clearTimeout(quoteTimeout);
    }
    
    // Auto-quote với debounce 1 giây
    if (newAmount && parseFloat(newAmount) > 0 && token) {
      const timeout = setTimeout(() => {
        onGetQuote(newAmount); // Chỉ lấy quote, không swap
      }, 1000);
      setQuoteTimeout(timeout);
    }
  };

  // Cleanup timeout khi component unmount
  useEffect(() => {
    return () => {
      if (quoteTimeout) {
        clearTimeout(quoteTimeout);
      }
    };
  }, [quoteTimeout]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={{ 
        flex: 1, 
        backgroundColor: 'white'
      }}>
          <View style={{ flex: 1 }}>

          {/* Header */}
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 16,
            paddingVertical: 12,
            borderBottomWidth: 1,
            borderBottomColor: '#f3f4f6',
          }}>
            <TouchableOpacity onPress={onClose}>
              <Text style={{ fontSize: 16, color: '#6b7280' }}>Hủy</Text>
            </TouchableOpacity>
            <Text style={{
              fontSize: 18,
              fontWeight: 'bold',
              color: '#111827',
            }}>
              {getTitle()}
            </Text>
            <View style={{ width: 40 }} />
          </View>

          {/* Scrollable Content */}
          <ScrollView 
            style={{ flex: 1 }}
            contentContainerStyle={{ 
              paddingHorizontal: 16, 
              paddingBottom: keyboardHeight > 0 ? keyboardHeight + 50 : 100
            }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Token Info */}
            {token && (
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: '#f9fafb',
                borderRadius: 12,
                padding: 16,
                marginBottom: 24,
              }}>
                <View style={{
                  width: 48,
                  height: 48,
                  borderRadius: 24,
                  backgroundColor: '#f3f4f6',
                  marginRight: 16,
                  justifyContent: 'center',
                  alignItems: 'center',
                }}>
                  {token.logoURI ? (
                    <Image 
                      source={{ uri: token.logoURI }} 
                      style={{ width: 40, height: 40, borderRadius: 20 }}
                    />
                  ) : (
                    <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#6b7280' }}>
                      {token.symbol.charAt(0)}
                    </Text>
                  )}
                </View>
                
                <View>
                  <Text style={{
                    fontSize: 18,
                    fontWeight: '600',
                    color: '#111827',
                    marginBottom: 4,
                  }}>
                    {token.symbol}
                  </Text>
                  <Text style={{
                    fontSize: 14,
                    color: '#6b7280',
                  }}>
                    {token.name}
                  </Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                    <Text style={{
                      fontSize: 16,
                      fontWeight: '600',
                      color: '#111827',
                    }}>
                      {formatUSD(tokenPrices.get(token.symbol) || token.priceUSD || 0, true, 4)}
                    </Text>
                    {priceLoading && (
                      <ActivityIndicator 
                        size="small" 
                        color="#6b7280" 
                        style={{ marginLeft: 6 }}
                      />
                    )}
                  </View>
                </View>
              </View>
            )}

            {/* Amount Input */}
            <View style={{
              backgroundColor: '#f9fafb',
              borderRadius: 12,
              padding: 16,
              marginBottom: 16,
            }}>
              <View style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 8,
              }}>
                <Text style={{
                  fontSize: 14,
                  color: '#6b7280',
                }}>
                  Số lượng {getFromToken()}
                </Text>
                {/* Hiển thị balance cho tab BÁN */}
                {swapType === SwapType.SELL && token?.balance && (
                  <TouchableOpacity
                    onPress={() => {
                      const maxAmount = token.balance || '0';
                      setAmount(maxAmount);
                      setDisplayAmount(maxAmount.replace('.', ','));
                    }}
                    style={{
                      backgroundColor: '#e0e7ff',
                      paddingHorizontal: 8,
                      paddingVertical: 4,
                      borderRadius: 6,
                    }}
                  >
                    <Text style={{
                      fontSize: 12,
                      color: '#3730a3',
                      fontWeight: '600',
                    }}>
                      Có sẵn: {formatCrypto(parseFloat(token.balance), token.symbol, 4)}
                    </Text>
                  </TouchableOpacity>
                )}
                {/* Hiển thị USDT balance cho tab MUA */}
                {swapType === SwapType.BUY && (() => {
                  const usdtToken = sellableTokens.find((t: any) => t.symbol === 'USDT');
                  return usdtToken?.balance && parseFloat(usdtToken.balance) > 0 ? (
                    <TouchableOpacity
                      onPress={() => {
                        const maxAmount = usdtToken.balance || '0';
                        setAmount(maxAmount);
                        setDisplayAmount(maxAmount.replace('.', ','));
                      }}
                      style={{
                        backgroundColor: '#e0e7ff',
                        paddingHorizontal: 8,
                        paddingVertical: 4,
                        borderRadius: 6,
                      }}
                    >
                      <Text style={{
                        fontSize: 12,
                        color: '#3730a3',
                        fontWeight: '600',
                      }}>
                        USDT có sẵn: {formatCrypto(parseFloat(usdtToken.balance), 'USDT', 2)}
                      </Text>
                    </TouchableOpacity>
                  ) : null;
                })()}
              </View>
              <TextInput
                style={{
                  fontSize: 24,
                  fontWeight: '600',
                  color: '#111827',
                  padding: 0,
                }}
                placeholder="0,00"
                placeholderTextColor="#9ca3af"
                value={displayAmount}
                onChangeText={(text) => {
                  const { displayValue, rawValue } = handleInputChange(text);
                  setDisplayAmount(displayValue);
                  setAmount(sanitizeForAPI(rawValue)); // Giữ raw value cho API
                  handleAmountChange(sanitizeForAPI(rawValue));
                }}
                keyboardType="numeric"
              />
              {/* Validation cho tab BÁN */}
              {swapType === SwapType.SELL && amount && token?.balance && (
                parseFloat(amount) > parseFloat(token.balance) ? (
                  <Text style={{
                    fontSize: 12,
                    color: '#dc2626',
                    marginTop: 4,
                  }}>
                    ⚠️ Số lượng vượt quá balance có sẵn
                  </Text>
                ) : null
              )}
              
              {/* Validation cho tab MUA */}
              {swapType === SwapType.BUY && amount && (() => {
                const usdtToken = sellableTokens.find((t: any) => t.symbol === 'USDT');
                return usdtToken?.balance && parseFloat(amount) > parseFloat(usdtToken.balance) ? (
                  <Text style={{
                    fontSize: 12,
                    color: '#dc2626',
                    marginTop: 4,
                  }}>
                    ⚠️ Số lượng USDT vượt quá balance có sẵn
                  </Text>
                ) : null;
              })()}
              
              {/* Percentage buttons cho tab BÁN */}
              {swapType === SwapType.SELL && token?.balance && parseFloat(token.balance) > 0 && (
                <View style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  marginTop: 12,
                  gap: 8,
                }}>
                  {[25, 50, 75, 100].map((percentage) => (
                    <TouchableOpacity
                      key={percentage}
                      onPress={() => {
                        const balanceNum = parseFloat(token.balance || '0');
                        const percentageAmount = (balanceNum * percentage / 100).toString();
                        console.log(`🔢 Tab BÁN - ${percentage}%: ${balanceNum} * ${percentage}/100 = ${percentageAmount}`);
                        setAmount(percentageAmount);
                        setDisplayAmount(percentageAmount.replace('.', ','));
                        // Trigger quote immediately after setting amount
                        setTimeout(() => {
                          if (percentageAmount && parseFloat(percentageAmount) > 0) {
                            onGetQuote(percentageAmount);
                          }
                        }, 100);
                      }}
                      style={{
                        flex: 1,
                        backgroundColor: '#e0e7ff',
                        paddingVertical: 8,
                        paddingHorizontal: 12,
                        borderRadius: 8,
                        alignItems: 'center',
                      }}
                    >
                      <Text style={{
                        fontSize: 12,
                        color: '#3730a3',
                        fontWeight: '600',
                      }}>
                        {percentage}%
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
              
              {/* Percentage buttons cho tab MUA */}
              {swapType === SwapType.BUY && (() => {
                const usdtToken = sellableTokens.find((t: any) => t.symbol === 'USDT');
                return usdtToken?.balance && parseFloat(usdtToken.balance) > 0 ? (
                  <View style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    marginTop: 12,
                    gap: 8,
                  }}>
                    {[25, 50, 75, 100].map((percentage) => (
                      <TouchableOpacity
                        key={percentage}
                        onPress={() => {
                          const balanceNum = parseFloat(usdtToken.balance || '0');
                          const percentageAmount = (balanceNum * percentage / 100).toString();
                          console.log(`🔢 Tab MUA - ${percentage}%: ${balanceNum} * ${percentage}/100 = ${percentageAmount}`);
                          setAmount(percentageAmount);
                          setDisplayAmount(percentageAmount.replace('.', ','));
                          // Trigger quote immediately after setting amount
                          setTimeout(() => {
                            if (percentageAmount && parseFloat(percentageAmount) > 0) {
                              onGetQuote(percentageAmount);
                            }
                          }, 100);
                        }}
                        style={{
                          flex: 1,
                          backgroundColor: '#e0e7ff',
                          paddingVertical: 8,
                          paddingHorizontal: 12,
                          borderRadius: 8,
                          alignItems: 'center',
                        }}
                      >
                        <Text style={{
                          fontSize: 12,
                          color: '#3730a3',
                          fontWeight: '600',
                        }}>
                          {percentage}%
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                ) : null;
              })()}
            </View>

            {/* Quote Display */}
            {loading && amount ? (
              <View style={{
                backgroundColor: '#fef3c7',
                borderRadius: 12,
                padding: 16,
                marginBottom: 24,
                flexDirection: 'row',
                alignItems: 'center',
              }}>
                <ActivityIndicator size="small" color="#d97706" style={{ marginRight: 12 }} />
                <View>
                  <Text style={{
                    fontSize: 14,
                    color: '#92400e',
                    marginBottom: 4,
                  }}>
                    Đang tính toán giá...
                  </Text>
                  <Text style={{
                    fontSize: 12,
                    color: '#a16207',
                  }}>
                    Vui lòng chờ trong giây lát
                  </Text>
                </View>
              </View>
            ) : quote ? (
              <View style={{
                backgroundColor: '#f0f9ff',
                borderRadius: 12,
                padding: 16,
                marginBottom: 24,
              }}>
                <Text style={{
                  fontSize: 14,
                  color: '#0369a1',
                  marginBottom: 8,
                }}>
                  Bạn sẽ nhận được
                </Text>
                <Text style={{
                  fontSize: 20,
                  fontWeight: '600',
                  color: '#0369a1',
                }}>
                  {formatCrypto(parseFloat(quote.toAmount), getToToken(), 6)}
                </Text>
                
                {/* Fee Information */}
                <View style={{
                  marginTop: 12,
                  paddingTop: 12,
                  borderTopWidth: 1,
                  borderTopColor: '#e0f2fe',
                }}>
                  <View style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 6,
                  }}>
                    <Text style={{
                      fontSize: 12,
                      color: '#0369a1',
                      opacity: 0.8,
                    }}>
                      Phí nền tảng ({formatPercentage(platformFeePercentage, 1)})
                    </Text>
                    <Text style={{
                      fontSize: 12,
                      color: '#0369a1',
                      fontWeight: '500',
                    }}>
                      {(() => {
                        const fromAmount = parseFloat(quote.fromAmount || '0');
                        const feeAmount = fromAmount * platformFeePercentage; // Dynamic fee from backend
                        return formatCrypto(feeAmount, quote.fromToken.symbol, 6);
                      })()}
                    </Text>
                  </View>
                  <Text style={{
                    fontSize: 11,
                    color: '#0369a1',
                    opacity: 0.7,
                    fontStyle: 'italic',
                  }}>
                    Giao dịch qua 1inch DEX • Phí được tích hợp tự động
                  </Text>
                </View>
              </View>
            ) : null}
          </ScrollView>

          {/* Fixed Action Button - Clean design */}
          <View style={{
            position: 'absolute',
            bottom: keyboardHeight > 0 ? 
              (Platform.OS === 'ios' ? keyboardHeight - insets.bottom + 10 : 10) : 
              insets.bottom + 20,
            left: 16,
            right: 16,
            backgroundColor: 'white',
            paddingTop: 16,
            paddingBottom: 16,
          }}>
            {needsApproval && amount && quote ? (
              <TouchableOpacity
                style={{
                  backgroundColor: (approvingToken || loading) ? '#6b7280' : '#3b82f6',
                  borderRadius: 12,
                  paddingVertical: 16,
                  alignItems: 'center',
                  opacity: (approvingToken || loading) ? 0.7 : 1
                }}
                onPress={() => {
                  onApprove && onApprove(amount);
                }}
                disabled={approvingToken || loading}
              >
                {approvingToken ? (
                  <View style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'center'}}>
                    <ActivityIndicator color="white" size="small" />
                    <Text style={{
                      color: 'white',
                      fontSize: 16,
                      fontWeight: '600',
                      marginLeft: 8
                    }}>
                      Bước 1/2: Đang cấp quyền...
                    </Text>
                  </View>
                ) : loading ? (
                  <View style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'center'}}>
                    <ActivityIndicator color="white" size="small" />
                    <Text style={{
                      color: 'white',
                      fontSize: 16,
                      fontWeight: '600',
                      marginLeft: 8
                    }}>
                      Bước 2/2: Đang {swapType === SwapType.BUY ? 'mua' : 'bán'}...
                    </Text>
                  </View>
                ) : (
                  <Text style={{
                    color: 'white',
                    fontSize: 16,
                    fontWeight: '600',
                  }}>
                    {swapType === SwapType.BUY ? `Mua ${getToToken()} ngay` : `Bán ${getFromToken()} ngay`}
                  </Text>
                )}
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={{
                  backgroundColor: (amount && quote && isValidAmount()) ? '#3b82f6' : '#d1d5db',
                  borderRadius: 12,
                  paddingVertical: 16,
                  alignItems: 'center',
                  opacity: (!amount || !quote || loading || !isValidAmount()) ? 0.7 : 1
                }}
                onPress={() => onConfirm(amount)}
                disabled={!amount || !quote || loading || !isValidAmount()}
              >
                {loading ? (
                  <View style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'center'}}>
                    <ActivityIndicator color="white" size="small" />
                    <Text style={{
                      color: 'white',
                      fontSize: 16,
                      fontWeight: '600',
                      marginLeft: 8
                    }}>
                      Đang xử lý...
                    </Text>
                  </View>
                ) : (
                  <Text style={{
                    color: 'white',
                    fontSize: 16,
                    fontWeight: '600',
                  }}>
                    {swapType === SwapType.BUY ? 'Xác nhận mua' : 'Xác nhận bán'}
                  </Text>
                )}
              </TouchableOpacity>
            )}
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
};
export const SwapScreen: React.FC = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const [swapBloc] = useState(() => ServiceLocator.get<SwapBloc>('SwapBloc'));
  const [state, setState] = useState<SwapState>(new SwapInitialState());
  const [searchQuery, setSearchQuery] = useState('');
  const [showSwapModal, setShowSwapModal] = useState(false);
  const [needsApproval, setNeedsApproval] = useState(false);
  const [allowanceAmount, setAllowanceAmount] = useState('0');
  const [approvingToken, setApprovingToken] = useState(false);
  const [autoSwapAfterApprove, setAutoSwapAfterApprove] = useState(false);
  const [pendingSwapAmount, setPendingSwapAmount] = useState('');
  const [selectedToken, setSelectedToken] = useState<TokenInfo | null>(null);
  const [binancePriceService] = useState(() => new BinancePriceService());
  const [tokenPrices, setTokenPrices] = useState<Map<string, number>>(new Map());
  const [priceLoading, setPriceLoading] = useState(false);
  const [currentQuote, setCurrentQuote] = useState<any>(null);
  const [swapType, setSwapType] = useState<SwapType>(SwapType.BUY);
  const [refreshing, setRefreshing] = useState(false);
  const [walletAddress, setWalletAddress] = useState<string>('');
  const getCurrentWalletUseCase = ServiceLocator.get<GetCurrentWalletUseCase>('GetCurrentWalletUseCase');
  const [activeTab, setActiveTab] = useState<'buy' | 'sell'>('buy');
  
  // Cache tokens để giữ danh sách khi chuyển trạng thái
  const [cachedTokens, setCachedTokens] = useState<TokenInfo[]>([]);
  
  // Tokens có balance thực tế từ Dashboard cho tab BÁN
  const [sellableTokens, setSellableTokens] = useState<TokenInfo[]>([]);
  
  // State để theo dõi trạng thái approve token
  const [isApprovingToken, setIsApprovingToken] = useState<boolean>(false);

  // Backend integration states
  const [platformFeePercentage, setPlatformFeePercentage] = useState<number>(0.009); // Default 0.9% (cập nhật từ backend)
  const [backendConnected, setBackendConnected] = useState<boolean>(false);
  const [swapConfig, setSwapConfig] = useState<SwapConfig | null>(null);

  useEffect(() => {
    // Xử lý sự thay đổi trạng thái từ SwapBloc
    const handleStateChange = (newState: SwapState) => {
      console.log('⚡ SwapScreen state change:', newState.constructor.name);
      setState(newState);
      
      // Lưu danh sách token khi nhận được TokensLoadedState
      if (newState instanceof TokensLoadedState) {
        setCachedTokens(newState.filteredTokens);
        console.log('💾 Cached tokens count:', newState.filteredTokens.length);
        // Tự động lấy giá từ Binance cho các token
        loadTokenPrices(newState.filteredTokens);
      }
      
      // Kiểm tra số dư USDT ngay sau khi có quote
      if (newState instanceof QuoteLoadedState && swapType === SwapType.BUY) {
        const requiredAmount = newState.fromAmount;
        const requiredAmountNum = parseFloat(requiredAmount);
        
        // Lấy USDT balance từ GlobalTokenService thay vì sellableTokens
        const getUSDTBalance = async () => {
          try {
            const globalTokenService = GlobalTokenService.getInstance();
            const walletBalance = await globalTokenService.getWalletBalance();
            const usdtToken = walletBalance?.tokens?.find(token => token.symbol === 'USDT');
            return usdtToken?.balance ? parseFloat(usdtToken.balance) : 0;
          } catch (error) {
            console.error('❌ Error getting USDT balance:', error);
            return 0;
          }
        };
        
        // Async check balance
        getUSDTBalance().then(currentBalance => {
          console.log('💰 Auto USDT Balance Check after quote - DETAILED:', {
            required: requiredAmountNum,
            current: currentBalance,
            sufficient: currentBalance >= requiredAmountNum,
            selectedToken: selectedToken?.symbol,
            fromGlobalService: true
          });
          
          if (currentBalance < requiredAmountNum) {
            const shortfall = requiredAmountNum - currentBalance;
            
            console.log('🚨 USDT không đủ - Sẽ hiển thị alert:', {
              shortfall,
              willShowAlert: true
            });
            
            // Hiển thị alert ngay sau khi có quote
            setTimeout(() => {
              console.log('🚨 Đang hiển thị alert thiếu USDT...');
              Alert.alert(
                'Số dư USDT không đủ',
                `Số dư hiện tại: ${currentBalance.toFixed(2)} USDT\nCần nạp thêm: ${shortfall.toFixed(2)} USDT\n\nBạn có muốn nạp thêm USDT không?`,
                [
                  {
                    text: 'Hủy',
                    style: 'cancel',
                    onPress: () => console.log('👤 User chọn Hủy')
                  },
                  {
                    text: 'Nạp USDT',
                    onPress: () => {
                      console.log('🔄 User chọn Nạp USDT - Điều hướng với số lượng thiếu:', shortfall);
                      setShowSwapModal(false); // Đóng swap modal trước
                      
                      // Điều hướng sang màn hình nạp rút với amount autofill
                      setTimeout(() => {
                        (navigation as any).navigate('DepositWithdraw', {
                          prefilledAmount: shortfall.toString(),
                          token: 'USDT'
                        });
                      }, 300);
                    }
                  }
                ]
              );
            }, 500); // Giảm delay vì đã có async
          } else {
            console.log('✅ USDT đủ - Không cần hiển thị alert');
          }
        });
      }
      
      // Cập nhật trạng thái approve token
      if (newState instanceof ApprovingTokenState) {
        setApprovingToken(true);
      } else if (newState instanceof TokenApprovedState) {
        setApprovingToken(false);
        // Tự động thực hiện swap sau khi approve thành công
        if (autoSwapAfterApprove && pendingSwapAmount) {
          console.log('✅ Token approved, tự động thực hiện swap...');
          setTimeout(() => {
            handleSwapConfirm(pendingSwapAmount);
          }, 500);
        }
      } else if (newState instanceof SwapErrorState || 
                newState instanceof SwapFailedState) {
        setApprovingToken(false);
        setAutoSwapAfterApprove(false);
        setPendingSwapAmount('');
      }
      
      // Xử lý khi giao dịch hoàn tất (thành công hoặc thất bại)
      if (newState instanceof SwapSuccessState) {
        // Hiển thị thông báo thành công với chi tiết theo loại swap
        const successMessage = swapType === SwapType.BUY 
          ? `Bạn đã mua ${parseFloat(newState.toAmount).toFixed(6)} ${newState.toTokenSymbol} bằng ${parseFloat(newState.fromAmount).toFixed(2)} ${newState.fromTokenSymbol}.\n\nToken đã được thêm vào ví của bạn.`
          : `Bạn đã bán ${parseFloat(newState.fromAmount).toFixed(6)} ${newState.fromTokenSymbol} và nhận được ${parseFloat(newState.toAmount).toFixed(2)} ${newState.toTokenSymbol}.\n\nSố dư đã được cập nhật trong ví của bạn.`;
        
        Alert.alert(
          'Giao dịch thành công',
          successMessage,
          [{ text: 'Xác nhận', onPress: () => closeAndResetSwapModal() }]
        );
      } else if (newState instanceof SwapFailedState) {
        // Hiển thị thông báo lỗi
        Alert.alert(
          'Giao dịch thất bại',
          `Không thể hoàn tất giao dịch.\n\nLý do: ${newState.error}\n\nVui lòng kiểm tra và thử lại.`,
          [{ text: 'Đóng', onPress: () => closeAndResetSwapModal() }]
        );
      }
    };

    // Load wallet address
    const loadWalletAddress = async () => {
      try {
        const getCurrentWalletUseCase = ServiceLocator.get<GetCurrentWalletUseCase>('GetCurrentWalletUseCase');
        const wallet = await getCurrentWalletUseCase.execute();
        if (wallet && wallet.address) {
          setWalletAddress(wallet.address);
        } else {
          // Fallback address for testing
          setWalletAddress('0x742d35Cc6634C0532925a3b844Bc454e4438f44e');
        }
      } catch (error) {
        console.error('Error loading wallet address:', error);
        // Fallback address for testing
        setWalletAddress('0x742d35Cc6634C0532925a3b844Bc454e4438f44e');
      }
    };

    // Load tokens có balance thực tế từ Dashboard cho tab BÁN
    const loadSellableTokensFromDashboard = async () => {
      try {
        console.log('🔄 Loading sellable tokens từ Dashboard...');
        const globalTokenService = GlobalTokenService.getInstance();
        const walletBalance = await globalTokenService.getWalletBalance();
        
        if (walletBalance?.tokens) {
          // Chỉ lấy tokens có balance > 0 để bán
          const tokensWithBalance = walletBalance.tokens.filter(token => 
            parseFloat(token.balance) > 0
          );
          
          // Convert TokenEntity → TokenInfo format cho SwapScreen
          const sellableTokenList: TokenInfo[] = tokensWithBalance.map(token => ({
            symbol: token.symbol,
            name: token.name,
            address: token.address,
            decimals: token.decimals,
            logoURI: token.logoUri || `https://tokens.1inch.io/${token.address.toLowerCase()}.png`, // Fix: logoURI (uppercase)
            priceUSD: token.priceUSD,
            balance: token.balance, // Balance thực tế từ Dashboard
            chainId: token.chainId || 56,
            // Thêm chain logo để hiển thị trong UI
            chainLogo: token.chainLogo,
            chainName: token.chainName
          } as any));
          
          setSellableTokens(sellableTokenList);
          console.log(`💰 Loaded ${sellableTokenList.length} sellable tokens từ Dashboard`);
          
          // Load giá cho sellable tokens
          if (sellableTokenList.length > 0) {
            loadTokenPrices(sellableTokenList);
          }
        }
      } catch (error) {
        console.error('❌ Error loading sellable tokens từ Dashboard:', error);
      }
    };

    // Load platform fee from backend
    const loadPlatformFee = async () => {
      try {
        console.log('🔄 Đang tải phí nền tảng từ backend...');
        const config = await finanBackendService.getSwapConfig();
        console.log('🔍 Raw config từ backend:', config);
        
        if (config && config.platformFeePercentage !== undefined) {
          // Backend trả về 0.9 (đã là percentage), chúng ta cần convert sang decimal để tính toán
          // Nhưng hiển thị vẫn là percentage
          const rawFee = config.platformFeePercentage;
          const feeDecimal = rawFee / 100; // 0.9 / 100 = 0.009 (0.9%)
          
          setPlatformFeePercentage(feeDecimal);
          setSwapConfig(config);
          setBackendConnected(true);
          
          // Truyền platformFeePercentage xuống SwapBloc
          swapBloc.setPlatformFeePercentage(feeDecimal);
          
          console.log(`✅ Phí nền tảng từ backend:`);
          console.log(`   - Raw value: ${rawFee}`);
          console.log(`   - Decimal for calculation: ${feeDecimal}`);
          console.log(`   - Display percentage: ${rawFee}%`);
        }
      } catch (error) {
        console.warn('⚠️ Không thể tải phí nền tảng từ backend, sử dụng mặc định:', error);
        setBackendConnected(false);
        // Keep default 0.9% fee (0.009 decimal) - cập nhật từ backend
      }
    };

    swapBloc.addListener(handleStateChange);
    swapBloc.add(new LoadSupportedTokensEvent());
    loadWalletAddress();
    loadPlatformFee(); // Load backend configuration
    
    // Load tokens có balance thực tế từ Dashboard cho tab BÁN
    loadSellableTokensFromDashboard();
    
    // Setup listener cho GlobalTokenService để auto update khi Dashboard thay đổi
    const globalTokenService = GlobalTokenService.getInstance();
    globalTokenService.addListener(() => {
      console.log('🔔 SwapScreen: Nhận được thông báo cập nhật từ GlobalTokenService');
      loadSellableTokensFromDashboard(); // Refresh sellable tokens
    });
    
    // Setup price refresh interval
    const priceInterval = setInterval(() => {
      if (cachedTokens.length > 0) {
        loadTokenPrices(cachedTokens);
      }
    }, 60000); // Refresh mỗi 60 giây
    
    return () => {
      clearInterval(priceInterval);
      swapBloc.removeListener(handleStateChange);
    };
  }, []);

  const handleBuyPress = (token: TokenInfo) => {
    setSelectedToken(token);
    setSwapType(SwapType.BUY);
    setShowSwapModal(true);
  };

  const handleSellPress = (token: TokenInfo) => {
    setSelectedToken(token);
    setSwapType(SwapType.SELL);
    setShowSwapModal(true);
  };

  const handleGetQuote = (amount: string) => {
    // Kiểm tra dữ liệu đầu vào
    if (!selectedToken) {
      console.warn('Không thể lấy báo giá: Chưa chọn token');
      return;
    }
    
    if (!amount || parseFloat(amount) <= 0) {
      console.warn('Không thể lấy báo giá: Số lượng không hợp lệ');
      return;
    }
    
    // Dọn dẹp số lượng để đảm bảo định dạng đúng
    const cleanAmount = amount.trim();

    // Tạo request lấy báo giá swap
    const request: SwapRequest = {
      fromToken: swapType === SwapType.BUY ? 
        { symbol: 'USDT', name: 'Tether USD', address: '0x55d398326f99059fF775485246999027B3197955', decimals: 18 } : 
        selectedToken,
      toToken: swapType === SwapType.BUY ? 
        selectedToken : 
        { symbol: 'USDT', name: 'Tether USD', address: '0x55d398326f99059fF775485246999027B3197955', decimals: 18 },
      fromAmount: cleanAmount,
      fromAddress: walletAddress || '0x0000000000000000000000000000000000000000',
      slippage: 1,
    };

    // Debug log
    console.log('🔍 Yêu cầu báo giá swap:', {
      type: swapType === SwapType.BUY ? 'MUA' : 'BÁN',
      from: `${cleanAmount} ${request.fromToken.symbol}`,
      to: request.toToken.symbol,
      walletAddress: request.fromAddress
    });

    // Gửi request lấy báo giá
    swapBloc.add(new GetSwapQuoteEvent(request));
  };

  // Function kiểm tra số dư USDT và hiển thị alert điều hướng
  const checkUSDTBalanceAndNavigate = (requiredAmount: string): boolean => {
    if (swapType !== SwapType.BUY) return true; // Chỉ check cho tab MUA
    
    const usdtToken = sellableTokens.find((t: any) => t.symbol === 'USDT');
    const requiredAmountNum = parseFloat(requiredAmount);
    const currentBalance = usdtToken?.balance ? parseFloat(usdtToken.balance) : 0;
    
    console.log('💰 USDT Balance Check:', {
      required: requiredAmountNum,
      current: currentBalance,
      sufficient: currentBalance >= requiredAmountNum
    });
    
    if (currentBalance < requiredAmountNum) {
      const shortfall = requiredAmountNum - currentBalance;
      
      Alert.alert(
        'Số dư USDT không đủ',
        `Bạn cần ${formatCrypto(requiredAmountNum, 'USDT', 2)} USDT để mua ${selectedToken?.symbol}.\n\nSố dư hiện tại: ${formatCrypto(currentBalance, 'USDT', 2)} USDT\nCòn thiếu: ${formatCrypto(shortfall, 'USDT', 2)} USDT\n\nBạn có muốn nạp thêm USDT không?`,
        [
          {
            text: 'Hủy',
            style: 'cancel'
          },
          {
            text: 'Nạp USDT',
            onPress: () => {
              console.log('🔄 Điều hướng sang màn hình nạp rút với số lượng thiếu:', shortfall);
              setShowSwapModal(false); // Đóng swap modal trước
              
              // Điều hướng sang màn hình nạp rút với amount autofill
              setTimeout(() => {
                (navigation as any).navigate('DepositWithdraw', {
                  prefilledAmount: shortfall.toString(),
                  token: 'USDT'
                });
              }, 300);
            }
          }
        ]
      );
      return false;
    }
    
    return true;
  };

  const handleSwapConfirm = (amount: string) => {
    if (!selectedToken || !amount) {
      console.warn('Không thể xác nhận swap: Thiếu token hoặc số lượng');
      return;
    }

    // Tạo request với thông tin swap
    const request: SwapRequest = {
      fromToken: swapType === SwapType.BUY ? 
        { symbol: 'USDT', name: 'Tether USD', address: '0x55d398326f99059fF775485246999027B3197955', decimals: 18 } : 
        selectedToken,
      toToken: swapType === SwapType.BUY ? 
        selectedToken : 
        { symbol: 'USDT', name: 'Tether USD', address: '0x55d398326f99059fF775485246999027B3197955', decimals: 18 },
      fromAmount: amount,
      fromAddress: walletAddress || '0x0000000000000000000000000000000000000000',
      slippage: 1,
    };

    // Debug log
    console.log('🚀 Xác nhận swap:', {
      type: swapType === SwapType.BUY ? 'MUA' : 'BÁN',
      from: request.fromToken.symbol,
      to: request.toToken.symbol,
      amount: amount
    });

    // Thực hiện swap
    swapBloc.add(new ConfirmSwapEvent(request));
  };

  const handleApprove = (amount: string) => {
    if (!selectedToken || !amount) {
      console.warn('Không thể approve: Thiếu token hoặc số lượng');
      return;
    }

    // Xác định token cần approve
    const tokenAddress = swapType === SwapType.BUY ? 
      '0x55d398326f99059fF775485246999027B3197955' : // USDT BSC
      selectedToken.address;
    
    const tokenSymbol = swapType === SwapType.BUY ? 'USDT' : selectedToken.symbol;
    const tokenDecimals = swapType === SwapType.BUY ? 18 : selectedToken.decimals;
    
    // Địa chỉ router của 1inch trên BSC
    const spenderAddress = '0x111111125421ca6dc452d289314280a0f8842a65'; 
    const ownerAddress = walletAddress || '0x0000000000000000000000000000000000000000';
    
    // Tự động thực hiện approve và swap
    try {
      console.log(`🚀 Bắt đầu quy trình mua ${selectedToken?.symbol} tự động...`);
      
      // Lưu thông tin để tự động swap sau approve
      setAutoSwapAfterApprove(true);
      setPendingSwapAmount(amount);
      
      // Sử dụng infinite approval (max uint256) để không cần approve lại
      const maxUint256 = '115792089237316195423570985008687907853269984665640564039457584007913129639935';
      
      console.log(`🔐 Approve infinite amount cho ${selectedToken?.symbol}:`, {
        tokenAddress,
        spenderAddress,
        amount: maxUint256,
        ownerAddress
      });
      
      // Gọi approve token event với infinite amount
      swapBloc.add(new ApproveTokenEvent(
        tokenAddress,
        spenderAddress, 
        maxUint256,
        ownerAddress
      ));
    } catch (error) {
      console.error('Lỗi khi bắt đầu quy trình mua:', error);
      Alert.alert(
        'Lỗi',
        `Không thể bắt đầu giao dịch. Vui lòng thử lại.`
      );
    }
  };

  // Load giá token từ Binance API
  const loadTokenPrices = async (tokens: TokenInfo[]) => {
    try {
      setPriceLoading(true);
      console.log('💰 Loading prices from Binance for', tokens.length, 'tokens...');
      
      // Lấy danh sách symbol cần lấy giá
      const symbols = tokens
        .map(token => token.symbol)
        .filter(symbol => symbol !== 'BNB'); // BNB sẽ xử lý riêng
      
      console.log('🔍 Symbols to fetch:', symbols);
      
      // Lấy giá từ Binance
      const prices = await binancePriceService.getMultipleTokenPrices(symbols);
      console.log('📊 Received prices from Binance:', Array.from(prices.entries()));
      
      // Thêm giá BNB (native token)
      const bnbPrice = await binancePriceService.getTokenPrice('BNB');
      prices.set('BNB', bnbPrice);
      console.log('💎 BNB price:', bnbPrice);
      
      setTokenPrices(prices);
      console.log('✅ Final tokenPrices Map size:', prices.size);
      console.log('✅ Final tokenPrices content:', Array.from(prices.entries()));
      
    } catch (error) {
      console.error('❌ Error loading token prices:', error);
    } finally {
      setPriceLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    swapBloc.add(new LoadSupportedTokensEvent());
    // Refresh giá token
    if (cachedTokens.length > 0) {
      await loadTokenPrices(cachedTokens);
    }
    setTimeout(() => setRefreshing(false), 1000);
  };
  
  // Hàm đóng modal và reset trạng thái sau khi swap hoàn tất
  const closeAndResetSwapModal = () => {
    console.log('🔄 Đóng modal và reset trạng thái...');
    
    // Đóng modal trước
    setShowSwapModal(false);
    
    // Đợi animation đóng modal hoàn tất
    setTimeout(() => {
      // Reset token đã chọn
      setSelectedToken(null);
      
      // Reset state trong SwapBloc
      swapBloc.add(new ResetSwapEvent());
      
      // Cập nhật lại danh sách token và số dư
      console.log('🔄 Refresh token balances cho địa chỉ:', walletAddress);
      swapBloc.add(new RefreshTokenBalancesEvent(walletAddress));
    }, 500);
  };

  const getFilteredTokens = () => {
    // Debug current state
    console.log('🔍 getFilteredTokens - Current state:', state.constructor.name, 'Active tab:', activeTab);
    
    let tokens: TokenInfo[] = [];
    
    // Sử dụng data source khác nhau cho từng tab
    if (activeTab === 'sell') {
      // Tab BÁN: Sử dụng sellableTokens từ Dashboard (có balance thực tế)
      tokens = sellableTokens;
      console.log('💰 Using sellable tokens từ Dashboard:', tokens.length);
    } else {
      // Tab MUA: Sử dụng tokens từ SwapBloc (danh sách đầy đủ)
      if (state instanceof TokensLoadedState) {
        tokens = state.filteredTokens;
        console.log('📋 Using tokens from TokensLoadedState:', tokens.length);
      } else if (cachedTokens.length > 0) {
        tokens = cachedTokens;
        console.log('💾 Using cached tokens:', tokens.length);
      } else {
        console.log('❌ No tokens available for buy tab');
        return [];
      }
    }
    
    // Filter by search query
    if (searchQuery) {
      tokens = tokens.filter(token =>
        token.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
        token.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
      console.log('🔍 After search filter:', tokens.length);
    }
    
    // Note: sellableTokens đã được filter balance > 0 sẵn rồi
    
    // Sắp xếp theo giá giảm dần (từ cao xuống thấp)
    tokens = tokens.sort((a, b) => {
      const priceA = tokenPrices.get(a.symbol) || a.priceUSD || 0;
      const priceB = tokenPrices.get(b.symbol) || b.priceUSD || 0;
      return priceB - priceA; // Giá cao nhất lên đầu
    });
    
    console.log('✅ Final filtered tokens count:', tokens.length);
    console.log('📊 Sorted by price (descending):', tokens.slice(0, 5).map(t => `${t.symbol}: $${tokenPrices.get(t.symbol) || t.priceUSD || 0}`));
    return tokens;
  };

  const renderCoinItem = ({ item }: { item: TokenInfo }) => (
    <CoinListItem
      key={item.address}
      token={item}
      onBuyPress={activeTab === 'buy' ? handleBuyPress : () => {}}
      onSellPress={activeTab === 'sell' ? handleSellPress : () => {}}
      showBuyButton={activeTab === 'buy'}
      showSellButton={activeTab === 'sell'}
      tokenPrices={tokenPrices}
      priceLoading={priceLoading}
    />
  );

  const renderTabButton = (tabKey: 'buy' | 'sell', title: string, iconName: string) => (
    <TouchableOpacity
      style={{
        flex: 1,
        paddingVertical: 12,
        paddingHorizontal: 16,
        backgroundColor: activeTab === tabKey ? '#3b82f6' : 'transparent',
        borderRadius: 8,
        marginHorizontal: 4,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      onPress={() => setActiveTab(tabKey)}
    >
      <MaterialIcons 
        name={iconName as any} 
        size={20} 
        color={activeTab === tabKey ? 'white' : '#6b7280'} 
        style={{ marginRight: 8 }}
      />
      <Text style={{
        fontSize: 16,
        fontWeight: '600',
        color: activeTab === tabKey ? 'white' : '#6b7280',
        textAlign: 'center',
      }}>
        {title}
      </Text>
    </TouchableOpacity>
  );

  const getTabDescription = () => {
    if (activeTab === 'buy') {
      return 'Sử dụng USDT để mua các coin khác';
    } else {
      return 'Bán các coin có sẵn trong ví để nhận USDT';
    }
  };

  const getEmptyStateMessage = () => {
    if (activeTab === 'buy') {
      return 'Không tìm thấy coin nào để mua';
    } else {
      return 'Bạn chưa có coin nào trong ví để bán';
    }
  };

  return (
    <SafeAreaView style={{
      flex: 1,
      backgroundColor: colors.background,
    }}>
      {/* Header */}
      <View style={{
        backgroundColor: colors.background,
        paddingHorizontal: 16,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
      }}>
        <Text style={{
          fontSize: 20,
          fontWeight: 'bold',
          color: colors.text,
          textAlign: 'center',
        }}>Mua bán Coin</Text>
      </View>

      {/* Tab Buttons */}
      <View style={{
        backgroundColor: colors.background,
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
      }}>
        <View style={{
          flexDirection: 'row',
          backgroundColor: colors.surfaceSecondary,
          borderRadius: 12,
          padding: 4,
        }}>
          {renderTabButton('buy', 'Mua coin', 'trending-up')}
          {renderTabButton('sell', 'Bán coin', 'trending-down')}
        </View>
        



        
        {/* Tab Description */}
        <Text style={{
          fontSize: 14,
          color: colors.textSecondary,
          textAlign: 'center',
          marginTop: 8,
        }}>
          {getTabDescription()}
        </Text>
      </View>

      {/* Search Bar */}
      <View style={{
        backgroundColor: colors.background,
        paddingHorizontal: 16,
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
      }}>
        <TextInput
          style={{
            backgroundColor: colors.surfaceSecondary,
            borderRadius: 12,
            paddingHorizontal: 16,
            paddingVertical: 12,
            fontSize: 16,
            color: colors.text,
          }}
          placeholder={`Tìm kiếm coin ${activeTab === 'buy' ? 'để mua' : 'để bán'}...`}
          placeholderTextColor={colors.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Coin List */}
      {state instanceof SwapLoadingState ? (
        <View style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: colors.background,
        }}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={{
            marginTop: 16,
            fontSize: 16,
            color: colors.textSecondary,
          }}>
            {state.message}
          </Text>
        </View>
      ) : state instanceof SwapErrorState ? (
        <View style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          paddingHorizontal: 32,
        }}>
          <Text style={{
            fontSize: 16,
            color: '#ef4444',
            textAlign: 'center',
            marginBottom: 16,
          }}>
            Có lỗi xảy ra khi tải danh sách coin
          </Text>
          <TouchableOpacity
            style={{
              backgroundColor: colors.primary,
              paddingHorizontal: 24,
              paddingVertical: 12,
              borderRadius: 8,
            }}
            onPress={handleRefresh}
          >
            <Text style={{
              color: colors.textInverse,
              fontSize: 16,
              fontWeight: '600',
            }}>
              Thử lại
            </Text>
          </TouchableOpacity>
        </View>
      ) : getFilteredTokens().length === 0 ? (
        <View style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          paddingHorizontal: 32,
          backgroundColor: colors.background,
        }}>
          <Text style={{
            fontSize: 48,
            marginBottom: 16,
          }}>
            {activeTab === 'buy' ? '🛒' : '💰'}
          </Text>
          <Text style={{
            fontSize: 18,
            fontWeight: '600',
            color: colors.text,
            textAlign: 'center',
            marginBottom: 8,
          }}>
            {getEmptyStateMessage()}
          </Text>
          {activeTab === 'sell' && (
            <Text style={{
              fontSize: 14,
              color: colors.textSecondary,
              textAlign: 'center',
            }}>
              Hãy mua một số coin trước để có thể bán
            </Text>
          )}
        </View>
      ) : (
        <FlatList
          data={getFilteredTokens()}
          renderItem={renderCoinItem}
          keyExtractor={(item) => item.address}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.primary}
            />
          }
          showsVerticalScrollIndicator={false}
          style={{ flex: 1, marginBottom: -88 }}
          contentContainerStyle={{ paddingBottom: 88 }}
        />
      )}

      {/* Swap Modal */}
      <SwapModal
        visible={showSwapModal}
        onClose={() => setShowSwapModal(false)}
        token={selectedToken}
        swapType={swapType}
        onGetQuote={handleGetQuote}
        onConfirm={handleSwapConfirm}
        onApprove={handleApprove}
        loading={state instanceof SwapLoadingState || state instanceof QuoteLoadingState}
        needsApproval={state instanceof QuoteLoadedState ? state.needsApproval : false}
        allowanceAmount={state instanceof QuoteLoadedState ? state.allowanceAmount : '0'}
        approvingToken={approvingToken}
        tokenPrices={tokenPrices}
        priceLoading={priceLoading}
        platformFeePercentage={platformFeePercentage}
        sellableTokens={sellableTokens}
        quote={state instanceof QuoteLoadedState ? {
          fromAmount: state.quote.fromAmount,
          toAmount: state.quote.toAmount,
          fromToken: state.quote.fromToken,
          toToken: state.quote.toToken,
        } : undefined}
      />
    </SafeAreaView>
  );
};
