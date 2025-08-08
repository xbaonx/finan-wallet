import { TokenEntity, WalletBalance } from '../../domain/entities/token_entity';
import { TokenRepository } from '../../domain/repositories/token_repository';
import { ethers, JsonRpcProvider, Contract, formatEther, formatUnits } from 'ethers';
import { POPULAR_TOKENS } from '../../core/config/token_list';
import { BinancePriceService } from '../services/binance_price_service';
import { API_CONFIG } from '../../core/config/api_config';

export class TokenRepositoryImpl implements TokenRepository {
  private provider: JsonRpcProvider;
  private binancePriceService: BinancePriceService;

  constructor() {
    // BSC RPC endpoint
    this.provider = new JsonRpcProvider('https://bsc-dataseed1.binance.org/');
    this.binancePriceService = new BinancePriceService();
  }

  async getWalletBalance(walletAddress: string): Promise<WalletBalance> {
    try {
      console.log(`💰 Lấy balance ví BSC: ${walletAddress}`);
      
      // Lấy BNB balance
      const bnbBalance = await this.provider.getBalance(walletAddress);
      const bnbBalanceFormatted = formatEther(bnbBalance);
      
      // Lấy giá BNB từ Binance
      const bnbPrice = await this.binancePriceService.getTokenPrice('BNB');
      const bnbValue = parseFloat(bnbBalanceFormatted) * bnbPrice;
      
      console.log(`💰 BNB Balance: ${bnbBalanceFormatted} BNB ($${bnbValue.toFixed(2)})`);
      
      // Lấy balance của tất cả tokens trong danh sách
      const tokens: TokenEntity[] = [];
      let totalBalanceUSD = bnbValue;
      
      console.log(`🔍 Lấy tất cả token balances từ Moralis API (BSC + Ethereum)...`);
      
      // Lấy tokens từ cả BSC và Ethereum với chainId
      const bscTokens = await this.getAllTokenBalancesFromMoralis(walletAddress, 'bsc');
      const ethTokens = await this.getAllTokenBalancesFromMoralis(walletAddress, 'eth');
      
      // Thêm chainId và chain logo cho từng token
      const bscTokensWithChain = bscTokens.map(token => ({ 
        ...token, 
        chainId: 56, 
        chainName: 'BSC',
        chainLogo: 'https://tokens.1inch.io/0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c.png' // BNB logo
      }));
      const ethTokensWithChain = ethTokens.map(token => ({ 
        ...token, 
        chainId: 1, 
        chainName: 'ETH',
        chainLogo: 'https://tokens.1inch.io/0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee.png' // ETH logo
      }));
      
      // Gộp tokens từ cả 2 chains
      const allTokenBalances = [...bscTokensWithChain, ...ethTokensWithChain];
      console.log(`📊 Tổng cộng: ${bscTokens.length} BSC tokens + ${ethTokens.length} ETH tokens = ${allTokenBalances.length} tokens`);
      
      if (allTokenBalances.length > 0) {
        console.log(`✅ Moralis API tìm thấy ${allTokenBalances.length} tokens`);
        
        for (const tokenBalance of allTokenBalances) {
          if (tokenBalance.balance > 0) {
            const tokenPrice = await this.binancePriceService.getTokenPrice(tokenBalance.symbol);
            const tokenValue = tokenBalance.balance * tokenPrice;
            
            tokens.push({
              name: tokenBalance.name,
              symbol: tokenBalance.symbol,
              address: tokenBalance.address,
              logoUri: tokenBalance.logoUri || `https://tokens.1inch.io/${tokenBalance.address.toLowerCase()}.png`,
              balance: tokenBalance.balance.toString(),
              priceUSD: tokenPrice,
              chainId: tokenBalance.chainId,
              decimals: tokenBalance.decimals,
              chainLogo: tokenBalance.chainLogo, // Thêm chain logo
              chainName: tokenBalance.chainName  // Thêm chain name
            });
            
            totalBalanceUSD += tokenValue;
            console.log(`💰 ${tokenBalance.symbol} (${tokenBalance.chainName}): ${tokenBalance.balance} ($${tokenValue.toFixed(2)})`);
          }
        }
        
        // Sắp xếp tokens theo tổng giá trị sở hữu (balance × price USD) từ cao xuống thấp
        tokens.sort((a, b) => {
          const totalValueA = parseFloat(a.balance) * a.priceUSD; // Tổng giá trị sở hữu token A
          const totalValueB = parseFloat(b.balance) * b.priceUSD; // Tổng giá trị sở hữu token B
          return totalValueB - totalValueA; // Sắp xếp giảm dần theo tổng giá trị
        });
        
        console.log(`📊 Đã sắp xếp ${tokens.length} tokens theo tổng giá trị sở hữu USD (cao → thấp)`);
        
        return {
          totalBalanceUSD,
          tokens,
          nativeToken: {
            symbol: 'BNB',
            name: 'Binance Coin',
            balance: bnbBalanceFormatted,
            balanceFormatted: parseFloat(bnbBalanceFormatted).toFixed(4),
            usdPrice: bnbPrice,
            usdValue: bnbValue,
            logo: 'https://tokens.1inch.io/0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c.png',
            decimals: 18,
          }
        };
      }
      
      // Fallback: Nếu Moralis không trả về tokens, chỉ hiển thị BNB
      console.log(`⚠️ Moralis API không trả về tokens, chỉ hiển thị BNB balance...`);
      
      return {
        totalBalanceUSD,
        tokens,
        nativeToken: {
          symbol: 'BNB',
          name: 'Binance Coin',
          balance: bnbBalanceFormatted,
          balanceFormatted: parseFloat(bnbBalanceFormatted).toFixed(4),
          usdPrice: bnbPrice,
          usdValue: bnbValue,
          logo: 'https://tokens.1inch.io/0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c.png',
          decimals: 18,
        }
      };
    } catch (error) {
      console.error('❌ Lỗi lấy wallet balance:', error);
      throw new Error(`Không thể lấy số dư ví: ${error}`);
    }
  }

  async getETHBalance(walletAddress: string): Promise<TokenEntity> {
    try {
      // Trên BSC, trả về ETH token balance thay vì native ETH
      const ethTokenAddress = '0x2170Ed0880ac9A755fd29B2688956BD959F933F8';
      const ethContract = new Contract(
        ethTokenAddress,
        ['function balanceOf(address) view returns (uint256)'],
        this.provider
      );
      
      const balance = await ethContract.balanceOf(walletAddress);
      const balanceFormatted = formatEther(balance);
      const ethPrice = await this.binancePriceService.getTokenPrice('ETH');
      
      return {
        name: 'Ethereum Token',
        symbol: 'ETH',
        address: ethTokenAddress,
        logoUri: 'https://tokens.1inch.io/0x2170ed0880ac9a755fd29b2688956bd959f933f8.png',
        balance: balanceFormatted,
        priceUSD: ethPrice,
        chainId: 56, // BSC
        decimals: 18
      };
    } catch (error) {
      console.error('❌ Lỗi lấy ETH balance:', error);
      return {
        name: 'Ethereum Token',
        symbol: 'ETH',
        address: '0x2170Ed0880ac9A755fd29B2688956BD959F933F8',
        logoUri: 'https://tokens.1inch.io/0x2170ed0880ac9a755fd29b2688956bd959f933f8.png',
        balance: '0',
        priceUSD: 0,
        chainId: 56,
        decimals: 18
      };
    }
  }

  async getERC20Tokens(walletAddress: string): Promise<TokenEntity[]> {
    try {
      const walletData = await this.getWalletBalance(walletAddress);
      return walletData.tokens;
    } catch (error) {
      console.error('❌ Lỗi lấy ERC20 tokens:', error);
      return [];
    }
  }

  async getTokenPrices(tokenAddresses: string[]): Promise<{ [address: string]: number }> {
    try {
      const prices: { [address: string]: number } = {};
      
      for (const address of tokenAddresses) {
        const token = POPULAR_TOKENS.find(t => t.address.toLowerCase() === address.toLowerCase());
        if (token) {
          const price = await this.binancePriceService.getTokenPrice(token.symbol);
          prices[address] = price;
        } else {
          prices[address] = 0;
        }
      }
      
      return prices;
    } catch (error) {
      console.error('❌ Lỗi lấy token prices:', error);
      const emptyPrices: { [address: string]: number } = {};
      tokenAddresses.forEach(address => {
        emptyPrices[address] = 0;
      });
      return emptyPrices;
    }
  }

  async getETHPrice(): Promise<number> {
    try {
      return await this.binancePriceService.getTokenPrice('ETH');
    } catch (error) {
      console.error('❌ Lỗi lấy ETH price:', error);
      return 0;
    }
  }

  /**
   * Sử dụng Moralis Web3 API để lấy tất cả token balances
   */
  private async getAllTokenBalancesFromMoralis(walletAddress: string, chain: string = 'bsc'): Promise<Array<{
    address: string;
    symbol: string;
    name: string;
    decimals: number;
    balance: number;
    logoUri?: string;
  }>> {
    try {
      console.log(`🔍 Lấy token balances từ Moralis API cho: ${walletAddress} (${chain.toUpperCase()})`);
      
      // Moralis Web3 API endpoint với parameters đầy đủ
      const url = `https://deep-index.moralis.io/api/v2.2/${walletAddress}/erc20?chain=${chain}&limit=100&exclude_spam=true&exclude_unverified=false`;
      
      const response = await fetch(url, {
        headers: {
          'X-API-Key': API_CONFIG.MORALIS.API_KEY,
          'accept': 'application/json'
        }
      });
      
      console.log(`📡 Moralis API Response Status: ${response.status}`);
      
      if (!response.ok) {
        console.warn(`⚠️ Moralis API error: ${response.status} ${response.statusText}`);
        return [];
      }
      
      const data = await response.json();
      console.log(`📊 Moralis API Raw Response:`, JSON.stringify(data, null, 2));
      
      const tokens: Array<{
        address: string;
        symbol: string;
        name: string;
        decimals: number;
        balance: number;
        logoUri?: string;
      }> = [];
      
      // Parse Moralis response
      if (data && Array.isArray(data)) {
        console.log(`📋 Tìm thấy ${data.length} tokens trong response`);
        
        for (const token of data) {
          const rawBalance = token.balance || '0';
          const decimals = token.decimals || 18;
          
          // Sử dụng ethers để format balance chính xác
          let balance = 0;
          try {
            balance = parseFloat(formatUnits(rawBalance, decimals));
          } catch (error) {
            console.warn(`⚠️ Không thể format balance cho ${token.symbol}:`, error);
            continue;
          }
          
          console.log(`🔍 Token: ${token.symbol} - Raw: ${rawBalance} - Decimals: ${decimals} - Formatted: ${balance}`);
          
          if (balance > 0) {
            tokens.push({
              address: token.token_address || token.address,
              symbol: token.symbol || 'UNKNOWN',
              name: token.name || 'Unknown Token',
              decimals: decimals,
              balance: balance,
              logoUri: token.logo || token.logoURI
            });
          }
        }
      } else if (data.result && Array.isArray(data.result)) {
        console.log(`📋 Tìm thấy ${data.result.length} tokens trong data.result`);
        
        for (const token of data.result) {
          const rawBalance = token.balance || '0';
          const decimals = token.decimals || 18;
          
          // Sử dụng ethers để format balance chính xác
          let balance = 0;
          try {
            balance = parseFloat(formatUnits(rawBalance, decimals));
          } catch (error) {
            console.warn(`⚠️ Không thể format balance cho ${token.symbol}:`, error);
            continue;
          }
          
          console.log(`🔍 Token: ${token.symbol} - Raw: ${rawBalance} - Decimals: ${decimals} - Formatted: ${balance}`);
          
          if (balance > 0) {
            tokens.push({
              address: token.token_address || token.address,
              symbol: token.symbol || 'UNKNOWN',
              name: token.name || 'Unknown Token',
              decimals: decimals,
              balance: balance,
              logoUri: token.logo || token.logoURI
            });
          }
        }
      } else {
        console.warn(`⚠️ Moralis response format không như mong đợi:`, data);
      }
      
      console.log(`✅ Moralis API trả về ${tokens.length} tokens có balance > 0`);
      
      // Kiểm tra thêm ETH token nếu không có trong Moralis response
      const hasETH = tokens.some(token => token.symbol.toUpperCase() === 'ETH');
      if (!hasETH) {
        console.log(`🔍 Không thấy ETH trong Moralis response, kiểm tra thủ công...`);
        
        try {
          const ethTokenAddress = '0x2170Ed0880ac9A755fd29B2688956BD959F933F8';
          const ethContract = new Contract(
            ethTokenAddress,
            ['function balanceOf(address) view returns (uint256)'],
            this.provider
          );
          
          const ethBalance = await ethContract.balanceOf(walletAddress);
          const ethBalanceFormatted = parseFloat(formatEther(ethBalance));
          
          console.log(`🔍 ETH Manual Check - Raw: ${ethBalance.toString()} - Formatted: ${ethBalanceFormatted}`);
          
          if (ethBalanceFormatted > 0) {
            const ethPrice = await this.binancePriceService.getTokenPrice('ETH');
            
            tokens.push({
              address: ethTokenAddress,
              symbol: 'ETH',
              name: 'Ethereum Token',
              decimals: 18,
              balance: ethBalanceFormatted,
              logoUri: 'https://tokens.1inch.io/0x2170ed0880ac9a755fd29b2688956bd959f933f8.png'
            });
            
            console.log(`💰 ETH (manual): ${ethBalanceFormatted} ($${(ethBalanceFormatted * ethPrice).toFixed(2)})`);
          } else {
            console.log(`📝 ETH balance = 0, không thêm vào danh sách`);
          }
        } catch (error) {
          console.warn(`⚠️ Không thể kiểm tra ETH balance thủ công:`, error);
        }
      }
      
      return tokens;
      
    } catch (error) {
      console.error('❌ Lỗi lấy token balances từ Moralis API:', error);
      return [];
    }
  }
}
