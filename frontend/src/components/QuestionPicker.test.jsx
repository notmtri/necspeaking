import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import QuestionPicker, { describeQuestion, resetQuestionBankCache } from './QuestionPicker';

const json = (payload, status = 200) => ({
  ok: status < 400, status, headers: { get: () => 'application/json' }, json: async () => payload,
});

// Shaped like the production bank: year in `topic`, numbering and the
// preparation line baked into `question`.
const BANK = [
  { id: 321, topic: 'NEC 20-21', question: 'Question 1. Some people think that tourism does harm to local cultures. Discuss both views and give your opinion.\r\nYou have 5 minutes to prepare for your talk. Good luck!' },
  { id: 284, topic: 'NEC 24-25', question: 'Question 4. Tertiary education should be accessible exclusively to high school graduates. To what extent do you agree or disagree with this view?' },
  { id: 350, topic: 'NEC 18-19', question: '10. "One of the most difficult things is not to change society - but to change yourself" (Nelson Mandela). Discuss the quote.' },
  { id: 282, topic: 'NEC 24-25', question: 'Question 2. A positive attitude should be considered an invaluable asset. To what extent do you agree or disagree with this view?' },
];

describe('describeQuestion', () => {
  it('separates the paper, number and bare question text', () => {
    const q = describeQuestion(BANK[0]);
    expect(q.paper).toBe('NEC 20-21');
    expect(q.number).toBe(1);
    expect(q.text).toBe('Some people think that tourism does harm to local cultures. Discuss both views and give your opinion.');
    expect(q.promptText).toBe(`Question 1. ${q.text}`);
    expect(q.label).toBe('NEC 20-21 · Question 1');
  });

  it('reads the bare "10." numbering style', () => {
    const q = describeQuestion(BANK[2]);
    expect(q.number).toBe(10);
    expect(q.text.startsWith('"One of the most difficult')).toBe(true);
  });
});

describe('QuestionPicker', () => {
  let container;
  let root;
  const originalFetch = global.fetch;

  const settle = async () => {
    for (let i = 0; i < 4; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      await act(async () => { await new Promise((resolve) => setTimeout(resolve, 0)); });
    }
  };
  const type = async (value) => {
    const input = container.querySelector('input[type=search]');
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
    await act(async () => {
      setter.call(input, value);
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
  };
  const optionTexts = () => [...container.querySelectorAll('li button')].map((b) => b.textContent);

  beforeEach(() => {
    global.IS_REACT_ACT_ENVIRONMENT = true;
    resetQuestionBankCache();
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    global.fetch = originalFetch;
  });

  it('lists the newest paper first, in question order', async () => {
    global.fetch = vi.fn(async () => json({ questions: BANK }));
    await act(async () => { root.render(<QuestionPicker onSelect={() => {}} />); });
    await settle();

    const text = container.textContent;
    expect(text.indexOf('NEC 24-25')).toBeLessThan(text.indexOf('NEC 20-21'));
    expect(text.indexOf('NEC 20-21')).toBeLessThan(text.indexOf('NEC 18-19'));
    const options = optionTexts();
    expect(options[0]).toContain('Q2');
    expect(options[1]).toContain('Q4');
    expect(text).not.toContain('Good luck');
  });

  it('filters by topic words and by year', async () => {
    global.fetch = vi.fn(async () => json({ questions: BANK }));
    await act(async () => { root.render(<QuestionPicker onSelect={() => {}} />); });
    await settle();

    await type('tourism');
    expect(optionTexts()).toHaveLength(1);
    expect(optionTexts()[0]).toContain('tourism');

    await type('24-25');
    expect(optionTexts()).toHaveLength(2);

    await type('no such topic');
    expect(container.textContent).toContain('No past question matches');
  });

  it('hands back the question in paper format when chosen', async () => {
    global.fetch = vi.fn(async () => json({ questions: BANK }));
    const onSelect = vi.fn();
    await act(async () => { root.render(<QuestionPicker onSelect={onSelect} />); });
    await settle();

    await type('tertiary');
    await act(async () => { container.querySelector('li button').click(); });

    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect.mock.calls[0][0].promptText).toMatch(/^Question 4\. Tertiary education/);
  });

  it('still loads after a quick unmount and remount (StrictMode, reopening the picker)', async () => {
    // Like a browser fetch: answers on a later tick, and rejects if aborted
    // first. A mock that ignores the signal cannot reproduce the bug.
    global.fetch = vi.fn((url, { signal } = {}) => new Promise((resolve, reject) => {
      const abort = () => reject(new DOMException('The operation was aborted.', 'AbortError'));
      if (signal?.aborted) { abort(); return; }
      signal?.addEventListener('abort', abort);
      setTimeout(() => resolve(json({ questions: BANK })), 5);
    }));
    await act(async () => { root.render(<React.StrictMode><QuestionPicker onSelect={() => {}} /></React.StrictMode>); });
    await settle();
    expect(optionTexts()).toHaveLength(4);

    act(() => root.unmount());
    root = createRoot(container);
    await act(async () => { root.render(<QuestionPicker onSelect={() => {}} />); });
    await settle();
    expect(optionTexts()).toHaveLength(4);
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('says so plainly when the bank is empty', async () => {
    global.fetch = vi.fn(async () => json({ questions: [] }));
    await act(async () => { root.render(<QuestionPicker onSelect={() => {}} />); });
    await settle();

    expect(container.textContent).toContain('No past questions have been added yet');
    expect(container.textContent).not.toContain('No past question matches');
  });

  it('keeps typing possible when the bank cannot load', async () => {
    global.fetch = vi.fn(async () => json({ error: 'down' }, 500));
    await act(async () => { root.render(<QuestionPicker onSelect={() => {}} />); });
    await settle();

    expect(container.textContent).toContain('You can still type your question');
  });
});
