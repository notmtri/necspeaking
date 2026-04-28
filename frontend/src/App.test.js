import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

jest.mock('@vercel/analytics/react', () => ({
  Analytics: () => null,
}), { virtual: true });

describe('App', () => {
  let container;
  let root;
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    global.fetch = jest.fn(async (url) => {
      if (String(url).includes('/api/auth/me')) {
        return {
          ok: true,
          json: async () => ({ authenticated: false, user: null }),
        };
      }

      if (String(url).includes('/api/auth/community')) {
        return {
          ok: true,
          json: async () => ({ profiles: [] }),
        };
      }

      return {
        ok: true,
        json: async () => ({ status: 'healthy' }),
      };
    });
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
    container = null;
    global.fetch = originalFetch;
    delete global.IS_REACT_ACT_ENVIRONMENT;
  });

  it('renders the home shell without crashing', async () => {
    await act(async () => {
      root.render(<App />);
    });

    expect(container.textContent).toContain('necs.');
  });
});
