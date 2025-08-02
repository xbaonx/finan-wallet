import { TokenEntity, WalletBalance } from '../entities/token_entity';

export interface TokenRepository {
  // Get wallet balance including all tokens
  getWalletBalance(walletAddress: string): Promise<WalletBalance>;
  
  // Get ETH balance
  getETHBalance(walletAddress: string): Promise<TokenEntity>;
  
  // Get ERC-20 token balances
  getERC20Tokens(walletAddress: string): Promise<TokenEntity[]>;
  
  // Get token prices in USD
  getTokenPrices(tokenAddresses: string[]): Promise<{ [address: string]: number }>;
  
  // Get native ETH price
  getETHPrice(): Promise<number>;
}
