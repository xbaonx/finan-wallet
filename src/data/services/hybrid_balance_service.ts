import * as TaskManager from 'expo-task-manager';
import * as BackgroundFetch from 'expo-background-fetch';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { TokenDiscoveryService } from './token_discovery_service';
import { BalanceMonitoringService } from './balance_monitoring_service';
import { NotificationService } from './notification_service';
import { WalletRepository } from '../../domain/repositories/wallet_repository';
import { ServiceLocator } from '../../core/di/service_locator';

const BALANCE_MONITOR_TASK = 'BALANCE_MONITOR_TASK';
const SETTINGS_KEY = 'balanceNotificationSettings';

export interface BalanceNotificationSettings {
  enabled: boolean;
  frequency: number; // milliseconds
  types: ('increase' | 'decrease' | 'all')[];
  quietHours: {
    enabled: boolean;
    start: string; // HH:MM format
    end: string;   // HH:MM format
  };
}

const DEFAULT_SETTINGS: BalanceNotificationSettings = {
  enabled: true,
  frequency: 30000, // 30 seconds
  types: ['all'],
  quietHours: {
    enabled: false,
    start: '22:00',
    end: '08:00'
  }
};

/**
 * Hybrid Balance Service - Orchestrator chính cho balance notification system
 * Kết hợp TokenDiscoveryService (Moralis) + BalanceMonitoringService (RPC) + NotificationService
 */
export class HybridBalanceService {
  private static instance: HybridBalanceService;
  private tokenDiscoveryService: TokenDiscoveryService;
  private balanceMonitoringService: BalanceMonitoringService;
  private notificationService: NotificationService;
  private walletRepository: WalletRepository;
  private isInitialized = false;
  private isMonitoring = false;
  private discoveryInterval: NodeJS.Timeout | null = null;
  
  private constructor() {
    const tokenRepository = ServiceLocator.get('TokenRepository');
    const walletRepository = ServiceLocator.get('WalletRepository') as WalletRepository;
    
    this.tokenDiscoveryService = new TokenDiscoveryService(tokenRepository, walletRepository);
    this.balanceMonitoringService = new BalanceMonitoringService();
    this.notificationService = NotificationService.getInstance();
    this.walletRepository = walletRepository;
  }
  
  static getInstance(): HybridBalanceService {
    if (!HybridBalanceService.instance) {
      HybridBalanceService.instance = new HybridBalanceService();
    }
    return HybridBalanceService.instance;
  }
  
  /**
   * Initialize toàn bộ hệ thống
   */
  async initialize(): Promise<boolean> {
    try {
      console.log('🚀 HybridBalanceService: Initializing...');
      
      // Initialize notification service
      const notificationInitialized = await this.notificationService.initialize();
      if (!notificationInitialized) {
        console.warn('⚠️ Notification service failed to initialize');
        return false;
      }
      
      // Get wallet address
      const wallet = await this.walletRepository.getWallet();
      if (!wallet) {
        console.warn('⚠️ No wallet found, cannot initialize balance monitoring');
        return false;
      }
      
      // Initial token discovery
      console.log('🔍 Running initial token discovery...');
      await this.tokenDiscoveryService.discoverUserTokens(wallet.address);
      
      // Define background task
      this.defineBackgroundTask();
      
      // Schedule daily token rediscovery
      this.scheduleTokenRediscovery(wallet.address);
      
      this.isInitialized = true;
      console.log('✅ HybridBalanceService initialized successfully');
      
      return true;
      
    } catch (error) {
      console.error('❌ HybridBalanceService: Initialization error:', error);
      return false;
    }
  }
  
  /**
   * Start balance monitoring
   */
  async startMonitoring(): Promise<boolean> {
    try {
      if (!this.isInitialized) {
        console.warn('⚠️ Service not initialized, initializing now...');
        const initialized = await this.initialize();
        if (!initialized) return false;
      }
      
      const settings = await this.getSettings();
      if (!settings.enabled) {
        console.log('📴 Balance monitoring disabled in settings');
        return false;
      }
      
      console.log('📊 Starting balance monitoring...');
      
      // Register background task
      await BackgroundFetch.registerTaskAsync(BALANCE_MONITOR_TASK, {
        minimumInterval: Math.max(settings.frequency, 15000), // Minimum 15s
        stopOnTerminate: false,
        startOnBoot: true,
      });
      
      this.isMonitoring = true;
      console.log(`✅ Balance monitoring started (interval: ${settings.frequency}ms)`);
      
      return true;
      
    } catch (error: any) {
      // Graceful handling for Expo Go environment
      if (error?.message?.includes('Background Fetch has not been configured') || 
          error?.message?.includes('registerTaskAsync')) {
        console.log('📱 Running in Expo Go - Background monitoring not available');
        console.log('ℹ️ Balance monitoring requires development build or production build');
        return false;
      }
      
      console.error('❌ Error starting balance monitoring:', error);
      console.log('ℹ️ Background monitoring requires development build or production build');
      return false;
    }
  }
  
  /**
   * Stop balance monitoring
   */
  async stopMonitoring(): Promise<void> {
    try {
      console.log('🛑 Stopping balance monitoring...');
      
      await BackgroundFetch.unregisterTaskAsync(BALANCE_MONITOR_TASK);
      
      if (this.discoveryInterval) {
        clearInterval(this.discoveryInterval);
        this.discoveryInterval = null;
      }
      
      this.isMonitoring = false;
      console.log('✅ Balance monitoring stopped');
      
    } catch (error) {
      console.error('❌ Error stopping balance monitoring:', error);
    }
  }
  
  /**
   * Define background task cho balance monitoring
   */
  private defineBackgroundTask(): void {
    TaskManager.defineTask(BALANCE_MONITOR_TASK, async () => {
      try {
        console.log('🔄 Background task: Checking balance changes...');
        
        const settings = await this.getSettings();
        if (!settings.enabled) {
          console.log('📴 Monitoring disabled, skipping...');
          return BackgroundFetch.BackgroundFetchResult.NoData;
        }
        
        // Đã bỏ tính năng quiet hours - thông báo luôn hoạt động 24/7
        
        // Get wallet address
        const wallet = await this.walletRepository.getWallet();
        if (!wallet) {
          console.warn('⚠️ No wallet found in background task');
          return BackgroundFetch.BackgroundFetchResult.Failed;
        }
        
        // Monitor balance changes
        const changes = await this.balanceMonitoringService.monitorBalanceChanges(wallet.address);
        
        if (changes.length > 0) {
          // Filter changes based on settings
          const filteredChanges = this.filterChangesBySettings(changes, settings);
          
          if (filteredChanges.length > 0) {
            // Show notifications
            await this.notificationService.showGroupedBalanceChangeNotifications(filteredChanges);
            console.log(`🔔 Sent ${filteredChanges.length} notifications`);
            return BackgroundFetch.BackgroundFetchResult.NewData;
          }
        }
        
        return BackgroundFetch.BackgroundFetchResult.NoData;
        
      } catch (error) {
        console.error('❌ Background task error:', error);
        return BackgroundFetch.BackgroundFetchResult.Failed;
      }
    });
  }
  
  /**
   * Schedule daily token rediscovery
   */
  private scheduleTokenRediscovery(walletAddress: string): void {
    // Clear existing interval
    if (this.discoveryInterval) {
      clearInterval(this.discoveryInterval);
    }
    
    // Schedule rediscovery every 24 hours
    this.discoveryInterval = setInterval(async () => {
      try {
        console.log('🔄 Daily token rediscovery...');
        await this.tokenDiscoveryService.discoverUserTokens(walletAddress);
      } catch (error) {
        console.error('❌ Error in daily token rediscovery:', error);
      }
    }, 24 * 60 * 60 * 1000); // 24 hours
  }
  
  /**
   * Manual token rediscovery
   */
  async rediscoverTokens(): Promise<boolean> {
    try {
      const wallet = await this.walletRepository.getWallet();
      if (!wallet) return false;
      
      console.log('🔄 Manual token rediscovery...');
      await this.tokenDiscoveryService.discoverUserTokens(wallet.address);
      return true;
      
    } catch (error) {
      console.error('❌ Error in manual token rediscovery:', error);
      return false;
    }
  }
  
  /**
   * Check if current time is in quiet hours
   */
  private isQuietHours(quietHours: BalanceNotificationSettings['quietHours']): boolean {
    if (!quietHours.enabled) return false;
    
    const now = new Date();
    const currentTime = now.getHours() * 100 + now.getMinutes();
    
    const startTime = this.parseTime(quietHours.start);
    const endTime = this.parseTime(quietHours.end);
    
    if (startTime <= endTime) {
      return currentTime >= startTime && currentTime <= endTime;
    } else {
      // Quiet hours cross midnight
      return currentTime >= startTime || currentTime <= endTime;
    }
  }
  
  private parseTime(timeStr: string): number {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 100 + minutes;
  }
  
  /**
   * Filter changes based on user settings
   */
  private filterChangesBySettings(changes: any[], settings: BalanceNotificationSettings): any[] {
    if (settings.types.includes('all')) return changes;
    
    return changes.filter(change => 
      settings.types.includes(change.type)
    );
  }
  
  /**
   * Get notification settings
   */
  async getSettings(): Promise<BalanceNotificationSettings> {
    try {
      const stored = await AsyncStorage.getItem(SETTINGS_KEY);
      if (!stored) return DEFAULT_SETTINGS;
      
      return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
    } catch (error) {
      console.error('❌ Error getting settings:', error);
      return DEFAULT_SETTINGS;
    }
  }
  
  /**
   * Update notification settings
   */
  async updateSettings(settings: Partial<BalanceNotificationSettings>): Promise<void> {
    try {
      const currentSettings = await this.getSettings();
      const newSettings = { ...currentSettings, ...settings };
      
      await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(newSettings));
      
      // Restart monitoring if frequency changed
      if (settings.frequency && this.isMonitoring) {
        await this.stopMonitoring();
        await this.startMonitoring();
      }
      
      console.log('✅ Settings updated:', newSettings);
      
    } catch (error) {
      console.error('❌ Error updating settings:', error);
    }
  }
  
  /**
   * Get monitoring status
   */
  getStatus(): { initialized: boolean; monitoring: boolean } {
    return {
      initialized: this.isInitialized,
      monitoring: this.isMonitoring
    };
  }
  
  /**
   * Test notification system
   */
  async testNotification(): Promise<void> {
    await this.notificationService.showTestNotification();
  }

  /**
   * Get notification settings (simplified for UI)
   */
  async getNotificationSettings(): Promise<{ enabled: boolean }> {
    try {
      const settings = await this.getSettings();
      return { enabled: settings.enabled };
    } catch (error) {
      console.error('❌ Error getting notification settings:', error);
      return { enabled: false };
    }
  }

  /**
   * Enable notifications (simplified)
   */
  async enableNotifications(): Promise<void> {
    try {
      await this.updateSettings({ enabled: true });
      
      // Start monitoring if not already started
      if (!this.isMonitoring) {
        await this.startMonitoring();
      }
      
      console.log('✅ Notifications enabled');
    } catch (error) {
      console.error('❌ Error enabling notifications:', error);
      throw error;
    }
  }

  /**
   * Disable notifications (simplified)
   */
  async disableNotifications(): Promise<void> {
    try {
      await this.updateSettings({ enabled: false });
      
      // Stop monitoring
      if (this.isMonitoring) {
        await this.stopMonitoring();
      }
      
      console.log('✅ Notifications disabled');
    } catch (error) {
      console.error('❌ Error disabling notifications:', error);
      throw error;
    }
  }
  
  /**
   * Force refresh all balances
   */
  async forceRefreshBalances(): Promise<void> {
    try {
      const wallet = await this.walletRepository.getWallet();
      if (!wallet) return;
      
      await this.balanceMonitoringService.refreshAllBalanceSnapshots(wallet.address);
      console.log('✅ All balances refreshed');
      
    } catch (error) {
      console.error('❌ Error refreshing balances:', error);
    }
  }
}
