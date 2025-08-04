/**
 * Transaction Cache Service
 * Caches transaction data to reduce Moralis API calls
 */

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

export class TransactionCacheService {
  private transactionListCache = new Map<string, CachedTransactionList>();
  private transactionDetailCache = new Map<string, CachedTransactionDetail>();
  private readonly CACHE_DURATION = 2 * 60 * 1000; // 2 minutes for transactions (shorter than prices)
  private readonly DETAIL_CACHE_DURATION = 10 * 60 * 1000; // 10 minutes for transaction details (rarely change)

  /**
   * Get cached transaction list
   */
  getCachedTransactionList(walletAddress: string, cursor?: string): CachedTransactionList | null {
    const cacheKey = `${walletAddress}_${cursor || 'first'}`;
    const cached = this.transactionListCache.get(cacheKey);
    
    if (!cached) return null;

    const now = Date.now();
    if (now - cached.timestamp > this.CACHE_DURATION) {
      // Cache expired, remove it
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
  getCachedTransactionDetail(hash: string): any | null {
    const cached = this.transactionDetailCache.get(hash);
    if (!cached) return null;

    const now = Date.now();
    if (now - cached.timestamp > this.DETAIL_CACHE_DURATION) {
      // Cache expired, remove it
      this.transactionDetailCache.delete(hash);
      return null;
    }

    return cached.data;
  }

  /**
   * Set transaction detail in cache
   */
  setCachedTransactionDetail(hash: string, data: any): void {
    this.transactionDetailCache.set(hash, {
      data,
      timestamp: Date.now()
    });
  }

  /**
   * Clear expired cache entries
   */
  clearExpiredCache(): void {
    const now = Date.now();
    
    // Clear expired transaction lists
    for (const [key, cached] of this.transactionListCache.entries()) {
      if (now - cached.timestamp > this.CACHE_DURATION) {
        this.transactionListCache.delete(key);
      }
    }

    // Clear expired transaction details
    for (const [key, cached] of this.transactionDetailCache.entries()) {
      if (now - cached.timestamp > this.DETAIL_CACHE_DURATION) {
        this.transactionDetailCache.delete(key);
      }
    }
  }

  /**
   * Clear cache for specific wallet
   */
  clearWalletCache(walletAddress: string): void {
    // Clear transaction lists for this wallet
    for (const [key, cached] of this.transactionListCache.entries()) {
      if (cached.walletAddress === walletAddress) {
        this.transactionListCache.delete(key);
      }
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { 
    listCacheSize: number; 
    detailCacheSize: number;
    listEntries: Array<{ key: string; age: number }>;
    detailEntries: Array<{ hash: string; age: number }>;
  } {
    const now = Date.now();
    
    const listEntries = Array.from(this.transactionListCache.entries()).map(([key, cached]) => ({
      key,
      age: Math.floor((now - cached.timestamp) / 1000) // age in seconds
    }));

    const detailEntries = Array.from(this.transactionDetailCache.entries()).map(([hash, cached]) => ({
      hash,
      age: Math.floor((now - cached.timestamp) / 1000) // age in seconds
    }));

    return {
      listCacheSize: this.transactionListCache.size,
      detailCacheSize: this.transactionDetailCache.size,
      listEntries,
      detailEntries
    };
  }

  /**
   * Clear all cache
   */
  clearAllCache(): void {
    this.transactionListCache.clear();
    this.transactionDetailCache.clear();
  }
}

// Singleton instance
export const transactionCacheService = new TransactionCacheService();
