import React, { useEffect } from 'react';
import { useAppStore } from '../store/useAppStore';

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { theme } = useAppStore();

  const [isDark, setIsDark] = React.useState(() => {
    if (typeof window !== 'undefined') {
      return theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    }
    return false;
  });

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const applyTheme = () => {
      setIsDark(theme === 'dark' || (theme === 'system' && mediaQuery.matches));
    };

    applyTheme();

    const listener = () => {
      if (useAppStore.getState().theme === 'system') {
        applyTheme();
      }
    };

    mediaQuery.addEventListener('change', listener);
    return () => mediaQuery.removeEventListener('change', listener);
  }, [theme]);

  return (
    <div className={`kebo-theme-root h-full w-full ${isDark ? 'dark' : ''}`}>
      {children}
    </div>
  );
};
