import { TransactionService, SendTransactionRequest, TransactionResult, TransactionHistory } from '../../data/services/transaction_service';

export class TransactionUseCases {
  private transactionService: TransactionService;

  constructor() {
    this.transactionService = new TransactionService();
  }

  /**
   * Gửi token/ETH
   */
  async sendTransaction(request: SendTransactionRequest): Promise<TransactionResult> {
    // Validate input
    if (!this.transactionService.isValidAddress(request.toAddress)) {
      return {
        hash: '',
        success: false,
        error: 'Địa chỉ nhận không hợp lệ'
      };
    }

    if (!request.amount || parseFloat(request.amount) <= 0) {
      return {
        hash: '',
        success: false,
        error: 'Số lượng phải lớn hơn 0'
      };
    }

    return await this.transactionService.sendTransaction(request);
  }

  /**
   * Ước tính phí gas
   */
  async estimateTransactionFee(request: SendTransactionRequest) {
    try {
      return await this.transactionService.estimateGasFee(request);
    } catch (error: any) {
      throw new Error(error.message || 'Không thể ước tính phí giao dịch');
    }
  }

  /**
   * Kiểm tra trạng thái giao dịch
   */
  async checkTransactionStatus(hash: string) {
    if (!hash) {
      throw new Error('Hash giao dịch không hợp lệ');
    }
    
    return await this.transactionService.getTransactionStatus(hash);
  }

  /**
   * Lấy lịch sử giao dịch
   */
  async getTransactionHistory(address: string, limit?: number): Promise<TransactionHistory[]> {
    if (!this.transactionService.isValidAddress(address)) {
      throw new Error('Địa chỉ ví không hợp lệ');
    }

    return await this.transactionService.getTransactionHistory(address, limit);
  }

  /**
   * Validate địa chỉ
   */
  validateAddress(address: string): boolean {
    return this.transactionService.isValidAddress(address);
  }

  /**
   * Format địa chỉ để hiển thị
   */
  formatAddress(address: string): string {
    return this.transactionService.formatAddress(address);
  }
}
