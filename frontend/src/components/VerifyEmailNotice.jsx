import React, { useState } from 'react';
import { MailCheck } from 'lucide-react';
import { apiFetch } from '../apiClient';

/** Asks a logged-in student to confirm their email, with a button to (re)send the link. */
export default function VerifyEmailNotice({ email, title = 'Confirm your email', reason }) {
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState(null);

  const send = async () => {
    setSending(true);
    setStatus(null);
    try {
      await apiFetch('/api/auth/verify-email/request', { method: 'POST' });
      setStatus({ tone: 'ok', text: `Sent. Open the link in the email to ${email}. Check spam if it isn't there in a minute.` });
    } catch (error) {
      setStatus({ tone: 'error', text: error.message || 'Could not send the email.' });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="rounded-card border border-amber-300/25 bg-amber-300/10 p-4 text-sm text-amber-50">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <MailCheck size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
          <div className="min-w-0">
            <div className="font-semibold text-white">{title}</div>
            <div className="mt-1 leading-6 text-amber-50/90">{reason}</div>
          </div>
        </div>
        <button
          type="button"
          onClick={send}
          disabled={sending}
          className="shrink-0 rounded-full bg-amber-300/90 px-4 py-2 font-semibold text-slate-950 transition hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {sending ? 'Sending...' : 'Send confirmation email'}
        </button>
      </div>
      {status && (
        <p className={`mt-3 ${status.tone === 'error' ? 'text-rose-200' : 'text-emerald-200'}`} role="status">{status.text}</p>
      )}
    </div>
  );
}
