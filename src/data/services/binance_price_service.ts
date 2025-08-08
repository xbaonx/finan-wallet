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

export class BinancePriceService {
  private readonly baseUrl = 'https://api.binance.com/api/v3';
  private priceCache: Map<string, { price: number; timestamp: number }> = new Map();
  private readonly cacheTimeout = 30000; // 30 seconds cache

  /**
   * Lấy giá của một token từ Binance API
   */
  async getTokenPrice(symbol: string): Promise<number> {
    try {
      // Kiểm tra cache trước
      const cached = this.priceCache.get(symbol);
      const now = Date.now();
      
      if (cached && (now - cached.timestamp) < this.cacheTimeout) {
        console.log(`💾 Using cached price for ${symbol}: $${cached.price}`);
        return cached.price;
      }

      // Xử lý stablecoins trước - trả về giá cố định $1.00
      const stablecoins = ['USDT', 'USDC', 'BUSD', 'DAI', 'TUSD', 'FDUSD'];
      if (stablecoins.includes(symbol.toUpperCase())) {
        console.log(`💵 ${symbol} is stablecoin, returning $1.00`);
        this.priceCache.set(symbol, { price: 1.0, timestamp: now });
        return 1.0;
      }

      // Map symbol đặc biệt cho Binance API
      const symbolMapping: { [key: string]: string } = {
        'WBNB': 'BNB',      // WBNB -> BNB trên Binance
        'BTCB': 'BTC',      // BTCB -> BTC trên Binance
        'BETH': 'ETH',      // BETH -> ETH trên Binance
        'WETH': 'ETH',      // WETH -> ETH trên Binance
      };

      let mappedSymbol = symbolMapping[symbol.toUpperCase()] || symbol.toUpperCase();
      
      // Tạo symbol pair với USDT
      const binanceSymbol = `${mappedSymbol}USDT`;
      
      console.log(`🔍 Fetching price for ${symbol} from Binance...`);
      
      const response = await fetch(`${this.baseUrl}/ticker/price?symbol=${binanceSymbol}`);
      
      if (!response.ok) {
        console.warn(`⚠️ Binance API error for ${symbol}: ${response.status}`);
        return 0;
      }

      const data: BinancePriceData = await response.json();
      const price = parseFloat(data.price);
      
      // Cache kết quả
      this.priceCache.set(symbol, { price, timestamp: now });
      
      console.log(`✅ Got price for ${symbol}: $${price}`);
      return price;
      
    } catch (error) {
      console.error(`❌ Error fetching price for ${symbol}:`, error);
      
      // Fallback prices cho một số tokens phổ biến không có trên Binance
      const fallbackPrices: { [key: string]: number } = {
        'ALPACA': 0.12,    // Alpaca Finance
        'AUTO': 285,       // Auto
        'BELT': 0.85,      // Belt Finance
        'BIFI': 420,       // Beefy Finance
        'BSW': 0.065,      // Biswap
        'CHESS': 0.18,     // Tranchess
        'DEGO': 2.1,       // Dego Finance
        'EPS': 0.045,      // Ellipsis
        'FIST': 0.0012,    // FistToken
        'FOR': 0.0085,     // ForTube
        'HAY': 0.98,       // Hay
        'KALM': 0.35,      // Kalmar
        'LINA': 0.0085,    // Linear
        'LIT': 0.78,       // Litentry
        'MDX': 0.045,      // Mdex
        'NULS': 0.28,      // Nuls
        'RAMP': 0.065,     // RAMP
        'SFP': 0.42,       // SafePal
        'SXP': 0.32,       // Swipe
        'VAI': 0.99,       // Vai
        'WATCH': 0.0045,   // Yieldwatch
        'WEX': 0.12,       // WaultSwap
        'XVS': 8.5,        // Venus
      };
      
      const fallbackPrice = fallbackPrices[symbol.toUpperCase()];
      if (fallbackPrice) {
        console.log(`🔄 Using fallback price for ${symbol}: $${fallbackPrice}`);
        this.priceCache.set(symbol, { price: fallbackPrice, timestamp: Date.now() });
        return fallbackPrice;
      }
      
      return 0;
    }
  }

  /**
   * Lấy giá của nhiều token cùng lúc
   */
  async getMultipleTokenPrices(symbols: string[]): Promise<Map<string, number>> {
    const priceMap = new Map<string, number>();
    
    // Tạo danh sách symbols cho Binance
    const binanceSymbols = symbols.map(symbol => `${symbol.toUpperCase()}USDT`);
    
    try {
      console.log(`🔍 Fetching prices for ${symbols.length} tokens from Binance...`);
      
      // Gọi API lấy tất cả giá cùng lúc
      const symbolsQuery = binanceSymbols.map(s => `"${s}"`).join(',');
      const response = await fetch(`${this.baseUrl}/ticker/price?symbols=[${symbolsQuery}]`);
      
      if (!response.ok) {
        console.warn(`⚠️ Binance batch API error: ${response.status}`);
        // Fallback: gọi từng token riêng lẻ
        return await this.getFallbackPrices(symbols);
      }

      const data: BinancePriceData[] = await response.json();
      const now = Date.now();
      
      data.forEach(item => {
        const symbol = item.symbol.replace('USDT', '');
        const price = parseFloat(item.price);
        
        priceMap.set(symbol, price);
        // Cache kết quả
        this.priceCache.set(symbol, { price, timestamp: now });
      });
      
      console.log(`✅ Got prices for ${data.length} tokens from Binance`);
      return priceMap;
      
    } catch (error) {
      console.error('❌ Error fetching multiple prices:', error);
      // Fallback: gọi từng token riêng lẻ
      return await this.getFallbackPrices(symbols);
    }
  }

  /**
   * Fallback method: gọi từng token riêng lẻ với batching và delay
   */
  private async getFallbackPrices(symbols: string[]): Promise<Map<string, number>> {
    const priceMap = new Map<string, number>();
    const batchSize = 10; // Xử lý 10 tokens mỗi batch
    const delayBetweenBatches = 500; // Delay 500ms giữa các batch
    
    console.log(`🔄 Using fallback method for ${symbols.length} tokens (batches of ${batchSize})...`);
    
    // Chia symbols thành các batch nhỏ
    for (let i = 0; i < symbols.length; i += batchSize) {
      const batch = symbols.slice(i, i + batchSize);
      console.log(`📦 Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(symbols.length/batchSize)}: ${batch.join(', ')}`);
      
      // Xử lý batch hiện tại
      const promises = batch.map(async (symbol) => {
        try {
          const price = await this.getTokenPrice(symbol);
          return { symbol, price, success: true };
        } catch (error) {
          console.warn(`❌ Failed to get price for ${symbol}:`, error);
          return { symbol, price: 0, success: false };
        }
      });
      
      const results = await Promise.allSettled(promises);
      
      // Lưu kết quả của batch
      results.forEach((result, batchIndex) => {
        if (result.status === 'fulfilled') {
          priceMap.set(result.value.symbol, result.value.price);
        } else {
          const symbol = batch[batchIndex];
          console.warn(`❌ Promise failed for ${symbol}`);
          priceMap.set(symbol, 0);
        }
      });
      
      // Delay giữa các batch để tránh rate limit
      if (i + batchSize < symbols.length) {
        console.log(`⏱️ Waiting ${delayBetweenBatches}ms before next batch...`);
        await new Promise(resolve => setTimeout(resolve, delayBetweenBatches));
      }
    }
    
    console.log(`✅ Completed fallback price fetching for ${priceMap.size}/${symbols.length} tokens`);
    return priceMap;
  }

  /**
   * Lấy thông tin chi tiết của token (giá + thay đổi 24h)
   */
  async getTokenDetailedInfo(symbol: string): Promise<TokenPriceInfo> {
    try {
      const binanceSymbol = `${symbol.toUpperCase()}USDT`;
      
      console.log(`📊 Fetching detailed info for ${symbol}...`);
      
      const response = await fetch(`${this.baseUrl}/ticker/24hr?symbol=${binanceSymbol}`);
      
      if (!response.ok) {
        console.warn(`⚠️ Binance 24hr API error for ${symbol}: ${response.status}`);
        // Fallback: chỉ lấy giá
        const price = await this.getTokenPrice(symbol);
        return {
          symbol,
          priceUSD: price,
        };
      }

      const data = await response.json();
      
      return {
        symbol,
        priceUSD: parseFloat(data.lastPrice),
        priceChange24h: parseFloat(data.priceChangePercent),
        volume24h: parseFloat(data.volume),
      };
      
    } catch (error) {
      console.error(`❌ Error fetching detailed info for ${symbol}:`, error);
      return {
        symbol,
        priceUSD: 0,
      };
    }
  }

  /**
   * Xóa cache (dùng khi cần refresh)
   */
  clearCache(): void {
    this.priceCache.clear();
    console.log('🧹 Price cache cleared');
  }

  /**
   * Kiểm tra xem symbol có được hỗ trợ trên Binance không
   */
  async isSymbolSupported(symbol: string): Promise<boolean> {
    try {
      const binanceSymbol = `${symbol.toUpperCase()}USDT`;
      const response = await fetch(`${this.baseUrl}/ticker/price?symbol=${binanceSymbol}`);
      return response.ok;
    } catch {
      return false;
    }
  }
}
