import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { THEME_COLOURS, applyTheme, readSavedTheme, saveTheme } from './theme';

describe('applyTheme', () => {
  beforeEach(() => {
    document.head.innerHTML = `
      <meta name="theme-color" content="${THEME_COLOURS.light}" media="(prefers-color-scheme: light)">
      <meta name="theme-color" content="${THEME_COLOURS.dark}" media="(prefers-color-scheme: dark)">`;
    document.documentElement.className = '';
  });

  afterEach(() => {
    delete document.startViewTransition;
  });

  it('switches the class and points the status bar at the chosen theme', () => {
    applyTheme(true);
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    const colours = [...document.querySelectorAll('meta[name="theme-color"]')].map((tag) => tag.getAttribute('content'));
    expect(colours).toEqual([THEME_COLOURS.dark, THEME_COLOURS.dark]);

    applyTheme(false);
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });

  it('cross-fades through a view transition when the browser has one', async () => {
    let ran = false;
    document.startViewTransition = (update) => {
      update();
      ran = true;
      return { finished: Promise.resolve() };
    };
    applyTheme(true);
    expect(ran).toBe(true);
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  it('suspends per-element transitions while switching', () => {
    applyTheme(true);
    // Removed a frame later, so no element fades on its own schedule.
    expect(document.documentElement.classList.contains('theme-switching')).toBe(true);
  });
});

describe('saved theme', () => {
  it('round-trips through storage', () => {
    saveTheme(true);
    expect(readSavedTheme()).toBe('dark');
    saveTheme(false);
    expect(readSavedTheme()).toBe('light');
  });
});
