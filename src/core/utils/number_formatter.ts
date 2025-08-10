/**
 * Vietnamese Number Formatter Utility
 * Chuẩn hóa hiển thị số theo định dạng Việt Nam
 */

export class VietnameseNumberFormatter {
  // Locale cho Việt Nam
  private static readonly LOCALE = 'vi-VN';
  
  /**
   * Format số tiền VND
   * @param amount - Số tiền (number)
   * @param showCurrency - Hiển thị đơn vị tiền tệ (default: true)
   * @returns Chuỗi định dạng VND
   * 
   * Example: 1234567 → "1.234.567 VND"
   */
  static formatVND(amount: number | string, showCurrency: boolean = true): string {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    
    if (isNaN(numAmount)) {
      return showCurrency ? '0 VND' : '0';
    }
    
    const formatted = numAmount.toLocaleString(this.LOCALE, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    });
    
    return showCurrency ? `${formatted} VND` : formatted;
  }
  
  /**
   * Format số tiền USD
   * @param amount - Số tiền (number)
   * @param showCurrency - Hiển thị đơn vị tiền tệ (default: true)
   * @param decimals - Số chữ số thập phân (default: 2)
   * @returns Chuỗi định dạng USD
   * 
   * Example: 1234.56 → "$1.234,56"
   */
  static formatUSD(amount: number | string, showCurrency: boolean = true, decimals: number = 2): string {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    
    if (isNaN(numAmount)) {
      return showCurrency ? '$0,00' : '0,00';
    }
    
    const formatted = numAmount.toLocaleString(this.LOCALE, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    });
    
    return showCurrency ? `$${formatted}` : formatted;
  }
  
  /**
   * Format crypto amount (ETH, BTC, etc.)
   * @param amount - Số lượng crypto
   * @param symbol - Ký hiệu token (ETH, BTC, ...)
   * @param decimals - Số chữ số thập phân (default: 6)
   * @returns Chuỗi định dạng crypto
   * 
   * Example: 1.234567 → "1,234567 ETH"
   */
  static formatCrypto(amount: number | string, symbol: string, decimals: number = 6): string {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    
    if (isNaN(numAmount)) {
      return `0 ${symbol}`;
    }
    
    // Loại bỏ trailing zeros
    const formatted = numAmount.toLocaleString(this.LOCALE, {
      minimumFractionDigits: 0,
      maximumFractionDigits: decimals
    });
    
    return `${formatted} ${symbol}`;
  }
  
  /**
   * Format tỷ giá hối đoái
   * @param rate - Tỷ giá
   * @param fromCurrency - Tiền tệ gốc
   * @param toCurrency - Tiền tệ đích
   * @returns Chuỗi định dạng tỷ giá
   * 
   * Example: 24500 → "1 USD = 24.500 VND"
   */
  static formatExchangeRate(rate: number | string, fromCurrency: string = 'USD', toCurrency: string = 'VND'): string {
    const numRate = typeof rate === 'string' ? parseFloat(rate) : rate;
    
    if (isNaN(numRate)) {
      return `1 ${fromCurrency} = 0 ${toCurrency}`;
    }
    
    const formatted = numRate.toLocaleString(this.LOCALE, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    });
    
    return `1 ${fromCurrency} = ${formatted} ${toCurrency}`;
  }
  
  /**
   * Format phần trăm
   * @param percentage - Phần trăm (0.05 = 5%)
   * @param decimals - Số chữ số thập phân (default: 2)
   * @returns Chuỗi định dạng phần trăm
   * 
   * Example: 0.0575 → "5,75%"
   */
  static formatPercentage(percentage: number | string, decimals: number = 2): string {
    const numPercentage = typeof percentage === 'string' ? parseFloat(percentage) : percentage;
    
    if (isNaN(numPercentage)) {
      return '0%';
    }
    
    const percentValue = numPercentage * 100;
    const formatted = percentValue.toLocaleString(this.LOCALE, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    });
    
    return `${formatted}%`;
  }
  
  /**
   * Format số lượng lớn (K, M, B)
   * @param amount - Số lượng
   * @param decimals - Số chữ số thập phân (default: 1)
   * @returns Chuỗi định dạng rút gọn
   * 
   * Example: 1234567 → "1,2M"
   */
  static formatLargeNumber(amount: number | string, decimals: number = 1): string {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    
    if (isNaN(numAmount)) {
      return '0';
    }
    
    const absAmount = Math.abs(numAmount);
    const sign = numAmount < 0 ? '-' : '';
    
    if (absAmount >= 1e9) {
      const formatted = (absAmount / 1e9).toLocaleString(this.LOCALE, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
      });
      return `${sign}${formatted}B`;
    } else if (absAmount >= 1e6) {
      const formatted = (absAmount / 1e6).toLocaleString(this.LOCALE, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
      });
      return `${sign}${formatted}M`;
    } else if (absAmount >= 1e3) {
      const formatted = (absAmount / 1e3).toLocaleString(this.LOCALE, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
      });
      return `${sign}${formatted}K`;
    } else {
      return numAmount.toLocaleString(this.LOCALE, {
        minimumFractionDigits: 0,
        maximumFractionDigits: decimals
      });
    }
  }
  
  /**
   * Format số thông thường (không có đơn vị)
   * @param amount - Số
   * @param decimals - Số chữ số thập phân (default: 0)
   * @returns Chuỗi định dạng số
   * 
   * Example: 1234.56 → "1.234,56"
   */
  static formatNumber(amount: number | string, decimals: number = 0): string {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    
    if (isNaN(numAmount)) {
      return '0';
    }
    
    return numAmount.toLocaleString(this.LOCALE, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    });
  }
  
  /**
   * Parse chuỗi số Việt Nam về number
   * @param formattedNumber - Chuỗi số đã format
   * @returns Number
   * 
   * Example: "1.234.567" → 1234567
   */
  static parseVietnameseNumber(formattedNumber: string): number {
    if (!formattedNumber || typeof formattedNumber !== 'string') {
      return 0;
    }
    
    // Loại bỏ các ký tự không phải số, dấu chấm, dấu phẩy
    const cleaned = formattedNumber
      .replace(/[^\d.,\-]/g, '') // Giữ lại số, dấu chấm, phẩy, âm
      .replace(/\./g, '') // Loại bỏ dấu chấm (phân cách hàng nghìn)
      .replace(/,/g, '.'); // Thay dấu phẩy thành dấu chấm (thập phân)
    
    return parseFloat(cleaned) || 0;
  }
}

// Export các hàm shorthand để dễ sử dụng
export const formatVND = VietnameseNumberFormatter.formatVND;
export const formatUSD = VietnameseNumberFormatter.formatUSD;
export const formatCrypto = VietnameseNumberFormatter.formatCrypto;
export const formatExchangeRate = VietnameseNumberFormatter.formatExchangeRate;
export const formatPercentage = VietnameseNumberFormatter.formatPercentage;
export const formatLargeNumber = VietnameseNumberFormatter.formatLargeNumber;
export const formatNumber = VietnameseNumberFormatter.formatNumber;
export const parseVietnameseNumber = VietnameseNumberFormatter.parseVietnameseNumber;

// Default export
export default VietnameseNumberFormatter;
