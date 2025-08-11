import React, { useState, useEffect } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialIcons } from '@expo/vector-icons';
import { TabParamList } from './types';
import { DashboardScreen } from '../screens/DashboardScreen';
import { SwapScreen } from '../screens/SwapScreen';
import { DepositWithdrawScreen } from '../screens/DepositWithdrawScreen';
import { TransactionHistoryScreenWrapper } from '../screens/TransactionHistoryScreenWrapper';
import { SettingsScreen } from '../screens/SettingsScreen';
import { useThemeColors } from '../../core/theme';
import { finanBackendService } from '../../data/services/finan_backend_service';

const Tab = createBottomTabNavigator<TabParamList>();

export const TabNavigator: React.FC = () => {
  const colors = useThemeColors();
  const [isReviewMode, setIsReviewMode] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchAppMode = async () => {
      try {
        const appModeResponse = await finanBackendService.getAppMode();
        if (appModeResponse.success) {
          setIsReviewMode(appModeResponse.isReviewMode);
          console.log(`[TabNavigator] Chế độ review: ${appModeResponse.isReviewMode ? 'BẬT' : 'TẮT'}`);
        }
      } catch (error) {
        console.error('[TabNavigator] Lỗi khi lấy cấu hình app mode:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAppMode();
  }, []);

  // Hiển thị loading hoặc fallback nếu cần
  if (isLoading) {
    // Vẫn render tabs bình thường trong khi đang loading
  }

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          paddingBottom: 8,
          paddingTop: 8,
          height: 88,
          marginBottom: 20,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
          marginTop: 1,
        },
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          tabBarLabel: 'Trang chủ',
          tabBarIcon: ({ color, size, focused }) => (
            <MaterialIcons 
              name={focused ? "dashboard" : "dashboard"} 
              size={size} 
              color={color} 
            />
          ),
        }}
      />
      <Tab.Screen
        name="Swap"
        component={SwapScreen}
        options={{
          tabBarLabel: 'Mua/Bán',
          tabBarIcon: ({ color, size, focused }) => (
            <MaterialIcons 
              name={focused ? "swap-horiz" : "swap-horiz"} 
              size={size} 
              color={color} 
            />
          ),
        }}
      />
      {!isReviewMode && (
        <Tab.Screen
          name="DepositWithdraw"
          component={DepositWithdrawScreen}
          options={{
            tabBarLabel: 'Nạp/Rút',
            tabBarIcon: ({ color, size, focused }) => (
              <MaterialIcons 
                name={focused ? "account-balance-wallet" : "account-balance-wallet"} 
                size={size} 
                color={color} 
              />
            ),
          }}
        />
      )}
      <Tab.Screen
        name="History"
        component={TransactionHistoryScreenWrapper}
        options={{
          tabBarLabel: 'Lịch sử',
          tabBarIcon: ({ color, size, focused }) => (
            <MaterialIcons 
              name={focused ? "history" : "history"} 
              size={size} 
              color={color} 
            />
          ),
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          tabBarLabel: 'Cài đặt',
          tabBarIcon: ({ color, size, focused }) => (
            <MaterialIcons 
              name={focused ? "settings" : "settings"} 
              size={size} 
              color={color} 
            />
          ),
        }}
      />
    </Tab.Navigator>
  );
};
