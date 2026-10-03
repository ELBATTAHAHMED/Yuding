'use client';

import React, { useEffect, useState } from 'react';

export const DarkModeToggle: React.FC<{ onThemeChange?: (dark: boolean) => void }> = ({ onThemeChange }) => {
  const [isDark, setIsDark] = useState<boolean>(false);

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const darkActive = savedTheme === 'dark' || (!savedTheme && systemPrefersDark);

    setIsDark(darkActive);
    applyTheme(darkActive);
  }, []);

  const applyTheme = (dark: boolean) => {
    const html = document.documentElement;
    const theme = dark ? 'dark' : 'light';
    html.setAttribute('data-theme', theme);
    document.body.setAttribute('data-theme', theme);
    if (dark) {
      html.classList.add('dark');
    } else {
      html.classList.remove('dark');
    }
  };

  const toggleTheme = () => {
    const nextDark = !isDark;
    setIsDark(nextDark);
    applyTheme(nextDark);
    localStorage.setItem('theme', nextDark ? 'dark' : 'light');
    onThemeChange?.(nextDark);
  };

  return (
    <button
      onClick={toggleTheme}
      id="darkModeToggle"
      className={`dark-mode-toggle ${isDark ? 'active' : ''}`}
      title={isDark ? 'Basculer le mode clair' : 'Basculer le mode sombre'}
      aria-label={isDark ? 'Basculer le mode clair' : 'Basculer le mode sombre'}
      type="button"
    >
      <i className={`fas ${isDark ? 'fa-sun' : 'fa-moon'}`} id="darkModeIcon"></i>
    </button>
  );
};
