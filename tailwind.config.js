/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        display: ['"Space Grotesk"', 'sans-serif'],
        body: ['"Sora"', 'sans-serif'],
      },
      colors: {
        elo: {
          bg: 'rgb(var(--elo-bg-rgb) / <alpha-value>)',
          panel: 'rgb(var(--elo-panel-rgb) / <alpha-value>)',
          card: 'rgb(var(--elo-card-rgb) / <alpha-value>)',
          border: 'rgb(var(--elo-border-rgb) / <alpha-value>)',
          'border-strong': 'rgb(var(--elo-border-strong-rgb) / <alpha-value>)',
          blue: '#5D5FEF',
          magenta: '#E63FE6',
          pink: '#FF3FA0',
          green: '#3FE6A0',
          lime: '#6FE63F',
          yellow: '#F5C518',
        },
        ink: {
          primary: 'var(--ink-primary)',
          secondary: 'var(--ink-secondary)',
          muted: 'var(--ink-muted)',
        },
        surface: {
          subtle: 'var(--surface-subtle)',
          hover: 'var(--surface-hover)',
        },
      },
      boxShadow: {
        glow: '0 0 40px -8px rgba(93, 95, 239, 0.45)',
        'glow-pink': '0 0 50px -10px rgba(255, 63, 160, 0.4)',
      },
      backgroundImage: {
        'elo-gradient':
          'linear-gradient(115deg, #4B3FFF 0%, #E63FE6 35%, #FF3FA0 55%, #F5C518 80%, #6FE63F 100%)',
        'elo-gradient-soft':
          'linear-gradient(115deg, rgba(75,63,255,0.25) 0%, rgba(230,63,230,0.25) 35%, rgba(255,63,160,0.25) 55%, rgba(245,197,24,0.25) 80%, rgba(111,230,63,0.25) 100%)',
      },
    },
  },
  plugins: [],
}
