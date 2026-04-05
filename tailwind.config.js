/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#fff1f5',
          100: '#ffe0ea',
          200: '#ffc5d9',
          300: '#ff96b8',
          400: '#ff5590',
          500: '#ff2d72',
          600: '#ed0a53',
          700: '#c8003f',
          800: '#a60038',
          900: '#8b0035',
          950: '#50001a',
        },
      },
    },
  },
  plugins: [],
};
