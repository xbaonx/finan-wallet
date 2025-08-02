import { WalletBalance } from '../entities/token_entity';
import { WalletEntity } from '../entities/wallet_entity';
import { TokenRepository } from '../repositories/token_repository';
import { WalletRepository } from '../repositories/wallet_repository';

export class GetWalletBalanceUseCase {
  constructor(
    private tokenRepository: TokenRepository,
    private walletRepository: WalletRepository
  ) {}

  async execute(): Promise<WalletBalance> {
    const wallet = await this.walletRepository.getWallet();
    if (!wallet) {
      throw new Error('Không tìm thấy ví');
    }

    return await this.tokenRepository.getWalletBalance(wallet.address);
  }
}

export class GetCurrentWalletUseCase {
  constructor(private walletRepository: WalletRepository) {}

  async execute(): Promise<WalletEntity> {
    const wallet = await this.walletRepository.getWallet();
    if (!wallet) {
      throw new Error('Không tìm thấy ví');
    }
    return wallet;
  }
}

export class RefreshWalletDataUseCase {
  constructor(
    private tokenRepository: TokenRepository,
    private walletRepository: WalletRepository
  ) {}

  async execute(): Promise<{ wallet: WalletEntity; balance: WalletBalance }> {
    const wallet = await this.walletRepository.getWallet();
    if (!wallet) {
      throw new Error('Không tìm thấy ví');
    }

    const balance = await this.tokenRepository.getWalletBalance(wallet.address);
    
    return { wallet, balance };
  }
}
