import React, { useMemo } from 'react';
import { Calendar } from 'lucide-react';
import { DEFAULT_COMMIT_WEEKS } from '../appShared';

export function LabeledInput({ label, value, onChange, placeholder, variant = 'default' }) {
  const labelClassName = variant === 'classic' ? 'mb-2 block text-sm font-semibold text-slate-300' : 'mb-2 block text-sm font-semibold text-slate-200';
  const inputClassName = variant === 'classic'
    ? 'w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-slate-100 placeholder:text-slate-500 outline-none transition focus:border-sky-400/30 focus:ring-2 focus:ring-sky-400/10'
    : 'w-full rounded-2xl border border-white/10 bg-[#07111f] px-4 py-3 text-white placeholder:text-slate-500';

  return (
    <label className="block">
      <span className={labelClassName}>{label}</span>
      <input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className={inputClassName} />
    </label>
  );
}

export function ProfileSectionCard({ title, eyebrow, children, className = '' }) {
  return (
    <section className={`overflow-hidden rounded-[32px] border border-white/10 bg-[linear-gradient(180deg,rgba(7,17,31,0.98),rgba(10,23,44,0.96))] shadow-[0_20px_80px_rgba(2,6,23,0.25)] ${className}`}>
      <div className="border-b border-white/10 bg-white/[0.03] px-5 py-4">
        <div className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-200">{eyebrow}</div>
        <div className="mt-2 text-lg font-bold text-white">{title}</div>
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

export function ProfileDetailRow({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3">
      <div className="text-sm font-medium text-slate-400">{label}</div>
      <div className="text-sm font-semibold text-white">{value}</div>
    </div>
  );
}

export function ProfileMetricCard({ label, value, tone = 'sky' }) {
  const toneClasses = {
    sky: 'border-sky-400/20 bg-sky-400/10 text-sky-100',
    emerald: 'border-emerald-400/20 bg-emerald-400/10 text-emerald-100',
    amber: 'border-amber-400/20 bg-amber-400/10 text-amber-100',
    slate: 'border-white/10 bg-white/[0.04] text-slate-100',
  };

  return (
    <div className={`rounded-2xl border px-4 py-4 ${toneClasses[tone] || toneClasses.sky}`}>
      <div className="text-xs font-semibold uppercase tracking-[0.2em] opacity-80">{label}</div>
      <div className="mt-2 text-3xl font-bold">{value}</div>
    </div>
  );
}

export function ProgressMiniChart({ points }) {
  if (!points?.length) {
    return (
      <div className="rounded-[32px] border border-white/10 bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.12),_transparent_35%),linear-gradient(180deg,rgba(7,17,31,0.92),rgba(10,23,44,0.9))] p-5 shadow-[0_16px_50px_rgba(2,6,23,0.18)]">
        <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-4">
          <div>
            <div className="text-lg font-bold text-white">Progress graph</div>
            <div className="mt-1 text-sm text-slate-400">Average score trend over time</div>
          </div>
        </div>
        <div className="flex h-44 items-center justify-center text-sm text-slate-500">
          No practice data yet.
        </div>
      </div>
    );
  }

  const maxValue = Math.max(...points.map((point) => point.value), 100);
  const minValue = Math.min(...points.map((point) => point.value), 0);
  const range = Math.max(maxValue - minValue, 1);
  const path = points
    .map((point, index) => {
      const x = points.length === 1 ? 0 : (index / (points.length - 1)) * 100;
      const y = 100 - ((point.value - minValue) / range) * 100;
      return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
    })
    .join(' ');

  const areaPath = `${path} L 100 100 L 0 100 Z`;

  return (
    <div className="rounded-[32px] border border-white/10 bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.12),_transparent_35%),linear-gradient(180deg,rgba(7,17,31,0.92),rgba(10,23,44,0.9))] p-5 shadow-[0_16px_50px_rgba(2,6,23,0.18)]">
      <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-4">
        <div>
          <div className="text-lg font-bold text-white">Progress graph</div>
          <div className="mt-1 text-sm text-slate-400">Average score trend over time</div>
        </div>
        <div className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-sm font-semibold text-emerald-100">+{points[points.length - 1].value - points[0].value} pts</div>
      </div>
      <svg viewBox="0 0 100 100" className="mt-6 h-44 w-full overflow-visible">
        <defs>
          <linearGradient id="progressFill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.04" />
          </linearGradient>
          <linearGradient id="progressStroke" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%" stopColor="#38bdf8" />
            <stop offset="100%" stopColor="#8b5cf6" />
          </linearGradient>
        </defs>
        <path d={areaPath} fill="url(#progressFill)" />
        <path d={path} fill="none" stroke="url(#progressStroke)" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
        {points.map((point, index) => {
          const x = points.length === 1 ? 0 : (index / (points.length - 1)) * 100;
          const y = 100 - ((point.value - minValue) / range) * 100;
          return <circle key={point.label} cx={x} cy={y} r="3.2" fill="#f8fafc" stroke="#38bdf8" strokeWidth="2" />;
        })}
      </svg>
      <div className="mt-2 grid grid-cols-6 gap-2 text-xs text-slate-400">
        {points.map((point) => (
          <div key={point.label} className="text-center">{point.label}</div>
        ))}
      </div>
    </div>
  );
}

export function CommitHeatmap({ weeks, timestamps = [] }) {
  const shades = ['bg-[#0f172a]', 'bg-emerald-950', 'bg-emerald-700', 'bg-emerald-500', 'bg-emerald-300'];
  const weekdayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const displayWeeks = useMemo(
    () => (weeks?.length ? weeks : DEFAULT_COMMIT_WEEKS),
    [weeks],
  );

  const monthMarks = useMemo(() => {
    const generatedLabels = ['Week 1', 'Week 2', 'Week 3', 'Week 4', 'Week 5', 'Week 6'];
    return displayWeeks.map((_, index) => timestamps[index]?.month || generatedLabels[index] || `Week ${index + 1}`);
  }, [displayWeeks, timestamps]);

  return (
    <div className="rounded-[32px] border border-white/10 bg-[linear-gradient(180deg,rgba(7,17,31,0.95),rgba(10,23,44,0.9))] p-5 shadow-[0_16px_50px_rgba(2,6,23,0.18)]">
      <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-4">
        <div>
          <div className="text-lg font-bold text-white">Commit graph</div>
          <div className="mt-1 text-sm text-slate-400">Daily practice heatmap</div>
        </div>
        <Calendar size={18} className="text-slate-400" />
      </div>
      <div className="mt-5 overflow-x-auto pb-1">
        <div className="min-w-[320px]">
          <div className="grid gap-1" style={{ gridTemplateColumns: `36px repeat(${displayWeeks.length}, minmax(12px, 1fr))` }}>
            <div />
            {monthMarks.map((month, index) => (
              <div key={`month-${index}`} className="text-center text-[11px] font-medium text-slate-400">
                {month}
              </div>
            ))}
          </div>

          <div className="mt-2 grid gap-1" style={{ gridTemplateColumns: `36px repeat(${displayWeeks.length}, minmax(12px, 1fr))` }}>
            <div className="grid grid-rows-7 gap-1 pr-1 text-[11px] text-slate-500">
              {weekdayLabels.map((label, rowIndex) => (
                <div key={`weekday-${rowIndex}`} className="flex h-3.5 items-center justify-end pr-1">
                  {rowIndex % 2 === 0 ? label : ''}
                </div>
              ))}
            </div>

            {displayWeeks.map((week, columnIndex) => (
              <div key={`week-${columnIndex}`} className="grid grid-rows-7 gap-1">
                {week.map((day, dayIndex) => (
                  <div
                    key={`day-${columnIndex}-${dayIndex}`}
                    title={`${timestamps[columnIndex]?.label || `Week ${columnIndex + 1}`} ${timestamps[columnIndex]?.timestamp || ''} - intensity ${day}`}
                    className={`h-3.5 w-3.5 rounded-sm border border-white/10 ${shades[Math.min(day, shades.length - 1)]}`}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="mt-4 flex items-center gap-2 text-xs text-slate-500">
        <span>Less</span>
        {shades.map((shade, index) => (
          <span key={shade} className={`h-3 w-3 rounded-sm border border-white/5 ${shade}`} title={`Intensity ${index}`} />
        ))}
        <span>More</span>
      </div>
    </div>
  );
}
