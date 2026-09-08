'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';

type Theme = 'light' | 'dark';

type ThemeContextType = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextType>({
  theme: 'light',
  setTheme: () => {},
  toggleTheme: () => {},
});

export const useTheme = () => useContext(ThemeContext);

export function ThemeProviderWrapper({ children }: { children: React.ReactNode }) {
  // Initialize from what the inline <script> already set on <html>
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window !== 'undefined') {
      return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
    }
    return 'light';
  });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Sync state with the actual DOM class (set by the inline script in layout)
    const currentTheme = document.documentElement.classList.contains('dark') ? 'dark' : 'light';
    setThemeState(currentTheme);
    setMounted(true);
  }, []);

  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem('tuktak-theme', newTheme);
    document.documentElement.classList.toggle('dark', newTheme === 'dark');
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  }, [theme, setTheme]);

  // Always render children — the inline script in <head> already prevents flash.
  // Before mount, provide a static context value to avoid hydration mismatch.
  const contextValue = mounted
    ? { theme, setTheme, toggleTheme }
    : { theme: 'light' as Theme, setTheme: () => {}, toggleTheme: () => {} };

  return <ThemeContext.Provider value={contextValue}>{children}</ThemeContext.Provider>;
}
