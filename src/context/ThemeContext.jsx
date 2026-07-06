import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export function ThemeProvider({ children }) {

  const getTemaInicial = () => {

    const temaSalvo = localStorage.getItem('theme');
    if (temaSalvo) {
      return temaSalvo === 'dark';
    }
 
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  };

  const [isDarkMode, setIsDarkMode] = useState(getTemaInicial);

  useEffect(() => {
    const root = window.document.documentElement;
    
    if (isDarkMode) {
      root.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const ouvirMudancaSistema = (evento) => {

      if (!localStorage.getItem('theme')) {
        setIsDarkMode(evento.matches);
      }
    };

    mediaQuery.addEventListener('change', ouvirMudancaSistema);
    return () => mediaQuery.removeEventListener('change', ouvirMudancaSistema);
  }, []);

  const toggleTheme = () => {
    setIsDarkMode((prev) => !prev);
  };

  return (
    <ThemeContext.Provider value={{ isDarkMode, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);