import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ResultsPanel from './ResultsPanel';

const RESULTS = {
  scores: { content: 0.7, accuracy: 0.5, delivery: 0.4, total: 1.6 },
  feedback: { content: 'Clear.', accuracy: 'Accurate.', delivery: 'Steady.' },
  transcript: 'I agree.',
};

describe('ResultsPanel guest notice', () => {
  let container;
  let root;

  beforeEach(() => {
    global.IS_REACT_ACT_ENVIRONMENT = true;
    global.fetch = vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({}) }));
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  const render = (props) => act(() => {
    root.render(<ResultsPanel results={RESULTS} onDownloadReport={() => {}} onReset={() => {}} {...props} />);
  });

  it('tells a guest how to keep the result and opens sign-up', () => {
    const onOpenAuth = vi.fn();
    render({ isLoggedIn: false, onOpenAuth });
    expect(container.textContent).toContain("This result isn't saved yet");

    const signUp = [...container.querySelectorAll('button')].find((b) => b.textContent === 'Sign up to save');
    act(() => signUp.click());
    expect(onOpenAuth).toHaveBeenCalledWith('signup');
  });

  it('says nothing about saving once the result is in a profile', () => {
    render({ isLoggedIn: true, onOpenAuth: vi.fn(), results: { ...RESULTS, practice_session_id: 7 } });
    expect(container.textContent).not.toContain("isn't saved yet");
    expect(container.textContent).toContain('Saved to your profile');
  });
});
