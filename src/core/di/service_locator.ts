// Simple service locator for Finan app

// Services
import { CryptoService } from '../../data/services/crypto_service';
import { SecureStorageService } from '../../data/services/secure_storage_service';

import { OneInchApiService } from '../../data/services/oneinch_api_service';

// Repositories
import { WalletRepository } from '../../domain/repositories/wallet_repository';
import { WalletRepositoryImpl } from '../../data/repositories/wallet_repository_impl';
import { TokenRepository } from '../../domain/repositories/token_repository';
import { TokenRepositoryImpl } from '../../data/repositories/token_repository_impl';
import { SwapRepository } from '../../domain/repositories/swap_repository';
import { SwapRepositoryImpl } from '../../data/repositories/swap_repository_impl';

// Use Cases
import {
  CheckWalletExistsUseCase,
  CreateWalletUseCase,
  ImportWalletUseCase,
  GetWalletUseCase,
  GetWalletCredentialsUseCase,
  LogoutWalletUseCase,
} from '../../domain/usecases/wallet_usecases';

import {
  GetWalletBalanceUseCase,
  GetCurrentWalletUseCase,
  RefreshWalletDataUseCase,
} from '../../domain/usecases/dashboard_usecases';

import {
  GetSupportedTokensUseCase,
  GetTokenBalanceUseCase,
  GetTokenPriceUseCase,
  GetSwapQuoteUseCase,
  CheckTokenAllowanceUseCase,
  ApproveTokenUseCase,
  PerformSwapUseCase,
} from '../../domain/usecases/swap_usecases';

// BLoCs
import { WalletOnboardingBloc } from '../../presentation/blocs/wallet_onboarding_bloc';
import { DashboardBloc } from '../../presentation/blocs/dashboard_bloc';
import { SwapBloc } from '../../presentation/blocs/swap_bloc';

class ServiceContainer {
  private static instance: ServiceContainer;
  private services = new Map<string, any>();
  private singletons = new Map<string, any>();

  static getInstance(): ServiceContainer {
    if (!ServiceContainer.instance) {
      ServiceContainer.instance = new ServiceContainer();
    }
    return ServiceContainer.instance;
  }

  register<T>(key: string, factory: () => T, singleton: boolean = true): void {
    this.services.set(key, { factory, singleton });
  }

  get<T>(key: string): T {
    const service = this.services.get(key);
    if (!service) {
      throw new Error(`Service ${key} not found`);
    }

    if (service.singleton) {
      if (!this.singletons.has(key)) {
        this.singletons.set(key, service.factory());
      }
      return this.singletons.get(key);
    }

    return service.factory();
  }
}

const container = ServiceContainer.getInstance();

export class ServiceLocator {
  static init() {
    // Services
    container.register('CryptoService', () => new CryptoService());
    container.register('SecureStorageService', () => new SecureStorageService());

    container.register('OneInchApiService', () => new OneInchApiService()); // API key sẽ được lấy từ api_config

    // Repositories
    container.register('WalletRepository', () => new WalletRepositoryImpl(
      container.get('CryptoService'),
      container.get('SecureStorageService')
    ));
    
    container.register('TokenRepository', () => new TokenRepositoryImpl());
    
    container.register('SwapRepository', () => new SwapRepositoryImpl(
      container.get('OneInchApiService')
    ));

    // Use Cases
    container.register('CheckWalletExistsUseCase', () => new CheckWalletExistsUseCase(
      container.get('WalletRepository')
    ));
    
    container.register('CreateWalletUseCase', () => new CreateWalletUseCase(
      container.get('WalletRepository')
    ));
    
    container.register('ImportWalletUseCase', () => new ImportWalletUseCase(
      container.get('WalletRepository')
    ));
    
    container.register('GetWalletUseCase', () => new GetWalletUseCase(
      container.get('WalletRepository')
    ));
    
    container.register('GetWalletCredentialsUseCase', () => new GetWalletCredentialsUseCase(
      container.get('WalletRepository')
    ));
    
    container.register('LogoutWalletUseCase', () => new LogoutWalletUseCase(
      container.get('WalletRepository')
    ));
    
    container.register('GetWalletBalanceUseCase', () => new GetWalletBalanceUseCase(
      container.get('TokenRepository'),
      container.get('WalletRepository')
    ));
    
    container.register('GetCurrentWalletUseCase', () => new GetCurrentWalletUseCase(
      container.get('WalletRepository')
    ));
    
    container.register('RefreshWalletDataUseCase', () => new RefreshWalletDataUseCase(
      container.get('TokenRepository'),
      container.get('WalletRepository')
    ));
    
    // Swap Use Cases
    container.register('GetSupportedTokensUseCase', () => new GetSupportedTokensUseCase(
      container.get('SwapRepository')
    ));
    
    container.register('GetTokenBalanceUseCase', () => new GetTokenBalanceUseCase(
      container.get('SwapRepository')
    ));
    
    container.register('GetTokenPriceUseCase', () => new GetTokenPriceUseCase(
      container.get('SwapRepository')
    ));
    
    container.register('GetSwapQuoteUseCase', () => new GetSwapQuoteUseCase(
      container.get('SwapRepository')
    ));
    
    container.register('CheckTokenAllowanceUseCase', () => new CheckTokenAllowanceUseCase(
      container.get('SwapRepository')
    ));
    
    container.register('ApproveTokenUseCase', () => new ApproveTokenUseCase(
      container.get('SwapRepository')
    ));
    
    container.register('PerformSwapUseCase', () => new PerformSwapUseCase(
      container.get('SwapRepository')
    ));

    // BLoCs
    container.register('WalletOnboardingBloc', () => new WalletOnboardingBloc(
      container.get('CheckWalletExistsUseCase'),
      container.get('CreateWalletUseCase'),
      container.get('ImportWalletUseCase'),
      container.get('GetWalletCredentialsUseCase'),
      container.get('GetWalletUseCase')
    ), false); // Not singleton for BLoCs
    
    container.register('DashboardBloc', () => new DashboardBloc(
      container.get('GetWalletBalanceUseCase'),
      container.get('GetCurrentWalletUseCase'),
      container.get('RefreshWalletDataUseCase')
    ), false); // Not singleton for BLoCs
    
    container.register('SwapBloc', () => new SwapBloc(
      container.get('GetSupportedTokensUseCase'),
      container.get('GetTokenBalanceUseCase'),
      container.get('GetTokenPriceUseCase'),
      container.get('GetSwapQuoteUseCase'),
      container.get('CheckTokenAllowanceUseCase'),
      container.get('ApproveTokenUseCase'),
      container.get('PerformSwapUseCase'),
      container.get('GetCurrentWalletUseCase'),
      container.get('GetWalletCredentialsUseCase')
    ), false); // Not singleton for BLoCs
  }

  static get<T>(key: string): T {
    return container.get<T>(key);
  }
}
