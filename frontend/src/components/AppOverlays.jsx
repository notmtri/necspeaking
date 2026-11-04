import React, { useState } from 'react';
import { AnimatePresence, MotionConfig, motion, useReducedMotion } from 'motion/react';
import { Trash2, X } from 'lucide-react';
import Sheet, { EASE_OUT, fadeProps } from './Sheet';

export { useOverlayDismiss } from './useOverlayDismiss';

export function AdminLoginModal({ open, password, onPasswordChange, onClose, onSubmit, error, submitting }) {
  return (
    <Sheet open={open} onClose={onClose} dismissible={!submitting} labelledBy="admin-login-title" width="max-w-md" bodyClassName="p-5 sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-xs font-semibold tracking-normal text-sky-600 dark:text-sky-300">Admin access</div>
            <h2 id="admin-login-title" className="mt-2 text-xl font-semibold text-ink">Enter admin password</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-full border border-line bg-overlay p-2 text-ink-muted transition hover:bg-overlay-hover hover:text-ink disabled:cursor-not-allowed disabled:opacity-60"
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
            className="w-full rounded-control border border-line bg-overlay px-4 py-3 text-ink outline-none transition placeholder:text-ink-subtle focus:border-sky-300 dark:focus:border-sky-400/40"
          />
          {error && (
            <div className="rounded-control border border-rose-200 dark:border-rose-400/25 bg-rose-50 dark:bg-rose-400/10 px-4 py-3 text-sm text-rose-700 dark:text-rose-300" role="alert">
              {error}
            </div>
          )}
          <div className="flex gap-3">
            <button type="button" onClick={onClose} disabled={submitting} className="flex-1 rounded-full border border-line bg-surface-raised px-4 py-3 font-medium text-ink transition hover:bg-overlay disabled:cursor-not-allowed disabled:opacity-60">
              Cancel
            </button>
            <button type="button" onClick={onSubmit} disabled={submitting} className="flex-1 rounded-full bg-ink px-4 py-3 font-medium text-on-ink transition hover:bg-ink/85 disabled:cursor-not-allowed disabled:opacity-60">
              {submitting ? 'Checking...' : 'Continue'}
            </button>
          </div>
        </div>
    </Sheet>
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
    <Sheet open={open} onClose={onClose} dismissible={!submitting} labelledBy="feedback-title" width="max-w-lg" bodyClassName="p-5 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-xs font-semibold tracking-normal text-sky-600 dark:text-sky-300">Feedback</div>
            <h2 id="feedback-title" className="mt-2 text-xl font-semibold text-ink">What should necs. add or fix?</h2>
            <p className="mt-1 text-sm text-ink-muted">Ideas, bugs, wrong scores: anything helps. It goes straight to the founder.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-full border border-line bg-overlay p-2 text-ink-muted transition hover:bg-overlay-hover hover:text-ink disabled:cursor-not-allowed disabled:opacity-60"
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
              className="w-full resize-y rounded-control border border-line bg-overlay px-4 py-3 text-ink outline-none transition placeholder:text-ink-subtle focus:border-sky-300 dark:focus:border-sky-400/40"
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
                className="w-full rounded-control border border-line bg-overlay px-4 py-3 text-ink outline-none transition placeholder:text-ink-subtle focus:border-sky-300 dark:focus:border-sky-400/40"
              />
            </label>
          )}
          {error && (
            <div className="rounded-control border border-rose-200 dark:border-rose-400/25 bg-rose-50 dark:bg-rose-400/10 px-4 py-3 text-sm text-rose-700 dark:text-rose-300" role="alert">
              {error}
            </div>
          )}
          <div className="flex gap-3">
            <button type="button" onClick={onClose} disabled={submitting} className="flex-1 rounded-full border border-line bg-surface-raised px-4 py-3 font-medium text-ink transition hover:bg-overlay disabled:cursor-not-allowed disabled:opacity-60">
              Cancel
            </button>
            <button type="button" onClick={send} disabled={submitting} className="flex-1 rounded-full bg-ink px-4 py-3 font-medium text-on-ink transition hover:bg-ink/85 disabled:cursor-not-allowed disabled:opacity-60">
              {submitting ? 'Sending...' : 'Send feedback'}
            </button>
          </div>
        </div>
    </Sheet>
  );
}

export function ConfirmModal({ open, title, message, confirmLabel = 'Confirm', tone = 'danger', onConfirm, onClose }) {
  const confirmClassName = tone === 'danger'
    ? 'bg-rose-500 text-white hover:bg-rose-400'
    : 'bg-ink text-on-ink hover:bg-ink/85';

  return (
    <Sheet open={open} onClose={onClose} labelledBy="confirm-modal-title" width="max-w-md" bodyClassName="p-5 sm:p-6" zIndex={80}>
        <div className="inline-flex h-11 w-11 items-center justify-center rounded-card border border-rose-200 dark:border-rose-400/25 bg-rose-50 dark:bg-rose-400/10 text-rose-700 dark:text-rose-300">
          <Trash2 size={18} aria-hidden="true" />
        </div>
        <h2 id="confirm-modal-title" className="mt-4 text-xl font-semibold text-ink">{title}</h2>
        <p className="mt-2 text-sm leading-6 text-ink-muted">{message}</p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <button type="button" onClick={onClose} className="flex-1 rounded-full border border-line bg-surface-raised px-4 py-3 font-medium text-ink transition hover:bg-overlay">
            Cancel
          </button>
          <button type="button" onClick={onConfirm} className={`flex-1 rounded-control px-4 py-3 font-semibold transition ${confirmClassName}`}>
            {confirmLabel}
          </button>
        </div>
    </Sheet>
  );
}

/**
 * Toasts rise from the bottom edge and leave the same way; the others slide
 * to close the gap (layout), so the stack never jumps.
 */
export function ToastViewport({ toasts, dismissToast }) {
  const toastFade = fadeProps(useReducedMotion(), {
    hidden: { opacity: 0, y: 24 }, shown: { opacity: 1, y: 0 },
    enter: { duration: 0.35, ease: EASE_OUT }, exit: { duration: 0.2, ease: EASE_OUT },
  });
  return (
    <div className="pointer-events-none fixed bottom-[calc(1rem+env(safe-area-inset-bottom,0px))] left-4 right-4 z-[90] flex w-auto max-w-none flex-col gap-3 sm:left-auto sm:w-full sm:max-w-sm">
      <MotionConfig reducedMotion="user">
      <AnimatePresence initial={false}>
      {toasts.map((toast) => {
        const toneClasses = toast.tone === 'error'
          ? 'border-rose-200 dark:border-rose-400/25 bg-rose-50 dark:bg-rose-400/10 text-rose-700 dark:text-rose-300'
          : toast.tone === 'success'
            ? 'border-emerald-200 dark:border-emerald-400/25 bg-emerald-50 dark:bg-emerald-400/10 text-emerald-700 dark:text-emerald-300'
            : toast.tone === 'update'
              ? 'border-amber-200 dark:border-amber-400/25 bg-amber-50 dark:bg-amber-400/10 text-amber-800 dark:text-amber-200'
              : 'border-sky-200 dark:border-sky-400/25 bg-sky-50 dark:bg-sky-400/10 text-sky-700 dark:text-sky-300';

        return (
          <motion.div
            key={toast.id}
            layout
            initial={toastFade.initial}
            animate={toastFade.animate}
            exit={toastFade.exit}
            transition={{ layout: { duration: 0.3, ease: EASE_OUT } }}
            className={`pointer-events-auto rounded-card border px-4 py-3 backdrop-blur ${toneClasses} ${toastFade.className}`}
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
                    className="mt-2 rounded-full bg-black/5 dark:bg-white/10 px-3 py-1.5 text-xs font-medium text-ink transition hover:bg-black/10 dark:hover:bg-white/15"
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
          </motion.div>
        );
      })}
      </AnimatePresence>
      </MotionConfig>
    </div>
  );
}
