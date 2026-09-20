import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';

// The real module pulls in browser analytics we do not want firing in tests.
vi.mock('@vercel/analytics/react', () => ({
  Analytics: () => null,
}));

const defaultAnnouncement = {
  enabled: true,
  message: 'IMPORTANT NOTICE: Test announcement',
};

const createFetchResponse = (payload) => ({
  ok: true,
  status: 200,
  headers: { get: () => 'application/json' },
  json: async () => payload,
});

const createFetchMock = (overrides = {}) => vi.fn(async (url) => {
  const target = String(url);

  if (target.includes('/api/health')) return createFetchResponse({ status: 'healthy' });
  if (target.includes('/api/site/announcement')) return createFetchResponse({ announcement: defaultAnnouncement });
  if (target.includes('/api/auth/me')) return createFetchResponse({ authenticated: false, user: null });
  if (target.includes('/api/admin/check')) return createFetchResponse({ authenticated: false });
  if (target.includes('/api/auth/community')) return createFetchResponse({ profiles: overrides.profiles || [] });
  if (target.includes('/api/community/posts')) return createFetchResponse({ posts: overrides.posts || [] });
  if (target.includes('/api/questions')) return createFetchResponse({ questions: overrides.questions || [] });
  if (target.includes('/api/samples')) return createFetchResponse({ samples: overrides.samples || [] });

  return createFetchResponse({});
});

const sampleFixture = {
  id: 'sample-1',
  topic: 'Education and Technology',
  speaker: 'NECS Alumni',
  score: 2,
  question: 'How can technology improve education?',
  tags: ['education'],
  audioUrl: '/sample.mp3',
  filename: 'sample.mp3',
};

const questionFixture = {
  id: 1,
  topic: 'Education',
  question: 'How can technology improve education?',
};

describe('App', () => {
  let container;
  let root;
  const originalFetch = global.fetch;
  const originalOnline = navigator.onLine;

  const renderApp = async (path = '/', options = {}) => {
    window.history.pushState({}, '', path);
    global.fetch = createFetchMock(options);

    await act(async () => {
      root.render(<App />);
    });

    // Routes are code-split, so the page only appears once its dynamic import
    // resolves. Pump the event loop until the Suspense fallback clears.
    for (let attempt = 0; attempt < 30; attempt += 1) {
      // eslint-disable-next-line no-await-in-loop
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });
      if (!container.querySelector('[role="status"] .lucide-loader')
          && !container.textContent.includes('Loading page')) {
        break;
      }
    }
  };

  beforeEach(() => {
    global.IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    window.localStorage.clear();
    Object.defineProperty(window.navigator, 'onLine', { configurable: true, value: true });
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
    container = null;
    global.fetch = originalFetch;
    Object.defineProperty(window.navigator, 'onLine', { configurable: true, value: originalOnline });
    window.history.pushState({}, '', '/');
    delete global.IS_REACT_ACT_ENVIRONMENT;
  });

  it('renders the home shell and live announcement', async () => {
    await renderApp('/');

    expect(container.textContent).toContain('necs.');
    expect(container.textContent).toContain(defaultAnnouncement.message);
  });

  it('renders the analyze route directly from the browser path', async () => {
    await renderApp('/analyze');

    expect(container.textContent).toContain('Record or upload a response');
    expect(container.textContent).toContain('Upload audio');
  });

  it.each([
    ['/', 'Your free NEC speaking practice assistant'],
    ['/auth', 'Welcome back to necs.'],
    ['/profile', 'Log in to view your profile'],
    ['/community', 'View community posts from all users'],
    ['/samples', 'Listen to high-scoring sample speeches'],
    ['/simulation', 'Experience the real test interface'],
  ])('renders %s without crashing', async (path, expectedText) => {
    await renderApp(path, { samples: [sampleFixture], questions: [questionFixture] });

    expect(container.textContent).toContain(expectedText);
  });

  it('falls back to the home page for an unknown path', async () => {
    await renderApp('/does-not-exist');

    expect(container.textContent).toContain('Your free NEC speaking practice assistant');
  });

  it('lets a signed-out visitor start a guest session from the auth page', async () => {
    // Regression: nothing in the UI could turn guest mode on. The banner and
    // state machinery existed but were only reachable via stale localStorage.
    await renderApp('/auth');
    expect(container.textContent).toContain('Continue as guest');

    const guestButton = [...container.querySelectorAll('button')]
      .find((button) => button.textContent.includes('Continue as guest'));
    expect(guestButton).toBeTruthy();

    await act(async () => {
      guestButton.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    for (let attempt = 0; attempt < 30; attempt += 1) {
      // eslint-disable-next-line no-await-in-loop
      await act(async () => { await new Promise((resolve) => setTimeout(resolve, 0)); });
      if (container.textContent.includes('Guest mode is active')) break;
    }

    expect(container.textContent).toContain('Guest mode is active');
    expect(window.location.pathname).toBe('/analyze');
    expect(window.localStorage.getItem('necs.guestMode')).toBe('true');
  });

  it('shows guest session state when guest mode was previously enabled', async () => {
    window.localStorage.setItem('necs.guestMode', 'true');

    await renderApp('/analyze');

    expect(container.textContent).toContain('Guest session active');
    expect(container.textContent).toContain('Guest mode is active');
  });

  it('renders loaded samples in the sample library', async () => {
    await renderApp('/samples', { samples: [sampleFixture] });

    expect(container.textContent).toContain('Education and Technology');
    expect(container.textContent).toContain('NECS Alumni');
  });

  it('shows the question bank count on the simulation page', async () => {
    await renderApp('/simulation', { questions: [questionFixture] });

    expect(container.textContent).toContain('1 questions available');
  });

  it('keeps the community composer locked for signed-out visitors', async () => {
    await renderApp('/community');

    expect(container.textContent).toContain('Log in to post in the community');
  });
});
