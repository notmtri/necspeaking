import React, { useCallback, useEffect, useState } from 'react';
import { Edit3, Loader, Lock, Trash2 } from 'lucide-react';
import { ConfirmModal } from '../components/AppOverlays';
import { API_BASE_URL } from '../appShared';

function AdminPanel({ onClose, notify }) {
  const [activeTab, setActiveTab] = useState('upload');
  const [audioFile, setAudioFile] = useState(null);
  const [topic, setTopic] = useState('');
  const [question, setQuestion] = useState('');
  const [speaker, setSpeaker] = useState('');
  const [score, setScore] = useState('2.0');
  const [transcript, setTranscript] = useState('');
  const [feedback, setFeedback] = useState('');
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');
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
  const [confirmState, setConfirmState] = useState(null);

  const fetchSamples = useCallback(async () => {
    setLoadingSamples(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/samples`);
      const data = await response.json();
      setSamples(data.samples || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingSamples(false);
    }
  }, []);

  const fetchQuestions = useCallback(async () => {
    setLoadingQuestions(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/questions`);
      const data = await response.json();
      setQuestions(data.questions || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingQuestions(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'manage') fetchSamples();
    if (activeTab === 'questions') fetchQuestions();
  }, [activeTab, fetchQuestions, fetchSamples]);

  const handleUpload = useCallback(async () => {
    if (!audioFile || !topic || !speaker || !transcript || !feedback) {
      setMessage('Please fill in all fields');
      return;
    }
    setUploading(true);
    setMessage('');
    const formData = new FormData();
    formData.append('audio', audioFile);
    formData.append('topic', topic);
    formData.append('question', question);
    formData.append('speaker', speaker);
    formData.append('score', score);
    formData.append('transcript', transcript);
    formData.append('feedback', feedback);
    try {
      const response = await fetch(`${API_BASE_URL}/api/samples/upload`, { method: 'POST', credentials: 'include', body: formData });
      const data = await response.json();
      if (data.success) {
        setMessage('Sample uploaded successfully!');
        setAudioFile(null);
        setTopic('');
        setQuestion('');
        setSpeaker('');
        setScore('2.0');
        setTranscript('');
        setFeedback('');
      } else {
        setMessage(`Error: ${data.error || 'Upload failed'}`);
      }
    } catch {
      setMessage('Error: Connection failed');
    } finally {
      setUploading(false);
    }
  }, [audioFile, feedback, question, score, speaker, topic, transcript]);

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
      const response = await fetch(`${API_BASE_URL}/api/samples/${editingId}`, { method: 'PUT', credentials: 'include', body: form });
      const data = await response.json();
      if (data.success) {
        setMessage('Updated successfully');
        await fetchSamples();
        cancelEdit();
      } else {
        setMessage(`Error: ${data.error || 'Update failed'}`);
      }
    } catch {
      setMessage('Error: Connection failed');
    }
  }, [cancelEdit, editData, editingId, fetchSamples]);

  const deleteSample = useCallback(async (id) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/samples/${id}`, { method: 'DELETE', credentials: 'include' });
      const data = await response.json();
      if (data.success) {
        setMessage('Deleted successfully');
        notify?.('Sample deleted.', 'success');
        await fetchSamples();
      } else {
        setMessage(`Error: ${data.error || 'Delete failed'}`);
      }
    } catch {
      setMessage('Error: Connection failed');
    }
  }, [fetchSamples, notify]);

  const addQuestion = useCallback(async () => {
    if (!newQuestionTopic || !newQuestionText) {
      setMessage('Please fill in topic and question');
      return;
    }
    try {
      const response = await fetch(`${API_BASE_URL}/api/questions`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: newQuestionTopic, question: newQuestionText }),
      });
      const data = await response.json();
      if (data.success) {
        setMessage('Question added successfully!');
        setNewQuestionTopic('');
        setNewQuestionText('');
        await fetchQuestions();
      } else {
        setMessage(`Error: ${data.error || 'Failed to add question'}`);
      }
    } catch {
      setMessage('Error: Connection failed');
    }
  }, [fetchQuestions, newQuestionText, newQuestionTopic]);

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
      const response = await fetch(`${API_BASE_URL}/api/questions/${editingQuestionId}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editQuestionData),
      });
      const data = await response.json();
      if (data.success) {
        setMessage('Question updated');
        await fetchQuestions();
        cancelEditQuestion();
      } else {
        setMessage(`Error: ${data.error || 'Update failed'}`);
      }
    } catch {
      setMessage('Error: Connection failed');
    }
  }, [cancelEditQuestion, editQuestionData, editingQuestionId, fetchQuestions]);

  const deleteQuestion = useCallback(async (id) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/questions/${id}`, { method: 'DELETE', credentials: 'include' });
      const data = await response.json();
      if (data.success) {
        setMessage('Question deleted');
        notify?.('Question deleted.', 'success');
        await fetchQuestions();
      } else {
        setMessage(`Error: ${data.error || 'Delete failed'}`);
      }
    } catch {
      setMessage('Error: Connection failed');
    }
  }, [fetchQuestions, notify]);

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

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6 bg-gray-800 border border-gray-700">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-3"><Lock size={18} /><h2 className="text-2xl font-bold">Admin Panel</h2></div>
          <button onClick={onClose} className="text-xl font-bold">Close</button>
        </div>

        {message && <div className="mb-4 p-3 rounded-md bg-green-700/10 border border-green-700/20">{message}</div>}

        <div className="mb-4 flex gap-2 flex-wrap">
          <button onClick={() => setActiveTab('upload')} className={`px-3 py-2 rounded ${activeTab === 'upload' ? 'bg-[#1e90ff] text-white' : 'bg-gray-700'}`}>Upload Sample</button>
          <button onClick={() => setActiveTab('manage')} className={`px-3 py-2 rounded ${activeTab === 'manage' ? 'bg-[#1e90ff] text-white' : 'bg-gray-700'}`}>Manage Samples</button>
          <button onClick={() => setActiveTab('questions')} className={`px-3 py-2 rounded ${activeTab === 'questions' ? 'bg-[#1e90ff] text-white' : 'bg-gray-700'}`}>Question Bank</button>
        </div>

        {activeTab === 'upload' ? (
          <div className="space-y-4">
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
        ) : (
          <div className="space-y-6">
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
        )}
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
