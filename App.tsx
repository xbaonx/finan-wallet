import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AppNavigator } from './src/presentation/navigation/AppNavigator';
import { ServiceLocator } from './src/core/di/service_locator';
import { ThemeProvider, useTheme } from './src/core/theme';
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

// Component để handle StatusBar theo theme
const ThemedApp: React.FC = () => {
  const { theme } = useTheme();
  
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
