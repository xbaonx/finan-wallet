import { ServiceLocator } from '../../core/di/service_locator';
import { GetWalletUseCase } from '../../domain/usecases/wallet_usecases';

export interface ReceiveAddressInfo {
  address: string;
  qrCodeData: string;
  formattedAddress: string;
}

export interface IncomingTransaction {
  hash: string;
  from: string;
  to: string;
  value: string;
  tokenSymbol: string;
  tokenAddress?: string;
  timestamp: number;
  confirmations: number;
  status: 'pending' | 'confirmed';
}

export class ReceiveService {
  private getWalletUseCase: GetWalletUseCase;

  constructor() {
    this.getWalletUseCase = ServiceLocator.get('GetWalletUseCase') as GetWalletUseCase;
  }

  /**
   * Lấy thông tin địa chỉ ví để nhận
   */
  async getReceiveAddressInfo(): Promise<ReceiveAddressInfo> {
    try {
      const wallet = await this.getWalletUseCase.execute();
      
      if (!wallet) {
        throw new Error('Wallet không được khởi tạo');
      }

      const address = wallet.address;
      
      return {
        address,
        qrCodeData: address, // QR code sẽ chứa địa chỉ ví
        formattedAddress: this.formatAddress(address)
      };

    } catch (error: any) {
      console.error('Get receive address error:', error);
      throw new Error('Không thể lấy địa chỉ ví: ' + error.message);
    }
  }

  /**
   * Tạo QR code data với thông tin token cụ thể
   */
  generateQRCodeForToken(address: string, tokenAddress?: string, amount?: string): string {
    if (tokenAddress) {
      // ERC20 token format: ethereum:tokenAddress@1?address=walletAddress&uint256=amount
      let qrData = `ethereum:${tokenAddress}@1?address=${address}`;
      if (amount) {
        qrData += `&uint256=${amount}`;
      }
      return qrData;
    } else {
      // ETH format: ethereum:walletAddress@1?value=amount
      let qrData = `ethereum:${address}@1`;
      if (amount) {
        qrData += `?value=${amount}`;
      }
      return qrData;
    }
  }

  /**
   * Theo dõi giao dịch đến (incoming transactions)
   * Note: Cần sử dụng WebSocket hoặc polling để real-time monitoring
   */
  async monitorIncomingTransactions(address: string): Promise<IncomingTransaction[]> {
    try {
      // Note: Để monitor real-time, cần sử dụng:
      // 1. WebSocket provider với provider.on('block', callback)
      // 2. Hoặc Moralis/Etherscan API với webhook
      // 3. Hoặc polling định kỳ
      
      // Placeholder implementation - trong thực tế cần API external
      console.log(`Monitoring incoming transactions for ${address}`);
      
      const incomingTransactions: IncomingTransaction[] = [];
      return incomingTransactions;

    } catch (error: any) {
      console.error('Monitor incoming transactions error:', error);
      return [];
    }
  }

  /**
   * Kiểm tra giao dịch đến mới nhất
   */
  async checkLatestIncomingTransaction(address: string): Promise<IncomingTransaction | null> {
    try {
      const transactions = await this.monitorIncomingTransactions(address);
      
      if (transactions.length > 0) {
        // Trả về giao dịch mới nhất
        return transactions.sort((a, b) => b.timestamp - a.timestamp)[0];
      }
      
      return null;

    } catch (error: any) {
      console.error('Check latest incoming transaction error:', error);
      return null;
    }
  }

  /**
   * Copy địa chỉ vào clipboard (sẽ được implement ở UI layer)
   */
  async copyAddressToClipboard(address: string): Promise<boolean> {
    try {
      // Note: Clipboard API sẽ được implement ở React Native component
      // Ở đây chỉ validate địa chỉ
      if (!this.isValidAddress(address)) {
        throw new Error('Địa chỉ không hợp lệ');
      }
      
      return true;

    } catch (error: any) {
      console.error('Copy address error:', error);
      return false;
    }
  }

  /**
   * Validate địa chỉ Ethereum
   */
  private isValidAddress(address: string): boolean {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  }

  /**
   * Format địa chỉ để hiển thị (rút gọn)
   */
  private formatAddress(address: string): string {
    if (!this.isValidAddress(address)) return address;
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  }

  /**
   * Tạo deep link cho ứng dụng ví khác
   */
  generateWalletDeepLink(address: string, amount?: string, tokenAddress?: string): string {
    // Format cho các ví phổ biến như MetaMask, Trust Wallet
    let deepLink = `https://metamask.app.link/send/${address}`;
    
    if (tokenAddress) {
      deepLink += `@${tokenAddress}`;
    }
    
    if (amount) {
      deepLink += `?value=${amount}`;
    }
    
    return deepLink;
  }

  /**
   * Tạo share text cho chia sẻ địa chỉ
   */
  generateShareText(address: string, tokenSymbol: string = 'ETH'): string {
    return `Gửi ${tokenSymbol} đến địa chỉ ví của tôi:\n\n${address}\n\nHoặc quét QR code để gửi nhanh!`;
  }
}
