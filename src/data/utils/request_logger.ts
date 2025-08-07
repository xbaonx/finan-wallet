/**
 * Utility để ghi log và theo dõi các API request
 */
export class RequestLogger {
  private static instance: RequestLogger;
  private requestCounts: Map<string, number> = new Map();
  private requestLog: Array<{
    timestamp: Date;
    url: string;
    caller: string;
    stack: string;
  }> = [];
  
  private constructor() {}
  
  public static getInstance(): RequestLogger {
    if (!RequestLogger.instance) {
      RequestLogger.instance = new RequestLogger();
    }
    return RequestLogger.instance;
  }
  
  /**
   * Reset logger để bắt đầu session mới
   */
  public resetSession(): void {
    this.requestCounts.clear();
    this.requestLog = [];
    console.warn('🔄 [MORALIS LOGGER] Session reset - Starting fresh tracking');
    console.warn('━'.repeat(80));
  }

  /**
   * Ghi log một request
   */
  public logRequest(url: string, caller: string): void {
    // Tăng số lượng đếm cho endpoint này
    const count = this.requestCounts.get(url) || 0;
    this.requestCounts.set(url, count + 1);
    
    // Lấy stack trace để xác định vị trí gọi
    const stack = new Error().stack?.split('\n').slice(2).join('\n') || '';
    
    // Thêm vào log
    this.requestLog.push({
      timestamp: new Date(),
      url,
      caller,
      stack
    });
    
    // Estimate CU cost based on official Moralis docs (2025-08-08)
    let estimatedCU = 0;
    
    // Token endpoints
    if (url.includes('/erc20/') && url.includes('/price')) estimatedCU = 100; // getWalletTokenBalancePrice
    else if (url.includes('/erc20/') && url.includes('/transfers')) estimatedCU = 50; // getErc20Transfers  
    else if (url.includes('/erc20/mints')) estimatedCU = 250;
    else if (url.includes('/erc20/burns')) estimatedCU = 250;
    else if (url.includes('/erc20/approvals')) estimatedCU = 250;
    
    // Wallet endpoints
    else if (url.includes('/erc20') && !url.includes('/price')) estimatedCU = 100; // getWalletTokenBalances
    else if (url.includes('/balance')) estimatedCU = 10; // getNativeBalance
    else if (url.includes('/nft')) estimatedCU = 50; // NFT endpoints
    
    // Transaction endpoints
    else if (url.includes('/transaction/') && url.includes('/verbose')) estimatedCU = 20;
    else if (url.includes('/transaction/')) estimatedCU = 10; // getTransaction
    else if (url.includes('/transactions')) estimatedCU = 30; // getTransactions
    
    // Block endpoints
    else if (url.includes('/block/')) estimatedCU = 100; // getBlock
    
    // Default fallback
    else estimatedCU = 10;
    
    // Add extra CU for special parameters
    if (url.includes('include=internal_transactions')) estimatedCU += 10;
    
    // Lấy thời gian từ session bắt đầu
    const sessionTime = this.requestLog.length > 1 ? 
      `+${Math.round((Date.now() - this.requestLog[0].timestamp.getTime()) / 1000)}s` : '0s';
    
    // Log ra console với thông tin CU
    console.warn(`🔥 [MORALIS REQUEST #${this.getTotalRequestCount()}] ${caller} (${sessionTime})`);
    console.warn(`📍 URL: ${url}`);
    console.warn(`💰 Estimated CU: ${estimatedCU}`);
    console.warn(`📊 Session requests: ${this.getTotalRequestCount()}`);
    console.warn(`💸 Session total CU: ${this.getEstimatedTotalCU()}`);
    console.warn(`🔍 Called from: ${stack.split('\n')[0]?.trim() || 'unknown'}`);
    console.warn('━'.repeat(80));
  }
  
  /**
   * In báo cáo tóm tắt các request
   */
  public printSummary(): void {
    console.warn('\n=== MORALIS API REQUEST SUMMARY ===');
    console.warn(`Total requests: ${this.requestLog.length}`);
    
    // Đếm theo endpoint
    const endpointCounts: {[key: string]: number} = {};
    for (const [url, count] of this.requestCounts.entries()) {
      const endpoint = url.split('?')[0]; // Bỏ query params
      endpointCounts[endpoint] = (endpointCounts[endpoint] || 0) + count;
    }
    
    // Đếm theo caller
    const callerCounts: {[key: string]: number} = {};
    for (const log of this.requestLog) {
      callerCounts[log.caller] = (callerCounts[log.caller] || 0) + 1;
    }
    
    // In ra các endpoint thường xuyên nhất
    console.warn('\nTop endpoints:');
    Object.entries(endpointCounts)
      .sort((a, b) => b[1] - a[1])
      .forEach(([endpoint, count]) => {
        console.warn(`- ${endpoint}: ${count} requests`);
      });
    
    // In ra các caller thường xuyên nhất
    console.warn('\nTop callers:');
    Object.entries(callerCounts)
      .sort((a, b) => b[1] - a[1])
      .forEach(([caller, count]) => {
        console.warn(`- ${caller}: ${count} requests`);
      });
    
    console.warn('\n===================================\n');
  }
  
  /**
   * Lấy tổng số request
   */
  public getTotalRequestCount(): number {
    return this.requestLog.length;
  }
  
  /**
   * Ước tính tổng CU đã tiêu thụ
   */
  public getEstimatedTotalCU(): number {
    let totalCU = 0;
    for (const log of this.requestLog) {
      let cu = 0;
      if (log.url.includes('/erc20/') && log.url.includes('/price')) cu = 10;
      else if (log.url.includes('/erc20/') && log.url.includes('/transfers')) cu = 10;
      else if (log.url.includes('/erc20/mints')) cu = 10;
      else if (log.url.includes('/erc20/burns')) cu = 10;
      else if (log.url.includes('/erc20/approvals')) cu = 10;
      else if (log.url.includes('/block/')) cu = 10;
      else if (log.url.includes('/erc20/transfers')) cu = 5;
      else if (log.url.includes('/erc20')) cu = 10;
      else if (log.url.includes('/balance') || log.url.match(/\/[^/]+$/)) cu = 5;
      else if (log.url.includes('/logs')) cu = 5;
      else cu = 5;
      
      if (log.url.includes('include=internal_transactions')) cu += 5;
      totalCU += cu;
    }
    return totalCU;
  }
  
  /**
   * Reset các thống kê
   */
  public reset(): void {
    this.requestCounts.clear();
    this.requestLog = [];
  }
}

export const requestLogger = RequestLogger.getInstance();
