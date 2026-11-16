'use client';

import React, { useEffect, useLayoutEffect, useState } from 'react';

const useThemeEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;

export const DarkModeToggle: React.FC<{ onThemeChange?: (dark: boolean) => void }> = ({ onThemeChange }) => {
  const [isDark, setIsDark] = useState<boolean>(false);

  useThemeEffect(() => {
    const savedTheme = localStorage.getItem('yuding_theme') || localStorage.getItem('theme') || document.documentElement.dataset.theme;
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const darkActive = savedTheme === 'dark' || (!savedTheme && systemPrefersDark);

    setIsDark(darkActive);
    applyTheme(darkActive);
  }, []);

  const applyTheme = (dark: boolean) => {
    const html = document.documentElement;
    const theme = dark ? 'dark' : 'light';
    html.setAttribute('data-theme', theme);
    document.cookie = `yuding_theme=${theme}; Path=/; Max-Age=31536000; SameSite=Lax`;
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
    const nextTheme = nextDark ? 'dark' : 'light';
    localStorage.setItem('yuding_theme', nextTheme);
    localStorage.setItem('theme', nextTheme);
    document.cookie = `yuding_theme=${nextDark ? 'dark' : 'light'}; Path=/; Max-Age=31536000; SameSite=Lax`;
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
