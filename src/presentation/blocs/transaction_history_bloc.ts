import { TransactionHistoryEvent, LoadTransactionHistory, LoadMoreTransactions, RefreshTransactionHistory, FilterTransactionHistory, ClearTransactionHistory, LoadTransactionDetail } from './transaction_history_event';
import { TransactionHistoryState, TransactionHistoryInitial, TransactionHistoryLoading, TransactionHistoryLoaded, TransactionHistoryEmpty, TransactionHistoryError, TransactionDetailLoading, TransactionDetailLoaded, TransactionDetailError } from './transaction_history_state';
import { GetTransactionHistoryUseCase } from '../../domain/usecases/get_transaction_history_usecase';
import { GetTransactionDetailUseCase } from '../../domain/usecases/get_transaction_detail_usecase';
import { TransactionEntity, TransactionFilter } from '../../domain/entities/transaction_entity';

export class TransactionHistoryBloc {
  private _state: TransactionHistoryState = new TransactionHistoryInitial();
  private _listeners: ((state: TransactionHistoryState) => void)[] = [];
  
  // Cache data
  private _transactions: TransactionEntity[] = [];
  private _hasMore: boolean = false;
  private _nextCursor?: string;
  private _currentFilter?: TransactionFilter;
  private _currentWalletAddress?: string;

  constructor(
    private getTransactionHistoryUseCase: GetTransactionHistoryUseCase,
    private getTransactionDetailUseCase: GetTransactionDetailUseCase
  ) {}

  get state(): TransactionHistoryState {
    return this._state;
  }

  // Subscribe to state changes
  listen(listener: (state: TransactionHistoryState) => void): () => void {
    this._listeners.push(listener);
    
    // Return unsubscribe function
    return () => {
      const index = this._listeners.indexOf(listener);
      if (index > -1) {
        this._listeners.splice(index, 1);
      }
    };
  }

  // Emit state change to all listeners
  private _emit(state: TransactionHistoryState): void {
    this._state = state;
    this._listeners.forEach(listener => listener(state));
  }

  // Handle events
  async add(event: TransactionHistoryEvent): Promise<void> {
    if (event instanceof LoadTransactionHistory) {
      await this._handleLoadTransactionHistory(event);
    } else if (event instanceof LoadMoreTransactions) {
      await this._handleLoadMoreTransactions(event);
    } else if (event instanceof RefreshTransactionHistory) {
      await this._handleRefreshTransactionHistory(event);
    } else if (event instanceof FilterTransactionHistory) {
      await this._handleFilterTransactionHistory(event);
    } else if (event instanceof ClearTransactionHistory) {
      this._handleClearTransactionHistory();
    } else if (event instanceof LoadTransactionDetail) {
      await this._handleLoadTransactionDetail(event);
    }
  }

  private async _handleLoadTransactionHistory(event: LoadTransactionHistory): Promise<void> {
    try {
      // If it's a refresh or different wallet/filter, clear cache
      if (event.refresh || 
          event.walletAddress !== this._currentWalletAddress ||
          JSON.stringify(event.filter) !== JSON.stringify(this._currentFilter)) {
        this._transactions = [];
        this._nextCursor = undefined;
      }

      this._emit(new TransactionHistoryLoading(event.refresh));
      
      this._currentWalletAddress = event.walletAddress;
      this._currentFilter = event.filter;

      const result = await this.getTransactionHistoryUseCase.execute(
        event.walletAddress,
        event.filter,
        this._nextCursor
      );

      if (event.refresh) {
        this._transactions = result.transactions;
      } else {
        this._transactions = [...this._transactions, ...result.transactions];
      }

      this._hasMore = result.hasMore;
      this._nextCursor = result.nextCursor;

      if (this._transactions.length === 0) {
        this._emit(new TransactionHistoryEmpty(event.filter));
      } else {
        this._emit(new TransactionHistoryLoaded(
          this._transactions,
          this._hasMore,
          event.filter
        ));
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Không thể tải lịch sử giao dịch';
      this._emit(new TransactionHistoryError(errorMessage));
    }
  }

  private async _handleLoadMoreTransactions(event: LoadMoreTransactions): Promise<void> {
    if (!this._hasMore || !this._nextCursor) {
      return;
    }

    try {
      // Show loading more state
      this._emit(new TransactionHistoryLoaded(
        this._transactions,
        this._hasMore,
        this._currentFilter,
        true // isLoadingMore = true
      ));

      const result = await this.getTransactionHistoryUseCase.execute(
        event.walletAddress,
        this._currentFilter,
        this._nextCursor
      );

      this._transactions = [...this._transactions, ...result.transactions];
      this._hasMore = result.hasMore;
      this._nextCursor = result.nextCursor;

      this._emit(new TransactionHistoryLoaded(
        this._transactions,
        this._hasMore,
        this._currentFilter
      ));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Không thể tải thêm giao dịch';
      this._emit(new TransactionHistoryError(errorMessage));
    }
  }

  private async _handleRefreshTransactionHistory(event: RefreshTransactionHistory): Promise<void> {
    await this._handleLoadTransactionHistory(
      new LoadTransactionHistory(event.walletAddress, this._currentFilter, true)
    );
  }

  private async _handleFilterTransactionHistory(event: FilterTransactionHistory): Promise<void> {
    await this._handleLoadTransactionHistory(
      new LoadTransactionHistory(event.walletAddress, event.filter, true)
    );
  }

  private _handleClearTransactionHistory(): void {
    this._transactions = [];
    this._hasMore = false;
    this._nextCursor = undefined;
    this._currentFilter = undefined;
    this._currentWalletAddress = undefined;
    this._emit(new TransactionHistoryInitial());
  }

  private async _handleLoadTransactionDetail(event: LoadTransactionDetail): Promise<void> {
    try {
      this._emit(new TransactionDetailLoading());

      const transaction = await this.getTransactionDetailUseCase.execute(event.transactionHash);
      
      this._emit(new TransactionDetailLoaded(transaction));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Không thể tải chi tiết giao dịch';
      this._emit(new TransactionDetailError(errorMessage));
    }
  }

  // Helper methods
  getCurrentTransactions(): TransactionEntity[] {
    return [...this._transactions];
  }

  getCurrentFilter(): TransactionFilter | undefined {
    return this._currentFilter;
  }

  hasMoreTransactions(): boolean {
    return this._hasMore;
  }

  dispose(): void {
    this._listeners = [];
  }
}
