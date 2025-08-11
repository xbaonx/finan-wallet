// UTM Event Tracker - Helper functions để track các events quan trọng
import { UTMTrackingService } from './utm_tracking_service';

export class UTMEventTracker {
  
  /**
   * 💰 Track khi user nạp tiền lần đầu
   */
  static async trackFirstDeposit(amount: number, token: string) {
    await UTMTrackingService.trackEventWithUTM('first_deposit', {
      deposit_amount: amount,
      deposit_token: token,
      event_category: 'monetization',
      value: amount
    });
    
    console.log(`💰 First deposit tracked: ${amount} ${token}`);
  }

  /**
   * 🔄 Track khi user swap token
   */
  static async trackTokenSwap(fromToken: string, toToken: string, fromAmount: number, toAmount: number) {
    await UTMTrackingService.trackEventWithUTM('token_swap', {
      from_token: fromToken,
      to_token: toToken,
      from_amount: fromAmount,
      to_amount: toAmount,
      event_category: 'engagement',
      value: fromAmount
    });
    
    console.log(`🔄 Token swap tracked: ${fromAmount} ${fromToken} → ${toAmount} ${toToken}`);
  }

  /**
   * 👛 Track khi user tạo wallet
   */
  static async trackWalletCreated(walletType: string = 'new') {
    await UTMTrackingService.trackEventWithUTM('wallet_created', {
      wallet_type: walletType,
      event_category: 'onboarding'
    });
    
    console.log(`👛 Wallet creation tracked: ${walletType}`);
  }

  /**
   * 📱 Track khi user mở app (session start)
   */
  static async trackAppOpen() {
    await UTMTrackingService.trackEventWithUTM('app_open', {
      event_category: 'engagement'
    });
    
    console.log('📱 App open tracked');
  }

  /**
   * 🎯 Track khi user click vào referral link
   */
  static async trackReferralClick(referralCode: string) {
    await UTMTrackingService.trackEventWithUTM('referral_click', {
      referral_code: referralCode,
      event_category: 'acquisition'
    });
    
    console.log(`🎯 Referral click tracked: ${referralCode}`);
  }

  /**
   * ⚙️ Track khi user thay đổi settings
   */
  static async trackSettingsChange(settingName: string, settingValue: any) {
    await UTMTrackingService.trackEventWithUTM('settings_change', {
      setting_name: settingName,
      setting_value: settingValue,
      event_category: 'engagement'
    });
    
    console.log(`⚙️ Settings change tracked: ${settingName} = ${settingValue}`);
  }

  /**
   * 📊 Track khi user xem dashboard
   */
  static async trackDashboardView() {
    await UTMTrackingService.trackEventWithUTM('dashboard_view', {
      event_category: 'engagement'
    });
  }

  /**
   * 🔍 Track khi user search token
   */
  static async trackTokenSearch(searchQuery: string) {
    await UTMTrackingService.trackEventWithUTM('token_search', {
      search_query: searchQuery,
      event_category: 'engagement'
    });
  }

  /**
   * 💎 Track high-value actions (deposit > $100)
   */
  static async trackHighValueAction(actionType: string, value: number) {
    if (value >= 100) {
      await UTMTrackingService.trackEventWithUTM('high_value_action', {
        action_type: actionType,
        value: value,
        event_category: 'monetization'
      });
      
      console.log(`💎 High value action tracked: ${actionType} ($${value})`);
    }
  }

  /**
   * 📈 Track retention milestone (user quay lại sau X ngày)
   */
  static async trackRetentionMilestone(daysSinceInstall: number) {
    const milestones = [1, 3, 7, 14, 30];
    
    if (milestones.includes(daysSinceInstall)) {
      await UTMTrackingService.trackEventWithUTM(`retention_day_${daysSinceInstall}`, {
        days_since_install: daysSinceInstall,
        event_category: 'retention'
      });
      
      console.log(`📈 Retention milestone tracked: Day ${daysSinceInstall}`);
    }
  }
}
