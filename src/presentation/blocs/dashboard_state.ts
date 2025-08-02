import { WalletEntity } from '../../domain/entities/wallet_entity';
import { WalletBalance } from '../../domain/entities/token_entity';

export abstract class DashboardState {}

export class DashboardInitial extends DashboardState {}

export class DashboardLoading extends DashboardState {}

export class DashboardLoaded extends DashboardState {
  constructor(
    public readonly wallet: WalletEntity,
    public readonly balance: WalletBalance
  ) {
    super();
  }
}

export class DashboardRefreshing extends DashboardState {
  constructor(
    public readonly wallet: WalletEntity,
    public readonly balance: WalletBalance
  ) {
    super();
  }
}

export class DashboardError extends DashboardState {
  constructor(public readonly message: string) {
    super();
  }
}
