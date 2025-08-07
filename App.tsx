import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AppNavigator } from './src/presentation/navigation/AppNavigator';
import { ServiceLocator } from './src/core/di/service_locator';
import { MoralisApiService } from './src/data/services/moralis_api_service';

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

  console.warn('🔧 [DEBUG] Global methods available:');
  console.warn('  - resetMoralisTracking() - Reset API call tracking');
  console.warn('  - printMoralisSummary() - Print API call summary');
}

export default function App() {

  return (
    <SafeAreaProvider>
      <GestureHandlerRootView style={styles.container}>
        <StatusBar style="dark" backgroundColor="#ffffff" />
        <AppNavigator />
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
