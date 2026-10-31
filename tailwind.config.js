/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        bg: 'var(--bg)',
        'bg-soft': 'var(--bg-soft)',
        surface: 'var(--surface)',
        'surface-2': 'var(--surface-2)',
        line: 'var(--border)',
        ink: 'rgb(var(--ink-rgb) / <alpha-value>)',
        'ink-2': 'rgb(var(--ink-2-rgb) / <alpha-value>)',
        'ink-3': 'rgb(var(--ink-3-rgb) / <alpha-value>)',
        brand: 'rgb(var(--brand-rgb) / <alpha-value>)',
        'brand-2': 'rgb(var(--brand-2-rgb) / <alpha-value>)',
        amber: 'rgb(var(--amber-rgb) / <alpha-value>)',
        rose: 'rgb(var(--rose-rgb) / <alpha-value>)',
        mint: 'rgb(var(--green-rgb) / <alpha-value>)',
      },
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'PingFang SC',
          'Hiragino Sans GB',
          'Microsoft YaHei',
          'Noto Sans SC',
          'system-ui',
          'sans-serif',
        ],
        mono: ['SFMono-Regular', 'Menlo', 'Consolas', 'monospace'],
      },
      borderRadius: {
        xl2: '20px',
      },
      keyframes: {
        floatUp: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        pop: {
          '0%': { transform: 'scale(0.9)', opacity: '0' },
          '60%': { transform: 'scale(1.03)' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        shake: {
          '0%,100%': { transform: 'translateX(0)' },
          '25%': { transform: 'translateX(-6px)' },
          '75%': { transform: 'translateX(6px)' },
        },
        glow: {
          '0%,100%': { opacity: '0.55' },
          '50%': { opacity: '1' },
        },
        dmg: {
          '0%': { opacity: '0', transform: 'translateY(10px) scale(0.85)' },
          '18%': { opacity: '1', transform: 'translateY(-2px) scale(1.1)' },
          '100%': { opacity: '0', transform: 'translateY(-46px) scale(1)' },
        },
      },
      animation: {
        floatUp: 'floatUp 0.35s cubic-bezier(0.22,1,0.36,1) both',
        pop: 'pop 0.28s cubic-bezier(0.22,1,0.36,1) both',
        shake: 'shake 0.32s ease-in-out',
        glow: 'glow 2.4s ease-in-out infinite',
        dmg: 'dmg 0.9s cubic-bezier(0.22,1,0.36,1) forwards',
      },
    },
  },
  plugins: [],
}
