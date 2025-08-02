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
}

export interface WalletBalance {
  address: string;
  totalBalanceUSD: number;
  tokens: TokenEntity[];
}
