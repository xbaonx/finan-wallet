/**
 * Enhanced Cache Service với hierarchical caching và smart invalidation
 */
export class CacheService {
  private static instance: CacheService;
  private cache = new Map<string, { data: any; timestamp: number; accessCount: number }>();
  private pendingRequests = new Map<string, Promise<any>>();
  
  // Different cache timeouts for different data types
  private readonly cacheTimeouts = {
    balance: 30000,        // 30 seconds - balance changes frequently
    tokenPrice: 60000,     // 1 minute - prices change often
    tokenList: 300000,     // 5 minutes - token list is relatively stable
    allowance: 60000,      // 1 minute - allowance can change
    swapQuote: 10000,      // 10 seconds - quotes change very frequently
    default: 60000         // 1 minute default
  };
  
  private readonly maxCacheSize = 1000; // Maximum number of cached items
  private currentWalletAddress: string | null = null;

  private constructor() {
    // Clean up old cache entries every 5 minutes
    setInterval(() => this.cleanupExpiredEntries(), 300000);
  }

  static getInstance(): CacheService {
    if (!CacheService.instance) {
      CacheService.instance = new CacheService();
    }
    return CacheService.instance;
  }

  /**
   * Get cache timeout for specific data type
   */
  private getCacheTimeout(cacheType: keyof typeof this.cacheTimeouts): number {
    return this.cacheTimeouts[cacheType] || this.cacheTimeouts.default;
  }

  /**
   * Generate cache key with wallet address prefix
   */
  private generateKey(baseKey: string, walletAddress?: string): string {
    const address = walletAddress || this.currentWalletAddress || 'global';
    return `${address}:${baseKey}`;
  }

  /**
   * Set current wallet address for cache invalidation
   */
  setWalletAddress(address: string): void {
    if (this.currentWalletAddress !== address) {
      // Clear wallet-specific cache when address changes
      this.clearWalletCache(this.currentWalletAddress);
      this.currentWalletAddress = address;
    }
  }

  /**
   * Enhanced getOrFetch with smart caching
   */
  async getOrFetch<T>(
    key: string,
    fetcher: () => Promise<T>,
    cacheType: keyof typeof this.cacheTimeouts = 'default',
    walletAddress?: string
  ): Promise<T> {
    const fullKey = this.generateKey(key, walletAddress);
    const timeout = this.getCacheTimeout(cacheType);
    
    // Check cache first
    const cached = this.cache.get(fullKey);
    if (cached && Date.now() - cached.timestamp < timeout) {
      // Update access count for LRU
      cached.accessCount++;
      return cached.data as T;
    }

    // Check if there's already a pending request for this key
    const pendingRequest = this.pendingRequests.get(fullKey);
    if (pendingRequest) {
      return pendingRequest as Promise<T>;
    }

    // Create new request
    const request = fetcher();
    this.pendingRequests.set(fullKey, request);

    try {
      const result = await request;
      
      // Ensure cache doesn't exceed max size
      this.ensureCacheSize();
      
      // Cache the result with access count
      this.cache.set(fullKey, { 
        data: result, 
        timestamp: Date.now(),
        accessCount: 1
      });
      
      return result;
    } catch (error) {
      // Don't cache errors
      throw error;
    } finally {
      // Remove from pending requests
      this.pendingRequests.delete(fullKey);
    }
  }

  /**
   * Clear wallet-specific cache entries
   */
  private clearWalletCache(walletAddress: string | null): void {
    if (!walletAddress) return;
    
    const prefix = `${walletAddress}:`;
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Ensure cache doesn't exceed maximum size using LRU eviction
   */
  private ensureCacheSize(): void {
    if (this.cache.size >= this.maxCacheSize) {
      // Find least recently used entries
      const entries = Array.from(this.cache.entries())
        .sort((a, b) => a[1].accessCount - b[1].accessCount)
        .slice(0, Math.floor(this.maxCacheSize * 0.2)); // Remove 20% of cache
      
      entries.forEach(([key]) => this.cache.delete(key));
    }
  }

  /**
   * Clean up expired cache entries
   */
  private cleanupExpiredEntries(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];
    
    for (const [key, entry] of this.cache.entries()) {
      // Determine cache type from key to get appropriate timeout
      let timeout = this.cacheTimeouts.default;
      
      if (key.includes('balance')) timeout = this.cacheTimeouts.balance;
      else if (key.includes('price')) timeout = this.cacheTimeouts.tokenPrice;
      else if (key.includes('tokens')) timeout = this.cacheTimeouts.tokenList;
      else if (key.includes('allowance')) timeout = this.cacheTimeouts.allowance;
      else if (key.includes('quote')) timeout = this.cacheTimeouts.swapQuote;
      
      if (now - entry.timestamp > timeout) {
        expiredKeys.push(key);
      }
    }
    
    expiredKeys.forEach(key => this.cache.delete(key));
    
    if (expiredKeys.length > 0) {
      console.log(`CacheService: Cleaned up ${expiredKeys.length} expired entries`);
    }
  }

  /**
   * Clear cache by pattern or all cache
   */
  clearCache(keyPattern?: string): void {
    if (keyPattern) {
      // Clear specific pattern
      for (const key of this.cache.keys()) {
        if (key.includes(keyPattern)) {
          this.cache.delete(key);
        }
      }
    } else {
      // Clear all cache
      this.cache.clear();
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; maxSize: number; hitRate?: number } {
    return {
      size: this.cache.size,
      maxSize: this.maxCacheSize
    };
  }

  getCacheSize(): number {
    return this.cache.size;
  }
}
