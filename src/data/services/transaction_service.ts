import { ethers } from 'ethers';
import { ServiceLocator } from '../../core/di/service_locator';
import { GetWalletUseCase, GetWalletCredentialsUseCase } from '../../domain/usecases/wallet_usecases';

export interface SendTransactionRequest {
  toAddress: string;
  amount: string;
  tokenAddress?: string; // undefined for ETH, address for ERC20
  gasPrice?: string;
  gasLimit?: string;
}

export interface TransactionResult {
  hash: string;
  success: boolean;
  error?: string;
}

export interface TransactionHistory {
  hash: string;
  from: string;
  to: string;
  value: string;
  tokenSymbol: string;
  timestamp: number;
  status: 'pending' | 'success' | 'failed';
  type: 'send' | 'receive';
}

export class TransactionService {
  private getWalletUseCase: GetWalletUseCase;
  private getWalletCredentialsUseCase: GetWalletCredentialsUseCase;
  private provider: ethers.JsonRpcProvider | null = null;

  constructor() {
    this.getWalletUseCase = ServiceLocator.get('GetWalletUseCase') as GetWalletUseCase;
    this.getWalletCredentialsUseCase = ServiceLocator.get('GetWalletCredentialsUseCase') as GetWalletCredentialsUseCase;
  }

  private async getProvider(): Promise<ethers.JsonRpcProvider> {
    if (!this.provider) {
      try {
        this.provider = new ethers.JsonRpcProvider('https://cloudflare-eth.com');
        await this.provider.getNetwork();
      } catch (error) {
        console.warn('Primary RPC failed, trying fallback:', error);
        try {
          this.provider = new ethers.JsonRpcProvider('https://rpc.ankr.com/eth');
          await this.provider.getNetwork();
        } catch (fallbackError) {
          console.warn('Fallback RPC also failed:', fallbackError);
          this.provider = new ethers.JsonRpcProvider('https://eth.llamarpc.com');
        }
      }
    }
    return this.provider;
  }

  private async getWalletWithPrivateKey(): Promise<ethers.Wallet | null> {
    try {
      const wallet = await this.getWalletUseCase.execute();
      if (!wallet) {
        throw new Error('Wallet không tồn tại');
      }

      const credentials = await this.getWalletCredentialsUseCase.execute(wallet.id);
      if (!credentials) {
        throw new Error('Không thể lấy thông tin đăng nhập ví');
      }

      const provider = await this.getProvider();
      return new ethers.Wallet(credentials.privateKey, provider);
    } catch (error: any) {
      console.error('Get wallet with private key error:', error);
      return null;
    }
  }

  /**
   * Gửi ETH hoặc ERC20 token
   */
  async sendTransaction(request: SendTransactionRequest): Promise<TransactionResult> {
    try {
      const wallet = await this.getWalletWithPrivateKey();
      
      if (!wallet) {
        throw new Error('Wallet không được khởi tạo');
      }

      let transaction: any;

      if (request.tokenAddress) {
        // Gửi ERC20 token
        const tokenContract = new ethers.Contract(
          request.tokenAddress,
          [
            'function transfer(address to, uint256 amount) returns (bool)',
            'function decimals() view returns (uint8)'
          ],
          wallet
        );

        const decimals = await tokenContract.decimals();
        const amount = ethers.parseUnits(request.amount, decimals);

        transaction = await tokenContract.transfer(request.toAddress, amount, {
          gasPrice: request.gasPrice ? ethers.parseUnits(request.gasPrice, 'gwei') : undefined,
          gasLimit: request.gasLimit ? BigInt(request.gasLimit) : undefined,
        });
      } else {
        // Gửi ETH
        const amount = ethers.parseEther(request.amount);
        
        transaction = await wallet.sendTransaction({
          to: request.toAddress,
          value: amount,
          gasPrice: request.gasPrice ? ethers.parseUnits(request.gasPrice, 'gwei') : undefined,
          gasLimit: request.gasLimit ? BigInt(request.gasLimit) : undefined,
        });
      }

      console.log('Transaction sent:', transaction.hash);
      
      return {
        hash: transaction.hash,
        success: true
      };

    } catch (error: any) {
      console.error('Send transaction error:', error);
      return {
        hash: '',
        success: false,
        error: error.message || 'Gửi giao dịch thất bại'
      };
    }
  }

  /**
   * Ước tính gas fee cho giao dịch
   */
  async estimateGasFee(request: SendTransactionRequest): Promise<{
    gasLimit: string;
    gasPrice: string;
    totalFee: string;
  }> {
    try {
      const provider = await this.getProvider();
      const wallet = await this.getWalletWithPrivateKey();
      
      if (!wallet) {
        throw new Error('Wallet không được khởi tạo');
      }

      let gasLimit: bigint;
      
      if (request.tokenAddress) {
        // Ước tính gas cho ERC20 transfer
        const tokenContract = new ethers.Contract(
          request.tokenAddress,
          [
            'function transfer(address to, uint256 amount) returns (bool)',
            'function decimals() view returns (uint8)'
          ],
          wallet
        );

        const decimals = await tokenContract.decimals();
        const amount = ethers.parseUnits(request.amount, decimals);
        
        gasLimit = await tokenContract.transfer.estimateGas(request.toAddress, amount);
      } else {
        // Ước tính gas cho ETH transfer
        const amount = ethers.parseEther(request.amount);
        
        gasLimit = await provider.estimateGas({
          to: request.toAddress,
          value: amount,
        });
      }

      const feeData = await provider.getFeeData();
      const gasPrice = feeData.gasPrice || ethers.parseUnits('20', 'gwei');
      
      const totalFee = gasLimit * gasPrice;

      return {
        gasLimit: gasLimit.toString(),
        gasPrice: ethers.formatUnits(gasPrice, 'gwei'),
        totalFee: ethers.formatEther(totalFee)
      };

    } catch (error: any) {
      console.error('Estimate gas error:', error);
      throw new Error('Không thể ước tính phí gas: ' + error.message);
    }
  }

  /**
   * Kiểm tra trạng thái giao dịch
   */
  async getTransactionStatus(hash: string): Promise<{
    status: 'pending' | 'success' | 'failed';
    confirmations: number;
  }> {
    try {
      const provider = await this.getProvider();
      const receipt = await provider.getTransactionReceipt(hash);
      
      if (!receipt) {
        return { status: 'pending', confirmations: 0 };
      }

      const currentBlock = await provider.getBlockNumber();
      const confirmations = currentBlock - receipt.blockNumber;

      return {
        status: receipt.status === 1 ? 'success' : 'failed',
        confirmations
      };

    } catch (error: any) {
      console.error('Get transaction status error:', error);
      return { status: 'failed', confirmations: 0 };
    }
  }

  /**
   * Lấy lịch sử giao dịch
   */
  async getTransactionHistory(address: string, limit: number = 20): Promise<TransactionHistory[]> {
    try {
      // Note: Để lấy full transaction history, cần sử dụng Etherscan API hoặc Moralis API
      // Ở đây chỉ là placeholder implementation
      console.log(`Getting transaction history for ${address}, limit: ${limit}`);
      
      return [];

    } catch (error: any) {
      console.error('Get transaction history error:', error);
      return [];
    }
  }

  /**
   * Validate địa chỉ Ethereum
   */
  isValidAddress(address: string): boolean {
    try {
      return ethers.isAddress(address);
    } catch {
      return false;
    }
  }

  /**
   * Format địa chỉ để hiển thị (rút gọn)
   */
  formatAddress(address: string): string {
    if (!this.isValidAddress(address)) return address;
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  }
}
