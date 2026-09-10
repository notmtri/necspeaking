import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

jest.mock('@vercel/analytics/react', () => ({
  Analytics: () => null,
}), { virtual: true });

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

const createFetchMock = (overrides = {}) => jest.fn(async (url) => {
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

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });
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
