import React from 'react';

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
