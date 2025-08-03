import { TokenInfo, SwapQuote, SwapRequest, SwapResult, SwapTransaction } from '../entities/swap_entity';

export interface SwapRepository {
  // Token operations
  getSupportedTokens(): Promise<TokenInfo[]>;
  getTokenInfo(tokenAddress: string): Promise<TokenInfo>;
  getTokenBalance(tokenAddress: string, walletAddress: string): Promise<string>;
  getTokenPrice(tokenAddress: string): Promise<{ price: number; priceChange24h: number }>;
  
  // Swap operations
  getSwapQuote(request: SwapRequest): Promise<SwapQuote>;
  buildSwapTransaction(request: SwapRequest): Promise<SwapTransaction>;
  executeSwap(transaction: SwapTransaction, privateKey: string): Promise<SwapResult>;
  
  // Allowance operations
  checkAllowance(tokenAddress: string, ownerAddress: string, spenderAddress: string): Promise<string>;
  buildApproveTransaction(tokenAddress: string, spenderAddress: string, amount: string, ownerAddress: string): Promise<SwapTransaction>;
  
  // Transaction status
  getTransactionStatus(transactionHash: string): Promise<'pending' | 'success' | 'failed'>;
}
