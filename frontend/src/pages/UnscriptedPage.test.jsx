import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import UnscriptedPage, { pickPrompt } from './UnscriptedPage';
import ResultsPanel from '../components/ResultsPanel';
import PracticeHistoryItem from '../components/PracticeHistoryItem';
import { useCountdown } from '../useTimedRecording';

const json = (payload, status = 200) => ({
  ok: status < 400, status, headers: { get: () => 'application/json' }, json: async () => payload,
});

const PROMPTS = [
  { id: 1, kind: 'topic', category: 'Ideas', text: "Goodhart's law", active: true },
  { id: 2, kind: 'topic', category: 'Ideas', text: 'Schelling points', active: true },
  { id: 3, kind: 'topic', category: 'Science & tech', text: 'Moravec’s paradox', active: true },
  { id: 11, kind: 'take', category: 'Ideas', text: 'Coming second is better than coming first.', active: true },
  { id: 12, kind: 'take', category: 'Culture & everyday life', text: 'Breakfast is overrated.', active: true },
];

describe('pickPrompt', () => {
  const pool = PROMPTS.slice(0, 3);

  it('avoids what was seen recently', () => {
    for (let i = 0; i < 20; i += 1) expect(pickPrompt(pool, [1, 2]).id).toBe(3);
  });

  it('only avoids the current one once everything has been seen', () => {
    for (let i = 0; i < 20; i += 1) expect(pickPrompt(pool, [1, 2, 3]).id).not.toBe(3);
  });

  it('copes with one prompt or none', () => {
    expect(pickPrompt([pool[0]], [1]).id).toBe(1);
    expect(pickPrompt([], [])).toBeNull();
  });
});

describe('UnscriptedPage', () => {
  let container;
  let root;
  const originalFetch = global.fetch;
  const originalMatchMedia = window.matchMedia;

  const settle = async () => {
    for (let i = 0; i < 5; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      await act(async () => { await new Promise((resolve) => setTimeout(resolve, 0)); });
    }
  };
  const button = (label) => [...container.querySelectorAll('button')].find((b) => b.textContent.trim() === label);
  const promptText = () => container.querySelector('[aria-live="polite"] p')?.textContent;

  beforeEach(() => {
    global.IS_REACT_ACT_ENVIRONMENT = true;
    window.localStorage.clear();
    // Reduced motion: a spin lands at once, so tests need not wait on it.
    window.matchMedia = vi.fn(() => ({ matches: true, addEventListener() {}, removeEventListener() {} }));
    global.fetch = vi.fn(async (url) => (String(url).includes('/api/unscripted/prompts') ? json({ prompts: PROMPTS }) : json({})));
    global.URL.createObjectURL = vi.fn(() => 'blob:talk');
    global.URL.revokeObjectURL = vi.fn();
    const stream = { getTracks: () => [{ stop: vi.fn() }] };
    Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getUserMedia: vi.fn(async () => stream) } });
    global.MediaRecorder = class {
      static isTypeSupported() { return true; }

      constructor() { this.state = 'inactive'; this.mimeType = 'audio/webm'; }

      start() { this.state = 'recording'; }

      stop() {
        this.state = 'inactive';
        this.ondataavailable?.({ data: new Blob(['audio']) });
        this.onstop?.();
      }
    };
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    global.fetch = originalFetch;
    window.matchMedia = originalMatchMedia;
    delete global.MediaRecorder;
  });

  const render = async () => {
    act(() => {
      root.render(<UnscriptedPage onDownloadReport={() => {}} notify={() => {}} isOffline={false} />);
    });
    await settle();
  };

  it('spins topics in Deep research and takes, in quotes, in Takes', async () => {
    await render();
    const topics = PROMPTS.filter((p) => p.kind === 'topic').map((p) => p.text);
    expect(topics).toContain(promptText());

    const first = promptText();
    act(() => button('Spin').click());
    expect(promptText()).not.toBe(first);
    expect(topics).toContain(promptText());

    act(() => button('Takes').click());
    const shown = promptText();
    expect(shown.startsWith('“') && shown.endsWith('”')).toBe(true);
    expect(PROMPTS.filter((p) => p.kind === 'take').map((p) => `“${p.text}”`)).toContain(shown);
    expect(container.textContent).toContain('caps Content at 0.30');
  });

  it('keeps to the chosen theme and offers a way out of an empty one', async () => {
    await render();
    const select = container.querySelector('select');
    act(() => {
      select.value = 'Science & tech';
      select.dispatchEvent(new Event('change', { bubbles: true }));
    });
    expect(promptText()).toBe('Moravec’s paradox');

    act(() => {
      select.value = 'Society & education';
      select.dispatchEvent(new Event('change', { bubbles: true }));
    });
    expect(container.textContent).toContain('No topics in this theme yet.');
    act(() => button('Show all themes').click());
    expect(promptText()).toBeTruthy();
  });

  it('runs a take from preparation to recording to playback', async () => {
    await render();
    act(() => button('Takes').click());
    await act(async () => { button('Start preparing').click(); });
    await settle();
    expect(container.textContent).toContain('Preparation time');
    expect(container.textContent).toContain('2:00');
    expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledTimes(1); // the microphone check

    await act(async () => { button("I'm ready, start talking").click(); });
    await settle();
    expect(container.textContent).toContain('Recording');
    expect(container.textContent).toContain('Speaking time, up to 3:00');

    act(() => button('Stop recording').click());
    await settle();
    expect(container.textContent).toContain('Recording complete');
    expect(button('Analyze my talk')).toBeTruthy();
  });

  it('stays on setup when the microphone is refused', async () => {
    navigator.mediaDevices.getUserMedia = vi.fn(async () => { throw new Error('denied'); });
    await render();
    await act(async () => { button('Start researching').click(); });
    await settle();
    expect(container.textContent).toContain('Allow microphone access');
    expect(button('Spin')).toBeTruthy();
  });
});

describe('useCountdown', () => {
  it('counts down against the clock and calls back once at zero', () => {
    vi.useFakeTimers();
    global.IS_REACT_ACT_ENVIRONMENT = true;
    const container = document.createElement('div');
    const root = createRoot(container);
    const onDone = vi.fn();
    let countdown;
    function Probe() {
      countdown = useCountdown();
      return <span>{countdown.remaining}</span>;
    }
    act(() => root.render(<Probe />));
    act(() => countdown.start(3, onDone));
    expect(container.textContent).toBe('3');
    // A hidden tab may run no timers for a while; the next tick catches up.
    act(() => { vi.advanceTimersByTime(2100); });
    expect(container.textContent).toBe('1');
    act(() => { vi.advanceTimersByTime(5000); });
    expect(container.textContent).toBe('0');
    expect(onDone).toHaveBeenCalledTimes(1);
    act(() => root.unmount());
    vi.useRealTimers();
  });
});

describe('Unscripted results and history', () => {
  let container;
  let root;
  const RESULTS = {
    scores: { content: 0.3, accuracy: 0.5, delivery: 0.4, total: 1.2 },
    feedback: { content: 'c', accuracy: 'a', delivery: 'd' },
  };

  beforeEach(() => {
    global.IS_REACT_ACT_ENVIRONMENT = true;
    global.fetch = vi.fn(async () => json({}));
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it('explains the cap when the take was not opposed', () => {
    act(() => root.render(<ResultsPanel results={{ ...RESULTS, rebuttal: { stance: 'agreed', summary: 'You defended it.' } }} onDownloadReport={() => {}} onReset={() => {}} />));
    expect(container.textContent).toContain('You ended up agreeing with the take');
    expect(container.textContent).toContain('You defended it.');
    expect(container.textContent).toContain('capped at 0.30');
  });

  it('credits a rebuttal without the cap note, and shows nothing for NEC results', () => {
    act(() => root.render(<ResultsPanel results={{ ...RESULTS, rebuttal: { stance: 'opposed', summary: 'Strong.' } }} onDownloadReport={() => {}} onReset={() => {}} />));
    expect(container.textContent).toContain('You argued against the take');
    expect(container.textContent).not.toContain('capped at 0.30');

    act(() => root.render(<ResultsPanel results={RESULTS} onDownloadReport={() => {}} onReset={() => {}} />));
    expect(container.querySelector('[aria-label="Rebuttal"]')).toBeNull();
  });

  it('labels Unscripted attempts in history', () => {
    const base = { id: 7, topic: 'Argue against this take: "X."', createdAt: '2026-11-05T10:00:00Z', duration: 150, scores: RESULTS.scores, hasFeedback: false };
    act(() => root.render(<PracticeHistoryItem session={{ ...base, source: 'takes' }} />));
    expect(container.textContent).toContain('Unscripted: Takes');
    act(() => root.render(<PracticeHistoryItem session={{ ...base, source: 'analyze' }} />));
    expect(container.textContent).not.toContain('Unscripted');
  });
});
