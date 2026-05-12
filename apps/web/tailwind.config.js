/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT: '#01696f', hover: '#0c4e54', light: '#cedcd8' },
        surface: { bg: '#f7f6f2', DEFAULT: '#f9f8f5', 2: '#fbfbf9', offset: '#f3f0ec' },
      },
      fontFamily: { sans: ['Inter', 'system-ui', 'sans-serif'] },
    },
  },
  plugins: [],
}
