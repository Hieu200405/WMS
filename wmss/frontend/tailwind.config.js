import { colors } from './src/styles/colors.js';
import { typography } from './src/styles/typography.js';
import { layout, spacing } from './src/styles/layout.js';

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: colors.primary,
        accent: colors.accent,
        success: colors.success,
        danger: colors.danger,
        warning: colors.warning,
      },
      fontFamily: typography.fontFamily,
      fontSize: typography.fontSize,
      fontWeight: typography.fontWeight,
      spacing: spacing,
      screens: layout.screens,
      borderRadius: layout.borderRadius,
      container: layout.container,
      animation: {
        'fade-in-up': 'fade-in-up 0.5s ease-out forwards',
      },
    },
  },
  plugins: [],
};
