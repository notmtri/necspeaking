/*
 * Light/dark switching. index.html applies the saved choice before first
 * paint; this module handles changes after that.
 */
export const THEME_STORAGE_KEY = 'necs.theme';

// The top of the page in each theme (--surface-base), for the phone's status bar.
export const THEME_COLOURS = { light: '#fcfdfe', dark: '#14171d' };

export const isDarkTheme = () => document.documentElement.classList.contains('dark');

export function readSavedTheme() {
  try {
    return window.localStorage.getItem(THEME_STORAGE_KEY);
  } catch {
    return null; // private mode
  }
}

export function saveTheme(dark) {
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, dark ? 'dark' : 'light');
  } catch {
    // private mode: the choice lasts for this page only
  }
}

/**
 * Point both theme-color tags at the chosen theme. They carry media queries
 * for the device setting; a saved choice can differ from it, and the status
 * bar must follow the page, not the phone.
 */
function setStatusBarColour(dark) {
  const colour = dark ? THEME_COLOURS.dark : THEME_COLOURS.light;
  document.querySelectorAll('meta[name="theme-color"]').forEach((tag) => tag.setAttribute('content', colour));
}

/**
 * Switch the whole page at once. With View Transitions the old and new pages
 * cross-fade over 200 ms (index.css); without them the switch is a single
 * clean frame. Either way per-element colour transitions are suspended, so
 * no part of the page lags behind the rest.
 */
export function applyTheme(dark) {
  const root = document.documentElement;
  const flip = () => {
    root.classList.add('theme-switching');
    root.classList.toggle('dark', dark);
    setStatusBarColour(dark);
  };
  const settle = () => {
    // One frame later, so the suspended transitions never see the change.
    window.requestAnimationFrame(() => root.classList.remove('theme-switching'));
  };

  if (typeof document.startViewTransition === 'function') {
    const transition = document.startViewTransition(flip);
    transition.finished.then(settle, settle);
  } else {
    flip();
    settle();
  }
}
