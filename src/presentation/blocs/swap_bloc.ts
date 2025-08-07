import { SwapEvent, LoadSupportedTokensEvent, SearchTokensEvent, SelectSwapTypeEvent, SelectFromTokenEvent, SelectToTokenEvent, UpdateFromAmountEvent, UpdateToAmountEvent, GetSwapQuoteEvent, CheckTokenAllowanceEvent, ApproveTokenEvent, ConfirmSwapEvent, RefreshTokenBalancesEvent, ResetSwapEvent } from './swap_event';
import { SwapState, SwapInitialState, SwapLoadingState, SwapErrorState, TokensLoadedState, SwapConfiguredState, QuoteLoadingState, QuoteLoadedState, ApprovalRequiredState, ApprovingTokenState, TokenApprovedState, SwappingState, SwapSuccessState, SwapFailedState } from './swap_state';
import { TokenInfo, SwapType, SwapRequest } from '../../domain/entities/swap_entity';
import { GlobalTokenService } from '../../services/GlobalTokenService';
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
  
  // Quote and allowance state
  private currentQuote: any = null;
  private needsApproval: boolean = false;
  private allowanceAmount: string = '0';

  // DAI token info (default for swaps)
  private readonly DAI_TOKEN: TokenInfo = {
    address: '0x1AF3F329e8BE154074D8769D1FFa4eE058B1DBc3',
    symbol: 'DAI',
    name: 'Dai Stablecoin',
    decimals: 18,
    logoURI: 'https://tokens.1inch.io/0x6b175474e89094c44da98b954eedeac495271d0f.png',
  };
  
  // 1inch router address for BSC
  private readonly ROUTER_ADDRESS: string = '0x111111125421ca6dc452d289314280a0f8842a65';

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
  
  // Helper method to emit current state with specified type
  private emitCurrentState(stateType: string): void {
    switch (stateType) {
      case 'loading':
        this.emit(new SwapLoadingState('Đang xử lý...'));
        break;
      case 'configured':
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
        break;
      case 'quoteLoaded':
        this.emit(new QuoteLoadedState(
          this.swapType,
          this.fromToken,
          this.toToken,
          this.fromAmount,
          this.toAmount,
          this.currentQuote,
          this.supportedTokens,
          this.filteredTokens,
          this.needsApproval,
          this.allowanceAmount
        ));
        break;
      default:
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
  
  // Helper to check wallet and get private key
  private async getWalletAndPrivateKey(): Promise<{wallet: any, privateKey: string}> {
    const wallet = await this.getCurrentWalletUseCase.execute();
    if (!wallet) {
      throw new Error('Không tìm thấy ví');
    }
    
    // Get wallet credentials to sign transaction
    const credentials = await this.getWalletCredentialsUseCase.execute(wallet.id);
    if (!credentials || !credentials.privateKey) {
      throw new Error('Không thể lấy private key từ ví');
    }
    
    return { wallet, privateKey: credentials.privateKey };
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

      // Tải số dư của các token để hiển thị trong tab bán
      await this.loadTokenBalances();

      this.emit(new TokensLoadedState(this.supportedTokens, this.filteredTokens, this.searchQuery));
    } catch (error) {
      this.emit(new SwapErrorState('Không thể tải danh sách token'));
    }
  }

  // Import GlobalTokenService nếu chưa có
  private globalTokenService = GlobalTokenService.getInstance();
  
  private async loadTokenBalances(): Promise<void> {
    try {
      const wallet = await this.getCurrentWalletUseCase.execute();
      if (!wallet) return;

      console.log('🔍 Tải số dư token cho ví:', wallet.address);
      
      // Sử dụng GlobalTokenService để lấy số dư token từ cache hoặc API
      console.log('💾 Đang lấy số dư token từ GlobalTokenService...');
      const walletBalance = await this.globalTokenService.getWalletBalance(false);
      
      if (!walletBalance) {
        console.error('❌ Không thể lấy số dư token từ GlobalTokenService');
        return;
      }
      
      console.log(`📊 Đã nhận được số dư cho ${walletBalance.tokens.length} token từ GlobalTokenService`);
      
      // Cập nhật số dư cho các token trong danh sách của SwapBloc
      this.supportedTokens = this.supportedTokens.map(token => {
        // Tìm token tương ứng trong kết quả từ GlobalTokenService
        const matchedToken = walletBalance.tokens.find(
          t => t.address.toLowerCase() === token.address.toLowerCase()
        );
        
        // Nếu tìm thấy token và có số dư, cập nhật số dư
        if (matchedToken && matchedToken.balance) {
          console.log(`💰 Token ${token.symbol} số dư:`, matchedToken.balance);
          return { ...token, balance: matchedToken.balance };
        }
        
        return token;
      });

      this.filteredTokens = this.supportedTokens;
      
      // Log số token có số dư lớn hơn 0
      const tokensWithPositiveBalance = this.supportedTokens.filter(token => {
        const balance = parseFloat(token.balance || '0');
        return balance > 0;
      });
      
      console.log(`📈 Tìm thấy ${tokensWithPositiveBalance.length} token có số dư > 0`);
      if (tokensWithPositiveBalance.length > 0) {
        console.log('Các token có số dư:', tokensWithPositiveBalance.map(t => `${t.symbol}: ${t.balance}`));
      }
    } catch (error) {
      console.error('❌ Error loading token balances:', error);
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
      this.fromToken = this.DAI_TOKEN;
      this.toToken = null;
    } else {
      this.fromToken = null;
      this.toToken = this.DAI_TOKEN;
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
    // Đánh dấu đang tải quote
    this.emitCurrentState('loading');

    try {
      // Lưu lại thông tin request để sử dụng sau này
      this.fromToken = event.request.fromToken;
      this.toToken = event.request.toToken;
      this.fromAmount = event.request.fromAmount;
      
      // Lấy báo giá swap
      console.log('🔄 Lấy báo giá swap:', {
        from: event.request.fromToken.symbol,
        to: event.request.toToken.symbol,
        amount: event.request.fromAmount
      });
      
      const quote = await this.getSwapQuoteUseCase.execute(event.request);
      this.currentQuote = quote;
      this.toAmount = quote.toAmount;
      
      // Kiểm tra nhanh gọn nếu cần approve
      await this.checkTokenAllowance(
        event.request.fromToken.address,
        event.request.fromAddress,
        event.request.fromAmount
      );
      
      // Cập nhật state với quote mới
      this.emitCurrentState('quoteLoaded');
      
    } catch (error) {
      console.error('❌ Lỗi khi lấy báo giá swap:', error);
      this.emit(new SwapErrorState(error instanceof Error ? error.message : 'Không thể lấy báo giá'));
    }
  }
  
  // Hàm helper để kiểm tra allowance
  private async checkTokenAllowance(
    tokenAddress: string,
    ownerAddress: string,
    amount: string
  ): Promise<void> {
    // Skip với ETH/BNB native
    if (tokenAddress.toLowerCase() === '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee') {
      this.needsApproval = false;
      this.allowanceAmount = '0';
      return;
    }
    
    try {
      // Lấy allowance hiện tại
      this.allowanceAmount = await this.checkTokenAllowanceUseCase.execute(
        tokenAddress,
        ownerAddress,
        this.ROUTER_ADDRESS
      );
      
      // So sánh với số lượng cần swap
      this.needsApproval = parseFloat(this.allowanceAmount) < parseFloat(amount);
      
      console.log(`🔍 Token ${tokenAddress} allowance check:`, {
        allowance: this.allowanceAmount,
        required: amount,
        needsApproval: this.needsApproval
      });
      
    } catch (error) {
      console.error('❌ Lỗi kiểm tra allowance:', error);
      // Nếu có lỗi, giả định cần approve
      this.needsApproval = true;
      this.allowanceAmount = '0';
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
    // Lấy thông tin token để approve
    const token = this.supportedTokens.find(t => t.address.toLowerCase() === event.tokenAddress.toLowerCase());
    if (!token) {
      console.error('❌ Không tìm thấy token cần approve:', event.tokenAddress);
      return;
    }

    // Thông báo đang approve
    this.emit(new ApprovingTokenState(token.symbol, event.amount));
    console.log(`🔐 Đang approve ${token.symbol}:`, {
      tokenAddress: event.tokenAddress,
      spenderAddress: event.spenderAddress,
      amount: event.amount
    });

    try {
      // Lấy ví và private key
      const { wallet, privateKey } = await this.getWalletAndPrivateKey();
      
      // Thực hiện approve token
      const result = await this.approveTokenUseCase.execute(
        event.tokenAddress,
        event.spenderAddress,
        event.amount,
        event.ownerAddress,
        privateKey
      );
      
      console.log('✅ Approve thành công:', result.transactionHash);

      // Thông báo approve thành công
      this.emit(new TokenApprovedState(result.transactionHash, token.symbol));
      
      // Đợi một chút để blockchain cập nhật
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Kiểm tra lại allowance
      await this.checkTokenAllowance(
        event.tokenAddress,
        event.ownerAddress,
        this.fromAmount
      );
      
      // Nếu từ token và to token đã được thiết lập, lấy lại quote
      if (this.fromToken && this.toToken && this.fromAmount) {
        try {
          // Lấy lại báo giá sau khi approve
          const quote = await this.getSwapQuoteUseCase.execute({
            fromToken: this.fromToken,
            toToken: this.toToken,
            fromAmount: this.fromAmount,
            fromAddress: event.ownerAddress,
            slippage: 1
          });
          
          // Cập nhật quote mới
          this.currentQuote = quote;
          this.toAmount = quote.toAmount;
          
          // Emit state với thông tin mới
          this.emitCurrentState('quoteLoaded');
        } catch (error) {
          console.error('❌ Lỗi khi lấy lại báo giá sau approve:', error);
          // Nếu lỗi khi lấy lại báo giá, vẫn cập nhật trạng thái
          this.emitCurrentState('configured');
        }
      }
    } catch (error) {
      console.error('❌ Lỗi khi approve token:', error);
      this.emit(new SwapFailedState(
        error instanceof Error ? error.message : 'Không thể approve token',
        token.symbol
      ));
    }
  }

  private async handleConfirmSwap(event: ConfirmSwapEvent): Promise<void> {
    // Lấy thông tin token swap
    const fromToken = event.request.fromToken;
    const toToken = event.request.toToken;
    
    // Thông báo đang swap
    this.emit(new SwappingState(
      fromToken.symbol,
      toToken.symbol,
      event.request.fromAmount
    ));

    try {
      // 1. Kiểm tra lại allowance nếu cần
      if (fromToken.address.toLowerCase() !== '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee') {
        await this.checkTokenAllowance(
          fromToken.address,
          event.request.fromAddress,
          event.request.fromAmount
        );
        
        // Nếu cần approve, thông báo và dừng lại
        if (this.needsApproval) {
          throw new Error(`Cần approve ${fromToken.symbol} trước khi swap. Vui lòng nhấn nút Approve.`);
        }
      }
      
      // 2. Lấy private key để ký giao dịch
      const { privateKey } = await this.getWalletAndPrivateKey();

      // 3. Thực hiện swap
      console.log('🔄 Bắt đầu thực hiện swap...', {
        from: `${event.request.fromAmount} ${fromToken.symbol}`,
        to: `${this.toAmount} ${toToken.symbol}`
      });
      
      const result = await this.performSwapUseCase.execute(event.request, privateKey);
      console.log('✅ Swap thành công:', result);

      // 4. Thông báo swap thành công
      this.emit(new SwapSuccessState(
        result,
        fromToken.symbol,
        toToken.symbol,
        event.request.fromAmount,
        this.toAmount
      ));
    } catch (error) {
      console.error('❌ Lỗi khi swap:', error);
      
      // Phân tích lỗi để thông báo rõ ràng hơn
      let errorMessage = error instanceof Error ? error.message : 'Giao dịch swap thất bại';
      
      // Kiểm tra các lỗi phổ biến
      if (errorMessage.includes('insufficient funds')) {
        errorMessage = `Không đủ số dư ${fromToken.symbol} để thực hiện swap`;
      } else if (errorMessage.includes('slippage')) {
        errorMessage = 'Slippage quá cao, giá đã thay đổi. Vui lòng thử lại';
      }
      
      this.emit(new SwapFailedState(
        errorMessage,
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
    // Reset tất cả state về mặc định
    this.swapType = SwapType.BUY;
    this.fromToken = this.DAI_TOKEN;
    this.toToken = null;
    this.fromAmount = '';
    this.toAmount = '';
    this.searchQuery = '';
    this.filteredTokens = this.supportedTokens;
    
    // Reset thông tin quote và allowance
    this.currentQuote = null;
    this.needsApproval = false;
    this.allowanceAmount = '0';

    // Emit trạng thái mặc định
    this.emitCurrentState('configured');
    console.log('♻️ Đã reset trạng thái swap');
  }
}
