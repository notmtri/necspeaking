import React, { useCallback, useDeferredValue, useEffect, useMemo, useState } from 'react';
import { ArrowRight, Bell, Search, Trophy, Users, X } from 'lucide-react';
import { API_BASE_URL, createAvatarDataUri } from '../appShared';
import { CommitHeatmap, ProfileDetailRow, ProfileMetricCard, ProfileSectionCard, ProgressMiniChart } from '../components/ProfileBits';

function ProfileOverlayModal({ profile, onClose }) {
  const activeDays = (profile.commitWeeks || []).flat().filter((day) => day > 0).length;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/80 p-4 backdrop-blur-sm sm:p-6">
      <div className="relative my-4 w-full max-w-6xl rounded-[32px] border border-white/10 bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.16),_transparent_32%),linear-gradient(180deg,rgba(7,17,31,0.98),rgba(10,23,44,0.96))] shadow-[0_30px_120px_rgba(2,6,23,0.5)]">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-slate-300 transition hover:bg-white/[0.08] hover:text-white"
          aria-label="Close profile overlay"
        >
          <X size={18} />
        </button>

        <div className="border-b border-white/10 px-5 py-5 sm:px-8 sm:py-6">
          <div className="pr-12 text-xs font-semibold uppercase tracking-[0.22em] text-sky-200">Public profile</div>
          <h3 className="mt-3 pr-12 text-3xl font-black text-white sm:text-4xl">{profile.name}</h3>
          <div className="mt-2 text-base font-semibold text-sky-300">@{profile.username}</div>
        </div>

        <div className="grid gap-6 px-5 py-5 sm:px-8 sm:py-8 xl:grid-cols-[0.85fr_1.15fr]">
          <ProfileSectionCard title="Identity" eyebrow="User card">
            <div className="flex flex-col items-center text-center">
              <img
                src={profile.avatar || createAvatarDataUri(profile.name)}
                alt={`${profile.name} avatar`}
                className="h-40 w-40 rounded-[34px] border border-white/10 object-cover p-1 shadow-[0_18px_40px_rgba(2,6,23,0.35)] sm:h-48 sm:w-48"
              />
              <div className="mt-5 inline-flex items-center rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-300">
                {profile.role}
              </div>
              <p className="mt-4 max-w-xl text-sm leading-7 text-slate-300">{profile.bio || 'No bio added yet.'}</p>
            </div>
          </ProfileSectionCard>

          <div className="space-y-6">
            <ProfileSectionCard title="General info" eyebrow="Details">
              <div className="grid gap-4 sm:grid-cols-2">
                <ProfileDetailRow label="Name" value={profile.name} />
                <ProfileDetailRow label="Username" value={`@${profile.username}`} />
                <ProfileDetailRow label="Role" value={profile.role || 'Student'} />
                <ProfileDetailRow label="Class" value={profile.className || 'Not set'} />
                <ProfileDetailRow label="School" value={profile.school || 'Not set'} />
                <ProfileDetailRow label="Cohort" value={profile.cohort || 'Not set'} />
                <ProfileDetailRow label="Streak" value={`${profile.stats?.streak || 0} days`} />
              </div>
            </ProfileSectionCard>

            <ProfileSectionCard title="Stats" eyebrow="Performance">
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <ProfileMetricCard label="Practices" value={profile.stats?.practices || 0} tone="sky" />
                <ProfileMetricCard label="Average score" value={profile.stats?.avgScore || 0} tone="emerald" />
                <ProfileMetricCard label="Best score" value={profile.stats?.bestScore || 0} tone="amber" />
                <ProfileMetricCard label="Active days" value={activeDays} tone="slate" />
              </div>
            </ProfileSectionCard>

            <div className="grid gap-6 lg:grid-cols-2">
              <ProgressMiniChart points={profile.progress || []} />
              <CommitHeatmap weeks={profile.commitWeeks || []} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CommunityPage({ profiles, selectedProfile, onSelectProfile, currentUser, loading }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [communityPosts, setCommunityPosts] = useState([]);
  const [postsLoading, setPostsLoading] = useState(true);
  const [postError, setPostError] = useState('');
  const [postSubmitting, setPostSubmitting] = useState(false);
  const [overlayProfile, setOverlayProfile] = useState(null);
  const [postDraft, setPostDraft] = useState({
    title: '',
    body: '',
  });
  const deferredSearchTerm = useDeferredValue(searchTerm);
  const normalizedSearch = deferredSearchTerm.trim().toLowerCase().replace(/^@/, '');
  const matchedProfile = useMemo(
    () => profiles.find((profile) => profile.username.toLowerCase() === normalizedSearch) || null,
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

  const fetchCommunityPosts = useCallback(async () => {
    setPostsLoading(true);
    setPostError('');
    try {
      const response = await fetch(`${API_BASE_URL}/api/community/posts`, {
        credentials: 'include',
      });
      const data = await response.json();
      if (!response.ok) {
        setPostError(data.error || 'Could not load community posts.');
        setCommunityPosts([]);
        return;
      }
      setCommunityPosts(Array.isArray(data.posts) ? data.posts : []);
    } catch {
      setPostError('Could not load community posts.');
      setCommunityPosts([]);
    } finally {
      setPostsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCommunityPosts();
  }, [fetchCommunityPosts]);

  const submitPost = useCallback(async () => {
    const title = postDraft.title.trim();
    const body = postDraft.body.trim();
    if (!title || !body || !canCreatePost) return;

    setPostSubmitting(true);
    setPostError('');
    try {
      const response = await fetch(`${API_BASE_URL}/api/community/posts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ title, body }),
      });
      const data = await response.json();
      if (!response.ok || !data.post) {
        setPostError(data.error || 'Could not publish post.');
        return;
      }
      setCommunityPosts((current) => [data.post, ...current]);
      setPostDraft({ title: '', body: '' });
    } catch {
      setPostError('Could not publish post.');
    } finally {
      setPostSubmitting(false);
    }
  }, [canCreatePost, postDraft]);

  const previewSelectedProfile = useCallback((profile) => {
    if (!profile) return;
    setSearchTerm(`@${profile.username}`);
    onSelectProfile?.(profile.id);
    setOverlayProfile(profile);
  }, [onSelectProfile]);

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[36px] border border-white/10 bg-[radial-gradient(circle_at_top_left,_rgba(14,165,233,0.22),_transparent_30%),linear-gradient(135deg,_rgba(8,17,32,0.98),_rgba(5,10,18,0.95))] shadow-[0_24px_120px_rgba(2,6,23,0.45)]">
        <div className="flex flex-col gap-8 px-6 py-8 sm:px-8 lg:px-10">
          <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr] lg:items-end">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-sky-400/30 bg-sky-400/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-sky-200">
                <Users size={14} />
                Community
              </div>
              <h2 className="mt-4 text-4xl font-black text-white">Browse updates, compare scores, and preview public profiles</h2>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-300">
                The community hub now centers around live updates, quick notifications, and exact username lookups that reveal a profile-style preview.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,2.5fr)_minmax(0,1fr)]">
        <div className="space-y-6">
          <div className="rounded-[32px] border border-white/10 bg-slate-950/65 p-6 shadow-[0_20px_80px_rgba(2,6,23,0.4)] sm:p-8">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-slate-300">
                  <ArrowRight size={14} />
                  Community posts
                </div>
                <h3 className="mt-4 text-2xl font-black text-white">Post to the community</h3>
              </div>
              <div className="text-xs uppercase tracking-[0.28em] text-slate-500">Live feed</div>
            </div>
            <div className="mt-5 rounded-[28px] border border-white/10 bg-white/[0.04] p-4">
              {canCreatePost ? (
                <>
                  <div className="grid gap-3">
                    <label className="block">
                      <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Title</span>
                      <input
                        value={postDraft.title}
                        onChange={(event) => setPostDraft((current) => ({ ...current, title: event.target.value }))}
                        placeholder="Give your post a short headline"
                        className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-sky-400/30 focus:ring-2 focus:ring-sky-400/10"
                      />
                    </label>
                    <label className="block">
                      <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Post body</span>
                      <textarea
                        value={postDraft.body}
                        onChange={(event) => setPostDraft((current) => ({ ...current, body: event.target.value }))}
                        rows="4"
                        placeholder="Share a win, ask for feedback, or post a study update..."
                        className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-sky-400/30 focus:ring-2 focus:ring-sky-400/10"
                      />
                    </label>
                  </div>
                  <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="text-xs leading-6 text-slate-400">
                      Posting is available to every logged-in account.
                    </div>
                    <button
                      type="button"
                      onClick={submitPost}
                      disabled={postSubmitting}
                      className="inline-flex items-center justify-center gap-2 rounded-2xl bg-sky-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      <Bell size={15} />
                      {postSubmitting ? 'Publishing...' : 'Publish post'}
                    </button>
                  </div>
                </>
              ) : (
                <div className="flex flex-col gap-4 rounded-[24px] border border-dashed border-white/10 bg-slate-950/35 p-5 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="text-sm font-semibold text-white">Log in to post in the community</div>
                    <div className="mt-1 text-sm leading-6 text-slate-400">
                      The composer unlocks as soon as you sign in. Right now the feed is view-only for guests.
                    </div>
                  </div>
                  <div className="rounded-full border border-white/10 bg-white/[0.05] px-4 py-2 text-sm font-semibold text-slate-200">
                    Guest view
                  </div>
                </div>
              )}
              {postError && (
                <div className="mt-4 rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
                  {postError}
                </div>
              )}
            </div>

            <div className="mt-5 space-y-4">
              {postsLoading ? (
                <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-5 text-sm text-slate-400">
                  Loading posts...
                </div>
              ) : communityPosts.map((item) => (
                <div key={item.id} className="rounded-[24px] border border-white/10 bg-white/[0.04] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-sky-400/15 text-sky-200">
                        <Bell size={16} />
                      </div>
                      <div className="min-w-0">
                        <div className="truncate text-xs text-slate-300">{item.author?.name || 'Unknown user'}</div>
                        <div className="truncate text-[11px] text-slate-500">@{item.author?.username || 'unknown'}</div>
                      </div>
                    </div>
                    <div className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                      {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : ''}
                    </div>
                  </div>
                  <div className="mt-3 text-lg font-bold text-white">{item.title}</div>
                  <div className="mt-2 text-sm leading-7 text-slate-300">{item.body}</div>
                  <div className="mt-3 inline-flex rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">
                    {item.author?.role || 'Student'}
                  </div>
                </div>
              ))}
              {!postsLoading && communityPosts.length === 0 && (
                <div className="rounded-[24px] border border-dashed border-white/10 bg-white/[0.03] p-5 text-sm leading-7 text-slate-400">
                  No posts yet. The first published post will appear here.
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-[32px] border border-white/10 bg-slate-950/65 p-6 shadow-[0_20px_80px_rgba(2,6,23,0.4)] sm:p-8">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-slate-300">
                  <Search size={14} />
                  Search for user
                </div>
                <h3 className="mt-4 text-2xl font-black text-white">Find a public profile</h3>
              </div>
            </div>

            <div className="mt-5 flex items-center gap-3 rounded-[24px] border border-white/10 bg-white/[0.04] px-4 py-3">
              <Search size={16} className="shrink-0 text-slate-500" />
              <input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Type an exact username, like maria"
                className="w-full bg-transparent text-sm text-white outline-none placeholder:text-slate-500"
              />
            </div>

            {loading && (
              <div className="mt-4 rounded-[24px] border border-white/10 bg-white/[0.04] p-4 text-sm text-slate-300">
                Loading public profiles...
              </div>
            )}

            {previewProfile ? (
              <div className="mt-5 rounded-[24px] border border-white/10 bg-white/[0.04] p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <div className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Search result</div>
                    <div className="mt-2 text-xl font-bold text-white">{previewProfile.name}</div>
                    <div className="mt-1 text-sm text-sky-300">@{previewProfile.username}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setOverlayProfile(previewProfile)}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-sky-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-sky-400"
                  >
                    Open full profile
                  </button>
                </div>
                <div className="mt-4 text-sm leading-7 text-slate-300">
                  Full profile details now open in a large overlay so the layout stays readable on both desktop and mobile.
                </div>
              </div>
            ) : (
              <div className="mt-5 rounded-[24px] border border-dashed border-white/10 bg-white/[0.03] p-5 text-sm leading-7 text-slate-400">
                Type an exact username to reveal the profile preview.
              </div>
            )}
          </div>

          <div className="rounded-[32px] border border-white/10 bg-slate-950/65 p-6 shadow-[0_20px_80px_rgba(2,6,23,0.4)] sm:p-8">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-slate-300">
                  <Trophy size={14} />
                  Leaderboards
                </div>
                <h3 className="mt-4 text-2xl font-black text-white">Top all-time performers</h3>
              </div>
            </div>

            <div className="mt-5 space-y-4">
              {profiles.length === 0 && !loading && (
                <div className="rounded-[24px] border border-dashed border-white/10 bg-white/[0.03] p-5 text-sm leading-7 text-slate-400">
                  No public profiles yet. Create an account and complete practice sessions to start appearing here.
                </div>
              )}
              <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-4">
                <div className="text-sm font-bold text-white">Highest average score all-time</div>
                <div className="mt-1 text-sm text-slate-400">Top students by overall average.</div>
                <div className="mt-4 space-y-3">
                  {leaderboardByAverage.map((profile, index) => (
                    <button key={profile.id} type="button" onClick={() => previewSelectedProfile(profile)} className="flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-slate-950/35 px-3 py-3 text-left transition hover:bg-slate-900/70">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-sky-400/10 text-sm font-bold text-sky-200">{index + 1}</div>
                      <img src={profile.avatar || createAvatarDataUri(profile.name)} alt={`${profile.name} avatar`} className="h-10 w-10 rounded-2xl object-cover ring-1 ring-white/10" />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-semibold text-white">{profile.name}</div>
                        <div className="truncate text-xs text-slate-500">@{profile.username}</div>
                      </div>
                      <div className="text-sm font-semibold text-emerald-200">{profile.stats.avgScore}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-4">
                <div className="text-sm font-bold text-white">Most practices all-time</div>
                <div className="mt-1 text-sm text-slate-400">Top students by total practice count.</div>
                <div className="mt-4 space-y-3">
                  {leaderboardByPractice.map((profile, index) => (
                    <button key={profile.id} type="button" onClick={() => previewSelectedProfile(profile)} className="flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-slate-950/35 px-3 py-3 text-left transition hover:bg-slate-900/70">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-400/10 text-sm font-bold text-amber-200">{index + 1}</div>
                      <img src={profile.avatar || createAvatarDataUri(profile.name)} alt={`${profile.name} avatar`} className="h-10 w-10 rounded-2xl object-cover ring-1 ring-white/10" />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-semibold text-white">{profile.name}</div>
                        <div className="truncate text-xs text-slate-500">@{profile.username}</div>
                      </div>
                      <div className="text-sm font-semibold text-amber-200">{profile.stats.practices}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {overlayProfile && (
        <ProfileOverlayModal
          profile={overlayProfile}
          onClose={() => setOverlayProfile(null)}
        />
      )}
    </div>
  );
}
