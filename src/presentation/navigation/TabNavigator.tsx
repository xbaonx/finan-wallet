import React from 'react';
import { Text } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { TabParamList } from './types';
import { DashboardScreen } from '../screens/DashboardScreen';
import { SwapScreen } from '../screens/SwapScreen';
import { TransactionHistoryScreenWrapper } from '../screens/TransactionHistoryScreenWrapper';
import { SettingsScreen } from '../screens/SettingsScreen';

const Tab = createBottomTabNavigator<TabParamList>();

export const TabNavigator: React.FC = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#3b82f6',
        tabBarInactiveTintColor: '#9ca3af',
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopWidth: 1,
          borderTopColor: '#f3f4f6',
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
          tabBarIcon: ({ color, size }) => (
            <TabIcon icon="🏠" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="Swap"
        component={SwapScreen}
        options={{
          tabBarLabel: 'Mua/Bán',
          tabBarIcon: ({ color, size }) => (
            <TabIcon icon="⇄" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="History"
        component={TransactionHistoryScreenWrapper}
        options={{
          tabBarLabel: 'Lịch sử',
          tabBarIcon: ({ color, size }) => (
            <TabIcon icon="📋" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          tabBarLabel: 'Cài đặt',
          tabBarIcon: ({ color, size }) => (
            <TabIcon icon="⚙️" color={color} size={size} />
          ),
        }}
      />
    </Tab.Navigator>
  );
};

interface TabIconProps {
  icon: string;
  color: string;
  size: number;
}

const TabIcon: React.FC<TabIconProps> = ({ icon, color, size }) => {
  return (
    <Text
      style={{
        fontSize: size,
        color: color,
        textAlign: 'center',
      }}
    >
      {icon}
    </Text>
  );
};
