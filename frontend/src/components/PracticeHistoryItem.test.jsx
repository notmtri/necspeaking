import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import PracticeHistoryItem from './PracticeHistoryItem';

const json = (payload) => ({ ok: true, status: 200, headers: { get: () => 'application/json' }, json: async () => payload });

const SESSION = {
  id: 42,
  topic: 'Is AI good for students?',
  createdAt: '2026-09-27T08:00:00',
  duration: 95,
  scores: { content: 0.7, accuracy: 0.5, delivery: 0.4, total: 1.6 },
  hasFeedback: true,
};

describe('PracticeHistoryItem', () => {
  let container;
  let root;
  const originalFetch = global.fetch;
  const originalOpen = window.open;

  const clickButton = async (label) => {
    const button = [...container.querySelectorAll('button')].find((b) => b.textContent.includes(label));
    await act(async () => { button.click(); });
    for (let i = 0; i < 3; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      await act(async () => { await new Promise((resolve) => setTimeout(resolve, 0)); });
    }
  };

  beforeEach(() => {
    global.IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    global.fetch = originalFetch;
    window.open = originalOpen;
  });

  it('opens a past attempt with its feedback, sample answer and report', async () => {
    global.fetch = vi.fn(async () => json({
      session: {
        ...SESSION,
        transcript: 'I think AI helps.',
        feedback: { content: 'Clear stance.', accuracy: 'Varied grammar.', delivery: 'Steady pace.' },
        sampleResponse: 'My question is...',
      },
    }));
    window.open = vi.fn();
    await act(async () => { root.render(<PracticeHistoryItem session={SESSION} />); });

    expect(container.textContent).not.toContain('Clear stance.');
    await clickButton('View feedback');

    expect(String(global.fetch.mock.calls[0][0])).toContain('/api/auth/practice-sessions/42');
    expect(container.textContent).toContain('Clear stance.');
    expect(container.textContent).toContain('Steady pace.');
    expect(container.textContent).toContain('Sample 2.0 response');

    await clickButton('Download report');
    expect(window.open.mock.calls[0][0]).toContain('/api/auth/practice-sessions/42/document');

    await clickButton('Hide feedback');
    await clickButton('View feedback');
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('explains when an older attempt has no saved feedback', async () => {
    global.fetch = vi.fn();
    await act(async () => { root.render(<PracticeHistoryItem session={{ ...SESSION, hasFeedback: false }} />); });

    await clickButton('View feedback');

    expect(container.textContent).toContain("wasn't saved for this older attempt");
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
