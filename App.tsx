import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AppNavigator } from './src/presentation/navigation/AppNavigator';
import { ServiceLocator } from './src/core/di/service_locator';
import { ThemeProvider, useTheme } from './src/core/theme';
import { MoralisApiService } from './src/data/services/moralis_api_service';
import { UTMTrackingService } from './src/core/services/utm_tracking_service';
import { HybridBalanceService } from './src/data/services/hybrid_balance_service';

// Initialize dependency injection synchronously
ServiceLocator.init();

// Global debug methods for Moralis API tracking
if (__DEV__) {
  // @ts-ignore
  global.resetMoralisTracking = () => {
    try {
      const moralisService = ServiceLocator.get('MoralisApiService') as MoralisApiService;
      moralisService.resetSessionTracking();
      console.warn('✅ Moralis tracking reset! Now switch from Dashboard to Swap to see API calls.');
    } catch (error) {
      console.error('❌ Error resetting Moralis tracking:', error);
    }
  };

  // @ts-ignore
  global.printMoralisSummary = () => {
    try {
      const moralisService = ServiceLocator.get('MoralisApiService') as MoralisApiService;
      moralisService.printSessionSummary();
    } catch (error) {
      console.error('❌ Error printing Moralis summary:', error);
    }
  };

  // @ts-ignore
  global.clearUTMData = async () => {
    try {
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      await AsyncStorage.removeItem('utm_tracking_data');
      await AsyncStorage.removeItem('first_install_tracked');
      console.warn('✅ UTM data cleared! Restart app with new UTM link to test.');
    } catch (error) {
      console.error('❌ Error clearing UTM data:', error);
    }
  };

  // @ts-ignore
  global.showUTMData = async () => {
    try {
      const { UTMTrackingService } = require('./src/core/services/utm_tracking_service');
      const summary = await UTMTrackingService.getAttributionSummary();
      console.warn('📊 Current UTM Data:');
      console.warn(summary);
    } catch (error) {
      console.error('❌ Error showing UTM data:', error);
    }
  };

  // @ts-ignore
  global.testUTMEvent = async () => {
    try {
      const { UTMEventTracker } = require('./src/core/services/utm_event_tracker');
      await UTMEventTracker.trackFirstDeposit(100, 'USDT');
      console.warn('✅ Test deposit event sent!');
    } catch (error) {
      console.error('❌ Error testing UTM event:', error);
    }
  };

  console.warn('🔧 [DEBUG] Global methods available:');
  console.warn('  - resetMoralisTracking() - Reset API call tracking');
  console.warn('  - printMoralisSummary() - Print API call summary');
  console.warn('  - clearUTMData() - Clear UTM tracking data');
  console.warn('  - showUTMData() - Show current UTM attribution');
  console.warn('  - testUTMEvent() - Test deposit event tracking');
}

// Component để handle StatusBar theo theme
const ThemedApp: React.FC = () => {
  const { theme } = useTheme();
  
  // Initialize UTM tracking và Balance Notifications khi app khởi động
  useEffect(() => {
    const initializeServices = async () => {
      try {
        // Initialize UTM tracking
        await UTMTrackingService.initialize();
        console.log('✅ UTM Tracking initialized successfully');
        
        // Debug: Print attribution summary
        if (__DEV__) {
          const summary = await UTMTrackingService.getAttributionSummary();
          console.log(summary);
        }
        
        // Initialize Balance Notification System
        console.log('🔔 Initializing Balance Notification System...');
        const hybridBalanceService = HybridBalanceService.getInstance();
        const initialized = await hybridBalanceService.initialize();
        
        if (initialized) {
          console.log('✅ Balance Notification System initialized successfully');
          
          // Auto-start monitoring if enabled in settings
          const settings = await hybridBalanceService.getSettings();
          if (settings.enabled) {
            const started = await hybridBalanceService.startMonitoring();
            if (started) {
              console.log('✅ Balance monitoring started automatically');
            } else {
              console.warn('⚠️ Balance monitoring failed to start');
            }
          }
        } else {
          console.warn('⚠️ Balance Notification System failed to initialize');
        }
        
      } catch (error) {
        console.error('❌ Services initialization failed:', error);
      }
    };
    
    initializeServices();
  }, []);
  
  return (
    <SafeAreaProvider>
      <GestureHandlerRootView style={styles.container}>
        <StatusBar 
          style={theme.isDark ? "light" : "dark"} 
          backgroundColor={theme.colors.background} 
        />
        <AppNavigator />
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
};

export default function App() {
  return (
    <ThemeProvider>
      <ThemedApp />
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
