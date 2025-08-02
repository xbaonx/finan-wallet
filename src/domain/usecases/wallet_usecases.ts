import { WalletEntity } from '../entities/wallet_entity';
import { WalletRepository } from '../repositories/wallet_repository';

export class CheckWalletExistsUseCase {
  constructor(private walletRepository: WalletRepository) {}

  async execute(): Promise<boolean> {
    return await this.walletRepository.hasWallet();
  }
}

export class CreateWalletUseCase {
  constructor(private walletRepository: WalletRepository) {}

  async execute(name: string): Promise<WalletEntity> {
    return await this.walletRepository.createWallet(name);
  }
}

export class ImportWalletUseCase {
  constructor(private walletRepository: WalletRepository) {}

  async execute(mnemonic: string, name: string): Promise<WalletEntity> {
    return await this.walletRepository.importWallet(mnemonic, name);
  }
}

export class GetWalletUseCase {
  constructor(private walletRepository: WalletRepository) {}

  async execute(): Promise<WalletEntity | null> {
    return await this.walletRepository.getWallet();
  }
}
