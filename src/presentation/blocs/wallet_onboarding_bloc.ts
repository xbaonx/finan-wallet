import { WalletOnboardingEvent, CheckWalletExistsEvent, CreateWalletEvent, ImportWalletEvent, ResetOnboardingEvent } from './wallet_onboarding_event';
import { WalletOnboardingState, WalletOnboardingInitial, WalletOnboardingLoading, WalletExistsState, WalletNotExistsState, WalletCreatedState, WalletImportedState, WalletOnboardingError } from './wallet_onboarding_state';
import { CheckWalletExistsUseCase, CreateWalletUseCase, ImportWalletUseCase, GetWalletCredentialsUseCase, GetWalletUseCase } from '../../domain/usecases/wallet_usecases';

export class WalletOnboardingBloc {
  private _state: WalletOnboardingState = new WalletOnboardingInitial();
  private _listeners: ((state: WalletOnboardingState) => void)[] = [];

  constructor(
    private checkWalletExistsUseCase: CheckWalletExistsUseCase,
    private createWalletUseCase: CreateWalletUseCase,
    private importWalletUseCase: ImportWalletUseCase,
    private getWalletCredentialsUseCase: GetWalletCredentialsUseCase,
    private getWalletUseCase: GetWalletUseCase
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
        const wallet = await this.getWalletUseCase.execute();
        if (wallet) {
          this.emit(new WalletExistsState(wallet));
        } else {
          // Wallet exists but can't retrieve info, show onboarding
          this.emit(new WalletNotExistsState());
        }
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
      const credentials = await this.getWalletCredentialsUseCase.execute(wallet.id);
      const mnemonic = credentials?.mnemonic || '';
      
      this.emit(new WalletCreatedState(wallet, mnemonic));
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
    this._listeners.splice(0, this._listeners.length);
  }
}
