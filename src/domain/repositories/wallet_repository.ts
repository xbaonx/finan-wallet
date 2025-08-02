import { WalletEntity, WalletCredentials } from '../entities/wallet_entity';

export interface WalletRepository {
  // Check if wallet exists
  hasWallet(): Promise<boolean>;
  
  // Get wallet info (without private key)
  getWallet(): Promise<WalletEntity | null>;
  
  // Create new wallet
  createWallet(name: string): Promise<WalletEntity>;
  
  // Import wallet from mnemonic
  importWallet(mnemonic: string, name: string): Promise<WalletEntity>;
  
  // Get wallet credentials (private key, mnemonic) from secure storage
  getWalletCredentials(walletId: string): Promise<WalletCredentials | null>;
  
  // Save wallet to storage
  saveWallet(wallet: WalletEntity, credentials: WalletCredentials): Promise<void>;
  
  // Delete wallet
  deleteWallet(walletId: string): Promise<void>;
}
