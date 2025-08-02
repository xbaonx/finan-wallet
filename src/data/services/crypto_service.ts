import * as bip39 from 'bip39';
import { ethers } from 'ethers';
import * as Crypto from 'expo-crypto';
import { Buffer } from 'buffer';

// Make Buffer available globally for React Native/Expo
if (typeof global !== 'undefined') {
  global.Buffer = Buffer;
}

export interface GeneratedWallet {
  address: string;
  publicKey: string;
  privateKey: string;
  mnemonic: string;
}

export class CryptoService {
  /**
   * Generate a new wallet with 12-word mnemonic
   */
  async generateWallet(): Promise<GeneratedWallet> {
    try {
      // Generate 16 bytes of entropy for 12-word mnemonic using expo-crypto
      const entropy = await Crypto.getRandomBytesAsync(16);
      
      // Convert entropy to hex string (SDK 53 compatible)
      const entropyHex = Array.from(entropy as Uint8Array)
        .map((byte: number) => byte.toString(16).padStart(2, '0'))
        .join('');
      
      // Convert entropy to mnemonic
      const mnemonic = bip39.entropyToMnemonic(entropyHex);
      
      return this.createWalletFromMnemonic(mnemonic);
    } catch (error) {
      throw new Error(`Failed to generate wallet: ${error}`);
    }
  }

  /**
   * Create wallet from existing mnemonic
   */
  async createWalletFromMnemonic(mnemonic: string): Promise<GeneratedWallet> {
    try {
      // Validate mnemonic
      if (!bip39.validateMnemonic(mnemonic)) {
        throw new Error('Invalid mnemonic phrase');
      }

      // Generate seed from mnemonic
      const seed = await bip39.mnemonicToSeed(mnemonic);
      
      // Create HD wallet from seed
      const hdNode = ethers.HDNodeWallet.fromSeed(seed);
      
      // Derive wallet at standard Ethereum path
      const wallet = hdNode.derivePath("m/44'/60'/0'/0/0");
      
      return {
        address: wallet.address,
        publicKey: wallet.publicKey,
        privateKey: wallet.privateKey,
        mnemonic: mnemonic,
      };
    } catch (error) {
      throw new Error(`Failed to create wallet from mnemonic: ${error}`);
    }
  }

  /**
   * Validate mnemonic phrase
   */
  validateMnemonic(mnemonic: string): boolean {
    return bip39.validateMnemonic(mnemonic);
  }

  /**
   * Generate a unique wallet ID
   */
  generateWalletId(): string {
    return `wallet_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
