import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Appearance, ColorSchemeName } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Theme, ThemeMode, ThemeContextType } from './types';
import { lightTheme, darkTheme } from './themes';

const THEME_STORAGE_KEY = '@finan_wallet_theme_mode';

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [themeMode, setThemeModeState] = useState<ThemeMode>('dark');
  const [systemColorScheme, setSystemColorScheme] = useState<ColorSchemeName>(
    Appearance.getColorScheme()
  );

  // Determine current theme based on mode and system preference
  const getCurrentTheme = (): Theme => {
    if (themeMode === 'light') return lightTheme;
    if (themeMode === 'dark') return darkTheme;
    
    // System mode - follow system preference, nhưng ưu tiên dark theme
    return systemColorScheme === 'light' ? lightTheme : darkTheme;
  };

  // Luôn khởi tạo với dark theme trước, sau đó mới cập nhật theo preference
  const [theme, setTheme] = useState<Theme>(darkTheme);

  // Load saved theme mode from storage
  useEffect(() => {
    const loadThemeMode = async () => {
      try {
        // Luôn đặt chế độ tối làm mặc định trước
        await AsyncStorage.setItem(THEME_STORAGE_KEY, 'dark');
        setThemeModeState('dark');
        console.log('⚫️ Đã đặt chế độ tối làm mặc định');
      } catch (error) {
        console.error('Error setting dark theme mode:', error);
      }
    };

    loadThemeMode();
  }, []);

  // Listen to system color scheme changes
  useEffect(() => {
    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      console.log('🌙 System color scheme changed to:', colorScheme);
      setSystemColorScheme(colorScheme);
    });

    return () => subscription?.remove();
  }, []);

  // Update theme when mode or system preference changes
  useEffect(() => {
    const newTheme = getCurrentTheme();
    setTheme(newTheme);
    console.log('🎨 Theme updated:', {
      mode: themeMode,
      systemScheme: systemColorScheme,
      isDark: newTheme.isDark
    });
  }, [themeMode, systemColorScheme]);

  // Save theme mode to storage
  const setThemeMode = async (mode: ThemeMode) => {
    try {
      setThemeModeState(mode);
      await AsyncStorage.setItem(THEME_STORAGE_KEY, mode);
      console.log('💾 Theme mode saved:', mode);
    } catch (error) {
      console.error('Error saving theme mode:', error);
    }
  };

  // Toggle between light and dark (skip system mode for quick toggle)
  const toggleTheme = () => {
    const currentTheme = getCurrentTheme();
    const newMode = currentTheme.isDark ? 'light' : 'dark';
    setThemeMode(newMode);
  };

  const contextValue: ThemeContextType = {
    theme,
    themeMode,
    toggleTheme,
    setThemeMode,
  };

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
};

// Custom hook to use theme
export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

// Helper hook to get just the theme colors
export const useThemeColors = () => {
  const { theme } = useTheme();
  return theme.colors;
};
