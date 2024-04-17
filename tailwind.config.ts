import type { Config } from 'tailwindcss'

export default {
  content: ['./app/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      fontSize: {
        '2xs': '.625rem',
      }
    },
  },
  plugins: [
    require('@tailwindcss/forms')
  ],
} satisfies Config

