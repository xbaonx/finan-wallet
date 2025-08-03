import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  TextInput,
  Modal,
  Image,
  Alert,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Platform,
  Keyboard,
  Dimensions,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { SwapBloc } from '../blocs/swap_bloc';
import { SwapState, SwapInitialState, SwapLoadingState, SwapErrorState, TokensLoadedState, SwapConfiguredState, QuoteLoadingState, QuoteLoadedState, SwapSuccessState, SwapFailedState } from '../blocs/swap_state';
import { LoadSupportedTokensEvent, SearchTokensEvent, SelectSwapTypeEvent, SelectFromTokenEvent, SelectToTokenEvent, UpdateFromAmountEvent, GetSwapQuoteEvent, ConfirmSwapEvent, ResetSwapEvent } from '../blocs/swap_event';
import { TokenInfo, SwapType, SwapRequest } from '../../domain/entities/swap_entity';
import { ServiceLocator } from '../../core/di/service_locator';
import { GetCurrentWalletUseCase } from '../../domain/usecases/dashboard_usecases';

interface CoinListItemProps {
  token: TokenInfo;
  onBuyPress: (token: TokenInfo) => void;
  onSellPress: (token: TokenInfo) => void;
  showBuyButton: boolean;
  showSellButton: boolean;
}

const CoinListItem: React.FC<CoinListItemProps> = ({ token, onBuyPress, onSellPress, showBuyButton, showSellButton }) => {
  const formatPrice = (price?: number) => {
    if (!price) return '$0.00';
    return price < 0.01 ? `$${price.toFixed(6)}` : `$${price.toFixed(2)}`;
  };

  const formatPriceChange = (change?: number) => {
    if (!change) return '0.00%';
    const sign = change >= 0 ? '+' : '';
    return `${sign}${change.toFixed(2)}%`;
  };

  const getPriceChangeColor = (change?: number) => {
    if (!change) return '#6b7280';
    return change >= 0 ? '#10b981' : '#ef4444';
  };

  return (
    <View style={{
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: '#f3f4f6',
      backgroundColor: 'white',
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
        }}>
          {token.logoURI ? (
            <Image 
              source={{ uri: token.logoURI }} 
              style={{ width: 32, height: 32, borderRadius: 16 }}
              onError={() => {}}
            />
          ) : (
            <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#6b7280' }}>
              {token.symbol.charAt(0)}
            </Text>
          )}
        </View>
        
        <View style={{ flex: 1 }}>
          <Text style={{
            fontSize: 16,
            fontWeight: '600',
            color: '#111827',
            marginBottom: 2,
          }}>
            {token.symbol}
          </Text>
          <Text style={{
            fontSize: 14,
            color: '#6b7280',
          }}>
            {token.name}
          </Text>
        </View>
      </View>

      {/* Price Info */}
      <View style={{ alignItems: 'flex-end', marginRight: 16 }}>
        <Text style={{
          fontSize: 16,
          fontWeight: '600',
          color: '#111827',
          marginBottom: 2,
        }}>
          {formatPrice(token.priceUSD)}
        </Text>
        <Text style={{
          fontSize: 14,
          color: getPriceChangeColor(token.priceChange24h),
        }}>
          {formatPriceChange(token.priceChange24h)}
        </Text>
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
  loading?: boolean;
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
  loading = false,
  quote,
}) => {
  const [amount, setAmount] = useState('');
  const insets = useSafeAreaInsets();
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const screenHeight = Dimensions.get('window').height;
  const [quoteTimeout, setQuoteTimeout] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', (event) => {
      setKeyboardHeight(event.endCoordinates.height);
    });
    const keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', () => {
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
      <SafeAreaView style={{ flex: 1, backgroundColor: 'white' }}>
        <View style={{ flex: 1, paddingBottom: keyboardHeight > 0 ? keyboardHeight - insets.bottom : 0 }}>
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
            style={{ flex: 1, marginBottom: -88 }}
            contentContainerStyle={{ 
              paddingHorizontal: 16, 
              paddingBottom: 88 
            }}
            keyboardShouldPersistTaps="handled"
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
                  <Text style={{
                    fontSize: 16,
                    fontWeight: '600',
                    color: '#111827',
                    marginTop: 4,
                  }}>
                    ${token.priceUSD?.toFixed(4) || '0.0000'}
                  </Text>
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
              <Text style={{
                fontSize: 14,
                color: '#6b7280',
                marginBottom: 8,
              }}>
                Số lượng {getFromToken()}
              </Text>
              <TextInput
                style={{
                  fontSize: 24,
                  fontWeight: '600',
                  color: '#111827',
                  padding: 0,
                }}
                placeholder="0.00"
                placeholderTextColor="#9ca3af"
                value={amount}
                onChangeText={handleAmountChange}
                keyboardType="numeric"
              />
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
                  {quote.toAmount} {getToToken()}
                </Text>
              </View>
            ) : null}
          </ScrollView>

          {/* Fixed Confirm Button */}
          <View style={{
            padding: 16,
            paddingBottom: 32,
            backgroundColor: 'white',
            borderTopWidth: 1,
            borderTopColor: '#f3f4f6',
          }}>
            <TouchableOpacity
              style={{
                backgroundColor: (amount && quote) ? '#3b82f6' : '#d1d5db',
                borderRadius: 12,
                paddingVertical: 16,
                alignItems: 'center',
              }}
              onPress={() => onConfirm(amount)}
              disabled={!amount || !quote || loading}
            >
              {loading ? (
                <ActivityIndicator color="white" />
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
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

export const SwapScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const [swapBloc] = useState(() => ServiceLocator.get<SwapBloc>('SwapBloc'));
  const [state, setState] = useState<SwapState>(new SwapInitialState());
  const [searchQuery, setSearchQuery] = useState('');
  const [showSwapModal, setShowSwapModal] = useState(false);
  const [selectedToken, setSelectedToken] = useState<TokenInfo | null>(null);
  const [swapType, setSwapType] = useState<SwapType>(SwapType.BUY);
  const [refreshing, setRefreshing] = useState(false);
  const [walletAddress, setWalletAddress] = useState<string>('');
  const getCurrentWalletUseCase = ServiceLocator.get<GetCurrentWalletUseCase>('GetCurrentWalletUseCase');
  const [activeTab, setActiveTab] = useState<'buy' | 'sell'>('buy');
  
  // Preserve tokens from TokensLoadedState across other states
  const [cachedTokens, setCachedTokens] = useState<TokenInfo[]>([]);

  useEffect(() => {
    const handleStateChange = (newState: SwapState) => {
      setState(newState);
      
      // Cache tokens when TokensLoadedState is received
      if (newState instanceof TokensLoadedState) {
        setCachedTokens(newState.filteredTokens);
        console.log('💾 Cached tokens count:', newState.filteredTokens.length);
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

    swapBloc.addListener(handleStateChange);
    swapBloc.add(new LoadSupportedTokensEvent());
    loadWalletAddress();

    return () => swapBloc.removeListener(handleStateChange);
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
    if (!selectedToken || !amount) return;

    const request: SwapRequest = {
      fromToken: swapType === SwapType.BUY ? 
        { symbol: 'USDT', name: 'Tether USD', address: '0xdAC17F958D2ee523a2206206994597C13D831ec7', decimals: 6 } : 
        selectedToken,
      toToken: swapType === SwapType.BUY ? 
        selectedToken : 
        { symbol: 'USDT', name: 'Tether USD', address: '0xdAC17F958D2ee523a2206206994597C13D831ec7', decimals: 6 },
      fromAmount: amount,
      fromAddress: walletAddress || '0x0000000000000000000000000000000000000000',
      slippage: 1,
    };

    // Debug logging
    console.log('🎯 Swap Request Debug:');
    console.log('Selected Token:', selectedToken);
    console.log('Swap Type:', swapType);
    console.log('Amount:', amount);
    console.log('Wallet Address:', walletAddress);
    console.log('From Token:', request.fromToken);
    console.log('To Token:', request.toToken);

    // Chỉ lấy quote, không thực hiện swap
    swapBloc.add(new GetSwapQuoteEvent(request));
  };

  const handleSwapConfirm = (amount: string) => {
    if (!selectedToken || !amount) return;

    const request: SwapRequest = {
      fromToken: swapType === SwapType.BUY ? 
        { symbol: 'USDT', name: 'Tether USD', address: '0xdAC17F958D2ee523a2206206994597C13D831ec7', decimals: 6 } : 
        selectedToken,
      toToken: swapType === SwapType.BUY ? 
        selectedToken : 
        { symbol: 'USDT', name: 'Tether USD', address: '0xdAC17F958D2ee523a2206206994597C13D831ec7', decimals: 6 },
      fromAmount: amount,
      fromAddress: walletAddress || '0x0000000000000000000000000000000000000000',
      slippage: 1,
    };

    // Thực hiện swap thật (có thể trigger approve trước)
    swapBloc.add(new ConfirmSwapEvent(request));
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    swapBloc.add(new LoadSupportedTokensEvent());
    setTimeout(() => setRefreshing(false), 1000);
  };

  const getFilteredTokens = () => {
    // Debug current state
    console.log('🔍 getFilteredTokens - Current state:', state.constructor.name);
    
    let tokens: TokenInfo[] = [];
    
    if (state instanceof TokensLoadedState) {
      tokens = state.filteredTokens;
      console.log('📋 Using tokens from TokensLoadedState:', tokens.length);
    } else if (cachedTokens.length > 0) {
      tokens = cachedTokens;
      console.log('💾 Using cached tokens:', tokens.length);
    } else {
      console.log('❌ No tokens available (neither TokensLoadedState nor cached)');
      return [];
    }
    
    // Filter by search query
    if (searchQuery) {
      tokens = tokens.filter(token =>
        token.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
        token.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
      console.log('🔍 After search filter:', tokens.length);
    }
    
    // Filter by tab
    if (activeTab === 'sell') {
      // Chỉ hiển thị tokens có balance > 0
      tokens = tokens.filter(token => {
        const balance = parseFloat(token.balance || '0');
        return balance > 0;
      });
      console.log('💰 After balance filter (sell tab):', tokens.length);
    }
    
    console.log('✅ Final filtered tokens count:', tokens.length);
    return tokens;
  };

  const renderCoinItem = ({ item }: { item: TokenInfo }) => (
    <CoinListItem
      token={item}
      onBuyPress={activeTab === 'buy' ? handleBuyPress : () => {}}
      onSellPress={activeTab === 'sell' ? handleSellPress : () => {}}
      showBuyButton={activeTab === 'buy'}
      showSellButton={activeTab === 'sell'}
    />
  );

  const renderTabButton = (tabKey: 'buy' | 'sell', title: string, icon: string) => (
    <TouchableOpacity
      style={{
        flex: 1,
        paddingVertical: 12,
        paddingHorizontal: 16,
        backgroundColor: activeTab === tabKey ? '#3b82f6' : 'transparent',
        borderRadius: 8,
        marginHorizontal: 4,
      }}
      onPress={() => setActiveTab(tabKey)}
    >
      <Text style={{
        fontSize: 16,
        fontWeight: '600',
        color: activeTab === tabKey ? 'white' : '#6b7280',
        textAlign: 'center',
      }}>
        {icon} {title}
      </Text>
    </TouchableOpacity>
  );

  const getTabDescription = () => {
    if (activeTab === 'buy') {
      return 'Sử dụng USDT/ETH để mua các coin khác';
    } else {
      return 'Bán các coin có sẵn trong ví để nhận USDT/ETH';
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
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f9fafb' }}>
      {/* Header */}
      <View style={{
        backgroundColor: 'white',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#f3f4f6',
      }}>
        <Text style={{
          fontSize: 20,
          fontWeight: 'bold',
          color: '#111827',
          textAlign: 'center',
        }}>Mua bán Coin</Text>
      </View>

      {/* Tab Buttons */}
      <View style={{
        backgroundColor: 'white',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#f3f4f6',
      }}>
        <View style={{
          flexDirection: 'row',
          backgroundColor: '#f3f4f6',
          borderRadius: 12,
          padding: 4,
        }}>
          {renderTabButton('buy', 'Mua coin', '💰')}
          {renderTabButton('sell', 'Bán coin', '💸')}
        </View>
        
        {/* Tab Description */}
        <Text style={{
          fontSize: 14,
          color: '#6b7280',
          textAlign: 'center',
          marginTop: 8,
        }}>
          {getTabDescription()}
        </Text>
      </View>

      {/* Search Bar */}
      <View style={{
        backgroundColor: 'white',
        paddingHorizontal: 16,
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#f3f4f6',
      }}>
        <TextInput
          style={{
            backgroundColor: '#f3f4f6',
            borderRadius: 12,
            paddingHorizontal: 16,
            paddingVertical: 12,
            fontSize: 16,
            color: '#111827',
          }}
          placeholder={`Tìm kiếm coin ${activeTab === 'buy' ? 'để mua' : 'để bán'}...`}
          placeholderTextColor="#6b7280"
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
        }}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={{
            marginTop: 16,
            fontSize: 16,
            color: '#6b7280',
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
              backgroundColor: '#3b82f6',
              paddingHorizontal: 24,
              paddingVertical: 12,
              borderRadius: 8,
            }}
            onPress={handleRefresh}
          >
            <Text style={{
              color: 'white',
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
            color: '#111827',
            textAlign: 'center',
            marginBottom: 8,
          }}>
            {getEmptyStateMessage()}
          </Text>
          {activeTab === 'sell' && (
            <Text style={{
              fontSize: 14,
              color: '#6b7280',
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
              tintColor="#3b82f6"
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
        loading={state instanceof SwapLoadingState || state instanceof QuoteLoadingState}
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
