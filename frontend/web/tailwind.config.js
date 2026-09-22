/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ['class', '[data-theme="dark"]'],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/features/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        yuding: {
          primary: '#01796F',
          'primary-dark': '#005951',
          'primary-light': '#00897B',
          secondary: '#02E0D5',
          accent: '#218A87',
          dark: '#001B1A',
          'dark-deep': '#001413',
          'dark-bg': '#021817',
          'dark-surface': '#062523',
          'dark-card': '#0a302d',
          'dark-hover': '#0f3e3a',
          surface: '#062523',
          'surface-card': '#0a302d',
          'surface-hover': '#0f3e3a',
          glow: '#02E0D5',
          success: '#10B981',
          warning: '#F59E0B',
          danger: '#EF4444',
        },
      },
      fontFamily: {
        sans: ['Poppins', 'Montserrat', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        display: ['Montserrat', 'Poppins', 'sans-serif'],
      },
      borderRadius: {
        card: '12px',
        input: '6px',
        pill: '30px',
      },
      boxShadow: {
        yuding: '0 4px 15px rgba(0, 0, 0, 0.08)',
        'yuding-card': '0 6px 20px rgba(0, 0, 0, 0.08)',
        'yuding-strong': '0 10px 30px rgba(0, 0, 0, 0.15)',
        'yuding-glow': '0 0 20px rgba(2, 224, 213, 0.3)',
      },
    },
  },
  corePlugins: {
    preflight: false,
  },
  plugins: [],
};
