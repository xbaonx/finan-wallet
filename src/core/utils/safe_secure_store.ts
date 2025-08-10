/**
 * Safe SecureStore Wrapper
 * Xử lý lỗi "User interaction is not allowed" và các lỗi khác
 */

import * as SecureStore from 'expo-secure-store';
import { AppState } from 'react-native';

export class SafeSecureStore {
  
  /**
   * Kiểm tra app có đang active không
   */
  private static isAppActive(): boolean {
    return AppState.currentState === 'active';
  }
  
  /**
   * Đợi app active trước khi thực hiện SecureStore operation
   */
  private static async waitForAppActive(maxWaitTime: number = 5000): Promise<boolean> {
    return new Promise((resolve) => {
      if (SafeSecureStore.isAppActive()) {
        resolve(true);
        return;
      }
      
      let timeoutId: NodeJS.Timeout;
      const subscription = AppState.addEventListener('change', (nextAppState: string) => {
        if (nextAppState === 'active') {
          subscription.remove();
          if (timeoutId) clearTimeout(timeoutId);
          resolve(true);
        }
      });
      
      // Timeout sau maxWaitTime
      timeoutId = setTimeout(() => {
        subscription.remove();
        resolve(false);
      }, maxWaitTime);
    });
  }
  
  /**
   * Safe get item từ SecureStore
   */
  static async getItemAsync(key: string, options?: SecureStore.SecureStoreOptions): Promise<string | null> {
    try {
      // Kiểm tra app active
      if (!SafeSecureStore.isAppActive()) {
        console.log('🔒 App not active, waiting...');
        const isActive = await SafeSecureStore.waitForAppActive(3000);
        if (!isActive) {
          console.warn('🔒 App still not active after waiting, skipping SecureStore read');
          return null;
        }
      }
      
      // Thực hiện get item
      const result = await SecureStore.getItemAsync(key, options);
      return result;
      
    } catch (error: any) {
      console.error(`🔒 SafeSecureStore.getItemAsync error for key "${key}":`, error);
      
      // Xử lý các lỗi phổ biến
      if (error.message?.includes('User interaction is not allowed')) {
        console.warn('🔒 User interaction not allowed - app might be in background');
        return null;
      }
      
      if (error.message?.includes('The user name or passphrase you entered is not correct')) {
        console.warn('🔒 Biometric authentication failed');
        return null;
      }
      
      if (error.message?.includes('User cancel')) {
        console.warn('🔒 User cancelled biometric authentication');
        return null;
      }
      
      // Các lỗi khác
      console.error('🔒 Unexpected SecureStore error:', error);
      return null;
    }
  }
  
  /**
   * Safe set item vào SecureStore
   */
  static async setItemAsync(key: string, value: string, options?: SecureStore.SecureStoreOptions): Promise<boolean> {
    try {
      // Kiểm tra app active
      if (!SafeSecureStore.isAppActive()) {
        console.log('🔒 App not active, waiting...');
        const isActive = await SafeSecureStore.waitForAppActive(3000);
        if (!isActive) {
          console.warn('🔒 App still not active after waiting, skipping SecureStore write');
          return false;
        }
      }
      
      // Thực hiện set item
      await SecureStore.setItemAsync(key, value, options);
      return true;
      
    } catch (error: any) {
      console.error(`🔒 SafeSecureStore.setItemAsync error for key "${key}":`, error);
      
      // Xử lý các lỗi phổ biến
      if (error.message?.includes('User interaction is not allowed')) {
        console.warn('🔒 User interaction not allowed - app might be in background');
        return false;
      }
      
      // Các lỗi khác
      console.error('🔒 Unexpected SecureStore error:', error);
      return false;
    }
  }
  
  /**
   * Safe delete item từ SecureStore
   */
  static async deleteItemAsync(key: string, options?: SecureStore.SecureStoreOptions): Promise<boolean> {
    try {
      // Kiểm tra app active
      if (!SafeSecureStore.isAppActive()) {
        console.log('🔒 App not active, waiting...');
        const isActive = await SafeSecureStore.waitForAppActive(3000);
        if (!isActive) {
          console.warn('🔒 App still not active after waiting, skipping SecureStore delete');
          return false;
        }
      }
      
      // Thực hiện delete item
      await SecureStore.deleteItemAsync(key, options);
      return true;
      
    } catch (error: any) {
      console.error(`🔒 SafeSecureStore.deleteItemAsync error for key "${key}":`, error);
      
      // Xử lý các lỗi phổ biến
      if (error.message?.includes('User interaction is not allowed')) {
        console.warn('🔒 User interaction not allowed - app might be in background');
        return false;
      }
      
      // Các lỗi khác
      console.error('🔒 Unexpected SecureStore error:', error);
      return false;
    }
  }
}

// Export shorthand functions
export const safeGetItemAsync = SafeSecureStore.getItemAsync;
export const safeSetItemAsync = SafeSecureStore.setItemAsync;
export const safeDeleteItemAsync = SafeSecureStore.deleteItemAsync;

// Default export
export default SafeSecureStore;
