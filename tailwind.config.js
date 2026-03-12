/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./App.{js,jsx,ts,tsx}",
    "./src/**/*.{js,jsx,ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#F5F7FF',
          100: '#EBF0FF',
          200: '#D4E1FF',
          300: '#A8C5FF',
          400: '#7BA8FF',
          500: '#5B8FFF', // Warmer primary blue
          600: '#3D72E8',
          700: '#2854B8',
        },
        secondary: {
          50: '#FAF5FF',
          100: '#F3E8FF',
          200: '#E9D5FF',
          300: '#D8B4FE',
          400: '#C084FC',
          500: '#A855F7', // Purple
          600: '#9333EA',
          700: '#7C3AED',
        },
        purple: {
          50: '#FAF5FF',
          100: '#F3E8FF',
          200: '#E9D5FF',
          300: '#D8B4FE',
          400: '#C084FC',
          500: '#A855F7',
          600: '#9333EA',
          700: '#7C3AED',
        },
        pink: {
          50: '#FDF2F8',
          100: '#FCE7F3',
          200: '#FBCFE8',
          300: '#F9A8D4',
          400: '#F472B6',
          500: '#EC4899',
        },
        coral: {
          50: '#FFF5F3',
          100: '#FFE8E3',
          200: '#FFD1C7',
          300: '#FFB39F',
          400: '#FF9577',
          500: '#FF7A5C', // Warm coral for romantic elements
          600: '#E8614A',
          700: '#C74A36',
        },
        peach: {
          50: '#FFF9F5',
          100: '#FFF0E6',
          200: '#FFE0CC',
          300: '#FFC999',
          400: '#FFB088',
          500: '#FF9966', // Soft peach for highlights
          600: '#E87A4D',
          700: '#C75C35',
        },
        amber: {
          50: '#FFFBEB',
          100: '#FEF3C7',
          200: '#FDE68A',
          300: '#FCD34D',
          400: '#FBBF24',
          500: '#F59E0B',
          600: '#D97706',
        },
        emerald: {
          50: '#F0FDF8',
          100: '#D4F4E6',
          200: '#A8E8CF',
          300: '#6ED9AD',
          400: '#52C797', // Warmer mint-green
          500: '#3AB87E',
          600: '#28A06A',
        },
        neutral: {
          50: '#FDFAF7', // Warm off-white (app background)
          100: '#F8F4F0', // Warm cream
          200: '#F0EAE4', // Warm beige
          300: '#E0D7CE', // Warm divider
          400: '#A8A099',
          500: '#736B63',
          600: '#5A524A', // Warm secondary text
          700: '#3D362F',
          800: '#2A231D',
          900: '#2A1F1A', // Warm dark (primary text)
        },
        success: '#52C797', // Warmer mint-green
        warning: '#F59E0B',
        error: '#FF7A5C', // Softer coral-red
        romantic: '#FF8B7C', // Soft coral-pink for match elements
      },
      fontFamily: {
        'sans': ['PlusJakartaSans_400Regular', 'sans-serif'],
        'sans-medium': ['PlusJakartaSans_500Medium', 'sans-serif'],
        'sans-semibold': ['PlusJakartaSans_600SemiBold', 'sans-serif'],
        'sans-bold': ['PlusJakartaSans_700Bold', 'sans-serif'],
        'sans-extrabold': ['PlusJakartaSans_800ExtraBold', 'sans-serif'],
      },
      borderRadius: {
        'xs': '4px',
        'sm': '6px',
        'md': '8px',
        'lg': '12px',
        'xl': '16px',
      },
      // Shadow colors for dual-shadow system
      boxShadowColor: {
        'light': 'rgba(255, 255, 255, 0.5)',
        'dark': 'rgba(42, 31, 26, 0.15)',
        'warm-light': 'rgba(255, 250, 245, 0.8)',
        'warm-dark': 'rgba(255, 150, 120, 0.2)',
      },
    },
  },
  plugins: [],
}
