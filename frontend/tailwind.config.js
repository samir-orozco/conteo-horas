/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Paleta HoraPro
        primary: { DEFAULT: '#FFD85E', dark: '#F0C63F', light: '#FFE995' },
        ink: '#303030',
        muted: '#898989',
        // Escala "blue" remapeada a grafito: las vistas existentes
        // adoptan la línea gráfica sin reescribir cada clase
        blue: {
          50: '#f7f7f7',
          100: '#efefef',
          200: '#e2e2e2',
          300: '#d4d4d4',
          400: '#a8a8a8',
          500: '#898989',
          600: '#5c5c5c',
          700: '#454545',
          800: '#303030',
          900: '#242424',
        },
      },
      borderRadius: {
        card: '14px',
      },
    },
  },
  plugins: [],
}
