import { Theme, ThemeColors } from './types';

// Light Theme Colors
const lightColors: ThemeColors = {
  // Backgrounds
  background: '#ffffff',
  surface: '#f9fafb',
  surfaceSecondary: '#f3f4f6',
  card: '#ffffff',
  
  // Text colors
  text: '#111827',
  textSecondary: '#6b7280',
  textTertiary: '#9ca3af',
  textInverse: '#ffffff',
  
  // Primary colors
  primary: '#3b82f6',
  primaryDark: '#1d4ed8',
  primaryLight: '#60a5fa',
  
  // Status colors
  success: '#10b981',
  error: '#ef4444',
  warning: '#f59e0b',
  info: '#3b82f6',
  
  // Borders and dividers
  border: '#e5e7eb',
  borderLight: '#f3f4f6',
  divider: '#e5e7eb',
  
  // Interactive elements
  buttonBackground: '#3b82f6',
  buttonText: '#ffffff',
  inputBackground: '#f9fafb',
  inputBorder: '#d1d5db',
  
  // Overlays and shadows
  overlay: 'rgba(0, 0, 0, 0.5)',
  shadow: 'rgba(0, 0, 0, 0.1)',
  
  // Chart and graph colors
  chartPositive: '#10b981',
  chartNegative: '#ef4444',
  chartNeutral: '#6b7280',
};

// Dark Theme Colors
const darkColors: ThemeColors = {
  // Backgrounds
  background: '#0f0f0f',
  surface: '#1a1a1a',
  surfaceSecondary: '#262626',
  card: '#1f1f1f',
  
  // Text colors
  text: '#ffffff',
  textSecondary: '#a1a1aa',
  textTertiary: '#71717a',
  textInverse: '#000000',
  
  // Primary colors
  primary: '#3b82f6',
  primaryDark: '#1d4ed8',
  primaryLight: '#60a5fa',
  
  // Status colors
  success: '#22c55e',
  error: '#ef4444',
  warning: '#f59e0b',
  info: '#3b82f6',
  
  // Borders and dividers
  border: '#27272a',
  borderLight: '#3f3f46',
  divider: '#27272a',
  
  // Interactive elements
  buttonBackground: '#3b82f6',
  buttonText: '#ffffff',
  inputBackground: '#262626',
  inputBorder: '#3f3f46',
  
  // Overlays and shadows
  overlay: 'rgba(0, 0, 0, 0.7)',
  shadow: 'rgba(0, 0, 0, 0.3)',
  
  // Chart and graph colors
  chartPositive: '#22c55e',
  chartNegative: '#ef4444',
  chartNeutral: '#a1a1aa',
};

export const lightTheme: Theme = {
  colors: lightColors,
  isDark: false,
};

export const darkTheme: Theme = {
  colors: darkColors,
  isDark: true,
};

export const themes = {
  light: lightTheme,
  dark: darkTheme,
};
