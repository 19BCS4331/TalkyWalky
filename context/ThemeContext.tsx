import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const colors = {
  dark: {
    primary: '#7928CA',
    secondary: '#FF0080',
    background: '#1a1a1a',
    surface: '#2a2a2a',
    surfaceVariant: '#333',
    text: '#ffffff',
    textSecondary: 'rgba(255,255,255,0.7)',
    border: '#404040',
    gradientStart: '#7928CA',
    gradientEnd: '#FF0080',
    error: '#ff4444',
    success: '#00C851',
    warning: '#ffbb33',
    cardBackground: ['#2a2a2a', '#2a2a2a'] as const,
    cardBackgroundInactive: ['#222', '#222'] as const,
  },
  light: {
    primary: '#6200EE',
    secondary: '#03DAC6',
    background: '#F5F5F9',
    surface: '#FFFFFF',
    surfaceVariant: '#E1E1E1',
    text: '#1A1A1A',
    textSecondary: 'rgba(0,0,0,0.6)',
    border: '#E0E0E0',
    gradientStart: '#6200EE',
    gradientEnd: '#03DAC6',
    error: '#B00020',
    success: '#00855B',
    warning: '#FF6D00',
    cardBackground: ['#FFFFFF', '#F8F8F8'] as const,
    cardBackgroundInactive: ['#F0F0F0', '#E8E8E8'] as const,
  }
};

type ThemeType = 'dark' | 'light';

interface ThemeContextType {
  theme: ThemeType;
  colors: typeof colors.dark | typeof colors.light;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<ThemeType>('dark');

  useEffect(() => {
    loadTheme();
  }, []);

  const loadTheme = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem('theme');
      if (savedTheme) {
        setTheme(savedTheme as ThemeType);
      }
    } catch (error) {
      console.error('Error loading theme:', error);
    }
  };

  const toggleTheme = async () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    try {
      await AsyncStorage.setItem('theme', newTheme);
    } catch (error) {
      console.error('Error saving theme:', error);
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, colors: colors[theme], toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
