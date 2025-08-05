import { SwapEvent, LoadSupportedTokensEvent, SearchTokensEvent, SelectSwapTypeEvent, SelectFromTokenEvent, SelectToTokenEvent, UpdateFromAmountEvent, UpdateToAmountEvent, GetSwapQuoteEvent, CheckTokenAllowanceEvent, ApproveTokenEvent, ConfirmSwapEvent, RefreshTokenBalancesEvent, ResetSwapEvent } from './swap_event';
import { SwapState, SwapInitialState, SwapLoadingState, SwapErrorState, TokensLoadedState, SwapConfiguredState, QuoteLoadingState, QuoteLoadedState, ApprovalRequiredState, ApprovingTokenState, TokenApprovedState, SwappingState, SwapSuccessState, SwapFailedState } from './swap_state';
import { TokenInfo, SwapType, SwapRequest } from '../../domain/entities/swap_entity';
import { 
  GetSupportedTokensUseCase, 
  GetTokenBalanceUseCase, 
  GetTokenPriceUseCase, 
  GetSwapQuoteUseCase, 
  CheckTokenAllowanceUseCase, 
  ApproveTokenUseCase, 
  PerformSwapUseCase 
} from '../../domain/usecases/swap_usecases';
import { GetCurrentWalletUseCase } from '../../domain/usecases/dashboard_usecases';
import { GetWalletCredentialsUseCase } from '../../domain/usecases/wallet_usecases';

export class SwapBloc {
  private state: SwapState = new SwapInitialState();
  private listeners: ((state: SwapState) => void)[] = [];

  // Current swap configuration
  private swapType: SwapType = SwapType.BUY;
  private fromToken: TokenInfo | null = null;
  private toToken: TokenInfo | null = null;
  private fromAmount: string = '';
  private toAmount: string = '';
  private supportedTokens: TokenInfo[] = [];
  private filteredTokens: TokenInfo[] = [];
  private searchQuery: string = '';

  // USDT token info (default for swaps)
  private readonly USDT_TOKEN: TokenInfo = {
    address: '0x55d398326f99059fF775485246999027B3197955',
    symbol: 'USDT',
    name: 'Tether USD',
    decimals: 6,
    logoURI: 'https://tokens.1inch.io/0xdac17f958d2ee523a2206206994597c13d831ec7.png',
  };

  constructor(
    private getSupportedTokensUseCase: GetSupportedTokensUseCase,
    private getTokenBalanceUseCase: GetTokenBalanceUseCase,
    private getTokenPriceUseCase: GetTokenPriceUseCase,
    private getSwapQuoteUseCase: GetSwapQuoteUseCase,
    private checkTokenAllowanceUseCase: CheckTokenAllowanceUseCase,
    private approveTokenUseCase: ApproveTokenUseCase,
    private performSwapUseCase: PerformSwapUseCase,
    private getCurrentWalletUseCase: GetCurrentWalletUseCase,
    private getWalletCredentialsUseCase: GetWalletCredentialsUseCase
  ) {}

  addListener(listener: (state: SwapState) => void): void {
    this.listeners.push(listener);
  }

  removeListener(listener: (state: SwapState) => void): void {
    this.listeners = this.listeners.filter(l => l !== listener);
  }

  private emit(state: SwapState): void {
    this.state = state;
    this.listeners.forEach(listener => listener(state));
  }

  getState(): SwapState {
    return this.state;
  }

  async add(event: SwapEvent): Promise<void> {
    try {
      if (event instanceof LoadSupportedTokensEvent) {
        await this.handleLoadSupportedTokens();
      } else if (event instanceof SearchTokensEvent) {
        this.handleSearchTokens(event);
      } else if (event instanceof SelectSwapTypeEvent) {
        this.handleSelectSwapType(event);
      } else if (event instanceof SelectFromTokenEvent) {
        this.handleSelectFromToken(event);
      } else if (event instanceof SelectToTokenEvent) {
        this.handleSelectToToken(event);
      } else if (event instanceof UpdateFromAmountEvent) {
        this.handleUpdateFromAmount(event);
      } else if (event instanceof UpdateToAmountEvent) {
        this.handleUpdateToAmount(event);
      } else if (event instanceof GetSwapQuoteEvent) {
        await this.handleGetSwapQuote(event);
      } else if (event instanceof CheckTokenAllowanceEvent) {
        await this.handleCheckTokenAllowance(event);
      } else if (event instanceof ApproveTokenEvent) {
        await this.handleApproveToken(event);
      } else if (event instanceof ConfirmSwapEvent) {
        await this.handleConfirmSwap(event);
      } else if (event instanceof RefreshTokenBalancesEvent) {
        await this.handleRefreshTokenBalances(event);
      } else if (event instanceof ResetSwapEvent) {
        this.handleReset();
      }
    } catch (error) {
      console.error('SwapBloc error:', error);
      this.emit(new SwapErrorState(error instanceof Error ? error.message : 'Đã xảy ra lỗi không xác định'));
    }
  }

  private async handleLoadSupportedTokens(): Promise<void> {
    this.emit(new SwapLoadingState('Đang tải danh sách token...'));

    try {
      const tokens = await this.getSupportedTokensUseCase.execute();
      this.supportedTokens = tokens;
      this.filteredTokens = tokens;

      // Tạm thời tắt auto load balance để tránh rate limit
      // Balance sẽ được load khi user chọn token cụ thể
      // await this.loadTokenBalances();

      this.emit(new TokensLoadedState(this.supportedTokens, this.filteredTokens, this.searchQuery));
    } catch (error) {
      this.emit(new SwapErrorState('Không thể tải danh sách token'));
    }
  }

  private async loadTokenBalances(): Promise<void> {
    try {
      const wallet = await this.getCurrentWalletUseCase.execute();
      if (!wallet) return;

      // Load balances for only top 5 tokens to avoid RPC batch limit
      const topTokens = this.supportedTokens.slice(0, 5);
      
      // Process tokens sequentially to avoid batch limit
      const tokensWithBalance: TokenInfo[] = [];
      
      for (const token of topTokens) {
        try {
          const balance = await this.getTokenBalanceUseCase.execute(token.address, wallet.address);
          tokensWithBalance.push({ ...token, balance });
          
          // Add small delay between requests to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 200));
        } catch (error) {
          console.error(`Error loading balance for ${token.symbol}:`, error);
          tokensWithBalance.push(token);
        }
      }

      // Update tokens with balances
      this.supportedTokens = this.supportedTokens.map(token => {
        const tokenWithBalance = tokensWithBalance.find(t => t.address === token.address);
        return tokenWithBalance || token;
      });

      this.filteredTokens = this.supportedTokens;
    } catch (error) {
      console.error('Error loading token balances:', error);
    }
  }

  private handleSearchTokens(event: SearchTokensEvent): void {
    this.searchQuery = event.query.toLowerCase();
    
    if (this.searchQuery === '') {
      this.filteredTokens = this.supportedTokens;
    } else {
      this.filteredTokens = this.supportedTokens.filter(token =>
        token.name.toLowerCase().includes(this.searchQuery) ||
        token.symbol.toLowerCase().includes(this.searchQuery)
      );
    }

    this.emit(new TokensLoadedState(this.supportedTokens, this.filteredTokens, event.query));
  }

  private handleSelectSwapType(event: SelectSwapTypeEvent): void {
    this.swapType = event.swapType;
    
    // Reset tokens based on swap type
    if (event.swapType === SwapType.BUY) {
      this.fromToken = this.USDT_TOKEN;
      this.toToken = null;
    } else {
      this.fromToken = null;
      this.toToken = this.USDT_TOKEN;
    }
    
    this.fromAmount = '';
    this.toAmount = '';

    this.emit(new SwapConfiguredState(
      this.swapType,
      this.fromToken,
      this.toToken,
      this.fromAmount,
      this.toAmount,
      this.supportedTokens,
      this.filteredTokens,
      this.searchQuery
    ));
  }

  private handleSelectFromToken(event: SelectFromTokenEvent): void {
    this.fromToken = event.token;
    this.fromAmount = '';
    this.toAmount = '';

    this.emit(new SwapConfiguredState(
      this.swapType,
      this.fromToken,
      this.toToken,
      this.fromAmount,
      this.toAmount,
      this.supportedTokens,
      this.filteredTokens,
      this.searchQuery
    ));
  }

  private handleSelectToToken(event: SelectToTokenEvent): void {
    this.toToken = event.token;
    this.fromAmount = '';
    this.toAmount = '';

    this.emit(new SwapConfiguredState(
      this.swapType,
      this.fromToken,
      this.toToken,
      this.fromAmount,
      this.toAmount,
      this.supportedTokens,
      this.filteredTokens,
      this.searchQuery
    ));
  }

  private handleUpdateFromAmount(event: UpdateFromAmountEvent): void {
    this.fromAmount = event.amount;
    this.toAmount = ''; // Reset to amount when from amount changes

    this.emit(new SwapConfiguredState(
      this.swapType,
      this.fromToken,
      this.toToken,
      this.fromAmount,
      this.toAmount,
      this.supportedTokens,
      this.filteredTokens,
      this.searchQuery
    ));
  }

  private handleUpdateToAmount(event: UpdateToAmountEvent): void {
    this.toAmount = event.amount;

    this.emit(new SwapConfiguredState(
      this.swapType,
      this.fromToken,
      this.toToken,
      this.fromAmount,
      this.toAmount,
      this.supportedTokens,
      this.filteredTokens,
      this.searchQuery
    ));
  }

  private async handleGetSwapQuote(event: GetSwapQuoteEvent): Promise<void> {
    this.emit(new QuoteLoadingState(
      this.swapType,
      this.fromToken,
      this.toToken,
      this.fromAmount,
      this.toAmount,
      this.supportedTokens,
      this.filteredTokens
    ));

    try {
      const quote = await this.getSwapQuoteUseCase.execute(event.request);
      
      // Check if approval is needed for ERC-20 tokens
      let needsApproval = false;
      let allowanceAmount = '0';
      
      if (event.request.fromToken.address.toLowerCase() !== '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee') {
        // Get 1inch spender address for BSC
        const spenderAddress = '0x111111125421ca6dc452d289314280a0f8842a65'; // 1inch BSC router
        allowanceAmount = await this.checkTokenAllowanceUseCase.execute(
          event.request.fromToken.address,
          event.request.fromAddress,
          spenderAddress
        );
        
        needsApproval = parseFloat(allowanceAmount) < parseFloat(event.request.fromAmount);
      }

      this.emit(new QuoteLoadedState(
        this.swapType,
        this.fromToken,
        this.toToken,
        this.fromAmount,
        quote.toAmount,
        quote,
        this.supportedTokens,
        this.filteredTokens,
        needsApproval,
        allowanceAmount
      ));
    } catch (error) {
      this.emit(new SwapErrorState(error instanceof Error ? error.message : 'Không thể lấy báo giá'));
    }
  }

  private async handleCheckTokenAllowance(event: CheckTokenAllowanceEvent): Promise<void> {
    try {
      const allowance = await this.checkTokenAllowanceUseCase.execute(
        event.tokenAddress,
        event.ownerAddress,
        event.spenderAddress
      );
      
      // This would update the current state with allowance info
      // Implementation depends on current state structure
    } catch (error) {
      this.emit(new SwapErrorState('Không thể kiểm tra allowance'));
    }
  }

  private async handleApproveToken(event: ApproveTokenEvent): Promise<void> {
    console.log('🚀 handleApproveToken called with:', {
      tokenAddress: event.tokenAddress,
      spenderAddress: event.spenderAddress,
      amount: event.amount,
      ownerAddress: event.ownerAddress
    });
    
    // Get token info from supportedTokens using event.tokenAddress
    const token = this.supportedTokens.find(t => t.address.toLowerCase() === event.tokenAddress.toLowerCase());
    if (!token) {
      console.log('❌ No token found for address:', event.tokenAddress);
      return;
    }

    console.log('✅ Found token for approve:', token.symbol);
    console.log('✅ Emitting ApprovingTokenState for:', token.symbol);
    this.emit(new ApprovingTokenState(token.symbol, event.amount));

    try {
      console.log('📱 Getting current wallet...');
      const wallet = await this.getCurrentWalletUseCase.execute();
      if (!wallet) {
        console.log('❌ No wallet found');
        throw new Error('Không tìm thấy ví');
      }
      console.log('✅ Wallet found:', wallet.address);

      // Get wallet credentials to sign transaction
      console.log('🔐 Getting wallet credentials for approve transaction...');
      const credentials = await this.getWalletCredentialsUseCase.execute(wallet.id);
      if (!credentials || !credentials.privateKey) {
        throw new Error('Không thể lấy private key từ ví');
      }
      
      const privateKey = credentials.privateKey;
      console.log('✅ Successfully retrieved private key for wallet:', wallet.address);

      console.log('📝 Executing real approve transaction...');
      const result = await this.approveTokenUseCase.execute(
        event.tokenAddress,
        event.spenderAddress,
        event.amount,
        event.ownerAddress,
        privateKey
      );
      
      console.log('✅ Real approve transaction success:', result.transactionHash);

      // Emit approve success first
      this.emit(new TokenApprovedState(result.transactionHash, token.symbol));
      
      // Wait a bit for transaction to be processed
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Check allowance again and update state
      const spenderAddress = '0x111111125421ca6dc452d289314280a0f8842a65'; // 1inch BSC router
      const newAllowanceAmount = await this.checkTokenAllowanceUseCase.execute(
        event.tokenAddress,
        event.ownerAddress,
        spenderAddress
      );
      
      // Check if we still need approval
      const needsApproval = parseFloat(newAllowanceAmount) < parseFloat(this.fromAmount);
      
      // Get current quote if available
      if (this.fromToken && this.toToken && this.fromAmount) {
        try {
          const quote = await this.getSwapQuoteUseCase.execute({
            fromToken: this.fromToken,
            toToken: this.toToken,
            fromAmount: this.fromAmount,
            fromAddress: event.ownerAddress,
            slippage: 1
          });
          
          // Emit updated quote state with new allowance info
          this.emit(new QuoteLoadedState(
            this.swapType,
            this.fromToken,
            this.toToken,
            this.fromAmount,
            quote.toAmount,
            quote,
            this.supportedTokens,
            this.filteredTokens,
            needsApproval,
            newAllowanceAmount
          ));
        } catch (error) {
          console.error('Error refreshing quote after approve:', error);
          // If quote fails, still update with allowance info
          this.emit(new SwapConfiguredState(
            this.swapType,
            this.fromToken,
            this.toToken,
            this.fromAmount,
            this.toAmount,
            this.supportedTokens,
            this.filteredTokens,
            this.searchQuery
          ));
        }
      }
    } catch (error) {
      this.emit(new SwapFailedState(
        error instanceof Error ? error.message : 'Không thể approve token',
        token.symbol
      ));
    }
  }

  private async handleConfirmSwap(event: ConfirmSwapEvent): Promise<void> {
    const fromToken = event.request.fromToken;
    const toToken = event.request.toToken;

    this.emit(new SwappingState(
      fromToken.symbol,
      toToken.symbol,
      event.request.fromAmount
    ));

    try {
      const wallet = await this.getCurrentWalletUseCase.execute();
      if (!wallet) throw new Error('Không tìm thấy ví');

      // Get wallet credentials to sign transaction
      // Get wallet credentials to sign transaction
      console.log('🔐 Getting wallet credentials for swap transaction...');
      const credentials = await this.getWalletCredentialsUseCase.execute(wallet.id);
      if (!credentials || !credentials.privateKey) {
        throw new Error('Không thể lấy private key từ ví');
      }
      
      const privateKey = credentials.privateKey;
      console.log('✅ Successfully retrieved private key for wallet:', wallet.address);

      const result = await this.performSwapUseCase.execute(event.request, privateKey);

      this.emit(new SwapSuccessState(
        result,
        fromToken.symbol,
        toToken.symbol,
        event.request.fromAmount,
        this.toAmount
      ));
    } catch (error) {
      this.emit(new SwapFailedState(
        error instanceof Error ? error.message : 'Giao dịch swap thất bại',
        fromToken.symbol,
        toToken.symbol
      ));
    }
  }

  private async handleRefreshTokenBalances(event: RefreshTokenBalancesEvent): Promise<void> {
    await this.loadTokenBalances();
    
    this.emit(new SwapConfiguredState(
      this.swapType,
      this.fromToken,
      this.toToken,
      this.fromAmount,
      this.toAmount,
      this.supportedTokens,
      this.filteredTokens,
      this.searchQuery
    ));
  }

  private handleReset(): void {
    this.swapType = SwapType.BUY;
    this.fromToken = this.USDT_TOKEN;
    this.toToken = null;
    this.fromAmount = '';
    this.toAmount = '';
    this.searchQuery = '';
    this.filteredTokens = this.supportedTokens;

    this.emit(new SwapConfiguredState(
      this.swapType,
      this.fromToken,
      this.toToken,
      this.fromAmount,
      this.toAmount,
      this.supportedTokens,
      this.filteredTokens,
      this.searchQuery
    ));
  }
}
