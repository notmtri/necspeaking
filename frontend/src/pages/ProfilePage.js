import React, { useEffect, useState } from 'react';
import { CheckCircle, Lock, LogOut, Trash2, Upload, User } from 'lucide-react';
import { createDefaultProfile, getDisplayRole, isAdminProfile } from '../appShared';
import { LabeledInput, ProfileDetailRow, ProfileMetricCard, ProfileSectionCard } from '../components/ProfileBits';

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

  if (!currentUser) {
    return (
      <section className="rounded-[32px] border border-white/10 bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.18),_transparent_35%),linear-gradient(135deg,_rgba(7,17,31,0.98),_rgba(8,20,38,0.96))] p-8 text-center shadow-[0_24px_120px_rgba(2,6,23,0.45)]">
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
    <div className="w-full space-y-6 text-slate-100">
      <section className="rounded-[40px] border border-white/10 bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.22),_transparent_38%),linear-gradient(135deg,_rgba(7,17,31,0.98),_rgba(8,20,38,0.96))] p-5 shadow-[0_24px_120px_rgba(2,6,23,0.45)] sm:p-6">
        <div className="flex flex-col gap-4 border-b border-white/10 pb-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-sky-400/20 bg-sky-400/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-sky-200">
              <User size={14} />
              Profile
            </div>
            <h2 className="mt-4 text-4xl font-black tracking-tight text-white sm:text-5xl">Your account, your settings, your stats.</h2>
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
                      <img src={draft.avatar} alt={`${draft.name} avatar`} className="h-[18rem] w-[18rem] rounded-[34px] border border-white/10 object-cover p-1 shadow-[0_18px_40px_rgba(2,6,23,0.35)] sm:h-[20rem] sm:w-[20rem]" />
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

                <ProfileSectionCard title="Recent practice" eyebrow="Saved activity">
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
                      <button type="button" onClick={() => onLogout()} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-3 font-semibold text-slate-200 transition hover:bg-white/[0.08]">
                        <LogOut size={16} />
                        Log out
                      </button>
                      <button type="button" onClick={handleDelete} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-rose-400/20 bg-rose-500 px-5 py-3 font-semibold text-white transition hover:bg-rose-400">
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
