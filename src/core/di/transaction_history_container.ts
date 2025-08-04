import { TransactionRepositoryImpl } from '../../data/repositories/transaction_repository_impl';
import { GetTransactionHistoryUseCase } from '../../domain/usecases/get_transaction_history_usecase';
import { GetTransactionDetailUseCase } from '../../domain/usecases/get_transaction_detail_usecase';
import { TransactionHistoryBloc } from '../../presentation/blocs/transaction_history_bloc';

// Singleton container for transaction history dependencies
class TransactionHistoryContainer {
  private static instance: TransactionHistoryContainer;
  
  private _transactionRepository?: TransactionRepositoryImpl;
  private _getTransactionHistoryUseCase?: GetTransactionHistoryUseCase;
  private _getTransactionDetailUseCase?: GetTransactionDetailUseCase;
  private _transactionHistoryBloc?: TransactionHistoryBloc;

  private constructor() {}

  static getInstance(): TransactionHistoryContainer {
    if (!TransactionHistoryContainer.instance) {
      TransactionHistoryContainer.instance = new TransactionHistoryContainer();
    }
    return TransactionHistoryContainer.instance;
  }

  // Repository
  get transactionRepository(): TransactionRepositoryImpl {
    if (!this._transactionRepository) {
      this._transactionRepository = new TransactionRepositoryImpl();
    }
    return this._transactionRepository;
  }

  // Use Cases
  get getTransactionHistoryUseCase(): GetTransactionHistoryUseCase {
    if (!this._getTransactionHistoryUseCase) {
      this._getTransactionHistoryUseCase = new GetTransactionHistoryUseCase(
        this.transactionRepository
      );
    }
    return this._getTransactionHistoryUseCase;
  }

  get getTransactionDetailUseCase(): GetTransactionDetailUseCase {
    if (!this._getTransactionDetailUseCase) {
      this._getTransactionDetailUseCase = new GetTransactionDetailUseCase(
        this.transactionRepository
      );
    }
    return this._getTransactionDetailUseCase;
  }

  // BLoC
  get transactionHistoryBloc(): TransactionHistoryBloc {
    if (!this._transactionHistoryBloc) {
      this._transactionHistoryBloc = new TransactionHistoryBloc(
        this.getTransactionHistoryUseCase,
        this.getTransactionDetailUseCase
      );
    }
    return this._transactionHistoryBloc;
  }

  // Clean up method (useful for testing or resetting state)
  dispose(): void {
    if (this._transactionHistoryBloc) {
      this._transactionHistoryBloc.dispose();
    }
    this._transactionRepository = undefined;
    this._getTransactionHistoryUseCase = undefined;
    this._getTransactionDetailUseCase = undefined;
    this._transactionHistoryBloc = undefined;
  }
}

export default TransactionHistoryContainer;
