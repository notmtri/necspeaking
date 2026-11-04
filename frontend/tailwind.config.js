/** @type {import('tailwindcss').Config} */
// Tokens live in src/index.css on :root. This file only maps them onto
// utilities so components never hardcode a hex value or an arbitrary radius.
const token = (name) => `oklch(var(--${name}) / <alpha-value>)`;

export default {
  // Toggled on <html> by the theme script in index.html (saved choice or
  // the system setting).
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        surface: {
          base: token('surface-base'),
          raised: token('surface-raised'),
          sunken: token('surface-sunken'),
        },
        overlay: {
          DEFAULT: token('overlay'),
          hover: token('overlay-hover'),
        },
        line: token('line'),
        ink: {
          DEFAULT: token('ink'),
          muted: token('ink-muted'),
          subtle: token('ink-subtle'),
        },
        'on-ink': token('on-ink'),
      },
      borderRadius: {
        control: '0.75rem',
        card: '1rem',
        panel: '1.5rem',
      },
      // Radii: inputs and small chips use control, content boxes card, page
      // sections panel; every button is a full pill (rounded-full).
      fontFamily: {
        sans: ['"Inter Variable"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['"Be Vietnam Pro"', '"Inter Variable"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
