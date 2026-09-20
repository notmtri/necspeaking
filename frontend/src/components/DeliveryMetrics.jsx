import React from 'react';
import { Activity, Gauge, MessageSquareDashed, Timer } from 'lucide-react';
import { formatTime } from '../appShared';

// Rough NEC-style guidance. Comfortable exam pace sits around 130-160 wpm.
const PACE_BANDS = [
  { max: 110, label: 'Slow', tone: 'text-amber-300', hint: 'Room to speak a little faster.' },
  { max: 170, label: 'Good', tone: 'text-emerald-300', hint: 'Comfortable, examiner-friendly pace.' },
  { max: Infinity, label: 'Fast', tone: 'text-amber-300', hint: 'Consider slowing down for clarity.' },
];

const describePace = (wpm) => PACE_BANDS.find((band) => wpm <= band.max);

const describeFillers = (perMinute) => {
  if (perMinute <= 2) return { label: 'Low', tone: 'text-emerald-300', hint: 'Very few hesitation words.' };
  if (perMinute <= 5) return { label: 'Moderate', tone: 'text-amber-300', hint: 'Noticeable but not distracting.' };
  return { label: 'High', tone: 'text-rose-300', hint: 'Fillers are interrupting your flow.' };
};

function Stat({ icon: Icon, label, value, unit, verdict }) {
  return (
    <div className="rounded-card border border-line bg-overlay p-4">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-ink-muted">
        <Icon size={14} />
        {label}
      </div>
      <div className="mt-2 flex items-baseline gap-1.5">
        <span className="text-2xl font-semibold text-white">{value}</span>
        {unit && <span className="text-xs text-ink-subtle">{unit}</span>}
      </div>
      {verdict && (
        <>
          <div className={`mt-1 text-sm font-semibold ${verdict.tone}`}>{verdict.label}</div>
          <p className="mt-1 text-xs leading-5 text-ink-subtle">{verdict.hint}</p>
        </>
      )}
    </div>
  );
}

/** Sparkline of words-per-minute per window, so pace changes are visible. */
function PaceSparkline({ series }) {
  if (!series || series.length < 2) return null;

  const peak = Math.max(...series.map((point) => point.wpm), 1);

  return (
    <div className="rounded-card border border-line bg-overlay p-4">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-ink-muted">
        <Activity size={14} />
        Pace over time
      </div>
      <div className="mt-3 flex h-20 items-end gap-1" role="img" aria-label={`Pace per window: ${series.map((p) => `${p.wpm} words per minute`).join(', ')}`}>
        {series.map((point) => (
          <div key={point.start} className="flex min-w-0 flex-1 flex-col items-center gap-1">
            <div
              className="w-full rounded-t-sm bg-sky-400/80"
              style={{ height: `${Math.max(6, (point.wpm / peak) * 100)}%` }}
              title={`${formatTime(point.start)}-${formatTime(point.end)}: ${point.wpm} wpm`}
            />
          </div>
        ))}
      </div>
      <div className="mt-2 flex justify-between text-[11px] text-ink-subtle">
        <span>{formatTime(series[0].start)}</span>
        <span>{formatTime(series[series.length - 1].end)}</span>
      </div>
    </div>
  );
}

export default function DeliveryMetrics({ metrics }) {
  if (!metrics?.available) return null;

  const pace = describePace(metrics.wordsPerMinute);
  const fillers = describeFillers(metrics.fillers?.perMinute || 0);
  const topFillers = Object.entries(metrics.fillers?.byTerm || {}).slice(0, 4);

  return (
    <section className="rounded-panel border border-line bg-surface-raised p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-base font-semibold text-white">Delivery detail</h3>
        <span className="text-xs text-ink-subtle">Measured from your recording</span>
      </div>
      <p className="mt-1 text-sm leading-6 text-ink-muted">
        These are measurements, not opinions &mdash; the same numbers the grader was given.
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat icon={Gauge} label="Pace" value={metrics.wordsPerMinute} unit="wpm" verdict={pace} />
        <Stat
          icon={Activity}
          label="Articulation"
          value={metrics.articulationRate}
          unit="wpm"
          verdict={{
            label: 'Excluding pauses',
            tone: 'text-ink-muted',
            hint: 'Your speed while actually speaking.',
          }}
        />
        <Stat
          icon={MessageSquareDashed}
          label="Filler words"
          value={metrics.fillers?.total ?? 0}
          unit={`(${metrics.fillers?.perMinute ?? 0}/min)`}
          verdict={fillers}
        />
        <Stat
          icon={Timer}
          label="Long pauses"
          value={metrics.longPauseCount ?? 0}
          unit={metrics.totalPauseSeconds ? `(${metrics.totalPauseSeconds}s total)` : ''}
          verdict={{
            label: metrics.longPauseCount ? 'Review these' : 'None',
            tone: metrics.longPauseCount > 4 ? 'text-amber-300' : 'text-emerald-300',
            hint: metrics.longPauseCount
              ? 'Gaps of 1.5s or more.'
              : 'No hesitation gaps detected.',
          }}
        />
      </div>

      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        <PaceSparkline series={metrics.paceSeries} />

        {topFillers.length > 0 && (
          <div className="rounded-card border border-line bg-overlay p-4">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-ink-muted">
              <MessageSquareDashed size={14} />
              Most used fillers
            </div>
            <ul className="mt-3 space-y-2">
              {topFillers.map(([term, count]) => (
                <li key={term} className="flex items-center justify-between gap-3 text-sm">
                  <span className="truncate font-medium text-slate-200">&ldquo;{term}&rdquo;</span>
                  <span className="shrink-0 rounded-full border border-line bg-overlay px-2.5 py-0.5 text-xs font-semibold text-ink-muted">
                    {count}x
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {metrics.longPauseCount > 0 && (
        <details className="mt-3 rounded-card border border-line bg-overlay p-4">
          <summary className="cursor-pointer text-sm font-semibold text-slate-200">
            Where the long pauses were ({metrics.longPauseCount})
          </summary>
          <ul className="mt-3 space-y-2">
            {metrics.longPauses.map((pause) => (
              <li key={`${pause.start}-${pause.duration}`} className="text-sm leading-6 text-ink-muted">
                <span className="font-semibold text-slate-200">{formatTime(pause.start)}</span>
                {' · '}
                {pause.duration}s after &ldquo;{pause.afterWord}&rdquo;
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}
