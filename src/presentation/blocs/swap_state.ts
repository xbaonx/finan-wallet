import { TokenInfo, SwapQuote, SwapResult, SwapType } from '../../domain/entities/swap_entity';

export abstract class SwapState {}

export class SwapInitialState extends SwapState {}

export class SwapLoadingState extends SwapState {
  constructor(public message?: string) {
    super();
  }
}

export class SwapErrorState extends SwapState {
  constructor(public error: string) {
    super();
  }
}

export class TokensLoadedState extends SwapState {
  constructor(
    public supportedTokens: TokenInfo[],
    public filteredTokens: TokenInfo[],
    public searchQuery: string = ''
  ) {
    super();
  }
}

export class SwapConfiguredState extends SwapState {
  constructor(
    public swapType: SwapType,
    public fromToken: TokenInfo | null,
    public toToken: TokenInfo | null,
    public fromAmount: string,
    public toAmount: string,
    public supportedTokens: TokenInfo[],
    public filteredTokens: TokenInfo[],
    public searchQuery: string = ''
  ) {
    super();
  }
}

export class QuoteLoadingState extends SwapState {
  constructor(
    public swapType: SwapType,
    public fromToken: TokenInfo | null,
    public toToken: TokenInfo | null,
    public fromAmount: string,
    public toAmount: string,
    public supportedTokens: TokenInfo[],
    public filteredTokens: TokenInfo[]
  ) {
    super();
  }
}

export class QuoteLoadedState extends SwapState {
  constructor(
    public swapType: SwapType,
    public fromToken: TokenInfo | null,
    public toToken: TokenInfo | null,
    public fromAmount: string,
    public toAmount: string,
    public quote: SwapQuote,
    public supportedTokens: TokenInfo[],
    public filteredTokens: TokenInfo[],
    public needsApproval: boolean = false,
    public allowanceAmount: string = '0'
  ) {
    super();
  }
}

export class ApprovalRequiredState extends SwapState {
  constructor(
    public swapType: SwapType,
    public fromToken: TokenInfo | null,
    public toToken: TokenInfo | null,
    public fromAmount: string,
    public toAmount: string,
    public quote: SwapQuote,
    public supportedTokens: TokenInfo[],
    public filteredTokens: TokenInfo[],
    public spenderAddress: string,
    public currentAllowance: string
  ) {
    super();
  }
}

export class ApprovingTokenState extends SwapState {
  constructor(
    public tokenSymbol: string,
    public amount: string
  ) {
    super();
  }
}

export class TokenApprovedState extends SwapState {
  constructor(
    public transactionHash: string,
    public tokenSymbol: string
  ) {
    super();
  }
}

export class SwappingState extends SwapState {
  constructor(
    public fromTokenSymbol: string,
    public toTokenSymbol: string,
    public fromAmount: string
  ) {
    super();
  }
}

export class SwapSuccessState extends SwapState {
  constructor(
    public result: SwapResult,
    public fromTokenSymbol: string,
    public toTokenSymbol: string,
    public fromAmount: string,
    public toAmount: string
  ) {
    super();
  }
}

export class SwapFailedState extends SwapState {
  constructor(
    public error: string,
    public fromTokenSymbol?: string,
    public toTokenSymbol?: string
  ) {
    super();
  }
}
