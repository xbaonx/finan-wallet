import { TokenRepository } from '../domain/repositories/token_repository';
import { WalletRepository } from '../domain/repositories/wallet_repository';
import { TokenRepositoryImpl } from '../data/repositories/token_repository_impl';
import { WalletRepositoryImpl } from '../data/repositories/wallet_repository_impl';

// Interface cho container
interface Container {
  register<T>(name: string, instance: T): void;
  resolve<T>(name: string): T;
}

// Cài đặt đơn giản của DI container
class DIContainer implements Container {
  private instances: Record<string, any> = {};

  register<T>(name: string, instance: T): void {
    this.instances[name] = instance;
  }

  resolve<T>(name: string): T {
    if (!this.instances[name]) {
      throw new Error(`Không tìm thấy đối tượng có tên: ${name}`);
    }
    return this.instances[name] as T;
  }
}

// Tạo instance duy nhất của container
export const container = new DIContainer();

// Đăng ký các repository vào container
// Các lớp cài đặt cụ thể sẽ được đăng ký trong bootstrap của ứng dụng
let tokenRepoInstance: TokenRepository | null = null;
let walletRepoInstance: WalletRepository | null = null;

// Đăng ký repository lazily (chỉ khi cần)
export function registerRepositories(
  tokenRepository?: TokenRepository,
  walletRepository?: WalletRepository
): void {
  // Nếu có instance được truyền vào, sử dụng chúng
  if (tokenRepository) {
    tokenRepoInstance = tokenRepository;
    container.register('tokenRepository', tokenRepository);
  }
  
  if (walletRepository) {
    walletRepoInstance = walletRepository;
    container.register('walletRepository', walletRepository);
  }
  
  // Nếu chưa có, tạo mới instance và đăng ký
  if (!tokenRepoInstance && !container.resolve('tokenRepository')) {
    tokenRepoInstance = new TokenRepositoryImpl();
    container.register('tokenRepository', tokenRepoInstance);
  }
  
  if (!walletRepoInstance && !container.resolve('walletRepository')) {
    walletRepoInstance = new WalletRepositoryImpl();
    container.register('walletRepository', walletRepoInstance);
  }
}
