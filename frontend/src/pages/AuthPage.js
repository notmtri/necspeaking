import React, { useEffect, useState } from 'react';
import { Lock, LogIn, Mail, UserPlus } from 'lucide-react';

function LabeledInput({ label, value, onChange, placeholder }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-slate-200">{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full rounded-2xl border border-white/10 bg-[#07111f] px-4 py-3 text-white placeholder:text-slate-500"
      />
    </label>
  );
}

export default function AuthPage({ authMode, setAuthMode, onSubmit, currentUser, authError, authSubmitting, authChecking }) {
  const [email, setEmail] = useState(currentUser?.email || '');
  const [password, setPassword] = useState('');
  const [form, setForm] = useState({
    name: currentUser?.name || '',
    username: currentUser?.username || '',
    className: currentUser?.className || '',
    school: currentUser?.school || '',
    cohort: currentUser?.cohort || '',
    role: currentUser?.role || 'Student',
    bio: currentUser?.bio || '',
  });
  const isSignup = authMode === 'signup';

  useEffect(() => {
    setEmail(currentUser?.email || '');
    setForm({
      name: currentUser?.name || '',
      username: currentUser?.username || '',
      className: currentUser?.className || '',
      school: currentUser?.school || '',
      cohort: currentUser?.cohort || '',
      role: currentUser?.role || 'Student',
      bio: currentUser?.bio || '',
    });
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
    <section className="mx-auto max-w-5xl rounded-[36px] border border-white/10 bg-slate-950/70 shadow-[0_24px_120px_rgba(2,6,23,0.45)]">
      <div className="grid gap-0 lg:grid-cols-[0.92fr_1.08fr]">
        <div className="rounded-t-[36px] border-b border-white/10 bg-[radial-gradient(circle_at_top_left,_rgba(14,165,233,0.25),_transparent_30%),linear-gradient(180deg,_rgba(8,17,32,0.98),_rgba(5,10,18,0.95))] p-8 lg:rounded-l-[36px] lg:rounded-tr-none lg:border-b-0 lg:border-r">
          <div className="inline-flex items-center gap-2 rounded-full border border-sky-400/30 bg-sky-400/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-sky-200">
            {isSignup ? <UserPlus size={14} /> : <LogIn size={14} />}
            Account access
          </div>
          <h2 className="mt-5 text-4xl font-black text-white">{isSignup ? 'Create your NECS profile' : 'Welcome back to necs.'}</h2>
          <p className="mt-4 text-sm leading-7 text-slate-300">
            {isSignup
              ? 'Create one account, keep one profile, and edit the details later from your settings page.'
              : 'Log in to restore your saved profile and continue with the same account details.'}
          </p>
          <div className="mt-6 space-y-3">
            <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-4 text-sm text-slate-300">
              <div className="font-semibold text-white">Consistent account data</div>
              <div className="mt-2">Your email, username, role, and profile details stay tied to one account.</div>
            </div>
            <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-4 text-sm text-slate-300">
              <div className="font-semibold text-white">Guest mode still works</div>
              <div className="mt-2">You can still explore the app first, but guest use does not create a saved account.</div>
            </div>
          </div>
        </div>

        <div className="p-8">
          {authChecking && !currentUser && (
            <div className="mb-4 rounded-2xl border border-slate-300/15 bg-slate-900/75 px-4 py-3 text-sm text-slate-200">
              Checking account session...
            </div>
          )}
          {authError && (
            <div className="mb-4 rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
              {authError}
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-200">Email</span>
                <div className="relative">
                  <Mail size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="you@example.com"
                    className="w-full rounded-2xl border border-white/10 bg-[#07111f] py-3 pl-11 pr-4 text-white placeholder:text-slate-500"
                    required
                  />
                </div>
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-200">Password</span>
                <div className="relative">
                  <Lock size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="At least 8 characters"
                    className="w-full rounded-2xl border border-white/10 bg-[#07111f] py-3 pl-11 pr-4 text-white placeholder:text-slate-500"
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
                  <LabeledInput label="Class" value={form.className} onChange={(value) => updateField('className', value)} />
                  <LabeledInput label="School" value={form.school} onChange={(value) => updateField('school', value)} placeholder="Name - Area" />
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <LabeledInput label="Cohort" value={form.cohort} onChange={(value) => updateField('cohort', value)} placeholder="26-27" />
                  <label className="block">
                    <span className="mb-2 block text-sm font-semibold text-slate-200">Role</span>
                    <select value={form.role} onChange={(event) => updateField('role', event.target.value)} className="w-full rounded-2xl border border-white/10 bg-[#07111f] px-4 py-3 text-white">
                      <option>Student</option>
                      <option>Teacher</option>
                    </select>
                  </label>
                </div>
                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-slate-200">Bio</span>
                  <textarea
                    value={form.bio}
                    onChange={(event) => updateField('bio', event.target.value)}
                    rows="3"
                    placeholder="Tell people about you."
                    className="w-full rounded-2xl border border-white/10 bg-[#07111f] px-4 py-3 text-white placeholder:text-slate-500"
                  />
                </label>
              </>
            )}

            <button type="submit" disabled={authSubmitting} className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-sky-500 px-6 py-3 font-semibold text-white transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-70">
              {isSignup ? <UserPlus size={17} /> : <LogIn size={17} />}
              {authSubmitting ? 'Please wait...' : isSignup ? 'Create account' : 'Log in'}
            </button>
          </form>

          <div className="mt-5 text-center text-sm text-slate-400">
            {isSignup ? "Already have an account?" : "Don't have an account yet?"}{' '}
            <button type="button" onClick={() => setAuthMode(isSignup ? 'login' : 'signup')} className="font-semibold text-sky-300 transition hover:text-sky-200">
              {isSignup ? 'Log in instead' : 'Create one'}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
