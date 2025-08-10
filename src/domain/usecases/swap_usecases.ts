import { TokenInfo, SwapQuote, SwapRequest, SwapResult, SwapTransaction } from '../entities/swap_entity';
import { SwapRepository } from '../repositories/swap_repository';

export class GetSupportedTokensUseCase {
  constructor(private swapRepository: SwapRepository) {}

  async execute(): Promise<TokenInfo[]> {
    return await this.swapRepository.getSupportedTokens();
  }
}

export class GetTokenBalanceUseCase {
  constructor(private swapRepository: SwapRepository) {}

  async execute(tokenAddress: string, walletAddress: string): Promise<string> {
    return await this.swapRepository.getTokenBalance(tokenAddress, walletAddress);
  }
}

export class GetTokenPriceUseCase {
  constructor(private swapRepository: SwapRepository) {}

  async execute(tokenAddress: string): Promise<{ price: number; priceChange24h: number }> {
    return await this.swapRepository.getTokenPrice(tokenAddress);
  }
}

export class GetSwapQuoteUseCase {
  constructor(private swapRepository: SwapRepository) {}

  async execute(request: SwapRequest, platformFeePercentage?: number): Promise<SwapQuote> {
    // Validate request
    if (!request.fromToken || !request.toToken) {
      throw new Error('Tokens không hợp lệ');
    }
    
    if (!request.fromAmount || parseFloat(request.fromAmount) <= 0) {
      throw new Error('Số lượng không hợp lệ');
    }
    
    if (request.fromToken.address === request.toToken.address) {
      throw new Error('Không thể swap cùng một token');
    }

    return await this.swapRepository.getSwapQuote(request, platformFeePercentage);
  }
}

export class CheckTokenAllowanceUseCase {
  constructor(private swapRepository: SwapRepository) {}

  async execute(tokenAddress: string, ownerAddress: string, spenderAddress: string): Promise<string> {
    return await this.swapRepository.checkAllowance(tokenAddress, ownerAddress, spenderAddress);
  }
}

export class ApproveTokenUseCase {
  constructor(private swapRepository: SwapRepository) {}

  async execute(
    tokenAddress: string, 
    spenderAddress: string, 
    amount: string, 
    ownerAddress: string,
    privateKey: string
  ): Promise<SwapResult> {
    const transaction = await this.swapRepository.buildApproveTransaction(
      tokenAddress, 
      spenderAddress, 
      amount, 
      ownerAddress
    );
    
    return await this.swapRepository.executeSwap(transaction, privateKey);
  }
}

export class PerformSwapUseCase {
  constructor(private swapRepository: SwapRepository) {}

  async execute(request: SwapRequest, privateKey: string, platformFeePercentage?: number): Promise<SwapResult> {
    // Validate request
    if (!request.fromToken || !request.toToken) {
      throw new Error('Tokens không hợp lệ');
    }
    
    if (!request.fromAmount || parseFloat(request.fromAmount) <= 0) {
      throw new Error('Số lượng không hợp lệ');
    }
    
    if (request.fromToken.address === request.toToken.address) {
      throw new Error('Không thể swap cùng một token');
    }

    // Build transaction
    const transaction = await this.swapRepository.buildSwapTransaction(request, platformFeePercentage);
    
    // Execute swap
    return await this.swapRepository.executeSwap(transaction, privateKey);
  }
}

export class GetTransactionStatusUseCase {
  constructor(private swapRepository: SwapRepository) {}

  async execute(transactionHash: string): Promise<'pending' | 'success' | 'failed'> {
    return await this.swapRepository.getTransactionStatus(transactionHash);
  }
}
