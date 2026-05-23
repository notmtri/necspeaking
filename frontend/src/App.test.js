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
  headers: {
    get: () => 'application/json',
  },
  json: async () => payload,
});

const createFetchMock = (overrides = {}) => jest.fn(async (url) => {
  const target = String(url);

  if (target.includes('/api/health')) {
    return createFetchResponse({ status: 'healthy' });
  }

  if (target.includes('/api/site/announcement')) {
    return createFetchResponse({ announcement: defaultAnnouncement });
  }

  if (target.includes('/api/auth/me')) {
    return createFetchResponse({ authenticated: false, user: null });
  }

  if (target.includes('/api/admin/check')) {
    return createFetchResponse({ authenticated: false });
  }

  if (target.includes('/api/auth/community')) {
    return createFetchResponse({ profiles: [] });
  }

  if (target.includes('/api/questions')) {
    return createFetchResponse({ questions: overrides.questions || [] });
  }

  if (target.includes('/api/samples')) {
    return createFetchResponse({ samples: overrides.samples || [] });
  }

  return createFetchResponse({});
});

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
    });
  };

  beforeEach(() => {
    global.IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    window.localStorage.clear();
    Object.defineProperty(window.navigator, 'onLine', {
      configurable: true,
      value: true,
    });
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
    container = null;
    global.fetch = originalFetch;
    Object.defineProperty(window.navigator, 'onLine', {
      configurable: true,
      value: originalOnline,
    });
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

    expect(container.textContent).toContain('NEC Speech Analysis');
    expect(container.textContent).toContain('Upload your response');
  });

  it('shows guest session state when guest mode was previously enabled', async () => {
    window.localStorage.setItem('necs.guestMode', 'true');

    await renderApp('/');

    expect(container.textContent).toContain('Guest session active');
    expect(container.textContent).toContain('Guest mode is active');
  });
});
