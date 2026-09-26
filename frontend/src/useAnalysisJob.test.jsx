import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MAX_RESUME_AGE_MS, readActiveJob, rememberActiveJob, useAnalysisJob } from './useAnalysisJob';

const json = (payload, status = 200) => ({
  ok: status < 400,
  status,
  headers: { get: () => 'application/json' },
  json: async () => payload,
});

const RESULT = { scores: { total: 1.6 }, feedback: { content: 'Good' }, practice_session_id: 7 };

function Harness({ callbacks, onReady }) {
  const { submit } = useAnalysisJob({ source: 'analyze', ...callbacks });
  onReady?.(submit);
  return null;
}

describe('useAnalysisJob', () => {
  let container;
  let root;
  const originalFetch = global.fetch;

  const flush = async () => {
    for (let i = 0; i < 5; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      await act(async () => { await new Promise((resolve) => setTimeout(resolve, 0)); });
    }
  };

  beforeEach(() => {
    global.IS_REACT_ACT_ENVIRONMENT = true;
    window.localStorage.clear();
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    global.fetch = originalFetch;
  });

  it('picks a finished job back up after a refresh', async () => {
    rememberActiveJob('analyze', 'job-1', { topic: 'Is AI good?' });
    global.fetch = vi.fn(async () => json({ job: { id: 'job-1', status: 'completed', result: RESULT } }));
    const callbacks = { onResume: vi.fn(), onComplete: vi.fn(), onFailed: vi.fn() };

    await act(async () => { root.render(<Harness callbacks={callbacks} />); });
    await flush();

    expect(callbacks.onResume).toHaveBeenCalledWith({ topic: 'Is AI good?' });
    expect(callbacks.onComplete).toHaveBeenCalledWith(RESULT);
    expect(callbacks.onFailed).not.toHaveBeenCalled();
    expect(String(global.fetch.mock.calls[0][0])).toContain('/api/analyze/jobs/job-1');
    expect(readActiveJob('analyze')).toBeNull();
  });

  it('keeps the job remembered when the student leaves mid-analysis', async () => {
    global.fetch = vi.fn(async (url, options = {}) => (
      options.method === 'POST'
        ? json({ job: { id: 'job-2', status: 'pending' } }, 202)
        : json({ job: { id: 'job-2', status: 'processing', progressMessage: 'Grading speech.' } })
    ));
    let submit;
    const callbacks = { onProgress: vi.fn(), onComplete: vi.fn(), onFailed: vi.fn() };
    await act(async () => { root.render(<Harness callbacks={callbacks} onReady={(fn) => { submit = fn; }} />); });

    act(() => { submit(new FormData(), { topic: 'Remember me' }); });
    await flush();
    expect(callbacks.onProgress).toHaveBeenCalledWith('Grading speech.');

    act(() => root.unmount());
    root = createRoot(container);

    expect(readActiveJob('analyze')).toMatchObject({ jobId: 'job-2', context: { topic: 'Remember me' } });
    expect(callbacks.onFailed).not.toHaveBeenCalled();
  });

  it('forgets a failed job and reports the error', async () => {
    rememberActiveJob('analyze', 'job-3', { topic: 't' });
    global.fetch = vi.fn(async () => json({ job: { id: 'job-3', status: 'failed', error: 'Grading service busy.' } }));
    const callbacks = { onComplete: vi.fn(), onFailed: vi.fn() };

    await act(async () => { root.render(<Harness callbacks={callbacks} />); });
    await flush();

    expect(callbacks.onFailed).toHaveBeenCalledTimes(1);
    expect(callbacks.onFailed.mock.calls[0][0].message).toBe('Grading service busy.');
    expect(readActiveJob('analyze')).toBeNull();
  });

  it('ignores a job older than the server would still be processing', async () => {
    rememberActiveJob('analyze', 'job-4', { topic: 't' });
    const stored = JSON.parse(window.localStorage.getItem('necs.activeAnalysis'));
    stored.analyze.startedAt = Date.now() - MAX_RESUME_AGE_MS - 1000;
    window.localStorage.setItem('necs.activeAnalysis', JSON.stringify(stored));
    global.fetch = vi.fn();
    const callbacks = { onResume: vi.fn() };

    await act(async () => { root.render(<Harness callbacks={callbacks} />); });
    await flush();

    expect(callbacks.onResume).not.toHaveBeenCalled();
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
