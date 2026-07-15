/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Carbón (base de la marca) y su escala de apoyo.
        carbon: {
          DEFAULT: '#221F1A',
          50: '#F6F3EE',
          100: '#EAE5DC',
          200: '#D8D0C2',
          600: '#2E2A23',
          700: '#221F1A',
          800: '#191612',
          900: '#12100C',
        },
        // Oro viejo: el acento de barbería.
        oro: {
          DEFAULT: '#C79A3B',
          light: '#F3E8CF',
          dark: '#A67F2C',
        },
        // Estados de turnos y números.
        ok: '#0F9D58',
        pendiente: '#F08C2E',
        confirmado: '#2E7DD1',
        cancelado: '#9A938A',
        rojo: '#E2483B',
      },
      fontFamily: {
        // Cabinet Grotesk para títulos, Inter para el cuerpo.
        display: ['"Cabinet Grotesk"', 'Inter', 'system-ui', 'sans-serif'],
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      borderRadius: {
        xl: '0.875rem',
        '2xl': '1.25rem',
        '3xl': '1.75rem',
      },
      boxShadow: {
        card: '0 1px 3px rgba(18, 16, 12, 0.08), 0 1px 2px rgba(18, 16, 12, 0.04)',
        sheet: '0 -8px 30px rgba(18, 16, 12, 0.14)',
      },
    },
  },
  plugins: [],
};
