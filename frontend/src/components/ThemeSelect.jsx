import React, { useEffect, useState } from 'react';

const STORAGE_KEY = 'necs.theme';
const OPTIONS = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

const readChoice = () => {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    return saved === 'light' || saved === 'dark' ? saved : 'system';
  } catch {
    return 'system';
  }
};

const systemPrefersDark = () => window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;

/** Applies a theme choice to <html>; mirrors the inline script in index.html. */
export function applyTheme(choice) {
  const dark = choice === 'dark' || (choice === 'system' && systemPrefersDark());
  document.documentElement.classList.toggle('dark', dark);
}

/** System / Light / Dark. The default follows the device and keeps following it. */
export default function ThemeSelect() {
  const [choice, setChoice] = useState(readChoice);

  useEffect(() => {
    applyTheme(choice);
    try {
      if (choice === 'system') window.localStorage.removeItem(STORAGE_KEY);
      else window.localStorage.setItem(STORAGE_KEY, choice);
    } catch {
      // Private mode: the choice lasts for this visit only.
    }
    if (choice !== 'system' || !window.matchMedia) return undefined;
    const query = window.matchMedia('(prefers-color-scheme: dark)');
    const follow = () => applyTheme('system');
    query.addEventListener?.('change', follow);
    return () => query.removeEventListener?.('change', follow);
  }, [choice]);

  return (
    <div role="radiogroup" aria-label="Colour theme" className="inline-flex rounded-full border border-line bg-surface-raised p-1">
      {OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={choice === option.value}
          onClick={() => setChoice(option.value)}
          className={`rounded-full px-3 py-1 text-sm font-medium transition-colors duration-200 ${
            choice === option.value ? 'bg-ink text-on-ink' : 'text-ink-muted hover:text-ink'
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
