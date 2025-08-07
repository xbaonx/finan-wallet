/**
 * Price Cache Service
 * Caches token prices to reduce Moralis API calls
 */

interface CachedPrice {
  price: number;
  timestamp: number;
  symbol: string;
}

interface PriceBatchRequest {
  addresses: string[];
  symbols: string[];
}

export class PriceCacheService {
  private cache = new Map<string, CachedPrice>();
  private readonly CACHE_DURATION = 10 * 60 * 1000; // 10 minutes in milliseconds - tăng để giảm API calls
  private readonly MAX_BATCH_SIZE = 5; // Giảm batch size để tránh rate limit

  /**
   * Get cached price or return null if expired/not found
   */
  getCachedPrice(address: string): number | null {
    const cached = this.cache.get(address.toLowerCase());
    if (!cached) return null;

    const now = Date.now();
    if (now - cached.timestamp > this.CACHE_DURATION) {
      // Cache expired, remove it
      this.cache.delete(address.toLowerCase());
      return null;
    }

    return cached.price;
  }

  /**
   * Set price in cache
   */
  setCachedPrice(address: string, price: number, symbol: string): void {
    this.cache.set(address.toLowerCase(), {
      price,
      timestamp: Date.now(),
      symbol
    });
  }

  /**
   * Get multiple cached prices
   */
  getCachedPrices(addresses: string[]): Map<string, number> {
    const result = new Map<string, number>();
    
    for (const address of addresses) {
      const price = this.getCachedPrice(address);
      if (price !== null) {
        result.set(address.toLowerCase(), price);
      }
    }

    return result;
  }

  /**
   * Set multiple prices in cache
   */
  setCachedPrices(priceData: Array<{ address: string; price: number; symbol: string }>): void {
    for (const data of priceData) {
      this.setCachedPrice(data.address, data.price, data.symbol);
    }
  }

  /**
   * Filter out addresses that have valid cached prices
   */
  filterUncachedAddresses(addresses: string[]): string[] {
    return addresses.filter(address => this.getCachedPrice(address) === null);
  }

  /**
   * Clear expired cache entries
   */
  clearExpiredCache(): void {
    const now = Date.now();
    for (const [address, cached] of this.cache.entries()) {
      if (now - cached.timestamp > this.CACHE_DURATION) {
        this.cache.delete(address);
      }
    }
  }

  /**
   * Get cache statistics for debugging
   */
  getCacheStats(): { size: number; entries: Array<{ address: string; symbol: string; age: number }> } {
    const now = Date.now();
    const entries = Array.from(this.cache.entries()).map(([address, cached]) => ({
      address,
      symbol: cached.symbol,
      age: Math.floor((now - cached.timestamp) / 1000) // age in seconds
    }));

    return {
      size: this.cache.size,
      entries
    };
  }

  /**
   * Clear all cache
   */
  clearCache(): void {
    this.cache.clear();
  }
}

// Singleton instance
export const priceCacheService = new PriceCacheService();
