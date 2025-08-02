export abstract class WalletOnboardingEvent {}

export class CheckWalletExistsEvent extends WalletOnboardingEvent {}

export class CreateWalletEvent extends WalletOnboardingEvent {
  constructor(public readonly walletName: string) {
    super();
  }
}

export class ImportWalletEvent extends WalletOnboardingEvent {
  constructor(
    public readonly mnemonic: string,
    public readonly walletName: string
  ) {
    super();
  }
}

export class ResetOnboardingEvent extends WalletOnboardingEvent {}
