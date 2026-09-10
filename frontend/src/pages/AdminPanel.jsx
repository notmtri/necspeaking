import React, { useCallback, useEffect, useState } from 'react';
import { Activity, Bell, Database, Edit3, Eye, EyeOff, FileAudio, HelpCircle, Loader, Lock, LogOut, MessageSquare, Trash2, X } from 'lucide-react';
import { ConfirmModal, useOverlayDismiss } from '../components/AppOverlays';
import { FIELD_CLASSNAME } from '../components/ProfileBits';
import { apiFetch, isAbortError } from '../apiClient';

const EMPTY_ANNOUNCEMENT = { enabled: false, message: '' };
const MAX_ANNOUNCEMENT_LENGTH = 500;

const ADMIN_TABS = [
  { id: 'upload', label: 'Upload sample', icon: FileAudio },
  { id: 'manage', label: 'Samples', icon: Database },
  { id: 'questions', label: 'Questions', icon: HelpCircle },
  { id: 'announcement', label: 'Announcement', icon: Bell },
  { id: 'moderation', label: 'Moderation', icon: MessageSquare },
  { id: 'runtime', label: 'Runtime', icon: Activity },
];

function AdminField({ label, required, children, hint }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-ink-muted">
        {label}
        {required && <span className="ml-1 text-rose-300" aria-hidden="true">*</span>}
      </span>
      {children}
      {hint && <span className="mt-1 block text-xs text-ink-subtle">{hint}</span>}
    </label>
  );
}

function AdminCard({ title, icon: Icon, children }) {
  return (
    <section className="rounded-card border border-line bg-overlay p-4 sm:p-5">
      {title && (
        <div className="mb-4 flex items-center gap-2">
          {Icon && <Icon size={18} className="text-sky-200" />}
          <h3 className="text-base font-semibold text-white">{title}</h3>
        </div>
      )}
      {children}
    </section>
  );
}

function AdminButton({ tone = 'primary', onClick, disabled, className = '', children, ...rest }) {
  const toneClasses = {
    primary: 'bg-sky-500 text-white hover:bg-sky-400',
    neutral: 'border border-line bg-overlay text-slate-200 hover:bg-overlay-hover',
    success: 'bg-emerald-500 text-white hover:bg-emerald-400',
    danger: 'border border-rose-400/25 bg-rose-500/10 text-rose-100 hover:bg-rose-500/20',
    warning: 'border border-amber-300/25 bg-amber-300/10 text-amber-100 hover:bg-amber-300/20',
  }[tone];

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-2 rounded-control px-4 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${toneClasses} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}

export default function AdminPanel({ onClose, onLogout, notify, announcement, onAnnouncementChange }) {
  const [activeTab, setActiveTab] = useState('upload');
  const [audioFile, setAudioFile] = useState(null);
  const [topic, setTopic] = useState('');
  const [question, setQuestion] = useState('');
  const [speaker, setSpeaker] = useState('');
  const [score, setScore] = useState('2.0');
  const [transcript, setTranscript] = useState('');
  const [feedback, setFeedback] = useState('');
  const [uploading, setUploading] = useState(false);
  const [statusByScope, setStatusByScope] = useState({});
  const [samples, setSamples] = useState([]);
  const [loadingSamples, setLoadingSamples] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({});
  const [questions, setQuestions] = useState([]);
  const [loadingQuestions, setLoadingQuestions] = useState(true);
  const [newQuestionTopic, setNewQuestionTopic] = useState('');
  const [newQuestionText, setNewQuestionText] = useState('');
  const [editingQuestionId, setEditingQuestionId] = useState(null);
  const [editQuestionData, setEditQuestionData] = useState({});
  const [announcementDraft, setAnnouncementDraft] = useState(announcement || EMPTY_ANNOUNCEMENT);
  const [announcementSaving, setAnnouncementSaving] = useState(false);
  const [communityPosts, setCommunityPosts] = useState([]);
  const [loadingCommunityPosts, setLoadingCommunityPosts] = useState(false);
  const [runtimeStatus, setRuntimeStatus] = useState(null);
  const [loadingRuntime, setLoadingRuntime] = useState(false);
  const [confirmState, setConfirmState] = useState(null);

  useOverlayDismiss(true, onClose, { disabled: Boolean(confirmState) });

  useEffect(() => {
    setAnnouncementDraft(announcement || EMPTY_ANNOUNCEMENT);
  }, [announcement]);

  const setScopedStatus = useCallback((scope, text, tone = 'success') => {
    setStatusByScope((current) => ({ ...current, [scope]: { text, tone } }));
  }, []);

  const clearScopedStatus = useCallback((scope) => {
    setStatusByScope((current) => {
      const next = { ...current };
      delete next[scope];
      return next;
    });
  }, []);

  const renderStatus = useCallback((scope) => {
    const status = statusByScope[scope];
    if (!status?.text) return null;

    const toneClasses = status.tone === 'error'
      ? 'border-rose-400/20 bg-rose-500/10 text-rose-100'
      : 'border-emerald-400/20 bg-emerald-500/10 text-emerald-100';

    return (
      <div className={`mb-4 rounded-card border px-4 py-3 text-sm ${toneClasses}`} role={status.tone === 'error' ? 'alert' : 'status'}>
        {status.text}
      </div>
    );
  }, [statusByScope]);

  useEffect(() => {
    clearScopedStatus(activeTab);
  }, [activeTab, clearScopedStatus]);

  const fetchSamples = useCallback(async (signal) => {
    setLoadingSamples(true);
    try {
      const data = await apiFetch('/api/samples', { signal });
      setSamples(data.samples || []);
    } catch (error) {
      if (!isAbortError(error)) setScopedStatus('manage', error.message || 'Could not load samples.', 'error');
    } finally {
      if (!signal?.aborted) setLoadingSamples(false);
    }
  }, [setScopedStatus]);

  const fetchQuestions = useCallback(async (signal) => {
    setLoadingQuestions(true);
    try {
      const data = await apiFetch('/api/questions', { signal });
      setQuestions(data.questions || []);
    } catch (error) {
      if (!isAbortError(error)) setScopedStatus('questions', error.message || 'Could not load questions.', 'error');
    } finally {
      if (!signal?.aborted) setLoadingQuestions(false);
    }
  }, [setScopedStatus]);

  const fetchCommunityPosts = useCallback(async (signal) => {
    setLoadingCommunityPosts(true);
    try {
      const data = await apiFetch('/api/admin/community/posts', { signal });
      setCommunityPosts(data.posts || []);
    } catch (error) {
      if (!isAbortError(error)) setScopedStatus('moderation', error.message || 'Could not load community posts.', 'error');
    } finally {
      if (!signal?.aborted) setLoadingCommunityPosts(false);
    }
  }, [setScopedStatus]);

  const fetchRuntimeStatus = useCallback(async (signal) => {
    setLoadingRuntime(true);
    try {
      const data = await apiFetch('/api/admin/runtime', { signal });
      setRuntimeStatus(data.runtime || null);
    } catch (error) {
      if (!isAbortError(error)) setScopedStatus('runtime', error.message || 'Could not load runtime status.', 'error');
    } finally {
      if (!signal?.aborted) setLoadingRuntime(false);
    }
  }, [setScopedStatus]);

  useEffect(() => {
    const controller = new AbortController();
    if (activeTab === 'manage') fetchSamples(controller.signal);
    if (activeTab === 'questions') fetchQuestions(controller.signal);
    if (activeTab === 'moderation') fetchCommunityPosts(controller.signal);
    if (activeTab === 'runtime') fetchRuntimeStatus(controller.signal);
    return () => controller.abort();
  }, [activeTab, fetchCommunityPosts, fetchQuestions, fetchRuntimeStatus, fetchSamples]);

  const handleUpload = useCallback(async () => {
    if (!audioFile || !topic || !speaker || !transcript || !feedback) {
      setScopedStatus('upload', 'Fill in every required field before uploading.', 'error');
      return;
    }
    setUploading(true);
    clearScopedStatus('upload');
    const formData = new FormData();
    formData.append('audio', audioFile);
    formData.append('topic', topic);
    formData.append('question', question);
    formData.append('speaker', speaker);
    formData.append('score', score);
    formData.append('transcript', transcript);
    formData.append('feedback', feedback);
    try {
      const data = await apiFetch('/api/samples/upload', { method: 'POST', body: formData });
      if (data.success) {
        setScopedStatus('upload', 'Sample uploaded successfully.');
        notify?.('Sample uploaded.', 'success');
        setAudioFile(null);
        setTopic('');
        setQuestion('');
        setSpeaker('');
        setScore('2.0');
        setTranscript('');
        setFeedback('');
      } else {
        setScopedStatus('upload', data.error || 'Upload failed.', 'error');
      }
    } catch (error) {
      setScopedStatus('upload', error.message || 'Connection failed.', 'error');
    } finally {
      setUploading(false);
    }
  }, [audioFile, clearScopedStatus, feedback, notify, question, score, setScopedStatus, speaker, topic, transcript]);

  const startEdit = useCallback((sample) => {
    setEditingId(sample.id);
    setEditData({
      topic: sample.topic || '',
      question: sample.question || '',
      speaker: sample.speaker || '',
      score: String(sample.score ?? ''),
      transcript: sample.transcript || '',
      feedback: sample.feedback || '',
    });
  }, []);

  const cancelEdit = useCallback(() => {
    setEditingId(null);
    setEditData({});
  }, []);

  const saveEdit = useCallback(async () => {
    try {
      const form = new FormData();
      Object.entries(editData).forEach(([key, value]) => form.append(key, value));
      const data = await apiFetch(`/api/samples/${editingId}`, { method: 'PUT', body: form });
      if (data.success) {
        setScopedStatus('manage', 'Sample updated successfully.');
        notify?.('Sample updated.', 'success');
        await fetchSamples();
        cancelEdit();
      } else {
        setScopedStatus('manage', data.error || 'Update failed.', 'error');
      }
    } catch (error) {
      setScopedStatus('manage', error.message || 'Connection failed.', 'error');
    }
  }, [cancelEdit, editData, editingId, fetchSamples, notify, setScopedStatus]);

  const deleteSample = useCallback(async (id) => {
    try {
      const data = await apiFetch(`/api/samples/${id}`, { method: 'DELETE' });
      if (data.success) {
        setScopedStatus('manage', 'Sample deleted successfully.');
        notify?.('Sample deleted.', 'success');
        await fetchSamples();
      } else {
        setScopedStatus('manage', data.error || 'Delete failed.', 'error');
      }
    } catch (error) {
      setScopedStatus('manage', error.message || 'Connection failed.', 'error');
    }
  }, [fetchSamples, notify, setScopedStatus]);

  const addQuestion = useCallback(async () => {
    if (!newQuestionTopic || !newQuestionText) {
      setScopedStatus('questions', 'Fill in both the source and the question text.', 'error');
      return;
    }
    try {
      const data = await apiFetch('/api/questions', {
        method: 'POST',
        body: { topic: newQuestionTopic, question: newQuestionText },
      });
      if (data.success) {
        setScopedStatus('questions', 'Question added successfully.');
        notify?.('Question added.', 'success');
        setNewQuestionTopic('');
        setNewQuestionText('');
        await fetchQuestions();
      } else {
        setScopedStatus('questions', data.error || 'Failed to add question.', 'error');
      }
    } catch (error) {
      setScopedStatus('questions', error.message || 'Connection failed.', 'error');
    }
  }, [fetchQuestions, newQuestionText, newQuestionTopic, notify, setScopedStatus]);

  const startEditQuestion = useCallback((questionItem) => {
    setEditingQuestionId(questionItem.id);
    setEditQuestionData({ topic: questionItem.topic || '', question: questionItem.question || '' });
  }, []);

  const cancelEditQuestion = useCallback(() => {
    setEditingQuestionId(null);
    setEditQuestionData({});
  }, []);

  const saveEditQuestion = useCallback(async () => {
    try {
      const data = await apiFetch(`/api/questions/${editingQuestionId}`, { method: 'PUT', body: editQuestionData });
      if (data.success) {
        setScopedStatus('questions', 'Question updated.');
        notify?.('Question updated.', 'success');
        await fetchQuestions();
        cancelEditQuestion();
      } else {
        setScopedStatus('questions', data.error || 'Update failed.', 'error');
      }
    } catch (error) {
      setScopedStatus('questions', error.message || 'Connection failed.', 'error');
    }
  }, [cancelEditQuestion, editQuestionData, editingQuestionId, fetchQuestions, notify, setScopedStatus]);

  const deleteQuestion = useCallback(async (id) => {
    try {
      const data = await apiFetch(`/api/questions/${id}`, { method: 'DELETE' });
      if (data.success) {
        setScopedStatus('questions', 'Question deleted.');
        notify?.('Question deleted.', 'success');
        await fetchQuestions();
      } else {
        setScopedStatus('questions', data.error || 'Delete failed.', 'error');
      }
    } catch (error) {
      setScopedStatus('questions', error.message || 'Connection failed.', 'error');
    }
  }, [fetchQuestions, notify, setScopedStatus]);

  const confirmDeleteSample = useCallback((id) => {
    setConfirmState({
      title: 'Delete sample?',
      message: 'This sample and its attached admin data will be removed permanently.',
      confirmLabel: 'Delete sample',
      onConfirm: async () => {
        setConfirmState(null);
        await deleteSample(id);
      },
    });
  }, [deleteSample]);

  const confirmDeleteQuestion = useCallback((id) => {
    setConfirmState({
      title: 'Delete question?',
      message: 'This question will be removed from the simulation bank permanently.',
      confirmLabel: 'Delete question',
      onConfirm: async () => {
        setConfirmState(null);
        await deleteQuestion(id);
      },
    });
  }, [deleteQuestion]);

  const saveAnnouncement = useCallback(async () => {
    setAnnouncementSaving(true);
    clearScopedStatus('announcement');
    try {
      const data = await apiFetch('/api/admin/announcement', { method: 'PUT', body: announcementDraft });
      if (data.success && data.announcement) {
        setAnnouncementDraft(data.announcement);
        onAnnouncementChange?.(data.announcement);
        setScopedStatus('announcement', 'Announcement updated.');
        notify?.('Announcement updated.', 'success');
      }
    } catch (error) {
      setScopedStatus('announcement', error.message || 'Could not update announcement.', 'error');
    } finally {
      setAnnouncementSaving(false);
    }
  }, [announcementDraft, clearScopedStatus, notify, onAnnouncementChange, setScopedStatus]);

  const updatePostVisibility = useCallback(async (postId, hidden) => {
    try {
      const data = await apiFetch(`/api/admin/community/posts/${postId}/visibility`, {
        method: 'PUT',
        body: { hidden, reason: hidden ? 'Hidden by admin review.' : '' },
      });
      if (data.success && data.post) {
        setCommunityPosts((current) => current.map((post) => (post.id === postId ? data.post : post)));
        setScopedStatus('moderation', hidden ? 'Post hidden.' : 'Post restored.');
        notify?.(hidden ? 'Post hidden.' : 'Post restored.', 'success');
      }
    } catch (error) {
      setScopedStatus('moderation', error.message || 'Could not update post visibility.', 'error');
    }
  }, [notify, setScopedStatus]);

  const deleteCommunityPost = useCallback(async (postId) => {
    try {
      const data = await apiFetch(`/api/admin/community/posts/${postId}`, { method: 'DELETE' });
      if (data.success) {
        setCommunityPosts((current) => current.filter((post) => post.id !== postId));
        setScopedStatus('moderation', 'Post deleted.');
        notify?.('Post deleted.', 'success');
      }
    } catch (error) {
      setScopedStatus('moderation', error.message || 'Could not delete post.', 'error');
    }
  }, [notify, setScopedStatus]);

  const confirmDeletePost = useCallback((postId) => {
    setConfirmState({
      title: 'Delete post?',
      message: 'This community post will be removed permanently. Hiding it instead keeps a record.',
      confirmLabel: 'Delete post',
      onConfirm: async () => {
        setConfirmState(null);
        await deleteCommunityPost(postId);
      },
    });
  }, [deleteCommunityPost]);

  const runtimeRows = runtimeStatus ? [
    ['Rate limiter', runtimeStatus.rateLimiter],
    ['Embedded worker', String(runtimeStatus.embeddedWorker)],
    ['Redis configured', String(runtimeStatus.redisConfigured)],
    ['Production', String(runtimeStatus.production)],
    ['Queued jobs', runtimeStatus.queuedJobs ?? 0],
    ['Processing jobs', runtimeStatus.processingJobs ?? 0],
  ] : [];

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/80 p-3 backdrop-blur-sm sm:p-5">
      <div
        className="my-4 w-full max-w-7xl overflow-hidden rounded-panel border border-line bg-surface-raised"
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-panel-title"
      >
        <div className="border-b border-line px-4 py-3 sm:px-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-amber-300/25 bg-amber-300/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-amber-100">
              <Lock size={14} />
              <h2 id="admin-panel-title">Admin CMS</h2>
            </div>
            <div className="flex items-center gap-2">
              <AdminButton tone="neutral" onClick={onLogout} className="py-3">
                <LogOut size={16} />
                Log out
              </AdminButton>
              <button
                type="button"
                onClick={onClose}
                className="inline-flex h-12 w-12 items-center justify-center rounded-control border border-line bg-overlay text-slate-200 transition hover:bg-overlay-hover"
                aria-label="Close admin panel"
              >
                <X size={18} />
              </button>
            </div>
          </div>
        </div>

        <div className="border-b border-line px-4 py-3 sm:px-6">
          <div className="flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Admin sections">
            {ADMIN_TABS.map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setActiveTab(tab.id)}
                  className={`inline-flex shrink-0 items-center gap-2 rounded-control px-4 py-3 text-sm font-semibold transition ${
                    active
                      ? 'bg-white text-slate-950'
                      : 'border border-line bg-overlay text-ink-muted hover:bg-overlay-hover hover:text-white'
                  }`}
                >
                  <Icon size={16} />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="max-h-[78vh] overflow-y-auto p-5 sm:p-6">
          {activeTab === 'upload' && (
            <div className="space-y-4">
              {renderStatus('upload')}
              <AdminCard title="Upload a sample speech" icon={FileAudio}>
                <div className="space-y-4">
                  <AdminField label="Audio file" required hint="MP3, WAV, M4A, WEBM, or OGG.">
                    <input
                      type="file"
                      accept="audio/*"
                      onChange={(event) => setAudioFile(event.target.files[0] || null)}
                      className="w-full rounded-control border border-line bg-overlay px-4 py-3 text-sm text-ink-muted file:mr-3 file:rounded-control file:border-0 file:bg-sky-500 file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-white"
                    />
                  </AdminField>
                  <div className="grid gap-4 md:grid-cols-2">
                    <AdminField label="Topic" required>
                      <input value={topic} onChange={(event) => setTopic(event.target.value)} className={FIELD_CLASSNAME} />
                    </AdminField>
                    <AdminField label="Speaker" required>
                      <input value={speaker} onChange={(event) => setSpeaker(event.target.value)} className={FIELD_CLASSNAME} />
                    </AdminField>
                  </div>
                  <AdminField label="Score" required hint="Out of 2.0.">
                    <input value={score} onChange={(event) => setScore(event.target.value)} inputMode="decimal" className={FIELD_CLASSNAME} />
                  </AdminField>
                  <AdminField label="Speaking question">
                    <textarea value={question} onChange={(event) => setQuestion(event.target.value)} rows="2" className={FIELD_CLASSNAME} />
                  </AdminField>
                  <AdminField label="Transcript" required>
                    <textarea value={transcript} onChange={(event) => setTranscript(event.target.value)} rows="5" className={FIELD_CLASSNAME} />
                  </AdminField>
                  <AdminField label="Why this sample scored high" required>
                    <textarea value={feedback} onChange={(event) => setFeedback(event.target.value)} rows="4" className={FIELD_CLASSNAME} />
                  </AdminField>
                  <AdminButton onClick={handleUpload} disabled={uploading} className="w-full py-3">
                    {uploading ? 'Uploading...' : 'Upload sample'}
                  </AdminButton>
                </div>
              </AdminCard>
            </div>
          )}

          {activeTab === 'manage' && (
            <div>
              {renderStatus('manage')}
              {loadingSamples ? (
                <div className="py-8 text-center text-ink-muted">
                  <Loader className="mx-auto mb-2 animate-spin text-sky-300" size={36} />
                  <div>Loading samples...</div>
                </div>
              ) : samples.length === 0 ? (
                <div className="rounded-card border border-dashed border-line bg-overlay p-5 text-sm text-ink-muted">
                  No samples uploaded yet.
                </div>
              ) : (
                <div className="space-y-3">
                  {samples.map((sample) => (
                    <AdminCard key={sample.id}>
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-base font-semibold text-white">{sample.topic}</div>
                          <div className="mt-1 text-xs text-ink-subtle">{sample.speaker} | {sample.score}/2.0</div>
                        </div>
                        <div className="flex shrink-0 gap-2">
                          <AdminButton tone="neutral" onClick={() => startEdit(sample)} aria-label={`Edit ${sample.topic}`}>
                            <Edit3 size={14} />
                          </AdminButton>
                          <AdminButton tone="danger" onClick={() => confirmDeleteSample(sample.id)} aria-label={`Delete ${sample.topic}`}>
                            <Trash2 size={14} />
                          </AdminButton>
                          <a
                            href={sample.audioUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center gap-2 rounded-control border border-line bg-overlay px-4 py-2.5 text-sm font-semibold text-slate-200 transition hover:bg-overlay-hover"
                          >
                            <Eye size={14} />
                            Open
                          </a>
                        </div>
                      </div>
                      {editingId === sample.id && (
                        <div className="mt-4 space-y-3 border-t border-line pt-4">
                          <div className="grid gap-3 md:grid-cols-3">
                            <AdminField label="Topic">
                              <input value={editData.topic} onChange={(event) => setEditData({ ...editData, topic: event.target.value })} className={FIELD_CLASSNAME} />
                            </AdminField>
                            <AdminField label="Speaker">
                              <input value={editData.speaker} onChange={(event) => setEditData({ ...editData, speaker: event.target.value })} className={FIELD_CLASSNAME} />
                            </AdminField>
                            <AdminField label="Score">
                              <input value={editData.score} onChange={(event) => setEditData({ ...editData, score: event.target.value })} inputMode="decimal" className={FIELD_CLASSNAME} />
                            </AdminField>
                          </div>
                          <AdminField label="Question">
                            <textarea value={editData.question} onChange={(event) => setEditData({ ...editData, question: event.target.value })} rows="2" className={FIELD_CLASSNAME} />
                          </AdminField>
                          <AdminField label="Transcript">
                            <textarea value={editData.transcript} onChange={(event) => setEditData({ ...editData, transcript: event.target.value })} rows="3" className={FIELD_CLASSNAME} />
                          </AdminField>
                          <AdminField label="Feedback">
                            <textarea value={editData.feedback} onChange={(event) => setEditData({ ...editData, feedback: event.target.value })} rows="2" className={FIELD_CLASSNAME} />
                          </AdminField>
                          <div className="flex gap-2">
                            <AdminButton tone="success" onClick={saveEdit}>Save</AdminButton>
                            <AdminButton tone="neutral" onClick={cancelEdit}>Cancel</AdminButton>
                          </div>
                        </div>
                      )}
                    </AdminCard>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'questions' && (
            <div className="space-y-5">
              {renderStatus('questions')}
              <AdminCard title="Add new question" icon={HelpCircle}>
                <div className="space-y-3">
                  <AdminField label="Source">
                    <input value={newQuestionTopic} onChange={(event) => setNewQuestionTopic(event.target.value)} placeholder="NEC 25-26" className={FIELD_CLASSNAME} />
                  </AdminField>
                  <AdminField label="Question text">
                    <textarea value={newQuestionText} onChange={(event) => setNewQuestionText(event.target.value)} rows="3" className={FIELD_CLASSNAME} />
                  </AdminField>
                  <AdminButton onClick={addQuestion} className="w-full py-3">Add question</AdminButton>
                </div>
              </AdminCard>

              <div>
                <h3 className="mb-3 text-base font-semibold text-white">Question bank ({questions.length})</h3>
                {loadingQuestions ? (
                  <div className="py-8 text-center"><Loader className="mx-auto animate-spin text-sky-300" size={36} /></div>
                ) : questions.length === 0 ? (
                  <div className="rounded-card border border-dashed border-line bg-overlay p-5 text-sm text-ink-muted">
                    No questions yet. Add your first question above.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {questions.map((questionItem) => (
                      <AdminCard key={questionItem.id}>
                        {editingQuestionId === questionItem.id ? (
                          <div className="space-y-3">
                            <AdminField label="Source">
                              <input value={editQuestionData.topic} onChange={(event) => setEditQuestionData({ ...editQuestionData, topic: event.target.value })} className={FIELD_CLASSNAME} />
                            </AdminField>
                            <AdminField label="Question text">
                              <textarea value={editQuestionData.question} onChange={(event) => setEditQuestionData({ ...editQuestionData, question: event.target.value })} rows="3" className={FIELD_CLASSNAME} />
                            </AdminField>
                            <div className="flex gap-2">
                              <AdminButton tone="success" onClick={saveEditQuestion}>Save</AdminButton>
                              <AdminButton tone="neutral" onClick={cancelEditQuestion}>Cancel</AdminButton>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="mb-2 flex items-start justify-between gap-3">
                              <div className="text-base font-semibold text-white">{questionItem.topic}</div>
                              <div className="flex shrink-0 gap-2">
                                <AdminButton tone="neutral" onClick={() => startEditQuestion(questionItem)} aria-label="Edit question">
                                  <Edit3 size={14} />
                                </AdminButton>
                                <AdminButton tone="danger" onClick={() => confirmDeleteQuestion(questionItem.id)} aria-label="Delete question">
                                  <Trash2 size={14} />
                                </AdminButton>
                              </div>
                            </div>
                            <div className="text-sm leading-6 text-ink-muted">{questionItem.question}</div>
                          </>
                        )}
                      </AdminCard>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'announcement' && (
            <div className="space-y-5">
              {renderStatus('announcement')}
              <AdminCard title="Announcement bar" icon={Bell}>
                <div className="space-y-4">
                  <label className="flex items-center justify-between gap-4 rounded-control border border-line bg-overlay px-4 py-3">
                    <span>
                      <span className="block font-semibold text-white">Show announcement</span>
                      <span className="mt-1 block text-sm text-ink-muted">Display the banner directly under the main menu.</span>
                    </span>
                    <input
                      type="checkbox"
                      checked={Boolean(announcementDraft.enabled)}
                      onChange={(event) => setAnnouncementDraft((current) => ({ ...current, enabled: event.target.checked }))}
                      className="h-4 w-4 shrink-0"
                    />
                  </label>
                  <AdminField label="Announcement text" hint={`${(announcementDraft.message || '').length}/${MAX_ANNOUNCEMENT_LENGTH} characters.`}>
                    <textarea
                      value={announcementDraft.message || ''}
                      maxLength={MAX_ANNOUNCEMENT_LENGTH}
                      onChange={(event) => setAnnouncementDraft((current) => ({ ...current, message: event.target.value }))}
                      rows="4"
                      placeholder="IMPORTANT NOTICE: ..."
                      className={FIELD_CLASSNAME}
                    />
                  </AdminField>
                  <div className="rounded-control border border-line bg-surface-sunken/60 p-4">
                    <div className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-ink-subtle">Preview</div>
                    {announcementDraft.enabled && announcementDraft.message ? (
                      <div className="rounded-control border border-sky-400/20 bg-sky-400/10 px-4 py-2 text-center text-sm font-medium text-sky-200">
                        {announcementDraft.message}
                      </div>
                    ) : (
                      <div className="text-sm text-ink-muted">Announcement is currently hidden.</div>
                    )}
                  </div>
                  <AdminButton onClick={saveAnnouncement} disabled={announcementSaving} className="w-full py-3">
                    {announcementSaving ? 'Saving...' : 'Save announcement'}
                  </AdminButton>
                </div>
              </AdminCard>
            </div>
          )}

          {activeTab === 'moderation' && (
            <div className="space-y-5">
              {renderStatus('moderation')}
              {loadingCommunityPosts ? (
                <div className="py-8 text-center text-ink-muted">
                  <Loader className="mx-auto mb-2 animate-spin text-sky-300" size={36} />
                  <div>Loading community posts...</div>
                </div>
              ) : communityPosts.length === 0 ? (
                <div className="rounded-card border border-dashed border-line bg-overlay p-5 text-sm text-ink-muted">
                  No community posts found.
                </div>
              ) : (
                <div className="space-y-3">
                  {communityPosts.map((post) => (
                    <AdminCard key={post.id}>
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-base font-semibold text-white">{post.title}</div>
                          <div className="mt-1 text-xs text-ink-subtle">@{post.author?.username || 'unknown'} | reports: {post.reportedCount || 0}</div>
                        </div>
                        <div className="flex shrink-0 gap-2">
                          <AdminButton
                            tone="warning"
                            onClick={() => updatePostVisibility(post.id, !post.hidden)}
                          >
                            {post.hidden ? <Eye size={14} /> : <EyeOff size={14} />}
                            {post.hidden ? 'Restore' : 'Hide'}
                          </AdminButton>
                          <AdminButton tone="danger" onClick={() => confirmDeletePost(post.id)} aria-label="Delete post">
                            <Trash2 size={14} />
                          </AdminButton>
                        </div>
                      </div>
                      <p className="mt-3 whitespace-pre-line text-sm leading-6 text-ink-muted">{post.body}</p>
                      <div className="mt-3 text-xs text-ink-subtle">
                        Status: {post.hidden ? `hidden${post.hiddenReason ? ` - ${post.hiddenReason}` : ''}` : 'visible'}
                      </div>
                    </AdminCard>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'runtime' && (
            <div className="space-y-5">
              {renderStatus('runtime')}
              <AdminCard title="Runtime status" icon={Activity}>
                {loadingRuntime ? (
                  <div className="text-sm text-ink-muted">Loading runtime status...</div>
                ) : runtimeStatus ? (
                  <dl className="grid gap-3 sm:grid-cols-2">
                    {runtimeRows.map(([label, value]) => (
                      <div key={label} className="rounded-control border border-line bg-surface-sunken/60 p-3 text-sm text-slate-200">
                        <dt className="inline text-ink-muted">{label}: </dt>
                        <dd className="inline font-semibold text-white">{value}</dd>
                      </div>
                    ))}
                  </dl>
                ) : (
                  <div className="text-sm text-ink-muted">Runtime status unavailable.</div>
                )}
              </AdminCard>
            </div>
          )}
        </div>
      </div>

      <ConfirmModal
        open={Boolean(confirmState)}
        title={confirmState?.title}
        message={confirmState?.message}
        confirmLabel={confirmState?.confirmLabel}
        onConfirm={() => confirmState?.onConfirm?.()}
        onClose={() => setConfirmState(null)}
      />
    </div>
  );
}
