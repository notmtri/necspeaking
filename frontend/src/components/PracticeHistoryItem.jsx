import React, { useCallback, useState } from 'react';
import { ChevronDown, Download, Loader } from 'lucide-react';
import { apiFetch } from '../apiClient';
import { API_BASE_URL, CRITERIA, TONES } from '../appShared';

// Unscripted attempts are labelled; their scores sit outside the NEC average.
export const UNSCRIPTED_MODE_LABELS = { research: 'Deep research', takes: 'Takes' };

/**
 * One past attempt. Expands to the full feedback, the sample answer and the
 * transcript, fetched on first open, and can re-download its report.
 *
 * History used to show four numbers only: the written feedback lived on the
 * analysis job and was deleted after 72 hours.
 */
export default function PracticeHistoryItem({ session }) {
  const [open, setOpen] = useState(false);
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const panelId = `practice-${session.id}-detail`;
  const modeLabel = UNSCRIPTED_MODE_LABELS[session.source];

  const toggle = useCallback(async () => {
    const next = !open;
    setOpen(next);
    if (!next || detail || !session.hasFeedback) return;
    setLoading(true);
    setError('');
    try {
      const data = await apiFetch(`/api/auth/practice-sessions/${session.id}`);
      setDetail(data.session);
    } catch (requestError) {
      setError(requestError.message || 'Could not load this attempt.');
    } finally {
      setLoading(false);
    }
  }, [detail, open, session.hasFeedback, session.id]);

  const downloadReport = useCallback(() => {
    window.open(`${API_BASE_URL}/api/auth/practice-sessions/${session.id}/document`, '_blank', 'noopener');
  }, [session.id]);

  return (
    <div className="py-5 first:pt-0 last:pb-0">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="line-clamp-2 text-sm font-medium leading-6 text-ink">{session.topic}</div>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ink-subtle">
            {modeLabel && (
              <span className="rounded-full bg-overlay px-2 py-0.5 font-medium text-ink-muted">Unscripted: {modeLabel}</span>
            )}
            <span>{new Date(session.createdAt).toLocaleString()} | {Math.round(session.duration || 0)}s</span>
          </div>
        </div>
        <div className="shrink-0 text-right">
          <div className="font-display text-2xl font-semibold leading-none tracking-[-0.03em] text-ink tabular">{Number(session.scores?.total ?? 0).toFixed(2)}</div>
          <div className="mt-1 text-xs text-ink-subtle">/ 2.0</div>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {CRITERIA.map((criterion) => (
          <span key={criterion.key} className={`rounded-full px-2.5 py-1 text-xs font-medium tabular ${TONES[criterion.tone].soft} ${TONES[criterion.tone].text}`}>
            {criterion.label} {Number(session.scores?.[criterion.key] ?? 0).toFixed(2)}
          </span>
        ))}
        <button
          type="button"
          onClick={toggle}
          aria-expanded={open}
          aria-controls={panelId}
          className="ml-auto inline-flex min-h-[36px] items-center gap-1.5 rounded-full px-2.5 text-sm font-medium text-sky-700 transition-colors hover:bg-sky-50 dark:text-sky-300 dark:hover:bg-sky-400/10"
        >
          <ChevronDown size={16} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
          {open ? 'Hide feedback' : 'View feedback'}
        </button>
      </div>

      {open && (
        <div id={panelId} className="mt-3 space-y-3">
          {!session.hasFeedback && (
            <p className="rounded-control border border-dashed border-line px-4 py-3 text-sm text-ink-muted">
              Detailed feedback wasn&apos;t saved for this older attempt. Every new attempt keeps it permanently.
            </p>
          )}
          {loading && (
            <div className="flex items-center gap-2 text-sm text-ink-muted" role="status">
              <Loader size={16} className="animate-spin" /> Loading feedback...
            </div>
          )}
          {error && <p className="text-sm text-rose-700 dark:text-rose-300" role="alert">{error}</p>}
          {detail?.feedback && (
            <>
              <div className="space-y-3 rounded-card bg-surface-sunken p-4">
                {CRITERIA.map((criterion) => (
                  <div key={criterion.key}>
                    <div className={`text-sm font-medium ${TONES[criterion.tone].text}`}>{criterion.label}</div>
                    <div className="mt-0.5 text-sm leading-6 text-ink-muted">{detail.feedback[criterion.key]}</div>
                  </div>
                ))}
              </div>
              {detail.sampleResponse && (
                <details className="rounded-control border border-amber-200 dark:border-amber-400/25 bg-amber-50 dark:bg-amber-400/10 p-3">
                  <summary className="cursor-pointer text-sm font-semibold text-ink">Sample 2.0 response</summary>
                  <div className="mt-2 whitespace-pre-line text-sm leading-6 text-ink">{detail.sampleResponse}</div>
                </details>
              )}
              {detail.transcript && (
                <details className="rounded-control border border-line bg-surface-sunken p-3">
                  <summary className="cursor-pointer text-sm font-semibold text-ink">Your transcript</summary>
                  <div className="mt-2 whitespace-pre-line text-sm leading-6 text-ink-muted">{detail.transcript}</div>
                </details>
              )}
              <button
                type="button"
                onClick={downloadReport}
                className="inline-flex items-center justify-center gap-2 rounded-full border border-line bg-surface-raised px-4 py-2.5 text-sm font-medium text-ink transition hover:bg-overlay"
              >
                <Download size={15} />
                Download report
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
