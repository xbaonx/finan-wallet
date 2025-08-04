import { TransactionRepository } from '../repositories/transaction_repository';
import { TransactionEntity, TransactionFilter, TransactionListResponse } from '../entities/transaction_entity';

export class GetTransactionHistoryUseCase {
  constructor(private transactionRepository: TransactionRepository) {}

  async execute(
    walletAddress: string,
    filter?: TransactionFilter,
    cursor?: string,
    limit: number = 20
  ): Promise<TransactionListResponse> {
    if (!this.transactionRepository.isValidAddress(walletAddress)) {
      throw new Error('Địa chỉ ví không hợp lệ');
    }

    try {
      const result = await this.transactionRepository.getTransactionHistory(
        walletAddress,
        filter,
        cursor,
        limit
      );

      // Sort transactions by timestamp (newest first)
      result.transactions.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

      return result;
    } catch (error) {
      throw new Error(`Không thể lấy lịch sử giao dịch: ${error instanceof Error ? error.message : 'Lỗi không xác định'}`);
    }
  }
}
