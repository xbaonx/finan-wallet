/**
 * Format number as currency (USD)
 */
export const formatCurrency = (amount: number, currency: string = 'USD'): string => {
  if (isNaN(amount) || amount === 0) {
    return currency === 'USD' ? '$0.00' : '0 VNĐ';
  }

  if (currency === 'USD') {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } else if (currency === 'VND') {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  }

  return amount.toFixed(2);
};

/**
 * Format token balance with appropriate decimal places
 */
export const formatTokenBalance = (balance: string, symbol: string): string => {
  const numBalance = parseFloat(balance);
  
  if (isNaN(numBalance) || numBalance === 0) {
    return '0';
  }

  // For very small amounts, show more decimals
  if (numBalance < 0.001) {
    return numBalance.toFixed(6);
  }
  
  // For small amounts, show 4 decimals
  if (numBalance < 1) {
    return numBalance.toFixed(4);
  }
  
  // For larger amounts, show 2-4 decimals based on size
  if (numBalance < 1000) {
    return numBalance.toFixed(4);
  }
  
  return numBalance.toFixed(2);
};

/**
 * Format large numbers with K, M, B suffixes
 */
export const formatLargeNumber = (num: number): string => {
  if (isNaN(num) || num === 0) {
    return '0';
  }

  const absNum = Math.abs(num);
  
  if (absNum >= 1e9) {
    return (num / 1e9).toFixed(1) + 'B';
  }
  
  if (absNum >= 1e6) {
    return (num / 1e6).toFixed(1) + 'M';
  }
  
  if (absNum >= 1e3) {
    return (num / 1e3).toFixed(1) + 'K';
  }
  
  return num.toFixed(2);
};

/**
 * Truncate wallet address for display
 */
export const truncateAddress = (address: string, startChars: number = 6, endChars: number = 4): string => {
  if (!address || address.length <= startChars + endChars) {
    return address;
  }
  
  return `${address.slice(0, startChars)}...${address.slice(-endChars)}`;
};

/**
 * Format percentage change
 */
export const formatPercentage = (percentage: number): string => {
  if (isNaN(percentage)) {
    return '0.00%';
  }
  
  const sign = percentage >= 0 ? '+' : '';
  return `${sign}${percentage.toFixed(2)}%`;
};
