import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import AdminPanel from './AdminPanel';

const json = (payload, status = 200) => ({
  ok: status < 400, status, headers: { get: () => 'application/json' }, json: async () => payload,
});

describe('Admin: Unscripted tab', () => {
  let container;
  let root;
  let prompts;
  const originalFetch = global.fetch;

  const settle = async () => {
    for (let i = 0; i < 5; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      await act(async () => { await new Promise((resolve) => setTimeout(resolve, 0)); });
    }
  };
  const button = (label) => [...document.querySelectorAll('button')].find((b) => b.textContent.trim() === label || b.getAttribute('aria-label') === label);

  beforeEach(() => {
    global.IS_REACT_ACT_ENVIRONMENT = true;
    prompts = [
      { id: 1, kind: 'topic', category: 'Ideas', text: "Goodhart's law", active: true },
      { id: 2, kind: 'take', category: 'Ideas', text: 'Coming second is better.', active: false },
    ];
    global.fetch = vi.fn(async (url, options = {}) => {
      const path = String(url);
      const method = options.method || 'GET';
      if (path.includes('/api/unscripted/prompts')) {
        if (method === 'GET') return json({ prompts });
        const body = JSON.parse(options.body || '{}');
        if (method === 'POST') return json({ success: true, prompt: { id: 9, active: true, ...body } });
        const id = Number(path.split('/').pop());
        const current = prompts.find((p) => p.id === id);
        return json({ success: true, prompt: { ...current, ...body } });
      }
      return json({ samples: [], questions: [] });
    });
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    global.fetch = originalFetch;
  });

  it('lists, adds and turns topics and takes on and off', async () => {
    act(() => root.render(<AdminPanel onClose={() => {}} onLogout={() => {}} notify={() => {}} />));
    await settle();
    act(() => button('Unscripted').click());
    await settle();
    expect(global.fetch.mock.calls.some(([url]) => String(url).includes('/api/unscripted/prompts?all=1'))).toBe(true);
    expect(document.body.textContent).toContain("Goodhart's law");
    expect(document.body.textContent).toContain('Topics (1 on)');

    const input = document.querySelector('input[placeholder="Goodhart’s law"]');
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
    act(() => {
      setter.call(input, 'Survivorship bias');
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await act(async () => { button('Add topic').click(); });
    await settle();
    const post = global.fetch.mock.calls.find(([, options]) => options?.method === 'POST');
    expect(JSON.parse(post[1].body)).toEqual({ kind: 'topic', category: 'Ideas', text: 'Survivorship bias' });
    expect(document.body.textContent).toContain('Topics (2 on)');

    act(() => [...document.querySelectorAll('[role=radio]')].find((b) => b.textContent === 'Takes').click());
    expect(document.body.textContent).toContain('Takes (0 on, 1 off)');
    await act(async () => { button('Turn on').click(); });
    await settle();
    const put = global.fetch.mock.calls.find(([, options]) => options?.method === 'PUT');
    expect(String(put[0])).toContain('/api/unscripted/prompts/2');
    expect(JSON.parse(put[1].body)).toEqual({ active: true });
    expect(document.body.textContent).toContain('Takes (1 on)');
  });
});
