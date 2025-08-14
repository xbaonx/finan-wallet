import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { BalanceChange } from './balance_monitoring_service';
import { formatCrypto } from '../../core/utils/number_formatter';

// Cấu hình notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * Notification Service - Quản lý local notifications cho balance changes
 */
export class NotificationService {
  private static instance: NotificationService;
  private expoPushToken: string | null = null;
  
  private constructor() {}
  
  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }
  
  /**
   * Initialize notification service và request permissions
   */
  async initialize(): Promise<boolean> {
    try {
      console.log('🔔 NotificationService: Initializing...');
      
      // Check if device supports notifications
      if (!Device.isDevice) {
        console.warn('⚠️ Notifications only work on physical devices');
        return false;
      }
      
      // Request permissions
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      
      if (finalStatus !== 'granted') {
        console.warn('⚠️ Notification permissions not granted');
        return false;
      }
      
      // Get push token (for future use)
      try {
        const token = await Notifications.getExpoPushTokenAsync();
        this.expoPushToken = token.data;
        console.log('📱 Expo push token:', this.expoPushToken);
      } catch (error) {
        console.warn('⚠️ Failed to get push token:', error);
      }
      
      // Configure notification channels (Android)
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('balance-changes', {
          name: 'Balance Changes',
          description: 'Notifications for crypto balance changes',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
        });
      }
      
      console.log('✅ NotificationService initialized successfully');
      return true;
      
    } catch (error) {
      console.error('❌ NotificationService: Initialization error:', error);
      return false;
    }
  }
  
  /**
   * Show notification cho balance change
   */
  async showBalanceChangeNotification(change: BalanceChange): Promise<void> {
    try {
      const isIncrease = change.type === 'increase';
      const emoji = isIncrease ? '📈' : '📉';
      const action = isIncrease ? 'nhận' : 'gửi';
      const sign = isIncrease ? '+' : '';
      
      // Format amount theo chuẩn Việt Nam
      const formattedAmount = formatCrypto(Math.abs(change.difference));
      
      const title = `${emoji} Finan Wallet`;
      const body = `Bạn vừa ${action} ${sign}${formattedAmount} ${change.token.symbol}`;
      
      // Thêm chain info nếu không phải BSC
      const chainInfo = change.token.chainName !== 'BSC' ? ` (${change.token.chainName})` : '';
      const fullBody = `${body}${chainInfo}`;
      
      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body: fullBody,
          sound: 'default',
          data: {
            type: 'balance_change',
            tokenSymbol: change.token.symbol,
            tokenAddress: change.token.address,
            amount: change.difference,
            timestamp: change.timestamp,
            changeType: change.type,
          },
        },
        trigger: null, // Immediate notification
      });
      
      console.log(`🔔 Notification sent: ${title} - ${fullBody}`);
      
    } catch (error) {
      console.error('❌ Error showing balance change notification:', error);
    }
  }
  
  /**
   * Show multiple balance changes trong 1 notification (grouped)
   */
  async showGroupedBalanceChangeNotifications(changes: BalanceChange[]): Promise<void> {
    try {
      if (changes.length === 0) return;
      
      if (changes.length === 1) {
        await this.showBalanceChangeNotification(changes[0]);
        return;
      }
      
      // Group notifications
      const increases = changes.filter(c => c.type === 'increase');
      const decreases = changes.filter(c => c.type === 'decrease');
      
      let title = '💰 Finan Wallet';
      let body = '';
      
      if (increases.length > 0 && decreases.length > 0) {
        title = '🔄 Finan Wallet';
        body = `${increases.length} giao dịch nhận, ${decreases.length} giao dịch gửi`;
      } else if (increases.length > 0) {
        title = '📈 Finan Wallet';
        if (increases.length === 1) {
          const change = increases[0];
          const formattedAmount = formatCrypto(change.difference);
          body = `Bạn vừa nhận +${formattedAmount} ${change.token.symbol}`;
        } else {
          body = `Bạn vừa nhận ${increases.length} giao dịch`;
        }
      } else if (decreases.length > 0) {
        title = '📉 Finan Wallet';
        if (decreases.length === 1) {
          const change = decreases[0];
          const formattedAmount = formatCrypto(Math.abs(change.difference));
          body = `Bạn vừa gửi ${formattedAmount} ${change.token.symbol}`;
        } else {
          body = `Bạn vừa gửi ${decreases.length} giao dịch`;
        }
      }
      
      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          sound: 'default',
          data: {
            type: 'grouped_balance_changes',
            changesCount: changes.length,
            timestamp: Date.now(),
          },
        },
        trigger: null,
      });
      
      console.log(`🔔 Grouped notification sent: ${title} - ${body}`);
      
    } catch (error) {
      console.error('❌ Error showing grouped notifications:', error);
    }
  }
  
  /**
   * Show test notification
   */
  async showTestNotification(): Promise<void> {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '🧪 Finan Wallet Test',
          body: 'Thông báo test - hệ thống hoạt động bình thường!',
          sound: 'default',
          data: {
            type: 'test',
            timestamp: Date.now(),
          },
        },
        trigger: null,
      });
      
      console.log('🔔 Test notification sent');
      
    } catch (error) {
      console.error('❌ Error showing test notification:', error);
    }
  }
  
  /**
   * Cancel tất cả scheduled notifications
   */
  async cancelAllNotifications(): Promise<void> {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
      console.log('🔕 All notifications cancelled');
    } catch (error) {
      console.error('❌ Error cancelling notifications:', error);
    }
  }
  
  /**
   * Get notification permissions status
   */
  async getPermissionStatus(): Promise<string> {
    try {
      const { status } = await Notifications.getPermissionsAsync();
      return status;
    } catch (error) {
      console.error('❌ Error getting permission status:', error);
      return 'unknown';
    }
  }
  
  /**
   * Get push token (for future use)
   */
  getPushToken(): string | null {
    return this.expoPushToken;
  }
}
