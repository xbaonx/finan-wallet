// Facebook Analytics Service - Expo Go Compatible Version
// This version disables all native SDK calls to prevent crashes in Expo Go

export class FacebookAnalyticsService {
  private static instance: FacebookAnalyticsService;
  private isInitialized = false;

  public static getInstance(): FacebookAnalyticsService {
    if (!FacebookAnalyticsService.instance) {
      FacebookAnalyticsService.instance = new FacebookAnalyticsService();
    }
    return FacebookAnalyticsService.instance;
  }

  async initialize(): Promise<void> {
    try {
      console.log('📱 FacebookAnalyticsService: Initialized in Expo Go mode (native SDK disabled)');
      this.isInitialized = true;
    } catch (error) {
      console.error('❌ FacebookAnalyticsService initialization error:', error);
    }
  }

  async trackAppInstall(): Promise<void> {
    if (!this.isInitialized) {
      console.log('⚠️ FacebookAnalyticsService: Not initialized, skipping app install tracking');
      return;
    }
    console.log('📊 FacebookAnalyticsService: App install tracked (Expo Go mode)');
  }

  async trackWalletCreated(method: 'new' | 'imported'): Promise<void> {
    if (!this.isInitialized) {
      console.log('⚠️ FacebookAnalyticsService: Not initialized, skipping wallet creation tracking');
      return;
    }
    console.log(`📊 FacebookAnalyticsService: Wallet ${method} tracked (Expo Go mode)`);
  }

  async trackAppOpen(): Promise<void> {
    if (!this.isInitialized) {
      console.log('⚠️ FacebookAnalyticsService: Not initialized, skipping app open tracking');
      return;
    }
    console.log('📊 FacebookAnalyticsService: App open tracked (Expo Go mode)');
  }

  async trackDeposit(amount: number, currency: string): Promise<void> {
    if (!this.isInitialized) {
      console.log('⚠️ FacebookAnalyticsService: Not initialized, skipping deposit tracking');
      return;
    }
    console.log(`📊 FacebookAnalyticsService: Deposit ${amount} ${currency} tracked (Expo Go mode)`);
  }

  async trackWithdraw(amount: number, currency: string): Promise<void> {
    if (!this.isInitialized) {
      console.log('⚠️ FacebookAnalyticsService: Not initialized, skipping withdraw tracking');
      return;
    }
    console.log(`📊 FacebookAnalyticsService: Withdraw ${amount} ${currency} tracked (Expo Go mode)`);
  }

  async trackSwap(fromToken: string, toToken: string, amount: number): Promise<void> {
    if (!this.isInitialized) {
      console.log('⚠️ FacebookAnalyticsService: Not initialized, skipping swap tracking');
      return;
    }
    console.log(`📊 FacebookAnalyticsService: Swap ${amount} ${fromToken} to ${toToken} tracked (Expo Go mode)`);
  }

  getStatus(): { initialized: boolean; sdkVersion: string | null } {
    return {
      initialized: this.isInitialized,
      sdkVersion: 'Expo Go Compatible Mode'
    };
  }
}
