import { WalletOnboardingEvent, CheckWalletExistsEvent, CreateWalletEvent, ImportWalletEvent, ResetOnboardingEvent } from './wallet_onboarding_event';
import { WalletOnboardingState, WalletOnboardingInitial, WalletOnboardingLoading, WalletExistsState, WalletNotExistsState, WalletCreatedState, WalletImportedState, WalletOnboardingError } from './wallet_onboarding_state';
import { CheckWalletExistsUseCase, CreateWalletUseCase, ImportWalletUseCase } from '../../domain/usecases/wallet_usecases';

export class WalletOnboardingBloc {
  private _state: WalletOnboardingState = new WalletOnboardingInitial();
  private _listeners: ((state: WalletOnboardingState) => void)[] = [];

  constructor(
    private checkWalletExistsUseCase: CheckWalletExistsUseCase,
    private createWalletUseCase: CreateWalletUseCase,
    private importWalletUseCase: ImportWalletUseCase
  ) {}

  get state(): WalletOnboardingState {
    return this._state;
  }

  addListener(listener: (state: WalletOnboardingState) => void): void {
    this._listeners.push(listener);
  }

  removeListener(listener: (state: WalletOnboardingState) => void): void {
    const index = this._listeners.indexOf(listener);
    if (index > -1) {
      this._listeners.splice(index, 1);
    }
  }

  private emit(state: WalletOnboardingState): void {
    this._state = state;
    this._listeners.forEach(listener => listener(state));
  }

  async add(event: WalletOnboardingEvent): Promise<void> {
    if (event instanceof CheckWalletExistsEvent) {
      await this._handleCheckWalletExists();
    } else if (event instanceof CreateWalletEvent) {
      await this._handleCreateWallet(event);
    } else if (event instanceof ImportWalletEvent) {
      await this._handleImportWallet(event);
    } else if (event instanceof ResetOnboardingEvent) {
      this._handleResetOnboarding();
    }
  }

  private async _handleCheckWalletExists(): Promise<void> {
    try {
      this.emit(new WalletOnboardingLoading());
      
      const hasWallet = await this.checkWalletExistsUseCase.execute();
      
      if (hasWallet) {
        // Get wallet info and emit exists state
        // Note: We'll need to get the wallet details in a real implementation
        this.emit(new WalletNotExistsState()); // For now, always show onboarding
      } else {
        this.emit(new WalletNotExistsState());
      }
    } catch (error) {
      this.emit(new WalletOnboardingError(`Lỗi kiểm tra ví: ${error}`));
    }
  }

  private async _handleCreateWallet(event: CreateWalletEvent): Promise<void> {
    try {
      this.emit(new WalletOnboardingLoading());
      
      const wallet = await this.createWalletUseCase.execute(event.walletName);
      
      // Get mnemonic from wallet credentials
      // Note: In a real implementation, we'd need to get the mnemonic
      // For now, we'll pass an empty string as placeholder
      this.emit(new WalletCreatedState(wallet, ''));
    } catch (error) {
      this.emit(new WalletOnboardingError(`Lỗi tạo ví: ${error}`));
    }
  }

  private async _handleImportWallet(event: ImportWalletEvent): Promise<void> {
    try {
      this.emit(new WalletOnboardingLoading());
      
      const wallet = await this.importWalletUseCase.execute(event.mnemonic, event.walletName);
      
      this.emit(new WalletImportedState(wallet));
    } catch (error) {
      this.emit(new WalletOnboardingError(`Lỗi khôi phục ví: ${error}`));
    }
  }

  private _handleResetOnboarding(): void {
    this.emit(new WalletOnboardingInitial());
  }

  dispose(): void {
    this._listeners.clear();
  }
}
