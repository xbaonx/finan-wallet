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
          this.provider = new ethers.JsonRpcProvider('https://rpc.ankr.com/eth');
          await this.provider.getNetwork();
        } catch (fallbackError) {
          console.warn('Fallback RPC also failed:', fallbackError);
          // Create a dummy provider that won't cause crashes
          this.provider = new ethers.JsonRpcProvider('https://eth.llamarpc.com');
        }
      }
    }
    return this.provider;
  }

  private async processTokensInBatches<T>(
    tokens: any[], 
    batchSize: number, 
    processor: (token: any) => Promise<T>
  ): Promise<T[]> {
    const results: T[] = [];
    
    for (let i = 0; i < tokens.length; i += batchSize) {
      const batch = tokens.slice(i, i + batchSize);
      const batchResults = await Promise.allSettled(
        batch.map(processor)
      );
      
      batchResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          console.error(`Error processing token ${batch[index].symbol}:`, result.reason);
          // Add fallback data for failed tokens
          results.push({
            ...batch[index],
            priceUSD: 0,
            priceChange24h: 0,
          } as T);
        }
      });
      
      // Add delay between batches to avoid rate limiting
      if (i + batchSize < tokens.length) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    
    return results;
  }

  async getSupportedTokens(): Promise<TokenInfo[]> {
    try {
      // Check cache first
      const cachedTokens = tokenListCacheService.getCachedTokenList();
      if (cachedTokens) {
        console.log(`Using cached supported tokens list (${cachedTokens.length} tokens)`);
        return cachedTokens;
      }

      console.log('Sử dụng danh sách token tĩnh (không gọi 1inch API)...');
      
      // Sử dụng trực tiếp danh sách token phổ biến từ token_list.ts
      console.log(`Sử dụng ${POPULAR_TOKENS.length} token phổ biến từ danh sách tĩnh`);
      
      // Dùng danh sách tĩnh, không gọi API
      const topExpensiveTokens = POPULAR_TOKENS;
      
      console.log(`Found ${topExpensiveTokens.length} top expensive tokens from static list`);
      
      console.log('✅ Sử dụng danh sách token tĩnh (giá sẽ được lấy từ Binance API trong UI)');
      
      // Không lấy giá ở đây nữa, để UI tự lấy từ Binance API
      const tokensWithoutPrices = topExpensiveTokens.map(token => ({
        ...token,
        priceUSD: 0, // Sẽ được cập nhật từ Binance API trong UI
        priceChange24h: 0,
      }));
      
      // Cache the result before returning
      tokenListCacheService.setCachedTokenList(tokensWithoutPrices);
      console.log(`✅ Cached ${tokensWithoutPrices.length} tokens (giá sẽ được lấy từ Binance API)`);
      
      return tokensWithoutPrices;
        };
        
        const tokensWithFallbackPrices = topExpensiveTokens.map(token => {
          const fallbackPrice = fallbackPrices[token.address.toLowerCase()];
          return {
            ...token,
            priceUSD: fallbackPrice?.price || 0,
            priceChange24h: fallbackPrice?.change || 0,
          };
        });
        
        // Sắp xếp fallback tokens theo giá
        const sortedFallbackTokens = tokensWithFallbackPrices.sort((a: any, b: any) => b.priceUSD - a.priceUSD);
        
        console.log('Using fallback prices - Top 5 expensive coins:');
        sortedFallbackTokens.slice(0, 5).forEach((token: any, index: any) => {
          console.log(`${index + 1}. ${token.symbol} - $${token.priceUSD.toFixed(2)}`);
        });
        
        // Cache the fallback result
        tokenListCacheService.setCachedTokenList(sortedFallbackTokens);
        console.log(`Cached ${sortedFallbackTokens.length} tokens with fallback prices`);
        
        return sortedFallbackTokens;
      }
    } catch (error) {
      console.error('Error getting supported tokens:', error);
      
      // Fallback: trả về danh sách token cơ bản khi 1inch API fail
      return [
        { 
          address: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee', 
          symbol: 'ETH', 
          name: 'Ethereum', 
          decimals: 18, 
          priceUSD: 3400, 
          priceChange24h: 2.5,
          logoURI: 'https://tokens.1inch.io/0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee.png'
        },
        { 
          address: '0xdac17f958d2ee523a2206206994597c13d831ec7', 
          symbol: 'USDT', 
          name: 'Tether USD', 
          decimals: 6, 
          priceUSD: 1.0, 
          priceChange24h: 0.1,
          logoURI: 'https://tokens.1inch.io/0xdac17f958d2ee523a2206206994597c13d831ec7.png'
        },
        { 
          address: '0xa0b86a33e6ba8d2f7928d16768debd89c78b322f', 
          symbol: 'USDC', 
          name: 'USD Coin', 
          decimals: 6, 
          priceUSD: 1.0, 
          priceChange24h: -0.05,
          logoURI: 'https://tokens.1inch.io/0xa0b86a33e6ba8d2f7928d16768debd89c78b322f.png'
        },
        { 
          address: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2', 
          symbol: 'WETH', 
          name: 'Wrapped Ether', 
          decimals: 18, 
          priceUSD: 3400, 
          priceChange24h: 2.5,
          logoURI: 'https://tokens.1inch.io/0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2.png'
        },
        { 
          address: '0x95ad61b0a150d79219dcf64e1e6cc01f0b64c4ce', 
          symbol: 'SHIB', 
          name: 'Shiba Inu', 
          decimals: 18, 
          priceUSD: 0.000025, 
          priceChange24h: -1.8,
          logoURI: 'https://tokens.1inch.io/0x95ad61b0a150d79219dcf64e1e6cc01f0b64c4ce.png'
        },
      ];
    }
  }

  async getTokenInfo(tokenAddress: string): Promise<TokenInfo> {
    try {
      const provider = await this.getProvider();
      const contract = new ethers.Contract(tokenAddress, ERC20_ABI, provider);
      
      const [symbol, name, decimals] = await Promise.all([
        contract.symbol(),
        contract.name(),
        contract.decimals(),
      ]);

      // Sử dụng Moralis thay vì CoinGecko để lấy giá token
      const prices = await this.moralisApiService.getTokenPrices([tokenAddress]);
      const price = prices[tokenAddress] || 0;

      return {
        address: tokenAddress,
        symbol,
        name,
        decimals,
        priceUSD: price,
        priceChange24h: 0, // Moralis không cung cấp thay đổi giá 24h
      };
    } catch (error) {
      console.error('Error getting token info:', error);
      throw new Error('Không thể lấy thông tin token');
    }
  }

  async getTokenBalance(tokenAddress: string, walletAddress: string): Promise<string> {
    try {
      const provider = await this.getProvider();
      
      // Xử lý ETH (native token)
      if (tokenAddress.toLowerCase() === '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee') {
        const balance = await provider.getBalance(walletAddress);
        return ethers.formatEther(balance);
      }

      // Xử lý ERC-20 tokens
      const contract = new ethers.Contract(tokenAddress, ERC20_ABI, provider);
      const balance = await contract.balanceOf(walletAddress);
      const decimals = await contract.decimals();
      
      return ethers.formatUnits(balance, decimals);
    } catch (error) {
      console.error('Error getting token balance:', error);
      return '0';
    }
  }

  async getTokenPrice(tokenAddress: string): Promise<{ price: number; priceChange24h: number }> {
    // Sử dụng Moralis thay vì CoinGecko để lấy giá token
    const prices = await this.moralisApiService.getTokenPrices([tokenAddress]);
    return {
      price: prices[tokenAddress] || 0,
      priceChange24h: 0 // Moralis không cung cấp thông tin thay đổi giá 24h
    };
  }

  async getSwapQuote(request: SwapRequest): Promise<SwapQuote> {
    try {
      return await this.oneInchService.getSwapQuote(request);
    } catch (error) {
      console.warn('1inch API failed, using fallback quote calculation:', error);
      // Fallback calculation for demo
      return this.calculateFallbackQuote(request);
    }
  }

  private calculateFallbackQuote(request: SwapRequest): SwapQuote {
    // Simple fallback calculation for demo purposes
    const fromAmount = parseFloat(request.fromAmount);
    const fromPrice = request.fromToken.priceUSD || 1;
    const toPrice = request.toToken.priceUSD || 1;
    
    // Calculate estimated output with 0.3% slippage
    const usdValue = fromAmount * fromPrice;
    const estimatedToAmount = (usdValue / toPrice) * 0.997; // 0.3% slippage
    
    return {
      fromToken: request.fromToken,
      toToken: request.toToken,
      fromAmount: request.fromAmount,
      toAmount: estimatedToAmount.toString(),
      estimatedGas: '150000',
      gasPrice: '20000000000', // 20 gwei
      protocols: [{ name: 'Demo', part: 100 }],
      estimatedSlippage: 0.3,
      estimatedTime: 30,
    };
  }

  async buildSwapTransaction(request: SwapRequest): Promise<SwapTransaction> {
    return await this.oneInchService.buildSwapTransaction(request);
  }

  async executeSwap(transaction: SwapTransaction, privateKey: string): Promise<SwapResult> {
    try {
      const provider = await this.getProvider();
      const wallet = new ethers.Wallet(privateKey, provider);
      
      const tx = {
        to: transaction.to,
        data: transaction.data,
        value: transaction.value,
        gasLimit: transaction.gas,
        gasPrice: transaction.gasPrice,
      };

      const sentTx = await wallet.sendTransaction(tx);
      
      return {
        transactionHash: sentTx.hash,
        fromAmount: '0', // Sẽ được cập nhật từ transaction receipt
        toAmount: '0',
        gasUsed: transaction.gas,
        gasPrice: transaction.gasPrice,
        status: 'pending',
        timestamp: new Date(),
      };
    } catch (error) {
      console.error('Error executing swap:', error);
      throw new Error('Không thể thực hiện giao dịch swap');
    }
  }

  async checkAllowance(tokenAddress: string, ownerAddress: string, spenderAddress: string): Promise<string> {
    try {
      // ETH không cần allowance
      if (tokenAddress.toLowerCase() === '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee') {
        return ethers.MaxUint256.toString();
      }
      
      // Cải thiện RPC handling cho các token hay gặp vấn đề
      const problematicTokens = [
        '0xdac17f958d2ee523a2206206994597c13d831ec7', // USDT - thường gặp lỗi RPC
      ];
      
      const isProblematicToken = problematicTokens.includes(tokenAddress.toLowerCase());
      if (isProblematicToken) {
        console.log(`Using enhanced RPC handling for problematic token ${tokenAddress}`);
      }

      // Retry mechanism với multiple attempts
      let lastError: any;
      const maxRetries = 3;
      
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          console.log(`Checking allowance attempt ${attempt}/${maxRetries} for token ${tokenAddress}`);
          
          const provider = await this.getProvider();
          const contract = new ethers.Contract(tokenAddress, ERC20_ABI, provider);
          
          // Thử gọi allowance với timeout
          const allowancePromise = contract.allowance(ownerAddress, spenderAddress);
          const decimalsPromise = contract.decimals();
          
          // Set timeout 10 giây cho mỗi call
          const timeout = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('RPC call timeout')), 10000)
          );
          
          const [allowance, decimals] = await Promise.race([
            Promise.all([allowancePromise, decimalsPromise]),
            timeout
          ]) as [any, any];
          
          const result = ethers.formatUnits(allowance, decimals);
          console.log(`Allowance check successful: ${result}`);
          return result;
          
        } catch (error) {
          lastError = error;
          console.warn(`Allowance check attempt ${attempt} failed:`, (error as Error).message);
          
          if (attempt < maxRetries) {
            // Đợi 2 giây trước khi retry
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
        }
      }
      
      console.error('All allowance check attempts failed:', lastError);
      
      // Fallback: trả về '0' để app vẫn hoạt động
      console.log('Using fallback allowance value: 0');
      return '0';
      
    } catch (error) {
      console.error('Critical error in checkAllowance:', error);
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
      // Sử dụng 1inch approve transaction builder
      return await this.oneInchService.buildApproveTransaction(tokenAddress, amount);
    } catch (error) {
      console.error('Error building approve transaction:', error);
      throw new Error('Không thể tạo giao dịch approve');
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
      console.error('Error getting transaction status:', error);
      return 'pending';
    }
  }
}
