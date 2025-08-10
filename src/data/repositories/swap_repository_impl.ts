import { ethers } from 'ethers';
import { TokenInfo, SwapQuote, SwapRequest, SwapResult, SwapTransaction } from '../../domain/entities/swap_entity';
import { SwapRepository } from '../../domain/repositories/swap_repository';
import { OneInchApiService } from '../services/oneinch_api_service';
import { POPULAR_TOKENS } from '../../core/config/token_list';
import { tokenListCacheService } from '../services/token_list_cache_service';

// ERC-20 ABI cho các function cần thiết
const ERC20_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
  'function name() view returns (string)',
];

export class SwapRepositoryImpl implements SwapRepository {
  private provider: ethers.JsonRpcProvider | null = null;
  
  constructor(
    private oneInchService: OneInchApiService,
    private rpcUrl: string = 'https://bsc-dataseed.binance.org/' // BSC RPC
  ) {
    // Lazy initialization of RPC provider
  }

  private async getProvider(): Promise<ethers.JsonRpcProvider> {
    if (!this.provider) {
      try {
        this.provider = new ethers.JsonRpcProvider(this.rpcUrl);
        // Test the connection
        await this.provider.getNetwork();
      } catch (error) {
        console.warn('Primary RPC failed, trying fallback:', error);
        try {
          this.provider = new ethers.JsonRpcProvider('https://rpc.ankr.com/bsc');
          await this.provider.getNetwork();
        } catch (fallbackError) {
          console.warn('Fallback RPC also failed:', fallbackError);
          // Create a dummy provider that won't cause crashes
          this.provider = new ethers.JsonRpcProvider('https://bsc-dataseed1.defibit.io/');
        }
      }
    }
    return this.provider;
  }

  async getSupportedTokens(): Promise<TokenInfo[]> {
    try {
      // Check cache first
      const cachedTokens = tokenListCacheService.getCachedTokenList();
      if (cachedTokens) {
        console.log(`✅ Using cached supported tokens list (${cachedTokens.length} tokens)`);
        return cachedTokens;
      }

      console.log('✅ Sử dụng danh sách token tĩnh (giá sẽ được lấy từ Binance API trong UI)...');
      
      // Sử dụng trực tiếp danh sách token phổ biến từ token_list.ts
      console.log(`📋 Sử dụng ${POPULAR_TOKENS.length} token phổ biến từ danh sách tĩnh`);
      
      // Không lấy giá ở đây nữa, để UI tự lấy từ Binance API
      const tokensWithoutPrices = POPULAR_TOKENS.map(token => ({
        ...token,
        priceUSD: 0, // Sẽ được cập nhật từ Binance API trong UI
        priceChange24h: 0,
      }));
      
      console.log(`✅ Prepared ${tokensWithoutPrices.length} tokens (giá sẽ được lấy từ Binance API)`);
      
      // Cache the result before returning
      tokenListCacheService.setCachedTokenList(tokensWithoutPrices);
      console.log(`💾 Cached ${tokensWithoutPrices.length} tokens`);
      
      return tokensWithoutPrices;
      
    } catch (error) {
      console.error('❌ Error in getSupportedTokens:', error);
      
      // Return basic tokens as fallback
      const fallbackTokens = POPULAR_TOKENS.slice(0, 10).map(token => ({
        ...token,
        priceUSD: 0,
        priceChange24h: 0,
      }));
      
      console.log(`⚠️ Using fallback tokens: ${fallbackTokens.length} tokens`);
      return fallbackTokens;
    }
  }

  async getTokenInfo(tokenAddress: string): Promise<TokenInfo> {
    try {
      const provider = await this.getProvider();
      const contract = new ethers.Contract(tokenAddress, ERC20_ABI, provider);
      
      const [symbol, name, decimals] = await Promise.all([
        contract.symbol(),
        contract.name(),
        contract.decimals()
      ]);
      
      return {
        address: tokenAddress,
        symbol,
        name,
        decimals,
        priceUSD: 0, // Sẽ được cập nhật từ Binance API
        priceChange24h: 0,
      };
    } catch (error) {
      console.error('❌ Error getting token info:', error);
      throw new Error(`Failed to get token info for ${tokenAddress}`);
    }
  }

  async getTokenBalance(tokenAddress: string, walletAddress: string): Promise<string> {
    try {
      const provider = await this.getProvider();
      
      // Handle native token (BNB on BSC)
      if (tokenAddress === '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee') {
        const balance = await provider.getBalance(walletAddress);
        return ethers.formatEther(balance);
      }
      
      // Handle ERC-20 tokens
      const contract = new ethers.Contract(tokenAddress, ERC20_ABI, provider);
      const balance = await contract.balanceOf(walletAddress);
      const decimals = await contract.decimals();
      
      return ethers.formatUnits(balance, decimals);
    } catch (error) {
      console.error('❌ Error getting token balance:', error);
      return '0';
    }
  }

  async getTokenPrice(tokenAddress: string): Promise<{ price: number; priceChange24h: number }> {
    // Giá sẽ được lấy từ Binance API trong UI, không cần implement ở đây
    console.log('💡 Token price will be fetched from Binance API in UI');
    return {
      price: 0,
      priceChange24h: 0,
    };
  }

  async getSwapQuote(request: SwapRequest, platformFeePercentage?: number): Promise<SwapQuote> {
    try {
      return await this.oneInchService.getSwapQuote(request, platformFeePercentage);
    } catch (error) {
      console.error('❌ Error getting swap quote:', error);
      throw error;
    }
  }

  private calculateFallbackQuote(request: SwapRequest): SwapQuote {
    // Simple fallback calculation
    const fromAmount = parseFloat(request.fromAmount);
    const toAmount = fromAmount * 0.99; // Assume 1% slippage
    
    return {
      fromToken: request.fromToken,
      toToken: request.toToken,
      fromAmount: request.fromAmount,
      toAmount: toAmount.toString(),
      estimatedGas: '150000',
      gasPrice: '5000000000', // 5 Gwei for BSC
      protocols: [],
      estimatedSlippage: 1.0,
      estimatedTime: 30,
    };
  }

  async buildSwapTransaction(request: SwapRequest, platformFeePercentage?: number): Promise<SwapTransaction> {
    return await this.oneInchService.buildSwapTransaction(request, platformFeePercentage);
  }

  async executeSwap(transaction: SwapTransaction, privateKey: string): Promise<SwapResult> {
    try {
      const provider = await this.getProvider();
      const wallet = new ethers.Wallet(privateKey, provider);
      
      const tx = {
        to: transaction.to,
        data: transaction.data,
        value: transaction.value,
        gasLimit: transaction.gasLimit,
        gasPrice: transaction.gasPrice,
      };
      
      const sentTx = await wallet.sendTransaction(tx);
      const receipt = await sentTx.wait();
      
      return {
        transactionHash: sentTx.hash,
        fromAmount: transaction.fromAmount || '0',
        toAmount: transaction.toAmount || '0',
        gasUsed: receipt?.gasUsed.toString() || '0',
        gasPrice: transaction.gasPrice,
        status: 'success',
        timestamp: new Date(),
      };
    } catch (error) {
      console.error('❌ Error executing swap:', error);
      throw new Error(`Swap execution failed: ${error}`);
    }
  }

  async checkAllowance(tokenAddress: string, ownerAddress: string, spenderAddress: string): Promise<string> {
    try {
      // Handle native token (BNB)
      if (tokenAddress === '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee') {
        return ethers.MaxUint256.toString(); // Native token doesn't need approval
      }
      
      const provider = await this.getProvider();
      const contract = new ethers.Contract(tokenAddress, ERC20_ABI, provider);
      const allowance = await contract.allowance(ownerAddress, spenderAddress);
      
      return allowance.toString();
    } catch (error) {
      console.error('❌ Error checking allowance:', error);
      return '0';
    }
  }

  async buildApproveTransaction(
    tokenAddress: string,
    spenderAddress: string,
    amount: string,
    ownerAddress: string
  ): Promise<SwapTransaction> {
    try {
      return await this.oneInchService.buildApproveTransaction(tokenAddress, spenderAddress, amount, ownerAddress);
    } catch (error) {
      console.error('❌ Error building approve transaction:', error);
      throw new Error(`Failed to build approve transaction: ${error}`);
    }
  }

  async getTransactionStatus(transactionHash: string): Promise<'pending' | 'success' | 'failed'> {
    try {
      const provider = await this.getProvider();
      const receipt = await provider.getTransactionReceipt(transactionHash);
      
      if (!receipt) {
        return 'pending';
      }
      
      return receipt.status === 1 ? 'success' : 'failed';
    } catch (error) {
      console.error('❌ Error getting transaction status:', error);
      return 'failed';
    }
  }
}
