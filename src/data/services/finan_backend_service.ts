import { API_CONFIG } from '../../core/config/api_config';

// Types cho backend responses
export interface SwapConfig {
  platformFeePercentage: number;
  supportedTokens: string[];
  minSwapAmount: number;
  maxSwapAmount: number;
}

export interface ExchangeRates {
  usdToVnd: number;
  lastUpdated: string;
  source?: string;
}

export interface ExchangeRatesResponse {
  success: boolean;
  rates: ExchangeRates;
}

export interface DepositWithdrawOrder {
  id: string;
  type: 'deposit' | 'withdraw';
  walletAddress: string;
  usdtAmount: number;
  vndAmount: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  createdAt: string;
  bankInfo?: {
    bankName: string;
    accountNumber: string;
    accountName: string;
  };
  transactionInfo?: string;
}

export interface DepositOrderResponse {
  success: boolean;
  message: string;
  order: DepositWithdrawOrder;
}

export interface SwapFeeCalculation {
  platformFee: number;
  platformFeePercentage: number;
  estimatedOutput: number;
  totalFee: number;
}

export class FinanBackendService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = API_CONFIG.FINAN_BACKEND.BASE_URL;
  }

  /**
   * Generic API request method
   */
  private async makeRequest<T>(
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
    data?: any
  ): Promise<T> {
    try {
      const url = `${this.baseUrl}${endpoint}`;
      const config: RequestInit = {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
      };

      if (data && (method === 'POST' || method === 'PUT')) {
        config.body = JSON.stringify(data);
      }

      console.log(`[FinanBackend] ${method} ${url}`, data || '');

      const response = await fetch(url, config);
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Backend API lỗi: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      console.log(`[FinanBackend] Phản hồi:`, result);
      
      return result;
    } catch (error) {
      console.error(`[FinanBackend] Yêu cầu thất bại:`, error);
      throw error;
    }
  }

  // ===== SWAP METHODS =====

  /**
   * Lấy cấu hình swap (platform fee, tokens được hỗ trợ)
   */
  async getSwapConfig(): Promise<SwapConfig> {
    try {
      const response = await this.makeRequest<{success: boolean, config: any}>(
        API_CONFIG.FINAN_BACKEND.ENDPOINTS.GET_SWAP_CONFIG
      );
      
      // Xử lý response structure từ backend
      if (response.success && response.config) {
        const config = response.config;
        return {
          platformFeePercentage: config.platformFeePercentage || 0.9, // Fallback từ 0.7% lên 0.9% theo backend
          supportedTokens: config.enabledTokens || ['USDT', 'USDC', 'DAI', 'BUSD', 'BNB'],
          minSwapAmount: config.minSwapAmount || 1,
          maxSwapAmount: config.maxSwapAmount || 1000000
        };
      } else {
        throw new Error('Invalid response structure from backend');
      }
    } catch (error) {
      console.warn('⚠️ Không thể lấy cấu hình swap từ backend, sử dụng mặc định:', error);
      // Trả về cấu hình mặc định nếu backend không khả dụng
      return {
        platformFeePercentage: 0.9, // 0.9% mặc định (cập nhật từ backend)
        supportedTokens: ['USDT', 'USDC', 'DAI', 'BUSD', 'BNB'],
        minSwapAmount: 1,
        maxSwapAmount: 1000000
      };
    }
  }

  /**
   * Tính phí swap cho giao dịch
   */
  async calculateSwapFee(swapData: {
    fromToken: string;
    toToken: string;
    amount: string;
    fromAddress: string;
  }): Promise<SwapFeeCalculation> {
    try {
      return await this.makeRequest<SwapFeeCalculation>(
        API_CONFIG.FINAN_BACKEND.ENDPOINTS.CALCULATE_SWAP_FEE,
        'POST',
        swapData
      );
    } catch (error) {
      console.warn('⚠️ Không thể tính phí swap từ backend, sử dụng tính toán cục bộ');
      
      // Tính toán phí cục bộ nếu backend không khả dụ
      const amount = parseFloat(swapData.amount);
      const platformFeePercentage = 0.9; // 0.9% mặc định (cập nhật từ backend)
      const platformFee = amount * (platformFeePercentage / 100);
      
      return {
        platformFee,
        platformFeePercentage,
        estimatedOutput: amount - platformFee,
        totalFee: platformFee
      };
    }
  }

  /**
   * Validate swap transaction
   */
  async validateSwap(swapData: {
    fromToken: string;
    toToken: string;
    amount: string;
    fromAddress: string;
  }) {
    return this.makeRequest(
      API_CONFIG.FINAN_BACKEND.ENDPOINTS.VALIDATE_SWAP,
      'POST',
      swapData
    );
  }

  /**
   * Lấy danh sách tokens được hỗ trợ
   */
  async getSupportedTokens() {
    try {
      return await this.makeRequest(
        API_CONFIG.FINAN_BACKEND.ENDPOINTS.GET_SUPPORTED_TOKENS
      );
    } catch (error) {
      console.warn('⚠️ Không thể lấy danh sách tokens từ backend, sử dụng danh sách mặc định');
      return ['USDT', 'USDC', 'DAI', 'BUSD', 'BNB'];
    }
  }

  // ===== DEPOSIT/WITHDRAW METHODS =====

  /**
   * Tạo đơn hàng nạp tiền
   */
  async createDepositOrder(orderData: {
    walletAddress: string;
    usdtAmount: number;
    vndAmount: number;
    transactionId: string; // Required field theo backend API
    bankInfo?: {
      bankName: string;
      accountNumber: string;
      accountName: string;
    };
    transactionInfo?: string;
  }): Promise<DepositOrderResponse> {
    return this.makeRequest<DepositOrderResponse>(
      API_CONFIG.FINAN_BACKEND.ENDPOINTS.CREATE_DEPOSIT_ORDER,
      'POST',
      orderData
    );
  }

  /**
   * Tạo đơn hàng rút tiền
   */
  async createWithdrawOrder(orderData: {
    walletAddress: string;
    usdtAmount: number;
    vndAmount: number;
    bankInfo: {
      bankName: string;
      accountNumber: string;
      accountName: string;
    };
    transactionInfo?: string;
  }): Promise<DepositWithdrawOrder> {
    return this.makeRequest<DepositWithdrawOrder>(
      API_CONFIG.FINAN_BACKEND.ENDPOINTS.CREATE_WITHDRAW_ORDER,
      'POST',
      orderData
    );
  }

  /**
   * Lấy danh sách đơn hàng theo địa chỉ ví
   */
  async getOrders(walletAddress: string, type?: 'deposit' | 'withdraw'): Promise<DepositWithdrawOrder[]> {
    const params = new URLSearchParams({ walletAddress });
    if (type) {
      params.append('type', type);
    }
    
    return this.makeRequest<DepositWithdrawOrder[]>(
      `${API_CONFIG.FINAN_BACKEND.ENDPOINTS.GET_ORDERS}?${params.toString()}`
    );
  }

  /**
   * Lấy đơn hàng theo ID
   */
  async getOrderById(orderId: string): Promise<DepositWithdrawOrder> {
    const endpoint = API_CONFIG.FINAN_BACKEND.ENDPOINTS.GET_ORDER_BY_ID.replace('{orderId}', orderId);
    return this.makeRequest<DepositWithdrawOrder>(endpoint);
  }

  /**
   * Lấy tỷ giá hiện tại
   */
  async getExchangeRates(): Promise<ExchangeRatesResponse> {
    try {
      console.log('🔍 DEBUG: Gọi API tỷ giá backend...');
      console.log('   - Endpoint:', API_CONFIG.FINAN_BACKEND.ENDPOINTS.GET_EXCHANGE_RATES);
      console.log('   - Base URL:', this.baseUrl);
      console.log('   - Full URL:', `${this.baseUrl}${API_CONFIG.FINAN_BACKEND.ENDPOINTS.GET_EXCHANGE_RATES}`);
      
      const result = await this.makeRequest<ExchangeRatesResponse>(
        API_CONFIG.FINAN_BACKEND.ENDPOINTS.GET_EXCHANGE_RATES
      );
      
      console.log('✅ Backend API trả về tỷ giá thành công:', JSON.stringify(result, null, 2));
      return result;
    } catch (error: any) {
      console.error('❌ Lỗi khi gọi API tỷ giá backend:', error);
      console.error('   - Error message:', error?.message);
      console.error('   - Error status:', error?.response?.status);
      console.error('   - Error data:', error?.response?.data);
      console.warn('⚠️ Không thể lấy tỷ giá từ backend, sử dụng tỷ giá mặc định');
      
      // Trả về tỷ giá mặc định nếu backend không khả dụng
      const fallbackRates: ExchangeRatesResponse = {
        success: false,
        rates: {
          usdToVnd: 24000, // Tỷ giá mặc định 1 USD = 24,000 VND
          lastUpdated: new Date().toISOString(),
          source: 'fallback'
        }
      };
      
      console.log('🔄 Sử dụng tỷ giá fallback:', JSON.stringify(fallbackRates, null, 2));
      return fallbackRates;
    }
  }

  /**
   * Lấy thống kê deposit
   */
  async getDepositStats(walletAddress?: string) {
    const params = walletAddress ? `?walletAddress=${walletAddress}` : '';
    return this.makeRequest(
      `${API_CONFIG.FINAN_BACKEND.ENDPOINTS.GET_DEPOSIT_STATS}${params}`
    );
  }

  /**
   * Kiểm tra kết nối backend
   */
  async checkBackendHealth(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl.replace('/api/v1', '')}/health`);
      return response.ok;
    } catch (error) {
      console.error('Backend không khả dụng:', error);
      return false;
    }
  }

  /**
   * Lấy cấu hình chế độ ứng dụng
   */
  async getAppMode(): Promise<{success: boolean, isReviewMode: boolean}> {
    try {
      // API trả về giá trị boolean đơn giản (true/false) thay vì object
      const response = await this.makeRequest<boolean>(
        API_CONFIG.FINAN_BACKEND.ENDPOINTS.GET_APP_MODE
      );
      
      console.log(`[FinanBackend] API app-mode trả về: ${response}`);
      
      // API trả về true có nghĩa là đang ở chế độ review
      return {
        success: true,
        isReviewMode: response === true
      };
    } catch (error) {
      console.warn('⚠️ Không thể lấy cấu hình chế độ ứng dụng từ backend, sử dụng chế độ mặc định');
      // Trả về chế độ mặc định nếu backend không khả dụng
      return {
        success: true,
        isReviewMode: false // Mặc định hiển thị tính năng nạp/rút
      };
    }
  }
}

// Export singleton instance
export const finanBackendService = new FinanBackendService();
