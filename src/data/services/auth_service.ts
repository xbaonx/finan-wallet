import * as SecureStore from 'expo-secure-store';
import { SafeSecureStore } from '../../core/utils/safe_secure_store';
import * as LocalAuthentication from 'expo-local-authentication';

export interface BiometricInfo {
  isAvailable: boolean;
  supportedTypes: LocalAuthentication.AuthenticationType[];
  isEnrolled: boolean;
}

export interface AuthResult {
  success: boolean;
  error?: string;
}

export class AuthService {
  private static readonly PIN_KEY = 'finan_pin';
  private static readonly BIOMETRIC_KEY = 'finan_biometric';
  private static readonly FAILED_ATTEMPTS_KEY = 'finan_failed_attempts';
  private static readonly PIN_LENGTH_KEY = 'finan_pin_length';
  private static readonly MAX_FAILED_ATTEMPTS = 5;

  /**
   * Lưu mã PIN vào SecureStore
   */
  async savePin(pin: string): Promise<boolean> {
    try {
      await SecureStore.setItemAsync(AuthService.PIN_KEY, pin);
      // Reset failed attempts khi set PIN mới
      await SecureStore.deleteItemAsync(AuthService.FAILED_ATTEMPTS_KEY);
      return true;
    } catch (error) {
      console.error('Save PIN error:', error);
      return false;
    }
  }

  /**
   * Kiểm tra PIN có tồn tại không
   */
  async hasPinSet(): Promise<boolean> {
    try {
      const pin = await SafeSecureStore.getItemAsync(AuthService.PIN_KEY);
      return pin !== null;
    } catch (error) {
      console.error('Check PIN exists error:', error);
      return false;
    }
  }

  /**
   * Xác thực PIN
   */
  async verifyPin(inputPin: string): Promise<AuthResult> {
    try {
      const storedPin = await SafeSecureStore.getItemAsync(AuthService.PIN_KEY);
      
      if (!storedPin) {
        return { success: false, error: 'Mã PIN chưa được thiết lập' };
      }

      if (inputPin === storedPin) {
        // Reset failed attempts khi đăng nhập thành công
        await SecureStore.deleteItemAsync(AuthService.FAILED_ATTEMPTS_KEY);
        return { success: true };
      } else {
        // Tăng số lần thất bại
        await this.incrementFailedAttempts();
        const failedAttempts = await this.getFailedAttempts();
        const remainingAttempts = AuthService.MAX_FAILED_ATTEMPTS - failedAttempts;

        if (failedAttempts >= AuthService.MAX_FAILED_ATTEMPTS) {
          // Xóa tất cả dữ liệu ví khi vượt quá số lần cho phép
          await this.clearAllWalletData();
          return { 
            success: false, 
            error: 'Bạn đã nhập sai quá 5 lần. Dữ liệu ví đã được xóa để bảo mật.' 
          };
        }

        return { 
          success: false, 
          error: `Mã PIN không đúng. Còn ${remainingAttempts} lần thử.` 
        };
      }
    } catch (error) {
      console.error('Verify PIN error:', error);
      return { success: false, error: 'Có lỗi xảy ra khi xác thực PIN' };
    }
  }

  /**
   * Lưu trạng thái bật sinh trắc học
   */
  async setBiometricEnabled(enabled: boolean): Promise<boolean> {
    try {
      await SecureStore.setItemAsync(AuthService.BIOMETRIC_KEY, enabled.toString());
      return true;
    } catch (error) {
      console.error('Set biometric enabled error:', error);
      return false;
    }
  }

  /**
   * Kiểm tra sinh trắc học có được bật không
   */
  async isBiometricEnabled(): Promise<boolean> {
    try {
      const enabled = await SafeSecureStore.getItemAsync(AuthService.BIOMETRIC_KEY);
      return enabled === 'true';
    } catch (error) {
      console.error('Check biometric enabled error:', error);
      return false;
    }
  }

  /**
   * Lưu độ dài PIN được chọn
   */
  async savePinLength(length: 4 | 6): Promise<boolean> {
    try {
      await SecureStore.setItemAsync(AuthService.PIN_LENGTH_KEY, length.toString());
      return true;
    } catch (error) {
      console.error('Save PIN length error:', error);
      return false;
    }
  }

  /**
   * Lấy độ dài PIN đã được thiết lập
   */
  async getPinLength(): Promise<4 | 6> {
    try {
      const length = await SafeSecureStore.getItemAsync(AuthService.PIN_LENGTH_KEY);
      return length === '4' ? 4 : 6; // Mặc định 6 nếu chưa thiết lập
    } catch (error) {
      console.error('Get PIN length error:', error);
      return 6; // Mặc định 6
    }
  }

  /**
   * Kiểm tra thông tin sinh trắc học của thiết bị
   */
  async getBiometricInfo(): Promise<BiometricInfo> {
    try {
      console.log('Getting biometric info...');
      const isAvailable = await LocalAuthentication.hasHardwareAsync();
      console.log('Hardware available:', isAvailable);
      
      const supportedTypes = await LocalAuthentication.supportedAuthenticationTypesAsync();
      console.log('Supported types:', supportedTypes);
      
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      console.log('Is enrolled:', isEnrolled);

      const result = {
        isAvailable,
        supportedTypes,
        isEnrolled
      };
      console.log('Final biometric info:', result);
      
      return result;
    } catch (error) {
      console.error('Get biometric info error:', error);
      return {
        isAvailable: false,
        supportedTypes: [],
        isEnrolled: false
      };
    }
  }

  /**
   * Xác thực bằng sinh trắc học
   */
  async authenticateWithBiometric(): Promise<AuthResult> {
    try {
      const biometricInfo = await this.getBiometricInfo();
      
      if (!biometricInfo.isAvailable || !biometricInfo.isEnrolled) {
        return { 
          success: false, 
          error: 'Sinh trắc học không khả dụng trên thiết bị này' 
        };
      }

      console.log('🔐 Starting biometric authentication...');

      // Thêm timeout để tránh hang
      const authPromise = LocalAuthentication.authenticateAsync({
        promptMessage: 'Xác thực để mở khóa Finan Wallet',
        cancelLabel: 'Hủy',
        fallbackLabel: 'Sử dụng mã PIN',
        disableDeviceFallback: false, // Cho phép fallback về PIN iPhone
        requireConfirmation: false,
      });

      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Authentication timeout')), 10000);
      });

      const result = await Promise.race([authPromise, timeoutPromise]) as any;
      console.log('🔐 Authentication result:', result);

      if (result.success) {
        console.log('🔐 Authentication successful');
        return { success: true };
      } else {
        let errorMessage = 'Xác thực sinh trắc học thất bại';
        
        if (result.error === 'user_cancel') {
          errorMessage = 'Người dùng đã hủy xác thực';
        } else if (result.error === 'user_fallback') {
          errorMessage = 'Người dùng chọn sử dụng mã PIN';
        } else if (result.error === 'system_cancel') {
          errorMessage = 'Hệ thống đã hủy xác thực';
        } else if (result.error === 'authentication_failed') {
          errorMessage = 'Xác thực thất bại';
        } else if (result.error === 'missing_usage_description') {
          errorMessage = 'Face ID chưa được cấu hình (cần development build)';
        }

        console.log('🔐 Authentication failed:', errorMessage);
        return { success: false, error: errorMessage };
      }
    } catch (error) {
      console.error('Biometric authentication error:', error);
      return { 
        success: false, 
        error: 'Có lỗi xảy ra khi xác thực sinh trắc học' 
      };
    }
  }

  /**
   * Lấy tên loại sinh trắc học
   */
  getBiometricTypeName(types: LocalAuthentication.AuthenticationType[]): string {
    if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
      return 'Face ID';
    } else if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
      return 'Vân tay';
    } else if (types.includes(LocalAuthentication.AuthenticationType.IRIS)) {
      return 'Mống mắt';
    }
    return 'Sinh trắc học';
  }

  /**
   * Tăng số lần đăng nhập thất bại
   */
  private async incrementFailedAttempts(): Promise<void> {
    try {
      const currentAttempts = await this.getFailedAttempts();
      await SecureStore.setItemAsync(
        AuthService.FAILED_ATTEMPTS_KEY, 
        (currentAttempts + 1).toString()
      );
    } catch (error) {
      console.error('Increment failed attempts error:', error);
    }
  }

  /**
   * Lấy số lần đăng nhập thất bại
   */
  private async getFailedAttempts(): Promise<number> {
    try {
      const attempts = await SafeSecureStore.getItemAsync(AuthService.FAILED_ATTEMPTS_KEY);
      return attempts ? parseInt(attempts, 10) : 0;
    } catch (error) {
      console.error('Get failed attempts error:', error);
      return 0;
    }
  }

  /**
   * Xóa tất cả dữ liệu ví khi vượt quá số lần đăng nhập
   */
  private async clearAllWalletData(): Promise<void> {
    try {
      // Xóa tất cả dữ liệu liên quan đến ví
      const keysToDelete = [
        AuthService.PIN_KEY,
        AuthService.BIOMETRIC_KEY,
        AuthService.FAILED_ATTEMPTS_KEY,
        'finan_private_key',
        'finan_wallet_id',
        'finan_wallet_address',
        'finan_wallet_mnemonic',
        // Thêm các key khác nếu cần
      ];

      for (const key of keysToDelete) {
        try {
          await SecureStore.deleteItemAsync(key);
        } catch (error) {
          // Ignore errors khi xóa key không tồn tại
          console.log(`Key ${key} not found, skipping...`);
        }
      }

      console.log('All wallet data cleared due to too many failed attempts');
    } catch (error) {
      console.error('Clear wallet data error:', error);
    }
  }

  /**
   * Xóa tất cả dữ liệu authentication (dùng khi logout)
   */
  async clearAuthData(): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(AuthService.PIN_KEY);
      await SecureStore.deleteItemAsync(AuthService.BIOMETRIC_KEY);
      await SecureStore.deleteItemAsync(AuthService.FAILED_ATTEMPTS_KEY);
    } catch (error) {
      console.error('Clear auth data error:', error);
    }
  }

  /**
   * Validate PIN format (4-6 chữ số)
   */
  validatePinFormat(pin: string): { valid: boolean; error?: string } {
    if (!pin || pin.length < 4 || pin.length > 6) {
      return { 
        valid: false, 
        error: 'Mã PIN phải có từ 4 đến 6 chữ số' 
      };
    }

    if (!/^\d+$/.test(pin)) {
      return { 
        valid: false, 
        error: 'Mã PIN chỉ được chứa các chữ số' 
      };
    }

    return { valid: true };
  }
}
