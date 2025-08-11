// Analytics API Service - Gửi UTM data lên Finan Backend
import { API_CONFIG } from '../../core/config/api_config';

export interface InstallTrackingData {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  referral_code?: string;
  platform: string;
  install_date: string;
  device_info: {
    platform: string;
    app_version: string;
    device_model?: string;
    os_version?: string;
  };
}

export interface EventTrackingData {
  event_name: string;
  event_params: any;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  user_id?: string;
  session_id?: string;
  timestamp: string;
  platform: string;
}

export class AnalyticsApiService {
  private static readonly BASE_URL = API_CONFIG.FINAN_BACKEND.BASE_URL;

  /**
   * 📊 Track install event lên backend
   */
  static async trackInstall(data: InstallTrackingData): Promise<boolean> {
    try {
      const response = await fetch(`${this.BASE_URL}${API_CONFIG.FINAN_BACKEND.ENDPOINTS.TRACK_INSTALL}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'FinanWallet/1.0.0',
        },
        body: JSON.stringify({
          ...data,
          tracked_at: new Date().toISOString(),
          event_type: 'app_install'
        })
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ Install tracked to backend:', result);
        return true;
      } else {
        console.error('❌ Backend install tracking failed:', response.status, response.statusText);
        return false;
      }
    } catch (error) {
      console.error('❌ Install tracking API error:', error);
      return false;
    }
  }

  /**
   * 🎯 Track custom event lên backend
   */
  static async trackEvent(data: EventTrackingData): Promise<boolean> {
    try {
      const response = await fetch(`${this.BASE_URL}${API_CONFIG.FINAN_BACKEND.ENDPOINTS.TRACK_EVENT}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'FinanWallet/1.0.0',
        },
        body: JSON.stringify({
          ...data,
          tracked_at: new Date().toISOString()
        })
      });

      if (response.ok) {
        const result = await response.json();
        console.log(`✅ Event '${data.event_name}' tracked to backend:`, result);
        return true;
      } else {
        console.error(`❌ Backend event tracking failed for '${data.event_name}':`, response.status);
        return false;
      }
    } catch (error) {
      console.error(`❌ Event tracking API error for '${data.event_name}':`, error);
      return false;
    }
  }

  /**
   * 📈 Lấy UTM statistics từ backend
   */
  static async getUTMStats(timeRange: string = '30d'): Promise<any> {
    try {
      const response = await fetch(`${this.BASE_URL}${API_CONFIG.FINAN_BACKEND.ENDPOINTS.GET_UTM_STATS}?range=${timeRange}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'FinanWallet/1.0.0',
        }
      });

      if (response.ok) {
        const stats = await response.json();
        console.log('📊 UTM Stats from backend:', stats);
        return stats;
      } else {
        console.error('❌ Failed to get UTM stats:', response.status);
        return null;
      }
    } catch (error) {
      console.error('❌ UTM stats API error:', error);
      return null;
    }
  }

  /**
   * 📊 Lấy analytics dashboard data
   */
  static async getAnalyticsDashboard(): Promise<any> {
    try {
      const response = await fetch(`${this.BASE_URL}${API_CONFIG.FINAN_BACKEND.ENDPOINTS.GET_ANALYTICS}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'FinanWallet/1.0.0',
        }
      });

      if (response.ok) {
        const dashboard = await response.json();
        console.log('📈 Analytics Dashboard from backend:', dashboard);
        return dashboard;
      } else {
        console.error('❌ Failed to get analytics dashboard:', response.status);
        return null;
      }
    } catch (error) {
      console.error('❌ Analytics dashboard API error:', error);
      return null;
    }
  }

  /**
   * 🔄 Batch track multiple events (để tối ưu network)
   */
  static async batchTrackEvents(events: EventTrackingData[]): Promise<boolean> {
    try {
      const response = await fetch(`${this.BASE_URL}${API_CONFIG.FINAN_BACKEND.ENDPOINTS.TRACK_EVENT}/batch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'FinanWallet/1.0.0',
        },
        body: JSON.stringify({
          events: events.map(event => ({
            ...event,
            tracked_at: new Date().toISOString()
          }))
        })
      });

      if (response.ok) {
        const result = await response.json();
        console.log(`✅ Batch tracked ${events.length} events to backend:`, result);
        return true;
      } else {
        console.error('❌ Batch event tracking failed:', response.status);
        return false;
      }
    } catch (error) {
      console.error('❌ Batch event tracking API error:', error);
      return false;
    }
  }
}
