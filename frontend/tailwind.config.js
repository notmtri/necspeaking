/** @type {import('tailwindcss').Config} */
// Tokens live in src/index.css on :root. This file only maps them onto
// utilities so components never hardcode a hex value or an arbitrary radius.
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        surface: {
          base: 'var(--surface-base)',
          raised: 'var(--surface-raised)',
          sunken: 'var(--surface-sunken)',
        },
        overlay: {
          DEFAULT: 'var(--overlay)',
          hover: 'var(--overlay-hover)',
        },
        line: 'var(--line)',
        ink: {
          DEFAULT: 'var(--ink)',
          muted: 'var(--ink-muted)',
          subtle: 'var(--ink-subtle)',
        },
      },
      borderRadius: {
        control: '0.75rem',
        card: '1rem',
        panel: '1.5rem',
      },
      fontFamily: {
        sans: ['Nunito Sans', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
