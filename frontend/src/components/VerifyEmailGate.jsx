import React, { useEffect, useRef, useState } from 'react';
import { Loader, MailCheck } from 'lucide-react';
import { apiFetch } from '../apiClient';
import { cleanCode } from './VerifyEmailNotice';

/**
 * Stands in for every page while a new account waits for its emailed code.
 * The account counts as logged in only once the code is typed (the server
 * treats it as a guest until then). A typo'd address can be thrown away and
 * the email and username used again.
 */
export default function VerifyEmailGate({ pendingUser, onVerified, onStartOver, onLogout }) {
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(null); // 'confirm' | 'resend' | 'restart'
  const [status, setStatus] = useState(null);
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const confirm = async (event) => {
    event.preventDefault();
    if (code.length !== 6) return;
    setBusy('confirm');
    setStatus(null);
    try {
      const data = await apiFetch('/api/auth/verify-email', { method: 'POST', body: { code } });
      await onVerified?.(data);
    } catch (error) {
      setStatus({ tone: 'error', text: error.message || 'That code did not work. Check it and try again.' });
      setBusy(null);
    }
  };

  const resend = async () => {
    setBusy('resend');
    setStatus(null);
    try {
      await apiFetch('/api/auth/verify-email/request', { method: 'POST' });
      setCode('');
      setStatus({ tone: 'ok', text: 'New code sent. Only the newest code works.' });
    } catch (error) {
      setStatus({ tone: 'error', text: error.message || 'Could not send the email. Try again in a few minutes.' });
    } finally {
      setBusy(null);
    }
  };

  const startOver = async () => {
    setBusy('restart');
    setStatus(null);
    try {
      await apiFetch('/api/auth/account', { method: 'DELETE' });
      onStartOver?.();
    } catch (error) {
      setStatus({ tone: 'error', text: error.message || 'Could not start over. Try again.' });
      setBusy(null);
    }
  };

  return (
    <section className="mx-auto mt-4 max-w-lg rounded-panel border border-line bg-surface-raised p-6 sm:mt-10 sm:p-10" aria-labelledby="verify-gate-title">
      <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-sky-50 text-sky-700 dark:bg-sky-400/10 dark:text-sky-300">
        <MailCheck size={22} aria-hidden="true" />
      </span>
      <h1 id="verify-gate-title" className="mt-5 text-[1.75rem] font-semibold leading-tight text-ink">Check your email</h1>
      <p className="mt-2 text-base leading-7 text-ink-muted">
        We sent a 6-digit code to <span className="font-medium text-ink [overflow-wrap:anywhere]">{pendingUser.email}</span>.
        Enter it to finish creating your account.
      </p>

      <form onSubmit={confirm} className="mt-7">
        <label htmlFor="verify-gate-code" className="mb-2 block text-sm font-medium text-ink-muted">6-digit code</label>
        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            id="verify-gate-code"
            ref={inputRef}
            value={code}
            onChange={(event) => setCode(cleanCode(event.target.value))}
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="000000"
            className="min-w-0 flex-1 rounded-control border border-line bg-surface-sunken px-4 py-3 text-center font-mono text-2xl tracking-[0.4em] text-ink outline-none transition-colors placeholder:text-ink-subtle focus:border-sky-400 focus:ring-4 focus:ring-sky-100 dark:focus:ring-sky-400/20"
          />
          <button
            type="submit"
            disabled={busy !== null || code.length !== 6}
            className="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-full bg-ink px-6 font-medium text-on-ink transition-[background-color,transform] duration-150 hover:bg-ink/85 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {busy === 'confirm' && <Loader size={16} className="animate-spin" />}
            Confirm email
          </button>
        </div>
      </form>

      {status && (
        <p className={`mt-4 text-sm leading-6 ${status.tone === 'error' ? 'text-rose-700 dark:text-rose-300' : 'text-emerald-700 dark:text-emerald-300'}`} role={status.tone === 'error' ? 'alert' : 'status'}>
          {status.text}
        </p>
      )}

      <p className="mt-6 text-sm leading-6 text-ink-muted">
        Nothing after a minute? Check spam, or{' '}
        <button type="button" onClick={resend} disabled={busy !== null} className="font-medium text-sky-700 underline-offset-4 hover:underline disabled:opacity-50 dark:text-sky-300">
          {busy === 'resend' ? 'sending...' : 'send a new code'}
        </button>.
      </p>

      <div className="mt-6 flex flex-col gap-2 border-t border-line pt-6 sm:flex-row sm:items-center sm:justify-between">
        <button type="button" onClick={startOver} disabled={busy !== null} className="rounded-full px-4 py-2.5 text-sm font-medium text-ink transition-colors hover:bg-overlay disabled:opacity-50 sm:-ml-4">
          {busy === 'restart' ? 'Starting over...' : 'Wrong email? Sign up again'}
        </button>
        <button type="button" onClick={onLogout} disabled={busy !== null} className="rounded-full px-4 py-2.5 text-sm font-medium text-ink-muted transition-colors hover:bg-overlay hover:text-ink disabled:opacity-50 sm:-mr-4">
          Log out
        </button>
      </div>
    </section>
  );
}
