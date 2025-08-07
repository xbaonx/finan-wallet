import { DashboardEvent, LoadDashboardEvent, RefreshDashboardEvent, LoadWalletEvent, LoadTokenListEvent, LoadTotalBalanceEvent } from './dashboard_event';
import { GlobalTokenService } from '../../services/GlobalTokenService';
import { DashboardState, DashboardInitial, DashboardLoading, DashboardLoaded, DashboardRefreshing, DashboardError } from './dashboard_state';
import { GetWalletBalanceUseCase, GetCurrentWalletUseCase, RefreshWalletDataUseCase } from '../../domain/usecases/dashboard_usecases';

export class DashboardBloc {
  private _state: DashboardState = new DashboardInitial();
  private _listeners: ((state: DashboardState) => void)[] = [];
  private globalTokenService = GlobalTokenService.getInstance();

  constructor(
    private getWalletBalanceUseCase: GetWalletBalanceUseCase,
    private getCurrentWalletUseCase: GetCurrentWalletUseCase,
    private refreshWalletDataUseCase: RefreshWalletDataUseCase
  ) {
    // Đăng ký lắng nghe cập nhật từ GlobalTokenService
    this.globalTokenService.addListener(this._handleTokenBalanceUpdated.bind(this));
  }

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
      
      // Sử dụng GlobalTokenService để lấy số dư token từ cache hoặc API
      console.log('🔍 DashboardBloc: Đang tải dữ liệu ví và số dư token...');
      
      // Lấy thông tin ví
      const wallet = await this.getCurrentWalletUseCase.execute();
      if (!wallet) {
        this.emit(new DashboardError('Không tìm thấy ví'));
        return;
      }
      
      // Lấy số dư từ GlobalTokenService
      const walletBalance = await this.globalTokenService.getWalletBalance(false);
      
      if (!walletBalance) {
        this.emit(new DashboardError('Không thể tải số dư token'));
        return;
      }
      
      this.emit(new DashboardLoaded(wallet, walletBalance));
    } catch (error) {
      this.emit(new DashboardError(`Lỗi tải dashboard: ${error}`));
    }
  }

  private async _handleRefreshDashboard(): Promise<void> {
    try {
      // Nếu đã có dữ liệu, hiển thị trạng thái đang làm mới
      if (this._state instanceof DashboardLoaded) {
        this.emit(new DashboardRefreshing(this._state.wallet, this._state.balance));
      } else {
        this.emit(new DashboardLoading());
      }
      
      console.log('🔄 DashboardBloc: Đang làm mới dữ liệu ví và số dư token...');
      
      // Lấy thông tin ví mới
      const wallet = await this.getCurrentWalletUseCase.execute();
      if (!wallet) {
        this.emit(new DashboardError('Không tìm thấy ví'));
        return;
      }
      
      // Làm mới số dư token từ GlobalTokenService (force refresh)
      const walletBalance = await this.globalTokenService.getWalletBalance(true);
      
      if (!walletBalance) {
        this.emit(new DashboardError('Không thể tải số dư token'));
        return;
      }
      
      this.emit(new DashboardLoaded(wallet, walletBalance));
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
      // Sử dụng GlobalTokenService để lấy số dư token
      console.log('🔍 DashboardBloc: Đang tải danh sách token từ GlobalTokenService...');
      const walletBalance = await this.globalTokenService.getWalletBalance(false);
      
      if (!walletBalance) {
        console.error('❌ DashboardBloc: Không thể tải danh sách token');
        return;
      }
      
      // Nếu đã có dữ liệu ví, giữ lại
      if (this._state instanceof DashboardLoaded) {
        this.emit(new DashboardLoaded(this._state.wallet, walletBalance));
      }
    } catch (error) {
      this.emit(new DashboardError(`Lỗi tải danh sách token: ${error}`));
    }
  }

  private async _handleLoadTotalBalance(): Promise<void> {
    try {
      // Lấy số dư từ GlobalTokenService
      const walletBalance = await this.globalTokenService.getWalletBalance(false);
      
      // Nếu đã có dữ liệu ví, cập nhật số dư
      if (this._state instanceof DashboardLoaded && walletBalance) {
        this.emit(new DashboardLoaded(this._state.wallet, walletBalance));
      }
    } catch (error) {
      this.emit(new DashboardError(`Lỗi tải tổng số dư: ${error}`));
    }
  }

  /**
   * Hàm xử lý khi GlobalTokenService cập nhật dữ liệu số dư
   * Được gọi tự động khi GlobalTokenService thông báo có dữ liệu mới
   */
  private _handleTokenBalanceUpdated(): void {
    console.log('🔔 DashboardBloc: Nhận được thông báo cập nhật số dư từ GlobalTokenService');
    
    // Chỉ cập nhật nếu đã có dữ liệu ví
    if (this._state instanceof DashboardLoaded) {
      this._handleLoadTotalBalance();
    }
  }

  dispose(): void {
    this._listeners.length = 0;
  }
}
