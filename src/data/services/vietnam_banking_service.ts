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
  deepLinkScheme: string;
  logo: string;
  logoUrl?: string; // URL logo thật
  autofill?: number; // 1 = hỗ trợ autofill, 0 = không hỗ trợ
}

// Tài khoản nhận tiền (cố định)
export const RECEIVER_BANK: BankInfo = {
  id: 'mb',
  name: 'Ngân hàng TMCP Quân đội',
  shortName: 'MB Bank',
  accountNumber: '0550100078888',
  accountName: 'NGUYEN XUAN BAO',
  qrPrefix: 'https://img.vietqr.io/image/970422-0550100078888-compact2.png',
  deepLinkScheme: 'https://dl.vietqr.io/pay?app=mb',
  logo: '🏦',
  logoUrl: 'https://is2-ssl.mzstatic.com/image/thumb/Purple122/v4/f4/0a/b6/f40ab6a2-e67d-e267-9c46-ae03dfa238a9/AppIcon-0-0-1x_U007emarketing-0-0-0-7-0-0-sRGB-0-0-0-GLES2_U002c0-512MB-85-220-0-0.png/1200x630wa.png',
  autofill: 0
};

// Danh sách ngân hàng để người dùng chọn mở app
export const VIETNAM_BANKS: BankInfo[] = [
  RECEIVER_BANK,
  {
    id: 'vcb',
    name: 'Ngân hàng TMCP Ngoại thương Việt Nam',
    shortName: 'Vietcombank',
    accountNumber: '',
    accountName: '',
    qrPrefix: '',
    deepLinkScheme: 'https://dl.vietqr.io/pay?app=vcb',
    logo: '🏛️',
    logoUrl: 'https://is4-ssl.mzstatic.com/image/thumb/Purple122/v4/c6/c9/ed/c6c9ed04-11f8-7269-fcc3-9609126682c0/AppIcon-1x_U007emarketing-0-7-0-0-85-220.png/1200x630wa.png',
    autofill: 0
  },
  {
    id: 'tcb',
    name: 'Ngân hàng TMCP Kỹ thương Việt Nam',
    shortName: 'Techcombank',
    accountNumber: '',
    accountName: '',
    qrPrefix: '',
    deepLinkScheme: 'https://dl.vietqr.io/pay?app=tcb',
    logo: '🏪',
    logoUrl: 'https://is5-ssl.mzstatic.com/image/thumb/Purple122/v4/b2/b4/d1/b2b4d153-ed9f-aab6-996c-205c583c1339/AppIcon-0-0-1x_U007emarketing-0-0-0-10-0-0-sRGB-0-0-0-GLES2_U002c0-512MB-85-220-0-0.png/1200x630wa.png',
    autofill: 0
  },
  {
    id: 'icb',
    name: 'Ngân hàng TMCP Công thương Việt Nam',
    shortName: 'VietinBank',
    accountNumber: '',
    accountName: '',
    qrPrefix: '',
    deepLinkScheme: 'https://dl.vietqr.io/pay?app=icb',
    logo: '🏢',
    logoUrl: 'https://is4-ssl.mzstatic.com/image/thumb/Purple112/v4/14/04/b8/1404b8f4-a91f-f8bf-7af5-1a0e59bbdf19/AppIcon-0-0-1x_U007emarketing-0-0-0-7-0-0-sRGB-0-0-0-GLES2_U002c0-512MB-85-220-0-0.png/1200x630wa.png',
    autofill: 0
  },
  {
    id: 'bidv',
    name: 'Ngân hàng TMCP Đầu tư và Phát triển Việt Nam',
    shortName: 'BIDV',
    accountNumber: '',
    accountName: '',
    qrPrefix: '',
    deepLinkScheme: 'https://dl.vietqr.io/pay?app=bidv',
    logo: '🏨',
    logoUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Purple112/v4/88/1b/e6/881be6df-e9b6-8b66-e0fb-2499ac874734/AppIcon-1x_U007emarketing-0-6-0-0-85-220.png/1200x630wa.png',
    autofill: 0
  },
  {
    id: 'vba',
    name: 'Ngân hàng Nông nghiệp và Phát triển Nông thôn Việt Nam',
    shortName: 'Agribank',
    accountNumber: '',
    accountName: '',
    qrPrefix: '',
    deepLinkScheme: 'https://dl.vietqr.io/pay?app=vba',
    logo: '🌾',
    logoUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Purple112/v4/a6/7e/98/a67e98e6-20c2-5f96-c364-f79a9fe03819/AppIcon-1x_U007emarketing-0-5-0-0-85-220.png/1200x630wa.png',
    autofill: 0
  },
  {
    id: 'acb',
    name: 'Ngân hàng TMCP Á Châu',
    shortName: 'ACB',
    accountNumber: '',
    accountName: '',
    qrPrefix: '',
    deepLinkScheme: 'https://dl.vietqr.io/pay?app=acb',
    logo: '🏪',
    logoUrl: 'https://is4-ssl.mzstatic.com/image/thumb/Purple122/v4/a1/ae/1e/a1ae1e68-2d58-92bc-9ec5-42917a59f767/AppIcon-1x_U007emarketing-0-7-0-0-85-220.png/1200x630wa.png',
    autofill: 1
  },
  {
    id: 'vpb',
    name: 'Ngân hàng TMCP Việt Nam Thịnh Vượng',
    shortName: 'VPBank',
    accountNumber: '',
    accountName: '',
    qrPrefix: '',
    deepLinkScheme: 'https://dl.vietqr.io/pay?app=vpb',
    logo: '🏦',
    logoUrl: 'https://is3-ssl.mzstatic.com/image/thumb/Purple122/v4/0f/45/e5/0f45e506-590d-860d-8a0f-61c460d8b6dd/AppIcon-0-0-1x_U007emarketing-0-0-0-7-0-0-sRGB-0-0-0-GLES2_U002c0-512MB-85-220-0-0.png/1200x630wa.png',
    autofill: 0
  },
  {
    id: 'tpb',
    name: 'Ngân hàng TMCP Tiên Phong',
    shortName: 'TPBank',
    accountNumber: '',
    accountName: '',
    qrPrefix: '',
    deepLinkScheme: 'https://dl.vietqr.io/pay?app=tpb',
    logo: '🏛️',
    logoUrl: 'https://is3-ssl.mzstatic.com/image/thumb/Purple122/v4/c3/31/46/c3314678-be31-dda0-621b-ff8f9f100c82/AppIcon-0-0-1x_U007emarketing-0-0-0-7-0-0-sRGB-0-0-0-GLES2_U002c0-512MB-85-220-0-0.png/1200x630wa.png',
    autofill: 0
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
    // Đơn giản hóa: chỉ trả về mã giao dịch theo yêu cầu
    return `${transactionId}`;
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
      'mb': '970422',      // MB Bank
      'vcb': '970436',     // Vietcombank
      'tcb': '970407',     // Techcombank
      'icb': '970415',     // VietinBank
      'bidv': '970418',    // BIDV
      'vba': '970405',     // Agribank
      'acb': '970416',     // ACB
      'vpb': '970432',     // VPBank
      'tpb': '970423'      // TPBank
    };
    return bankCodes[bankId] || '970422'; // Default to MB Bank
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
        
        // Thông báo hướng dẫn cho người dùng dựa trên tính năng autofill
        setTimeout(() => {
          const autofillMessage = bankInfo.autofill === 1 
            ? `${bankInfo.shortName} có thể tự động điền một số thông tin. Vui lòng kiểm tra và hoàn tất giao dịch.`
            : `Vui lòng nhập thủ công thông tin chuyển khoản trong ${bankInfo.shortName}.`;
            
          Alert.alert(
            `Đã mở ${bankInfo.shortName}`,
            `${autofillMessage}\n\n` +
            `📱 STK: ${RECEIVER_BANK.accountNumber}\n` +
            `👤 Tên: ${RECEIVER_BANK.accountName}\n` +
            `💰 Số tiền: ${vndAmount.toLocaleString('vi-VN')} VND\n` +
            `📝 Nội dung: ${content}`,
            [{ text: 'Đã hiểu', style: 'default' }]
          );
        }, 1500);
        
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

  // Xây dựng deep link cho ngân hàng sử dụng VietQR chính thức
  private buildDeepLink(bankInfo: BankInfo, vndAmount: number, content: string): string {
    const { deepLinkScheme, autofill } = bankInfo;
  
    console.log(`🔗 Building VietQR deep link for ${bankInfo.shortName}:`, deepLinkScheme);
    console.log(`🔧 Autofill support: ${autofill ? 'Yes' : 'No'}`);
  
    // Sử dụng VietQR deep link chính thức: https://dl.vietqr.io/pay?app=<bankId>
    // Một số ngân hàng hỗ trợ autofill (OCB, ACB), đa số không hỗ trợ
    // VietQR sẽ điều hướng đến app ngân hàng tương ứng
  
    if (deepLinkScheme.startsWith('https://dl.vietqr.io/pay')) {
      // VietQR deep link chính thức
      // Có thể thêm tham số trong tương lai khi VietQR hỗ trợ autofill đầy đủ
      const fullLink = deepLinkScheme;
      
      console.log(`🔗 VietQR deep link: ${fullLink}`);
      return fullLink;
    }
  
    // Fallback: deep link trực tiếp
    return deepLinkScheme;
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
