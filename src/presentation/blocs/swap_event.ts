import { TokenInfo, SwapRequest, SwapType } from '../../domain/entities/swap_entity';

export abstract class SwapEvent {}

export class LoadSupportedTokensEvent extends SwapEvent {}

export class SearchTokensEvent extends SwapEvent {
  constructor(public query: string) {
    super();
  }
}

export class SelectSwapTypeEvent extends SwapEvent {
  constructor(public swapType: SwapType) {
    super();
  }
}

export class SelectFromTokenEvent extends SwapEvent {
  constructor(public token: TokenInfo) {
    super();
  }
}

export class SelectToTokenEvent extends SwapEvent {
  constructor(public token: TokenInfo) {
    super();
  }
}

export class UpdateFromAmountEvent extends SwapEvent {
  constructor(public amount: string) {
    super();
  }
}

export class UpdateToAmountEvent extends SwapEvent {
  constructor(public amount: string) {
    super();
  }
}

export class GetSwapQuoteEvent extends SwapEvent {
  constructor(public request: SwapRequest) {
    super();
  }
}

export class CheckTokenAllowanceEvent extends SwapEvent {
  constructor(
    public tokenAddress: string,
    public ownerAddress: string,
    public spenderAddress: string
  ) {
    super();
  }
}

export class ApproveTokenEvent extends SwapEvent {
  constructor(
    public tokenAddress: string,
    public spenderAddress: string,
    public amount: string,
    public ownerAddress: string
  ) {
    super();
  }
}

export class ConfirmSwapEvent extends SwapEvent {
  constructor(public request: SwapRequest) {
    super();
  }
}

export class RefreshTokenBalancesEvent extends SwapEvent {
  constructor(public walletAddress: string) {
    super();
  }
}

export class ResetSwapEvent extends SwapEvent {}
