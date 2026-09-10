import React, { useEffect, useMemo, useState } from 'react';
import { Award, BarChart3, CheckCircle, Flame, Lock, LogOut, Target, Trash2, TrendingUp, Trophy, Upload, User } from 'lucide-react';
import { getDisplayRole, isAdminProfile } from '../appShared';
import { PageHeader } from '../components/AppChrome';
import { FIELD_CLASSNAME, LabeledInput, ProfileDetailRow, ProfileMetricCard, ProfileSectionCard } from '../components/ProfileBits';

const CRITERIA = [
  { key: 'content', label: 'Content', max: 0.9, tone: 'sky' },
  { key: 'accuracy', label: 'Accuracy', max: 0.6, tone: 'emerald' },
  { key: 'delivery', label: 'Delivery', max: 0.5, tone: 'amber' },
];

const DELETE_PHRASE = 'I want to delete my NECSpeaking account!';

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

  return { sessions, averages, bestSession, weakest, trend: sessions.slice(-6) };
}

function PracticeTrend({ sessions }) {
  if (!sessions.length) {
    return (
      <div className="rounded-card border border-dashed border-line bg-overlay p-4 text-sm text-ink-muted">
        Complete more logged-in practice sessions to unlock score trends.
      </div>
    );
  }

  return (
    <div className="grid min-h-[180px] grid-cols-6 items-end gap-2 rounded-card border border-line bg-overlay p-4">
      {sessions.map((session, index) => {
        const score = Number(session.scores?.total || 0);
        const height = Math.max(10, Math.round((score / 2) * 100));
        return (
          <div key={session.id || index} className="flex min-w-0 flex-col items-center gap-2">
            <div className="flex h-28 w-full items-end">
              <div className="w-full rounded-t-control bg-sky-400/80" style={{ height: `${height}%` }} />
            </div>
            <div className="text-xs font-semibold text-white">{score.toFixed(2)}</div>
            <div className="max-w-full truncate text-[10px] text-ink-subtle">
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
          <div key={criterion.key} className="rounded-card border border-line bg-overlay p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm font-semibold text-white">{criterion.label}</div>
              <div className="text-sm font-semibold text-ink-muted">{value.toFixed(2)} / {criterion.max.toFixed(1)}</div>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-overlay-hover">
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
    { label: 'First step', icon: CheckCircle, unlocked: practiceCount >= 1, note: 'Complete one practice.' },
    { label: 'Ten attempts', icon: Target, unlocked: practiceCount >= 10, note: 'Reach 10 practices.' },
    { label: 'Hot streak', icon: Flame, unlocked: streak >= 3, note: 'Hold a 3-day streak.' },
    { label: 'Rising speaker', icon: TrendingUp, unlocked: avgScore >= 1.5, note: 'Average at least 1.50.' },
    { label: 'Peak score', icon: Trophy, unlocked: bestScore >= 1.9, note: 'Score 1.90 or higher.' },
    { label: 'Balanced skill', icon: Award, unlocked: CRITERIA.every((criterion) => (analytics.averages[criterion.key] || 0) / criterion.max >= 0.75), note: 'Reach 75% in all criteria.' },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {badges.map((badge) => {
        const Icon = badge.icon;
        return (
          <div key={badge.label} className={`rounded-card border p-4 ${badge.unlocked ? 'border-amber-300/25 bg-amber-300/10 text-amber-100' : 'border-line bg-overlay text-ink-subtle'}`}>
            <div className="flex items-center gap-3">
              <div className={`inline-flex h-10 w-10 items-center justify-center rounded-card ${badge.unlocked ? 'bg-amber-300/20' : 'bg-overlay'}`}>
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
      aria-pressed={active}
      className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
        active
          ? 'border-sky-400/20 bg-sky-400/10 text-sky-200'
          : 'border-line bg-overlay text-ink-muted hover:bg-overlay-hover'
      }`}
    >
      {children}
    </button>
  );
}

export default function ProfilePage({ currentUser, practiceHistory, onSave, onLogout, onDeleteAccount, onPasswordUpdate, authError, passwordSubmitting }) {
  const [draft, setDraft] = useState(currentUser);
  const [activeTab, setActiveTab] = useState('overview');
  const [deletePhrase, setDeletePhrase] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [passwordMessage, setPasswordMessage] = useState('');

  useEffect(() => {
    setDraft(currentUser);
    setActiveTab('overview');
    setDeletePhrase('');
    setDeleteError('');
    setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    setPasswordMessage('');
  }, [currentUser]);

  const analytics = useMemo(
    () => getPracticeAnalytics(practiceHistory || [], draft?.stats || {}),
    [practiceHistory, draft],
  );

  if (!currentUser || !draft) {
    return (
      <section className="rounded-panel border border-line bg-surface-raised p-5 text-center sm:p-8">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-line bg-overlay text-sky-300">
          <User size={28} />
        </div>
        <h1 className="mt-5 text-2xl font-bold tracking-tight text-white sm:text-3xl">Log in to view your profile</h1>
        <p className="mt-3 text-sm leading-6 text-ink-muted">This page shows the account currently stored in the backend session.</p>
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
  const stats = draft.stats || {};

  const handleDelete = () => {
    if (deletePhrase.trim() !== DELETE_PHRASE) {
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
    <div className="w-full min-w-0 space-y-5 text-slate-100 sm:space-y-6">
      <PageHeader
        id="profile-page-title"
        title="Your profile"
        description="Identity, saved practice history, performance analytics, and account settings."
      />

      <div className="flex flex-wrap justify-center gap-2">
        <ProfileTabButton active={activeTab === 'overview'} onClick={() => setActiveTab('overview')}>Overview</ProfileTabButton>
        <ProfileTabButton active={activeTab === 'settings'} onClick={() => setActiveTab('settings')}>Settings</ProfileTabButton>
      </div>

      {authError && (
        <div className="rounded-card border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-100" role="alert">
          {authError}
        </div>
      )}

      {activeTab === 'overview' ? (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,0.6fr)_minmax(0,1.4fr)] xl:items-start">
          <ProfileSectionCard title="User card" eyebrow="Identity" className="xl:row-span-2">
            <div className="flex h-full flex-col items-center justify-center text-center">
              <img
                src={draft.avatar}
                alt=""
                className="h-44 w-44 rounded-panel border border-line object-cover sm:h-56 sm:w-56"
              />
              <h2 className="mt-5 text-lg font-semibold text-white sm:text-xl">{draft.name}</h2>
              <div className="mt-1 text-base font-semibold text-sky-300">@{draft.username}</div>
              <div className="mt-3 inline-flex items-center rounded-full border border-line bg-overlay px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-ink-muted">
                {displayRole}
              </div>
              {adminProfile && (
                <div className="mt-3 inline-flex items-center rounded-full border border-amber-300/30 bg-amber-300/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-amber-100">
                  necs. admin
                </div>
              )}
              <p className="mt-4 max-w-[28ch] text-sm leading-6 text-ink-muted">{draft.bio}</p>
            </div>
          </ProfileSectionCard>

          <ProfileSectionCard title="At a glance" eyebrow="Quick profile">
            <div className="grid gap-4 sm:grid-cols-2">
              <ProfileDetailRow label="Name" value={draft.name} />
              <ProfileDetailRow label="Username" value={`@${draft.username}`} />
              <ProfileDetailRow label="Role" value={displayRole} />
              <ProfileDetailRow label="Streak" value={`${stats.streak || 0} days`} />
              <ProfileDetailRow label="Class" value={draft.className || 'Not set'} />
              <ProfileDetailRow label="School" value={draft.school || 'Not set'} />
              <ProfileDetailRow label="Cohort" value={draft.cohort || 'Not set'} />
              <ProfileDetailRow label="Email" value={draft.email || 'Not set'} />
            </div>
          </ProfileSectionCard>

          <ProfileSectionCard title="Stats" eyebrow="Performance">
            <div className="grid gap-4 sm:grid-cols-3">
              <ProfileMetricCard label="Practices" value={stats.practices || 0} tone="sky" />
              <ProfileMetricCard label="Average score" value={stats.avgScore || 0} tone="emerald" />
              <ProfileMetricCard label="Best score" value={stats.bestScore || 0} tone="amber" />
            </div>
          </ProfileSectionCard>

          <ProfileSectionCard title="Practice dashboard" eyebrow="Analytics" className="xl:col-span-2">
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(260px,0.8fr)]">
              <div className="min-w-0">
                <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-white">
                  <BarChart3 size={17} />
                  Recent score trend
                </h3>
                <PracticeTrend sessions={analytics.trend} />
              </div>
              <div className="min-w-0">
                <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-white">
                  <Target size={17} />
                  Criterion averages
                </h3>
                <CriteriaBars averages={analytics.averages} />
              </div>
            </div>
            <div className="mt-4 rounded-card border border-sky-400/20 bg-sky-400/10 p-4 text-sm leading-6 text-sky-100">
              Current focus: <span className="font-semibold">{analytics.weakest?.label || 'Content'}</span>. This is the lowest average criterion across saved sessions.
            </div>
          </ProfileSectionCard>

          <ProfileSectionCard title="Achievements" eyebrow="Badges" className="xl:col-span-2">
            <AchievementBadges stats={stats} analytics={analytics} />
          </ProfileSectionCard>

          <ProfileSectionCard title="Recent practice" eyebrow="Saved activity" className="xl:col-span-2">
            <div className="space-y-3">
              {practiceHistory?.length ? practiceHistory.map((session) => (
                <div key={session.id} className="rounded-card border border-line bg-overlay px-4 py-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-white">{session.topic}</div>
                      <div className="mt-1 text-xs text-ink-subtle">{new Date(session.createdAt).toLocaleString()}</div>
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
                <div className="rounded-card border border-dashed border-line bg-overlay px-4 py-5 text-sm text-ink-muted">
                  Complete a speech analysis while logged in to start building your history.
                </div>
              )}
            </div>
          </ProfileSectionCard>
        </div>
      ) : (
        <div className="space-y-5 sm:space-y-6">
          <ProfileSectionCard title="Settings" eyebrow="Personal info">
            <div className="mb-5 rounded-card border border-line bg-overlay p-4">
              <div className="text-sm font-semibold text-white">Profile photo</div>
              <div className="mt-1 text-sm text-ink-muted">Upload a new avatar for your user card.</div>
              <label className="mt-4 inline-flex cursor-pointer items-center gap-2 rounded-full border border-line bg-sky-400/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-sky-200 transition hover:bg-sky-400/20">
                <Upload size={14} />
                Upload photo
                <input type="file" accept="image/*" onChange={(event) => updatePhoto(event.target.files?.[0])} className="hidden" />
              </label>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <LabeledInput label="Name" value={draft.name} onChange={(value) => updateField('name', value)} placeholder="Your full name" />
              <LabeledInput label="Username" value={draft.username} onChange={(value) => updateField('username', value.toLowerCase())} placeholder="unique username" />
              <LabeledInput label="Class" value={draft.className} onChange={(value) => updateField('className', value)} placeholder="12A1" />
              <LabeledInput label="School" value={draft.school} onChange={(value) => updateField('school', value)} placeholder="Your school" />
              <LabeledInput label="Cohort" value={draft.cohort} onChange={(value) => updateField('cohort', value)} placeholder="NEC 25-26" />
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-ink-muted">Role</span>
                <select
                  value={adminProfile ? 'Admin' : draft.role}
                  onChange={(event) => updateField('role', event.target.value)}
                  disabled={adminProfile}
                  className={`${FIELD_CLASSNAME} disabled:cursor-not-allowed disabled:opacity-70`}
                >
                  {adminProfile && <option>Admin</option>}
                  <option>Student</option>
                  <option>Teacher</option>
                </select>
              </label>
            </div>
            <label className="mt-4 block">
              <span className="mb-2 block text-sm font-semibold text-ink-muted">Bio</span>
              <textarea value={draft.bio} onChange={(event) => updateField('bio', event.target.value)} rows="5" className={FIELD_CLASSNAME} />
            </label>
            <button
              type="button"
              onClick={() => onSave(draft)}
              className="mt-4 inline-flex items-center justify-center gap-2 rounded-control bg-sky-500 px-5 py-3 font-semibold text-white transition hover:bg-sky-400"
            >
              <CheckCircle size={17} />
              Save changes
            </button>
          </ProfileSectionCard>

          <ProfileSectionCard title="Security" eyebrow="Password">
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-ink-muted">Current password</span>
                  <input type="password" autoComplete="current-password" value={passwordForm.currentPassword} onChange={(event) => setPasswordForm((current) => ({ ...current, currentPassword: event.target.value }))} className={FIELD_CLASSNAME} />
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-ink-muted">New password</span>
                  <input type="password" autoComplete="new-password" value={passwordForm.newPassword} onChange={(event) => setPasswordForm((current) => ({ ...current, newPassword: event.target.value }))} className={FIELD_CLASSNAME} />
                </label>
              </div>
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-ink-muted">Confirm new password</span>
                <input type="password" autoComplete="new-password" value={passwordForm.confirmPassword} onChange={(event) => setPasswordForm((current) => ({ ...current, confirmPassword: event.target.value }))} className={FIELD_CLASSNAME} />
              </label>
              {passwordMessage && <div className="text-sm font-medium text-ink-muted" role="status">{passwordMessage}</div>}
              <button
                type="button"
                onClick={handlePasswordSubmit}
                disabled={passwordSubmitting}
                className="inline-flex items-center justify-center gap-2 rounded-control bg-sky-500 px-5 py-3 font-semibold text-white transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-70"
              >
                <Lock size={16} />
                {passwordSubmitting ? 'Updating...' : 'Update password'}
              </button>
            </div>
          </ProfileSectionCard>

          <ProfileSectionCard title="Danger zone" eyebrow="Account">
            <div className="space-y-4">
              <div className="rounded-card border border-rose-400/20 bg-rose-500/10 p-4 text-sm leading-6 text-rose-100">
                Type <span className="font-semibold">{DELETE_PHRASE}</span> to permanently delete this account and its saved practice history.
              </div>
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-ink-muted">Confirmation phrase</span>
                <input
                  value={deletePhrase}
                  onChange={(event) => {
                    setDeletePhrase(event.target.value);
                    setDeleteError('');
                  }}
                  placeholder={DELETE_PHRASE}
                  className={FIELD_CLASSNAME}
                />
              </label>
              {deleteError && <div className="text-sm font-medium text-rose-200" role="alert">{deleteError}</div>}
              <div className="flex flex-col gap-3 sm:flex-row">
                <button type="button" onClick={() => onLogout()} className="inline-flex w-full items-center justify-center gap-2 rounded-control border border-line bg-overlay px-5 py-3 font-semibold text-slate-200 transition hover:bg-overlay-hover sm:w-auto">
                  <LogOut size={16} />
                  Log out
                </button>
                <button type="button" onClick={handleDelete} className="inline-flex w-full items-center justify-center gap-2 rounded-control bg-rose-500 px-5 py-3 font-semibold text-white transition hover:bg-rose-400 sm:w-auto">
                  <Trash2 size={16} />
                  Delete account
                </button>
              </div>
            </div>
          </ProfileSectionCard>
        </div>
      )}
    </div>
  );
}
