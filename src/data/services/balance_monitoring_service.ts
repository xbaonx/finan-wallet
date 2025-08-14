import { ethers } from 'ethers';
import { TokenInfo, BalanceSnapshot, TokenDiscoveryService } from './token_discovery_service';

export interface BalanceChange {
  token: TokenInfo;
  oldBalance: string;
  newBalance: string;
  difference: number;
  timestamp: number;
  type: 'increase' | 'decrease';
}

/**
 * Balance Monitoring Service - Sử dụng RPC calls để monitor balance changes
 * Chạy mỗi 30s để check balance của discovered tokens
 */
export class BalanceMonitoringService {
  private bscProvider: ethers.JsonRpcProvider;
  private ethProvider: ethers.JsonRpcProvider;
  
  constructor() {
    // BSC RPC endpoint
    this.bscProvider = new ethers.JsonRpcProvider('https://bsc-dataseed1.binance.org/');
    
    // Ethereum RPC endpoint  
    this.ethProvider = new ethers.JsonRpcProvider('https://cloudflare-eth.com');
  }
  
  /**
   * Monitor balance changes cho tất cả discovered tokens
   */
  async monitorBalanceChanges(walletAddress: string): Promise<BalanceChange[]> {
    try {
      console.log('📊 BalanceMonitoringService: Monitoring balance changes via RPC...');
      
      // Lấy danh sách tokens cần monitor
      const discoveredTokens = await TokenDiscoveryService.getDiscoveredTokens();
      if (discoveredTokens.length === 0) {
        console.log('⚠️ No discovered tokens to monitor');
        return [];
      }
      
      // Lấy balance snapshots cũ
      const oldSnapshots = await TokenDiscoveryService.getBalanceSnapshots();
      
      const changes: BalanceChange[] = [];
      
      // Check balance cho từng token
      for (const token of discoveredTokens) {
        try {
          const newBalance = await this.getTokenBalance(walletAddress, token);
          const oldSnapshot = oldSnapshots.find(s => s.tokenAddress === token.address);
          
          if (oldSnapshot && newBalance !== oldSnapshot.balance) {
            const oldBalanceNum = parseFloat(oldSnapshot.balance);
            const newBalanceNum = parseFloat(newBalance);
            const difference = newBalanceNum - oldBalanceNum;
            
            // Chỉ notify nếu thay đổi > 0.0001 (tránh noise từ gas fees nhỏ)
            if (Math.abs(difference) > 0.0001) {
              changes.push({
                token,
                oldBalance: oldSnapshot.balance,
                newBalance,
                difference,
                timestamp: Date.now(),
                type: difference > 0 ? 'increase' : 'decrease'
              });
              
              console.log(`💰 Balance change detected: ${token.symbol} ${difference > 0 ? '+' : ''}${difference.toFixed(6)}`);
              
              // Update snapshot
              await TokenDiscoveryService.updateBalanceSnapshot(token.address, newBalance);
            }
          } else if (!oldSnapshot) {
            // Lần đầu check token này, lưu snapshot
            await TokenDiscoveryService.updateBalanceSnapshot(token.address, newBalance);
            console.log(`💾 Saved initial snapshot for ${token.symbol}: ${newBalance}`);
          }
          
        } catch (error) {
          console.warn(`⚠️ Failed to check ${token.symbol} balance:`, error instanceof Error ? error.message : String(error));
        }
      }
      
      if (changes.length > 0) {
        console.log(`✅ Detected ${changes.length} balance changes`);
      } else {
        console.log('📊 No balance changes detected');
      }
      
      return changes;
      
    } catch (error) {
      console.error('❌ BalanceMonitoringService: Error monitoring balance changes:', error);
      return [];
    }
  }
  
  /**
   * Lấy balance của 1 token cụ thể qua RPC
   */
  private async getTokenBalance(walletAddress: string, token: TokenInfo): Promise<string> {
    try {
      // Chọn provider dựa trên chainId
      const provider = token.chainId === 56 ? this.bscProvider : this.ethProvider;
      
      if (!token.address) {
        // Native token (BNB/ETH)
        const balance = await provider.getBalance(walletAddress);
        return ethers.formatEther(balance);
      } else {
        // ERC20/BEP20 token
        const contract = new ethers.Contract(
          token.address,
          [
            'function balanceOf(address owner) view returns (uint256)',
            'function decimals() view returns (uint8)'
          ],
          provider
        );
        
        const balance = await contract.balanceOf(walletAddress);
        
        // Sử dụng decimals từ token info hoặc lấy từ contract
        let decimals = token.decimals;
        if (!decimals) {
          try {
            decimals = await contract.decimals();
          } catch {
            decimals = 18; // Default
          }
        }
        
        return ethers.formatUnits(balance, decimals);
      }
      
    } catch (error) {
      console.error(`❌ Error getting balance for ${token.symbol}:`, error);
      throw error;
    }
  }
  
  /**
   * Get balance của 1 token cụ thể (public method)
   */
  async getTokenBalancePublic(walletAddress: string, token: TokenInfo): Promise<string> {
    return this.getTokenBalance(walletAddress, token);
  }
  
  /**
   * Force refresh tất cả balance snapshots
   */
  async refreshAllBalanceSnapshots(walletAddress: string): Promise<void> {
    try {
      console.log('🔄 Refreshing all balance snapshots...');
      
      const discoveredTokens = await TokenDiscoveryService.getDiscoveredTokens();
      
      for (const token of discoveredTokens) {
        try {
          const balance = await this.getTokenBalance(walletAddress, token);
          await TokenDiscoveryService.updateBalanceSnapshot(token.address, balance);
          console.log(`✅ Refreshed ${token.symbol}: ${balance}`);
        } catch (error) {
          console.warn(`⚠️ Failed to refresh ${token.symbol}:`, error instanceof Error ? error.message : String(error));
        }
      }
      
      console.log('✅ All balance snapshots refreshed');
      
    } catch (error) {
      console.error('❌ Error refreshing balance snapshots:', error);
    }
  }
}
