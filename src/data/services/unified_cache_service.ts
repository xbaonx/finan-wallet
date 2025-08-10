/**
 * Unified Cache Service
 * Consolidates all caching logic from multiple services:
 * - PriceCacheService
 * - TokenListCacheService  
 * - TransactionCacheService
 * - BinancePriceService cache
 */

import { TokenInfo } from '../../domain/entities/swap_entity';

// Cache interfaces
interface CachedPrice {
  price: number;
  timestamp: number;
  symbol: string;
}

interface CachedTokenList {
  tokens: TokenInfo[];
  timestamp: number;
}

interface CachedTransactionList {
  data: any[];
  cursor: string | null;
  timestamp: number;
  walletAddress: string;
}

interface CachedTransactionDetail {
  data: any;
  timestamp: number;
}

interface CachedExchangeRate {
  rate: number;
  timestamp: number;
}

// Cache configuration
interface CacheConfig {
  ttl: number; // Time to live in milliseconds
  maxSize?: number; // Maximum cache size
}

export class UnifiedCacheService {
  // Cache stores
  private priceCache = new Map<string, CachedPrice>();
  private tokenListCache: CachedTokenList | null = null;
  private transactionListCache = new Map<string, CachedTransactionList>();
  private transactionDetailCache = new Map<string, CachedTransactionDetail>();
  private exchangeRateCache = new Map<string, CachedExchangeRate>();
  private genericCache = new Map<string, { data: any; timestamp: number }>();

  // Cache configurations
  private readonly configs = {
    price: { ttl: 30 * 1000 }, // 30 seconds for prices
    tokenList: { ttl: 10 * 60 * 1000 }, // 10 minutes for token list
    transactionList: { ttl: 2 * 60 * 1000 }, // 2 minutes for transaction list
    transactionDetail: { ttl: 10 * 60 * 1000 }, // 10 minutes for transaction details
    exchangeRate: { ttl: 5 * 60 * 1000 }, // 5 minutes for exchange rates
    generic: { ttl: 5 * 60 * 1000 } // 5 minutes for generic cache
  };

  // ========== PRICE CACHE METHODS ==========

  /**
   * Get cached price for token
   */
  getCachedPrice(address: string): number | null {
    const cached = this.priceCache.get(address.toLowerCase());
    if (!cached) return null;

    if (this.isExpired(cached.timestamp, this.configs.price.ttl)) {
      this.priceCache.delete(address.toLowerCase());
      return null;
    }

    return cached.price;
  }

  /**
   * Set price in cache
   */
  setCachedPrice(address: string, price: number, symbol: string): void {
    this.priceCache.set(address.toLowerCase(), {
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
    
    addresses.forEach(address => {
      const price = this.getCachedPrice(address);
      if (price !== null) {
        result.set(address.toLowerCase(), price);
      }
    });

    return result;
  }

  // ========== TOKEN LIST CACHE METHODS ==========

  /**
   * Get cached token list
   */
  getCachedTokenList(): TokenInfo[] | null {
    if (!this.tokenListCache) return null;

    if (this.isExpired(this.tokenListCache.timestamp, this.configs.tokenList.ttl)) {
      this.tokenListCache = null;
      return null;
    }

    return this.tokenListCache.tokens;
  }

  /**
   * Set token list in cache
   */
  setCachedTokenList(tokens: TokenInfo[]): void {
    this.tokenListCache = {
      tokens,
      timestamp: Date.now()
    };
  }

  // ========== TRANSACTION CACHE METHODS ==========

  /**
   * Get cached transaction list
   */
  getCachedTransactionList(walletAddress: string, cursor?: string): CachedTransactionList | null {
    const cacheKey = `${walletAddress}_${cursor || 'first'}`;
    const cached = this.transactionListCache.get(cacheKey);
    
    if (!cached) return null;

    if (this.isExpired(cached.timestamp, this.configs.transactionList.ttl)) {
      this.transactionListCache.delete(cacheKey);
      return null;
    }

    return cached;
  }

  /**
   * Set transaction list in cache
   */
  setCachedTransactionList(
    walletAddress: string, 
    data: any[], 
    cursor: string | null, 
    requestCursor?: string
  ): void {
    const cacheKey = `${walletAddress}_${requestCursor || 'first'}`;
    this.transactionListCache.set(cacheKey, {
      data,
      cursor,
      timestamp: Date.now(),
      walletAddress
    });
  }

  /**
   * Get cached transaction detail
   */
  getCachedTransactionDetail(txHash: string): any | null {
    const cached = this.transactionDetailCache.get(txHash);
    if (!cached) return null;

    if (this.isExpired(cached.timestamp, this.configs.transactionDetail.ttl)) {
      this.transactionDetailCache.delete(txHash);
      return null;
    }

    return cached.data;
  }

  /**
   * Set transaction detail in cache
   */
  setCachedTransactionDetail(txHash: string, data: any): void {
    this.transactionDetailCache.set(txHash, {
      data,
      timestamp: Date.now()
    });
  }

  // ========== EXCHANGE RATE CACHE METHODS ==========

  /**
   * Get cached exchange rate
   */
  getCachedExchangeRate(pair: string): number | null {
    const cached = this.exchangeRateCache.get(pair);
    if (!cached) return null;

    if (this.isExpired(cached.timestamp, this.configs.exchangeRate.ttl)) {
      this.exchangeRateCache.delete(pair);
      return null;
    }

    return cached.rate;
  }

  /**
   * Set exchange rate in cache
   */
  setCachedExchangeRate(pair: string, rate: number): void {
    this.exchangeRateCache.set(pair, {
      rate,
      timestamp: Date.now()
    });
  }

  // ========== GENERIC CACHE METHODS ==========

  /**
   * Generic cache getter
   */
  get<T>(key: string, ttl?: number): T | null {
    const cached = this.genericCache.get(key);
    if (!cached) return null;

    const cacheTtl = ttl || this.configs.generic.ttl;
    if (this.isExpired(cached.timestamp, cacheTtl)) {
      this.genericCache.delete(key);
      return null;
    }

    return cached.data as T;
  }

  /**
   * Generic cache setter
   */
  set<T>(key: string, data: T): void {
    this.genericCache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  // ========== UTILITY METHODS ==========

  /**
   * Check if cache entry is expired
   */
  private isExpired(timestamp: number, ttl: number): boolean {
    return Date.now() - timestamp > ttl;
  }

  /**
   * Clear all caches
   */
  clearAllCaches(): void {
    this.priceCache.clear();
    this.tokenListCache = null;
    this.transactionListCache.clear();
    this.transactionDetailCache.clear();
    this.exchangeRateCache.clear();
    this.genericCache.clear();
  }

  /**
   * Clear specific cache type
   */
  clearCache(type: 'price' | 'tokenList' | 'transaction' | 'exchangeRate' | 'generic'): void {
    switch (type) {
      case 'price':
        this.priceCache.clear();
        break;
      case 'tokenList':
        this.tokenListCache = null;
        break;
      case 'transaction':
        this.transactionListCache.clear();
        this.transactionDetailCache.clear();
        break;
      case 'exchangeRate':
        this.exchangeRateCache.clear();
        break;
      case 'generic':
        this.genericCache.clear();
        break;
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return {
      priceCache: this.priceCache.size,
      tokenListCache: this.tokenListCache ? 1 : 0,
      transactionListCache: this.transactionListCache.size,
      transactionDetailCache: this.transactionDetailCache.size,
      exchangeRateCache: this.exchangeRateCache.size,
      genericCache: this.genericCache.size
    };
  }

  /**
   * Cleanup expired entries (call periodically)
   */
  cleanup(): void {
    // Cleanup price cache
    for (const [key, cached] of this.priceCache.entries()) {
      if (this.isExpired(cached.timestamp, this.configs.price.ttl)) {
        this.priceCache.delete(key);
      }
    }

    // Cleanup token list cache
    if (this.tokenListCache && this.isExpired(this.tokenListCache.timestamp, this.configs.tokenList.ttl)) {
      this.tokenListCache = null;
    }

    // Cleanup transaction list cache
    for (const [key, cached] of this.transactionListCache.entries()) {
      if (this.isExpired(cached.timestamp, this.configs.transactionList.ttl)) {
        this.transactionListCache.delete(key);
      }
    }

    // Cleanup transaction detail cache
    for (const [key, cached] of this.transactionDetailCache.entries()) {
      if (this.isExpired(cached.timestamp, this.configs.transactionDetail.ttl)) {
        this.transactionDetailCache.delete(key);
      }
    }

    // Cleanup exchange rate cache
    for (const [key, cached] of this.exchangeRateCache.entries()) {
      if (this.isExpired(cached.timestamp, this.configs.exchangeRate.ttl)) {
        this.exchangeRateCache.delete(key);
      }
    }

    // Cleanup generic cache
    for (const [key, cached] of this.genericCache.entries()) {
      if (this.isExpired(cached.timestamp, this.configs.generic.ttl)) {
        this.genericCache.delete(key);
      }
    }
  }
}

// Singleton instance
export const unifiedCacheService = new UnifiedCacheService();

// Auto cleanup every 5 minutes
setInterval(() => {
  unifiedCacheService.cleanup();
}, 5 * 60 * 1000);
