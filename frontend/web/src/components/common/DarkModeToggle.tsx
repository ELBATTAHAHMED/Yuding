'use client';

import React, { useEffect, useState } from 'react';

export const DarkModeToggle: React.FC = () => {
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
    if (dark) {
      html.classList.add('dark');
      html.setAttribute('data-theme', 'dark');
    } else {
      html.classList.remove('dark');
      html.removeAttribute('data-theme');
    }
  };

  const toggleTheme = () => {
    const nextDark = !isDark;
    setIsDark(nextDark);
    applyTheme(nextDark);
    localStorage.setItem('theme', nextDark ? 'dark' : 'light');
  };

  return (
    <button
      onClick={toggleTheme}
      id="darkModeToggle"
      className={`dark-mode-toggle ${isDark ? 'active' : ''}`}
      title="Basculer le mode sombre"
      aria-label="Basculer le mode sombre"
      type="button"
    >
      <i className={`fas ${isDark ? 'fa-sun' : 'fa-moon'}`} id="darkModeIcon"></i>
    </button>
  );
};
