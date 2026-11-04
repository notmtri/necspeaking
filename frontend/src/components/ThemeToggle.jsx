import React, { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';

const STORAGE_KEY = 'necs.theme';

const isDark = () => document.documentElement.classList.contains('dark');

/**
 * Moon in light mode, sun in dark mode. Until it is pressed the site follows
 * the device setting (the inline script in index.html applies it before first
 * paint); once pressed, the choice is saved for this browser.
 */
export default function ThemeToggle({ className = '' }) {
  const [dark, setDark] = useState(isDark);

  // Keep following the device while no choice has been saved.
  useEffect(() => {
    const query = window.matchMedia?.('(prefers-color-scheme: dark)');
    if (!query) return undefined;
    const follow = (event) => {
      let saved = null;
      try { saved = window.localStorage.getItem(STORAGE_KEY); } catch { /* private mode */ }
      if (saved) return;
      document.documentElement.classList.toggle('dark', event.matches);
      setDark(event.matches);
    };
    query.addEventListener?.('change', follow);
    return () => query.removeEventListener?.('change', follow);
  }, []);

  const toggle = () => {
    const next = !dark;
    document.documentElement.classList.toggle('dark', next);
    try { window.localStorage.setItem(STORAGE_KEY, next ? 'dark' : 'light'); } catch { /* private mode */ }
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
