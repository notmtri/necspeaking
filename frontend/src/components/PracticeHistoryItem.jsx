import React, { useCallback, useState } from 'react';
import { ChevronDown, Download, Loader } from 'lucide-react';
import { apiFetch } from '../apiClient';
import { API_BASE_URL } from '../appShared';
import { ProfileDetailRow } from './ProfileBits';

const CRITERIA = [
  { key: 'content', label: 'Content' },
  { key: 'accuracy', label: 'Accuracy' },
  { key: 'delivery', label: 'Delivery' },
];

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
    <div className="rounded-card border border-line bg-overlay px-4 py-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-white">{session.topic}</div>
          <div className="mt-1 text-xs text-ink-subtle">{new Date(session.createdAt).toLocaleString()}</div>
        </div>
        <div className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-sm font-semibold text-emerald-100">
          {session.scores?.total ?? 0}/2.0
        </div>
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-4">
        <ProfileDetailRow label="Content" value={session.scores?.content ?? 0} />
        <ProfileDetailRow label="Accuracy" value={session.scores?.accuracy ?? 0} />
        <ProfileDetailRow label="Delivery" value={session.scores?.delivery ?? 0} />
        <ProfileDetailRow label="Duration" value={`${Math.round(session.duration || 0)}s`} />
      </div>

      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        aria-controls={panelId}
        className="mt-3 inline-flex min-h-[40px] items-center gap-2 rounded-control px-2 text-sm font-semibold text-sky-200 transition hover:text-sky-100"
      >
        <ChevronDown size={16} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
        {open ? 'Hide feedback' : 'View feedback'}
      </button>

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
          {error && <p className="text-sm text-rose-200" role="alert">{error}</p>}
          {detail?.feedback && (
            <>
              <div className="grid gap-3 lg:grid-cols-3">
                {CRITERIA.map((criterion) => (
                  <div key={criterion.key} className="rounded-control border border-line bg-surface-sunken p-3">
                    <div className="text-sm font-semibold text-white">{criterion.label}</div>
                    <div className="mt-1 text-sm leading-6 text-ink-muted">{detail.feedback[criterion.key]}</div>
                  </div>
                ))}
              </div>
              {detail.sampleResponse && (
                <details className="rounded-control border border-amber-400/20 bg-amber-400/10 p-3">
                  <summary className="cursor-pointer text-sm font-semibold text-white">Sample 2.0 response</summary>
                  <div className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-200">{detail.sampleResponse}</div>
                </details>
              )}
              {detail.transcript && (
                <details className="rounded-control border border-line bg-surface-sunken p-3">
                  <summary className="cursor-pointer text-sm font-semibold text-white">Your transcript</summary>
                  <div className="mt-2 whitespace-pre-line text-sm leading-6 text-ink-muted">{detail.transcript}</div>
                </details>
              )}
              <button
                type="button"
                onClick={downloadReport}
                className="inline-flex items-center justify-center gap-2 rounded-control border border-line bg-overlay px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-overlay-hover"
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
