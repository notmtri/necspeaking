import { useCallback, useEffect, useRef } from 'react';
import { apiFetch, isAbortError, waitForAnalysisJob } from './apiClient';

const STORAGE_KEY = 'necs.activeAnalysis';
// The backend marks a job abandoned after ANALYSIS_JOB_STALE_MINUTES (20), so
// there is nothing to resume past that.
export const MAX_RESUME_AGE_MS = 20 * 60 * 1000;

function readAll() {
  try {
    return JSON.parse(window.localStorage.getItem(STORAGE_KEY)) || {};
  } catch {
    return {};
  }
}

function writeAll(entries) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    // Storage can be unavailable (private mode, quota). Resume is a nicety.
  }
}

export function readActiveJob(source) {
  const entry = readAll()[source];
  if (!entry?.jobId) return null;
  if (Date.now() - Number(entry.startedAt || 0) > MAX_RESUME_AGE_MS) {
    clearActiveJob(source);
    return null;
  }
  return entry;
}

export function rememberActiveJob(source, jobId, context) {
  writeAll({ ...readAll(), [source]: { jobId, context, startedAt: Date.now() } });
}

export function clearActiveJob(source) {
  const entries = readAll();
  delete entries[source];
  writeAll(entries);
}

/**
 * Submit an analysis and follow it to completion -- surviving a refresh.
 *
 * The job id used to live only in component state, so a refresh, a locked
 * phone or navigating away during the 30-70 s analysis lost the result even
 * though the server finished it. The id is now kept in localStorage per
 * `source` ('analyze' | 'simulation'); on mount the hook picks an unfinished
 * job back up, calling onResume with the context saved at submission.
 *
 * Leaving the page aborts polling but keeps the job remembered. A finished,
 * failed or expired job is forgotten; a dropped connection is not, since the
 * server is still working on it.
 */
export function useAnalysisJob({ source, onProgress, onComplete, onFailed, onResume }) {
  const callbacks = useRef({});
  callbacks.current = { onProgress, onComplete, onFailed, onResume };
  const controllerRef = useRef(null);

  const follow = useCallback(async (jobId) => {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;

    try {
      const job = await waitForAnalysisJob(jobId, {
        signal: controller.signal,
        onTick: (state) => callbacks.current.onProgress?.(state?.progressMessage || 'Processing analysis job.'),
      });
      clearActiveJob(source);
      if (!job.result) throw new Error('Analysis job completed without a result payload.');
      await callbacks.current.onComplete?.(job.result);
    } catch (error) {
      if (isAbortError(error)) return;
      if (error?.status) clearActiveJob(source);
      callbacks.current.onFailed?.(error);
    }
  }, [source]);

  const submit = useCallback(async (formData, context = {}) => {
    let data;
    try {
      data = await apiFetch('/api/analyze', { method: 'POST', body: formData });
    } catch (error) {
      callbacks.current.onFailed?.(error);
      return;
    }
    rememberActiveJob(source, data.job.id, context);
    await follow(data.job.id);
  }, [follow, source]);

  useEffect(() => {
    const pending = readActiveJob(source);
    if (pending) {
      callbacks.current.onResume?.(pending.context || {});
      follow(pending.jobId);
    }
    return () => controllerRef.current?.abort();
  }, [follow, source]);

  return { submit };
}
