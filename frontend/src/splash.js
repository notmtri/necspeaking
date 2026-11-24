// The loading screen is static HTML in index.html, so it paints before any
// JavaScript loads. The app lifts it once the server has answered (or failed)
// and the signed-in state is known, so the page never flashes signed out.

// Even an instant answer keeps the logo up long enough to read as intentional.
const MIN_VISIBLE_MS = 800;
// Matches the exit transitions in index.html (bar 360 ms, fade 300 + 420 ms).
const EXIT_MS = 800;

export function hideSplash() {
  const splash = document.getElementById('splash');
  if (!splash || splash.dataset.state === 'leaving') return;
  splash.dataset.state = 'leaving';

  const wait = Math.max(0, MIN_VISIBLE_MS - performance.now());
  window.setTimeout(() => {
    const bar = splash.querySelector('.splash-bar');
    if (bar) {
      // Hold the bar where its crawl had got to, then run it to the end.
      const reached = window.getComputedStyle(bar).transform;
      bar.style.animation = 'none';
      bar.style.transform = reached;
      void bar.offsetWidth;
      bar.classList.add('is-done');
      bar.style.transform = '';
    }
    splash.classList.add('is-done');

    const root = document.getElementById('root');
    if (root) root.inert = false;
    document.querySelectorAll('meta[name="theme-color"][data-app-content]').forEach((tag) => {
      tag.setAttribute('content', tag.getAttribute('data-app-content'));
      tag.removeAttribute('data-app-content');
    });

    window.setTimeout(() => splash.remove(), EXIT_MS);
  }, wait);
}
