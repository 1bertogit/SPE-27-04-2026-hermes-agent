/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        serif: ['Playfair Display', 'Georgia', 'Times New Roman', 'serif'],
      },
      colors: {
        editorial: {
          navy: '#1A2B48',
          'navy-light': '#2A3F62',
          'navy-dark': '#111D33',
          gold: '#C5A059',
          'gold-light': '#D4B574',
          'gold-dark': '#A8873D',
          'gold-muted': '#C5A05926',
          paper: '#F2F2F0',
          cream: '#E8E6E1',
          warm: '#D4CFC5',
          muted: '#8A8477',
          light: '#FAF9F7',
          'light-hover': '#F5F3EF',
          sage: '#6B7F6B',
          'sage-light': '#6B7F6B1A',
          rose: '#9B4D4D',
          'rose-light': '#9B4D4D1A',
          slate: '#3D5A80',
          'slate-light': '#3D5A801A',
        },
      },
      maxWidth: {
        container: '1400px',
      },
      letterSpacing: {
        editorial: '0.15em',
      },
      animation: {
        'fade-in': 'fadeIn 0.4s ease-out',
        'slide-up': 'slideUp 0.4s ease-out',
        'slide-down': 'slideDown 0.4s ease-out',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideDown: {
          '0%': { opacity: '0', transform: 'translateY(-10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
};
