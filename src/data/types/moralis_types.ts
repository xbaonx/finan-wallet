/**
 * Moralis API Response Types
 * Type definitions for Moralis API responses
 */

export interface MoralisNativeBalanceResponse {
  balance: string;
}

export interface MoralisTokenBalanceResponse {
  result: MoralisTokenBalance[];
}

export interface MoralisTokenBalance {
  token_address: string;
  name: string;
  symbol: string;
  logo?: string;
  decimals: number;
  balance: string;
}

export interface MoralisPriceResponse {
  tokenName: string;
  tokenSymbol: string;
  tokenLogo: string;
  tokenDecimals: string;
  nativePrice: {
    value: string;
    decimals: number;
    name: string;
    symbol: string;
  };
  usdPrice: number;
  exchangeAddress: string;
  exchangeName: string;
}
