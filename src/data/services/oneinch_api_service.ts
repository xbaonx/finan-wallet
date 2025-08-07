import { TokenInfo, SwapQuote, SwapRequest, SwapTransaction } from '../../domain/entities/swap_entity';
import { ethers } from 'ethers';
import { API_CONFIG } from '../../core/config/api_config';

export class OneInchApiService {
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly chainId: number;
  private readonly maxRetries = 3;

  private readonly endpoints: any;

  constructor(apiKey?: string) {
    // Sử dụng apiKey từ tham số hoặc lấy từ config nếu không có
    this.apiKey = apiKey || API_CONFIG.ONEINCH.API_KEY;
    this.baseUrl = API_CONFIG.ONEINCH.BASE_URL;
    this.chainId = API_CONFIG.ONEINCH.CHAIN_ID;
    this.endpoints = API_CONFIG.ONEINCH.ENDPOINTS;
    
    console.log(`🔄 OneInchApiService initialized with chainId: ${this.chainId}`);
  }

  private convertToWei(amount: string, decimals: number): string {
    try {
      // Validate amount first
      const amountStr = amount.trim();
      if (!amountStr || amountStr === '0') {
        return '0';
      }
      
      // Parse amount and check if it's valid
      if (!/^\d*\.?\d+$/.test(amountStr)) {
        console.error('Invalid amount format:', amountStr);
        throw new Error('Invalid amount format');
      }
      
      // Convert to wei using ethers parseUnits - handle large numbers correctly
      console.log(`🔢 Converting ${amountStr} to wei with ${decimals} decimals`);
      const result = ethers.parseUnits(amountStr, decimals).toString();
      console.log(`🔢 Result: ${result}`);
      return result;
    } catch (error) {
      console.error('Error converting to wei:', error);
      return '0';
    }
  }

  private convertFromWei(amountWei: string | null | undefined, decimals: number): string {
    try {
      // Handle null/undefined values from API response
      if (!amountWei || amountWei === 'null' || amountWei === 'undefined') {
        console.warn('Received null/undefined amountWei, returning 0');
        return '0';
      }
      
      // Ensure we're dealing with a valid string for large numbers
      const amountWeiString = amountWei.toString().trim();
      
      // Convert from wei using ethers formatUnits
      const result = ethers.formatUnits(amountWeiString, decimals);
      
      // Debug logging for all amounts
      console.log('🔢 convertFromWei Debug:');
      console.log('Input amountWei:', amountWeiString);
      console.log('Decimals:', decimals);
      console.log('Result:', result);
      
      return result;
    } catch (error) {
      console.error('Error converting from wei:', error);
      return '0';
    }
  }

  private async makeRequest(endpoint: string, params?: Record<string, any>, retries: number = 2): Promise<any> {
    const url = new URL(`${this.baseUrl}${endpoint}`);
    
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, value.toString());
        }
      });
    }

    // Debug logging
    console.log('🔍 1inch API Request Debug:');
    console.log('Endpoint:', endpoint);
    console.log('Parameters:', params);
    console.log('Full URL:', url.toString());

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const response = await fetch(url.toString(), {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
        });

        if (!response.ok) {
          const errorText = await response.text().catch(() => 'Unknown error');
          
          // Detailed error logging
          console.error('🚨 1inch API Error Details:');
          console.error('Status:', response.status);
          console.error('Status Text:', response.statusText);
          console.error('Error Response:', errorText);
          console.error('Request URL:', url.toString());
          
          // Specific error handling
          if (response.status === 429) {
            throw new Error('Quá nhiều yêu cầu, vui lòng thử lại sau');
          } else if (response.status === 400) {
            // Kiểm tra xem có phải lỗi không đủ số dư không
            if (errorText.includes('Not enough') && errorText.includes('balance')) {
              // Trích xuất thông tin token từ lỗi
              const tokenMatch = errorText.match(/Not enough ([a-fA-F0-9x]+) balance/);
              const amountMatch = errorText.match(/Amount: (\d+)/);
              const balanceMatch = errorText.match(/Balance: (\d+)/);
              
              if (tokenMatch && amountMatch && balanceMatch) {
                const tokenAddress = tokenMatch[1];
                const requiredAmount = amountMatch[1];
                const currentBalance = balanceMatch[1];
                
                throw new Error(`Không đủ số dư token. Cần: ${this.convertFromWei(requiredAmount, 18)}, Có: ${this.convertFromWei(currentBalance, 18)}. Vui lòng nạp thêm token vào ví.`);
              }
            }
            throw new Error(`Thông tin không hợp lệ: ${errorText}`);
          } else if (response.status === 403) {
            throw new Error('API key không hợp lệ hoặc bị từ chối');
          }
          
          throw new Error(`1inch API Error: ${response.status} - ${errorText}`);
        }

        return await response.json();
      } catch (error) {
        console.warn(`1inch API attempt ${attempt + 1} failed:`, error);
        
        if (attempt === retries) {
          throw error;
        }
        
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
      }
    }
  }

  async getSupportedTokens(): Promise<TokenInfo[]> {
    try {
      console.log('🔍 Calling 1inch API for BSC tokens...');
      // Sử dụng endpoint từ config
      const endpoint = this.endpoints.TOKENS.replace('{chainId}', this.chainId.toString());
      const response = await this.makeRequest(endpoint);
      
      console.log('📦 1inch API Response:', JSON.stringify(response, null, 2));
      
      if (!response || !response.tokens) {
        console.log('❌ 1inch API returned no tokens for BSC, will use fallback');
        return [];
      }
      
      const tokens = Object.values(response.tokens).map((token: any) => ({
        address: token.address,
        symbol: token.symbol,
        name: token.name,
        decimals: token.decimals,
        logoURI: token.logoURI,
      }));
      
      console.log(`✅ 1inch API returned ${tokens.length} tokens for BSC`);
      return tokens;
    } catch (error) {
      console.error('❌ Error fetching supported tokens from 1inch API:', error);
      console.log('🔄 Will use fallback BSC token list instead');
      return []; // Return empty array to trigger fallback
    }
  }

  async getSwapQuote(request: SwapRequest): Promise<SwapQuote> {
    try {
      // Convert amount to wei if needed
      const fromAmountWei = this.convertToWei(request.fromAmount, request.fromToken.decimals);
      
      const params = {
        src: request.fromToken.address,
        dst: request.toToken.address,
        amount: fromAmountWei,
        includeTokensInfo: 'true',
        includeProtocols: 'true',
        includeGas: 'true',
      };

      // Sử dụng endpoint từ config
      const endpoint = this.endpoints.QUOTE.replace('{chainId}', this.chainId.toString());
      const response = await this.makeRequest(endpoint, params);

      // Debug quote response
      console.log('🏁 1inch Quote API Response:');
      console.log('dstAmount:', response.dstAmount);
      
      // 1inch API v6.0 uses 'dstAmount' field
      const quoteAmount = response.dstAmount || '0';
      console.log('Using quote amount:', quoteAmount);
      
      if (!quoteAmount || quoteAmount === '0') {
        console.warn('⚠️ Quote amount is 0 or null - possible liquidity issue');
      }

      return {
        fromToken: request.fromToken,
        toToken: request.toToken,
        fromAmount: request.fromAmount,
        toAmount: this.convertFromWei(quoteAmount, request.toToken.decimals),
        estimatedGas: response.estimatedGas || '150000',
        gasPrice: response.gasPrice || '20000000000',
        protocols: response.protocols || [],
        estimatedSlippage: 0.5, // Default 0.5%
        estimatedTime: 30, // Default 30 seconds
      };
    } catch (error) {
      console.error('Error getting swap quote:', error);
      throw new Error('Không thể lấy báo giá swap');
    }
  }

  async checkAllowance(tokenAddress: string, ownerAddress: string): Promise<string> {
    try {
      console.log('🔍 Checking allowance for token:', tokenAddress);
      
      const params = {
        tokenAddress,
        walletAddress: ownerAddress
      };
      
      // Sử dụng endpoint APPROVE từ config và thêm /allowance
      const baseEndpoint = this.endpoints.APPROVE.replace('{chainId}', this.chainId.toString());
      const url = baseEndpoint.replace('/transaction', '/allowance');
      
      const response = await this.makeRequest(url, params);
      console.log('✅ Allowance check result:', response.allowance);
      
      return response.allowance || '0';
    } catch (error) {
      console.error('❌ Error checking allowance:', error);
      return '0';
    }
  }

  async buildApproveTransaction(tokenAddress: string, amount?: string): Promise<SwapTransaction> {
    try {
      console.log('🔐 Building approve transaction for token:', tokenAddress);
      
      const params: any = {
        tokenAddress
      };
      
      // If amount is specified, use it; otherwise approve infinite
      if (amount) {
        params.amount = amount;
      }
      
      // Sử dụng endpoint từ config
      const endpoint = this.endpoints.APPROVE.replace('{chainId}', this.chainId.toString());
      const response = await this.makeRequest(endpoint, params);
      console.log('✅ Approve transaction built successfully');
      
      return {
        to: response.to,
        data: response.data,
        value: response.value || '0',
        gas: response.gas,
        gasPrice: response.gasPrice
      };
    } catch (error) {
      console.error('❌ Error building approve transaction:', error);
      throw error;
    }
  }

  async buildSwapTransaction(swapRequest: SwapRequest): Promise<SwapTransaction> {
    const { fromToken, toToken, fromAmount, fromAddress, slippage } = swapRequest;
    
    console.log('🔄 Building swap transaction with params:', {
      fromToken: fromToken.symbol,
      toToken: toToken.symbol,
      fromAmount,
      fromAddress,
      slippage
    });

    const amountWei = this.convertToWei(fromAmount, fromToken.decimals);
    console.log(`💰 Amount in wei: ${amountWei}`);

    // Kiểm tra allowance trước khi swap để đảm bảo có quyền chi tiêu token
    const allowance = await this.checkAllowance(fromToken.address, fromAddress);
    console.log(`🔓 Current allowance: ${allowance}`);
    
    // So sánh số allowance với số lượng cần swap bằng số nguyên
    try {
      // Đảm bảo cả hai giá trị là string và dọn dẹp nếu cần
      const allowanceStr = allowance.toString().trim();
      const amountWeiStr = amountWei.toString().trim();
      
      // Log để debug
      console.log(`🔍 Comparing allowance (${allowanceStr}) with amount (${amountWeiStr})`);
      
      // Kiểm tra allowance
      if (allowanceStr === '0' || BigInt(allowanceStr) < BigInt(amountWeiStr)) {
        console.warn(`⚠️ Allowance ${allowanceStr} thấp hơn số lượng cần swap ${amountWeiStr}`);
        console.warn('⚠️ Cần phê duyệt chi tiêu token trước khi swap');
        throw new Error(`Không đủ quyền chi tiêu token. Hãy phê duyệt trước.`);
      }
    } catch (error) {
      // Nếu có lỗi BigInt conversion, xử lý an toàn
      console.error('Error comparing allowance with amount:', error);
      throw new Error(`Không thể kiểm tra quyền chi tiêu token. Hãy phê duyệt trước.`);
    }

    // Sử dụng API swap tiêu chuẩn của 1inch
    try {
      // Tham số cho 1inch Swap API
      const standardSwapParams = {
        src: fromToken.address,
        dst: toToken.address,
        amount: amountWei,
        from: fromAddress,
        slippage: slippage.toString(),
        // Các tham số thêm theo tài liệu 1inch API v6.0
        receiver: fromAddress, // địa chỉ nhận token, mặc định là người gửi
        disableEstimate: 'false',
        includeTokensInfo: 'true',
        includeProtocols: 'true',
        includeGas: 'true'
      };
      
      const endpoint = this.endpoints.SWAP.replace('{chainId}', this.chainId.toString());
      console.log('💧 Using standard 1inch Swap API (requires BNB for gas)');
      console.log('🌐 Using endpoint:', `${this.baseUrl}${endpoint}`);
      console.log('🔍 API parameters:', standardSwapParams);
      
      const response = await this.makeRequest(endpoint, standardSwapParams);
      console.log('✅ Standard swap transaction built successfully');
      console.log('🔥 Response debug:', JSON.stringify(response, null, 2));
      
      return {
        to: response.tx.to,
        data: response.tx.data,
        value: response.tx.value || '0',
        gas: response.tx.gas || '0',
        gasPrice: response.tx.gasPrice || '0'
      };
    } catch (error) {
      console.error('❌ Error building swap transaction:', error);
      throw error;
    }
  }

  async getSpenderAddress(): Promise<string> {
    try {
      const response = await this.makeRequest(`/swap/v6.0/${this.chainId}/approve/spender`);
      return response.address;
    } catch (error) {
      console.error('Error getting spender address:', error);
      throw new Error('Không thể lấy địa chỉ spender');
    }
  }


}
