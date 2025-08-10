/**
 * Simple Vietnamese Input Formatter
 * Chỉ format khi cần thiết, không force decimals
 */

export class SimpleInputFormatter {
  
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
   * Format input display đơn giản - chỉ thay dấu chấm thành phẩy
   * @param value - Input value
   * @returns Formatted string
   */
  static formatInputDisplay(value: string): string {
    if (!value) return '';
    
    // Chỉ thay dấu chấm thành dấu phẩy cho decimal
    // Không thêm trailing zeros
    return value.replace('.', ',');
  }
  
  /**
   * Handle input change đơn giản
   * @param newValue - Giá trị mới từ input
   * @returns Object với displayValue và rawValue
   */
  static handleInputChange(newValue: string): { displayValue: string; rawValue: number } {
    
    // Nếu user xóa hết thì return empty
    if (!newValue) {
      return { displayValue: '', rawValue: 0 };
    }
    
    // Validate input - chỉ cho phép số, dấu chấm, dấu phẩy
    const validInput = newValue.replace(/[^\d.,]/g, '');
    
    // Đảm bảo chỉ có 1 dấu decimal
    const parts = validInput.split(/[.,]/);
    let cleanInput = parts[0];
    if (parts.length > 1) {
      cleanInput += ',' + parts[1]; // Sử dụng dấu phẩy cho decimal
    }
    
    // Parse về số thô cho API
    const rawValue = SimpleInputFormatter.parseInputValue(cleanInput);
    
    return { 
      displayValue: cleanInput, 
      rawValue: rawValue 
    };
  }
  
  /**
   * Sanitize input để tránh lỗi khi gửi API
   * @param value - Raw input value
   * @returns Safe number string cho API
   */
  static sanitizeForAPI(value: string | number): string {
    const numValue = typeof value === 'string' ? SimpleInputFormatter.parseInputValue(value) : value;
    if (isNaN(numValue)) return '0';
    
    // Trả về string với dấu chấm làm decimal separator (chuẩn API)
    return numValue.toString();
  }
  
  /**
   * Validate input value
   * @param value - Chuỗi input
   * @param min - Giá trị tối thiểu
   * @param max - Giá trị tối đa
   * @returns Object với isValid và error message
   */
  static validateInputValue(value: string, min: number = 0, max: number = Infinity): { isValid: boolean; error?: string } {
    const numValue = SimpleInputFormatter.parseInputValue(value);
    
    if (isNaN(numValue)) {
      return { isValid: false, error: 'Giá trị không hợp lệ' };
    }
    
    if (numValue < min) {
      return { isValid: false, error: `Giá trị tối thiểu là ${min}` };
    }
    
    if (numValue > max) {
      return { isValid: false, error: `Giá trị tối đa là ${max}` };
    }
    
    return { isValid: true };
  }
}

// Export shorthand functions
export const parseInputValue = SimpleInputFormatter.parseInputValue;
export const formatInputDisplay = SimpleInputFormatter.formatInputDisplay;
export const handleInputChange = SimpleInputFormatter.handleInputChange;
export const sanitizeForAPI = SimpleInputFormatter.sanitizeForAPI;
export const validateInputValue = SimpleInputFormatter.validateInputValue;

// Default export
export default SimpleInputFormatter;
