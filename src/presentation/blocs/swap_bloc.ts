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
    address: '0xdac17f958d2ee523a2206206994597c13d831ec7',
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
    private getCurrentWalletUseCase: GetCurrentWalletUseCase
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
        // Get 1inch spender address (this would need to be implemented)
        const spenderAddress = '0x1111111254eeb25477b68fb85ed929f73a960582'; // 1inch v5 router
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
    const token = this.fromToken;
    if (!token) return;

    this.emit(new ApprovingTokenState(token.symbol, event.amount));

    try {
      const wallet = await this.getCurrentWalletUseCase.execute();
      if (!wallet) throw new Error('Không tìm thấy ví');

      // Get wallet credentials to sign transaction
      // This would need to be implemented to get private key securely
      const privateKey = 'WALLET_PRIVATE_KEY'; // This should be retrieved securely

      const result = await this.approveTokenUseCase.execute(
        event.tokenAddress,
        event.spenderAddress,
        event.amount,
        event.ownerAddress,
        privateKey
      );

      this.emit(new TokenApprovedState(result.transactionHash, token.symbol));
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
      // This would need to be implemented to get private key securely
      const privateKey = 'WALLET_PRIVATE_KEY'; // This should be retrieved securely

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
