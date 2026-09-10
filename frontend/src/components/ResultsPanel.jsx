import React from 'react';
import { Download, RotateCcw } from 'lucide-react';
import { getScoreColor } from '../appShared';
import ResultsInsights from './ResultsInsights';

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
export default function ResultsPanel({ results, onDownloadReport, onReset, resetLabel = 'New analysis', extraActions = null }) {
  if (!results?.scores) return null;

  const { scores, feedback = {} } = results;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-panel border border-sky-400/20 bg-sky-400/10 p-6 text-center">
          <div className="text-sm font-semibold text-sky-200">Overall score</div>
          <div className="mt-4 text-6xl font-black text-white">{Number(scores.total || 0).toFixed(2)}</div>
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
        <h3 className="mb-3 text-base font-semibold text-white">Detailed feedback</h3>
        <div className="grid gap-3 lg:grid-cols-3">
          {CRITERIA.map((criterion) => (
            <div key={criterion.key} className="rounded-card border border-line bg-overlay p-4">
              <div className="text-base font-semibold text-white">{criterion.label}</div>
              <div className="mt-2 text-sm leading-6 text-ink-muted">{feedback[criterion.key]}</div>
            </div>
          ))}
        </div>
      </section>

      <ResultsInsights results={results} />

      {results.sample_response && (
        <section className="rounded-card border border-amber-400/20 bg-amber-400/10 p-4">
          <h3 className="mb-2 text-base font-semibold text-white">Sample 2.0 response</h3>
          <div className="whitespace-pre-line text-sm leading-6 text-slate-200">{results.sample_response}</div>
        </section>
      )}

      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          onClick={onDownloadReport}
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-control bg-sky-500 px-6 py-3 font-semibold text-white transition hover:bg-sky-400"
        >
          <Download size={16} />
          Download report
        </button>
        {extraActions}
        <button
          type="button"
          onClick={onReset}
          className="inline-flex items-center justify-center gap-2 rounded-control border border-line bg-overlay px-6 py-3 font-semibold text-white transition hover:bg-overlay-hover"
        >
          <RotateCcw size={16} />
          {resetLabel}
        </button>
      </div>
    </div>
  );
}
