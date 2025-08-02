import { WalletEntity } from '../../domain/entities/wallet_entity';

export abstract class WalletOnboardingState {}

export class WalletOnboardingInitial extends WalletOnboardingState {}

export class WalletOnboardingLoading extends WalletOnboardingState {}

export class WalletExistsState extends WalletOnboardingState {
  constructor(public readonly wallet: WalletEntity) {
    super();
  }
}

export class WalletNotExistsState extends WalletOnboardingState {}

export class WalletCreatedState extends WalletOnboardingState {
  constructor(
    public readonly wallet: WalletEntity,
    public readonly mnemonic: string
  ) {
    super();
  }
}

export class WalletImportedState extends WalletOnboardingState {
  constructor(public readonly wallet: WalletEntity) {
    super();
  }
}

export class WalletOnboardingError extends WalletOnboardingState {
  constructor(public readonly message: string) {
    super();
  }
}
