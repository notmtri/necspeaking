import React, { useEffect, useState } from 'react';
import { Lock, LogIn, Mail, UserPlus, UserRound } from 'lucide-react';
import { FIELD_CLASSNAME, LabeledInput } from '../components/ProfileBits';

const emptyForm = (currentUser) => ({
  name: currentUser?.name || '',
  username: currentUser?.username || '',
  className: currentUser?.className || '',
  school: currentUser?.school || '',
  cohort: currentUser?.cohort || '',
  role: currentUser?.role || 'Student',
  bio: currentUser?.bio || '',
});

export default function AuthPage({ authMode, setAuthMode, onSubmit, onContinueAsGuest, currentUser, authError, authSubmitting, authChecking }) {
  const [email, setEmail] = useState(currentUser?.email || '');
  const [password, setPassword] = useState('');
  const [form, setForm] = useState(() => emptyForm(currentUser));
  const isSignup = authMode === 'signup';

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
          <div className="inline-flex max-w-full items-center gap-2 rounded-full border border-sky-400/30 bg-sky-400/10 px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-sky-200 sm:px-4">
            {isSignup ? <UserPlus size={14} /> : <LogIn size={14} />}
            Account access
          </div>
          <h1 className="mt-5 text-2xl font-bold tracking-tight text-white sm:text-3xl">
            {isSignup ? 'Create your necs. profile' : 'Welcome back to necs.'}
          </h1>
          <p className="mt-4 text-sm leading-6 text-ink-muted">
            {isSignup
              ? 'Create one account, keep one profile, and edit the details later from your settings page.'
              : 'Log in to restore your saved profile and continue with the same account details.'}
          </p>
          <div className="mt-6 space-y-3">
            <div className="rounded-card border border-line bg-overlay p-4 text-sm text-ink-muted">
              <div className="font-semibold text-white">Consistent account data</div>
              <div className="mt-2">Your email, username, role, and profile details stay tied to one account.</div>
            </div>
            <div className="rounded-card border border-line bg-overlay p-4 text-sm text-ink-muted">
              <div className="font-semibold text-white">Saved practice history</div>
              <div className="mt-2">Signed-in sessions are stored, so scores and streaks build up over time.</div>
            </div>
            <div className="rounded-card border border-line bg-overlay p-4 text-sm text-ink-muted">
              <div className="font-semibold text-white">Or practise as a guest</div>
              <div className="mt-2">You can analyse a recording without an account. Guest sessions are not saved.</div>
            </div>
          </div>
        </div>

        <div className="min-w-0 p-5 sm:p-8">
          {authChecking && !currentUser && (
            <div className="mb-4 rounded-card border border-line bg-overlay px-4 py-3 text-sm text-slate-200" role="status">
              Checking account session...
            </div>
          )}
          {authError && (
            <div className="mb-4 rounded-card border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-100" role="alert">
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
                  <label className="block">
                    <span className="mb-2 block text-sm font-semibold text-ink-muted">Role</span>
                    <select value={form.role} onChange={(event) => updateField('role', event.target.value)} className={FIELD_CLASSNAME}>
                      <option>Student</option>
                      <option>Teacher</option>
                    </select>
                  </label>
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
              className="inline-flex w-full items-center justify-center gap-2 rounded-control bg-sky-500 px-6 py-3 font-semibold text-white transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSignup ? <UserPlus size={17} /> : <LogIn size={17} />}
              {authSubmitting ? 'Please wait...' : isSignup ? 'Create account' : 'Log in'}
            </button>
          </form>

          <div className="mt-5 text-center text-sm text-ink-muted">
            {isSignup ? 'Already have an account?' : "Don't have an account yet?"}{' '}
            <button
              type="button"
              onClick={() => setAuthMode(isSignup ? 'login' : 'signup')}
              className="font-semibold text-sky-300 transition hover:text-sky-200"
            >
              {isSignup ? 'Log in instead' : 'Create one'}
            </button>
          </div>

          {onContinueAsGuest && (
            <div className="mt-5 border-t border-line pt-5">
              <button
                type="button"
                onClick={onContinueAsGuest}
                className="inline-flex w-full items-center justify-center gap-2 rounded-control border border-line bg-overlay px-6 py-3 font-semibold text-slate-200 transition hover:bg-overlay-hover"
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
