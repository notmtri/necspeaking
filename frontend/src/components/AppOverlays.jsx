import React, { useEffect, useRef, useState } from 'react';
import { Trash2, X } from 'lucide-react';

/**
 * Closes on Escape and restores focus to whatever was focused before the
 * overlay opened, so keyboard users are not dropped at the top of the page.
 */
export function useOverlayDismiss(open, onClose, { disabled = false } = {}) {
  const previouslyFocusedRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;

    previouslyFocusedRef.current = document.activeElement;

    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && !disabled) onClose?.();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      const previous = previouslyFocusedRef.current;
      if (previous && typeof previous.focus === 'function') previous.focus();
    };
  }, [disabled, onClose, open]);
}

export function AdminLoginModal({ open, password, onPasswordChange, onClose, onSubmit, error, submitting }) {
  useOverlayDismiss(open, onClose, { disabled: submitting });

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-sm">
      <div
        className="w-full max-w-md rounded-panel border border-line bg-surface-raised p-5 sm:p-6"
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-login-title"
      >
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-sky-300">Admin access</div>
            <h2 id="admin-login-title" className="mt-2 text-xl font-semibold text-white">Enter admin password</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-full border border-line bg-overlay p-2 text-ink-muted transition hover:bg-overlay-hover hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
            aria-label="Close admin login"
          >
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
            aria-label="Admin password"
            autoFocus
            className="w-full rounded-control border border-line bg-overlay px-4 py-3 text-white outline-none transition placeholder:text-ink-subtle focus:border-sky-400/50"
          />
          {error && (
            <div className="rounded-control border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-100" role="alert">
              {error}
            </div>
          )}
          <div className="flex gap-3">
            <button type="button" onClick={onClose} disabled={submitting} className="flex-1 rounded-control border border-line bg-overlay px-4 py-3 font-semibold text-slate-200 transition hover:bg-overlay-hover disabled:cursor-not-allowed disabled:opacity-60">
              Cancel
            </button>
            <button type="button" onClick={onSubmit} disabled={submitting} className="flex-1 rounded-control bg-sky-500 px-4 py-3 font-semibold text-white transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-60">
              {submitting ? 'Checking...' : 'Continue'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export const FEEDBACK_MAX_CHARS = 2000;

/**
 * Suggestions and bug reports, saved to the backend and read in the admin
 * panel. Guests can leave an optional contact so they can be answered.
 */
export function FeedbackModal({ open, onClose, onSubmit, isLoggedIn }) {
  const [message, setMessage] = useState('');
  const [contact, setContact] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  useOverlayDismiss(open, onClose, { disabled: submitting });

  if (!open) return null;

  const trimmed = message.trim();
  const send = async () => {
    if (trimmed.length < 3) {
      setError('Write a few words before sending.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await onSubmit({ message: trimmed, contact: contact.trim() });
      setMessage('');
      setContact('');
      onClose();
    } catch (requestError) {
      setError(requestError?.message || 'Could not send feedback. Try again in a moment.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-sm">
      <div
        className="w-full max-w-lg rounded-panel border border-line bg-surface-raised p-5 sm:p-6"
        role="dialog"
        aria-modal="true"
        aria-labelledby="feedback-title"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-sky-300">Feedback</div>
            <h2 id="feedback-title" className="mt-2 text-xl font-semibold text-white">What should necs. add or fix?</h2>
            <p className="mt-1 text-sm text-ink-muted">Ideas, bugs, wrong scores: anything helps. It goes straight to the founder.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-full border border-line bg-overlay p-2 text-ink-muted transition hover:bg-overlay-hover hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
            aria-label="Close feedback"
          >
            <X size={16} />
          </button>
        </div>

        <div className="mt-5 space-y-4">
          <label className="block">
            <span className="sr-only">Your feedback</span>
            <textarea
              value={message}
              onChange={(event) => setMessage(event.target.value.slice(0, FEEDBACK_MAX_CHARS))}
              rows="5"
              autoFocus
              placeholder="e.g. The timer should beep before recording ends."
              className="w-full resize-y rounded-control border border-line bg-overlay px-4 py-3 text-white outline-none transition placeholder:text-ink-subtle focus:border-sky-400/50"
            />
            <span className="mt-1 block text-right text-xs text-ink-subtle">{message.length}/{FEEDBACK_MAX_CHARS}</span>
          </label>
          {!isLoggedIn && (
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-ink-muted">Email or Facebook, if you'd like a reply (optional)</span>
              <input
                type="text"
                value={contact}
                onChange={(event) => setContact(event.target.value.slice(0, 255))}
                className="w-full rounded-control border border-line bg-overlay px-4 py-3 text-white outline-none transition placeholder:text-ink-subtle focus:border-sky-400/50"
              />
            </label>
          )}
          {error && (
            <div className="rounded-control border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-100" role="alert">
              {error}
            </div>
          )}
          <div className="flex gap-3">
            <button type="button" onClick={onClose} disabled={submitting} className="flex-1 rounded-control border border-line bg-overlay px-4 py-3 font-semibold text-slate-200 transition hover:bg-overlay-hover disabled:cursor-not-allowed disabled:opacity-60">
              Cancel
            </button>
            <button type="button" onClick={send} disabled={submitting} className="flex-1 rounded-control bg-sky-500 px-4 py-3 font-semibold text-white transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-60">
              {submitting ? 'Sending...' : 'Send feedback'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ConfirmModal({ open, title, message, confirmLabel = 'Confirm', tone = 'danger', onConfirm, onClose }) {
  useOverlayDismiss(open, onClose);

  if (!open) return null;

  const confirmClassName = tone === 'danger'
    ? 'bg-rose-500 text-white hover:bg-rose-400'
    : 'bg-sky-500 text-white hover:bg-sky-400';

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
      <div
        className="w-full max-w-md rounded-panel border border-line bg-surface-raised p-5 sm:p-6"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-modal-title"
      >
        <div className="inline-flex h-11 w-11 items-center justify-center rounded-card border border-rose-400/20 bg-rose-500/10 text-rose-200">
          <Trash2 size={18} aria-hidden="true" />
        </div>
        <h2 id="confirm-modal-title" className="mt-4 text-xl font-semibold text-white">{title}</h2>
        <p className="mt-2 text-sm leading-6 text-ink-muted">{message}</p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <button type="button" onClick={onClose} className="flex-1 rounded-control border border-line bg-overlay px-4 py-3 font-semibold text-slate-200 transition hover:bg-overlay-hover">
            Cancel
          </button>
          <button type="button" onClick={onConfirm} className={`flex-1 rounded-control px-4 py-3 font-semibold transition ${confirmClassName}`}>
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
    <div className="pointer-events-none fixed bottom-4 left-4 right-4 z-[90] flex w-auto max-w-none flex-col gap-3 sm:left-auto sm:w-full sm:max-w-sm">
      {toasts.map((toast) => {
        const toneClasses = toast.tone === 'error'
          ? 'border-rose-400/25 bg-rose-500/15 text-rose-50'
          : toast.tone === 'success'
            ? 'border-emerald-400/25 bg-emerald-500/15 text-emerald-50'
            : toast.tone === 'update'
              ? 'border-amber-400/25 bg-amber-500/15 text-amber-50'
              : 'border-sky-400/25 bg-sky-500/15 text-sky-50';

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto rounded-card border px-4 py-3 backdrop-blur ${toneClasses}`}
            role={toast.tone === 'error' ? 'alert' : 'status'}
            aria-live={toast.tone === 'error' ? 'assertive' : 'polite'}
          >
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
                    className="mt-2 rounded-control bg-white/10 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-white/20"
                  >
                    {toast.action.label}
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={() => dismissToast(toast.id)}
                className="rounded-full border border-line bg-overlay p-1 transition hover:bg-overlay-hover"
                aria-label="Dismiss notification"
              >
                <X size={14} />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
