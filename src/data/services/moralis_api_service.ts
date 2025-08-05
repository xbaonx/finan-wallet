import { TokenEntity, WalletBalance } from '../../domain/entities/token_entity';
import { API_CONFIG, COMMON_TOKENS } from '../../core/config/api_config';
import { 
  MoralisNativeBalanceResponse, 
  MoralisTokenBalanceResponse, 
  MoralisPriceResponse 
} from '../types/moralis_types';
import { priceCacheService } from './price_cache_service';
import { transactionCacheService } from './transaction_cache_service';

const MORALIS_API_KEY = API_CONFIG.MORALIS.API_KEY;
const MORALIS_BASE_URL = API_CONFIG.MORALIS.BASE_URL;

export class MoralisApiService {
  private readonly apiKey = MORALIS_API_KEY;
  private readonly baseUrl = MORALIS_BASE_URL;

  /**
   * Get ETH balance for a wallet address
   */
  async getETHBalance(walletAddress: string): Promise<{ balance: string; priceUSD: number }> {
    try {
      console.log(`Fetching ETH balance for: ${walletAddress}`);
      console.log(`API Key: ${this.apiKey.substring(0, 20)}...`);
      console.log(`Base URL: ${this.baseUrl}`);
      
      const nativeBalanceResponse = await fetch(
        `${this.baseUrl}/${walletAddress}/balance?chain=bsc`,
        {
          headers: {
            'X-API-Key': this.apiKey,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          }
        }
      );
      
      console.log(`Response status: ${nativeBalanceResponse.status}`);
      console.log(`Response statusText: ${nativeBalanceResponse.statusText}`);

      if (!nativeBalanceResponse.ok) {
        console.error(`Failed to fetch native balance: ${nativeBalanceResponse.statusText}`);
        throw new Error(`Failed to fetch native balance: ${nativeBalanceResponse.statusText}`);
      }

      const nativeBalanceData = await nativeBalanceResponse.json();
      console.log('Native balance data:', nativeBalanceData);

      // Get ETH price (using WETH as proxy)
      const ethPriceResponse = await fetch(
        `${this.baseUrl}/erc20/0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2/price?chain=bsc`,
        {
          headers: {
            'X-API-Key': this.apiKey,
            'Content-Type': 'application/json'
          }
        }
      );

      let ethPrice = 2500; // Fallback price
      if (ethPriceResponse.ok) {
        const ethPriceData: MoralisPriceResponse = await ethPriceResponse.json();
        ethPrice = ethPriceData.usdPrice || 2500;
        console.log('ETH price:', ethPrice);
      }

      // Process and format data
      const ethBalance = (parseFloat(nativeBalanceData.balance) / Math.pow(10, 18));
      if (ethBalance > 0.001) { // Only show if balance > 0.001 ETH
        return {
          balance: ethBalance.toFixed(6),
          priceUSD: ethPrice
        };
      } else {
        return {
          balance: '0',
          priceUSD: ethPrice
        };
      }
    } catch (error) {
      console.error('Error fetching ETH balance:', error);
      throw new Error('Không thể lấy số dư ETH');
    }
  }

  /**
   * Get ERC-20 token balances for a wallet address
   */
  async getWalletBalance(address: string): Promise<WalletBalance> {
    try {
      console.log(`Fetching wallet balance for address: ${address}`);
      console.log(`API Key: ${MORALIS_API_KEY.substring(0, 20)}...`);
      console.log(`Base URL: ${MORALIS_BASE_URL}`);
      
      const url = `${MORALIS_BASE_URL}/${address}/balance?chain=bsc`;
      console.log(`Full URL: ${url}`);

      // Get native ETH balance
      const nativeBalanceResponse = await fetch(url, {
        headers: {
          'X-API-Key': MORALIS_API_KEY,
          'Content-Type': 'application/json'
        }
      });
      
      console.log(`Response status: ${nativeBalanceResponse.status}`);
      console.log(`Response statusText: ${nativeBalanceResponse.statusText}`);

      if (!nativeBalanceResponse.ok) {
        const errorText = await nativeBalanceResponse.text();
        console.error(`Failed to fetch native balance:`);
        console.error(`Status: ${nativeBalanceResponse.status}`);
        console.error(`StatusText: ${nativeBalanceResponse.statusText}`);
        console.error(`Error body: ${errorText}`);
        throw new Error(`Failed to fetch native balance: ${nativeBalanceResponse.status} ${nativeBalanceResponse.statusText} - ${errorText}`);
      }

      const nativeBalanceData = await nativeBalanceResponse.json();
      console.log('Native balance data:', nativeBalanceData);

      // Get ERC-20 token balances
      const tokenBalancesResponse = await fetch(
        `${MORALIS_BASE_URL}/${address}/erc20?chain=bsc`,
        {
          headers: {
            'X-API-Key': MORALIS_API_KEY,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!tokenBalancesResponse.ok) {
        console.error(`Failed to fetch token balances: ${tokenBalancesResponse.statusText}`);
        throw new Error(`Failed to fetch token balances: ${tokenBalancesResponse.statusText}`);
      }

      const tokenBalancesData = await tokenBalancesResponse.json() as MoralisTokenBalanceResponse;
      console.log('Token balances data:', tokenBalancesData);

      // Get ETH price (using WETH as proxy)
      const ethPriceResponse = await fetch(
        `${MORALIS_BASE_URL}/erc20/0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2/price?chain=bsc`,
        {
          headers: {
            'X-API-Key': MORALIS_API_KEY,
            'Content-Type': 'application/json'
          }
        }
      );

      let ethPrice = 2500; // Fallback price
      if (ethPriceResponse.ok) {
        const ethPriceData = await ethPriceResponse.json() as MoralisPriceResponse;
        ethPrice = ethPriceData.usdPrice || 2500;
        console.log('ETH price:', ethPrice);
      }

      // Process and format data
      const tokens: TokenEntity[] = [];

      // Add ETH if balance > 0
      if (nativeBalanceData.balance && parseFloat(nativeBalanceData.balance) > 0) {
        const ethBalance = (parseFloat(nativeBalanceData.balance) / Math.pow(10, 18));
        if (ethBalance > 0.001) { // Only show if balance > 0.001 ETH
          tokens.push({
            name: 'BNB',
            symbol: 'BNB',
            address: '0x0000000000000000000000000000000000000000',
            logoUri: 'https://cryptologos.cc/logos/bnb-bnb-logo.png',
            balance: ethBalance.toFixed(6),
            priceUSD: ethPrice,
            chainId: 56,
            decimals: 18,
            isNative: true
          });
        }
      }

      // Add ERC-20 tokens with significant balances
      // Moralis API returns tokens directly as array, not in result property
      const tokensArray = Array.isArray(tokenBalancesData) ? tokenBalancesData : (tokenBalancesData.result || []);
      
      if (tokensArray && Array.isArray(tokensArray) && tokensArray.length > 0) {
        // Collect token addresses that need price fetching
        const tokensToProcess: Array<{ token: any; balance: number; isCommonToken: boolean }> = [];
        const uncachedAddresses: string[] = [];

        for (const token of tokensArray) {
          if (token.balance && token.decimals) {
            const balance = parseFloat(token.balance) / Math.pow(10, parseInt(token.decimals.toString()));
            
            // Only include tokens with meaningful balance (> $0.01 equivalent or common tokens)
            const isCommonToken = COMMON_TOKENS.some(ct => 
              ct.address.toLowerCase() === token.token_address.toLowerCase()
            );

            if (balance > 0.01 || isCommonToken) {
              tokensToProcess.push({ token, balance, isCommonToken });
              
              // Check if price is cached
              const cachedPrice = priceCacheService.getCachedPrice(token.token_address);
              if (cachedPrice === null) {
                uncachedAddresses.push(token.token_address);
              }
            }
          }
        }
        
        // Batch fetch prices for uncached tokens
        if (uncachedAddresses.length > 0) {
          console.log(`Fetching prices for ${uncachedAddresses.length} uncached tokens`);
          await this.batchFetchTokenPrices(uncachedAddresses);
        }
        
        // Now process all tokens with cached prices
        for (const { token, balance, isCommonToken } of tokensToProcess) {
          // Get cached price (should be available now)
          let tokenPrice = priceCacheService.getCachedPrice(token.token_address) || 0;
          
          // Add fallback prices for common stablecoins
          if (tokenPrice === 0) {
            if (token.symbol === 'USDT' || token.symbol === 'USDC' || token.symbol === 'BUSD') {
              tokenPrice = 1.0; // Stablecoins = $1
            } else if (token.symbol === 'BNB' || token.symbol === 'WBNB') {
              tokenPrice = 600; // BNB fallback price
            }
          }

          // Find logo from common tokens or use default
          const commonToken = COMMON_TOKENS.find(ct => 
            ct.address.toLowerCase() === token.token_address.toLowerCase()
          );

          tokens.push({
            name: token.name || token.symbol,
            symbol: token.symbol,
            address: token.token_address,
            logoUri: commonToken?.logoUri || token.logo || 'https://via.placeholder.com/32',
            balance: balance.toFixed(6),
            priceUSD: tokenPrice,
            chainId: 56,
            decimals: parseInt(token.decimals) || 18
          });
        }
      }
      
      console.log(`🏁 FINAL TOKENS ARRAY LENGTH: ${tokens.length}`);
      console.log('FINAL TOKENS:', JSON.stringify(tokens, null, 2));

      // Calculate total balance
      const totalBalance = tokens.reduce((sum, token) => {
        return sum + (parseFloat(token.balance) * token.priceUSD);
      }, 0);

      // Sort tokens by USD value (descending)
      const sortedTokens = tokens.sort((a, b) => 
        (parseFloat(b.balance) * b.priceUSD) - (parseFloat(a.balance) * a.priceUSD)
      );

      console.log(`Total balance: $${totalBalance.toFixed(2)}, Tokens: ${sortedTokens.length}`);

      return {
        address,
        totalBalanceUSD: totalBalance,
        tokens: sortedTokens
      };
    } catch (error) {
      console.error('Error fetching wallet balance:', error);

      // Return fallback data on error
      return {
        address,
        totalBalanceUSD: 0,
        tokens: []
      };
    }
  }

  /**
   * Batch fetch token prices and cache them
   */
  private async batchFetchTokenPrices(addresses: string[]): Promise<void> {
    const MAX_CONCURRENT = 3; // Limit concurrent requests to avoid rate limits
    const batches = [];
    
    // Split addresses into smaller batches
    for (let i = 0; i < addresses.length; i += MAX_CONCURRENT) {
      batches.push(addresses.slice(i, i + MAX_CONCURRENT));
    }
    
    // Process batches sequentially to avoid overwhelming the API
    for (const batch of batches) {
      const promises = batch.map(async (address) => {
        try {
          const response = await fetch(
            `${MORALIS_BASE_URL}/erc20/${address}/price?chain=bsc`,
            {
              headers: {
                'X-API-Key': MORALIS_API_KEY,
                'Content-Type': 'application/json'
              }
            }
          );
          
          if (response.ok) {
            const priceData = await response.json() as MoralisPriceResponse;
            const price = priceData.usdPrice || 0;
            
            // Cache the price
            priceCacheService.setCachedPrice(address, price, priceData.tokenSymbol || 'UNKNOWN');
            
            console.log(`Cached price for ${address}: $${price}`);
          } else {
            console.warn(`Failed to fetch price for ${address}: ${response.status}`);
            // Cache 0 price to avoid repeated failed requests
            priceCacheService.setCachedPrice(address, 0, 'UNKNOWN');
          }
        } catch (error) {
          console.warn(`Error fetching price for ${address}:`, error);
          // Cache 0 price to avoid repeated failed requests
          priceCacheService.setCachedPrice(address, 0, 'UNKNOWN');
        }
      });
      
      // Wait for current batch to complete before starting next batch
      await Promise.all(promises);
      
      // Small delay between batches to be respectful to the API
      if (batches.indexOf(batch) < batches.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
  }

  /**
   * Get token prices in USD
   */
  async getTokenPrices(tokenAddresses: string[]): Promise<{ [address: string]: number }> {
    try {
      const prices: { [address: string]: number } = {};
      const uncachedAddresses: string[] = [];
      
      // Check cache first for all addresses
      for (const address of tokenAddresses) {
        const cachedPrice = priceCacheService.getCachedPrice(address);
        if (cachedPrice !== null) {
          prices[address] = cachedPrice;
          console.log(`Using cached price for ${address}: $${cachedPrice}`);
        } else {
          uncachedAddresses.push(address);
        }
      }
      
      // Only fetch prices for uncached addresses
      if (uncachedAddresses.length > 0) {
        console.log(`Fetching prices for ${uncachedAddresses.length} uncached tokens (out of ${tokenAddresses.length} total)`);
        await this.batchFetchTokenPrices(uncachedAddresses);
        
        // Get the newly cached prices
        for (const address of uncachedAddresses) {
          const price = priceCacheService.getCachedPrice(address) || 0;
          prices[address] = price;
        }
      } else {
        console.log(`All ${tokenAddresses.length} token prices found in cache!`);
      }

      return prices;
    } catch (error) {
      console.error('Error fetching token prices:', error);
      throw new Error('Không thể lấy giá token');
    }
  }

  /**
   * Get ETH price in USD
   */
  async getETHPrice(): Promise<number> {
    try {
      const ethPriceResponse = await fetch(
        `${MORALIS_BASE_URL}/erc20/0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2/price?chain=bsc`,
        {
          headers: {
            'X-API-Key': MORALIS_API_KEY,
            'Content-Type': 'application/json'
          }
        }
      );

      if (ethPriceResponse.ok) {
        const ethPriceData: MoralisPriceResponse = await ethPriceResponse.json();
        return ethPriceData.usdPrice || 2500;
      } else {
        return 2500;
      }
    } catch (error) {
      console.error('Error fetching ETH price:', error);
      throw new Error('Không thể lấy giá ETH');
    }
  }

  /**
   * Get ERC20 token transfers for a wallet address
   */
  async getWalletTokenTransfers(walletAddress: string, cursor?: string, limit: number = 20): Promise<{
    transfers: any[];
    cursor: string | null;
    total: number;
  }> {
    try {
      // Check cache first
      const cached = transactionCacheService.getCachedTransactionList(walletAddress, cursor);
      if (cached) {
        console.log(`Using cached token transfers for ${walletAddress} (cursor: ${cursor || 'first'})`);
        return {
          transfers: cached.data,
          cursor: cached.cursor,
          total: cached.data.length
        };
      }

      console.log(`Fetching fresh token transfers for ${walletAddress} (cursor: ${cursor || 'first'})`);
      
      // Sử dụng đúng endpoint của Moralis API v2.2 cho token transfers
      // Endpoint: GET /{address}/erc20/transfers
      let url = `${this.baseUrl}/${walletAddress}/erc20/transfers?chain=bsc&limit=${limit}`;
      if (cursor) {
        url += `&cursor=${cursor}`;
      }
      
      console.log('Moralis API URL:', url);
      console.log('API Key:', this.apiKey.substring(0, 20) + '...');

      const response = await fetch(url, {
        headers: {
          'X-API-Key': this.apiKey,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch token transfers: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('Moralis API Response:', JSON.stringify(data, null, 2));
      
      const result = {
        transfers: data.result || [],
        cursor: data.cursor || null,
        total: data.total || 0
      };
      
      // Cache the result
      transactionCacheService.setCachedTransactionList(
        walletAddress,
        result.transfers,
        result.cursor,
        cursor
      );
      
      return result;
    } catch (error) {
      console.error('Error fetching token transfers:', error);
      throw new Error('Không thể lấy lịch sử chuyển token');
    }
  }

  /**
   * Get native transactions for a wallet address
   */
  async getWalletTransactions(walletAddress: string, cursor?: string, limit: number = 20): Promise<{
    transactions: any[];
    cursor: string | null;
    total: number;
  }> {
    try {
      let url = `${this.baseUrl}/${walletAddress}?chain=bsc&limit=${limit}`;
      if (cursor) {
        url += `&cursor=${cursor}`;
      }

      const response = await fetch(url, {
        headers: {
          'X-API-Key': this.apiKey,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch native transactions: ${response.statusText}`);
      }

      const data = await response.json();
      return {
        transactions: data.result || [],
        cursor: data.cursor || null,
        total: data.total || 0
      };
    } catch (error) {
      console.error('Error fetching transactions:', error);
      throw new Error('Không thể lấy lịch sử giao dịch');
    }
  }

  async getTransactionByHash(hash: string): Promise<any | null> {
    try {
      // Check cache first
      const cached = transactionCacheService.getCachedTransactionDetail(hash);
      if (cached) {
        console.log(`Using cached transaction detail for ${hash}`);
        return cached;
      }

      console.log(`Fetching fresh transaction detail for ${hash}`);
      
      // Sử dụng Moralis API để lấy chi tiết transaction theo hash
      const url = `${this.baseUrl}/transaction/${hash}?chain=bsc`;
      
      console.log('Moralis Transaction Detail URL:', url);
      
      const response = await fetch(url, {
        headers: {
          'X-API-Key': this.apiKey,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });
      
      if (!response.ok) {
        console.error('Failed to fetch transaction detail:', response.status, response.statusText);
        return null;
      }
      
      const data = await response.json();
      console.log('Moralis Transaction Detail Response:', JSON.stringify(data, null, 2));
      
      // Cache the result (transaction details rarely change)
      transactionCacheService.setCachedTransactionDetail(hash, data);
      
      return data;
    } catch (error) {
      console.error('Error fetching transaction detail:', error);
      return null;
    }
  }
}
