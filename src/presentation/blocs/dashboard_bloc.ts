import { DashboardEvent, LoadDashboardEvent, RefreshDashboardEvent, LoadWalletEvent, LoadTokenListEvent, LoadTotalBalanceEvent } from './dashboard_event';
import { DashboardState, DashboardInitial, DashboardLoading, DashboardLoaded, DashboardRefreshing, DashboardError } from './dashboard_state';
import { GetWalletBalanceUseCase, GetCurrentWalletUseCase, RefreshWalletDataUseCase } from '../../domain/usecases/dashboard_usecases';

export class DashboardBloc {
  private _state: DashboardState = new DashboardInitial();
  private _listeners: ((state: DashboardState) => void)[] = [];

  constructor(
    private getWalletBalanceUseCase: GetWalletBalanceUseCase,
    private getCurrentWalletUseCase: GetCurrentWalletUseCase,
    private refreshWalletDataUseCase: RefreshWalletDataUseCase
  ) {}

  get state(): DashboardState {
    return this._state;
  }

  addListener(listener: (state: DashboardState) => void): void {
    this._listeners.push(listener);
  }

  removeListener(listener: (state: DashboardState) => void): void {
    const index = this._listeners.indexOf(listener);
    if (index > -1) {
      this._listeners.splice(index, 1);
    }
  }

  private emit(state: DashboardState): void {
    this._state = state;
    this._listeners.forEach(listener => listener(state));
  }

  async add(event: DashboardEvent): Promise<void> {
    if (event instanceof LoadDashboardEvent) {
      await this._handleLoadDashboard();
    } else if (event instanceof RefreshDashboardEvent) {
      await this._handleRefreshDashboard();
    } else if (event instanceof LoadWalletEvent) {
      await this._handleLoadWallet();
    } else if (event instanceof LoadTokenListEvent) {
      await this._handleLoadTokenList();
    } else if (event instanceof LoadTotalBalanceEvent) {
      await this._handleLoadTotalBalance();
    }
  }

  private async _handleLoadDashboard(): Promise<void> {
    try {
      this.emit(new DashboardLoading());
      
      const { wallet, balance } = await this.refreshWalletDataUseCase.execute();
      
      this.emit(new DashboardLoaded(wallet, balance));
    } catch (error) {
      this.emit(new DashboardError(`Lỗi tải dashboard: ${error}`));
    }
  }

  private async _handleRefreshDashboard(): Promise<void> {
    try {
      // If we have existing data, show refreshing state
      if (this._state instanceof DashboardLoaded) {
        this.emit(new DashboardRefreshing(this._state.wallet, this._state.balance));
      } else {
        this.emit(new DashboardLoading());
      }
      
      const { wallet, balance } = await this.refreshWalletDataUseCase.execute();
      
      this.emit(new DashboardLoaded(wallet, balance));
    } catch (error) {
      this.emit(new DashboardError(`Lỗi làm mới dashboard: ${error}`));
    }
  }

  private async _handleLoadWallet(): Promise<void> {
    try {
      const wallet = await this.getCurrentWalletUseCase.execute();
      
      // If we already have balance data, keep it
      if (this._state instanceof DashboardLoaded) {
        this.emit(new DashboardLoaded(wallet, this._state.balance));
      }
    } catch (error) {
      this.emit(new DashboardError(`Lỗi tải thông tin ví: ${error}`));
    }
  }

  private async _handleLoadTokenList(): Promise<void> {
    try {
      const balance = await this.getWalletBalanceUseCase.execute();
      
      // If we already have wallet data, keep it
      if (this._state instanceof DashboardLoaded) {
        this.emit(new DashboardLoaded(this._state.wallet, balance));
      }
    } catch (error) {
      this.emit(new DashboardError(`Lỗi tải danh sách token: ${error}`));
    }
  }

  private async _handleLoadTotalBalance(): Promise<void> {
    try {
      const balance = await this.getWalletBalanceUseCase.execute();
      
      // If we already have wallet data, keep it
      if (this._state instanceof DashboardLoaded) {
        this.emit(new DashboardLoaded(this._state.wallet, balance));
      }
    } catch (error) {
      this.emit(new DashboardError(`Lỗi tải tổng số dư: ${error}`));
    }
  }

  dispose(): void {
    this._listeners.length = 0;
  }
}
