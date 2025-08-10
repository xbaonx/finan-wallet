import * as SecureStore from 'expo-secure-store';
import { SafeSecureStore } from '../../core/utils/safe_secure_store';
import { Platform } from 'react-native';
import { WalletEntity, WalletCredentials } from '../../domain/entities/wallet_entity';

export class SecureStorageService {
  private isWeb = Platform.OS === 'web';
  
  // Web fallback using localStorage
  private webStorage = {
    setItem: (key: string, value: string) => {
      if (typeof (global as any).window !== 'undefined') {
        (global as any).window.localStorage.setItem(key, value);
      }
    },
    getItem: (key: string): string | null => {
      if (typeof (global as any).window !== 'undefined') {
        return (global as any).window.localStorage.getItem(key);
      }
      return null;
    },
    removeItem: (key: string) => {
      if (typeof (global as any).window !== 'undefined') {
        (global as any).window.localStorage.removeItem(key);
      }
    }
  };
  private static readonly WALLET_KEY = 'finan_wallet';
  private static readonly CREDENTIALS_KEY_PREFIX = 'finan_credentials_';

  /**
   * Save wallet info (without sensitive data)
   */
  async saveWallet(wallet: WalletEntity): Promise<void> {
    try {
      const walletData = JSON.stringify(wallet);
      if (this.isWeb) {
        this.webStorage.setItem(SecureStorageService.WALLET_KEY, walletData);
      } else {
        await SecureStore.setItemAsync(SecureStorageService.WALLET_KEY, walletData);
      }
    } catch (error) {
      throw new Error(`Failed to save wallet: ${error}`);
    }
  }

  /**
   * Get wallet info (without sensitive data)
   */
  async getWallet(): Promise<WalletEntity | null> {
    try {
      let walletData: string | null;
      if (this.isWeb) {
        walletData = this.webStorage.getItem(SecureStorageService.WALLET_KEY);
      } else {
        walletData = await SecureStore.getItemAsync(SecureStorageService.WALLET_KEY);
      }
      
      if (!walletData) {
        return null;
      }
      
      const wallet = JSON.parse(walletData);
      // Convert createdAt back to Date object
      wallet.createdAt = new Date(wallet.createdAt);
      return wallet;
    } catch (error) {
      console.error('Failed to get wallet:', error);
      return null;
    }
  }

  /**
   * Save wallet credentials (private key, mnemonic)
   */
  async saveWalletCredentials(walletId: string, credentials: WalletCredentials): Promise<void> {
    try {
      const credentialsKey = `${SecureStorageService.CREDENTIALS_KEY_PREFIX}${walletId}`;
      const credentialsData = JSON.stringify(credentials);
      if (this.isWeb) {
        this.webStorage.setItem(credentialsKey, credentialsData);
      } else {
        await SecureStore.setItemAsync(credentialsKey, credentialsData);
      }
    } catch (error) {
      throw new Error(`Failed to save wallet credentials: ${error}`);
    }
  }

  /**
   * Get wallet credentials (private key, mnemonic)
   */
  async getWalletCredentials(walletId: string): Promise<WalletCredentials | null> {
    try {
      const credentialsKey = `${SecureStorageService.CREDENTIALS_KEY_PREFIX}${walletId}`;
      let credentialsData: string | null;
      if (this.isWeb) {
        credentialsData = this.webStorage.getItem(credentialsKey);
      } else {
        credentialsData = await SafeSecureStore.getItemAsync(credentialsKey);
      }
      
      if (!credentialsData) {
        return null;
      }
      return JSON.parse(credentialsData);
    } catch (error) {
      console.error('Failed to get wallet credentials:', error);
      return null;
    }
  }

  /**
   * Check if wallet exists
   */
  async hasWallet(): Promise<boolean> {
    try {
      let walletData: string | null;
      if (this.isWeb) {
        walletData = this.webStorage.getItem(SecureStorageService.WALLET_KEY);
      } else {
        walletData = await SecureStore.getItemAsync(SecureStorageService.WALLET_KEY);
      }
      return walletData !== null;
    } catch (error) {
      console.error('Failed to check wallet existence:', error);
      return false;
    }
  }

  /**
   * Delete wallet and its credentials
   */
  async deleteWallet(walletId: string): Promise<void> {
    try {
      if (this.isWeb) {
        this.webStorage.removeItem(SecureStorageService.WALLET_KEY);
        const credentialsKey = `${SecureStorageService.CREDENTIALS_KEY_PREFIX}${walletId}`;
        this.webStorage.removeItem(credentialsKey);
      } else {
        await SecureStore.deleteItemAsync(SecureStorageService.WALLET_KEY);
        const credentialsKey = `${SecureStorageService.CREDENTIALS_KEY_PREFIX}${walletId}`;
        await SecureStore.deleteItemAsync(credentialsKey);
      }
    } catch (error) {
      throw new Error(`Failed to delete wallet: ${error}`);
    }
  }
}
