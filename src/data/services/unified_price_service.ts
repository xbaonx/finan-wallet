/**
 * Unified Price Service
 * Consolidates all price-related logic from:
 * - BinancePriceService
 * - PriceCacheService (now using UnifiedCacheService)
 * - Moralis price fetching
 */

import { unifiedCacheService } from './unified_cache_service';

export interface BinancePriceData {
  symbol: string;
  price: string;
}

export interface TokenPriceInfo {
  symbol: string;
  priceUSD: number;
  priceChange24h?: number;
  volume24h?: number;
}

export interface PriceBatchRequest {
  addresses: string[];
  symbols: string[];
}

export class UnifiedPriceService {
  private readonly binanceBaseUrl = 'https://api.binance.com/api/v3';
  private readonly moralisBaseUrl = 'https://deep-index.moralis.io/api/v2.2';
  private readonly maxBatchSize = 5; // Limit batch size to avoid rate limits

  // Stablecoin list
  private readonly stablecoins = ['USDT', 'USDC', 'BUSD', 'DAI', 'TUSD', 'FDUSD'];

  // Symbol mapping for Binance API
  private readonly symbolMapping: { [key: string]: string } = {
    'WBNB': 'BNB',
    'BTCB': 'BTC',
    'BETH': 'ETH',
    'WETH': 'ETH',
  };

  /**
   * Get token price from multiple sources with caching
   */
  async getTokenPrice(symbol: string, address?: string): Promise<number> {
    try {
      // Check cache first (using address if available, otherwise symbol)
      const cacheKey = address || symbol;
      const cachedPrice = unifiedCacheService.getCachedPrice(cacheKey);
      
      if (cachedPrice !== null) {
        console.log(`💾 Using cached price for ${symbol}: $${cachedPrice}`);
        return cachedPrice;
      }

      // Handle stablecoins - return fixed $1.00
      if (this.stablecoins.includes(symbol.toUpperCase())) {
        console.log(`💵 ${symbol} is stablecoin, returning $1.00`);
        unifiedCacheService.setCachedPrice(cacheKey, 1.0, symbol);
        return 1.0;
      }

      // Try Binance first (faster and more reliable)
      let price = await this.fetchFromBinance(symbol);
      
      // Fallback to Moralis if Binance fails and we have address
      if (price === null && address) {
        price = await this.fetchFromMoralis(address, symbol);
      }

      // Final fallback - return 0 if all sources fail
      if (price === null) {
        console.warn(`⚠️ Could not fetch price for ${symbol}`);
        return 0;
      }

      // Cache the result
      unifiedCacheService.setCachedPrice(cacheKey, price, symbol);
      return price;

    } catch (error) {
      console.error(`❌ Error fetching price for ${symbol}:`, error);
      return 0;
    }
  }

  /**
   * Get multiple token prices in batch
   */
  async getTokenPrices(requests: PriceBatchRequest): Promise<Map<string, number>> {
    const results = new Map<string, number>();
    const { addresses, symbols } = requests;

    // Check cache first
    const cachedPrices = unifiedCacheService.getCachedPrices(addresses);
    cachedPrices.forEach((price, address) => {
      results.set(address, price);
    });

    // Find uncached addresses
    const uncachedAddresses: string[] = [];
    const uncachedSymbols: string[] = [];
    
    addresses.forEach((address, index) => {
      if (!results.has(address.toLowerCase())) {
        uncachedAddresses.push(address);
        uncachedSymbols.push(symbols[index]);
      }
    });

    if (uncachedAddresses.length === 0) {
      console.log(`💾 All prices found in cache`);
      return results;
    }

    // Process uncached addresses in batches
    const batches = this.createBatches(uncachedAddresses, uncachedSymbols);
    
    for (const batch of batches) {
      try {
        // Try batch fetch from Moralis first
        const batchResults = await this.fetchBatchFromMoralis(batch.addresses, batch.symbols);
        
        // Add successful results
        batchResults.forEach((price, address) => {
          results.set(address, price);
          unifiedCacheService.setCachedPrice(address, price, batch.symbols[batch.addresses.indexOf(address)]);
        });

        // Handle failed addresses individually with Binance fallback
        batch.addresses.forEach(async (address, index) => {
          if (!batchResults.has(address)) {
            const symbol = batch.symbols[index];
            const price = await this.fetchFromBinance(symbol);
            
            if (price !== null) {
              results.set(address, price);
              unifiedCacheService.setCachedPrice(address, price, symbol);
            } else {
              results.set(address, 0);
            }
          }
        });

      } catch (error) {
        console.error('❌ Batch price fetch error:', error);
        
        // Fallback: fetch individually
        for (let i = 0; i < batch.addresses.length; i++) {
          const address = batch.addresses[i];
          const symbol = batch.symbols[i];
          
          try {
            const price = await this.getTokenPrice(symbol, address);
            results.set(address, price);
          } catch (err) {
            console.error(`❌ Individual price fetch failed for ${symbol}:`, err);
            results.set(address, 0);
          }
        }
      }

      // Rate limiting delay
      await this.delay(200);
    }

    return results;
  }

  /**
   * Fetch price from Binance API
   */
  private async fetchFromBinance(symbol: string): Promise<number | null> {
    try {
      // Map symbol for Binance
      const mappedSymbol = this.symbolMapping[symbol.toUpperCase()] || symbol.toUpperCase();
      const symbolPair = `${mappedSymbol}USDT`;

      const response = await fetch(`${this.binanceBaseUrl}/ticker/price?symbol=${symbolPair}`);
      
      if (!response.ok) {
        // Try with BUSD pair if USDT fails
        if (symbolPair.endsWith('USDT')) {
          const busdPair = symbolPair.replace('USDT', 'BUSD');
          const busdResponse = await fetch(`${this.binanceBaseUrl}/ticker/price?symbol=${busdPair}`);
          
          if (busdResponse.ok) {
            const busdData: BinancePriceData = await busdResponse.json();
            const price = parseFloat(busdData.price);
            console.log(`📈 Binance price for ${symbol} (BUSD pair): $${price}`);
            return price;
          }
        }
        return null;
      }

      const data: BinancePriceData = await response.json();
      const price = parseFloat(data.price);
      console.log(`📈 Binance price for ${symbol}: $${price}`);
      return price;

    } catch (error) {
      console.error(`❌ Binance API error for ${symbol}:`, error);
      return null;
    }
  }

  /**
   * Fetch price from Moralis API
   */
  private async fetchFromMoralis(address: string, symbol: string): Promise<number | null> {
    try {
      const apiKey = process.env.EXPO_PUBLIC_MORALIS_API_KEY;
      if (!apiKey) {
        console.warn('⚠️ Moralis API key not found');
        return null;
      }

      const response = await fetch(
        `${this.moralisBaseUrl}/erc20/${address}/price?chain=bsc`,
        {
          headers: {
            'X-API-Key': apiKey,
            'accept': 'application/json'
          }
        }
      );

      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      const price = parseFloat(data.usdPrice || '0');
      console.log(`📈 Moralis price for ${symbol}: $${price}`);
      return price;

    } catch (error) {
      console.error(`❌ Moralis API error for ${symbol}:`, error);
      return null;
    }
  }

  /**
   * Fetch multiple prices from Moralis in batch
   */
  private async fetchBatchFromMoralis(addresses: string[], symbols: string[]): Promise<Map<string, number>> {
    const results = new Map<string, number>();

    try {
      const apiKey = process.env.EXPO_PUBLIC_MORALIS_API_KEY;
      if (!apiKey) {
        console.warn('⚠️ Moralis API key not found');
        return results;
      }

      // Moralis batch endpoint
      const response = await fetch(
        `${this.moralisBaseUrl}/erc20/prices?chain=bsc`,
        {
          method: 'POST',
          headers: {
            'X-API-Key': apiKey,
            'Content-Type': 'application/json',
            'accept': 'application/json'
          },
          body: JSON.stringify({
            tokens: addresses.map(addr => ({ token_address: addr }))
          })
        }
      );

      if (!response.ok) {
        throw new Error(`Moralis batch API error: ${response.status}`);
      }

      const data = await response.json();
      
      if (data && Array.isArray(data)) {
        data.forEach((item: any, index: number) => {
          if (item && item.usdPrice) {
            const price = parseFloat(item.usdPrice);
            const address = addresses[index];
            results.set(address.toLowerCase(), price);
            console.log(`📈 Moralis batch price for ${symbols[index]}: $${price}`);
          }
        });
      }

    } catch (error) {
      console.error('❌ Moralis batch API error:', error);
    }

    return results;
  }

  /**
   * Create batches from arrays
   */
  private createBatches(addresses: string[], symbols: string[]): Array<{ addresses: string[], symbols: string[] }> {
    const batches = [];
    
    for (let i = 0; i < addresses.length; i += this.maxBatchSize) {
      batches.push({
        addresses: addresses.slice(i, i + this.maxBatchSize),
        symbols: symbols.slice(i, i + this.maxBatchSize)
      });
    }
    
    return batches;
  }

  /**
   * Delay utility for rate limiting
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get price with detailed info (including 24h change, volume)
   */
  async getTokenPriceInfo(symbol: string): Promise<TokenPriceInfo | null> {
    try {
      // Get basic price first
      const price = await this.getTokenPrice(symbol);
      
      if (price === 0) {
        return null;
      }

      // Try to get additional info from Binance
      const mappedSymbol = this.symbolMapping[symbol.toUpperCase()] || symbol.toUpperCase();
      const symbolPair = `${mappedSymbol}USDT`;

      const response = await fetch(`${this.binanceBaseUrl}/ticker/24hr?symbol=${symbolPair}`);
      
      if (response.ok) {
        const data = await response.json();
        return {
          symbol,
          priceUSD: price,
          priceChange24h: parseFloat(data.priceChangePercent || '0'),
          volume24h: parseFloat(data.volume || '0')
        };
      }

      // Fallback - return basic info
      return {
        symbol,
        priceUSD: price
      };

    } catch (error) {
      console.error(`❌ Error fetching price info for ${symbol}:`, error);
      return null;
    }
  }

  /**
   * Clear price cache
   */
  clearCache(): void {
    unifiedCacheService.clearCache('price');
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return unifiedCacheService.getCacheStats();
  }
}

// Singleton instance
export const unifiedPriceService = new UnifiedPriceService();
