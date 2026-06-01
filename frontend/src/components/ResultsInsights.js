import React from 'react';
import { ArrowUpRight, CheckCircle, Target } from 'lucide-react';
import { buildImprovementPlan } from '../appShared';

export default function ResultsInsights({ results }) {
  if (!results?.scores) return null;

  const plan = buildImprovementPlan(results);

  return (
    <section className="rounded-[24px] border border-emerald-400/20 bg-emerald-400/10 p-4 sm:p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-300/25 bg-emerald-300/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-emerald-100">
            <Target size={14} />
            Next practice plan
          </div>
          <h3 className="mt-3 text-xl font-black text-white">Focus on {plan.priority.label.toLowerCase()} first</h3>
          <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-300">
            Target {plan.targetScore.toFixed(2)}/2.0 next attempt by improving {plan.priority.label.toLowerCase()} while maintaining your strongest area: {plan.strongest.label.toLowerCase()}.
          </p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 text-sm font-semibold text-emerald-100">
          {plan.priority.score.toFixed(2)} / {plan.priority.max.toFixed(1)}
        </div>
      </div>

      <div className="mt-5 grid gap-3 lg:grid-cols-2">
        {plan.focusItems.map((item) => (
          <div key={item.key} className="rounded-[22px] border border-white/10 bg-slate-950/35 p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="font-semibold text-white">{item.label} drill</div>
              <ArrowUpRight size={16} className="text-emerald-200" />
            </div>
            <p className="mt-2 text-sm leading-7 text-slate-300">{item.focus}</p>
            <div className="mt-3 rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-sm leading-6 text-slate-200">
              {item.drill}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-3">
        {plan.checklist.map((item) => (
          <div key={item.label} className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-sm leading-6 text-slate-300">
            <CheckCircle size={16} className="mt-0.5 shrink-0 text-emerald-200" />
            <div>
              <span className="font-semibold text-white">{item.label}: </span>
              {item.text}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
