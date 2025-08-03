import { AuthService, AuthResult, BiometricInfo } from '../../data/services/auth_service';

export class SetupPinUseCase {
  constructor(private authService: AuthService) {}

  async execute(pin: string, confirmPin: string): Promise<AuthResult> {
    // Validate PIN format
    const validation = this.authService.validatePinFormat(pin);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    // Check if PINs match
    if (pin !== confirmPin) {
      return { success: false, error: 'Mã PIN không khớp, vui lòng thử lại' };
    }

    // Save PIN
    const saved = await this.authService.savePin(pin);
    if (saved) {
      return { success: true };
    } else {
      return { success: false, error: 'Không thể lưu mã PIN, vui lòng thử lại' };
    }
  }
}

export class VerifyPinUseCase {
  constructor(private authService: AuthService) {}

  async execute(pin: string): Promise<AuthResult> {
    return await this.authService.verifyPin(pin);
  }
}

export class SetupBiometricUseCase {
  constructor(private authService: AuthService) {}

  async execute(enabled: boolean): Promise<AuthResult> {
    if (enabled) {
      // Kiểm tra thiết bị có hỗ trợ sinh trắc học không
      const biometricInfo = await this.authService.getBiometricInfo();
      
      if (!biometricInfo.isAvailable) {
        return { 
          success: false, 
          error: 'Thiết bị không hỗ trợ xác thực sinh trắc học' 
        };
      }

      if (!biometricInfo.isEnrolled) {
        return { 
          success: false, 
          error: 'Vui lòng thiết lập sinh trắc học trong Cài đặt thiết bị trước' 
        };
      }

      // Test authentication để đảm bảo hoạt động
      const testResult = await this.authService.authenticateWithBiometric();
      if (!testResult.success) {
        return { 
          success: false, 
          error: 'Không thể xác thực sinh trắc học: ' + testResult.error 
        };
      }
    }

    // Lưu trạng thái
    const saved = await this.authService.setBiometricEnabled(enabled);
    if (saved) {
      return { success: true };
    } else {
      return { 
        success: false, 
        error: 'Không thể lưu cài đặt sinh trắc học' 
      };
    }
  }
}

export class AuthenticateUseCase {
  constructor(private authService: AuthService) {}

  async executeWithBiometric(): Promise<AuthResult> {
    const isBiometricEnabled = await this.authService.isBiometricEnabled();
    
    if (!isBiometricEnabled) {
      return { 
        success: false, 
        error: 'Sinh trắc học chưa được bật' 
      };
    }

    return await this.authService.authenticateWithBiometric();
  }

  async executeWithPin(pin: string): Promise<AuthResult> {
    return await this.authService.verifyPin(pin);
  }
}

export class GetBiometricInfoUseCase {
  constructor(private authService: AuthService) {}

  async execute(): Promise<BiometricInfo & { isEnabled: boolean; typeName: string }> {
    const biometricInfo = await this.authService.getBiometricInfo();
    const isEnabled = await this.authService.isBiometricEnabled();
    const typeName = this.authService.getBiometricTypeName(biometricInfo.supportedTypes);

    return {
      ...biometricInfo,
      isEnabled,
      typeName
    };
  }
}

export class CheckAuthStatusUseCase {
  constructor(private authService: AuthService) {}

  async execute(): Promise<{
    hasPinSet: boolean;
    isBiometricEnabled: boolean;
    needsAuthentication: boolean;
  }> {
    const hasPinSet = await this.authService.hasPinSet();
    const isBiometricEnabled = await this.authService.isBiometricEnabled();
    
    return {
      hasPinSet,
      isBiometricEnabled,
      needsAuthentication: hasPinSet // Nếu có PIN thì cần authentication
    };
  }
}

export class LogoutUseCase {
  constructor(private authService: AuthService) {}

  async execute(): Promise<void> {
    await this.authService.clearAuthData();
  }
}
