import React, { useCallback, useEffect, useState } from 'react';
import { Activity, Bell, Database, Edit3, EyeOff, FileAudio, HelpCircle, Loader, Lock, LogOut, MessageSquare, Trash2, X } from 'lucide-react';
import { ConfirmModal } from '../components/AppOverlays';
import { apiFetch, isAbortError } from '../apiClient';

const EMPTY_ANNOUNCEMENT = { enabled: false, message: '' };
const ADMIN_TABS = [
  { id: 'upload', label: 'Upload Sample', icon: FileAudio },
  { id: 'manage', label: 'Samples', icon: Database },
  { id: 'questions', label: 'Questions', icon: HelpCircle },
  { id: 'announcement', label: 'Announcement', icon: Bell },
  { id: 'moderation', label: 'Moderation', icon: MessageSquare },
  { id: 'runtime', label: 'Runtime', icon: Activity },
];

function AdminPanel({ onClose, onLogout, notify, announcement, onAnnouncementChange }) {
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
      ? 'border border-rose-400/20 bg-rose-500/10 text-rose-100'
      : 'border border-emerald-400/20 bg-emerald-500/10 text-emerald-100';

    return (
      <div className={`mb-4 rounded-lg px-3 py-2 text-sm ${toneClasses}`}>
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
      if (!isAbortError(error)) {
        console.error(error);
        setScopedStatus('manage', error.message || 'Could not load samples.', 'error');
      }
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
      if (!isAbortError(error)) {
        console.error(error);
        setScopedStatus('questions', error.message || 'Could not load questions.', 'error');
      }
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
      if (!isAbortError(error)) {
        console.error(error);
        setScopedStatus('moderation', error.message || 'Could not load community posts.', 'error');
      }
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
      if (!isAbortError(error)) {
        console.error(error);
        setScopedStatus('runtime', error.message || 'Could not load runtime status.', 'error');
      }
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
      setScopedStatus('upload', 'Please fill in all fields.', 'error');
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
      score: String(sample.score || ''),
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
      setScopedStatus('questions', 'Please fill in topic and question.', 'error');
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
      const data = await apiFetch(`/api/questions/${editingQuestionId}`, {
        method: 'PUT',
        body: editQuestionData,
      });
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
      const data = await apiFetch('/api/admin/announcement', {
        method: 'PUT',
        body: announcementDraft,
      });
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
        body: {
          hidden,
          reason: hidden ? 'Hidden by admin review.' : '',
        },
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

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/80 p-3 backdrop-blur-sm sm:p-5">
      <div className="my-4 w-full max-w-7xl overflow-hidden rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(7,17,31,0.98),rgba(10,23,44,0.97))] shadow-[0_30px_120px_rgba(2,6,23,0.55)]">
        <div className="border-b border-white/10 px-4 py-3 sm:px-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-sky-400/20 bg-sky-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-sky-100">
              <Lock size={14} />
              Admin CMS
            </div>
            <div className="flex items-center gap-2">
              <button onClick={onLogout} className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-semibold text-slate-200 transition hover:bg-white/[0.08]">
                <LogOut size={16} />
                Log out
              </button>
              <button onClick={onClose} className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-slate-200 transition hover:bg-white/[0.08]" aria-label="Close admin panel" title="Close admin panel">
                <X size={18} />
              </button>
            </div>
          </div>
        </div>

        <div className="border-b border-white/10 px-4 py-3 sm:px-6">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {ADMIN_TABS.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`inline-flex shrink-0 items-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold transition ${
                    activeTab === tab.id
                      ? 'bg-white text-slate-950'
                      : 'border border-white/10 bg-white/[0.04] text-slate-300 hover:bg-white/[0.08] hover:text-white'
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
        {activeTab === 'upload' ? (
          <div className="space-y-4">
            {renderStatus('upload')}
            <div><label className="block text-sm font-semibold mb-1">Audio File *</label><input type="file" accept="audio/*" onChange={(event) => setAudioFile(event.target.files[0])} className="w-full text-sm" /></div>
            <div><label className="block text-sm font-semibold mb-1">Topic *</label><input value={topic} onChange={(event) => setTopic(event.target.value)} className="w-full px-3 py-2 rounded bg-gray-900 border border-gray-700" /></div>
            <div><label className="block text-sm font-semibold mb-1">Speaking Question</label><textarea value={question} onChange={(event) => setQuestion(event.target.value)} rows="2" className="w-full px-3 py-2 rounded bg-gray-900 border border-gray-700" /></div>
            <div><label className="block text-sm font-semibold mb-1">Speaker *</label><input value={speaker} onChange={(event) => setSpeaker(event.target.value)} className="w-full px-3 py-2 rounded bg-gray-900 border border-gray-700" /></div>
            <div><label className="block text-sm font-semibold mb-1">Score *</label><input value={score} onChange={(event) => setScore(event.target.value)} className="w-full px-3 py-2 rounded bg-gray-900 border border-gray-700" /></div>
            <div><label className="block text-sm font-semibold mb-1">Transcript *</label><textarea value={transcript} onChange={(event) => setTranscript(event.target.value)} rows="5" className="w-full px-3 py-2 rounded bg-gray-900 border border-gray-700" /></div>
            <div><label className="block text-sm font-semibold mb-1">Why This Sample Scored High *</label><textarea value={feedback} onChange={(event) => setFeedback(event.target.value)} rows="4" className="w-full px-3 py-2 rounded bg-gray-900 border border-gray-700" /></div>
            <button onClick={handleUpload} disabled={uploading} className="w-full py-3 rounded bg-[#1e90ff] text-white">{uploading ? 'Uploading...' : 'Upload Sample'}</button>
          </div>
        ) : activeTab === 'manage' ? (
          <div>
            {renderStatus('manage')}
            {loadingSamples ? (
              <div className="text-center py-8"><Loader className="animate-spin mx-auto mb-2" size={36} /><div>Loading samples...</div></div>
            ) : (
              <div className="space-y-3">
                {samples.map((sample) => (
                  <div key={sample.id} className="p-3 bg-gray-900 border border-gray-700 rounded flex flex-col gap-2">
                    <div className="flex justify-between items-start gap-3">
                      <div><div className="font-bold">{sample.topic}</div><div className="text-xs text-gray-400">{sample.speaker} | {sample.score}/2.0</div></div>
                      <div className="flex gap-2">
                        <button onClick={() => startEdit(sample)} className="px-2 py-1 rounded bg-blue-600 text-white"><Edit3 size={14} /></button>
                        <button onClick={() => confirmDeleteSample(sample.id)} className="px-2 py-1 rounded bg-red-600 text-white"><Trash2 size={14} /></button>
                        <a href={sample.audioUrl} target="_blank" rel="noreferrer" className="px-2 py-1 rounded bg-gray-700">Open</a>
                      </div>
                    </div>
                    {editingId === sample.id && (
                      <div className="pt-2 space-y-2">
                        <input value={editData.topic} onChange={(event) => setEditData({ ...editData, topic: event.target.value })} placeholder="Topic" className="w-full px-2 py-1 rounded bg-gray-900 border border-gray-700" />
                        <input value={editData.speaker} onChange={(event) => setEditData({ ...editData, speaker: event.target.value })} placeholder="Speaker" className="w-full px-2 py-1 rounded bg-gray-900 border border-gray-700" />
                        <input value={editData.score} onChange={(event) => setEditData({ ...editData, score: event.target.value })} placeholder="Score" className="w-full px-2 py-1 rounded bg-gray-900 border border-gray-700" />
                        <textarea value={editData.question} onChange={(event) => setEditData({ ...editData, question: event.target.value })} rows="2" placeholder="Question" className="w-full px-2 py-1 rounded bg-gray-900 border border-gray-700" />
                        <textarea value={editData.transcript} onChange={(event) => setEditData({ ...editData, transcript: event.target.value })} rows="3" placeholder="Transcript" className="w-full px-2 py-1 rounded bg-gray-900 border border-gray-700" />
                        <textarea value={editData.feedback} onChange={(event) => setEditData({ ...editData, feedback: event.target.value })} rows="2" placeholder="Feedback" className="w-full px-2 py-1 rounded bg-gray-900 border border-gray-700" />
                        <div className="flex gap-2">
                          <button onClick={saveEdit} className="px-3 py-2 rounded bg-green-600">Save</button>
                          <button onClick={cancelEdit} className="px-3 py-2 rounded bg-gray-700">Cancel</button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : activeTab === 'questions' ? (
          <div className="space-y-6">
            {renderStatus('questions')}
            <div className="p-4 bg-gray-900 rounded-xl border border-gray-700">
              <h3 className="font-bold mb-3">Add New Question</h3>
              <div className="space-y-3">
                <input value={newQuestionTopic} onChange={(event) => setNewQuestionTopic(event.target.value)} placeholder="Source" className="w-full px-3 py-2 rounded bg-gray-800 border border-gray-700" />
                <textarea value={newQuestionText} onChange={(event) => setNewQuestionText(event.target.value)} placeholder="Question text..." rows="3" className="w-full px-3 py-2 rounded bg-gray-800 border border-gray-700" />
                <button onClick={addQuestion} className="w-full py-2 rounded bg-[#1e90ff] text-white font-semibold">Add Question</button>
              </div>
            </div>
            <div>
              <h3 className="font-bold mb-3">Question Bank ({questions.length} questions)</h3>
              {loadingQuestions ? (
                <div className="text-center py-8"><Loader className="animate-spin mx-auto" size={36} /></div>
              ) : questions.length === 0 ? (
                <div className="text-center py-8 text-gray-400">No questions yet. Add your first question above!</div>
              ) : (
                <div className="space-y-3">
                  {questions.map((questionItem) => (
                    <div key={questionItem.id} className="p-3 bg-gray-900 border border-gray-700 rounded">
                      {editingQuestionId === questionItem.id ? (
                        <div className="space-y-2">
                          <input value={editQuestionData.topic} onChange={(event) => setEditQuestionData({ ...editQuestionData, topic: event.target.value })} className="w-full px-2 py-1 rounded bg-gray-800 border border-gray-700" />
                          <textarea value={editQuestionData.question} onChange={(event) => setEditQuestionData({ ...editQuestionData, question: event.target.value })} rows="3" className="w-full px-2 py-1 rounded bg-gray-800 border border-gray-700" />
                          <div className="flex gap-2">
                            <button onClick={saveEditQuestion} className="px-3 py-2 rounded bg-green-600">Save</button>
                            <button onClick={cancelEditQuestion} className="px-3 py-2 rounded bg-gray-700">Cancel</button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="flex justify-between items-start mb-2">
                            <div><div className="font-bold">{questionItem.topic}</div></div>
                            <div className="flex gap-2">
                              <button onClick={() => startEditQuestion(questionItem)} className="px-2 py-1 rounded bg-blue-600"><Edit3 size={14} /></button>
                              <button onClick={() => confirmDeleteQuestion(questionItem.id)} className="px-2 py-1 rounded bg-red-600"><Trash2 size={14} /></button>
                            </div>
                          </div>
                          <div className="text-sm text-gray-300">{questionItem.question}</div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : activeTab === 'announcement' ? (
          <div className="space-y-6">
            {renderStatus('announcement')}
            <div className="p-4 bg-gray-900 rounded-xl border border-gray-700">
              <div className="flex items-center gap-3 mb-4">
                <Bell size={18} />
                <h3 className="font-bold">Announcement Bar</h3>
              </div>
              <div className="space-y-4">
                <label className="flex items-center justify-between gap-4 rounded-lg border border-gray-700 bg-gray-800 px-4 py-3">
                  <div>
                    <div className="font-semibold text-white">Show announcement</div>
                    <div className="text-sm text-gray-400">Display the banner directly under the main menu.</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={Boolean(announcementDraft.enabled)}
                    onChange={(event) => setAnnouncementDraft((current) => ({ ...current, enabled: event.target.checked }))}
                    className="h-4 w-4"
                  />
                </label>
                <div>
                  <label className="block text-sm font-semibold mb-2">Announcement text</label>
                  <textarea
                    value={announcementDraft.message || ''}
                    onChange={(event) => setAnnouncementDraft((current) => ({ ...current, message: event.target.value }))}
                    rows="4"
                    placeholder="IMPORTANT NOTICE: ..."
                    className="w-full px-3 py-2 rounded bg-gray-800 border border-gray-700"
                  />
                </div>
                <div className="rounded-lg border border-gray-700 bg-gray-800 p-4">
                  <div className="text-xs uppercase tracking-[0.18em] text-gray-400 mb-2">Preview</div>
                  {announcementDraft.enabled && announcementDraft.message ? (
                    <div className="w-full border border-sky-400/20 bg-sky-400/10 text-center py-2 px-4 rounded text-sm font-medium text-sky-300">
                      {announcementDraft.message}
                    </div>
                  ) : (
                    <div className="text-sm text-gray-400">Announcement is currently hidden.</div>
                  )}
                </div>
                <button onClick={saveAnnouncement} disabled={announcementSaving} className="w-full py-3 rounded bg-[#1e90ff] text-white font-semibold disabled:opacity-70">
                  {announcementSaving ? 'Saving...' : 'Save Announcement'}
                </button>
              </div>
            </div>
          </div>
        ) : activeTab === 'moderation' ? (
          <div className="space-y-6">
            {renderStatus('moderation')}
            {loadingCommunityPosts ? (
              <div className="text-center py-8"><Loader className="animate-spin mx-auto mb-2" size={36} /><div>Loading community posts...</div></div>
            ) : communityPosts.length === 0 ? (
              <div className="rounded-xl border border-gray-700 bg-gray-900 p-4 text-sm text-gray-300">No community posts found.</div>
            ) : (
              <div className="space-y-3">
                {communityPosts.map((post) => (
                  <div key={post.id} className="rounded-xl border border-gray-700 bg-gray-900 p-4 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-bold text-white">{post.title}</div>
                        <div className="text-xs text-gray-400">@{post.author?.username || 'unknown'} | reports: {post.reportedCount || 0}</div>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => updatePostVisibility(post.id, !post.hidden)} className="px-2 py-1 rounded bg-amber-600 text-white">
                          <EyeOff size={14} />
                        </button>
                        <button onClick={() => deleteCommunityPost(post.id)} className="px-2 py-1 rounded bg-red-600 text-white">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                    <div className="text-sm text-gray-300">{post.body}</div>
                    <div className="text-xs text-gray-400">
                      status: {post.hidden ? `hidden${post.hiddenReason ? ` - ${post.hiddenReason}` : ''}` : 'visible'}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {renderStatus('runtime')}
            <div className="rounded-xl border border-gray-700 bg-gray-900 p-4">
              <div className="flex items-center gap-3 mb-4">
                <Activity size={18} />
                <h3 className="font-bold">Runtime Status</h3>
              </div>
              {loadingRuntime ? (
                <div className="text-sm text-gray-400">Loading runtime status...</div>
              ) : runtimeStatus ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-lg border border-gray-700 bg-gray-800 p-3 text-sm text-gray-200">Rate limiter: <span className="font-semibold">{runtimeStatus.rateLimiter}</span></div>
                  <div className="rounded-lg border border-gray-700 bg-gray-800 p-3 text-sm text-gray-200">Embedded worker: <span className="font-semibold">{String(runtimeStatus.embeddedWorker)}</span></div>
                  <div className="rounded-lg border border-gray-700 bg-gray-800 p-3 text-sm text-gray-200">Redis configured: <span className="font-semibold">{String(runtimeStatus.redisConfigured)}</span></div>
                  <div className="rounded-lg border border-gray-700 bg-gray-800 p-3 text-sm text-gray-200">Production: <span className="font-semibold">{String(runtimeStatus.production)}</span></div>
                  <div className="rounded-lg border border-gray-700 bg-gray-800 p-3 text-sm text-gray-200">Queued jobs: <span className="font-semibold">{runtimeStatus.queuedJobs ?? 0}</span></div>
                  <div className="rounded-lg border border-gray-700 bg-gray-800 p-3 text-sm text-gray-200">Processing jobs: <span className="font-semibold">{runtimeStatus.processingJobs ?? 0}</span></div>
                </div>
              ) : (
                <div className="text-sm text-gray-400">Runtime status unavailable.</div>
              )}
            </div>
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

export default AdminPanel;
