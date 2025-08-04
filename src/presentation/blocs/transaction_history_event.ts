import { TransactionFilter } from '../../domain/entities/transaction_entity';

export abstract class TransactionHistoryEvent {}

export class LoadTransactionHistory extends TransactionHistoryEvent {
  constructor(
    public readonly walletAddress: string,
    public readonly filter?: TransactionFilter,
    public readonly refresh: boolean = false
  ) {
    super();
  }
}

export class LoadMoreTransactions extends TransactionHistoryEvent {
  constructor(public readonly walletAddress: string) {
    super();
  }
}

export class RefreshTransactionHistory extends TransactionHistoryEvent {
  constructor(public readonly walletAddress: string) {
    super();
  }
}

export class FilterTransactionHistory extends TransactionHistoryEvent {
  constructor(
    public readonly walletAddress: string,
    public readonly filter: TransactionFilter
  ) {
    super();
  }
}

export class ClearTransactionHistory extends TransactionHistoryEvent {}

export class LoadTransactionDetail extends TransactionHistoryEvent {
  constructor(public readonly transactionHash: string) {
    super();
  }
}
