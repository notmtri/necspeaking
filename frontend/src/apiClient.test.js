import { afterEach, describe, expect, it, vi } from 'vitest';
import { waitForAnalysisJob } from './apiClient';

const json = (payload, status = 200) => ({
  ok: status < 400,
  status,
  headers: { get: () => 'application/json' },
  json: async () => payload,
});

describe('waitForAnalysisJob', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('keeps polling through a dropped connection and a 503', async () => {
    global.fetch = vi.fn()
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValueOnce(json({ error: 'busy' }, 503))
      .mockResolvedValueOnce(json({ job: { id: 'j', status: 'completed', result: { ok: true } } }));

    const job = await waitForAnalysisJob('j', { intervalMs: 0 });

    expect(job.status).toBe('completed');
    expect(global.fetch).toHaveBeenCalledTimes(3);
  });

  it('gives up after repeated transient failures', async () => {
    global.fetch = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));

    await expect(waitForAnalysisJob('j', { intervalMs: 0, maxConsecutiveErrors: 3 }))
      .rejects.toMatchObject({ status: 0 });
    expect(global.fetch).toHaveBeenCalledTimes(3);
  });

  it('stops at once when the job is gone', async () => {
    global.fetch = vi.fn().mockResolvedValue(json({ error: 'Analysis job not found.' }, 404));

    await expect(waitForAnalysisJob('j', { intervalMs: 0 })).rejects.toMatchObject({ status: 404 });
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });
});
