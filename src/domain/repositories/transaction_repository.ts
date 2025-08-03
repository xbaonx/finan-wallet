import { SendTransactionRequest, TransactionResult, TransactionHistory } from '../../data/services/transaction_service';

export interface TransactionRepository {
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
  
  getTransactionHistory(address: string, limit?: number): Promise<TransactionHistory[]>;
  
  isValidAddress(address: string): boolean;
  
  formatAddress(address: string): string;
}
