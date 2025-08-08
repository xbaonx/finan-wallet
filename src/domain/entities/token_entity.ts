export interface TokenEntity {
  name: string;
  symbol: string;
  address: string;
  logoUri?: string;
  balance: string; // Balance in token units (e.g., "1.5" for 1.5 ETH)
  priceUSD: number; // Price per token in USD
  chainId: number;
  decimals: number;
  isNative?: boolean; // true for ETH, false for ERC-20 tokens
  chainLogo?: string; // Logo của chain (BSC, ETH)
  chainName?: string; // Tên chain (BSC, ETH)
}

export interface WalletBalance {
  address?: string;
  totalBalanceUSD: number;
  tokens: TokenEntity[];
  nativeToken?: {
    symbol: string;
    name: string;
    balance: string;
    balanceFormatted: string;
    usdPrice: number;
    usdValue: number;
    logo: string;
    decimals: number;
  };
}
