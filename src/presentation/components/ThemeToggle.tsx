import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../../core/theme';

export const ThemeToggle: React.FC = () => {
  const { theme, themeMode, setThemeMode } = useTheme();
  const { colors } = theme;

  const themeOptions = [
    { key: 'light', label: '☀️ Light', icon: '☀️' },
    { key: 'dark', label: '🌙 Dark', icon: '🌙' },
    { key: 'system', label: '📱 System', icon: '📱' },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      <Text style={[styles.title, { color: colors.text }]}>
        Theme
      </Text>
      <View style={styles.optionsContainer}>
        {themeOptions.map((option) => (
          <TouchableOpacity
            key={option.key}
            style={[
              styles.option,
              {
                backgroundColor: themeMode === option.key ? colors.primary : colors.card,
                borderColor: colors.border,
              }
            ]}
            onPress={() => setThemeMode(option.key as any)}
          >
            <Text style={styles.icon}>{option.icon}</Text>
            <Text
              style={[
                styles.optionText,
                {
                  color: themeMode === option.key ? colors.textInverse : colors.text,
                }
              ]}
            >
              {option.label.replace(/^.+\s/, '')} {/* Remove emoji from label */}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      
      <View style={[styles.infoContainer, { backgroundColor: colors.surfaceSecondary }]}>
        <Text style={[styles.infoText, { color: colors.textSecondary }]}>
          Current: {theme.isDark ? '🌙 Dark Mode' : '☀️ Light Mode'}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    borderRadius: 12,
    marginVertical: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  optionsContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  option: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 1,
    gap: 6,
  },
  icon: {
    fontSize: 16,
  },
  optionText: {
    fontSize: 14,
    fontWeight: '500',
  },
  infoContainer: {
    padding: 8,
    borderRadius: 6,
    alignItems: 'center',
  },
  infoText: {
    fontSize: 12,
    fontWeight: '500',
  },
});
