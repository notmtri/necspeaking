import React from 'react';
import { AlertCircle, Check, Download, RefreshCw, RotateCcw, Swords } from 'lucide-react';
import { CRITERIA, TONES } from '../appShared';
import ResultsInsights from './ResultsInsights';
import DeliveryMetrics from './DeliveryMetrics';
import AttemptComparison from './AttemptComparison';

// The Takes verdict. Students argue for the take; when they did not, the
// grader caps Content at 0.3 (UNDEFENDED_TAKE_CONTENT_CAP in the backend).
const POSITION_VERDICTS = {
  supported: { title: 'You argued for the take', tone: 'bg-emerald-50 text-emerald-800 dark:bg-emerald-400/10 dark:text-emerald-200', icon: Swords },
  opposed: { title: 'You argued against the take', tone: 'bg-amber-50 text-amber-900 dark:bg-amber-400/10 dark:text-amber-100', icon: AlertCircle },
  unclear: { title: 'Your stance on the take was not clear', tone: 'bg-amber-50 text-amber-900 dark:bg-amber-400/10 dark:text-amber-100', icon: AlertCircle },
};

export function PositionVerdict({ position }) {
  const verdict = POSITION_VERDICTS[position?.stance];
  if (!verdict) return null;
  const Icon = verdict.icon;
  return (
    <section className={`flex gap-3 rounded-panel p-5 sm:p-6 ${verdict.tone}`} aria-label="Your position">
      <Icon size={20} className="mt-0.5 shrink-0" />
      <div className="min-w-0">
        <h3 className="font-semibold">{verdict.title}</h3>
        {position.summary && <p className="mt-1 max-w-[70ch] text-sm leading-6 opacity-90">{position.summary}</p>}
        {position.stance !== 'supported' && (
          <p className="mt-2 text-sm leading-6 opacity-90">Content is capped at 0.30 until you argue for the take.</p>
        )}
      </div>
    </section>
  );
}

/**
 * Score summary, per-criterion feedback, improvement plan and export actions.
 * Shared by the Analyze page and Simulation mode, which previously carried two
 * copies of this markup that had drifted apart.
 *
 * Reading order: the score, then what to fix (feedback, metrics, plan, the
 * sample answer) in the main column; saving and next steps sit to the side so
 * they stay in reach without interrupting the feedback.
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
  practiceAgainLabel = 'Practise this prompt again',
  sampleTitle = 'Sample 2.0 response',
  sampleNote = 'The same question, answered at full marks.',
  savedMessage = 'Saved to your profile. You can reopen this feedback and its report any time under Recent practice.',
}) {
  if (!results?.scores) return null;

  const { scores, feedback = {} } = results;

  return (
    <div className="space-y-6">
      <section className="rounded-panel border border-line bg-surface-raised p-5 sm:p-7" aria-label="Scores">
        <div className="grid gap-6 lg:grid-cols-[auto_1fr] lg:items-center lg:gap-10">
          <div>
            <div className="text-sm font-medium text-ink-muted">Overall score</div>
            <div className="mt-1 flex items-end gap-2">
              <span className="font-display text-6xl font-semibold leading-none tracking-[-0.04em] text-ink tabular">{Number(scores.total || 0).toFixed(2)}</span>
              <span className="pb-1.5 text-sm text-ink-subtle">/ 2.0</span>
            </div>
          </div>
          <dl className="grid gap-3 sm:grid-cols-3">
            {CRITERIA.map((criterion, index) => {
              const score = Number(scores[criterion.key] || 0);
              const tone = TONES[criterion.tone];
              return (
                <div key={criterion.key} className={`rounded-card p-4 ${tone.soft}`}>
                  <dt className={`text-sm font-medium ${tone.text}`}>{criterion.label}</dt>
                  <dd className="mt-1 font-display text-3xl font-semibold tracking-[-0.03em] text-ink tabular">
                    {score.toFixed(2)}
                    <span className="font-sans text-sm font-normal tracking-normal text-ink-subtle"> / {criterion.max.toFixed(1)}</span>
                  </dd>
                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-surface-raised/70" aria-hidden="true">
                    {/* Fills from the left once, so the wait for grading resolves into the result. */}
                    <div className={`bar-reveal h-full rounded-full ${tone.fill}`} style={{ width: `${Math.min(100, (score / criterion.max) * 100)}%`, '--bar-index': index }} />
                  </div>
                </div>
              );
            })}
          </dl>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start">
        <div className="min-w-0 space-y-6">
          <PositionVerdict position={results.position} />

          <section className="rounded-panel border border-line bg-surface-raised p-5 sm:p-7" aria-labelledby="feedback-heading">
            <h3 id="feedback-heading" className="font-display text-lg font-semibold tracking-[-0.02em] text-ink">Feedback</h3>
            <div className="mt-5 space-y-5">
              {CRITERIA.map((criterion) => (
                <div key={criterion.key}>
                  <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${TONES[criterion.tone].soft} ${TONES[criterion.tone].text}`}>
                    {criterion.label}
                  </span>
                  <p className="mt-2 max-w-[70ch] text-sm leading-7 text-ink-muted">{feedback[criterion.key]}</p>
                </div>
              ))}
            </div>
          </section>

          <DeliveryMetrics metrics={results.metrics} />

          <AttemptComparison topic={topic} isLoggedIn={isLoggedIn} />

          <ResultsInsights results={results} />

          {results.sample_response && (
            <section className="rounded-panel border border-line bg-surface-raised p-5 sm:p-7">
              <h3 className="font-display text-lg font-semibold tracking-[-0.02em] text-ink">{sampleTitle}</h3>
              <p className="mt-1 text-sm text-ink-subtle">{sampleNote}</p>
              <div className="mt-4 whitespace-pre-line rounded-card bg-amber-50 p-4 text-sm leading-7 text-ink dark:bg-amber-400/10">{results.sample_response}</div>
            </section>
          )}
        </div>

        <aside className="space-y-4 lg:sticky lg:top-24">
          {results.practice_session_id && (
            <p className="flex gap-2.5 rounded-card bg-emerald-50 px-4 py-3 text-sm leading-6 text-emerald-800 dark:bg-emerald-400/10 dark:text-emerald-200">
              <Check size={18} className="mt-0.5 shrink-0" />
              {savedMessage}
            </p>
          )}

          {/* The server keeps a guest's result for 3 days (ANALYSIS_JOB_RETENTION_HOURS)
              and moves it into the account that signs up or logs in on this browser. */}
          {!isLoggedIn && !results.practice_session_id && onOpenAuth && (
            <div className="rounded-card bg-sky-50 p-4 dark:bg-sky-400/10">
              <p className="text-sm leading-6 text-ink">
                This result isn&apos;t saved yet. Sign up or log in on this device within 3 days and it moves to your profile.
              </p>
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => onOpenAuth('signup')}
                  className="rounded-full bg-ink px-4 py-2 text-sm font-medium text-on-ink transition-colors duration-200 hover:bg-ink/85"
                >
                  Sign up to save
                </button>
                <button
                  type="button"
                  onClick={() => onOpenAuth('login')}
                  className="rounded-full border border-line bg-surface-raised px-4 py-2 text-sm font-medium text-ink transition-colors duration-200 hover:bg-overlay"
                >
                  Log in
                </button>
              </div>
            </div>
          )}

          <div className="space-y-2 rounded-panel border border-line bg-surface-raised p-4">
            <button
              type="button"
              onClick={onDownloadReport}
              className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-ink px-5 py-3 font-medium text-on-ink transition-colors duration-200 hover:bg-ink/85"
            >
              <Download size={16} />
              Download report
            </button>
            {onPracticeAgain && (
              <button
                type="button"
                onClick={onPracticeAgain}
                className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-line bg-surface-raised px-5 py-3 font-medium text-ink transition-colors duration-200 hover:bg-overlay"
              >
                <RefreshCw size={16} />
                {practiceAgainLabel}
              </button>
            )}
            {extraActions}
            <button
              type="button"
              onClick={onReset}
              className="inline-flex w-full items-center justify-center gap-2 rounded-full px-5 py-3 font-medium text-ink-muted transition-colors duration-200 hover:bg-overlay hover:text-ink"
            >
              <RotateCcw size={16} />
              {resetLabel}
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}
