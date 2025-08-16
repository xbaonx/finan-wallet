import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { ActivityIndicator, View, StyleSheet } from 'react-native';

import { RootStackParamList } from './types';
import { WelcomeScreen } from '../screens/WelcomeScreen';
import { CreateWalletScreen } from '../screens/CreateWalletScreen';
import { ImportWalletScreen } from '../screens/ImportWalletScreen';
import { SendScreen } from '../screens/SendScreen';
import { ReceiveScreen } from '../screens/ReceiveScreen';
import { SetupPinScreen } from '../screens/SetupPinScreen';
import { BiometricPromptScreen } from '../screens/BiometricPromptScreen';
import { LoginScreen } from '../screens/LoginScreen';
import { SecurityScreen } from '../screens/SecurityScreen';
import { ChangePinScreen } from '../screens/ChangePinScreen';
import { BackupWalletScreen } from '../screens/BackupWalletScreen';

import { TabNavigator } from './TabNavigator';

import { WalletOnboardingBloc } from '../blocs/wallet_onboarding_bloc';
import { CheckWalletExistsEvent } from '../blocs/wallet_onboarding_event';
import { WalletOnboardingState, WalletExistsState, WalletNotExistsState, WalletOnboardingLoading } from '../blocs/wallet_onboarding_state';
import { ServiceLocator } from '../../core/di/service_locator';
import { AuthService } from '../../data/services/auth_service';

const Stack = createStackNavigator<RootStackParamList>();

export const AppNavigator: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasWallet, setHasWallet] = useState(false);
  const [hasPinSet, setHasPinSet] = useState(false);
  const [authService] = useState(() => new AuthService());
  const [walletBloc, setWalletBloc] = useState<any>(null);

  useEffect(() => {
    const initializeApp = async () => {
      try {
        const bloc = ServiceLocator.get<WalletOnboardingBloc>('WalletOnboardingBloc');
        setWalletBloc(bloc);

        const handleStateChange = async (state: WalletOnboardingState) => {
          if (state instanceof WalletExistsState) {
            setHasWallet(true);
            // Kiểm tra trạng thái PIN khi ví đã tồn tại
            const pinExists = await authService.hasPinSet();
            setHasPinSet(pinExists);
            setIsLoading(false);
          } else if (state instanceof WalletNotExistsState) {
            setHasWallet(false);
            setHasPinSet(false);
            setIsLoading(false);
          }
        };

        bloc.addListener(handleStateChange);
        
        // Check if wallet exists on app launch
        bloc.add(new CheckWalletExistsEvent());

        return () => bloc.removeListener(handleStateChange);
      } catch (error) {
        console.error('Failed to initialize app:', error);
        setIsLoading(false);
      }
    };

    initializeApp();
  }, [authService]);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          gestureEnabled: true,
        }}
        initialRouteName={
          !hasWallet ? 'Welcome' : 
          !hasPinSet ? 'SetupPin' : 
          'Login'
        }
      >
        {/* Onboarding flow */}
        <Stack.Screen name="Welcome" component={WelcomeScreen} />
        <Stack.Screen 
          name="CreateWallet" 
          component={CreateWalletScreen}
          options={{
            headerShown: true,
            headerTitle: '',
            headerBackTitleVisible: false,
            headerStyle: {
              backgroundColor: '#ffffff',
              shadowColor: 'transparent',
              elevation: 0,
            },
            headerTintColor: '#374151',
          }}
        />
        <Stack.Screen 
          name="ImportWallet" 
          component={ImportWalletScreen}
          options={{
            headerShown: true,
            headerTitle: '',
            headerBackTitleVisible: false,
            headerStyle: {
              backgroundColor: '#ffffff',
              shadowColor: 'transparent',
              elevation: 0,
            },
            headerTintColor: '#374151',
          }}
        />
        
        {/* Main app flow with bottom tabs */}
        <Stack.Screen 
          name="MainTabs" 
          component={TabNavigator}
          options={{ 
            headerShown: false,
            gestureEnabled: false, // Không cho phép swipe back từ MainTabs
          }}
        />
        
        {/* Authentication screens */}
        <Stack.Screen 
          name="SetupPin" 
          component={SetupPinScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen 
          name="BiometricPrompt" 
          component={BiometricPromptScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen 
          name="Login" 
          component={LoginScreen}
          options={{ headerShown: false }}
        />
        
        {/* Send/Receive screens */}
        <Stack.Screen 
          name="Send" 
          component={SendScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen 
          name="Receive" 
          component={ReceiveScreen}
          options={{ headerShown: false }}
        />
        
        {/* Settings screens */}
        <Stack.Screen name="Security" component={SecurityScreen} />
        <Stack.Screen name="ChangePin" component={ChangePinScreen} />
        <Stack.Screen name="BackupWallet" component={BackupWalletScreen} />

      </Stack.Navigator>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  dashboardPlaceholder: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
});
