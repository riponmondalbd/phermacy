/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#eef9f4',
          100: '#d5f1e4',
          200: '#aee3cc',
          300: '#77ceac',
          400: '#3eb388',
          500: '#1f9870',
          600: '#137a5a',
          700: '#106249',
          800: '#0f4e3b',
          900: '#0d4031',
          950: '#07241c',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace']
      },
      boxShadow: {
        'card': '0 1px 3px 0 rgba(0,0,0,.07), 0 1px 2px -1px rgba(0,0,0,.07)',
        'card-hover': '0 4px 12px -2px rgba(0,0,0,.12)',
        'modal': '0 20px 60px -10px rgba(0,0,0,.3)'
      },
      borderRadius: { xl: '1rem', '2xl': '1.25rem' },
      animation: {
        'fade-in': 'fadeIn .2s ease',
        'slide-up': 'slideUp .25s ease',
      },
      keyframes: {
        fadeIn:  { from: { opacity: 0 },            to: { opacity: 1 } },
        slideUp: { from: { transform: 'translateY(8px)', opacity: 0 }, to: { transform: 'translateY(0)', opacity: 1 } }
      }
    }
  },
  plugins: []
}
