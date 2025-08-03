import { TokenInfo, SwapQuote, SwapRequest, SwapTransaction } from '../../domain/entities/swap_entity';
import { ethers } from 'ethers';

export class OneInchApiService {
  private readonly baseUrl = 'https://api.1inch.dev';
  private readonly apiKey: string;
  private readonly chainId = 1; // Ethereum mainnet
  private readonly maxRetries = 3;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  private convertToWei(amount: string, decimals: number): string {
    try {
      // Parse amount as float and convert to wei
      const amountFloat = parseFloat(amount);
      if (isNaN(amountFloat)) {
        throw new Error('Invalid amount');
      }
      
      // Convert to wei using ethers parseUnits
      return ethers.parseUnits(amount, decimals).toString();
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
      
      // Convert from wei using ethers formatUnits
      const result = ethers.formatUnits(amountWei, decimals);
      
      // Debug logging for small amounts
      console.log('🔢 convertFromWei Debug:');
      console.log('Input amountWei:', amountWei);
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
      const response = await this.makeRequest(`/swap/v6.0/${this.chainId}/tokens`);
      
      return Object.values(response.tokens).map((token: any) => ({
        address: token.address,
        symbol: token.symbol,
        name: token.name,
        decimals: token.decimals,
        logoURI: token.logoURI,
      }));
    } catch (error) {
      console.error('Error fetching supported tokens:', error);
      throw new Error('Không thể lấy danh sách token hỗ trợ');
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

      // Use the correct 1inch API v6 endpoint
      const response = await this.makeRequest(`/swap/v6.0/${this.chainId}/quote`, params);

      // Debug quote response
      console.log('🎯 1inch Quote API Response:');
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

  async buildSwapTransaction(request: SwapRequest): Promise<SwapTransaction> {
    try {
      const fromAmountWei = this.convertToWei(request.fromAmount, request.fromToken.decimals);
      
      const params = {
        src: request.fromToken.address,
        dst: request.toToken.address,
        amount: fromAmountWei,
        from: request.fromAddress,
        slippage: request.slippage || 1,
        disableEstimate: request.disableEstimate || false,
      };

      const response = await this.makeRequest(`/swap/v6.0/${this.chainId}/swap`, params);

      return {
        to: response.tx.to,
        data: response.tx.data,
        value: response.tx.value || '0',
        gas: response.tx.gas || response.tx.gasLimit || '150000',
        gasPrice: response.tx.gasPrice || '20000000000',
      };
    } catch (error) {
      console.error('Error building swap transaction:', error);
      throw new Error('Không thể tạo giao dịch swap');
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

  async buildApproveTransaction(
    tokenAddress: string,
    amount: string
  ): Promise<SwapTransaction> {
    try {
      const params = {
        tokenAddress,
        amount,
      };

      const response = await this.makeRequest(`/swap/v6.0/${this.chainId}/approve/transaction`, params);

      return {
        to: response.to,
        data: response.data,
        value: response.value || '0',
        gas: response.gasLimit,
        gasPrice: response.gasPrice,
      };
    } catch (error) {
      console.error('Error building approve transaction:', error);
      throw new Error('Không thể tạo giao dịch approve');
    }
  }
}
