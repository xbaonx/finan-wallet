import { TransactionRepository } from '../../domain/repositories/transaction_repository';
import { TransactionService, SendTransactionRequest, TransactionResult, TransactionHistory } from '../services/transaction_service';

export class TransactionRepositoryImpl implements TransactionRepository {
  private transactionService: TransactionService;

  constructor() {
    this.transactionService = new TransactionService();
  }

  async sendTransaction(request: SendTransactionRequest): Promise<TransactionResult> {
    return await this.transactionService.sendTransaction(request);
  }

  async estimateGasFee(request: SendTransactionRequest): Promise<{
    gasLimit: string;
    gasPrice: string;
    totalFee: string;
  }> {
    return await this.transactionService.estimateGasFee(request);
  }

  async getTransactionStatus(hash: string): Promise<{
    status: 'pending' | 'success' | 'failed';
    confirmations: number;
  }> {
    return await this.transactionService.getTransactionStatus(hash);
  }

  async getTransactionHistory(address: string, limit?: number): Promise<TransactionHistory[]> {
    return await this.transactionService.getTransactionHistory(address, limit);
  }

  isValidAddress(address: string): boolean {
    return this.transactionService.isValidAddress(address);
  }

  formatAddress(address: string): string {
    return this.transactionService.formatAddress(address);
  }
}
