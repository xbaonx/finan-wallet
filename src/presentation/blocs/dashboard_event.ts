export abstract class DashboardEvent {}

export class LoadDashboardEvent extends DashboardEvent {}

export class RefreshDashboardEvent extends DashboardEvent {}

export class LoadWalletEvent extends DashboardEvent {}

export class LoadTokenListEvent extends DashboardEvent {}

export class LoadTotalBalanceEvent extends DashboardEvent {}
