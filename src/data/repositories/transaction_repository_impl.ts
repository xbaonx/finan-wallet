import { TransactionRepository } from '../../domain/repositories/transaction_repository';
import { TransactionService, SendTransactionRequest, TransactionResult } from '../services/transaction_service';
import { MoralisApiService } from '../services/moralis_api_service';
import { TransactionEntity, TransactionFilter, TransactionListResponse, TransactionType, TransactionStatus } from '../../domain/entities/transaction_entity';

export class TransactionRepositoryImpl implements TransactionRepository {
  private transactionService: TransactionService;
  private moralisApiService: MoralisApiService;

  constructor() {
    this.transactionService = new TransactionService();
    this.moralisApiService = new MoralisApiService();
  }

  // Existing transaction operations
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

  // New transaction history operations
  async getTransactionHistory(
    address: string,
    filter?: TransactionFilter,
    cursor?: string,
    limit: number = 20
  ): Promise<TransactionListResponse> {
    try {
      // Sử dụng trực tiếp Moralis API
      const result = await this.moralisApiService.getWalletTokenTransfers(
        address,
        cursor,
        limit
      );

      // Chuyển đổi Moralis transfers thành TransactionEntity
      const transactions = result.transfers.map(transfer => 
        this.mapMoralisTransferToEntity(transfer, address)
      );

      // Áp dụng filter nếu có
      let filteredTransactions = transactions;
      if (filter) {
        filteredTransactions = this.applyFilter(transactions, filter);
      }

      // Sắp xếp theo thời gian (mới nhất trước)
      filteredTransactions.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

      return {
        transactions: filteredTransactions,
        hasMore: result.cursor !== null,
        nextCursor: result.cursor || undefined
      };
    } catch (error) {
      throw new Error(`Không thể lấy lịch sử giao dịch: ${error instanceof Error ? error.message : 'Lỗi không xác định'}`);
    }
  }

  async getTransactionDetail(hash: string): Promise<TransactionEntity | null> {
    try {
      console.log('Getting transaction detail for hash:', hash);
      
      // Sử dụng Moralis API để lấy chi tiết transaction
      const transactionDetail = await this.moralisApiService.getTransactionByHash(hash);
      
      if (!transactionDetail) {
        console.log('Transaction not found:', hash);
        return null;
      }
      
      // Map transaction detail to entity
      return this.mapMoralisTransactionToEntity(transactionDetail);
    } catch (error) {
      console.error('Error getting transaction detail:', error);
      return null;
    }
  }

  private mapMoralisTransferToEntity(transfer: any, userAddress: string): TransactionEntity {
    const isReceived = transfer.to_address?.toLowerCase() === userAddress.toLowerCase();
    const decimals = parseInt(transfer.token_decimals || '18');
    const amount = (parseInt(transfer.value || '0') / Math.pow(10, decimals)).toString();

    return {
      id: transfer.transaction_hash,
      hash: transfer.transaction_hash,
      type: isReceived ? TransactionType.RECEIVE : TransactionType.SEND,
      status: TransactionStatus.SUCCESS,
      timestamp: new Date(transfer.block_timestamp),
      blockNumber: parseInt(transfer.block_number || '0'),
      tokenSymbol: transfer.token_symbol || 'UNKNOWN',
      tokenAddress: transfer.contract_address || '',
      tokenDecimals: decimals,
      tokenLogoUri: transfer.token_logo,
      amount,
      fromAddress: transfer.from_address || '',
      toAddress: transfer.to_address || '',
    };
  }

  private mapMoralisTransactionToEntity(transaction: any): TransactionEntity {
    // Map chi tiết transaction từ Moralis API response
    const decimals = 18; // ETH có 18 decimals
    const amount = (parseInt(transaction.value || '0') / Math.pow(10, decimals)).toString();

    return {
      id: transaction.hash,
      hash: transaction.hash,
      type: TransactionType.SEND, // Mặc định là SEND, có thể cải thiện logic sau
      status: transaction.receipt_status === '1' ? TransactionStatus.SUCCESS : TransactionStatus.FAILED,
      timestamp: new Date(transaction.block_timestamp),
      blockNumber: parseInt(transaction.block_number || '0'),
      tokenSymbol: 'ETH', // Native ETH transaction
      tokenAddress: '0x0000000000000000000000000000000000000000',
      tokenDecimals: decimals,
      amount,
      fromAddress: transaction.from_address || '',
      toAddress: transaction.to_address || '',
      gasUsed: transaction.gas_used,
      gasPrice: transaction.gas_price,
    };
  }

  private applyFilter(transactions: TransactionEntity[], filter: TransactionFilter): TransactionEntity[] {
    return transactions.filter(tx => {
      if (filter.type && tx.type !== filter.type) {
        return false;
      }
      
      if (filter.tokenAddress && tx.tokenAddress.toLowerCase() !== filter.tokenAddress.toLowerCase()) {
        return false;
      }
      
      if (filter.dateFrom && tx.timestamp < filter.dateFrom) {
        return false;
      }
      
      if (filter.dateTo && tx.timestamp > filter.dateTo) {
        return false;
      }
      
      return true;
    });
  }

  // Utility methods
  isValidAddress(address: string): boolean {
    return this.transactionService.isValidAddress(address);
  }

  formatAddress(address: string): string {
    return this.transactionService.formatAddress(address);
  }
}
