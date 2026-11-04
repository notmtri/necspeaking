import React from 'react';

const FIELD_CLASSNAME = 'w-full rounded-control border border-line bg-surface-raised px-4 py-3 text-ink outline-none transition-colors duration-200 placeholder:text-ink-subtle hover:border-overlay-hover focus:border-sky-400 focus:ring-4 focus:ring-sky-100 dark:focus:ring-sky-400/20';

export { FIELD_CLASSNAME };

export function LabeledInput({ label, value, onChange, placeholder, type = 'text' }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-ink">{label}</span>
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

/** A titled block on the profile. `eyebrow` is accepted for old callers and not shown. */
export function ProfileSectionCard({ title, children, className = '' }) {
  return (
    <section className={`min-w-0 rounded-panel border border-line bg-surface-raised p-5 sm:p-6 ${className}`}>
      <h2 className="text-lg font-semibold text-ink">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

export function ProfileDetailRow({ label, value }) {
  return (
    <div className="flex min-w-0 items-baseline justify-between gap-3 border-b border-line py-2.5">
      <div className="text-sm text-ink-muted">{label}</div>
      <div className="min-w-0 break-words text-right text-sm font-medium text-ink">{value}</div>
    </div>
  );
}

export function ProfileMetricCard({ label, value, tone = 'sky' }) {
  const toneClasses = {
    sky: 'bg-sky-50 dark:bg-sky-400/10 text-sky-900 dark:text-sky-100',
    emerald: 'bg-emerald-50 dark:bg-emerald-400/10 text-emerald-900 dark:text-emerald-100',
    amber: 'bg-amber-50 dark:bg-amber-400/10 text-amber-900 dark:text-amber-100',
    slate: 'bg-overlay text-ink',
  };

  return (
    <div className={`min-w-0 rounded-card px-4 py-4 ${toneClasses[tone] || toneClasses.sky}`}>
      <div className="text-sm font-medium opacity-80">{label}</div>
      <div className="mt-1.5 font-display text-3xl font-semibold tracking-[-0.03em] tabular">{value}</div>
    </div>
  );
}
