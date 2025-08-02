import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet } from 'react-native';

import { AppNavigator } from './src/presentation/navigation/AppNavigator';
import { ServiceLocator } from './src/core/di/service_locator';

// Initialize dependency injection synchronously
ServiceLocator.init();

export default function App() {

  return (
    <GestureHandlerRootView style={styles.container}>
      <StatusBar style="dark" backgroundColor="#ffffff" />
      <AppNavigator />
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
