import React, { useCallback, useDeferredValue, useEffect, useMemo, useState } from 'react';
import { ArrowRight, Bell, Search, Trophy, X } from 'lucide-react';
import { createAvatarDataUri, getDisplayRole, isAdminProfile } from '../appShared';
import { apiFetch, isAbortError } from '../apiClient';
import { PageHeader } from '../components/AppChrome';
import { useOverlayDismiss } from '../components/AppOverlays';
import { FIELD_CLASSNAME, ProfileDetailRow, ProfileMetricCard, ProfileSectionCard } from '../components/ProfileBits';

const MAX_TITLE_LENGTH = 180;
const MAX_BODY_LENGTH = 4000;

function ProfileOverlayModal({ profile, onClose }) {
  const displayRole = getDisplayRole(profile);
  const adminProfile = isAdminProfile(profile);

  useOverlayDismiss(true, onClose);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/80 p-3 backdrop-blur-sm sm:p-6">
      <div
        className="relative my-4 w-full max-w-5xl rounded-panel border border-line bg-surface-raised"
        role="dialog"
        aria-modal="true"
        aria-labelledby="profile-overlay-title"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 inline-flex h-10 w-10 items-center justify-center rounded-full border border-line bg-overlay text-ink-muted transition hover:bg-overlay-hover hover:text-white"
          aria-label="Close profile overlay"
        >
          <X size={18} />
        </button>

        <div className="border-b border-line px-5 py-5 sm:px-8 sm:py-6">
          <div className="pr-12 text-xs font-semibold uppercase tracking-[0.16em] text-sky-200">Public profile</div>
          <h2 id="profile-overlay-title" className="mt-3 pr-12 text-2xl font-bold tracking-tight text-white sm:text-3xl">{profile.name}</h2>
          <div className="mt-2 text-base font-semibold text-sky-300">@{profile.username}</div>
        </div>

        <div className="grid gap-5 px-5 py-5 sm:px-8 sm:py-8 xl:grid-cols-[0.85fr_1.15fr]">
          <ProfileSectionCard title="Identity" eyebrow="User card">
            <div className="flex flex-col items-center text-center">
              <img
                src={profile.avatar || createAvatarDataUri(profile.name)}
                alt=""
                className="h-40 w-40 rounded-panel border border-line object-cover sm:h-48 sm:w-48"
              />
              <div className="mt-5 inline-flex items-center rounded-full border border-line bg-overlay px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-ink-muted">
                {displayRole}
              </div>
              {adminProfile && (
                <div className="mt-3 inline-flex items-center rounded-full border border-amber-300/30 bg-amber-300/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-amber-100">
                  necs. admin
                </div>
              )}
              <p className="mt-4 max-w-xl text-sm leading-6 text-ink-muted">{profile.bio || 'No bio added yet.'}</p>
            </div>
          </ProfileSectionCard>

          <div className="space-y-5">
            <ProfileSectionCard title="General info" eyebrow="Details">
              <div className="grid gap-4 sm:grid-cols-2">
                <ProfileDetailRow label="Name" value={profile.name} />
                <ProfileDetailRow label="Username" value={`@${profile.username}`} />
                <ProfileDetailRow label="Role" value={displayRole} />
                <ProfileDetailRow label="Class" value={profile.className || 'Not set'} />
                <ProfileDetailRow label="School" value={profile.school || 'Not set'} />
                <ProfileDetailRow label="Cohort" value={profile.cohort || 'Not set'} />
                <ProfileDetailRow label="Streak" value={`${profile.stats?.streak || 0} days`} />
              </div>
            </ProfileSectionCard>

            <ProfileSectionCard title="Stats" eyebrow="Performance">
              <div className="grid gap-4 sm:grid-cols-3">
                <ProfileMetricCard label="Practices" value={profile.stats?.practices || 0} tone="sky" />
                <ProfileMetricCard label="Average score" value={profile.stats?.avgScore || 0} tone="emerald" />
                <ProfileMetricCard label="Best score" value={profile.stats?.bestScore || 0} tone="amber" />
              </div>
            </ProfileSectionCard>
          </div>
        </div>
      </div>
    </div>
  );
}

function Leaderboard({ title, description, profiles, accent, valueOf, onSelect }) {
  const accentClasses = accent === 'amber'
    ? { rank: 'bg-amber-400/10 text-amber-200', value: 'text-amber-200' }
    : { rank: 'bg-sky-400/10 text-sky-200', value: 'text-emerald-200' };

  return (
    <div className="rounded-card border border-line bg-overlay p-4">
      <h3 className="text-sm font-semibold text-white">{title}</h3>
      <p className="mt-1 text-sm text-ink-muted">{description}</p>
      <ol className="mt-4 space-y-3">
        {profiles.map((profile, index) => (
          <li key={profile.id}>
            <button
              type="button"
              onClick={() => onSelect(profile)}
              className="flex w-full items-center gap-3 rounded-card border border-line bg-surface-sunken/60 px-3 py-3 text-left transition hover:bg-overlay-hover"
            >
              <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${accentClasses.rank}`}>{index + 1}</div>
              <img src={profile.avatar || createAvatarDataUri(profile.name)} alt="" className="h-10 w-10 shrink-0 rounded-card object-cover ring-1 ring-white/10" />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold text-white">{profile.name}</div>
                <div className="truncate text-xs text-ink-subtle">@{profile.username}</div>
              </div>
              <div className={`text-sm font-semibold ${accentClasses.value}`}>{valueOf(profile)}</div>
            </button>
          </li>
        ))}
      </ol>
    </div>
  );
}

export default function CommunityPage({ profiles, selectedProfile, onSelectProfile, currentUser, loading }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [communityPosts, setCommunityPosts] = useState([]);
  const [postsLoading, setPostsLoading] = useState(true);
  const [postError, setPostError] = useState('');
  const [postSubmitting, setPostSubmitting] = useState(false);
  const [reportingPostId, setReportingPostId] = useState(null);
  const [overlayProfile, setOverlayProfile] = useState(null);
  const [postDraft, setPostDraft] = useState({ title: '', body: '' });

  const deferredSearchTerm = useDeferredValue(searchTerm);
  const normalizedSearch = deferredSearchTerm.trim().toLowerCase().replace(/^@/, '');
  const matchedProfile = useMemo(
    () => profiles.find((profile) => (profile.username || '').toLowerCase() === normalizedSearch) || null,
    [profiles, normalizedSearch],
  );
  const previewProfile = matchedProfile || selectedProfile || null;

  const leaderboardByPractice = useMemo(
    () => [...profiles].sort((a, b) => (b.stats?.practices || 0) - (a.stats?.practices || 0)).slice(0, 5),
    [profiles],
  );
  const leaderboardByAverage = useMemo(
    () => [...profiles].sort((a, b) => (b.stats?.avgScore || 0) - (a.stats?.avgScore || 0)).slice(0, 5),
    [profiles],
  );

  const canCreatePost = Boolean(currentUser);
  const trimmedTitle = postDraft.title.trim();
  const trimmedBody = postDraft.body.trim();
  const canSubmitPost = canCreatePost && trimmedTitle.length > 0 && trimmedBody.length > 0 && !postSubmitting;

  const fetchCommunityPosts = useCallback(async (signal) => {
    setPostsLoading(true);
    setPostError('');
    try {
      const data = await apiFetch('/api/community/posts', { signal });
      setCommunityPosts(Array.isArray(data.posts) ? data.posts : []);
    } catch (error) {
      if (isAbortError(error)) return;
      setPostError(error.message || 'Could not load community posts.');
      setCommunityPosts([]);
    } finally {
      if (!signal?.aborted) setPostsLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    fetchCommunityPosts(controller.signal);
    return () => controller.abort();
  }, [fetchCommunityPosts]);

  const submitPost = useCallback(async () => {
    if (!canSubmitPost) return;

    setPostSubmitting(true);
    setPostError('');
    try {
      const data = await apiFetch('/api/community/posts', {
        method: 'POST',
        body: { title: trimmedTitle, body: trimmedBody },
      });
      if (!data.post) {
        setPostError(data.error || 'Could not publish post.');
        return;
      }
      setCommunityPosts((current) => [data.post, ...current]);
      setPostDraft({ title: '', body: '' });
    } catch (error) {
      setPostError(error.message || 'Could not publish post.');
    } finally {
      setPostSubmitting(false);
    }
  }, [canSubmitPost, trimmedBody, trimmedTitle]);

  const previewSelectedProfile = useCallback((profile) => {
    if (!profile) return;
    setSearchTerm(`@${profile.username}`);
    onSelectProfile?.(profile.id);
    setOverlayProfile(profile);
  }, [onSelectProfile]);

  const reportPost = useCallback(async (postId) => {
    setReportingPostId(postId);
    setPostError('');
    try {
      const data = await apiFetch(`/api/community/posts/${postId}/report`, { method: 'POST' });
      if (data.success) {
        setCommunityPosts((current) => current.map((post) => (
          post.id === postId ? { ...post, reportedCount: data.reportedCount } : post
        )));
      }
    } catch (error) {
      setPostError(error.message || 'Could not report post.');
    } finally {
      setReportingPostId(null);
    }
  }, []);

  return (
    <div className="min-w-0 space-y-5 sm:space-y-6">
      <PageHeader
        id="community-page-title"
        title="Community"
        description="View community posts from all users and see your ranking."
      />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,2.5fr)_minmax(0,1fr)] sm:gap-6">
        <section className="min-w-0 rounded-panel border border-line bg-surface-raised p-5 sm:p-6">
          <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
            <div className="min-w-0">
              <div className="inline-flex max-w-full items-center gap-2 rounded-full border border-line bg-overlay px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-ink-muted">
                <ArrowRight size={14} />
                Community posts
              </div>
              <h2 className="mt-4 text-lg font-semibold text-white sm:text-xl">Post to the community</h2>
            </div>
            <div className="text-xs uppercase tracking-[0.16em] text-ink-subtle">Live feed</div>
          </div>

          <div className="mt-5 rounded-card border border-line bg-overlay p-4">
            {canCreatePost ? (
              <>
                <div className="grid gap-3">
                  <label className="block">
                    <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-ink-muted">Title</span>
                    <input
                      value={postDraft.title}
                      maxLength={MAX_TITLE_LENGTH}
                      onChange={(event) => setPostDraft((current) => ({ ...current, title: event.target.value }))}
                      placeholder="Give your post a short headline"
                      className={FIELD_CLASSNAME}
                    />
                  </label>
                  <label className="block">
                    <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-ink-muted">Post body</span>
                    <textarea
                      value={postDraft.body}
                      maxLength={MAX_BODY_LENGTH}
                      onChange={(event) => setPostDraft((current) => ({ ...current, body: event.target.value }))}
                      rows="4"
                      placeholder="Share a win, ask for feedback, or post a study update..."
                      className={FIELD_CLASSNAME}
                    />
                  </label>
                </div>
                <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="text-xs leading-6 text-ink-muted">
                    {trimmedBody.length}/{MAX_BODY_LENGTH} characters. Posting is available to every logged-in account.
                  </div>
                  <button
                    type="button"
                    onClick={submitPost}
                    disabled={!canSubmitPost}
                    className="inline-flex items-center justify-center gap-2 rounded-control bg-sky-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    <Bell size={15} />
                    {postSubmitting ? 'Publishing...' : 'Publish post'}
                  </button>
                </div>
              </>
            ) : (
              <div className="flex flex-col gap-4 rounded-card border border-dashed border-line bg-surface-sunken/60 p-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="text-sm font-semibold text-white">Log in to post in the community</div>
                  <div className="mt-1 text-sm leading-6 text-ink-muted">
                    The composer unlocks as soon as you sign in. Right now the feed is view-only for guests.
                  </div>
                </div>
                <div className="shrink-0 rounded-full border border-line bg-overlay px-4 py-2 text-sm font-semibold text-slate-200">
                  Guest view
                </div>
              </div>
            )}
            {postError && (
              <div className="mt-4 rounded-card border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-100" role="alert">
                {postError}
              </div>
            )}
          </div>

          <div className="mt-5 space-y-4">
            {postsLoading ? (
              <div className="rounded-card border border-line bg-overlay p-5 text-sm text-ink-muted">Loading posts...</div>
            ) : communityPosts.length === 0 ? (
              <div className="rounded-card border border-dashed border-line bg-overlay p-5 text-sm leading-6 text-ink-muted">
                No posts yet. The first published post will appear here.
              </div>
            ) : communityPosts.map((item) => (
              <article key={item.id} className="min-w-0 rounded-card border border-line bg-overlay p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-card bg-sky-400/20 text-sky-200">
                      <Bell size={16} />
                    </div>
                    <div className="min-w-0">
                      <div className="truncate text-xs text-ink-muted">{item.author?.name || 'Unknown user'}</div>
                      <div className="truncate text-[11px] text-ink-subtle">@{item.author?.username || 'unknown'}</div>
                    </div>
                  </div>
                  <div className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-subtle">
                    {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : ''}
                  </div>
                </div>
                <h3 className="mt-3 text-base font-semibold text-white">{item.title}</h3>
                <p className="mt-2 whitespace-pre-line text-sm leading-6 text-ink-muted">{item.body}</p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <div className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] ${isAdminProfile(item.author) ? 'border-amber-300/30 bg-amber-300/10 text-amber-100' : 'border-line bg-overlay text-ink-muted'}`}>
                    {getDisplayRole(item.author)}
                  </div>
                  <button
                    type="button"
                    onClick={() => reportPost(item.id)}
                    disabled={reportingPostId === item.id}
                    className="inline-flex rounded-full border border-line bg-overlay px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-ink-muted transition hover:bg-overlay-hover disabled:opacity-60"
                  >
                    {reportingPostId === item.id ? 'Reporting...' : `Report${item.reportedCount ? ` (${item.reportedCount})` : ''}`}
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>

        <div className="space-y-5 sm:space-y-6">
          <section className="min-w-0 rounded-panel border border-line bg-surface-raised p-5 sm:p-6">
            <div className="inline-flex max-w-full items-center gap-2 rounded-full border border-line bg-overlay px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-ink-muted">
              <Search size={14} />
              Search for user
            </div>
            <h2 className="mt-4 text-lg font-semibold text-white sm:text-xl">Find a public profile</h2>

            <label className="mt-5 flex items-center gap-3 rounded-card border border-line bg-overlay px-4 py-3">
              <Search size={16} className="shrink-0 text-ink-subtle" />
              <span className="sr-only">Search by username</span>
              <input
                type="search"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Type an exact username"
                className="w-full min-w-0 bg-transparent text-sm text-white outline-none placeholder:text-ink-subtle"
              />
            </label>

            {loading && (
              <div className="mt-4 rounded-card border border-line bg-overlay p-4 text-sm text-ink-muted">
                Loading public profiles...
              </div>
            )}

            {previewProfile ? (
              <div className="mt-5 rounded-card border border-line bg-overlay p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <div className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-muted">Search result</div>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <div className="text-base font-semibold text-white">{previewProfile.name}</div>
                      {isAdminProfile(previewProfile) && (
                        <span className="rounded-full border border-amber-300/30 bg-amber-300/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-amber-100">
                          admin
                        </span>
                      )}
                    </div>
                    <div className="mt-1 text-sm text-sky-300">@{previewProfile.username}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setOverlayProfile(previewProfile)}
                    className="inline-flex shrink-0 items-center justify-center gap-2 rounded-control bg-sky-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-sky-400"
                  >
                    Open full profile
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-5 rounded-card border border-dashed border-line bg-overlay p-5 text-sm leading-6 text-ink-muted">
                Type an exact username to reveal the profile preview.
              </div>
            )}
          </section>

          <section className="min-w-0 rounded-panel border border-line bg-surface-raised p-5 sm:p-6">
            <div className="inline-flex max-w-full items-center gap-2 rounded-full border border-line bg-overlay px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-ink-muted">
              <Trophy size={14} />
              Leaderboards
            </div>
            <h2 className="mt-4 text-lg font-semibold text-white sm:text-xl">Top all-time performers</h2>

            <div className="mt-5 space-y-4">
              {profiles.length === 0 && !loading ? (
                <div className="rounded-card border border-dashed border-line bg-overlay p-5 text-sm leading-6 text-ink-muted">
                  No public profiles yet. Create an account and complete practice sessions to start appearing here.
                </div>
              ) : (
                <>
                  <Leaderboard
                    title="Highest average score all-time"
                    description="Top students by overall average."
                    profiles={leaderboardByAverage}
                    valueOf={(profile) => profile.stats?.avgScore ?? 0}
                    onSelect={previewSelectedProfile}
                  />
                  <Leaderboard
                    title="Most practices all-time"
                    description="Top students by total practice count."
                    profiles={leaderboardByPractice}
                    accent="amber"
                    valueOf={(profile) => profile.stats?.practices ?? 0}
                    onSelect={previewSelectedProfile}
                  />
                </>
              )}
            </div>
          </section>
        </div>
      </div>

      {overlayProfile && (
        <ProfileOverlayModal profile={overlayProfile} onClose={() => setOverlayProfile(null)} />
      )}
    </div>
  );
}
