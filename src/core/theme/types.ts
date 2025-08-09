export interface ThemeColors {
  // Backgrounds
  background: string;
  surface: string;
  surfaceSecondary: string;
  card: string;
  
  // Text colors
  text: string;
  textSecondary: string;
  textTertiary: string;
  textInverse: string;
  
  // Primary colors
  primary: string;
  primaryDark: string;
  primaryLight: string;
  
  // Status colors
  success: string;
  error: string;
  warning: string;
  info: string;
  
  // Borders and dividers
  border: string;
  borderLight: string;
  divider: string;
  
  // Interactive elements
  buttonBackground: string;
  buttonText: string;
  inputBackground: string;
  inputBorder: string;
  
  // Overlays and shadows
  overlay: string;
  shadow: string;
  
  // Chart and graph colors
  chartPositive: string;
  chartNegative: string;
  chartNeutral: string;
}

export interface Theme {
  colors: ThemeColors;
  isDark: boolean;
}

export type ThemeMode = 'light' | 'dark' | 'system';

export interface ThemeContextType {
  theme: Theme;
  themeMode: ThemeMode;
  toggleTheme: () => void;
  setThemeMode: (mode: ThemeMode) => void;
}
