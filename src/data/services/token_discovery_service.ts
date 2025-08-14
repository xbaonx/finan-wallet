import AsyncStorage from '@react-native-async-storage/async-storage';
import { GlobalTokenService } from '../../services/GlobalTokenService';

export interface TokenInfo {
  address: string | null;
  symbol: string;
  name: string;
  decimals: number;
  chainId: number;
  chainName: string;
}

export interface BalanceSnapshot {
  tokenAddress: string | null;
  balance: string;
  timestamp: number;
}

/**
 * Token Discovery Service - Sử dụng Moralis API để tìm tokens user có
 * Chạy 1 lần/ngày để update danh sách tokens cần monitor
 */
export class TokenDiscoveryService {
  private static readonly STORAGE_KEY = 'discoveredTokens';
  private static readonly BALANCE_SNAPSHOT_KEY = 'balanceSnapshots';
  
  /**
   * Discover tokens user có balance > 0 sử dụng existing GlobalTokenService
   */
  async discoverUserTokens(walletAddress: string): Promise<TokenInfo[]> {
    try {
      console.log('🔍 TokenDiscoveryService: Discovering tokens via Moralis...');
      
      // Reuse existing GlobalTokenService để tận dụng Moralis API
      const tokenService = GlobalTokenService.getInstance();
      const walletBalance = await tokenService.getWalletBalance(true); // Force refresh
      
      if (!walletBalance) {
        console.warn('⚠️ No wallet balance found');
        return [];
      }
      
      // Extract tokens để monitor (bao gồm native token)
      const tokensToMonitor: TokenInfo[] = [];
      
      // Add native token (BNB)
      if (walletBalance.nativeToken && parseFloat(walletBalance.nativeToken.balance) > 0) {
        tokensToMonitor.push({
          address: null, // Native token
          symbol: walletBalance.nativeToken.symbol,
          name: walletBalance.nativeToken.name,
          decimals: walletBalance.nativeToken.decimals,
          chainId: 56, // BSC
          chainName: 'BSC'
        });
      }
      
      // Add ERC20/BEP20 tokens
      for (const token of walletBalance.tokens) {
        if (parseFloat(token.balance) > 0) {
          tokensToMonitor.push({
            address: token.address,
            symbol: token.symbol,
            name: token.name,
            decimals: token.decimals || 18,
            chainId: token.chainId || 56,
            chainName: token.chainName || 'BSC'
          });
        }
      }
      
      // Lưu vào storage để BalanceMonitoringService dùng
      await AsyncStorage.setItem(
        TokenDiscoveryService.STORAGE_KEY, 
        JSON.stringify(tokensToMonitor)
      );
      
      // Lưu balance snapshots ban đầu
      await this.saveInitialBalanceSnapshots(walletBalance);
      
      console.log(`✅ TokenDiscoveryService: Discovered ${tokensToMonitor.length} tokens to monitor`);
      console.log('📋 Tokens:', tokensToMonitor.map(t => `${t.symbol} (${t.chainName})`).join(', '));
      
      return tokensToMonitor;
      
    } catch (error) {
      console.error('❌ TokenDiscoveryService: Error discovering tokens:', error);
      return [];
    }
  }
  
  /**
   * Lưu balance snapshots ban đầu để so sánh
   */
  private async saveInitialBalanceSnapshots(walletBalance: any) {
    try {
      const snapshots: BalanceSnapshot[] = [];
      const timestamp = Date.now();
      
      // Native token snapshot
      if (walletBalance.nativeToken) {
        snapshots.push({
          tokenAddress: null,
          balance: walletBalance.nativeToken.balance,
          timestamp
        });
      }
      
      // ERC20 tokens snapshots
      for (const token of walletBalance.tokens) {
        snapshots.push({
          tokenAddress: token.address,
          balance: token.balance,
          timestamp
        });
      }
      
      await AsyncStorage.setItem(
        TokenDiscoveryService.BALANCE_SNAPSHOT_KEY,
        JSON.stringify(snapshots)
      );
      
      console.log(`💾 Saved ${snapshots.length} initial balance snapshots`);
      
    } catch (error) {
      console.error('❌ Error saving balance snapshots:', error);
    }
  }
  
  /**
   * Lấy danh sách tokens đã discover từ storage
   */
  static async getDiscoveredTokens(): Promise<TokenInfo[]> {
    try {
      const stored = await AsyncStorage.getItem(TokenDiscoveryService.STORAGE_KEY);
      if (!stored) return [];
      
      return JSON.parse(stored);
    } catch (error) {
      console.error('❌ Error getting discovered tokens:', error);
      return [];
    }
  }
  
  /**
   * Lấy balance snapshots từ storage
   */
  static async getBalanceSnapshots(): Promise<BalanceSnapshot[]> {
    try {
      const stored = await AsyncStorage.getItem(TokenDiscoveryService.BALANCE_SNAPSHOT_KEY);
      if (!stored) return [];
      
      return JSON.parse(stored);
    } catch (error) {
      console.error('❌ Error getting balance snapshots:', error);
      return [];
    }
  }
  
  /**
   * Update balance snapshot cho 1 token
   */
  static async updateBalanceSnapshot(tokenAddress: string | null, newBalance: string) {
    try {
      const snapshots = await TokenDiscoveryService.getBalanceSnapshots();
      const index = snapshots.findIndex(s => s.tokenAddress === tokenAddress);
      
      if (index >= 0) {
        snapshots[index] = {
          tokenAddress,
          balance: newBalance,
          timestamp: Date.now()
        };
      } else {
        snapshots.push({
          tokenAddress,
          balance: newBalance,
          timestamp: Date.now()
        });
      }
      
      await AsyncStorage.setItem(
        TokenDiscoveryService.BALANCE_SNAPSHOT_KEY,
        JSON.stringify(snapshots)
      );
      
    } catch (error) {
      console.error('❌ Error updating balance snapshot:', error);
    }
  }
}
