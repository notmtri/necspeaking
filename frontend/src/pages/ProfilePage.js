import React, { useEffect, useMemo, useState } from 'react';
import { Award, BarChart3, CheckCircle, Flame, Lock, LogOut, Target, Trash2, TrendingUp, Trophy, Upload, User } from 'lucide-react';
import { createDefaultProfile, getDisplayRole, isAdminProfile } from '../appShared';
import { LabeledInput, ProfileDetailRow, ProfileMetricCard, ProfileSectionCard } from '../components/ProfileBits';

const CRITERIA = [
  { key: 'content', label: 'Content', max: 0.9, tone: 'sky' },
  { key: 'accuracy', label: 'Accuracy', max: 0.6, tone: 'emerald' },
  { key: 'delivery', label: 'Delivery', max: 0.5, tone: 'amber' },
];

function getPracticeAnalytics(history = [], stats = {}) {
  const sessions = [...history].sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0));
  const totals = sessions.reduce((sum, session) => ({
    total: sum.total + Number(session.scores?.total || 0),
    content: sum.content + Number(session.scores?.content || 0),
    accuracy: sum.accuracy + Number(session.scores?.accuracy || 0),
    delivery: sum.delivery + Number(session.scores?.delivery || 0),
  }), { total: 0, content: 0, accuracy: 0, delivery: 0 });
  const count = sessions.length || 1;
  const averages = {
    total: sessions.length ? totals.total / count : Number(stats.avgScore || 0),
    content: totals.content / count,
    accuracy: totals.accuracy / count,
    delivery: totals.delivery / count,
  };
  const bestSession = sessions.reduce((best, session) => (
    Number(session.scores?.total || 0) > Number(best?.scores?.total || 0) ? session : best
  ), null);
  const weakest = CRITERIA
    .map((criterion) => ({
      ...criterion,
      value: averages[criterion.key] || 0,
      ratio: criterion.max ? (averages[criterion.key] || 0) / criterion.max : 0,
    }))
    .sort((a, b) => a.ratio - b.ratio)[0];

  return {
    sessions,
    averages,
    bestSession,
    weakest,
    trend: sessions.slice(-6),
  };
}

function PracticeTrend({ sessions }) {
  if (!sessions.length) {
    return (
      <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.03] p-4 text-sm text-slate-400">
        Complete more logged-in practice sessions to unlock score trends.
      </div>
    );
  }

  return (
    <div className="grid min-h-[180px] grid-cols-6 items-end gap-2 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
      {sessions.map((session, index) => {
        const score = Number(session.scores?.total || 0);
        const height = Math.max(10, Math.round((score / 2) * 100));
        return (
          <div key={session.id || index} className="flex min-w-0 flex-col items-center gap-2">
            <div className="flex h-28 w-full items-end">
              <div className="w-full rounded-t-xl bg-sky-400/80 shadow-[0_0_24px_rgba(56,189,248,0.18)]" style={{ height: `${height}%` }} />
            </div>
            <div className="text-xs font-semibold text-white">{score.toFixed(2)}</div>
            <div className="max-w-full truncate text-[10px] text-slate-500">
              {session.createdAt ? new Date(session.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : `#${index + 1}`}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function CriteriaBars({ averages }) {
  return (
    <div className="space-y-3">
      {CRITERIA.map((criterion) => {
        const value = Number(averages[criterion.key] || 0);
        const percent = Math.min(100, Math.round((value / criterion.max) * 100));
        return (
          <div key={criterion.key} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm font-semibold text-white">{criterion.label}</div>
              <div className="text-sm font-semibold text-slate-300">{value.toFixed(2)} / {criterion.max.toFixed(1)}</div>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/[0.08]">
              <div className="h-full rounded-full bg-emerald-400" style={{ width: `${percent}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function AchievementBadges({ stats, analytics }) {
  const practiceCount = Number(stats.practices || analytics.sessions.length || 0);
  const avgScore = Number(stats.avgScore || analytics.averages.total || 0);
  const bestScore = Number(stats.bestScore || analytics.bestSession?.scores?.total || 0);
  const streak = Number(stats.streak || 0);
  const badges = [
    { label: 'First Step', icon: CheckCircle, unlocked: practiceCount >= 1, note: 'Complete one practice.' },
    { label: 'Ten Attempts', icon: Target, unlocked: practiceCount >= 10, note: 'Reach 10 practices.' },
    { label: 'Hot Streak', icon: Flame, unlocked: streak >= 3, note: 'Hold a 3-day streak.' },
    { label: 'Rising Speaker', icon: TrendingUp, unlocked: avgScore >= 1.5, note: 'Average at least 1.50.' },
    { label: 'Peak Score', icon: Trophy, unlocked: bestScore >= 1.9, note: 'Score 1.90 or higher.' },
    { label: 'Balanced Skill', icon: Award, unlocked: CRITERIA.every((criterion) => (analytics.averages[criterion.key] || 0) / criterion.max >= 0.75), note: 'Reach 75% in all criteria.' },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {badges.map((badge) => {
        const Icon = badge.icon;
        return (
          <div key={badge.label} className={`rounded-2xl border p-4 ${badge.unlocked ? 'border-amber-300/25 bg-amber-300/10 text-amber-100' : 'border-white/10 bg-white/[0.03] text-slate-500'}`}>
            <div className="flex items-center gap-3">
              <div className={`inline-flex h-10 w-10 items-center justify-center rounded-2xl ${badge.unlocked ? 'bg-amber-300/15' : 'bg-white/[0.04]'}`}>
                <Icon size={18} />
              </div>
              <div className="min-w-0">
                <div className="font-semibold">{badge.label}</div>
                <div className="mt-1 text-xs">{badge.unlocked ? 'Unlocked' : badge.note}</div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ProfileTabButton({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
        active
          ? 'border-sky-400/20 bg-sky-400/10 text-sky-200'
          : 'border-white/10 bg-white/[0.04] text-slate-300 hover:bg-white/[0.08]'
      }`}
    >
      {children}
    </button>
  );
}

export default function ProfilePage({ currentUser, practiceHistory, onSave, onLogout, onDeleteAccount, onPasswordUpdate, authError, passwordSubmitting }) {
  const [draft, setDraft] = useState(currentUser || createDefaultProfile());
  const [activeTab, setActiveTab] = useState('overview');
  const [deletePhrase, setDeletePhrase] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [passwordMessage, setPasswordMessage] = useState('');

  useEffect(() => {
    setDraft(currentUser || createDefaultProfile());
    setActiveTab('overview');
    setDeletePhrase('');
    setDeleteError('');
    setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    setPasswordMessage('');
  }, [currentUser]);

  const analytics = useMemo(() => getPracticeAnalytics(practiceHistory || [], draft.stats || {}), [practiceHistory, draft.stats]);

  if (!currentUser) {
    return (
      <section className="rounded-[26px] border border-white/10 bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.18),_transparent_35%),linear-gradient(135deg,_rgba(7,17,31,0.98),_rgba(8,20,38,0.96))] p-5 text-center shadow-[0_24px_120px_rgba(2,6,23,0.45)] sm:rounded-[32px] sm:p-8">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-sky-300">
          <User size={28} />
        </div>
        <h2 className="mt-5 text-3xl font-black text-white">Log in to view your profile</h2>
        <p className="mt-3 text-sm leading-7 text-slate-300">This page shows the account currently stored in the backend session.</p>
      </section>
    );
  }

  const updateField = (field, value) => {
    setDraft((current) => ({ ...current, [field]: value }));
  };

  const updatePhoto = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setDraft((current) => ({ ...current, avatar: String(reader.result || current.avatar) }));
    };
    reader.readAsDataURL(file);
  };

  const displayRole = getDisplayRole(draft);
  const adminProfile = isAdminProfile(draft);

  const handleDelete = () => {
    if (deletePhrase.trim() !== 'I want to delete my NECSpeaking account!') {
      setDeleteError('Type the exact confirmation phrase to delete this account.');
      return;
    }
    onDeleteAccount?.();
  };

  const handlePasswordSubmit = async () => {
    setPasswordMessage('');
    if (!passwordForm.currentPassword || !passwordForm.newPassword) {
      setPasswordMessage('Enter your current password and a new password.');
      return;
    }
    if (passwordForm.newPassword.length < 8) {
      setPasswordMessage('New password must be at least 8 characters.');
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordMessage('New password confirmation does not match.');
      return;
    }

    const success = await onPasswordUpdate?.(passwordForm);
    if (success) {
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setPasswordMessage('Password updated.');
    }
  };

  return (
    <div className="w-full min-w-0 space-y-6 text-slate-100">
      <section className="rounded-[26px] border border-white/10 bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.22),_transparent_38%),linear-gradient(135deg,_rgba(7,17,31,0.98),_rgba(8,20,38,0.96))] p-4 shadow-[0_24px_120px_rgba(2,6,23,0.45)] sm:rounded-[40px] sm:p-6">
        <div className="flex flex-col gap-4 border-b border-white/10 pb-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0 max-w-3xl">
            <h2 className="mt-4 text-3xl font-black tracking-tight text-white sm:text-5xl">Your account, your settings, your stats.</h2>
            <p className="mt-3 text-sm leading-7 text-slate-300 sm:text-base">
              Everything you need is here: identity, at-a-glance info, saved practice history, and personal settings.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <ProfileTabButton active={activeTab === 'overview'} onClick={() => setActiveTab('overview')}>Overview</ProfileTabButton>
            <ProfileTabButton active={activeTab === 'settings'} onClick={() => setActiveTab('settings')}>Settings</ProfileTabButton>
          </div>
        </div>

        <div className="pt-5">
          <main className="space-y-6">
            {authError && (
              <div className="rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
                {authError}
              </div>
            )}
            {activeTab === 'overview' ? (
              <div className="grid gap-3 xl:gap-2 xl:grid-cols-[minmax(0,0.5fr)_minmax(0,1.5fr)] xl:items-stretch">
                <ProfileSectionCard title="User card" eyebrow="Identity" className="xl:row-span-2 xl:h-full xl:max-w-[30rem] xl:justify-self-start">
                  <div className="flex h-full flex-col items-center justify-center text-center">
                    <div className="relative">
                      <div className="absolute inset-0 -z-10 rounded-full bg-sky-400/20 blur-2xl" />
                      <img src={draft.avatar} alt={`${draft.name} avatar`} className="h-52 w-52 rounded-[28px] border border-white/10 object-cover p-1 shadow-[0_18px_40px_rgba(2,6,23,0.35)] sm:h-[20rem] sm:w-[20rem] sm:rounded-[34px]" />
                    </div>
                    <h3 className="mt-5 text-2xl font-bold text-white">{draft.name}</h3>
                    <div className="mt-1 text-lg font-semibold text-sky-300">@{draft.username}</div>
                    <div className="mt-3 inline-flex items-center rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-300">
                      {displayRole}
                    </div>
                    {adminProfile && (
                      <div className="mt-3 inline-flex items-center rounded-full border border-amber-300/30 bg-amber-300/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-amber-100">
                        necs. admin
                      </div>
                    )}
                    <p className="mt-4 max-w-[24ch] text-sm leading-6 text-slate-300">{draft.bio}</p>
                  </div>
                </ProfileSectionCard>

                <ProfileSectionCard title="At a glance" eyebrow="Quick profile">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <ProfileDetailRow label="Name" value={draft.name} />
                    <ProfileDetailRow label="Username" value={`@${draft.username}`} />
                    <ProfileDetailRow label="Role" value={displayRole} />
                    <ProfileDetailRow label="Streak" value={`${draft.stats.streak} days`} />
                    <ProfileDetailRow label="Class" value={draft.className || 'Not set'} />
                    <ProfileDetailRow label="School" value={draft.school || 'Not set'} />
                    <ProfileDetailRow label="Cohort" value={draft.cohort || 'Not set'} />
                    <ProfileDetailRow label="Email" value={draft.email || 'Not set'} />
                  </div>
                </ProfileSectionCard>

                <ProfileSectionCard title="Stats" eyebrow="Performance">
                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    <ProfileMetricCard label="Practices" value={draft.stats.practices} tone="sky" />
                    <ProfileMetricCard label="Average score" value={draft.stats.avgScore} tone="emerald" />
                    <ProfileMetricCard label="Best score" value={draft.stats.bestScore} tone="amber" />
                  </div>
                </ProfileSectionCard>

                <ProfileSectionCard title="Practice dashboard" eyebrow="Analytics" className="xl:col-span-2">
                  <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(260px,0.8fr)]">
                    <div className="min-w-0">
                      <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-white">
                        <BarChart3 size={17} />
                        Recent score trend
                      </div>
                      <PracticeTrend sessions={analytics.trend} />
                    </div>
                    <div className="min-w-0">
                      <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-white">
                        <Target size={17} />
                        Criterion averages
                      </div>
                      <CriteriaBars averages={analytics.averages} />
                    </div>
                  </div>
                  <div className="mt-4 rounded-2xl border border-sky-400/20 bg-sky-400/10 p-4 text-sm leading-7 text-sky-100">
                    Current focus: <span className="font-semibold">{analytics.weakest?.label || 'Content'}</span>. This is the lowest average criterion across saved sessions.
                  </div>
                </ProfileSectionCard>

                <ProfileSectionCard title="Achievements" eyebrow="Badges" className="xl:col-span-2">
                  <AchievementBadges stats={draft.stats || {}} analytics={analytics} />
                </ProfileSectionCard>

                <ProfileSectionCard title="Recent practice" eyebrow="Saved activity" className="xl:col-span-2">
                  <div className="space-y-3">
                    {practiceHistory?.length ? practiceHistory.map((session) => (
                      <div key={session.id} className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div className="min-w-0">
                            <div className="truncate text-sm font-semibold text-white">{session.topic}</div>
                            <div className="mt-1 text-xs text-slate-400">{new Date(session.createdAt).toLocaleString()}</div>
                          </div>
                          <div className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-sm font-semibold text-emerald-100">
                            {session.scores?.total ?? 0}/2.0
                          </div>
                        </div>
                        <div className="mt-3 grid gap-3 sm:grid-cols-4">
                          <ProfileDetailRow label="Content" value={session.scores?.content ?? 0} />
                          <ProfileDetailRow label="Accuracy" value={session.scores?.accuracy ?? 0} />
                          <ProfileDetailRow label="Delivery" value={session.scores?.delivery ?? 0} />
                          <ProfileDetailRow label="Duration" value={`${Math.round(session.duration || 0)}s`} />
                        </div>
                      </div>
                    )) : (
                      <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.03] px-4 py-5 text-sm text-slate-400">
                        Complete a speech analysis while logged in to start building your history.
                      </div>
                    )}
                  </div>
                </ProfileSectionCard>
              </div>
            ) : (
              <>
                <ProfileSectionCard title="Settings" eyebrow="Personal info">
                  <div className="mb-5 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                    <div className="text-sm font-semibold text-white">Profile photo</div>
                    <div className="mt-1 text-sm text-slate-400">Upload a new avatar for your user card.</div>
                    <label className="mt-4 inline-flex cursor-pointer items-center gap-2 rounded-full border border-white/10 bg-sky-400/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-sky-200 transition hover:bg-sky-400/15">
                      <Upload size={14} />
                      Upload photo
                      <input type="file" accept="image/*" onChange={(event) => updatePhoto(event.target.files?.[0])} className="hidden" />
                    </label>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <LabeledInput label="Name" value={draft.name} onChange={(value) => updateField('name', value)} placeholder="Your full name" variant="classic" />
                    <LabeledInput label="Username" value={draft.username} onChange={(value) => updateField('username', value.toLowerCase())} placeholder="unique username" variant="classic" />
                    <LabeledInput label="Class" value={draft.className} onChange={(value) => updateField('className', value)} placeholder="12A1" variant="classic" />
                    <LabeledInput label="School" value={draft.school} onChange={(value) => updateField('school', value)} placeholder="Your school" variant="classic" />
                    <LabeledInput label="Cohort" value={draft.cohort} onChange={(value) => updateField('cohort', value)} placeholder="NEC 25-26" variant="classic" />
                    <label className="block">
                      <span className="mb-2 block text-sm font-semibold text-slate-300">Role</span>
                      <select value={adminProfile ? 'Admin' : draft.role} onChange={(event) => updateField('role', event.target.value)} disabled={adminProfile} className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-slate-100 outline-none transition focus:border-sky-400/30 focus:ring-2 focus:ring-sky-400/10 disabled:cursor-not-allowed disabled:opacity-70">
                        {adminProfile && <option>Admin</option>}
                        <option>Student</option>
                        <option>Teacher</option>
                      </select>
                    </label>
                  </div>
                  <label className="mt-4 block">
                    <span className="mb-2 block text-sm font-semibold text-slate-300">Bio</span>
                    <textarea value={draft.bio} onChange={(event) => updateField('bio', event.target.value)} rows="5" className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-slate-100 outline-none transition focus:border-sky-400/30 focus:ring-2 focus:ring-sky-400/10" />
                  </label>
                  <button type="button" onClick={() => onSave(draft)} className="mt-4 inline-flex items-center justify-center gap-2 rounded-2xl bg-sky-500 px-5 py-3 font-semibold text-white transition hover:bg-sky-400">
                    <CheckCircle size={17} />
                    Save changes
                  </button>
                </ProfileSectionCard>

                <ProfileSectionCard title="Security" eyebrow="Password">
                  <div className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <label className="block">
                        <span className="mb-2 block text-sm font-semibold text-slate-300">Current password</span>
                        <input type="password" value={passwordForm.currentPassword} onChange={(event) => setPasswordForm((current) => ({ ...current, currentPassword: event.target.value }))} className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-slate-100 outline-none transition focus:border-sky-400/30 focus:ring-2 focus:ring-sky-400/10" />
                      </label>
                      <label className="block">
                        <span className="mb-2 block text-sm font-semibold text-slate-300">New password</span>
                        <input type="password" value={passwordForm.newPassword} onChange={(event) => setPasswordForm((current) => ({ ...current, newPassword: event.target.value }))} className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-slate-100 outline-none transition focus:border-sky-400/30 focus:ring-2 focus:ring-sky-400/10" />
                      </label>
                    </div>
                    <label className="block">
                      <span className="mb-2 block text-sm font-semibold text-slate-300">Confirm new password</span>
                      <input type="password" value={passwordForm.confirmPassword} onChange={(event) => setPasswordForm((current) => ({ ...current, confirmPassword: event.target.value }))} className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-slate-100 outline-none transition focus:border-sky-400/30 focus:ring-2 focus:ring-sky-400/10" />
                    </label>
                    {passwordMessage && <div className="text-sm font-medium text-slate-300">{passwordMessage}</div>}
                    <button type="button" onClick={handlePasswordSubmit} disabled={passwordSubmitting} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-sky-500 px-5 py-3 font-semibold text-white transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-70">
                      <Lock size={16} />
                      {passwordSubmitting ? 'Updating...' : 'Update password'}
                    </button>
                  </div>
                </ProfileSectionCard>

                <ProfileSectionCard title="Danger zone" eyebrow="Account">
                  <div className="space-y-4">
                    <div className="rounded-2xl border border-rose-400/20 bg-rose-500/10 p-4 text-sm leading-6 text-rose-100">
                      Type <span className="font-semibold">I want to delete my NECSpeaking account!</span> to permanently delete this account and its saved practice history.
                    </div>
                    <label className="block">
                      <span className="mb-2 block text-sm font-semibold text-slate-300">Confirmation phrase</span>
                      <input
                        value={deletePhrase}
                        onChange={(event) => {
                          setDeletePhrase(event.target.value);
                          setDeleteError('');
                        }}
                        placeholder="I want to delete my NECSpeaking account!"
                        className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-rose-400/30 focus:ring-2 focus:ring-rose-400/10"
                      />
                    </label>
                    {deleteError && <div className="text-sm font-medium text-rose-200">{deleteError}</div>}
                    <div className="flex flex-col gap-3 sm:flex-row">
                      <button type="button" onClick={() => onLogout()} className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-3 font-semibold text-slate-200 transition hover:bg-white/[0.08] sm:w-auto">
                        <LogOut size={16} />
                        Log out
                      </button>
                      <button type="button" onClick={handleDelete} className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-rose-400/20 bg-rose-500 px-5 py-3 font-semibold text-white transition hover:bg-rose-400 sm:w-auto">
                        <Trash2 size={16} />
                        Delete account
                      </button>
                    </div>
                  </div>
                </ProfileSectionCard>
              </>
            )}
          </main>
        </div>
      </section>
    </div>
  );
}
