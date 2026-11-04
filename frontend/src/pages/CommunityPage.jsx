import React, { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { ImagePlus, Medal, Search, Send, SmilePlus, X } from 'lucide-react';
import { POST_IMAGE_UPLOAD, TONES, apiAssetUrl, isAdminProfile, profileAvatar, profileCover, readImageAsResizedDataUri } from '../appShared';
import { apiFetch, isAbortError } from '../apiClient';
import { PageHeader } from '../components/AppChrome';
import { useOverlayDismiss } from '../components/AppOverlays';
import { FIELD_CLASSNAME } from '../components/ProfileBits';
import VerifyEmailNotice from '../components/VerifyEmailNotice';

const MAX_TITLE_LENGTH = 180;
const MAX_BODY_LENGTH = 4000;
export const REACTIONS = ['👍', '🩷', '😆', '🥲', '😮'];

function AdminBadge() {
  return (
    <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-400/10 dark:text-amber-200">
      Admin
    </span>
  );
}

function ProfileOverlayModal({ profile, onClose }) {
  useOverlayDismiss(true, onClose);
  const cover = profileCover(profile);
  const details = [profile.school, profile.className, profile.cohort && `Cohort ${profile.cohort}`].filter(Boolean);
  const stats = [
    { label: 'Practices', value: profile.stats?.practices || 0, tone: 'sky' },
    { label: 'Average', value: Number(profile.stats?.avgScore || 0).toFixed(2), tone: 'violet' },
    { label: 'Best', value: Number(profile.stats?.bestScore || 0).toFixed(2), tone: 'amber' },
    { label: 'Day streak', value: profile.stats?.streak || 0, tone: 'emerald' },
  ];

  return (
    <div className="fixed inset-0 z-[70] flex items-start justify-center overflow-y-auto bg-neutral-900/40 p-3 backdrop-blur-sm dark:bg-black/60 sm:items-center sm:p-6">
      <div className="relative my-4 w-full max-w-2xl overflow-hidden rounded-panel border border-line bg-surface-raised" role="dialog" aria-modal="true" aria-labelledby="profile-overlay-title">
        <div className="relative h-28 bg-gradient-to-r from-sky-200 via-violet-200 to-amber-200 dark:from-sky-400/25 dark:via-violet-400/20 dark:to-amber-400/20 sm:aspect-[4/1] sm:h-auto">
          {cover && <img src={cover} alt="" className="h-full w-full object-cover" />}
          <button
            type="button"
            onClick={onClose}
            className="absolute right-3 top-3 inline-flex h-10 w-10 items-center justify-center rounded-full bg-surface-raised/90 text-ink backdrop-blur-sm transition-colors hover:bg-surface-raised"
            aria-label="Close profile"
          >
            <X size={18} />
          </button>
        </div>
        <div className="px-5 pb-6 sm:px-7">
          <img src={profileAvatar(profile)} alt="" className="relative z-10 -mt-12 h-24 w-24 rounded-[1.75rem] border-4 border-surface-raised bg-surface-raised object-cover" />
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <h2 id="profile-overlay-title" className="text-2xl font-semibold text-ink">{profile.name}</h2>
            {isAdminProfile(profile) && <AdminBadge />}
          </div>
          <div className="mt-0.5 text-sm text-ink-muted">
            @{profile.username}
            {details.length > 0 && <span className="text-ink-subtle"> | {details.join(', ')}</span>}
          </div>
          {profile.bio && <p className="mt-4 text-sm leading-6 text-ink-muted">{profile.bio}</p>}
          <dl className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {stats.map((stat) => (
              <div key={stat.label} className={`rounded-card px-4 py-3 ${TONES[stat.tone].soft}`}>
                <dt className={`text-sm font-medium ${TONES[stat.tone].text}`}>{stat.label}</dt>
                <dd className="mt-1 font-display text-xl font-semibold tracking-[-0.03em] text-ink tabular">{stat.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </div>
  );
}

// An average over one or two attempts is mostly luck: before this rule four of
// the top five "highest average" students had practised exactly once.
export const MIN_RANKED_PRACTICES = 3;

export function rankByAverage(profiles, limit = 5) {
  return profiles
    .filter((profile) => (profile.stats?.practices || 0) >= MIN_RANKED_PRACTICES)
    .sort((a, b) => (b.stats?.avgScore || 0) - (a.stats?.avgScore || 0)
      || (b.stats?.practices || 0) - (a.stats?.practices || 0))
    .slice(0, limit);
}

// Places 1-3 wear their medal; the rest keep a number.
const MEDALS = [
  { label: '1st place', className: 'bg-gradient-to-br from-amber-200 to-yellow-500 text-amber-950 shadow-[inset_0_1px_0_rgb(255_255_255/0.6)]' },
  { label: '2nd place', className: 'bg-gradient-to-br from-slate-100 to-slate-400 text-slate-800 shadow-[inset_0_1px_0_rgb(255_255_255/0.6)]' },
  { label: '3rd place', className: 'bg-gradient-to-br from-orange-200 to-amber-700 text-orange-950 shadow-[inset_0_1px_0_rgb(255_255_255/0.5)]' },
];

function RankBadge({ index }) {
  const medal = MEDALS[index];
  if (medal) {
    return (
      <span className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${medal.className}`} aria-label={medal.label} title={medal.label}>
        <Medal size={16} aria-hidden="true" />
      </span>
    );
  }
  return (
    <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-overlay text-sm font-semibold text-ink-muted tabular">
      {index + 1}
    </span>
  );
}

function Leaderboard({ title, description, profiles, valueOf, onSelect }) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-ink">{title}</h3>
      <p className="mt-0.5 text-sm text-ink-muted">{description}</p>
      {profiles.length === 0 && (
        <p className="mt-4 text-sm text-ink-subtle">No one qualifies yet.</p>
      )}
      <ol className="mt-3 space-y-1">
        {profiles.map((profile, index) => (
          <li key={profile.id}>
            <button
              type="button"
              onClick={() => onSelect(profile)}
              className="flex w-full items-center gap-3 rounded-card px-2 py-2 text-left transition-colors duration-200 hover:bg-overlay"
            >
              <RankBadge index={index} />
              <img src={profileAvatar(profile)} alt="" className="h-9 w-9 shrink-0 rounded-full object-cover" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-ink">{profile.name}</span>
                <span className="block truncate text-xs text-ink-subtle">@{profile.username}</span>
              </span>
              <span className="font-display text-sm font-semibold text-ink tabular">{valueOf(profile)}</span>
            </button>
          </li>
        ))}
      </ol>
    </div>
  );
}

/**
 * Discord-style: only reactions someone has used show, each with its count
 * (yours highlighted, press to take it back), plus one button that opens the
 * five-emoji picker.
 */
function ReactionBar({ post, onReact }) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const wrapperRef = useRef(null);
  const mine = new Set(post.myReactions || []);
  const used = REACTIONS.filter((emoji) => (post.reactions?.[emoji] || 0) > 0);

  useEffect(() => {
    if (!pickerOpen) return undefined;
    const close = (event) => {
      if (event.type === 'keydown' ? event.key === 'Escape' : !wrapperRef.current?.contains(event.target)) setPickerOpen(false);
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', close);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', close);
    };
  }, [pickerOpen]);

  return (
    <div ref={wrapperRef} className="relative flex flex-wrap items-center gap-1.5" role="group" aria-label="Reactions">
      {used.map((emoji) => {
        const count = post.reactions[emoji];
        const active = mine.has(emoji);
        return (
          <button
            key={emoji}
            type="button"
            onClick={() => onReact(post.id, emoji)}
            aria-pressed={active}
            aria-label={`React ${emoji}, ${count} ${count === 1 ? 'reaction' : 'reactions'}`}
            className={`inline-flex h-8 items-center gap-1.5 rounded-full border px-2.5 text-sm transition-colors duration-200 ${
              active
                ? 'border-sky-400 bg-sky-50 text-sky-800 dark:border-sky-400/60 dark:bg-sky-400/15 dark:text-sky-100'
                : 'border-line bg-surface-sunken text-ink-muted hover:border-overlay-hover'
            }`}
          >
            <span aria-hidden="true">{emoji}</span>
            <span className="text-xs font-semibold tabular">{count}</span>
          </button>
        );
      })}

      <button
        type="button"
        onClick={() => setPickerOpen((open) => !open)}
        aria-expanded={pickerOpen}
        aria-label="Add reaction"
        title="Add reaction"
        className={`inline-flex h-8 w-9 items-center justify-center rounded-full border transition-colors duration-200 ${
          pickerOpen ? 'border-line bg-overlay text-ink' : 'border-transparent text-ink-subtle hover:border-line hover:bg-overlay hover:text-ink'
        }`}
      >
        <SmilePlus size={17} />
      </button>

      {pickerOpen && (
        <div
          className="absolute bottom-full left-0 z-20 mb-2 flex gap-1 rounded-full border border-line bg-surface-raised p-1.5 shadow-[0_12px_32px_-12px_oklch(0.3_0.05_250/0.35)] dark:shadow-[0_12px_32px_-12px_oklch(0_0_0/0.8)]"
          role="group"
          aria-label="Choose a reaction"
        >
          {REACTIONS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => {
                onReact(post.id, emoji);
                setPickerOpen(false);
              }}
              aria-pressed={mine.has(emoji)}
              aria-label={`${mine.has(emoji) ? 'Remove' : 'Add'} ${emoji}`}
              className={`inline-flex h-9 w-9 items-center justify-center rounded-full text-lg transition-transform duration-150 hover:scale-110 hover:bg-overlay ${mine.has(emoji) ? 'bg-sky-50 dark:bg-sky-400/15' : ''}`}
            >
              {emoji}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function PostCard({ item, onReact, onReport, reporting, reported, onOpenAuthor }) {
  return (
    <article className="min-w-0 py-6 first:pt-0 last:pb-0">
      <div className="flex items-center gap-3">
        <button type="button" onClick={() => onOpenAuthor(item.author)} className="shrink-0" aria-label={`Open ${item.author?.name || 'author'}'s profile`}>
          <img src={profileAvatar(item.author)} alt="" className="h-10 w-10 rounded-full object-cover" />
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <span className="truncate text-sm font-semibold text-ink">{item.author?.name || 'Unknown user'}</span>
            {isAdminProfile(item.author) && <AdminBadge />}
          </div>
          <div className="truncate text-xs text-ink-subtle">
            @{item.author?.username || 'unknown'}
            {item.createdAt && <> | <time dateTime={item.createdAt}>{new Date(item.createdAt).toLocaleDateString()}</time></>}
          </div>
        </div>
      </div>
      <h3 className="mt-4 text-base font-semibold text-ink">{item.title}</h3>
      <p className="mt-1.5 whitespace-pre-line text-sm leading-6 text-ink-muted">{item.body}</p>
      {item.imageUrl && (
        <img
          src={apiAssetUrl(item.imageUrl)}
          alt=""
          loading="lazy"
          className="mt-4 max-h-[28rem] w-full rounded-card border border-line object-cover"
        />
      )}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <ReactionBar post={item} onReact={onReact} />
        <button
          type="button"
          onClick={() => onReport(item.id)}
          disabled={reporting || reported}
          className="rounded-full px-2.5 py-1 text-xs font-medium text-ink-subtle transition-colors hover:bg-overlay hover:text-ink disabled:opacity-60"
        >
          {reporting ? 'Reporting...' : reported ? 'Reported' : 'Report'}
        </button>
      </div>
    </article>
  );
}

export default function CommunityPage({ profiles, selectedProfile, onSelectProfile, currentUser, loading, emailEnabled = false, onEmailVerified = null }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [communityPosts, setCommunityPosts] = useState([]);
  const [postsLoading, setPostsLoading] = useState(true);
  const [postError, setPostError] = useState('');
  const [postSubmitting, setPostSubmitting] = useState(false);
  const [reportingPostId, setReportingPostId] = useState(null);
  const [overlayProfile, setOverlayProfile] = useState(null);
  const [postDraft, setPostDraft] = useState({ title: '', body: '', image: '' });
  const imageInputRef = useRef(null);

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
    () => rankByAverage(profiles),
    [profiles],
  );

  // Matches the backend: posting needs a confirmed email once email is set up.
  const needsVerification = Boolean(currentUser) && emailEnabled && !currentUser.emailVerified;
  const canCreatePost = Boolean(currentUser) && !needsVerification;
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

  const attachImage = useCallback(async (file) => {
    if (!file) return;
    setPostError('');
    try {
      const image = await readImageAsResizedDataUri(file, POST_IMAGE_UPLOAD);
      setPostDraft((current) => ({ ...current, image }));
    } catch (error) {
      setPostError(error.message || 'Could not use that image.');
    }
  }, []);

  const submitPost = useCallback(async () => {
    if (!canSubmitPost) return;

    setPostSubmitting(true);
    setPostError('');
    try {
      const data = await apiFetch('/api/community/posts', {
        method: 'POST',
        body: { title: trimmedTitle, body: trimmedBody, ...(postDraft.image ? { image: postDraft.image } : {}) },
      });
      if (!data.post) {
        setPostError(data.error || 'Could not publish post.');
        return;
      }
      setCommunityPosts((current) => [data.post, ...current]);
      setPostDraft({ title: '', body: '', image: '' });
    } catch (error) {
      setPostError(error.message || 'Could not publish post.');
    } finally {
      setPostSubmitting(false);
    }
  }, [canSubmitPost, postDraft.image, trimmedBody, trimmedTitle]);

  const previewSelectedProfile = useCallback((profile) => {
    if (!profile) return;
    setSearchTerm(`@${profile.username}`);
    onSelectProfile?.(profile.id);
    setOverlayProfile(profile);
  }, [onSelectProfile]);

  // A post's author record is slimmer than a public profile; use the full one when listed.
  const openAuthor = useCallback((author) => {
    if (!author) return;
    const full = profiles.find((profile) => profile.username === author.username);
    setOverlayProfile(full || author);
  }, [profiles]);

  // Reports count once per account (the server enforces it); this only
  // remembers which posts were reported here so the button can say so.
  const [reportedPostIds, setReportedPostIds] = useState(() => new Set());

  const reportPost = useCallback(async (postId) => {
    if (!currentUser) {
      setPostError('Log in to report a post.');
      return;
    }
    setReportingPostId(postId);
    setPostError('');
    try {
      const data = await apiFetch(`/api/community/posts/${postId}/report`, { method: 'POST' });
      if (data.success) {
        setReportedPostIds((current) => new Set(current).add(postId));
        setCommunityPosts((current) => (data.hidden
          ? current.filter((post) => post.id !== postId)
          : current.map((post) => (post.id === postId ? { ...post, reportedCount: data.reportedCount } : post))));
      }
    } catch (error) {
      setPostError(error.message || 'Could not report post.');
    } finally {
      setReportingPostId(null);
    }
  }, [currentUser]);

  const reactToPost = useCallback(async (postId, emoji) => {
    if (!currentUser) {
      setPostError('Log in to react to posts.');
      return;
    }
    // Show it straight away; the server's counts replace the guess.
    setCommunityPosts((current) => current.map((post) => {
      if (post.id !== postId) return post;
      const mine = new Set(post.myReactions || []);
      const had = mine.has(emoji);
      if (had) mine.delete(emoji); else mine.add(emoji);
      const count = Math.max(0, (post.reactions?.[emoji] || 0) + (had ? -1 : 1));
      return { ...post, myReactions: [...mine], reactions: { ...post.reactions, [emoji]: count } };
    }));
    try {
      const data = await apiFetch(`/api/community/posts/${postId}/reactions`, { method: 'POST', body: { emoji } });
      if (data.reactions) {
        setCommunityPosts((current) => current.map((post) => (
          post.id === postId ? { ...post, reactions: data.reactions, myReactions: data.myReactions || [] } : post
        )));
      }
    } catch (error) {
      setPostError(error.message || 'Could not save your reaction.');
      fetchCommunityPosts();
    }
  }, [currentUser, fetchCommunityPosts]);

  return (
    <div className="min-w-0 space-y-8">
      <PageHeader
        id="community-page-title"
        title="Community"
        description="View community posts from all users and see your ranking."
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)] lg:items-start">
        <section className="min-w-0 rounded-panel border border-line bg-surface-raised p-5 sm:p-7" aria-labelledby="community-feed">
          <h2 id="community-feed" className="text-xl font-semibold text-ink">Post to the community</h2>

          <div className="mt-5">
            {needsVerification ? (
              <VerifyEmailNotice
                email={currentUser.email}
                title="Confirm your email to post"
                reason="It keeps the community free of throwaway accounts."
                onVerified={onEmailVerified}
              />
            ) : canCreatePost ? (
              <div className="flex gap-3">
                <img src={profileAvatar(currentUser)} alt="" className="hidden h-10 w-10 shrink-0 rounded-full object-cover sm:block" />
                <div className="min-w-0 flex-1 space-y-3">
                  <label className="block">
                    <span className="sr-only">Title</span>
                    <input
                      value={postDraft.title}
                      maxLength={MAX_TITLE_LENGTH}
                      onChange={(event) => setPostDraft((current) => ({ ...current, title: event.target.value }))}
                      placeholder="Give your post a short headline"
                      className={FIELD_CLASSNAME}
                    />
                  </label>
                  <label className="block">
                    <span className="sr-only">Post body</span>
                    <textarea
                      value={postDraft.body}
                      maxLength={MAX_BODY_LENGTH}
                      onChange={(event) => setPostDraft((current) => ({ ...current, body: event.target.value }))}
                      rows="4"
                      placeholder="Share a win, ask for feedback, or post a study update..."
                      className={FIELD_CLASSNAME}
                    />
                  </label>
                  {postDraft.image && (
                    <div className="relative inline-block">
                      <img src={postDraft.image} alt="Attached" className="max-h-48 rounded-card border border-line object-cover" />
                      <button
                        type="button"
                        onClick={() => setPostDraft((current) => ({ ...current, image: '' }))}
                        className="absolute right-2 top-2 inline-flex h-8 w-8 items-center justify-center rounded-full bg-surface-raised/90 text-ink shadow-sm transition-colors hover:bg-surface-raised"
                        aria-label="Remove image"
                      >
                        <X size={15} />
                      </button>
                    </div>
                  )}
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => imageInputRef.current?.click()}
                        className="inline-flex items-center gap-2 rounded-full border border-line px-3.5 py-2 text-sm font-medium text-ink transition-colors hover:bg-overlay"
                      >
                        <ImagePlus size={16} className="text-sky-600 dark:text-sky-300" />
                        {postDraft.image ? 'Change image' : 'Add image'}
                      </button>
                      <input
                        ref={imageInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(event) => {
                          attachImage(event.target.files?.[0]);
                          event.target.value = '';
                        }}
                      />
                      <span className="text-xs text-ink-subtle tabular">{trimmedBody.length}/{MAX_BODY_LENGTH}</span>
                    </div>
                    <button
                      type="button"
                      onClick={submitPost}
                      disabled={!canSubmitPost}
                      className="inline-flex items-center justify-center gap-2 rounded-full bg-ink px-5 py-2.5 text-sm font-medium text-on-ink transition-colors hover:bg-ink/85 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Send size={15} />
                      {postSubmitting ? 'Publishing...' : 'Publish post'}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-card bg-surface-sunken p-5">
                <div className="text-sm font-semibold text-ink">Log in to post in the community</div>
                <div className="mt-1 text-sm leading-6 text-ink-muted">
                  The composer unlocks as soon as you sign in. Right now the feed is view-only for guests.
                </div>
              </div>
            )}
            {postError && (
              <div className="mt-4 rounded-card border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 dark:border-rose-400/25 dark:bg-rose-400/10 dark:text-rose-200" role="alert">
                {postError}
              </div>
            )}
          </div>

          <div className="mt-6 divide-y divide-line border-t border-line pt-6">
            {postsLoading ? (
              <div className="space-y-3" aria-hidden="true">
                {[0, 1].map((row) => <div key={row} className="h-28 animate-pulse rounded-card bg-overlay" />)}
              </div>
            ) : communityPosts.length === 0 ? (
              <p className="text-sm leading-6 text-ink-muted">No posts yet. The first published post will appear here.</p>
            ) : communityPosts.map((item) => (
              <PostCard
                key={item.id}
                item={item}
                onReact={reactToPost}
                onReport={reportPost}
                reporting={reportingPostId === item.id}
                reported={reportedPostIds.has(item.id)}
                onOpenAuthor={openAuthor}
              />
            ))}
          </div>
        </section>

        <div className="min-w-0 space-y-6 lg:sticky lg:top-24">
          <section className="rounded-panel border border-line bg-surface-raised p-5 sm:p-6" aria-labelledby="find-profile">
            <h2 id="find-profile" className="text-lg font-semibold text-ink">Find a public profile</h2>
            <label className="mt-4 flex items-center gap-3 rounded-card border border-line bg-surface-raised px-4 py-2.5 transition-colors focus-within:border-sky-400 focus-within:ring-4 focus-within:ring-sky-100 dark:focus-within:ring-sky-400/20">
              <Search size={16} className="shrink-0 text-ink-subtle" />
              <span className="sr-only">Search by username</span>
              <input
                type="search"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Type an exact username"
                className="w-full min-w-0 bg-transparent text-sm text-ink outline-none placeholder:text-ink-subtle"
              />
            </label>

            {loading && <p className="mt-3 text-sm text-ink-muted">Loading public profiles...</p>}

            {previewProfile ? (
              <button
                type="button"
                onClick={() => setOverlayProfile(previewProfile)}
                className="mt-4 flex w-full items-center gap-3 rounded-card bg-surface-sunken p-3 text-left transition-colors hover:bg-overlay"
              >
                <img src={profileAvatar(previewProfile)} alt="" className="h-11 w-11 shrink-0 rounded-full object-cover" />
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="truncate text-sm font-semibold text-ink">{previewProfile.name}</span>
                    {isAdminProfile(previewProfile) && <AdminBadge />}
                  </span>
                  <span className="block truncate text-xs text-ink-subtle">@{previewProfile.username}</span>
                </span>
                <span className="text-sm font-medium text-sky-700 dark:text-sky-300">Open full profile</span>
              </button>
            ) : (
              <p className="mt-3 text-sm leading-6 text-ink-subtle">Type an exact username to reveal the profile preview.</p>
            )}
          </section>

          <section className="rounded-panel border border-line bg-surface-raised p-5 sm:p-6" aria-labelledby="leaderboards">
            <h2 id="leaderboards" className="text-lg font-semibold text-ink">Top all-time performers</h2>
            <div className="mt-5 space-y-7">
              {profiles.length === 0 && !loading ? (
                <p className="text-sm leading-6 text-ink-muted">
                  No public profiles yet. Create an account and complete practice sessions to start appearing here.
                </p>
              ) : (
                <>
                  <Leaderboard
                    title="Highest average score all-time"
                    description={`Top students by overall average, from ${MIN_RANKED_PRACTICES} or more practices.`}
                    profiles={leaderboardByAverage}
                    valueOf={(profile) => Number(profile.stats?.avgScore ?? 0).toFixed(2)}
                    onSelect={previewSelectedProfile}
                  />
                  <Leaderboard
                    title="Most practices all-time"
                    description="Top students by total practice count."
                    profiles={leaderboardByPractice}
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
