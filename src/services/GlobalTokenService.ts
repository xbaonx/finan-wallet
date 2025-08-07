import { WalletBalance } from '../domain/entities/token_entity';
import { TokenRepository } from '../domain/repositories/token_repository';
import { WalletRepository } from '../domain/repositories/wallet_repository';
import { ServiceLocator } from '../core/di/service_locator';

/**
 * Service toàn cục để quản lý dữ liệu token và tối ưu hóa API call
 */
export class GlobalTokenService {
  private static instance: GlobalTokenService;
  
  private walletBalance: WalletBalance | null = null;
  private lastFetchTime: number = 0;
  private readonly cacheValidityMs: number = 60000; // 1 phút
  private readonly tokenRepository: TokenRepository;
  private readonly walletRepository: WalletRepository;
  private listeners: Array<() => void> = [];
  private isFetching = false;
  private lastWalletAddress = '';
  
  private constructor() {
    // Lấy repository từ ServiceLocator
    this.tokenRepository = ServiceLocator.get('TokenRepository');
    this.walletRepository = ServiceLocator.get('WalletRepository');
    
    // Tự động làm mới cache theo định kỳ
    setInterval(() => this.refreshCache(), 300000); // mỗi 5 phút
  }
  
  /**
   * Lấy instance duy nhất của GlobalTokenService
   */
  public static getInstance(): GlobalTokenService {
    if (!GlobalTokenService.instance) {
      GlobalTokenService.instance = new GlobalTokenService();
    }
    return GlobalTokenService.instance;
  }
  
  /**
   * Lấy dữ liệu số dư token, ưu tiên từ cache nếu còn hạn
   * @param forceRefresh Bắt buộc làm mới dữ liệu từ API
   * @returns WalletBalance hoặc null nếu không có ví
   */
  public async getWalletBalance(forceRefresh = false): Promise<WalletBalance | null> {
    try {
      // Lấy địa chỉ ví hiện tại
      const wallet = await this.walletRepository.getWallet();
      if (!wallet) return null;
      
      const now = Date.now();
      const walletAddress = wallet.address;
      
      // Kiểm tra xem địa chỉ ví có thay đổi không
      const walletChanged = this.lastWalletAddress !== walletAddress;
      if (walletChanged) {
        this.lastWalletAddress = walletAddress;
        forceRefresh = true;
      }
      
      // Trả về dữ liệu từ cache nếu hợp lệ
      if (
        this.walletBalance && 
        !forceRefresh && 
        (now - this.lastFetchTime < this.cacheValidityMs)
      ) {
        console.log('📦 GlobalTokenService: Lấy dữ liệu token từ cache');
        return this.walletBalance;
      }
      
      // Tránh nhiều request cùng lúc
      if (this.isFetching) {
        console.log('⏳ GlobalTokenService: Đang có request khác, chờ...');
        return new Promise((resolve) => {
          const checkCache = () => {
            if (!this.isFetching) {
              resolve(this.walletBalance);
            } else {
              setTimeout(checkCache, 100);
            }
          };
          setTimeout(checkCache, 100);
        });
      }
      
      // Gọi API để lấy dữ liệu mới
      this.isFetching = true;
      console.log('🔄 GlobalTokenService: Làm mới dữ liệu token từ API');
      
      try {
        this.walletBalance = await this.tokenRepository.getWalletBalance(walletAddress);
        this.lastFetchTime = now;
        
        // Thông báo cho các listener
        this.notifyListeners();
        return this.walletBalance;
      } catch (error) {
        console.error('❌ GlobalTokenService: Lỗi khi tải dữ liệu token', error);
        throw error;
      } finally {
        this.isFetching = false;
      }
    } catch (error) {
      console.error('❌ GlobalTokenService: Lỗi', error);
      return null;
    }
  }
  
  /**
   * Thêm listener để lắng nghe khi dữ liệu token được cập nhật
   * @param listener Function callback
   */
  public addListener(listener: () => void): void {
    if (!this.listeners.includes(listener)) {
      this.listeners.push(listener);
    }
  }
  
  /**
   * Xóa listener
   * @param listener Function callback đã đăng ký
   */
  public removeListener(listener: () => void): void {
    this.listeners = this.listeners.filter(l => l !== listener);
  }
  
  /**
   * Thông báo cho các listener rằng dữ liệu đã được cập nhật
   */
  private notifyListeners(): void {
    this.listeners.forEach(listener => {
      try {
        listener();
      } catch (error) {
        console.error('❌ GlobalTokenService: Lỗi khi thông báo cho listener', error);
      }
    });
  }
  
  /**
   * Làm mới cache (sau giao dịch hoặc khi cần)
   */
  public async refreshCache(): Promise<void> {
    return this.getWalletBalance(true);
  }
  
  /**
   * Làm mới cache sau khi hoàn thành giao dịch
   * @param transactionHash Hash của giao dịch vừa hoàn thành
   */
  public async refreshAfterTransaction(transactionHash: string): Promise<void> {
    console.log(`🔄 GlobalTokenService: Làm mới dữ liệu sau giao dịch ${transactionHash}`);
    
    // Đợi một chút để blockchain cập nhật số dư
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Làm mới cache
    return this.refreshCache();
  }
}
