import React from 'react';
import { Download, RefreshCw, RotateCcw } from 'lucide-react';
import { getScoreColor } from '../appShared';
import ResultsInsights from './ResultsInsights';
import DeliveryMetrics from './DeliveryMetrics';
import AttemptComparison from './AttemptComparison';

const CRITERIA = [
  { key: 'content', label: 'Content', max: 0.9 },
  { key: 'accuracy', label: 'Accuracy', max: 0.6 },
  { key: 'delivery', label: 'Delivery', max: 0.5 },
];

/**
 * Score summary, per-criterion feedback, improvement plan and export actions.
 * Shared by the Analyze page and Simulation mode, which previously carried two
 * copies of this markup that had drifted apart.
 */
export default function ResultsPanel({
  results,
  onDownloadReport,
  onReset,
  resetLabel = 'New analysis',
  extraActions = null,
  topic = '',
  isLoggedIn = false,
  onOpenAuth = null,
  onPracticeAgain = null,
}) {
  if (!results?.scores) return null;

  const { scores, feedback = {} } = results;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-panel border border-sky-200 bg-sky-50 p-6 text-center">
          <div className="text-sm font-semibold text-sky-700">Overall score</div>
          <div className="mt-4 text-6xl font-black text-ink">{Number(scores.total || 0).toFixed(2)}</div>
          <div className="mt-2 text-sm text-ink-muted">out of 2.0</div>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {CRITERIA.map((criterion) => {
            const score = Number(scores[criterion.key] || 0);
            return (
              <div key={criterion.key} className="rounded-card border border-line bg-overlay p-5 text-center">
                <div className="text-sm font-semibold text-ink-muted">{criterion.label}</div>
                <div className={`mt-3 text-3xl font-black ${getScoreColor(score, criterion.max)}`}>{score.toFixed(2)}</div>
                <div className="mt-1 text-xs text-ink-subtle">/ {criterion.max.toFixed(1)}</div>
              </div>
            );
          })}
        </div>
      </div>

      <section>
        <h3 className="mb-3 text-base font-semibold text-ink">Detailed feedback</h3>
        <div className="grid gap-3 lg:grid-cols-3">
          {CRITERIA.map((criterion) => (
            <div key={criterion.key} className="rounded-card border border-line bg-overlay p-4">
              <div className="text-base font-semibold text-ink">{criterion.label}</div>
              <div className="mt-2 text-sm leading-6 text-ink-muted">{feedback[criterion.key]}</div>
            </div>
          ))}
        </div>
      </section>

      <DeliveryMetrics metrics={results.metrics} />

      <AttemptComparison topic={topic} isLoggedIn={isLoggedIn} />

      <ResultsInsights results={results} />

      {results.practice_session_id && (
        <p className="rounded-control border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          Saved to your profile. You can reopen this feedback and its report any time under Recent practice.
        </p>
      )}

      {/* The server keeps a guest's result for 3 days (ANALYSIS_JOB_RETENTION_HOURS)
          and moves it into the account that signs up or logs in on this browser. */}
      {!isLoggedIn && !results.practice_session_id && onOpenAuth && (
        <div className="flex flex-col gap-3 rounded-control border border-sky-200 bg-sky-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-ink">
            This result isn&apos;t saved yet. Sign up or log in on this device within 3 days and it moves to your profile.
          </p>
          <div className="flex shrink-0 gap-2">
            <button
              type="button"
              onClick={() => onOpenAuth('signup')}
              className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white transition hover:bg-ink/85"
            >
              Sign up to save
            </button>
            <button
              type="button"
              onClick={() => onOpenAuth('login')}
              className="rounded-full border border-line px-4 py-2 text-sm font-semibold text-ink transition hover:bg-overlay-hover"
            >
              Log in
            </button>
          </div>
        </div>
      )}

      {results.sample_response && (
        <section className="rounded-card border border-amber-200 bg-amber-50 p-4">
          <h3 className="mb-2 text-base font-semibold text-ink">Sample 2.0 response</h3>
          <div className="whitespace-pre-line text-sm leading-6 text-ink">{results.sample_response}</div>
        </section>
      )}

      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          onClick={onDownloadReport}
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-ink px-6 py-3 font-medium text-white transition hover:bg-ink/85"
        >
          <Download size={16} />
          Download report
        </button>
        {onPracticeAgain && (
          <button
            type="button"
            onClick={onPracticeAgain}
            className="inline-flex items-center justify-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-6 py-3 font-medium text-emerald-700 transition hover:bg-emerald-100"
          >
            <RefreshCw size={16} />
            Practise this prompt again
          </button>
        )}
        {extraActions}
        <button
          type="button"
          onClick={onReset}
          className="inline-flex items-center justify-center gap-2 rounded-full border border-line bg-surface-raised px-6 py-3 font-medium text-ink transition hover:bg-overlay"
        >
          <RotateCcw size={16} />
          {resetLabel}
        </button>
      </div>
    </div>
  );
}
