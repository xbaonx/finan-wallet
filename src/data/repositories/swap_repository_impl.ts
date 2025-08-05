import { ethers } from 'ethers';
import { TokenInfo, SwapQuote, SwapRequest, SwapResult, SwapTransaction } from '../../domain/entities/swap_entity';
import { SwapRepository } from '../../domain/repositories/swap_repository';
import { OneInchApiService } from '../services/oneinch_api_service';
import { CoinGeckoApiService } from '../services/coingecko_api_service';
import { MoralisApiService } from '../services/moralis_api_service';
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
    private coinGeckoService: CoinGeckoApiService,
    private moralisApiService: MoralisApiService,
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

      console.log('Fetching fresh supported tokens list...');
      
      // Lấy danh sách token từ 1inch API
      console.log('🚀 Starting token fetch from 1inch API...');
      let tokens = await this.oneInchService.getSupportedTokens();
      console.log(`📊 1inch API returned ${tokens ? tokens.length : 0} tokens`);
      
      // Nếu 1inch API không trả về tokens cho BSC, tạo fallback list
      if (!tokens || tokens.length === 0) {
        console.log('🔄 1inch API returned no tokens, using fallback BSC token list');
        tokens = [
          { address: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c', symbol: 'WBNB', name: 'Wrapped BNB', decimals: 18 },
          { address: '0x55d398326f99059fF775485246999027B3197955', symbol: 'USDT', name: 'Tether USD', decimals: 18 },
          { address: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d', symbol: 'USDC', name: 'USD Coin', decimals: 18 },
          { address: '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56', symbol: 'BUSD', name: 'Binance USD', decimals: 18 },
          { address: '0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c', symbol: 'BTCB', name: 'Bitcoin BEP2', decimals: 18 },
          { address: '0x2170Ed0880ac9A755fd29B2688956BD959F933F8', symbol: 'ETH', name: 'Ethereum Token', decimals: 18 },
          { address: '0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82', symbol: 'CAKE', name: 'PancakeSwap Token', decimals: 18 },
          { address: '0x1D2F0da169ceB9fC7B3144628dB156f3F6c60dBE', symbol: 'XRP', name: 'XRP Token', decimals: 6 },
          { address: '0x3EE2200Efb3400fAbB9AacF31297cBdD1d435D47', symbol: 'ADA', name: 'Cardano Token', decimals: 6 },
          { address: '0xF8A0BF9cF54Bb92F17374d9e9A321E6a111a51bD', symbol: 'LINK', name: 'Chainlink Token', decimals: 18 },
          { address: '0x4338665CBB7B2485A8855A139b75D5e34AB0DB94', symbol: 'LTC', name: 'Litecoin Token', decimals: 18 },
          { address: '0x1AF3F329e8BE154074D8769D1FFa4eE058B1DBc3', symbol: 'DAI', name: 'Dai Stablecoin', decimals: 18 },
          { address: '0x7083609fCE4d1d8Dc0C979AAb8c869Ea2C873402', symbol: 'DOT', name: 'Polkadot Token', decimals: 10 },
          { address: '0x1Ce0c2827e2eF14D5C4f29a091d735A204794041', symbol: 'AVAX', name: 'Avalanche Token', decimals: 18 },
          { address: '0x570A5D26f7765Ecb712C0924E4De545B89fD43dF', symbol: 'SOL', name: 'Solana Token', decimals: 18 },
          { address: '0xbA2aE424d960c26247Dd6c32edC70B295c744C43', symbol: 'DOGE', name: 'Dogecoin Token', decimals: 8 },
        ];
      }
      
      // Hardcode danh sách coin theo yêu cầu của user
      // Bao gồm các DeFi tokens phổ biến và top coins trên BSC
      const topExpensiveAddresses = [
        '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c', // WBNB - Wrapped BNB
        '0x55d398326f99059fF775485246999027B3197955', // USDT - Tether USD
        '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d', // USDC - USD Coin
        '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56', // BUSD - Binance USD
        '0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c', // BTCB - Bitcoin BEP2
        '0x2170Ed0880ac9A755fd29B2688956BD959F933F8', // ETH - Ethereum Token
        '0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82', // CAKE - PancakeSwap Token
        '0x1D2F0da169ceB9fC7B3144628dB156f3F6c60dBE', // XRP - XRP Token
        '0x3EE2200Efb3400fAbB9AacF31297cBdD1d435D47', // ADA - Cardano Token
        '0xF8A0BF9cF54Bb92F17374d9e9A321E6a111a51bD', // LINK - Chainlink Token
        '0x4338665CBB7B2485A8855A139b75D5e34AB0DB94', // LTC - Litecoin Token
        '0x1AF3F329e8BE154074D8769D1FFa4eE058B1DBc3', // DAI - Dai Stablecoin
        '0x8fF795a6F4D97E7887C79beA79aba5cc76444aDf', // BCH - Bitcoin Cash Token
        '0x7083609fCE4d1d8Dc0C979AAb8c869Ea2C873402', // DOT - Polkadot Token
        '0x111111111117dC0aa78b770fA6A738034120C302', // 1INCH - 1inch
        '0x0D8Ce2A99Bb6e3B7Db580eD848240e4a0F9aE153', // FIL - Filecoin Token
        '0x85EAC5Ac2F758618dFa09bDbe0cf174e7d574D5B', // TRX - TRON Token
        '0x1Ce0c2827e2eF14D5C4f29a091d735A204794041', // AVAX - Avalanche Token
        '0x16939ef78684453bfDFb47825F8a5F714f12623a', // XTZ - Tezos Token
        '0x56b6fB708fC5732DEC1Afc8D8556423A2EDcCbD6', // EOS - EOS Token
        '0x570A5D26f7765Ecb712C0924E4De545B89fD43dF', // SOL - Solana Token
        '0x52CE071Bd9b1C4B00A0b92D298c512478CaD67e8', // COMP - Compound Token
        '0x88f1A5ae2A3BF98AEAF342D26B30a79438c9142e', // YFI - Yearn.finance
        '0x9Ac983826058b8a9C7Aa1C9171441191232E8404', // SNX - Synthetix Network
        '0x250632378E573c6Be1AC2f97Fcdf00515d0Aa91B', // BETH - Binance Beacon ETH
        '0xbA2aE424d960c26247Dd6c32edC70B295c744C43', // DOGE - Dogecoin Token
      ];
      
      // Lọc các token phổ biến từ 1inch API BSC
      const popularSymbols = ['WBNB', 'USDT', 'USDC', 'BUSD', 'BTCB', 'ETH', 'CAKE', 'XRP', 'ADA', 'LINK', 'LTC', 'DAI', 'DOT', 'AVAX', 'SOL', 'DOGE', 'BNB', 'MATIC', 'UNI', 'AAVE'];
      
      let topExpensiveTokens;
      if (tokens.length <= 16) { // Fallback tokens có 16 items
        console.log('Using all fallback BSC tokens');
        topExpensiveTokens = tokens;
      } else {
        // Lọc những token phổ biến từ 1inch API BSC
        topExpensiveTokens = tokens.filter(token => 
          popularSymbols.includes(token.symbol?.toUpperCase())
        );
        console.log(`Found ${topExpensiveTokens.length} popular tokens from 1inch API`);
        
        // Nếu không tìm thấy token nào, lấy 20 token đầu tiên
        if (topExpensiveTokens.length === 0) {
          console.log('No popular tokens found, using first 20 tokens from 1inch API');
          topExpensiveTokens = tokens.slice(0, 20);
        }
      }
      
      console.log(`Found ${topExpensiveTokens.length} top expensive tokens from list`);
      
      // Lấy địa chỉ các token để fetch giá từ Moralis
      const tokenAddresses = topExpensiveTokens.map(token => {
        // Convert ETH placeholder address to WETH for Moralis API
        if (token.address.toLowerCase() === '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee') {
          return '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2'; // WETH
        }
        return token.address;
      });
      
      try {
        // Lấy giá real-time từ Moralis API
        console.log('Fetching real-time prices from Moralis API...');
        const prices = await this.moralisApiService.getTokenPrices(tokenAddresses);
        
        // Kết hợp token metadata với giá real-time
        const tokensWithRealPrices = topExpensiveTokens.map(token => {
          const priceAddress = token.address.toLowerCase() === '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee' 
            ? '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2' 
            : token.address;
          
          const price = prices[priceAddress] || 0;
          
          return {
            ...token,
            priceUSD: price,
            priceChange24h: 0, // Moralis doesn't provide 24h change, could be added later
          };
        });
        
        console.log('Successfully fetched real-time prices for', tokensWithRealPrices.length, 'top expensive tokens');
        
        // Sắp xếp theo giá từ cao đến thấp (chỉ là để đảm bảo thứ tự)
        const sortedByPrice = tokensWithRealPrices.sort((a: any, b: any) => b.priceUSD - a.priceUSD);
        
        console.log('Top 5 most expensive coins:');
        sortedByPrice.slice(0, 5).forEach((token: any, index: any) => {
          console.log(`${index + 1}. ${token.symbol} - $${token.priceUSD.toFixed(2)}`);
        });
        
        // Cache the result before returning
        tokenListCacheService.setCachedTokenList(sortedByPrice);
        console.log(`Cached ${sortedByPrice.length} tokens with real-time prices`);
        
        return sortedByPrice;
        
      } catch (priceError) {
        console.warn('Failed to fetch real-time prices from Moralis, using fallback:', priceError);
        
        // Fallback to static prices if Moralis API fails
        const fallbackPrices: Record<string, { price: number; change: number }> = {
          '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee': { price: 3400, change: 2.5 }, // ETH
          '0x55d398326f99059fF775485246999027B3197955': { price: 1.0, change: 0.1 }, // USDT BSC
          '0xa0b86a33e6ba8d2f7928d16768debd89c78b322f': { price: 1.0, change: -0.05 }, // USDC
          '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2': { price: 3400, change: 2.5 }, // WETH
          '0x95ad61b0a150d79219dcf64e1e6cc01f0b64c4ce': { price: 0.000025, change: -1.8 }, // SHIB
          '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599': { price: 65000, change: 1.2 }, // WBTC
          '0x1f9840a85d5af5bf1d1762f925bdaddc4201f984': { price: 12.5, change: -0.8 }, // UNI
          '0x514910771af9ca656af840dff83e8264ecf986ca': { price: 18.2, change: 3.1 }, // LINK
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

      const priceInfo = await this.coinGeckoService.getTokenPrice(tokenAddress);

      return {
        address: tokenAddress,
        symbol,
        name,
        decimals,
        priceUSD: priceInfo.price,
        priceChange24h: priceInfo.priceChange24h,
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
    return await this.coinGeckoService.getTokenPrice(tokenAddress);
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
