import { ReceiveService, ReceiveAddressInfo, IncomingTransaction } from '../../data/services/receive_service';

export class ReceiveUseCases {
  private receiveService: ReceiveService;

  constructor() {
    this.receiveService = new ReceiveService();
  }

  /**
   * Lấy thông tin địa chỉ để nhận token/ETH
   */
  async getReceiveAddress(): Promise<ReceiveAddressInfo> {
    try {
      return await this.receiveService.getReceiveAddressInfo();
    } catch (error: any) {
      throw new Error(error.message || 'Không thể lấy địa chỉ nhận');
    }
  }

  /**
   * Tạo QR code cho token cụ thể
   */
  generateQRCode(address: string, tokenAddress?: string, amount?: string): string {
    if (!address) {
      throw new Error('Địa chỉ ví không hợp lệ');
    }

    return this.receiveService.generateQRCodeForToken(address, tokenAddress, amount);
  }

  /**
   * Theo dõi giao dịch đến
   */
  async monitorIncomingTransactions(address: string): Promise<IncomingTransaction[]> {
    if (!address) {
      throw new Error('Địa chỉ ví không hợp lệ');
    }

    try {
      return await this.receiveService.monitorIncomingTransactions(address);
    } catch (error: any) {
      throw new Error('Không thể theo dõi giao dịch đến: ' + error.message);
    }
  }

  /**
   * Kiểm tra giao dịch đến mới nhất
   */
  async checkLatestTransaction(address: string): Promise<IncomingTransaction | null> {
    if (!address) {
      throw new Error('Địa chỉ ví không hợp lệ');
    }

    try {
      return await this.receiveService.checkLatestIncomingTransaction(address);
    } catch (error: any) {
      console.error('Check latest transaction error:', error);
      return null;
    }
  }

  /**
   * Copy địa chỉ vào clipboard
   */
  async copyAddress(address: string): Promise<boolean> {
    if (!address) {
      throw new Error('Địa chỉ ví không hợp lệ');
    }

    return await this.receiveService.copyAddressToClipboard(address);
  }

  /**
   * Tạo deep link cho ví khác
   */
  generateWalletLink(address: string, amount?: string, tokenAddress?: string): string {
    if (!address) {
      throw new Error('Địa chỉ ví không hợp lệ');
    }

    return this.receiveService.generateWalletDeepLink(address, amount, tokenAddress);
  }

  /**
   * Tạo text để chia sẻ
   */
  generateShareText(address: string, tokenSymbol?: string): string {
    if (!address) {
      throw new Error('Địa chỉ ví không hợp lệ');
    }

    return this.receiveService.generateShareText(address, tokenSymbol);
  }
}
