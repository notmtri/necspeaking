import React, { useEffect, useMemo, useState } from 'react';
import { Award, Camera, CheckCircle, Flame, Loader, Lock, LogOut, Mic, Pencil, Target, Trash2, TrendingUp, Trophy, Upload, User } from 'lucide-react';
import { COVER_UPLOAD, CRITERIA, TONES, isAdminProfile, profileAvatar, profileCover, readImageAsResizedDataUri } from '../appShared';
import VerifyEmailNotice from '../components/VerifyEmailNotice';
import { FIELD_CLASSNAME, LabeledInput, ProfileSectionCard } from '../components/ProfileBits';
import PracticeHistoryItem from '../components/PracticeHistoryItem';


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
      <p className="rounded-card bg-surface-sunken p-4 text-sm text-ink-muted">
        Complete more logged-in practice sessions to unlock score trends.
      </p>
    );
  }

  return (
    <div className="grid min-h-[180px] grid-cols-6 items-end gap-3">
      {sessions.map((session, index) => {
        const score = Number(session.scores?.total || 0);
        const height = Math.max(10, Math.round((score / 2) * 100));
        return (
          <div key={session.id || index} className="flex min-w-0 flex-col items-center gap-2">
            <div className="flex h-28 w-full items-end">
              <div className="w-full rounded-t-control bg-gradient-to-t from-sky-500 to-sky-300 dark:from-sky-500 dark:to-sky-400" style={{ height: `${height}%` }} />
            </div>
            <div className="text-xs font-semibold text-ink">{score.toFixed(2)}</div>
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
    <div className="space-y-4">
      {CRITERIA.map((criterion) => {
        const value = Number(averages[criterion.key] || 0);
        const percent = Math.min(100, Math.round((value / criterion.max) * 100));
        return (
          <div key={criterion.key}>
            <div className="flex items-center justify-between gap-3 text-sm">
              <div className={`font-medium ${TONES[criterion.tone].text}`}>{criterion.label}</div>
              <div className="font-medium text-ink tabular">{value.toFixed(2)} <span className="font-normal text-ink-subtle">/ {criterion.max.toFixed(1)}</span></div>
            </div>
            <div className={`mt-2 h-2 overflow-hidden rounded-full ${TONES[criterion.tone].soft}`}>
              <div className={`h-full rounded-full ${TONES[criterion.tone].fill}`} style={{ width: `${percent}%` }} />
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
    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
      {badges.map((badge) => {
        const Icon = badge.icon;
        return (
          <div key={badge.label} className={`rounded-card p-3 ${badge.unlocked ? 'bg-amber-50 text-amber-900 dark:bg-amber-400/10 dark:text-amber-100' : 'text-ink-subtle'}`}>
            <div className="flex items-center gap-3">
              <div className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${badge.unlocked ? 'bg-amber-300 text-amber-950 dark:bg-amber-400/30 dark:text-amber-100' : 'bg-overlay'}`}>
                <Icon size={16} />
              </div>
              <div className="min-w-0">
                <div className={`text-sm font-medium ${badge.unlocked ? '' : 'text-ink-muted'}`}>{badge.label}</div>
                <div className="text-xs">{badge.unlocked ? 'Unlocked' : badge.note}</div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/**
 * A picture you can replace in place: hover (or, on touch screens, the
 * always-visible camera badge) shows what a click will do.
 */
function EditableImage({ label, onPick, busy, className = '', overlayClassName = '', children }) {
  const inputRef = React.useRef(null);
  return (
    <button
      type="button"
      onClick={() => inputRef.current?.click()}
      disabled={busy}
      aria-label={label}
      className={`group relative block overflow-hidden ${className}`}
    >
      {children}
      <span
        className={`absolute inset-0 flex items-center justify-center gap-2 bg-black/45 text-sm font-medium text-white opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100 ${busy ? 'opacity-100' : ''} ${overlayClassName}`}
        aria-hidden="true"
      >
        {busy ? <Loader size={18} className="animate-spin" /> : <Camera size={18} />}
        <span className="hidden sm:inline">{busy ? 'Saving...' : label}</span>
      </span>
      {/* Touch screens have no hover: keep a small camera badge in view. */}
      <span className="absolute bottom-2 right-2 hidden h-8 w-8 items-center justify-center rounded-full bg-black/55 text-white [@media(hover:none)]:inline-flex" aria-hidden="true">
        <Camera size={15} />
      </span>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => {
          onPick(event.target.files?.[0]);
          event.target.value = '';
        }}
      />
    </button>
  );
}

/**
 * Shown until the first practice is saved. 59% of accounts had never practised
 * once: signing up landed them on an empty dashboard with no obvious next step.
 */
function FirstPracticeCard({ onStartPractice }) {
  const steps = [
    'We pick a past NEC question for you.',
    'Plan for a minute, then record up to 5 minutes. A phone mic is fine.',
    'Get scored on Content, Accuracy and Delivery, with written feedback.',
  ];
  return (
    <section className="rounded-panel bg-sky-50 p-5 dark:bg-sky-400/10 sm:p-7" aria-labelledby="first-practice-title">
      <h2 id="first-practice-title" className="text-xl font-semibold text-ink">Do your first practice</h2>
      <ol className="mt-4 space-y-2 text-sm leading-6 text-ink">
        {steps.map((step, index) => (
          <li key={step} className="flex gap-3">
            <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-sky-100 dark:bg-sky-400/15 text-xs font-semibold text-sky-700 dark:text-sky-300">{index + 1}</span>
            <span>{step}</span>
          </li>
        ))}
      </ol>
      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          onClick={() => onStartPractice('analyze')}
          className="inline-flex items-center justify-center gap-2 rounded-full bg-ink px-5 py-3 font-medium text-on-ink transition hover:bg-ink/85"
        >
          <Mic size={17} />
          Start my first practice
        </button>
        <button
          type="button"
          onClick={() => onStartPractice('simulation')}
          className="inline-flex items-center justify-center gap-2 rounded-full border border-line bg-surface-raised px-5 py-3 font-medium text-ink transition hover:bg-overlay"
        >
          Try the timed test instead
        </button>
      </div>
    </section>
  );
}

export default function ProfilePage({ currentUser, practiceHistory, onSave, onLogout, onDeleteAccount, onPasswordUpdate, authError, passwordSubmitting, onStartPractice = null, emailEnabled = false, onEmailVerified = null, onQuickSave = null }) {
  const [draft, setDraft] = useState(currentUser);
  const [activeTab, setActiveTab] = useState('overview');
  const [deletePhrase, setDeletePhrase] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [passwordMessage, setPasswordMessage] = useState('');
  const [photoError, setPhotoError] = useState('');
  const [mediaSaving, setMediaSaving] = useState('');
  const [mediaError, setMediaError] = useState('');

  useEffect(() => {
    setDraft(currentUser);
    setActiveTab('overview');
    setDeletePhrase('');
    setDeleteError('');
    setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    setPasswordMessage('');
    setPhotoError('');
  }, [currentUser]);

  const analytics = useMemo(
    () => getPracticeAnalytics(practiceHistory || [], draft?.stats || {}),
    [practiceHistory, draft],
  );

  if (!currentUser || !draft) {
    return (
      <section className="rounded-panel border border-line bg-surface-raised p-5 text-center sm:p-8">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-line bg-overlay text-sky-600 dark:text-sky-300">
          <User size={28} />
        </div>
        <h1 className="mt-5 text-2xl font-bold tracking-tight text-ink sm:text-3xl">Log in to view your profile</h1>
        <p className="mt-3 text-sm leading-6 text-ink-muted">This page shows the account currently stored in the backend session.</p>
      </section>
    );
  }

  const updateField = (field, value) => {
    setDraft((current) => ({ ...current, [field]: value }));
  };

  const updatePhoto = async (file) => {
    if (!file) return;
    setPhotoError('');
    try {
      const dataUri = await readImageAsResizedDataUri(file);
      setDraft((current) => ({ ...current, avatar: dataUri }));
    } catch (error) {
      setPhotoError(error.message || 'Could not use that image.');
    }
  };

  const adminProfile = isAdminProfile(draft);

  // Saves just the photo or the cover, straight from the profile header.
  const replaceImage = async (kind, file) => {
    if (!file || !onQuickSave) return;
    setMediaError('');
    setMediaSaving(kind);
    try {
      const dataUri = await readImageAsResizedDataUri(file, kind === 'cover' ? COVER_UPLOAD : undefined);
      await onQuickSave({ [kind]: dataUri });
    } catch (error) {
      setMediaError(error.message || 'Could not save that image.');
    } finally {
      setMediaSaving('');
    }
  };
  const cover = profileCover(draft);
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

  const hasPractice = stats.practices > 0 || practiceHistory?.length > 0;
  const details = [draft.school, draft.className, draft.cohort && `Cohort ${draft.cohort}`].filter(Boolean);
  const statTiles = [
    { label: 'Practices', value: stats.practices || 0, tone: 'sky' },
    { label: 'Average', value: Number(stats.avgScore || 0).toFixed(2), tone: 'violet' },
    { label: 'Best', value: Number(stats.bestScore || 0).toFixed(2), tone: 'amber' },
    { label: 'Day streak', value: stats.streak || 0, tone: 'emerald' },
  ];

  return (
    <div className="w-full min-w-0 space-y-8 text-ink">
      <h1 id="profile-page-title" className="sr-only">Your profile</h1>

      <section className="overflow-hidden rounded-panel border border-line bg-surface-raised" aria-label="Your profile">
        <EditableImage
          label="Change cover"
          onPick={(file) => replaceImage('cover', file)}
          busy={mediaSaving === 'cover'}
          className="h-32 w-full bg-gradient-to-r from-sky-200 via-violet-200 to-amber-200 dark:from-sky-400/25 dark:via-violet-400/20 dark:to-amber-400/20 sm:h-44"
        >
          {cover && <img src={cover} alt="" className="h-full w-full object-cover" />}
        </EditableImage>
        <div className="px-5 pb-6 sm:px-8">
          <div className="-mt-12 flex flex-col gap-5 sm:-mt-14 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-end">
              <EditableImage
                label="Change photo"
                onPick={(file) => replaceImage('avatar', file)}
                busy={mediaSaving === 'avatar'}
                className="relative z-10 h-24 w-24 shrink-0 rounded-[1.75rem] border-4 border-surface-raised bg-surface-raised sm:h-28 sm:w-28"
                overlayClassName="rounded-[1.5rem]"
              >
                <img src={profileAvatar(draft)} alt="" className="h-full w-full rounded-[1.5rem] object-cover" />
              </EditableImage>
              <div className="min-w-0 sm:pb-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="truncate text-2xl font-semibold text-ink sm:text-[1.75rem]">{draft.name}</h2>
                  {adminProfile && (
                    <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-400/10 dark:text-amber-200">
                      Admin
                    </span>
                  )}
                </div>
                <div className="mt-0.5 text-sm text-ink-muted">
                  @{draft.username}
                  {details.length > 0 && <span className="text-ink-subtle"> | {details.join(', ')}</span>}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setActiveTab('settings')}
              className="inline-flex shrink-0 items-center justify-center gap-2 self-start rounded-full border border-line bg-surface-raised px-4 py-2 text-sm font-medium text-ink transition-colors duration-200 hover:bg-overlay lg:self-auto"
            >
              <Pencil size={15} />
              Edit profile
            </button>
          </div>
          {mediaError && <p className="mt-3 text-sm text-rose-700 dark:text-rose-300" role="alert">{mediaError}</p>}
          {draft.bio && <p className="mt-4 max-w-[70ch] text-sm leading-6 text-ink-muted">{draft.bio}</p>}

          <dl className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {statTiles.map((tile) => (
              <div key={tile.label} className={`rounded-card px-4 py-3.5 ${TONES[tile.tone].soft}`}>
                <dt className={`text-sm font-medium ${TONES[tile.tone].text}`}>{tile.label}</dt>
                <dd className="mt-1 font-display text-2xl font-semibold tracking-[-0.03em] text-ink tabular">{tile.value}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="flex gap-6 border-t border-line px-5 sm:px-8" role="tablist" aria-label="Profile sections">
          {[['overview', 'Overview'], ['settings', 'Settings']].map(([id, label]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={activeTab === id}
              onClick={() => setActiveTab(id)}
              className={`-mb-px border-b-2 py-3.5 text-sm font-medium transition-colors duration-200 ${
                activeTab === id ? 'border-ink text-ink' : 'border-transparent text-ink-muted hover:text-ink'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </section>

      {authError && (
        <div className="rounded-card border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 dark:border-rose-400/25 dark:bg-rose-400/10 dark:text-rose-200" role="alert">
          {authError}
        </div>
      )}

      {emailEnabled && !currentUser.emailVerified && (
        <VerifyEmailNotice
          email={currentUser.email}
          reason="So you can reset your password if you forget it, and post in the community."
          onVerified={onEmailVerified}
        />
      )}

      {activeTab === 'overview' && onStartPractice && !hasPractice && (
        <FirstPracticeCard onStartPractice={onStartPractice} />
      )}

      {activeTab === 'overview' ? (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] lg:items-start">
          <div className="min-w-0 space-y-6">
            <ProfileSectionCard title="Recent practice">
              <div className="divide-y divide-line">
                {practiceHistory?.length ? practiceHistory.map((session) => (
                  <PracticeHistoryItem key={session.id} session={session} />
                )) : (
                  <p className="rounded-card bg-surface-sunken px-4 py-5 text-sm text-ink-muted">
                    Your saved attempts appear here, each with its scores, feedback and report.
                  </p>
                )}
              </div>
            </ProfileSectionCard>

            {hasPractice && (
              <ProfileSectionCard title="Score trend">
                <PracticeTrend sessions={analytics.trend} />
              </ProfileSectionCard>
            )}
          </div>

          <div className="min-w-0 space-y-6">
            {hasPractice && (
              <ProfileSectionCard title="Averages by criterion">
                <CriteriaBars averages={analytics.averages} />
                <p className="mt-5 rounded-card bg-surface-sunken p-4 text-sm leading-6 text-ink-muted">
                  Focus next on <span className={`font-semibold ${TONES[analytics.weakest?.tone || 'sky'].text}`}>{analytics.weakest?.label || 'Content'}</span>, your lowest criterion relative to its maximum.
                </p>
              </ProfileSectionCard>
            )}

            <ProfileSectionCard title="Achievements">
              <AchievementBadges stats={stats} analytics={analytics} />
            </ProfileSectionCard>
          </div>
        </div>
      ) : (
        <div className="space-y-5 sm:space-y-6">
          <ProfileSectionCard title="Settings" eyebrow="Personal info">
            <div className="mb-5 rounded-card border border-line bg-overlay p-4">
              <div className="text-sm font-semibold text-ink">Profile photo</div>
              <div className="mt-1 text-sm text-ink-muted">Upload a new avatar. Large photos are resized automatically.</div>
              <label className="mt-4 inline-flex cursor-pointer items-center gap-2 rounded-full border border-line bg-sky-50 dark:bg-sky-400/10 px-4 py-2 text-xs font-semibold tracking-normal text-sky-700 dark:text-sky-300 transition hover:bg-sky-100 dark:hover:bg-sky-400/15">
                <Upload size={14} />
                Upload photo
                <input type="file" accept="image/*" onChange={(event) => updatePhoto(event.target.files?.[0])} className="hidden" />
              </label>
              {photoError && (
                <div className="mt-3 rounded-control border border-rose-200 dark:border-rose-400/25 bg-rose-50 dark:bg-rose-400/10 px-3 py-2 text-sm text-rose-700 dark:text-rose-300" role="alert">
                  {photoError}
                </div>
              )}
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <LabeledInput label="Name" value={draft.name} onChange={(value) => updateField('name', value)} placeholder="Your full name" />
              <LabeledInput label="Username" value={draft.username} onChange={(value) => updateField('username', value.toLowerCase())} placeholder="unique username" />
              <LabeledInput label="Class" value={draft.className} onChange={(value) => updateField('className', value)} placeholder="12A1" />
              <LabeledInput label="School" value={draft.school} onChange={(value) => updateField('school', value)} placeholder="Your school" />
              <LabeledInput label="Cohort" value={draft.cohort} onChange={(value) => updateField('cohort', value)} placeholder="NEC 25-26" />
            </div>
            <label className="mt-4 block">
              <span className="mb-2 block text-sm font-semibold text-ink-muted">Bio</span>
              <textarea value={draft.bio} onChange={(event) => updateField('bio', event.target.value)} rows="5" className={FIELD_CLASSNAME} />
            </label>
            <button
              type="button"
              onClick={() => onSave(draft)}
              className="mt-4 inline-flex items-center justify-center gap-2 rounded-full bg-ink px-5 py-3 font-medium text-on-ink transition hover:bg-ink/85"
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
                className="inline-flex items-center justify-center gap-2 rounded-full bg-ink px-5 py-3 font-medium text-on-ink transition hover:bg-ink/85 disabled:cursor-not-allowed disabled:opacity-70"
              >
                <Lock size={16} />
                {passwordSubmitting ? 'Updating...' : 'Update password'}
              </button>
            </div>
          </ProfileSectionCard>

          <ProfileSectionCard title="Danger zone" eyebrow="Account">
            <div className="space-y-4">
              <div className="rounded-card border border-rose-200 dark:border-rose-400/25 bg-rose-50 dark:bg-rose-400/10 p-4 text-sm leading-6 text-rose-700 dark:text-rose-300">
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
              {deleteError && <div className="text-sm font-medium text-rose-700 dark:text-rose-300" role="alert">{deleteError}</div>}
              <div className="flex flex-col gap-3 sm:flex-row">
                <button type="button" onClick={() => onLogout()} className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-line bg-surface-raised px-5 py-3 font-medium text-ink transition hover:bg-overlay sm:w-auto">
                  <LogOut size={16} />
                  Log out
                </button>
                <button type="button" onClick={handleDelete} className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-rose-500 px-5 py-3 font-medium text-white transition hover:bg-rose-400 sm:w-auto">
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
