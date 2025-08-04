import { TransactionRepository } from '../repositories/transaction_repository';
import { TransactionEntity } from '../entities/transaction_entity';

export class GetTransactionDetailUseCase {
  constructor(private transactionRepository: TransactionRepository) {}

  async execute(transactionHash: string): Promise<TransactionEntity> {
    if (!transactionHash || transactionHash.trim().length === 0) {
      throw new Error('Hash giao dịch không hợp lệ');
    }

    try {
      const transaction = await this.transactionRepository.getTransactionDetail(transactionHash);
      
      if (!transaction) {
        throw new Error('Không tìm thấy giao dịch');
      }

      return transaction;
    } catch (error) {
      throw new Error(`Không thể lấy chi tiết giao dịch: ${error instanceof Error ? error.message : 'Lỗi không xác định'}`);
    }
  }
}
