import { TokenInfo } from '../../domain/entities/swap_entity';
import { CacheService } from './cache_service';

interface CoinGeckoTokenPrice {
  price: number;
  priceChange24h: number;
}

interface CoinGeckoResponse {
  [key: string]: {
    usd: number;
    usd_24h_change: number;
  };
}

export class CoinGeckoApiService {
  private readonly baseUrl = 'https://api.coingecko.com/api/v3';
  private readonly cacheService = CacheService.getInstance();
  private lastRequestTime = 0;
  private readonly minRequestInterval = 1000; // 1 second between requests

  // Mapping từ contract address sang CoinGecko ID
  private readonly tokenIdMapping: Record<string, string> = {
    '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2': 'ethereum', // WETH
    '0xdac17f958d2ee523a2206206994597c13d831ec7': 'tether', // USDT
    '0xa0b86a33e6ba8d2f7928d16768debd89c78b322f': 'usd-coin', // USDC
    '0x95ad61b0a150d79219dcf64e1e6cc01f0b64c4ce': 'shiba-inu', // SHIB
    '0x4fabb145d64652a948d72533023f6e7a623c7c53': 'binance-usd', // BUSD
    // Thêm các token khác theo nhu cầu
  };

  private getCacheKey(endpoint: string): string {
    return `coingecko_${endpoint.replace(/[^a-zA-Z0-9]/g, '_')}`;
  }

  private async waitForRateLimit(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    if (timeSinceLastRequest < this.minRequestInterval) {
      const waitTime = this.minRequestInterval - timeSinceLastRequest;
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    this.lastRequestTime = Date.now();
  }

  private async makeRequest(endpoint: string): Promise<any> {
    try {
      await this.waitForRateLimit();
      const response = await fetch(`${this.baseUrl}${endpoint}`);
      if (!response.ok) {
        throw new Error(`CoinGecko API Error: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error making request:', error);
      throw error;
    }
  }

  async getTokenPrice(tokenAddress: string): Promise<CoinGeckoTokenPrice> {
    const coinId = this.tokenIdMapping[tokenAddress.toLowerCase()];
    if (!coinId) {
      return await this.getTokenPriceByContract(tokenAddress);
    }

    const endpoint = `/simple/price?ids=${coinId}&vs_currencies=usd&include_24hr_change=true`;
    const cacheKey = this.getCacheKey(endpoint);
    
    return await this.cacheService.getOrFetch(
      cacheKey,
      async () => {
        await this.waitForRateLimit();
        const response = await this.makeRequest(endpoint);
        const tokenData = response[coinId];
        
        if (!tokenData) {
          throw new Error('Token không tìm thấy trên CoinGecko');
        }

        return {
          price: tokenData.usd || 0,
          priceChange24h: tokenData.usd_24h_change || 0,
        };
      },
      60000 // 1 minute cache
    ).catch(error => {
      console.error('Error fetching token price:', error);
      return { price: 0, priceChange24h: 0 };
    });
  }

  private async getTokenPriceByContract(contractAddress: string): Promise<CoinGeckoTokenPrice> {
    try {
      const response = await fetch(
        `${this.baseUrl}/simple/token_price/ethereum?contract_addresses=${contractAddress}&vs_currencies=usd&include_24hr_change=true`
      );

      if (!response.ok) {
        throw new Error(`CoinGecko API Error: ${response.status}`);
      }

      const data = await response.json();
      const tokenData = data[contractAddress.toLowerCase()];

      if (!tokenData) {
        throw new Error('Token không tìm thấy trên CoinGecko');
      }

      return {
        price: tokenData.usd || 0,
        priceChange24h: tokenData.usd_24h_change || 0,
      };
    } catch (error) {
      console.error('Error fetching token price by contract:', error);
      return {
        price: 0,
        priceChange24h: 0,
      };
    }
  }

  async getTopTokens(limit: number = 50): Promise<TokenInfo[]> {
    try {
      const response = await fetch(
        `${this.baseUrl}/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=${limit}&page=1&sparkline=false&price_change_percentage=24h`
      );

      if (!response.ok) {
        throw new Error(`CoinGecko API Error: ${response.status}`);
      }

      const data = await response.json();
      return data.map((coin: any) => ({
        id: coin.id,
        symbol: coin.symbol.toUpperCase(),
        name: coin.name,
        image: coin.image,
        current_price: coin.current_price || 0,
        price_change_percentage_24h: coin.price_change_percentage_24h || 0,
      }));
    } catch (error) {
      console.error('Error fetching top tokens:', error);
      return [];
    }
  }

  async searchTokens(query: string): Promise<TokenInfo[]> {
    try {
      const response = await fetch(
        `${this.baseUrl}/search?query=${encodeURIComponent(query)}`
      );

      if (!response.ok) {
        throw new Error(`CoinGecko API Error: ${response.status}`);
      }

      const data = await response.json();
      return data.coins.slice(0, 20).map((coin: any) => ({
        id: coin.id,
        symbol: coin.symbol.toUpperCase(),
        name: coin.name,
        image: coin.large,
        current_price: 0, // Search API không trả về giá
        price_change_percentage_24h: 0,
      }));
    } catch (error) {
      console.error('Error searching tokens:', error);
      return [];
    }
  }
}
