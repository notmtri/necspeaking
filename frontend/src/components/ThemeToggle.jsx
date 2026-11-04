import React, { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';
import { applyTheme, isDarkTheme, readSavedTheme, saveTheme } from '../theme';

/**
 * Moon in light mode, sun in dark mode. Until it is pressed the site follows
 * the device setting (the inline script in index.html applies it before first
 * paint); once pressed, the choice is saved for this browser.
 */
export default function ThemeToggle({ className = '' }) {
  const [dark, setDark] = useState(isDarkTheme);

  // Keep following the device while no choice has been saved.
  useEffect(() => {
    const query = window.matchMedia?.('(prefers-color-scheme: dark)');
    if (!query) return undefined;
    const follow = (event) => {
      if (readSavedTheme()) return;
      applyTheme(event.matches);
      setDark(event.matches);
    };
    query.addEventListener?.('change', follow);
    return () => query.removeEventListener?.('change', follow);
  }, []);

  const toggle = () => {
    const next = !dark;
    applyTheme(next);
    saveTheme(next);
    setDark(next);
  };

  return (
    <button
      type="button"
      onClick={toggle}
      className={className}
      aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={dark ? 'Light mode' : 'Dark mode'}
    >
      {dark ? <Sun size={17} /> : <Moon size={17} />}
    </button>
  );
}
