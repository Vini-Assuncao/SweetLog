/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./*.html', './js/**/*.js'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#7C3AED',
          dark: '#6D28D9',
          light: '#A78BFA',
          soft: '#EFEAFE',
        },
        accent: {
          blue: '#6366F1',
          'blue-soft': '#E8EAFB',
        },
        bg: '#F3F4FA',
        card: '#FFFFFF',
        border: '#E7E7F1',
        ink: {
          DEFAULT: '#1E1B2E',
          muted: '#71717F',
          faint: '#A0A0AC',
        },
        success: { DEFAULT: '#16A34A', soft: '#E7F8EE' },
        warning: { DEFAULT: '#D97706', soft: '#FDF1E4' },
        danger:  { DEFAULT: '#DC2626', soft: '#FCEAEA' },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        heading: ['Poppins', 'Inter', 'sans-serif'],
      },
      borderRadius: {
        sm: '8px',
        DEFAULT: '14px',
        lg: '20px',
      },
      boxShadow: {
        sm: '0 1px 2px rgba(30,27,46,0.04)',
        DEFAULT: '0 4px 16px rgba(30,27,46,0.06)',
        lg: '0 12px 32px rgba(30,27,46,0.10)',
      },
      maxWidth: {
        page: '1180px',
      },
    },
  },
  plugins: [],
};
