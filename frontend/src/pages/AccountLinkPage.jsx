import React, { useEffect, useRef, useState } from 'react';
import { CheckCircle, KeyRound, Loader, Lock, MailCheck } from 'lucide-react';
import { apiFetch } from '../apiClient';
import { FIELD_CLASSNAME } from '../components/ProfileBits';

/**
 * The token sits in the URL fragment (#token=...), which browsers never send
 * to a server, so neither Vercel's logs nor Google Analytics record it. It is
 * read once and wiped from the address bar.
 */
export function takeTokenFromLocation(location = window.location, history = window.history) {
  const token = new URLSearchParams(String(location.hash || '').replace(/^#/, '')).get('token') || '';
  if (token) history.replaceState(history.state, '', location.pathname + location.search);
  return token;
}

function Panel({ icon: Icon, title, children }) {
  return (
    <section className="mx-auto max-w-lg rounded-panel border border-line bg-surface-raised p-5 sm:p-8">
      <div className="inline-flex h-12 w-12 items-center justify-center rounded-card border border-sky-400/20 bg-sky-400/10 text-sky-200">
        <Icon size={22} aria-hidden="true" />
      </div>
      <h1 className="mt-4 text-2xl font-bold tracking-tight text-white">{title}</h1>
      <div className="mt-3 space-y-4 text-sm leading-6 text-ink-muted">{children}</div>
    </section>
  );
}

const PRIMARY_BUTTON = 'inline-flex w-full items-center justify-center gap-2 rounded-control bg-sky-500 px-6 py-3 font-semibold text-white transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-70';

function VerifyEmail({ token, onUserUpdate, navTo }) {
  const [state, setState] = useState(token ? 'working' : 'error');
  const [message, setMessage] = useState(token ? '' : "This link is missing its code. Open it straight from the email, or ask for a new one from your profile.");
  const started = useRef(false);

  useEffect(() => {
    if (!token || started.current) return;
    started.current = true;
    apiFetch('/api/auth/verify-email', { method: 'POST', body: { token } })
      .then((data) => {
        if (data.user) onUserUpdate?.(data.user);
        setState('done');
      })
      .catch((error) => {
        setMessage(error.message || 'Could not confirm your email.');
        setState('error');
      });
  }, [onUserUpdate, token]);

  if (state === 'working') {
    return (
      <Panel icon={Loader} title="Confirming your email...">
        <p>One moment.</p>
      </Panel>
    );
  }
  if (state === 'done') {
    return (
      <Panel icon={MailCheck} title="Email confirmed">
        <p>Thanks. You can now reset your password by email if you ever forget it, and post in the community.</p>
        <button type="button" onClick={() => navTo('profile')} className={PRIMARY_BUTTON}>Go to my profile</button>
      </Panel>
    );
  }
  return (
    <Panel icon={MailCheck} title="That link didn't work">
      <p role="alert">{message}</p>
      <button type="button" onClick={() => navTo('profile')} className={PRIMARY_BUTTON}>Go to my profile</button>
    </Panel>
  );
}

function ResetPassword({ token, onUserUpdate, navTo, notify }) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState(token ? '' : "This link is missing its code. Open it straight from the email, or ask for a new one.");
  const [submitting, setSubmitting] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    if (password.length < 8) {
      setError('Your new password must be at least 8 characters.');
      return;
    }
    if (password !== confirm) {
      setError("The two passwords don't match.");
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const data = await apiFetch('/api/auth/password/reset', { method: 'POST', body: { token, newPassword: password } });
      onUserUpdate?.(data.user);
      notify?.('Password changed. You are logged in.', 'success');
      navTo('profile');
    } catch (requestError) {
      setError(requestError.message || 'Could not reset your password.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Panel icon={KeyRound} title="Choose a new password">
      {error && (
        <div className="rounded-card border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-rose-100" role="alert">
          {error}
          {!token || /expired|used|valid/i.test(error) ? (
            <button type="button" onClick={() => navTo('auth')} className="mt-2 block font-semibold text-sky-200 hover:text-sky-100">
              Ask for a new link
            </button>
          ) : null}
        </div>
      )}
      {token && (
        <form onSubmit={submit} className="space-y-4">
          <label className="block">
            <span className="mb-2 block font-semibold text-ink-muted">New password</span>
            <div className="relative">
              <Lock size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-subtle" />
              <input type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} minLength={8} required className={`${FIELD_CLASSNAME} pl-11`} />
            </div>
          </label>
          <label className="block">
            <span className="mb-2 block font-semibold text-ink-muted">Type it again</span>
            <input type="password" autoComplete="new-password" value={confirm} onChange={(event) => setConfirm(event.target.value)} minLength={8} required className={FIELD_CLASSNAME} />
          </label>
          <button type="submit" disabled={submitting} className={PRIMARY_BUTTON}>
            <CheckCircle size={17} />
            {submitting ? 'Saving...' : 'Save new password'}
          </button>
        </form>
      )}
    </Panel>
  );
}

export default function AccountLinkPage({ kind, onUserUpdate, navTo, notify }) {
  // Read once: the address bar is cleaned straight after.
  const [token] = useState(() => takeTokenFromLocation());

  return kind === 'reset-password'
    ? <ResetPassword token={token} onUserUpdate={onUserUpdate} navTo={navTo} notify={notify} />
    : <VerifyEmail token={token} onUserUpdate={onUserUpdate} navTo={navTo} />;
}
