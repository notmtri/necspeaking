import React, { useCallback, useEffect, useState } from 'react';
import { ArrowDownRight, ArrowRight, ArrowUpRight, History } from 'lucide-react';
import { apiFetch, isAbortError } from '../apiClient';

const CRITERIA = [
  { key: 'total', label: 'Overall', max: 2.0 },
  { key: 'content', label: 'Content', max: 0.9 },
  { key: 'accuracy', label: 'Accuracy', max: 0.6 },
  { key: 'delivery', label: 'Delivery', max: 0.5 },
];

function Delta({ value, unit = '', invert = false }) {
  if (value === null || value === undefined || Number.isNaN(value)) return null;

  const rounded = Math.round(value * 100) / 100;
  if (rounded === 0) {
    return <span className="text-xs font-semibold text-ink-subtle">no change</span>;
  }

  // For fillers and pauses, fewer is better.
  const better = invert ? rounded < 0 : rounded > 0;
  const Icon = rounded > 0 ? ArrowUpRight : ArrowDownRight;

  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold ${better ? 'text-emerald-300' : 'text-rose-300'}`}>
      <Icon size={13} />
      {rounded > 0 ? '+' : ''}{rounded}{unit}
    </span>
  );
}

/**
 * Shows previous attempts at the same prompt with per-criterion deltas.
 *
 * Every analysis used to be a dead end: nothing connected a second attempt at
 * a question to the first, so a student could not see whether they improved.
 */
export default function AttemptComparison({ topic, isLoggedIn }) {
  const [attempts, setAttempts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async (signal) => {
    if (!isLoggedIn || !topic?.trim()) return;
    setLoading(true);
    setError('');
    try {
      const data = await apiFetch(`/api/auth/practice-attempts?topic=${encodeURIComponent(topic)}`, { signal });
      setAttempts(Array.isArray(data.attempts) ? data.attempts : []);
    } catch (requestError) {
      if (isAbortError(requestError)) return;
      setError(requestError.message || 'Could not load previous attempts.');
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [isLoggedIn, topic]);

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
  }, [load]);

  if (!isLoggedIn) return null;
  if (loading) {
    return (
      <div className="rounded-card border border-line bg-overlay p-4 text-sm text-ink-muted">
        Checking for earlier attempts...
      </div>
    );
  }
  if (error) {
    return (
      <div className="rounded-card border border-rose-400/20 bg-rose-500/10 p-4 text-sm text-rose-100" role="alert">
        {error}
      </div>
    );
  }

  // The attempt just completed is itself in the list, so a single entry
  // means this is the first time this prompt has been attempted.
  if (attempts.length < 2) {
    return (
      <section className="rounded-panel border border-line bg-surface-raised p-4 sm:p-5">
        <div className="flex items-center gap-2 text-base font-semibold text-white">
          <History size={17} />
          First attempt at this prompt
        </div>
        <p className="mt-2 text-sm leading-6 text-ink-muted">
          Practise this same question again and this panel will show exactly what changed.
        </p>
      </section>
    );
  }

  const latest = attempts[attempts.length - 1];
  const prior = attempts[attempts.length - 2];

  const scoreDelta = (key) => Number(latest.scores?.[key] || 0) - Number(prior.scores?.[key] || 0);
  const metricDelta = (path) => {
    const get = (obj) => path.split('.').reduce((acc, part) => acc?.[part], obj);
    const a = get(latest.metrics);
    const b = get(prior.metrics);
    if (typeof a !== 'number' || typeof b !== 'number') return null;
    return a - b;
  };

  return (
    <section className="rounded-panel border border-line bg-surface-raised p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-base font-semibold text-white">
          <History size={17} />
          Compared with your last attempt
        </div>
        <span className="text-xs text-ink-subtle">
          {attempts.length} attempts at this prompt
        </span>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {CRITERIA.map((criterion) => (
          <div key={criterion.key} className="rounded-card border border-line bg-overlay p-4">
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-muted">{criterion.label}</div>
            <div className="mt-2 flex items-center gap-2">
              <span className="text-sm text-ink-subtle">
                {Number(prior.scores?.[criterion.key] || 0).toFixed(2)}
              </span>
              <ArrowRight size={13} className="text-ink-subtle" />
              <span className="text-lg font-semibold text-white">
                {Number(latest.scores?.[criterion.key] || 0).toFixed(2)}
              </span>
            </div>
            <div className="mt-1">
              <Delta value={scoreDelta(criterion.key)} />
            </div>
          </div>
        ))}
      </div>

      {(latest.metrics?.available && prior.metrics?.available) && (
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <div className="rounded-card border border-line bg-overlay p-4">
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-muted">Pace</div>
            <div className="mt-2 text-lg font-semibold text-white">{latest.metrics.wordsPerMinute} wpm</div>
            <div className="mt-1"><Delta value={metricDelta('wordsPerMinute')} unit=" wpm" /></div>
          </div>
          <div className="rounded-card border border-line bg-overlay p-4">
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-muted">Fillers</div>
            <div className="mt-2 text-lg font-semibold text-white">{latest.metrics.fillers?.total ?? 0}</div>
            <div className="mt-1"><Delta value={metricDelta('fillers.total')} invert /></div>
          </div>
          <div className="rounded-card border border-line bg-overlay p-4">
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-muted">Long pauses</div>
            <div className="mt-2 text-lg font-semibold text-white">{latest.metrics.longPauseCount ?? 0}</div>
            <div className="mt-1"><Delta value={metricDelta('longPauseCount')} invert /></div>
          </div>
        </div>
      )}

      <ol className="mt-4 space-y-2">
        {attempts.slice().reverse().slice(0, 5).map((attempt, index) => (
          <li
            key={attempt.id}
            className="flex items-center justify-between gap-3 rounded-control border border-line bg-overlay px-3 py-2 text-sm"
          >
            <span className="min-w-0 truncate text-ink-muted">
              {index === 0 ? 'Latest' : `${index + 1} attempts ago`}
              {attempt.createdAt && ` · ${new Date(attempt.createdAt).toLocaleDateString()}`}
            </span>
            <span className="shrink-0 font-semibold text-white">
              {Number(attempt.scores?.total || 0).toFixed(2)}/2.0
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}
