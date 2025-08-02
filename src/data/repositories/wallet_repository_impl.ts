import { WalletEntity, WalletCredentials } from '../../domain/entities/wallet_entity';
import { WalletRepository } from '../../domain/repositories/wallet_repository';
import { CryptoService } from '../services/crypto_service';
import { SecureStorageService } from '../services/secure_storage_service';

export class WalletRepositoryImpl implements WalletRepository {
  constructor(
    private cryptoService: CryptoService,
    private secureStorageService: SecureStorageService
  ) {}

  async hasWallet(): Promise<boolean> {
    return await this.secureStorageService.hasWallet();
  }

  async getWallet(): Promise<WalletEntity | null> {
    return await this.secureStorageService.getWallet();
  }

  async createWallet(name: string): Promise<WalletEntity> {
    try {
      // Generate new wallet
      const generatedWallet = await this.cryptoService.generateWallet();
      
      // Create wallet entity
      const walletId = this.cryptoService.generateWalletId();
      const wallet: WalletEntity = {
        id: walletId,
        name: name,
        address: generatedWallet.address,
        publicKey: generatedWallet.publicKey,
        createdAt: new Date(),
        isImported: false,
      };

      // Create credentials
      const credentials: WalletCredentials = {
        privateKey: generatedWallet.privateKey,
        mnemonic: generatedWallet.mnemonic,
      };

      // Save wallet and credentials
      await this.saveWallet(wallet, credentials);

      return wallet;
    } catch (error) {
      throw new Error(`Failed to create wallet: ${error}`);
    }
  }

  async importWallet(mnemonic: string, name: string): Promise<WalletEntity> {
    try {
      // Validate and create wallet from mnemonic
      const generatedWallet = await this.cryptoService.createWalletFromMnemonic(mnemonic);
      
      // Create wallet entity
      const walletId = this.cryptoService.generateWalletId();
      const wallet: WalletEntity = {
        id: walletId,
        name: name,
        address: generatedWallet.address,
        publicKey: generatedWallet.publicKey,
        createdAt: new Date(),
        isImported: true,
      };

      // Create credentials
      const credentials: WalletCredentials = {
        privateKey: generatedWallet.privateKey,
        mnemonic: generatedWallet.mnemonic,
      };

      // Save wallet and credentials
      await this.saveWallet(wallet, credentials);

      return wallet;
    } catch (error) {
      throw new Error(`Failed to import wallet: ${error}`);
    }
  }

  async getWalletCredentials(walletId: string): Promise<WalletCredentials | null> {
    return await this.secureStorageService.getWalletCredentials(walletId);
  }

  async saveWallet(wallet: WalletEntity, credentials: WalletCredentials): Promise<void> {
    try {
      await this.secureStorageService.saveWallet(wallet);
      await this.secureStorageService.saveWalletCredentials(wallet.id, credentials);
    } catch (error) {
      throw new Error(`Failed to save wallet: ${error}`);
    }
  }

  async deleteWallet(walletId: string): Promise<void> {
    await this.secureStorageService.deleteWallet(walletId);
  }
}
