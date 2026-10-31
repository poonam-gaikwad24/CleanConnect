import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      // CleanConnect design system: deep civic green as the primary colour.
      // Neutrals (slate), and red/amber/blue for error/warning/info, stay as
      // Tailwind's defaults so existing pages keep working unchanged.
      colors: {
        brand: {
          50: '#f1f8f4',
          100: '#dff0e6',
          200: '#bfe0cd',
          300: '#94c9ab',
          400: '#5fa883',
          500: '#3a8a63',
          600: '#2b7350',
          700: '#225d41',
          800: '#1c4a35',
          900: '#163b2b',
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
