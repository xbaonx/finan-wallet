// UTM Tracking Service cho Finan Wallet - Backend Integration
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Linking, Platform } from 'react-native';
import { AnalyticsApiService } from '../../data/services/analytics_api_service';
import Constants from 'expo-constants';

// Import Install Referrer cho Android - chỉ trong native build
let PlayInstallReferrer: any = null;
const isExpoGo = Constants.appOwnership === 'expo';

if (Platform.OS === 'android' && !isExpoGo) {
  try {
    PlayInstallReferrer = require('react-native-play-install-referrer').default;
  } catch (error) {
    console.warn('⚠️ Play Install Referrer not available:', error);
  }
}

export interface UTMData {
  utm_source?: string;      // facebook, telegram, tiktok, google
  utm_medium?: string;      // social, cpc, referral, organic
  utm_campaign?: string;    // launch_week, crypto_promo
  utm_content?: string;     // banner_top, video_ad
  utm_term?: string;        // crypto_wallet, bitcoin_app
  referral_code?: string;   // User referral code
  install_date: string;     // Ngày install
  platform: string;        // ios/android
  is_first_install: boolean;
}

export class UTMTrackingService {
  private static readonly UTM_STORAGE_KEY = 'utm_tracking_data';
  private static readonly INSTALL_TRACKED_KEY = 'first_install_tracked';

  /**
   * 🚀 Initialize UTM tracking khi app khởi động
   */
  static async initialize() {
    try {
      console.log('📊 Initializing UTM Tracking...');
      
      // Check xem đã track install lần đầu chưa
      const isFirstInstallTracked = await AsyncStorage.getItem(this.INSTALL_TRACKED_KEY);
      
      if (!isFirstInstallTracked) {
        // Lần đầu mở app - track install
        await this.trackFirstInstall();
        await AsyncStorage.setItem(this.INSTALL_TRACKED_KEY, 'true');
      }

      // Setup deep link listener cho future clicks
      this.setupDeepLinkListener();
      
      console.log('✅ UTM Tracking initialized');
    } catch (error) {
      console.error('❌ UTM Tracking init error:', error);
    }
  }

  /**
   * 📱 Track install lần đầu
   */
  private static async trackFirstInstall() {
    try {
      let utmData: UTMData | null = null;
      let utmSource = 'unknown';

      // 🎯 Ưu tiên 1: Đọc Install Referrer từ Google Play (Android)
      if (Platform.OS === 'android' && PlayInstallReferrer) {
        try {
          console.log('📊 [DEBUG] Attempting to get Play Install Referrer...');
          console.log('📊 [DEBUG] PlayInstallReferrer available:', !!PlayInstallReferrer);
          
          // Sử dụng callback API của react-native-play-install-referrer v1.1.9
          await new Promise<void>((resolve) => {
            PlayInstallReferrer.getInstallReferrerInfo((installReferrerInfo: any, error: any) => {
              if (!error && installReferrerInfo) {
                console.log('📊 [DEBUG] Full referrerInfo:', JSON.stringify(installReferrerInfo, null, 2));
                console.log('📊 Raw Install Referrer:', installReferrerInfo.installReferrer);
                
                // Decode referrer và parse UTM
                const decodedReferrer = decodeURIComponent(installReferrerInfo.installReferrer);
                console.log('📊 Decoded Install Referrer:', decodedReferrer);
                
                // Parse UTM từ referrer (format: utm_source=...&utm_medium=...)
                const parsedUTM = this.parseUTMFromReferrer(decodedReferrer);
                console.log('📊 [DEBUG] Parsed UTM from referrer:', JSON.stringify(parsedUTM, null, 2));
                
                if (parsedUTM.utm_source) {
                  utmData = {
                    ...parsedUTM,
                    install_date: new Date().toISOString(),
                    platform: Platform.OS,
                    is_first_install: true
                  };
                  utmSource = 'play_install_referrer';
                  console.log('📊 Install tracked with UTM from Play Install Referrer:', utmData);
                } else {
                  console.warn('⚠️ [DEBUG] No utm_source found in parsed UTM data');
                }
              } else {
                console.warn('⚠️ Failed to get Play Install Referrer:', error);
                if (error) {
                  console.warn('⚠️ [DEBUG] Referrer error details:', JSON.stringify(error, null, 2));
                }
              }
              resolve();
            });
          });
        } catch (referrerError) {
          console.warn('⚠️ Failed to get Play Install Referrer:', referrerError);
          console.warn('⚠️ [DEBUG] Referrer error details:', JSON.stringify(referrerError, null, 2));
        }
      } else {
        console.warn('⚠️ [DEBUG] Install Referrer not available - Platform:', Platform.OS, 'PlayInstallReferrer:', !!PlayInstallReferrer);
      }

      // 🎯 Ưu tiên 2: Fallback - Lấy initial URL nếu app được mở từ deep link
      if (!utmData) {
        const initialUrl = await Linking.getInitialURL();
        
        if (initialUrl) {
          // Parse UTM từ deep link
          const parsedUTM = this.parseUTMFromURL(initialUrl);
          utmData = {
            ...parsedUTM,
            install_date: new Date().toISOString(),
            platform: Platform.OS,
            is_first_install: true
          };
          utmSource = 'deep_link';
          console.log('📊 Install tracked with UTM from deep link:', utmData);
        }
      }

      // 🎯 Ưu tiên 3: Organic install (không có UTM)
      if (!utmData) {
        utmData = {
          utm_source: 'organic',
          utm_medium: 'app_store_search',
          utm_campaign: 'organic_install',
          install_date: new Date().toISOString(),
          platform: Platform.OS,
          is_first_install: true
        };
        utmSource = 'organic';
        console.log('📊 Organic install tracked:', utmData);
      }

      // Lưu UTM data
      await this.saveUTMData(utmData);
      
      // Log install event
      await this.logInstallEvent(utmData);
      
    } catch (error) {
      console.error('❌ Track first install error:', error);
    }
  }

  /**
   * 🔗 Parse UTM parameters từ URL
   */
  static parseUTMFromURL(url: string): Partial<UTMData> {
    try {
      const urlObj = new URL(url);
      const params = urlObj.searchParams;
      
      return {
        utm_source: params.get('utm_source') || undefined,
        utm_medium: params.get('utm_medium') || undefined,
        utm_campaign: params.get('utm_campaign') || undefined,
        utm_content: params.get('utm_content') || undefined,
        utm_term: params.get('utm_term') || undefined,
        referral_code: params.get('ref') || params.get('referral_code') || undefined,
      };
    } catch (error) {
      console.error('❌ Parse UTM error:', error);
      return {};
    }
  }

  /**
   * 🔗 Parse UTM parameters từ Install Referrer string
   */
  static parseUTMFromReferrer(referrer: string): Partial<UTMData> {
    try {
      // Referrer format: "utm_source=tele&utm_medium=cpc&utm_campaign=crypto_launch&utm_content=video_ad"
      const params = new URLSearchParams(referrer);
      
      return {
        utm_source: params.get('utm_source') || undefined,
        utm_medium: params.get('utm_medium') || undefined,
        utm_campaign: params.get('utm_campaign') || undefined,
        utm_content: params.get('utm_content') || undefined,
        utm_term: params.get('utm_term') || undefined,
        referral_code: params.get('ref') || params.get('referral_code') || undefined,
      };
    } catch (error) {
      console.error('❌ Parse UTM from referrer error:', error);
      return {};
    }
  }

  /**
   * 💾 Lưu UTM data vào AsyncStorage
   */
  private static async saveUTMData(utmData: UTMData) {
    try {
      await AsyncStorage.setItem(this.UTM_STORAGE_KEY, JSON.stringify(utmData));
      console.log('💾 UTM data saved successfully');
    } catch (error) {
      console.error('❌ Save UTM data error:', error);
    }
  }

  /**
   * 📊 Lấy UTM data đã lưu
   */
  static async getUTMData(): Promise<UTMData | null> {
    try {
      const data = await AsyncStorage.getItem(this.UTM_STORAGE_KEY);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('❌ Get UTM data error:', error);
      return null;
    }
  }

  /**
   * 📊 Send install event to backend
   */
  private static async logInstallEvent(utmData: UTMData) {
    try {
      const installData = {
        utm_source: utmData.utm_source,
        utm_medium: utmData.utm_medium,
        utm_campaign: utmData.utm_campaign,
        utm_content: utmData.utm_content,
        utm_term: utmData.utm_term,
        referral_code: utmData.referral_code,
        platform: utmData.platform,
        install_date: utmData.install_date,
        device_info: {
          platform: Platform.OS,
          app_version: Constants.expoConfig?.version || '1.0.0',
          device_model: Constants.deviceName,
          os_version: Platform.Version.toString()
        }
      };

      console.log('📊 Sending install event to backend:', JSON.stringify(installData, null, 2));
      
      // Gửi lên Finan Backend
      const success = await AnalyticsApiService.trackInstall(installData);
      
      if (success) {
        console.log('✅ Install event sent to backend successfully');
      } else {
        console.log('⚠️ Install event failed to send to backend, saved locally');
      }
      
    } catch (error) {
      console.error('❌ Send install event error:', error);
    }
  }

  /**
   * 🎯 Track custom events với UTM context
   */
  static async trackEventWithUTM(eventName: string, eventParams: any = {}) {
    try {
      // Lấy UTM data để add context
      const utmData = await this.getUTMData();
      
      const eventData = {
        event_name: eventName,
        event_params: {
          ...eventParams,
          days_since_install: utmData ? this.getDaysSinceInstall(utmData.install_date) : 0
        },
        utm_source: utmData?.utm_source,
        utm_medium: utmData?.utm_medium,
        utm_campaign: utmData?.utm_campaign,
        timestamp: new Date().toISOString(),
        platform: Platform.OS
      };

      console.log(`📊 Sending event '${eventName}' to backend:`, JSON.stringify(eventData, null, 2));
      
      // Gửi lên Finan Backend
      const success = await AnalyticsApiService.trackEvent(eventData);
      
      if (success) {
        console.log(`✅ Event '${eventName}' sent to backend successfully`);
      } else {
        console.log(`⚠️ Event '${eventName}' failed to send to backend`);
      }
      
    } catch (error) {
      console.error('❌ Track event with UTM error:', error);
    }
  }

  /**
   * 🔗 Setup deep link listener cho app đang chạy
   */
  private static setupDeepLinkListener() {
    Linking.addEventListener('url', (event) => {
      console.log('🔗 Deep link received:', event.url);
      
      // Parse UTM từ deep link mới
      const utmParams = this.parseUTMFromURL(event.url);
      
      if (utmParams.utm_source) {
        // Track deep link click event
        this.trackEventWithUTM('deep_link_click', {
          link_utm_source: utmParams.utm_source,
          link_utm_medium: utmParams.utm_medium,
          link_utm_campaign: utmParams.utm_campaign,
          link_url: event.url
        });
      }
    });
  }

  /**
   * 📅 Tính số ngày từ khi install
   */
  private static getDaysSinceInstall(installDate: string): number {
    const install = new Date(installDate);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - install.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * 📊 Get attribution summary cho debugging
   */
  static async getAttributionSummary() {
    const utmData = await this.getUTMData();
    
    if (!utmData) {
      return 'No attribution data found';
    }

    return `
📊 ATTRIBUTION SUMMARY:
• Source: ${utmData.utm_source}
• Medium: ${utmData.utm_medium}  
• Campaign: ${utmData.utm_campaign}
• Install Date: ${utmData.install_date}
• Platform: ${utmData.platform}
• Days Since Install: ${this.getDaysSinceInstall(utmData.install_date)}
    `.trim();
  }
}
