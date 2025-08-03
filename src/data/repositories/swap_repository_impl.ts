import { ethers } from 'ethers';
import { TokenInfo, SwapQuote, SwapRequest, SwapResult, SwapTransaction } from '../../domain/entities/swap_entity';
import { SwapRepository } from '../../domain/repositories/swap_repository';
import { OneInchApiService } from '../services/oneinch_api_service';
import { CoinGeckoApiService } from '../services/coingecko_api_service';
import { MoralisApiService } from '../services/moralis_api_service';

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
    private rpcUrl: string = 'https://cloudflare-eth.com' // Free Cloudflare RPC
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
      // Lấy danh sách token từ 1inch API
      const tokens = await this.oneInchService.getSupportedTokens();
      
      // Hardcode danh sách coin theo yêu cầu của user
      // Bao gồm các DeFi tokens phổ biến và top coins trên Ethereum
      const topExpensiveAddresses = [
        '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee', // ETH - Ethereum
        '0x1f9840a85d5af5bf1d1762f925bdaddc4201f984', // UNI - Uniswap
        '0x514910771af9ca656af840dff83e8264ecf986ca', // LINK - Chainlink
        '0x7fc66500c84a76ad7e9c93437bfc5ac33e2ddae9', // AAVE - Aave
        '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599', // WBTC - Wrapped Bitcoin
        '0x7d1afa7b718fb893db30a3abc0cfc608aacfebb0', // MATIC - Polygon
        '0x6b3595068778dd592e39a122f4f5a5cf09c90fe2', // SUSHI - SushiSwap
        '0xc00e94cb662c3520282e6f5717214004a7f26888', // COMP - Compound
        '0x9f8f72aa9304c8b593d555f12ef6589cc3a579a2', // MKR - Maker
        '0x0bc529c00c6401aef6d220be8c6ea1667f6ad93e', // YFI - Yearn Finance
        '0xd533a949740bb3306d119cc777fa900ba034cd52', // CRV - Curve DAO Token
        '0x0d8775f648430679a709e98d2b0cb6250d2887ef', // BAT - Basic Attention Token
        '0x408e41876cccdc0f92210600ef50372656052a38', // REN - Ren
        '0x111111111117dc0aa78b770fa6a738034120c302', // 1INCH - 1inch
        '0xc011a73ee8576fb46f5e1c5751ca3b9fe0af2a6f', // SNX - Synthetix
        '0xaaaea5004d83f05c9f4a9efd8b14d1e2d1b8b8b8', // CEL - Celsius (placeholder)
        '0xba100000625a3754423978a60c9317c58a424e3d', // BAL - Balancer
        '0xdd974d5c2e2928dea5f71b9825b8b646686bd200', // KNC - Kyber Network
        '0xd26114cd6ee289accf82350c8d8487fedb8a0c07', // OMG - OMG Network
        '0x476c5e26a75bd202a9683ffd34359c0cc15be0ff', // SRM - Serum
        '0xbbbbca6a901c926f240b89eacb641d8aec7aeafd', // LRC - Loopring
        '0xf629cbd94d3791c9250152bd8dfbdf380e2a3b9c', // ENJ - Enjin Coin
        '0x0f5d2fb29fb7d3cfee444a200298f468908cc942', // MANA - Decentraland
        '0xc944e90c64b2c07662a292be6244bdf05cda44a7', // GRT - The Graph
        '0x3506424f91fd33084466f402d5d97f05f8e3b4af', // CHZ - Chiliz
        '0x85f17cf997934a597031b2e18a9ab6ebd4b9f6a4', // NEAR - NEAR (ERC-20 version)
        '0xbb0e17ef65f82ab018d8edd776e8dd940327b28b', // AXS - Axie Infinity
        '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2', // WETH - Wrapped Ethereum
      ];
      
      // Lọc những token có trong danh sách top expensive
      const topExpensiveTokens = tokens.filter(token => 
        topExpensiveAddresses.includes(token.address.toLowerCase())
      );
      
      console.log(`Found ${topExpensiveTokens.length} top expensive tokens from hardcoded list`);
      
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
        
        return sortedByPrice;
        
      } catch (priceError) {
        console.warn('Failed to fetch real-time prices from Moralis, using fallback:', priceError);
        
        // Fallback to static prices if Moralis API fails
        const fallbackPrices: Record<string, { price: number; change: number }> = {
          '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee': { price: 3400, change: 2.5 }, // ETH
          '0xdac17f958d2ee523a2206206994597c13d831ec7': { price: 1.0, change: 0.1 }, // USDT
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
          console.warn(`Allowance check attempt ${attempt} failed:`, error.message);
          
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
