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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SwapBloc } from '../blocs/swap_bloc';
import { SwapState, SwapInitialState, SwapLoadingState, SwapErrorState, TokensLoadedState, SwapConfiguredState, QuoteLoadedState, SwapSuccessState, SwapFailedState } from '../blocs/swap_state';
import { LoadSupportedTokensEvent, SearchTokensEvent, SelectSwapTypeEvent, SelectFromTokenEvent, SelectToTokenEvent, UpdateFromAmountEvent, GetSwapQuoteEvent, ConfirmSwapEvent, ResetSwapEvent } from '../blocs/swap_event';
import { TokenInfo, SwapType, SwapRequest } from '../../domain/entities/swap_entity';
import { ServiceLocator } from '../../core/di/service_locator';
import { GetCurrentWalletUseCase } from '../../domain/usecases/dashboard_usecases';

interface TokenListItemProps {
  token: TokenInfo;
  onSelect: (token: TokenInfo) => void;
  showBalance?: boolean;
}

const TokenListItem: React.FC<TokenListItemProps> = ({ token, onSelect, showBalance = true }) => {
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
    <TouchableOpacity
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#f3f4f6',
      }}
      onPress={() => onSelect(token)}
    >
      {/* Token Logo */}
      <View style={{
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#f3f4f6',
        marginRight: 12,
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        {token.logoURI ? (
          <Image source={{ uri: token.logoURI }} style={{ width: 32, height: 32, borderRadius: 16 }} />
        ) : (
          <Text style={{ color: '#6b7280', fontWeight: '600' }}>{token.symbol.charAt(0)}</Text>
        )}
      </View>

      {/* Token Info */}
      <View style={{ flex: 1 }}>
        <Text style={{ color: '#111827', fontWeight: '600', fontSize: 16 }}>{token.name}</Text>
        <Text style={{ color: '#6b7280', fontSize: 14 }}>{token.symbol}</Text>
      </View>

      {/* Price & Balance */}
      <View style={{ alignItems: 'flex-end' }}>
        {showBalance && token.balance && (
          <Text style={{ color: '#111827', fontWeight: '600', fontSize: 16 }}>
            {parseFloat(token.balance).toFixed(4)} {token.symbol}
          </Text>
        )}
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text style={{ color: '#4b5563', fontSize: 14, marginRight: 8 }}>
            {formatPrice(token.priceUSD)}
          </Text>
          <Text style={{ fontSize: 14, fontWeight: '500', color: getPriceChangeColor(token.priceChange24h) }}>
            {formatPriceChange(token.priceChange24h)}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

interface SwapConfirmModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
  swapType: SwapType;
  fromToken: TokenInfo | null;
  toToken: TokenInfo | null;
  fromAmount: string;
  toAmount: string;
  loading?: boolean;
}

const SwapConfirmModal: React.FC<SwapConfirmModalProps> = ({
  visible,
  onClose,
  onConfirm,
  swapType,
  fromToken,
  toToken,
  fromAmount,
  toAmount,
  loading = false,
}) => {
  if (!fromToken || !toToken) return null;

  const actionText = swapType === SwapType.BUY ? 'Mua' : 'Bán';
  const confirmText = swapType === SwapType.BUY ? 'Xác nhận mua' : 'Xác nhận bán';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={{
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
      }}>
        <View style={{
          backgroundColor: 'white',
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          padding: 24,
        }}>
          <View style={{
            width: 48,
            height: 4,
            backgroundColor: '#d1d5db',
            borderRadius: 2,
            alignSelf: 'center',
            marginBottom: 24,
          }} />
          
          <Text style={{
            fontSize: 20,
            fontWeight: 'bold',
            color: '#111827',
            textAlign: 'center',
            marginBottom: 24,
          }}>
            {actionText} {toToken.symbol}
          </Text>

          {/* Swap Details */}
          <View style={{
            backgroundColor: '#f9fafb',
            borderRadius: 16,
            padding: 16,
            marginBottom: 24,
          }}>
            <View style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 12,
            }}>
              <Text style={{ color: '#6b7280' }}>Bạn trả:</Text>
              <Text style={{ color: '#111827', fontWeight: '600' }}>
                {fromAmount} {fromToken.symbol}
              </Text>
            </View>
            
            <View style={{ flexDirection: 'row', justifyContent: 'center', marginBottom: 12 }}>
              <Text style={{ fontSize: 24 }}>⬇️</Text>
            </View>
            
            <View style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              <Text style={{ color: '#6b7280' }}>Bạn nhận:</Text>
              <Text style={{ color: '#111827', fontWeight: '600' }}>
                {toAmount} {toToken.symbol}
              </Text>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <TouchableOpacity
              style={{
                flex: 1,
                backgroundColor: '#f3f4f6',
                borderRadius: 16,
                paddingVertical: 16,
              }}
              onPress={onClose}
              disabled={loading}
            >
              <Text style={{
                color: '#374151',
                fontWeight: '600',
                textAlign: 'center',
                fontSize: 16,
              }}>
                Hủy
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={{
                flex: 1,
                backgroundColor: '#3b82f6',
                borderRadius: 16,
                paddingVertical: 16,
              }}
              onPress={onConfirm}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={{
                  color: 'white',
                  fontWeight: '600',
                  textAlign: 'center',
                  fontSize: 16,
                }}>
                  {confirmText}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export const SwapScreen: React.FC = () => {
  const [swapBloc] = useState(() => ServiceLocator.get<SwapBloc>('SwapBloc'));
  const [state, setState] = useState<SwapState>(new SwapInitialState());
  const [searchQuery, setSearchQuery] = useState('');
  const [showSwapModal, setShowSwapModal] = useState(false);
  const [selectedToken, setSelectedToken] = useState<TokenInfo | null>(null);
  const [swapType, setSwapType] = useState<SwapType>(SwapType.BUY);
  const [fromAmountInput, setFromAmountInput] = useState('');
  const [toAmountInput, setToAmountInput] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [walletAddress, setWalletAddress] = useState<string>('0x742d35Cc6634C0532925a3b844Bc454e4438f44e');

  useEffect(() => {
    const handleStateChange = (newState: SwapState) => {
      setState(newState);
      
      if (newState instanceof SwapSuccessState) {
        setShowConfirmModal(false);
        Alert.alert(
          'Giao dịch thành công!',
          `Đã ${activeTab === SwapType.BUY ? 'mua' : 'bán'} ${newState.toAmount} ${newState.toTokenSymbol}`,
          [{ text: 'OK', onPress: () => swapBloc.add(new ResetSwapEvent()) }]
        );
      } else if (newState instanceof SwapFailedState) {
        setShowConfirmModal(false);
        Alert.alert('Giao dịch thất bại', newState.error);
      }
    };

    swapBloc.addListener(handleStateChange);
    
    // Load initial data
    swapBloc.add(new LoadSupportedTokensEvent());
    swapBloc.add(new SelectSwapTypeEvent(activeTab));

    // Load wallet address
    const loadWalletAddress = async () => {
      try {
        const getCurrentWalletUseCase = ServiceLocator.get<GetCurrentWalletUseCase>('GetCurrentWalletUseCase');
        const wallet = await getCurrentWalletUseCase.execute();
        if (wallet) {
          setWalletAddress(wallet.address);
        }
      } catch (error) {
        console.error('Error loading wallet address:', error);
      }
    };

    loadWalletAddress();

    return () => swapBloc.removeListener(handleStateChange);
  }, []);

  const handleTabChange = (tab: SwapType) => {
    setActiveTab(tab);
    swapBloc.add(new SelectSwapTypeEvent(tab));
  };

  const handleTokenSelect = (token: TokenInfo) => {
    if (selectingTokenType === 'from') {
      swapBloc.add(new SelectFromTokenEvent(token));
    } else {
      swapBloc.add(new SelectToTokenEvent(token));
    }
    setShowTokenList(false);
  };

  const handleAmountChange = (amount: string) => {
    setFromAmountInput(amount);
    swapBloc.add(new UpdateFromAmountEvent(amount));
  };

  const handleGetQuote = () => {
    if (!getFromToken() || !getToToken() || !fromAmountInput) {
      Alert.alert('Thông tin không đầy đủ', 'Vui lòng chọn token và nhập số lượng');
      return;
    }

    const request: SwapRequest = {
      fromToken: getFromToken()!,
      toToken: getToToken()!,
      fromAmount: fromAmountInput,
      fromAddress: walletAddress || '0x0000000000000000000000000000000000000000',
      slippage: 1, // 1% slippage
    };

    swapBloc.add(new GetSwapQuoteEvent(request));
  };

  const handleConfirmSwap = () => {
    if (!getFromToken() || !getToToken() || !fromAmountInput) return;

    const request: SwapRequest = {
      fromToken: getFromToken()!,
      toToken: getToToken()!,
      fromAmount: fromAmountInput,
      fromAddress: walletAddress || '0x0000000000000000000000000000000000000000',
      slippage: 1, // 1% slippage
    };

    swapBloc.add(new ConfirmSwapEvent(request));
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    swapBloc.add(new LoadSupportedTokensEvent());
    setTimeout(() => setRefreshing(false), 1000);
  };

  const getFromToken = (): TokenInfo | null => {
    if (state instanceof SwapConfiguredState || state instanceof QuoteLoadedState) {
      return state.fromToken;
    }
    return null;
  };

  const getToToken = (): TokenInfo | null => {
    if (state instanceof SwapConfiguredState || state instanceof QuoteLoadedState) {
      return state.toToken;
    }
    return null;
  };

  const getFilteredTokens = (): TokenInfo[] => {
    if (state instanceof TokensLoadedState || state instanceof SwapConfiguredState || state instanceof QuoteLoadedState) {
      return state.filteredTokens;
    }
    return [];
  };

  const getEstimatedAmount = (): string => {
    if (state instanceof QuoteLoadedState) {
      return parseFloat(state.quote.toAmount).toFixed(6);
    }
    return '';
  };

  const showTokenSelection = (type: 'from' | 'to') => {
    setSelectingTokenType(type);
    setShowTokenList(true);
  };

  const isLoading = state instanceof SwapLoadingState;
  const isQuoteLoading = state instanceof SwapLoadingState && state.message?.includes('quote');

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: 'white' }}>
      {/* Header */}
      <View style={{
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
        }}>Swap Token</Text>
      </View>

      {/* Tab Selector */}
      <View style={{
        flexDirection: 'row',
        marginHorizontal: 16,
        marginTop: 16,
        backgroundColor: '#f3f4f6',
        borderRadius: 16,
        padding: 4,
      }}>
        <TouchableOpacity
          style={{
            flex: 1,
            paddingVertical: 12,
            borderRadius: 12,
            backgroundColor: activeTab === SwapType.BUY ? 'white' : 'transparent',
          }}
          onPress={() => handleTabChange(SwapType.BUY)}
        >
          <Text style={{
            textAlign: 'center',
            fontWeight: '600',
            color: activeTab === SwapType.BUY ? '#3b82f6' : '#6b7280',
          }}>
            Mua coin
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={{
            flex: 1,
            paddingVertical: 12,
            borderRadius: 12,
            backgroundColor: activeTab === SwapType.SELL ? 'white' : 'transparent',
          }}
          onPress={() => handleTabChange(SwapType.SELL)}
        >
          <Text style={{
            textAlign: 'center',
            fontWeight: '600',
            color: activeTab === SwapType.SELL ? '#3b82f6' : '#6b7280',
          }}>
            Bán coin
          </Text>
        </TouchableOpacity>
      </View>

      {/* Swap Interface */}
      <View style={{ padding: 16, gap: 16 }}>
        {/* From Token */}
        <View style={{
          backgroundColor: '#f9fafb',
          borderRadius: 16,
          padding: 16,
        }}>
          <Text style={{
            color: '#6b7280',
            fontSize: 14,
            marginBottom: 8,
          }}>
            {activeTab === SwapType.BUY ? 'Bạn trả' : 'Bạn bán'}
          </Text>
          
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            <TouchableOpacity
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: 'white',
                borderRadius: 12,
                paddingHorizontal: 12,
                paddingVertical: 8,
              }}
              onPress={() => showTokenSelection('from')}
              disabled={activeTab === SwapType.BUY} // USDT is fixed for buy
            >
              <View style={{
                width: 24,
                height: 24,
                borderRadius: 12,
                backgroundColor: '#f3f4f6',
                marginRight: 8,
              }} />
              <Text style={{
                color: '#111827',
                fontWeight: '600',
              }}>
                {getFromToken()?.symbol || 'Chọn token'}
              </Text>
              {activeTab === SwapType.SELL && <Text style={{ color: '#9ca3af', marginLeft: 4 }}>▼</Text>}
            </TouchableOpacity>
            
            <TextInput
              style={{
                flex: 1,
                textAlign: 'right',
                fontSize: 18,
                fontWeight: '600',
                color: '#111827',
                marginLeft: 16,
              }}
              placeholder="0.0"
              value={fromAmountInput}
              onChangeText={handleAmountChange}
              keyboardType="numeric"
            />
          </View>
        </View>

        {/* Swap Arrow */}
        <View style={{ alignItems: 'center' }}>
          <View style={{
            width: 40,
            height: 40,
            backgroundColor: '#dbeafe',
            borderRadius: 20,
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <Text style={{ color: '#3b82f6', fontSize: 18 }}>⬇️</Text>
          </View>
        </View>

        {/* To Token */}
        <View style={{
          backgroundColor: '#f9fafb',
          borderRadius: 16,
          padding: 16,
        }}>
          <Text style={{
            color: '#6b7280',
            fontSize: 14,
            marginBottom: 8,
          }}>
            {activeTab === SwapType.BUY ? 'Bạn nhận' : 'Bạn nhận'}
          </Text>
          
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            <TouchableOpacity
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: 'white',
                borderRadius: 12,
                paddingHorizontal: 12,
                paddingVertical: 8,
              }}
              onPress={() => showTokenSelection('to')}
              disabled={activeTab === SwapType.SELL} // USDT is fixed for sell
            >
              <View style={{
                width: 24,
                height: 24,
                borderRadius: 12,
                backgroundColor: '#f3f4f6',
                marginRight: 8,
              }} />
              <Text style={{
                color: '#111827',
                fontWeight: '600',
              }}>
                {getToToken()?.symbol || 'Chọn token'}
              </Text>
              {activeTab === SwapType.BUY && <Text style={{ color: '#9ca3af', marginLeft: 4 }}>▼</Text>}
            </TouchableOpacity>
            
            <Text style={{
              flex: 1,
              textAlign: 'right',
              fontSize: 18,
              fontWeight: '600',
              color: '#111827',
              marginLeft: 16,
            }}>
              {getEstimatedAmount() || '0.0'}
            </Text>
          </View>
        </View>

        {/* Get Quote Button */}
        <TouchableOpacity
          style={{
            backgroundColor: '#3b82f6',
            borderRadius: 16,
            paddingVertical: 16,
            marginTop: 24,
            opacity: (isLoading || !getFromToken() || !getToToken() || !fromAmountInput) ? 0.5 : 1,
          }}
          onPress={handleGetQuote}
          disabled={isLoading || !getFromToken() || !getToToken() || !fromAmountInput}
        >
          {isQuoteLoading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={{
              color: 'white',
              fontWeight: '600',
              textAlign: 'center',
              fontSize: 16,
            }}>
              Lấy báo giá
            </Text>
          )}
        </TouchableOpacity>

        {/* Confirm Swap Button */}
        {state instanceof QuoteLoadedState && (
          <TouchableOpacity
            style={{
              backgroundColor: '#10b981',
              borderRadius: 16,
              paddingVertical: 16,
            }}
            onPress={() => setShowConfirmModal(true)}
          >
            <Text style={{
              color: 'white',
              fontWeight: '600',
              textAlign: 'center',
              fontSize: 16,
            }}>
              {activeTab === SwapType.BUY ? 'Xác nhận mua' : 'Xác nhận bán'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Token List Modal */}
      <Modal
        visible={showTokenList}
        animationType="slide"
        onRequestClose={() => setShowTokenList(false)}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: 'white' }}>
          {/* Header */}
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: 16,
            borderBottomWidth: 1,
            borderBottomColor: '#f3f4f6',
          }}>
            <TouchableOpacity onPress={() => setShowTokenList(false)}>
              <Text style={{ color: '#3b82f6', fontSize: 16 }}>Hủy</Text>
            </TouchableOpacity>
            <Text style={{ fontSize: 18, fontWeight: '600', color: '#111827' }}>Chọn token</Text>
            <View style={{ width: 32 }} />
          </View>

          {/* Search */}
          <View style={{ paddingHorizontal: 16, paddingVertical: 12 }}>
            <TextInput
              style={{
                backgroundColor: '#f3f4f6',
                borderRadius: 16,
                paddingHorizontal: 16,
                paddingVertical: 12,
                fontSize: 16,
              }}
              placeholder="Tìm kiếm token..."
              value={searchQuery}
              onChangeText={(text) => {
                setSearchQuery(text);
                swapBloc.add(new SearchTokensEvent(text));
              }}
            />
          </View>

          {/* Token List */}
          <FlatList
            data={getFilteredTokens()}
            keyExtractor={(item) => item.address}
            renderItem={({ item }) => (
              <TokenListItem
                token={item}
                onSelect={handleTokenSelect}
                showBalance={activeTab === SwapType.SELL}
              />
            )}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
            }
            ListEmptyComponent={
              isLoading ? (
                <View style={{
                  flex: 1,
                  alignItems: 'center',
                  justifyContent: 'center',
                  paddingVertical: 80,
                }}>
                  <ActivityIndicator size="large" color="#3b82f6" />
                  <Text style={{ color: '#6b7280', marginTop: 16 }}>Đang tải danh sách token...</Text>
                </View>
              ) : (
                <View style={{
                  flex: 1,
                  alignItems: 'center',
                  justifyContent: 'center',
                  paddingVertical: 80,
                }}>
                  <Text style={{ color: '#6b7280' }}>Không tìm thấy token nào</Text>
                </View>
              )
            }
          />
        </SafeAreaView>
      </Modal>

      {/* Confirm Swap Modal */}
      <SwapConfirmModal
        visible={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        onConfirm={handleConfirmSwap}
        swapType={activeTab}
        fromToken={getFromToken()}
        toToken={getToToken()}
        fromAmount={fromAmountInput}
        toAmount={getEstimatedAmount()}
        loading={state instanceof SwapLoadingState}
      />

      {/* Error Display */}
      {state instanceof SwapErrorState && (
        <View style={{
          position: 'absolute',
          bottom: 80,
          left: 16,
          right: 16,
          backgroundColor: '#fef2f2',
          borderColor: '#fecaca',
          borderWidth: 1,
          borderRadius: 16,
          padding: 16,
        }}>
          <Text style={{ color: '#dc2626', textAlign: 'center' }}>{state.error}</Text>
        </View>
      )}
    </SafeAreaView>
  );
};


