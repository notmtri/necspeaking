import React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ErrorBoundary from './components/ErrorBoundary';

function Boom() {
  throw new Error('boom from render');
}

describe('ErrorBoundary', () => {
  let container;
  let root;
  let consoleError;

  beforeEach(() => {
    global.IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    // React logs caught render errors; keep the suite output readable.
    consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    consoleError.mockRestore();
    delete global.IS_REACT_ACT_ENVIRONMENT;
  });

  it('renders children when nothing throws', () => {
    act(() => {
      root.render(<ErrorBoundary><p>all good</p></ErrorBoundary>);
    });
    expect(container.textContent).toContain('all good');
  });

  it('shows a recovery UI instead of blanking when a child throws', () => {
    act(() => {
      root.render(<ErrorBoundary><Boom /></ErrorBoundary>);
    });
    expect(container.textContent).toContain('This page hit an error');
    expect(container.textContent).toContain('Try again');
  });

  it('clears the error when resetKey changes, so navigating away recovers', () => {
    act(() => {
      root.render(<ErrorBoundary resetKey="analyze"><Boom /></ErrorBoundary>);
    });
    expect(container.textContent).toContain('This page hit an error');

    act(() => {
      root.render(<ErrorBoundary resetKey="home"><p>home page</p></ErrorBoundary>);
    });
    expect(container.textContent).toContain('home page');
  });
});
