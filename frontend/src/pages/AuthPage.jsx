import React, { useEffect, useState } from 'react';
import { apiFetch } from '../apiClient';
import { CODE_INPUT_CLASSNAME, cleanCode } from '../components/VerifyEmailNotice';
import { Check, Lock, LogIn, Mail, UserPlus, UserRound } from 'lucide-react';
import { FIELD_CLASSNAME, LabeledInput } from '../components/ProfileBits';

const emptyForm = (currentUser) => ({
  name: currentUser?.name || '',
  username: currentUser?.username || '',
  className: currentUser?.className || '',
  school: currentUser?.school || '',
  cohort: currentUser?.cohort || '',
  bio: currentUser?.bio || '',
});

/**
 * Two steps on one card: email a 6-digit code, then type it with the new
 * password. Codes replaced emailed links, whose token got lost on the way.
 */
function ForgotPasswordPanel({ email, onPasswordReset }) {
  const [codeSent, setCodeSent] = useState(false);
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState(null);

  const sendCode = async () => {
    setBusy(true);
    setStatus(null);
    try {
      await apiFetch('/api/auth/password/forgot', { method: 'POST', body: { email } });
      setCodeSent(true);
      setStatus({ tone: 'ok', text: `If ${email.trim()} has a necs. account, a 6-digit code is on its way. It works for 15 minutes; check spam too.` });
    } catch (error) {
      setStatus({ tone: 'error', text: error.message || 'Could not send the code.' });
    } finally {
      setBusy(false);
    }
  };

  const reset = async (event) => {
    event.preventDefault();
    if (newPassword.length < 8) {
      setStatus({ tone: 'error', text: 'Your new password must be at least 8 characters.' });
      return;
    }
    setBusy(true);
    setStatus(null);
    try {
      const data = await apiFetch('/api/auth/password/reset', { method: 'POST', body: { email, code, newPassword } });
      onPasswordReset?.(data.user);
    } catch (error) {
      setStatus({ tone: 'error', text: error.message || 'Could not reset your password.' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-card border border-line bg-overlay p-4">
      <div className="font-semibold text-ink">Reset your password</div>
      {!codeSent ? (
        <>
          <p className="mt-1 text-ink-muted">Enter your account email above, and we&apos;ll email you a 6-digit code.</p>
          <button
            type="button"
            onClick={sendCode}
            disabled={busy || !email.trim()}
            className="mt-3 inline-flex items-center justify-center rounded-full bg-ink px-4 py-2 font-medium text-white transition hover:bg-ink/85 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy ? 'Sending...' : 'Email me a code'}
          </button>
        </>
      ) : (
        <form onSubmit={reset} className="mt-3 space-y-3">
          <label className="block">
            <span className="mb-2 block font-semibold text-ink-muted">6-digit code</span>
            <input
              value={code}
              onChange={(event) => setCode(cleanCode(event.target.value))}
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="000000"
              className={CODE_INPUT_CLASSNAME}
            />
          </label>
          <label className="block">
            <span className="mb-2 block font-semibold text-ink-muted">New password</span>
            <input
              type="password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              autoComplete="new-password"
              placeholder="At least 8 characters"
              className={FIELD_CLASSNAME}
            />
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={busy || code.length !== 6}
              className="inline-flex items-center justify-center rounded-full bg-ink px-4 py-2 font-medium text-white transition hover:bg-ink/85 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {busy ? 'Saving...' : 'Set new password'}
            </button>
            <button
              type="button"
              onClick={sendCode}
              disabled={busy}
              className="rounded-full border border-line px-4 py-2 font-medium text-ink transition hover:bg-overlay disabled:cursor-not-allowed disabled:opacity-60"
            >
              Send a new code
            </button>
          </div>
        </form>
      )}
      {status && (
        <p className={`mt-3 ${status.tone === 'error' ? 'text-rose-700' : 'text-emerald-700'}`} role="status">{status.text}</p>
      )}
    </div>
  );
}

export default function AuthPage({ authMode, setAuthMode, onSubmit, onContinueAsGuest, currentUser, authError, authSubmitting, authChecking, onPasswordReset }) {
  const [email, setEmail] = useState(currentUser?.email || '');
  const [password, setPassword] = useState('');
  const [form, setForm] = useState(() => emptyForm(currentUser));
  const isSignup = authMode === 'signup';
  const [forgotOpen, setForgotOpen] = useState(false);

  useEffect(() => {
    setEmail(currentUser?.email || '');
    setForm(emptyForm(currentUser));
  }, [currentUser, authMode]);

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const success = await onSubmit({ mode: authMode, email, password, profile: form });
    if (success) setPassword('');
  };

  return (
    <section className="mx-auto min-w-0 max-w-5xl overflow-hidden rounded-panel border border-line bg-surface-raised">
      <div className="grid min-w-0 gap-0 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
        <div className="border-b border-line bg-surface-sunken p-5 sm:p-8 lg:border-b-0 lg:border-r">
          <h1 className="text-[1.75rem] font-semibold leading-tight text-ink sm:text-[2rem]">
            {isSignup ? 'Create your necs. profile' : 'Welcome back to necs.'}
          </h1>
          <p className="mt-3 text-sm leading-6 text-ink-muted">
            {isSignup
              ? 'Create one account, keep one profile, and edit the details later from your settings page.'
              : 'Log in to restore your saved profile and continue with the same account details.'}
          </p>
          <ul className="mt-8 space-y-4 text-sm leading-6">
            {[
              ['Every attempt is kept', 'Scores, written feedback and the report stay on your profile.'],
              ['Progress you can see', 'Your average, best score and streak build up as you practise.'],
            ].map(([title, body]) => (
              <li key={title} className="flex gap-3">
                <Check size={18} className="mt-0.5 shrink-0 text-sky-600" />
                <span>
                  <span className="block font-medium text-ink">{title}</span>
                  <span className="text-ink-muted">{body}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="min-w-0 p-5 sm:p-8">
          {authChecking && !currentUser && (
            <div className="mb-4 rounded-card border border-line bg-overlay px-4 py-3 text-sm text-ink" role="status">
              Checking account session...
            </div>
          )}
          {authError && (
            <div className="mb-4 rounded-card border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700" role="alert">
              {authError}
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-ink-muted">Email</span>
                <div className="relative">
                  <Mail size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-subtle" />
                  <input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="you@example.com"
                    autoComplete="email"
                    className={`${FIELD_CLASSNAME} pl-11`}
                    required
                  />
                </div>
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-ink-muted">Password</span>
                <div className="relative">
                  <Lock size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-subtle" />
                  <input
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="At least 8 characters"
                    autoComplete={isSignup ? 'new-password' : 'current-password'}
                    minLength={8}
                    className={`${FIELD_CLASSNAME} pl-11`}
                    required
                  />
                </div>
              </label>
            </div>

            {isSignup && (
              <>
                <div className="grid gap-4 md:grid-cols-2">
                  <LabeledInput label="Full name" value={form.name} onChange={(value) => updateField('name', value)} />
                  <LabeledInput label="Username" value={form.username} onChange={(value) => updateField('username', value)} />
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <LabeledInput label="Class" value={form.className} onChange={(value) => updateField('className', value)} placeholder="12A1" />
                  <LabeledInput label="School" value={form.school} onChange={(value) => updateField('school', value)} placeholder="Name - Area" />
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <LabeledInput label="Cohort" value={form.cohort} onChange={(value) => updateField('cohort', value)} placeholder="26-27" />
                </div>
                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-ink-muted">Bio</span>
                  <textarea
                    value={form.bio}
                    onChange={(event) => updateField('bio', event.target.value)}
                    rows="3"
                    placeholder="Tell people about you."
                    className={FIELD_CLASSNAME}
                  />
                </label>
              </>
            )}

            <button
              type="submit"
              disabled={authSubmitting}
              className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-ink px-6 py-3 font-medium text-white transition hover:bg-ink/85 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSignup ? <UserPlus size={17} /> : <LogIn size={17} />}
              {authSubmitting ? 'Please wait...' : isSignup ? 'Create account' : 'Log in'}
            </button>
          </form>

          {!isSignup && (
            <div className="mt-4 text-sm">
              {!forgotOpen ? (
                <button type="button" onClick={() => setForgotOpen(true)} className="font-semibold text-sky-600 transition hover:text-sky-700">
                  Forgot password?
                </button>
              ) : (
                <ForgotPasswordPanel email={email} onPasswordReset={onPasswordReset} />
              )}
            </div>
          )}

          <div className="mt-5 text-center text-sm text-ink-muted">
            {isSignup ? 'Already have an account?' : "Don't have an account yet?"}{' '}
            <button
              type="button"
              onClick={() => setAuthMode(isSignup ? 'login' : 'signup')}
              className="font-semibold text-sky-600 transition hover:text-sky-700"
            >
              {isSignup ? 'Log in instead' : 'Create one'}
            </button>
          </div>

          {onContinueAsGuest && (
            <div className="mt-5 border-t border-line pt-5">
              <button
                type="button"
                onClick={onContinueAsGuest}
                className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-line bg-surface-raised px-6 py-3 font-medium text-ink transition hover:bg-overlay"
              >
                <UserRound size={17} />
                Continue as guest
              </button>
              <p className="mt-2 text-center text-xs leading-5 text-ink-subtle">
                Practise straight away. Guest sessions are not saved to a profile.
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
