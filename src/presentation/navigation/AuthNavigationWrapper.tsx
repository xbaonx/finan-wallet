import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { AuthService } from '../../data/services/auth_service';

interface AuthNavigationWrapperProps {
  hasWallet: boolean;
  children: (authState: {
    isLoading: boolean;
    shouldShowSetupPin: boolean;
    shouldShowLogin: boolean;
    shouldShowMainApp: boolean;
  }) => React.ReactNode;
}

export const AuthNavigationWrapper: React.FC<AuthNavigationWrapperProps> = ({
  hasWallet,
  children,
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasPinSet, setHasPinSet] = useState(false);
  const [authService] = useState(() => new AuthService());

  useEffect(() => {
    const checkAuthStatus = async () => {
      if (!hasWallet) {
        setIsLoading(false);
        return;
      }

      try {
        const pinExists = await authService.hasPinSet();
        setHasPinSet(pinExists);
      } catch (error) {
        console.error('Error checking PIN status:', error);
        setHasPinSet(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuthStatus();
  }, [hasWallet, authService]);

  const authState = {
    isLoading,
    shouldShowSetupPin: hasWallet && !hasPinSet,
    shouldShowLogin: hasWallet && hasPinSet,
    shouldShowMainApp: false, // Will be determined after successful authentication
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  return <>{children(authState)}</>;
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
});
