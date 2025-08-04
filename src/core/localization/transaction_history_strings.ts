export interface TransactionHistoryStrings {
  // Screen titles
  transactionHistory: string;
  transactionDetail: string;
  
  // Transaction types
  send: string;
  receive: string;
  swap: string;
  
  // Transaction status
  success: string;
  pending: string;
  failed: string;
  unknown: string;
  
  // UI elements
  filter: string;
  clearFilter: string;
  refresh: string;
  loadMore: string;
  viewDetail: string;
  backButton: string;
  retry: string;
  cancel: string;
  
  // Filter options
  filterTransactions: string;
  onlySendTransactions: string;
  onlyReceiveTransactions: string;
  onlySwapTransactions: string;
  
  // Empty states
  noTransactions: string;
  noTransactionsSubtitle: string;
  noFilteredTransactions: string;
  
  // Error messages
  errorOccurred: string;
  cannotLoadHistory: string;
  cannotLoadDetail: string;
  cannotLoadWallet: string;
  walletNotFound: string;
  invalidWalletAddress: string;
  invalidTransactionHash: string;
  transactionNotFound: string;
  cannotCopy: string;
  cannotOpenLink: string;
  
  // Loading messages
  loadingHistory: string;
  loadingDetail: string;
  
  // Transaction details
  basicInfo: string;
  addresses: string;
  swapDetails: string;
  gasInfo: string;
  transactionHash: string;
  time: string;
  token: string;
  block: string;
  from: string;
  to: string;
  fromToken: string;
  toToken: string;
  exchangeRate: string;
  gasUsed: string;
  gasPrice: string;
  gasFee: string;
  hash: string;
  
  // Actions
  viewOnEtherscan: string;
  copied: string;
  addressCopied: string;
  hashCopied: string;
  
  // Filter indicator
  filtering: string;
  custom: string;
}

export const vietnameseStrings: TransactionHistoryStrings = {
  // Screen titles
  transactionHistory: 'Lịch sử giao dịch',
  transactionDetail: 'Chi tiết giao dịch',
  
  // Transaction types
  send: 'Gửi',
  receive: 'Nhận',
  swap: 'Hoán đổi',
  
  // Transaction status
  success: 'Thành công',
  pending: 'Đang xử lý',
  failed: 'Thất bại',
  unknown: 'Không xác định',
  
  // UI elements
  filter: 'Lọc',
  clearFilter: 'Xóa',
  refresh: 'Làm mới',
  loadMore: 'Tải thêm',
  viewDetail: 'Xem chi tiết',
  backButton: '← Quay lại',
  retry: 'Thử lại',
  cancel: 'Hủy',
  
  // Filter options
  filterTransactions: 'Lọc giao dịch',
  onlySendTransactions: 'Chỉ giao dịch gửi',
  onlyReceiveTransactions: 'Chỉ giao dịch nhận',
  onlySwapTransactions: 'Chỉ giao dịch hoán đổi',
  
  // Empty states
  noTransactions: 'Chưa có giao dịch nào',
  noTransactionsSubtitle: 'Bạn chưa thực hiện giao dịch nào',
  noFilteredTransactions: 'Không có giao dịch nào phù hợp với bộ lọc',
  
  // Error messages
  errorOccurred: 'Có lỗi xảy ra',
  cannotLoadHistory: 'Không thể tải lịch sử giao dịch',
  cannotLoadDetail: 'Không thể tải chi tiết giao dịch',
  cannotLoadWallet: 'Không thể tải thông tin ví',
  walletNotFound: 'Không tìm thấy thông tin ví',
  invalidWalletAddress: 'Địa chỉ ví không hợp lệ',
  invalidTransactionHash: 'Hash giao dịch không hợp lệ',
  transactionNotFound: 'Không tìm thấy giao dịch',
  cannotCopy: 'Không thể sao chép',
  cannotOpenLink: 'Không thể mở liên kết',
  
  // Loading messages
  loadingHistory: 'Đang tải lịch sử giao dịch...',
  loadingDetail: 'Đang tải chi tiết giao dịch...',
  
  // Transaction details
  basicInfo: 'Thông tin cơ bản',
  addresses: 'Địa chỉ',
  swapDetails: 'Chi tiết hoán đổi',
  gasInfo: 'Thông tin gas',
  transactionHash: 'Hash giao dịch',
  time: 'Thời gian',
  token: 'Token',
  block: 'Block',
  from: 'Từ',
  to: 'Đến',
  fromToken: 'Từ token',
  toToken: 'Sang token',
  exchangeRate: 'Tỷ giá',
  gasUsed: 'Gas đã sử dụng',
  gasPrice: 'Giá gas',
  gasFee: 'Phí gas',
  hash: 'Hash',
  
  // Actions
  viewOnEtherscan: 'Xem trên Etherscan',
  copied: 'Đã sao chép',
  addressCopied: 'đã được sao chép vào clipboard',
  hashCopied: 'đã được sao chép vào clipboard',
  
  // Filter indicator
  filtering: 'Đang lọc:',
  custom: 'Tùy chỉnh',
};

export const englishStrings: TransactionHistoryStrings = {
  // Screen titles
  transactionHistory: 'Transaction History',
  transactionDetail: 'Transaction Detail',
  
  // Transaction types
  send: 'Send',
  receive: 'Receive',
  swap: 'Swap',
  
  // Transaction status
  success: 'Success',
  pending: 'Pending',
  failed: 'Failed',
  unknown: 'Unknown',
  
  // UI elements
  filter: 'Filter',
  clearFilter: 'Clear',
  refresh: 'Refresh',
  loadMore: 'Load More',
  viewDetail: 'View Detail',
  backButton: '← Back',
  retry: 'Retry',
  cancel: 'Cancel',
  
  // Filter options
  filterTransactions: 'Filter Transactions',
  onlySendTransactions: 'Send transactions only',
  onlyReceiveTransactions: 'Receive transactions only',
  onlySwapTransactions: 'Swap transactions only',
  
  // Empty states
  noTransactions: 'No transactions yet',
  noTransactionsSubtitle: 'You haven\'t made any transactions yet',
  noFilteredTransactions: 'No transactions match the filter',
  
  // Error messages
  errorOccurred: 'An error occurred',
  cannotLoadHistory: 'Cannot load transaction history',
  cannotLoadDetail: 'Cannot load transaction detail',
  cannotLoadWallet: 'Cannot load wallet information',
  walletNotFound: 'Wallet information not found',
  invalidWalletAddress: 'Invalid wallet address',
  invalidTransactionHash: 'Invalid transaction hash',
  transactionNotFound: 'Transaction not found',
  cannotCopy: 'Cannot copy',
  cannotOpenLink: 'Cannot open link',
  
  // Loading messages
  loadingHistory: 'Loading transaction history...',
  loadingDetail: 'Loading transaction detail...',
  
  // Transaction details
  basicInfo: 'Basic Information',
  addresses: 'Addresses',
  swapDetails: 'Swap Details',
  gasInfo: 'Gas Information',
  transactionHash: 'Transaction Hash',
  time: 'Time',
  token: 'Token',
  block: 'Block',
  from: 'From',
  to: 'To',
  fromToken: 'From token',
  toToken: 'To token',
  exchangeRate: 'Exchange rate',
  gasUsed: 'Gas used',
  gasPrice: 'Gas price',
  gasFee: 'Gas fee',
  hash: 'Hash',
  
  // Actions
  viewOnEtherscan: 'View on Etherscan',
  copied: 'Copied',
  addressCopied: 'has been copied to clipboard',
  hashCopied: 'has been copied to clipboard',
  
  // Filter indicator
  filtering: 'Filtering:',
  custom: 'Custom',
};

// Default to Vietnamese
export const getTransactionHistoryStrings = (language: 'vi' | 'en' = 'vi'): TransactionHistoryStrings => {
  return language === 'en' ? englishStrings : vietnameseStrings;
};
