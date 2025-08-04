/**
 * Token List Cache Service
 * Caches supported tokens list to reduce API calls
 */

import { TokenInfo } from '../../domain/entities/swap_entity';

interface CachedTokenList {
  tokens: TokenInfo[];
  timestamp: number;
}

export class TokenListCacheService {
  private cache: CachedTokenList | null = null;
  private readonly CACHE_DURATION = 10 * 60 * 1000; // 10 minutes for token list (rarely changes)

  /**
   * Get cached token list
   */
  getCachedTokenList(): TokenInfo[] | null {
    if (!this.cache) return null;

    const now = Date.now();
    if (now - this.cache.timestamp > this.CACHE_DURATION) {
      // Cache expired, remove it
      this.cache = null;
      return null;
    }

    return this.cache.tokens;
  }

  /**
   * Set token list in cache
   */
  setCachedTokenList(tokens: TokenInfo[]): void {
    this.cache = {
      tokens,
      timestamp: Date.now()
    };
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache = null;
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { 
    isCached: boolean; 
    tokenCount: number; 
    age: number; // age in seconds
  } {
    if (!this.cache) {
      return {
        isCached: false,
        tokenCount: 0,
        age: 0
      };
    }

    const now = Date.now();
    return {
      isCached: true,
      tokenCount: this.cache.tokens.length,
      age: Math.floor((now - this.cache.timestamp) / 1000)
    };
  }

  /**
   * Check if cache is valid
   */
  isCacheValid(): boolean {
    if (!this.cache) return false;
    
    const now = Date.now();
    return (now - this.cache.timestamp) <= this.CACHE_DURATION;
  }
}

// Singleton instance
export const tokenListCacheService = new TokenListCacheService();
