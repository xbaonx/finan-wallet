/**
 * Vietnamese Input Formatter Utility
 * Xử lý input formatting an toàn cho số tiền và số lượng
 */

import { VietnameseNumberFormatter } from './number_formatter';

export class VietnameseInputFormatter {
  
  /**
   * Format input value để hiển thị (với dấu phẩy, chấm)
   * @param value - Giá trị input (string hoặc number)
   * @param type - Loại format ('currency', 'crypto', 'number', 'percentage')
   * @param decimals - Số chữ số thập phân tối đa
   * @returns Chuỗi đã format để hiển thị
   */
  static formatInputDisplay(value: string | number, type: 'currency' | 'crypto' | 'number' | 'percentage' = 'number', decimals: number = 6): string {
    if (!value && value !== 0) return '';
    
    const numValue = typeof value === 'string' ? VietnameseInputFormatter.parseInputValue(value) : value;
    if (isNaN(numValue)) return '';
    
    switch (type) {
      case 'currency':
        return VietnameseNumberFormatter.formatUSD(numValue, false, decimals);
      case 'crypto':
        return VietnameseNumberFormatter.formatNumber(numValue, decimals);
      case 'percentage':
        return VietnameseNumberFormatter.formatPercentage(numValue / 100, decimals);
      default:
        return VietnameseNumberFormatter.formatNumber(numValue, decimals);
    }
  }
  
  /**
   * Parse input value về số thô để truyền đi API
   * @param value - Chuỗi input từ user
   * @returns Number để truyền đi API
   */
  static parseInputValue(value: string): number {
    if (!value || typeof value !== 'string') return 0;
    
    // Loại bỏ các ký tự không phải số, dấu chấm, dấu phẩy, dấu âm
    const cleaned = value
      .replace(/[^\d.,\-]/g, '') // Giữ lại số, dấu chấm, phẩy, âm
      .replace(/\./g, '') // Loại bỏ dấu chấm (phân cách hàng nghìn)
      .replace(/,/g, '.'); // Thay dấu phẩy thành dấu chấm (thập phân)
    
    return parseFloat(cleaned) || 0;
  }
  
  /**
   * Validate input value
   * @param value - Chuỗi input
   * @param min - Giá trị tối thiểu
   * @param max - Giá trị tối đa
   * @returns Object với isValid và error message
   */
  static validateInputValue(value: string, min: number = 0, max: number = Infinity): { isValid: boolean; error?: string } {
    const numValue = VietnameseInputFormatter.parseInputValue(value);
    
    if (isNaN(numValue)) {
      return { isValid: false, error: 'Giá trị không hợp lệ' };
    }
    
    if (numValue < min) {
      return { isValid: false, error: `Giá trị tối thiểu là ${VietnameseNumberFormatter.formatNumber(min)}` };
    }
    
    if (numValue > max) {
      return { isValid: false, error: `Giá trị tối đa là ${VietnameseNumberFormatter.formatNumber(max)}` };
    }
    
    return { isValid: true };
  }
  
  /**
   * Handle input change với formatting real-time
   * @param newValue - Giá trị mới từ input
   * @param currentValue - Giá trị hiện tại
   * @param type - Loại format
   * @param decimals - Số chữ số thập phân
   * @returns Object với displayValue và rawValue
   */
  static handleInputChange(
    newValue: string, 
    currentValue: string, 
    type: 'currency' | 'crypto' | 'number' | 'percentage' = 'number',
    decimals: number = 6
  ): { displayValue: string; rawValue: number } {
    
    // Nếu user xóa hết thì return empty
    if (!newValue) {
      return { displayValue: '', rawValue: 0 };
    }
    
    // Parse về số thô
    const rawValue = VietnameseInputFormatter.parseInputValue(newValue);
    
    // Nếu không parse được thì giữ nguyên giá trị cũ
    if (isNaN(rawValue)) {
      return { 
        displayValue: currentValue, 
        rawValue: VietnameseInputFormatter.parseInputValue(currentValue) 
      };
    }
    
    // Format để hiển thị
    const displayValue = VietnameseInputFormatter.formatInputDisplay(rawValue, type, decimals);
    
    return { displayValue, rawValue };
  }
  
  /**
   * Format amount input cho crypto (ETH, BTC, USDT...)
   * @param value - Input value
   * @param symbol - Token symbol
   * @param decimals - Số chữ số thập phân
   * @returns Formatted string
   */
  static formatCryptoInput(value: string | number, symbol: string, decimals: number = 6): string {
    const numValue = typeof value === 'string' ? VietnameseInputFormatter.parseInputValue(value) : value;
    if (isNaN(numValue) || numValue === 0) return '';
    
    return VietnameseNumberFormatter.formatNumber(numValue, decimals);
  }
  
  /**
   * Format VND input cho deposit/withdraw
   * @param value - Input value
   * @returns Formatted VND string
   */
  static formatVNDInput(value: string | number): string {
    const numValue = typeof value === 'string' ? VietnameseInputFormatter.parseInputValue(value) : value;
    if (isNaN(numValue) || numValue === 0) return '';
    
    return VietnameseNumberFormatter.formatNumber(numValue, 0);
  }
  
  /**
   * Sanitize input để tránh lỗi khi gửi API
   * @param value - Raw input value
   * @returns Safe number string cho API
   */
  static sanitizeForAPI(value: string | number): string {
    const numValue = typeof value === 'string' ? VietnameseInputFormatter.parseInputValue(value) : value;
    if (isNaN(numValue)) return '0';
    
    // Trả về string với dấu chấm làm decimal separator (chuẩn API)
    return numValue.toString();
  }
  
  /**
   * Check if input is valid number
   * @param value - Input value
   * @returns Boolean
   */
  static isValidNumber(value: string): boolean {
    const numValue = VietnameseInputFormatter.parseInputValue(value);
    return !isNaN(numValue) && isFinite(numValue);
  }
  
  /**
   * Limit decimal places trong input
   * @param value - Input value
   * @param maxDecimals - Số chữ số thập phân tối đa
   * @returns Limited value
   */
  static limitDecimals(value: string, maxDecimals: number): string {
    if (!value) return '';
    
    const parts = value.split(',');
    if (parts.length > 1 && parts[1].length > maxDecimals) {
      parts[1] = parts[1].substring(0, maxDecimals);
    }
    
    return parts.join(',');
  }
}

// Export shorthand functions
export const formatInputDisplay = VietnameseInputFormatter.formatInputDisplay;
export const parseInputValue = VietnameseInputFormatter.parseInputValue;
export const validateInputValue = VietnameseInputFormatter.validateInputValue;
export const handleInputChange = VietnameseInputFormatter.handleInputChange;
export const formatCryptoInput = VietnameseInputFormatter.formatCryptoInput;
export const formatVNDInput = VietnameseInputFormatter.formatVNDInput;
export const sanitizeForAPI = VietnameseInputFormatter.sanitizeForAPI;
export const isValidNumber = VietnameseInputFormatter.isValidNumber;
export const limitDecimals = VietnameseInputFormatter.limitDecimals;

// Default export
export default VietnameseInputFormatter;
