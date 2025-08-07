/**
 * Logo Cache Service
 * Caches token logos to reduce network requests and maintain consistent appearance
 */

interface CachedLogo {
  logoUrl: string;
  timestamp: number;
  symbol: string;
}

export class LogoCacheService {
  private cache = new Map<string, CachedLogo>();
  private readonly CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

  /**
   * Get cached logo URL or return null if expired/not found
   */
  getCachedLogo(address: string): string | null {
    if (!address) return null;
    
    const cached = this.cache.get(address.toLowerCase());
    if (!cached) return null;

    const now = Date.now();
    if (now - cached.timestamp > this.CACHE_DURATION) {
      // Cache expired, remove it
      this.cache.delete(address.toLowerCase());
      return null;
    }

    return cached.logoUrl;
  }

  /**
   * Set logo URL in cache
   */
  setCachedLogo(address: string, logoUrl: string, symbol: string): void {
    if (!address || !logoUrl) return;
    
    this.cache.set(address.toLowerCase(), {
      logoUrl,
      timestamp: Date.now(),
      symbol
    });
  }

  /**
   * Get default logo URL for common tokens
   * Only used as fallback when no logo is available
   */
  getDefaultLogo(symbol: string): string | null {
    if (!symbol) return null;
    
    const upperSymbol = symbol.toUpperCase();
    
    // Fallback logos for very common tokens if Moralis doesn't provide one
    switch(upperSymbol) {
      case 'BNB':
      case 'WBNB':
        return 'https://cryptologos.cc/logos/bnb-bnb-logo.png';
      default:
        return null;
    }
  }
}

// Singleton instance
export const logoCacheService = new LogoCacheService();
