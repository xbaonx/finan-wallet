export enum TransactionType {
  SEND = 'SEND',
  RECEIVE = 'RECEIVE',
  SWAP = 'SWAP',
}

export enum TransactionStatus {
  SUCCESS = 'SUCCESS',
  PENDING = 'PENDING',
  FAILED = 'FAILED',
}

export interface TransactionEntity {
  id: string;
  hash: string;
  type: TransactionType;
  status: TransactionStatus;
  timestamp: Date;
  blockNumber?: number;
  
  // Token information
  tokenSymbol: string;
  tokenAddress: string;
  tokenDecimals: number;
  tokenLogoUri?: string;
  
  // Amount information
  amount: string; // Raw amount in token units
  amountUSD?: number; // USD value at time of transaction
  
  // Transaction specific data
  fromAddress: string;
  toAddress: string;
  
  // Gas information
  gasUsed?: string;
  gasPrice?: string;
  gasFeeUSD?: number;
  
  // Swap specific data (only for SWAP type)
  swapData?: {
    fromTokenSymbol: string;
    fromTokenAddress: string;
    fromAmount: string;
    toTokenSymbol: string;
    toTokenAddress: string;
    toAmount: string;
    exchangeRate?: number;
  };
}

export interface TransactionFilter {
  type?: TransactionType;
  tokenAddress?: string;
  dateFrom?: Date;
  dateTo?: Date;
}

export interface TransactionListResponse {
  transactions: TransactionEntity[];
  hasMore: boolean;
  nextCursor?: string;
}
