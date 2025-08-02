// Simple service locator for Finan app

// Services
import { CryptoService } from '../../data/services/crypto_service';
import { SecureStorageService } from '../../data/services/secure_storage_service';
import { MoralisApiService } from '../../data/services/moralis_api_service';

// Repositories
import { WalletRepository } from '../../domain/repositories/wallet_repository';
import { WalletRepositoryImpl } from '../../data/repositories/wallet_repository_impl';
import { TokenRepository } from '../../domain/repositories/token_repository';
import { TokenRepositoryImpl } from '../../data/repositories/token_repository_impl';

// Use Cases
import {
  CheckWalletExistsUseCase,
  CreateWalletUseCase,
  ImportWalletUseCase,
  GetWalletUseCase,
} from '../../domain/usecases/wallet_usecases';

import {
  GetWalletBalanceUseCase,
  GetCurrentWalletUseCase,
  RefreshWalletDataUseCase,
} from '../../domain/usecases/dashboard_usecases';

// BLoCs
import { WalletOnboardingBloc } from '../../presentation/blocs/wallet_onboarding_bloc';
import { DashboardBloc } from '../../presentation/blocs/dashboard_bloc';

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
    container.register('MoralisApiService', () => new MoralisApiService());

    // Repositories
    container.register('WalletRepository', () => new WalletRepositoryImpl(
      container.get('CryptoService'),
      container.get('SecureStorageService')
    ));
    
    container.register('TokenRepository', () => new TokenRepositoryImpl(
      container.get('MoralisApiService')
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

    // BLoCs
    container.register('WalletOnboardingBloc', () => new WalletOnboardingBloc(
      container.get('CheckWalletExistsUseCase'),
      container.get('CreateWalletUseCase'),
      container.get('ImportWalletUseCase')
    ), false); // Not singleton for BLoCs
    
    container.register('DashboardBloc', () => new DashboardBloc(
      container.get('GetWalletBalanceUseCase'),
      container.get('GetCurrentWalletUseCase'),
      container.get('RefreshWalletDataUseCase')
    ), false); // Not singleton for BLoCs
  }

  static get<T>(key: string): T {
    return container.get<T>(key);
  }
}
