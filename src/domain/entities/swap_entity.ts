export interface TokenInfo {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  logoURI?: string;
  balance?: string;
  priceUSD?: number;
  priceChange24h?: number;
}

export interface SwapQuote {
  fromToken: TokenInfo;
  toToken: TokenInfo;
  fromAmount: string;
  toAmount: string;
  estimatedGas: string;
  gasPrice: string;
  protocols: any[];
  estimatedSlippage: number;
  estimatedTime: number; // in seconds
}

export interface SwapRequest {
  fromToken: TokenInfo;
  toToken: TokenInfo;
  fromAmount: string;
  fromAddress: string;
  slippage: number; // percentage (e.g., 1 for 1%)
  disableEstimate?: boolean;
  allowPartialFill?: boolean;
}

export interface SwapResult {
  transactionHash: string;
  fromAmount: string;
  toAmount: string;
  gasUsed: string;
  gasPrice: string;
  status: 'pending' | 'success' | 'failed';
  timestamp: Date;
}

export interface SwapTransaction {
  to: string;
  data: string;
  value: string;
  gas: string;
  gasPrice: string;
}

export enum SwapType {
  BUY = 'buy',  // USDT -> Token
  SELL = 'sell' // Token -> USDT
}

export interface SwapOrder {
  id: string;
  type: SwapType;
  fromToken: TokenInfo;
  toToken: TokenInfo;
  fromAmount: string;
  toAmount: string;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  createdAt: Date;
  completedAt?: Date;
  transactionHash?: string;
}
