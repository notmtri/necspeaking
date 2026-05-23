import React from 'react';
import { Trash2, X } from 'lucide-react';

export function AdminLoginModal({ open, password, onPasswordChange, onClose, onSubmit, error, submitting }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-[28px] border border-white/10 bg-[#081120] p-6 shadow-[0_30px_120px_rgba(2,6,23,0.55)]">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-300">Admin Access</div>
            <h2 className="mt-2 text-2xl font-black text-white">Enter admin password</h2>
          </div>
          <button type="button" onClick={onClose} disabled={submitting} className="rounded-full border border-white/10 bg-white/[0.04] p-2 text-slate-300 transition hover:bg-white/[0.08] hover:text-white disabled:cursor-not-allowed disabled:opacity-60">
            <X size={16} />
          </button>
        </div>

        <div className="mt-5 space-y-4">
          <input
            type="password"
            value={password}
            onChange={(event) => onPasswordChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') onSubmit();
            }}
            placeholder="Password"
            autoFocus
            className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-sky-400/50"
          />
          {error && (
            <div className="rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
              {error}
            </div>
          )}
          <div className="flex gap-3">
            <button type="button" onClick={onClose} disabled={submitting} className="flex-1 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 font-semibold text-slate-200 transition hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-60">
              Cancel
            </button>
            <button type="button" onClick={onSubmit} disabled={submitting} className="flex-1 rounded-2xl bg-sky-500 px-4 py-3 font-semibold text-white transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-60">
              {submitting ? 'Checking...' : 'Continue'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ConfirmModal({ open, title, message, confirmLabel = 'Confirm', tone = 'danger', onConfirm, onClose }) {
  if (!open) return null;

  const confirmClassName = tone === 'danger'
    ? 'bg-rose-500 text-white hover:bg-rose-400'
    : 'bg-sky-500 text-white hover:bg-sky-400';

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-[28px] border border-white/10 bg-[#081120] p-6 shadow-[0_30px_120px_rgba(2,6,23,0.55)]">
        <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-rose-400/20 bg-rose-500/10 text-rose-200">
          <Trash2 size={18} />
        </div>
        <h3 className="mt-4 text-2xl font-black text-white">{title}</h3>
        <p className="mt-2 text-sm leading-7 text-slate-300">{message}</p>
        <div className="mt-6 flex gap-3">
          <button type="button" onClick={onClose} className="flex-1 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 font-semibold text-slate-200 transition hover:bg-white/[0.08]">
            Cancel
          </button>
          <button type="button" onClick={onConfirm} className={`flex-1 rounded-2xl px-4 py-3 font-semibold transition ${confirmClassName}`}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export function ToastViewport({ toasts, dismissToast }) {
  if (toasts.length === 0) return null;

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[90] flex w-full max-w-sm flex-col gap-3">
      {toasts.map((toast) => {
        const toneClasses = toast.tone === 'error'
          ? 'border-rose-400/25 bg-rose-500/12 text-rose-50'
          : toast.tone === 'success'
            ? 'border-emerald-400/25 bg-emerald-500/12 text-emerald-50'
            : toast.tone === 'update'
              ? 'border-amber-400/25 bg-amber-500/12 text-amber-50'
              : 'border-sky-400/25 bg-sky-500/12 text-sky-50';

        return (
          <div key={toast.id} className={`pointer-events-auto rounded-2xl border px-4 py-3 shadow-[0_20px_60px_rgba(2,6,23,0.4)] backdrop-blur ${toneClasses}`}>
            <div className="flex items-start gap-3">
              <div className="flex-1 text-sm leading-6">
                <div>{toast.message}</div>
                {toast.action && (
                  <button
                    type="button"
                    onClick={() => {
                      toast.action.onClick();
                      dismissToast(toast.id);
                    }}
                    className="mt-2 rounded-xl bg-white/10 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-white/20"
                  >
                    {toast.action.label}
                  </button>
                )}
              </div>
              <button type="button" onClick={() => dismissToast(toast.id)} className="rounded-full border border-white/10 bg-white/[0.04] p-1 text-current/80 transition hover:bg-white/[0.08] hover:text-current">
                <X size={14} />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
