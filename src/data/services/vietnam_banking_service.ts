import { Linking, Alert } from 'react-native';

// Tỷ giá USD/VND (sẽ được cập nhật từ API)
const USD_TO_VND_RATE = 24500; // Tỷ giá tham khảo

// Thông tin các ngân hàng Việt Nam
export interface BankInfo {
  id: string;
  name: string;
  shortName: string;
  accountNumber: string;
  accountName: string;
  qrPrefix: string;
  deepLinkScheme?: string;
  logo: string;
}

export const VIETNAM_BANKS: BankInfo[] = [
  {
    id: 'vietcombank',
    name: 'Ngân hàng TMCP Ngoại thương Việt Nam',
    shortName: 'Vietcombank',
    accountNumber: '1234567890',
    accountName: 'FINAN CRYPTO WALLET',
    qrPrefix: 'https://img.vietqr.io/image/970436-1234567890-compact2.png',
    deepLinkScheme: 'vcbdigibank://',
    logo: '🏦'
  },
  {
    id: 'techcombank',
    name: 'Ngân hàng TMCP Kỹ thương Việt Nam',
    shortName: 'Techcombank',
    accountNumber: '9876543210',
    accountName: 'FINAN CRYPTO WALLET',
    qrPrefix: 'https://img.vietqr.io/image/970407-9876543210-compact2.png',
    deepLinkScheme: 'tcb://',
    logo: '🏛️'
  },
  {
    id: 'vietinbank',
    name: 'Ngân hàng TMCP Công thương Việt Nam',
    shortName: 'VietinBank',
    accountNumber: '5555666677',
    accountName: 'FINAN CRYPTO WALLET',
    qrPrefix: 'https://img.vietqr.io/image/970415-5555666677-compact2.png',
    deepLinkScheme: 'vietinbank://',
    logo: '🏪'
  },
  {
    id: 'bidv',
    name: 'Ngân hàng TMCP Đầu tư và Phát triển Việt Nam',
    shortName: 'BIDV',
    accountNumber: '1111222233',
    accountName: 'FINAN CRYPTO WALLET',
    qrPrefix: 'https://img.vietqr.io/image/970418-1111222233-compact2.png',
    deepLinkScheme: 'bidv://',
    logo: '🏢'
  },
  {
    id: 'agribank',
    name: 'Ngân hàng Nông nghiệp và Phát triển Nông thôn Việt Nam',
    shortName: 'Agribank',
    accountNumber: '3333444455',
    accountName: 'FINAN CRYPTO WALLET',
    qrPrefix: 'https://img.vietqr.io/image/970405-3333444455-compact2.png',
    deepLinkScheme: 'agribank://',
    logo: '🌾'
  }
];

export interface DepositRequest {
  usdtAmount: number;
  vndAmount: number;
  bankId: string;
  transactionId: string;
  userWalletAddress: string;
}

export class VietnamBankingService {
  private static instance: VietnamBankingService;
  private currentExchangeRate: number = USD_TO_VND_RATE;

  public static getInstance(): VietnamBankingService {
    if (!VietnamBankingService.instance) {
      VietnamBankingService.instance = new VietnamBankingService();
    }
    return VietnamBankingService.instance;
  }

  // Lấy tỷ giá USD/VND từ API
  async getExchangeRate(): Promise<number> {
    try {
      // Có thể tích hợp với API tỷ giá thực tế như Vietcombank, SBV, etc.
      const response = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
      const data = await response.json();
      const vndRate = data.rates.VND;
      
      if (vndRate) {
        this.currentExchangeRate = vndRate;
        console.log('💱 Cập nhật tỷ giá USD/VND:', vndRate);
        return vndRate;
      }
    } catch (error) {
      console.error('❌ Lỗi lấy tỷ giá:', error);
    }
    
    // Fallback về tỷ giá mặc định
    return this.currentExchangeRate;
  }

  // Tính toán số tiền VND từ USDT
  calculateVNDAmount(usdtAmount: number): number {
    return Math.ceil(usdtAmount * this.currentExchangeRate);
  }

  // Tạo mã giao dịch duy nhất
  generateTransactionId(): string {
    const timestamp = Date.now().toString();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `FIN${timestamp.slice(-6)}${random}`;
  }

  // Tạo nội dung chuyển khoản
  generateTransferContent(transactionId: string, usdtAmount: number): string {
    return `NAP ${usdtAmount} USDT ${transactionId}`;
  }

  // Tạo QR Code thanh toán VietQR
  generateVietQRCode(bankInfo: BankInfo, vndAmount: number, content: string): string {
    const baseUrl = 'https://img.vietqr.io/image';
    const bankCode = this.getBankCode(bankInfo.id);
    const accountNumber = bankInfo.accountNumber;
    
    // Format: https://img.vietqr.io/image/{BANK_ID}-{ACCOUNT_NUMBER}-{TEMPLATE}.png?amount={AMOUNT}&addInfo={CONTENT}
    const qrUrl = `${baseUrl}/${bankCode}-${accountNumber}-compact2.png?amount=${vndAmount}&addInfo=${encodeURIComponent(content)}`;
    
    console.log('🔗 Generated VietQR URL:', qrUrl);
    return qrUrl;
  }

  // Lấy mã ngân hàng cho VietQR
  private getBankCode(bankId: string): string {
    const bankCodes: { [key: string]: string } = {
      'vietcombank': '970436',
      'techcombank': '970407',
      'vietinbank': '970415',
      'bidv': '970418',
      'agribank': '970405'
    };
    return bankCodes[bankId] || '970436';
  }

  // Mở ứng dụng ngân hàng với deep link
  async openBankingApp(bankInfo: BankInfo, vndAmount: number, content: string): Promise<boolean> {
    try {
      if (!bankInfo.deepLinkScheme) {
        Alert.alert(
          'Thông báo',
          `Ứng dụng ${bankInfo.shortName} chưa hỗ trợ mở trực tiếp. Vui lòng sao chép thông tin và mở app thủ công.`
        );
        return false;
      }

      // Tạo deep link với thông tin chuyển khoản
      const deepLink = this.buildDeepLink(bankInfo, vndAmount, content);
      
      console.log('🔗 Opening banking app:', deepLink);
      
      const canOpen = await Linking.canOpenURL(deepLink);
      if (canOpen) {
        await Linking.openURL(deepLink);
        return true;
      } else {
        // Fallback: Mở app store để tải app
        Alert.alert(
          'Cài đặt ứng dụng',
          `Vui lòng cài đặt ứng dụng ${bankInfo.shortName} để sử dụng tính năng này.`,
          [
            { text: 'Hủy', style: 'cancel' },
            { text: 'Tải app', onPress: () => this.openAppStore(bankInfo.id) }
          ]
        );
        return false;
      }
    } catch (error) {
      console.error('❌ Lỗi mở ứng dụng ngân hàng:', error);
      Alert.alert('Lỗi', 'Không thể mở ứng dụng ngân hàng. Vui lòng thử lại.');
      return false;
    }
  }

  // Xây dựng deep link cho từng ngân hàng
  private buildDeepLink(bankInfo: BankInfo, vndAmount: number, content: string): string {
    const { id, deepLinkScheme, accountNumber } = bankInfo;
    
    switch (id) {
      case 'vietcombank':
        return `${deepLinkScheme}transfer?account=${accountNumber}&amount=${vndAmount}&content=${encodeURIComponent(content)}`;
      
      case 'techcombank':
        return `${deepLinkScheme}transfer?beneficiary=${accountNumber}&amount=${vndAmount}&memo=${encodeURIComponent(content)}`;
      
      case 'vietinbank':
        return `${deepLinkScheme}transfer?toAccount=${accountNumber}&amount=${vndAmount}&description=${encodeURIComponent(content)}`;
      
      case 'bidv':
        return `${deepLinkScheme}transfer?receiver=${accountNumber}&money=${vndAmount}&note=${encodeURIComponent(content)}`;
      
      case 'agribank':
        return `${deepLinkScheme}transfer?account=${accountNumber}&amount=${vndAmount}&remark=${encodeURIComponent(content)}`;
      
      default:
        return `${deepLinkScheme}transfer`;
    }
  }

  // Mở App Store/Play Store để tải app ngân hàng
  private async openAppStore(bankId: string) {
    const appStoreLinks: { [key: string]: { ios: string; android: string } } = {
      'vietcombank': {
        ios: 'https://apps.apple.com/vn/app/vcb-digibank/id561433133',
        android: 'https://play.google.com/store/apps/details?id=com.VCB'
      },
      'techcombank': {
        ios: 'https://apps.apple.com/vn/app/techcombank-mobile/id1157642536',
        android: 'https://play.google.com/store/apps/details?id=com.techcombank.bb.app'
      },
      'vietinbank': {
        ios: 'https://apps.apple.com/vn/app/vietinbank-ipay/id1100359496',
        android: 'https://play.google.com/store/apps/details?id=com.vietinbank.ipay'
      },
      'bidv': {
        ios: 'https://apps.apple.com/vn/app/bidv-smartbanking/id1156398632',
        android: 'https://play.google.com/store/apps/details?id=com.vnpay.bidv'
      },
      'agribank': {
        ios: 'https://apps.apple.com/vn/app/agribank-e-mobile-banking/id1100359496',
        android: 'https://play.google.com/store/apps/details?id=com.agribank.mobilebanking'
      }
    };

    const links = appStoreLinks[bankId];
    if (links) {
      // Detect platform and open appropriate store
      const storeUrl = links.ios; // Default to iOS, có thể detect platform sau
      await Linking.openURL(storeUrl);
    }
  }

  // Tạo yêu cầu nạp tiền hoàn chỉnh
  createDepositRequest(usdtAmount: number, bankId: string, userWalletAddress: string): DepositRequest {
    const vndAmount = this.calculateVNDAmount(usdtAmount);
    const transactionId = this.generateTransactionId();
    
    return {
      usdtAmount,
      vndAmount,
      bankId,
      transactionId,
      userWalletAddress
    };
  }

  // Lấy thông tin ngân hàng theo ID
  getBankInfo(bankId: string): BankInfo | undefined {
    return VIETNAM_BANKS.find(bank => bank.id === bankId);
  }

  // Lấy danh sách tất cả ngân hàng
  getAllBanks(): BankInfo[] {
    return VIETNAM_BANKS;
  }
}
