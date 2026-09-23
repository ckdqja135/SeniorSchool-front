'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import ThemeToggle from '@/components/common/ThemeToggle';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  hideDefaultToggle: boolean;
  setHideDefaultToggle: (v: boolean) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'light',
  toggleTheme: () => {},
  hideDefaultToggle: false,
  setHideDefaultToggle: () => {},
});

export const useTheme = () => useContext(ThemeContext);

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>('light');
  const [mounted, setMounted] = useState(false);
  const [hideDefaultToggle, setHideDefaultToggle] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('theme') as Theme | null;
    if (stored) {
      setTheme(stored);
    } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setTheme('dark');
    }
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme, mounted]);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  }, []);

  // 마운트 전후로 감싸는 요소가 바뀌면(Fragment → Provider) React 가 children 전체를 다시 마운트해
  // 모든 페이지의 useEffect(API 호출·방문 기록)가 두 번 실행된다. Provider 는 항상 유지하고 토글만 마운트 후 표시한다.
  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, hideDefaultToggle, setHideDefaultToggle }}>
      {mounted && !hideDefaultToggle && <ThemeToggle />}
      {children}
    </ThemeContext.Provider>
  );
}
