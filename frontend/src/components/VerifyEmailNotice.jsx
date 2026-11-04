import React, { useState } from 'react';
import { MailCheck } from 'lucide-react';
import { apiFetch } from '../apiClient';

/** Keeps the six digits of an emailed code, whatever else was pasted with them. */
export const cleanCode = (value) => String(value || '').replace(/\D/g, '').slice(0, 6);

export const CODE_INPUT_CLASSNAME = 'w-36 rounded-control border border-line bg-surface-sunken px-4 py-2 text-center font-mono text-lg tracking-[0.3em] text-ink outline-none focus:border-sky-300';

/**
 * Asks a logged-in student to confirm their email: send a 6-digit code, type
 * it here. Sign-up already sends one, so the box is there from the start.
 */
export default function VerifyEmailNotice({ email, title = 'Confirm your email', reason, onVerified }) {
  const [code, setCode] = useState('');
  const [sending, setSending] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [status, setStatus] = useState(null);

  const send = async () => {
    setSending(true);
    setStatus(null);
    try {
      await apiFetch('/api/auth/verify-email/request', { method: 'POST' });
      setStatus({ tone: 'ok', text: `Code sent to ${email}. Check spam if it isn't there in a minute.` });
    } catch (error) {
      setStatus({ tone: 'error', text: error.message || 'Could not send the email.' });
    } finally {
      setSending(false);
    }
  };

  const confirm = async (event) => {
    event.preventDefault();
    setConfirming(true);
    setStatus(null);
    try {
      const data = await apiFetch('/api/auth/verify-email', { method: 'POST', body: { code } });
      onVerified?.(data.user);
    } catch (error) {
      setStatus({ tone: 'error', text: error.message || 'Could not confirm your email.' });
    } finally {
      setConfirming(false);
    }
  };

  return (
    <div className="rounded-card border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
      <div className="flex min-w-0 items-start gap-3">
        <MailCheck size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
        <div className="min-w-0">
          <div className="font-semibold text-ink">{title}</div>
          <div className="mt-1 leading-6 text-amber-800">
            {reason} Enter the 6-digit code we emailed to {email}.
          </div>
        </div>
      </div>
      <form onSubmit={confirm} className="mt-3 flex flex-wrap items-center gap-2">
        <input
          value={code}
          onChange={(event) => setCode(cleanCode(event.target.value))}
          inputMode="numeric"
          autoComplete="one-time-code"
          placeholder="000000"
          aria-label="6-digit code"
          className={CODE_INPUT_CLASSNAME}
        />
        <button
          type="submit"
          disabled={confirming || code.length !== 6}
          className="rounded-full bg-amber-300 px-4 py-2 font-semibold text-slate-950 transition hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {confirming ? 'Checking...' : 'Confirm'}
        </button>
        <button
          type="button"
          onClick={send}
          disabled={sending}
          className="rounded-full border border-amber-200 px-4 py-2 font-semibold text-amber-800 transition hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {sending ? 'Sending...' : 'Send me a code'}
        </button>
      </form>
      {status && (
        <p className={`mt-3 ${status.tone === 'error' ? 'text-rose-700' : 'text-emerald-700'}`} role="status">{status.text}</p>
      )}
    </div>
  );
}
