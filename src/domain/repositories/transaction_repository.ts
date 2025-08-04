import { SendTransactionRequest, TransactionResult } from '../../data/services/transaction_service';
import { TransactionEntity, TransactionFilter, TransactionListResponse } from '../entities/transaction_entity';

export interface TransactionRepository {
  // Existing transaction operations
  sendTransaction(request: SendTransactionRequest): Promise<TransactionResult>;
  
  estimateGasFee(request: SendTransactionRequest): Promise<{
    gasLimit: string;
    gasPrice: string;
    totalFee: string;
  }>;
  
  getTransactionStatus(hash: string): Promise<{
    status: 'pending' | 'success' | 'failed';
    confirmations: number;
  }>;
  
  // New transaction history operations
  getTransactionHistory(
    address: string, 
    filter?: TransactionFilter,
    cursor?: string,
    limit?: number
  ): Promise<TransactionListResponse>;
  
  getTransactionDetail(hash: string): Promise<TransactionEntity | null>;
  
  // Utility methods
  isValidAddress(address: string): boolean;
  
  formatAddress(address: string): string;
}
