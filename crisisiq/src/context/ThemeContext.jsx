import { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem('crisisiq-theme');
    if (saved) setIsDark(saved === 'dark');
  }, []);

  const toggleTheme = () => {
    setIsDark(!isDark);
    localStorage.setItem(
      'crisisiq-theme', 
      !isDark ? 'dark' : 'light'
    );
  };

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.remove('light');
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
    }
  }, [isDark]);

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme }}>
      <div className={`${isDark ? 'dark' : 'light'} theme-transition-wrapper`}>
        {children}
      </div>
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
