import React from 'react';

const FIELD_CLASSNAME = 'w-full rounded-control border border-line bg-overlay px-4 py-3 text-slate-100 outline-none transition placeholder:text-ink-subtle focus:border-sky-400/40 focus:ring-2 focus:ring-sky-400/10';

export { FIELD_CLASSNAME };

export function LabeledInput({ label, value, onChange, placeholder, type = 'text' }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-ink-muted">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className={FIELD_CLASSNAME}
      />
    </label>
  );
}

export function ProfileSectionCard({ title, eyebrow, children, className = '' }) {
  return (
    <section className={`min-w-0 overflow-hidden rounded-panel border border-line bg-surface-raised ${className}`}>
      <div className="border-b border-line bg-overlay px-4 py-4 sm:px-5">
        <div className="text-xs font-semibold uppercase tracking-[0.16em] text-sky-200">{eyebrow}</div>
        <div className="mt-2 text-base font-semibold text-white">{title}</div>
      </div>
      <div className="p-4 sm:p-5">{children}</div>
    </section>
  );
}

export function ProfileDetailRow({ label, value }) {
  return (
    <div className="flex min-w-0 flex-col gap-1 rounded-control border border-line bg-overlay px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
      <div className="text-sm text-ink-muted">{label}</div>
      <div className="min-w-0 break-words text-sm font-semibold text-white sm:text-right">{value}</div>
    </div>
  );
}

export function ProfileMetricCard({ label, value, tone = 'sky' }) {
  const toneClasses = {
    sky: 'border-sky-400/20 bg-sky-400/10 text-sky-100',
    emerald: 'border-emerald-400/20 bg-emerald-400/10 text-emerald-100',
    amber: 'border-amber-400/20 bg-amber-400/10 text-amber-100',
    slate: 'border-line bg-overlay text-slate-100',
  };

  return (
    <div className={`min-w-0 rounded-card border px-4 py-4 ${toneClasses[tone] || toneClasses.sky}`}>
      <div className="text-xs font-semibold uppercase tracking-[0.16em] opacity-80">{label}</div>
      <div className="mt-2 text-3xl font-semibold">{value}</div>
    </div>
  );
}
