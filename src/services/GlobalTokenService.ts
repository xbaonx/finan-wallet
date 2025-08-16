import { WalletBalance } from '../domain/entities/token_entity';
import { TokenRepository } from '../domain/repositories/token_repository';
import { WalletRepository } from '../domain/repositories/wallet_repository';

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
  
  private constructor(
    tokenRepository: TokenRepository,
    walletRepository: WalletRepository
  ) {
    this.tokenRepository = tokenRepository;
    this.walletRepository = walletRepository;
    
    // Tự động làm mới cache theo định kỳ
    setInterval(() => this.refreshCache(), 300000); // mỗi 5 phút
  }
  
  /**
   * Lấy instance duy nhất của GlobalTokenService
   */
  public static getInstance(
    tokenRepository?: TokenRepository,
    walletRepository?: WalletRepository
  ): GlobalTokenService {
    if (!GlobalTokenService.instance) {
      if (!tokenRepository || !walletRepository) {
        throw new Error('TokenRepository and WalletRepository are required for first initialization');
      }
      GlobalTokenService.instance = new GlobalTokenService(tokenRepository, walletRepository);
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
        console.log('📦 GlobalTokenService: Lấy dữ liệu token từ cache (Age: ' + Math.round((now - this.lastFetchTime)/1000) + ' giây)');
        console.log('🔄 GlobalTokenService: Thời điểm lấy dữ liệu gần nhất: ' + new Date(this.lastFetchTime).toLocaleTimeString());
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
   * Lấy dữ liệu số dư token từ cache hoặc đợi nếu đang có request khác
   * Hàm này không gây ra API call nếu không cần thiết và sẽ đợi dữ liệu từ request khác
   * @param timeout Thời gian tối đa để đợi (ms)
   * @returns WalletBalance hoặc null nếu quá hạn
   */
  public async getWalletBalanceOrWait(timeout = 5000): Promise<WalletBalance | null> {
    try {
      // Lấy địa chỉ ví hiện tại
      const wallet = await this.walletRepository.getWallet();
      if (!wallet) return null;
      
      const now = Date.now();
      const walletAddress = wallet.address;
      
      // Nếu địa chỉ ví thay đổi, cần làm mới dữ liệu
      if (this.lastWalletAddress !== walletAddress) {
        this.lastWalletAddress = walletAddress;
        return this.getWalletBalance(true);
      }
      
      // Nếu đã có dữ liệu trong cache và còn hạn, trả về ngay
      if (this.walletBalance && (now - this.lastFetchTime < this.cacheValidityMs)) {
        console.log('📦 GlobalTokenService: Lấy dữ liệu token từ cache (Age: ' + Math.round((now - this.lastFetchTime)/1000) + ' giây)');
        return this.walletBalance;
      }
      
      // Nếu đang fetch, đợi hoàn thành
      if (this.isFetching) {
        console.log('⏳ GlobalTokenService: getWalletBalanceOrWait đang chờ dữ liệu được fetch bởi request khác...');
        return new Promise((resolve) => {
          let timeoutId: NodeJS.Timeout;
          
          // Tạo listener tạm thời
          const tempListener = () => {
            clearTimeout(timeoutId);
            this.removeListener(tempListener);
            resolve(this.walletBalance);
          };
          
          this.addListener(tempListener);
          
          // Timeout safety
          timeoutId = setTimeout(() => {
            this.removeListener(tempListener);
            console.log('⌛ GlobalTokenService: Hết thời gian chờ, trả về dữ liệu hiện có');
            resolve(this.walletBalance); // Trả về dữ liệu hiện có, kể cả null
          }, timeout);
        });
      }
      
      // Nếu không có dữ liệu và không ai đang fetch, bắt đầu fetch mới
      console.log('🔄 GlobalTokenService: Không có dữ liệu trong cache và không có request đang chờ, bắt đầu fetch mới');
      return this.getWalletBalance(false);
    } catch (error) {
      console.error('❌ GlobalTokenService: Lỗi trong getWalletBalanceOrWait', error);
      return this.walletBalance; // Trả về dữ liệu hiện có, kể cả null
    }
  }
  
  /**
   * Làm mới cache (sau giao dịch hoặc khi cần)
   */
  public async refreshCache(): Promise<void> {
    await this.getWalletBalance(true);
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
