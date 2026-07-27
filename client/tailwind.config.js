/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        love: { pink: '#fe3a8a', red: '#ed1567', purple: '#9b59b6' },
        dark: {
          bg: '#0f0f0f',
          card: '#1a1a1a',
          surface: '#242424',
          border: '#2a2a2a',
          text: '#e5e5e5',
          muted: '#888888',
        },
      },
    },
  },
  plugins: [],
};
