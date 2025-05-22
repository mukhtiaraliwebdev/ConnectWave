
"use client";

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

interface ThemeProviderProps {
  children: ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
}

export function ThemeProvider({
  children,
  defaultTheme = 'light',
  storageKey = 'connectwave-theme',
}: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window !== 'undefined') {
      try {
        const storedTheme = window.localStorage.getItem(storageKey) as Theme | null;
        if (storedTheme) {
          return storedTheme;
        }
      } catch (e) {
        console.error('Error reading theme from localStorage', e);
      }
    }
    return defaultTheme;
  });

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(theme);
  }, [theme]);

  const setTheme = useCallback((newTheme: Theme) => {
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem(storageKey, newTheme);
      } catch (e) {
        console.error('Error saving theme to localStorage', e);
      }
    }
    setThemeState(newTheme);
  }, [storageKey]);

  const toggleTheme = useCallback(() => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  }, [theme, setTheme]);

  const value = { theme, toggleTheme, setTheme };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
