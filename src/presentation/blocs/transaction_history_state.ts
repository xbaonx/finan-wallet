import { TransactionEntity, TransactionFilter } from '../../domain/entities/transaction_entity';

export abstract class TransactionHistoryState {}

export class TransactionHistoryInitial extends TransactionHistoryState {}

export class TransactionHistoryLoading extends TransactionHistoryState {
  constructor(public readonly isRefresh: boolean = false) {
    super();
  }
}

export class TransactionHistoryLoaded extends TransactionHistoryState {
  constructor(
    public readonly transactions: TransactionEntity[],
    public readonly hasMore: boolean,
    public readonly filter?: TransactionFilter,
    public readonly isLoadingMore: boolean = false
  ) {
    super();
  }
}

export class TransactionHistoryEmpty extends TransactionHistoryState {
  constructor(public readonly filter?: TransactionFilter) {
    super();
  }
}

export class TransactionHistoryError extends TransactionHistoryState {
  constructor(public readonly message: string) {
    super();
  }
}

export class TransactionDetailLoading extends TransactionHistoryState {}

export class TransactionDetailLoaded extends TransactionHistoryState {
  constructor(public readonly transaction: TransactionEntity) {
    super();
  }
}

export class TransactionDetailError extends TransactionHistoryState {
  constructor(public readonly message: string) {
    super();
  }
}
