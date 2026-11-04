/** @type {import('tailwindcss').Config} */
// Tokens live in src/index.css on :root. This file only maps them onto
// utilities so components never hardcode a hex value or an arbitrary radius.
const token = (name) => `oklch(var(--${name}) / <alpha-value>)`;

export default {
  // Toggled on <html> by the theme script in index.html (saved choice or
  // the system setting).
  darkMode: 'class',
  // hover: styles only on devices that really hover (mouse, trackpad). On a
  // phone a tap would otherwise leave the hover look stuck on.
  future: { hoverOnlyWhenSupported: true },
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
      // Every transition utility also carries transform, so the press scale
      // on buttons (index.css) eases back on release instead of snapping.
      transitionProperty: {
        colors: 'color, background-color, border-color, text-decoration-color, fill, stroke, transform',
        opacity: 'opacity, transform',
      },
      // A strong ease-out by default; the built-in curves read as mushy.
      transitionTimingFunction: {
        DEFAULT: 'cubic-bezier(0.23, 1, 0.32, 1)',
        out: 'cubic-bezier(0.23, 1, 0.32, 1)',
        'in-out': 'cubic-bezier(0.77, 0, 0.175, 1)',
        drawer: 'cubic-bezier(0.32, 0.72, 0, 1)',
      },
    },
  },
  plugins: [],
};
