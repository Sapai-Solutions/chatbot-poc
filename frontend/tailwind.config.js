/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Inter"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', '"Fira Code"', 'ui-monospace', 'monospace'],
      },
      colors: {
        parliament: {
          50:  '#FFFBF0',
          100: '#FFF3D6',
          200: '#FFE4A8',
          300: '#FFD070',
          400: '#F5B731',
          500: '#D4A020',
          600: '#B8891A',
          700: '#9A7215',
          800: '#7D5C11',
          900: '#5E450D',
          950: '#3D2B08',
        },
        ink: {
          DEFAULT: '#0A0A0A',
          1: '#141414',
          2: '#1E1E1E',
          3: '#282828',
          4: '#333333',
          5: '#444444',
        },
        snow: {
          DEFAULT: '#F5F5F5',
          muted:   '#9A9A9A',
          faint:   '#555555',
        },
        success: '#22C55E',
        warning: '#F59E0B',
        error:   '#EF4444',
        info:    '#3B82F6',
      },
      animation: {
        'fade-in':       'fade-in 0.3s ease-out both',
        'slide-up':      'slide-up 0.25s ease-out both',
        'slide-in-left': 'slide-in-left 0.25s ease-out both',
      },
      keyframes: {
        'fade-in': {
          from: { opacity: '0' },
          to:   { opacity: '1' },
        },
        'slide-up': {
          from: { opacity: '0', transform: 'translateY(12px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-in-left': {
          from: { opacity: '0', transform: 'translateX(-12px)' },
          to:   { opacity: '1', transform: 'translateX(0)' },
        },
      },
    },
  },
  plugins: [],
}
