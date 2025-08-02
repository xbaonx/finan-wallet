export interface WalletEntity {
  id: string;
  name: string;
  address: string;
  publicKey: string;
  // Private key is stored separately in secure storage
  createdAt: Date;
  isImported: boolean;
}

export interface WalletCredentials {
  privateKey: string;
  mnemonic: string;
}
