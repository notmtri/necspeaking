import React, { memo, useCallback, useEffect, useRef, useState } from 'react';
import { AlertCircle, CheckCircle, Circle, Download, Loader, Mic, Pause, Play } from 'lucide-react';
import { API_BASE_URL, downloadDocumentFromBase64 } from '../appShared';

function SimulationMode({ onAnalysisUserUpdate, notify }) {
  const [simStep, setSimStep] = useState('intro');
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [questionBank, setQuestionBank] = useState([]);
  const [loadingQuestionBank, setLoadingQuestionBank] = useState(false);
  const [selectedQuestionId, setSelectedQuestionId] = useState('random');
  const [countdown, setCountdown] = useState(60);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [recordedAudioURL, setRecordedAudioURL] = useState(null);
  const [recordedBlob, setRecordedBlob] = useState(null);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  const [micTested, setMicTested] = useState(false);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (recordedAudioURL) URL.revokeObjectURL(recordedAudioURL);
    };
  }, [recordedAudioURL]);

  const testMicrophone = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => track.stop());
      setMicTested(true);
      notify?.('Microphone test successful. You can now proceed.', 'success');
    } catch {
      notify?.('Microphone access denied. Please enable microphone permissions.', 'error');
    }
  }, [notify]);

  const startRecordingAuto = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };
      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setRecordedAudioURL(URL.createObjectURL(audioBlob));
        setRecordedBlob(audioBlob);
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setSimStep('recording');
      setRecordingTime(0);

      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => {
          const newTime = prev + 1;
          if (newTime >= 300) {
            clearInterval(timerRef.current);
            timerRef.current = null;
            stopRecording();
            return 300;
          }
          return newTime;
        });
      }, 1000);
    } catch {
      setError('Failed to start recording. Check microphone permissions.');
    }
  }, []);

  const startPreparationTimer = useCallback(() => {
    timerRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          startRecordingAuto();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [startRecordingAuto]);

  const startReadingTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    setSimStep('reading');
    setCountdown(60);
    timerRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          setSimStep('preparation');
          setCountdown(300);
          startPreparationTimer();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [startPreparationTimer]);

  const fetchQuestionBank = useCallback(async () => {
    setLoadingQuestionBank(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/questions`);
      const data = await response.json();
      setQuestionBank(data.questions || []);
    } catch {
      setQuestionBank([]);
    } finally {
      setLoadingQuestionBank(false);
    }
  }, []);

  useEffect(() => {
    fetchQuestionBank();
  }, [fetchQuestionBank]);

  const fetchAndSetQuestion = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/questions/random`);
      const data = await response.json();
      if (data.error) {
        setError('No questions available. Please add questions in admin panel.');
        return false;
      }
      setCurrentQuestion(data.question);
      setError(null);
      startReadingTimer();
      return true;
    } catch {
      setError('Failed to load question. Check your connection.');
      return false;
    }
  }, [startReadingTimer]);

  const startSimulation = useCallback(async () => {
    if (!micTested) {
      notify?.('Please test your microphone before starting the simulation.', 'error');
      return;
    }
    if (selectedQuestionId !== 'random') {
      const selectedQuestion = questionBank.find((question) => String(question.id) === selectedQuestionId);
      if (!selectedQuestion) {
        setError('Selected question could not be found. Please choose again.');
        return;
      }
      setCurrentQuestion(selectedQuestion);
      setError(null);
      startReadingTimer();
      return;
    }
    await fetchAndSetQuestion();
  }, [fetchAndSetQuestion, micTested, notify, questionBank, selectedQuestionId, startReadingTimer]);

  const skipReading = useCallback(() => {
    clearInterval(timerRef.current);
    setSimStep('preparation');
    setCountdown(300);
    startPreparationTimer();
  }, [startPreparationTimer]);

  const stopRecording = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    setSimStep('playback');
  }, []);

  const analyzeRecording = useCallback(async () => {
    if (!recordedBlob || !currentQuestion) return;
    setSimStep('analyzing');
    const formData = new FormData();
    formData.append('audio', recordedBlob, 'recording.webm');
    formData.append('topic', currentQuestion.question);
    try {
      const response = await fetch(`${API_BASE_URL}/api/analyze`, { method: 'POST', body: formData, credentials: 'include' });
      const data = await response.json();
      if (data.success) {
        setResults(data);
        if (data.user) {
          await onAnalysisUserUpdate?.(data.user);
        }
        setSimStep('results');
      } else {
        setError(data.error || 'Analysis failed');
        setSimStep('playback');
      }
    } catch {
      setError('Connection failed. Make sure the backend is running.');
      setSimStep('playback');
    }
  }, [currentQuestion, onAnalysisUserUpdate, recordedBlob]);

  const resetSimulation = useCallback(() => {
    setSimStep('intro');
    setCurrentQuestion(null);
    setCountdown(60);
    setRecordingTime(0);
    setIsRecording(false);
    if (recordedAudioURL) URL.revokeObjectURL(recordedAudioURL);
    setRecordedAudioURL(null);
    setRecordedBlob(null);
    setResults(null);
    setError(null);
    if (timerRef.current) clearInterval(timerRef.current);
  }, [recordedAudioURL]);

  const downloadRecording = useCallback(() => {
    if (recordedBlob) {
      const url = URL.createObjectURL(recordedBlob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `simulation_${Date.now()}.webm`;
      anchor.click();
      URL.revokeObjectURL(url);
    }
  }, [recordedBlob]);

  const downloadSimulationReport = useCallback(() => {
    if (!results) {
      notify?.('No simulation results are available yet.', 'error');
      return;
    }
    if (results.document_base64) {
      downloadDocumentFromBase64(results.document_base64, results.document_filename || 'simulation_feedback.docx', {
        onError: (message) => notify?.(message, 'error'),
      });
    } else if (results.document_url) {
      window.open(`${API_BASE_URL}${results.document_url}`, '_blank');
    } else {
      notify?.('Document download is not available for this simulation result.', 'error');
    }
  }, [notify, results]);

  const formatTime = useCallback((seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  }, []);

  const getScoreColor = useCallback((score, max) => {
    const percentage = (score / max) * 100;
    if (percentage >= 80) return 'text-green-400';
    if (percentage >= 60) return 'text-yellow-400';
    return 'text-red-400';
  }, []);

  const randomizeQuestion = useCallback(async () => {
    await fetchAndSetQuestion();
  }, [fetchAndSetQuestion]);

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl sm:text-3xl font-bold mb-2 text-white">NEC Speaking Simulation</h2>
        <p className="text-sm text-slate-300">Experience the real test interface</p>
      </div>

      {error && (
        <div className="mb-6 rounded-2xl border border-red-400/25 bg-red-500/10 p-4 flex items-center gap-3 text-red-100">
          <AlertCircle size={18} />
          <span className="font-medium">{error}</span>
        </div>
      )}

      <div className="rounded-[28px] sm:rounded-[32px] border border-white/10 bg-slate-950/65 p-4 sm:p-8 shadow-[0_20px_80px_rgba(2,6,23,0.4)]">
        {simStep === 'intro' && (
          <div className="text-center space-y-6">
            <h3 className="text-2xl font-bold text-white">🍀 Good luck! 🍀</h3>
            <div className="mx-auto grid max-w-3xl gap-3 text-left md:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm text-slate-300">Prepare pen and paper for drafting ideas.</div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm text-slate-300">You will have 60 seconds to read the question.</div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm text-slate-300">Then 5 minutes to prepare your response.</div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm text-slate-300">Recording lasts exactly 5 minutes.</div>
            </div>
            <div className="space-y-3 pt-4 max-w-4xl mx-auto w-full">
              <div className="w-full rounded-xl border border-gray-700 bg-gray-900 p-4 text-left">
                <h3 className="font-bold mb-3">Question Bank ({questionBank.length} questions)</h3>
                {loadingQuestionBank ? (
                  <div className="text-center py-8">
                    <Loader className="animate-spin mx-auto" size={28} />
                  </div>
                ) : (
                  <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                    <button
                      type="button"
                      onClick={() => setSelectedQuestionId('random')}
                      className={`w-full text-left p-3 bg-gray-900 border rounded transition ${selectedQuestionId === 'random' ? 'border-sky-500' : 'border-gray-700'}`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <div className="font-bold">🎲 Random question 🎲</div>
                          <div className="text-xs text-gray-400">Question Bank</div>
                        </div>
                      </div>
                      <div className="text-sm text-gray-300">System picks one random question from the bank when simulation starts.</div>
                    </button>

                    {questionBank.length === 0 ? (
                      <div className="text-center py-4 text-gray-400">No questions yet. Add your first question in admin panel.</div>
                    ) : (
                      questionBank.map((question) => (
                        <button
                          key={question.id}
                          type="button"
                          onClick={() => setSelectedQuestionId(String(question.id))}
                          className={`w-full text-left p-3 bg-gray-900 border rounded transition ${selectedQuestionId === String(question.id) ? 'border-sky-500' : 'border-gray-700'}`}
                        >
                          <div className="flex justify-between items-start mb-2">
                            <div className="font-bold">{question.topic}</div>
                          </div>
                          <div className="text-sm text-gray-300">{question.question}</div>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
              <button onClick={testMicrophone} className={`w-full py-3 rounded-2xl font-semibold transition ${micTested ? 'bg-emerald-500 text-white' : 'bg-white/[0.06] text-white hover:bg-white/[0.1]'}`}>
                <div className="flex items-center justify-center gap-2">
                  <Mic size={18} />
                  {micTested ? 'Microphone Ready' : 'Test Microphone'}
                </div>
              </button>
              <button onClick={startSimulation} disabled={!micTested} className={`w-full py-3 rounded-2xl font-semibold transition ${micTested ? 'bg-sky-500 text-white hover:bg-sky-400' : 'bg-slate-700 text-slate-400 cursor-not-allowed'}`}>
                Start Simulation
              </button>
            </div>
          </div>
        )}

        {simStep === 'reading' && currentQuestion && (
          <div className="space-y-6">
            <div className="text-center">
              <div className="text-5xl font-extrabold text-sky-300 mb-2">{formatTime(countdown)}</div>
              <div className="text-sm text-slate-400">Time to read the question</div>
            </div>
            <div className="rounded-[28px] border border-white/10 bg-[#07111f] p-6">
              <div className="text-xs font-bold uppercase tracking-[0.22em] text-slate-400 mb-2">Question {currentQuestion.id}</div>
              <div className="text-sm font-semibold text-slate-300 mb-3">{currentQuestion.topic}</div>
              <div className="text-lg text-white">{currentQuestion.question}</div>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <button onClick={skipReading} className="flex-1 py-3 rounded-2xl bg-sky-500 text-white font-semibold transition hover:bg-sky-400">Finish Reading Question</button>
              <button onClick={randomizeQuestion} className="px-4 py-3 rounded-2xl border border-white/10 bg-white/[0.04] text-white font-semibold transition hover:bg-white/[0.08]">Randomize Again</button>
            </div>
          </div>
        )}

        {simStep === 'preparation' && currentQuestion && (
          <div className="space-y-6 text-center">
            <div className="mx-auto inline-flex h-20 w-20 items-center justify-center rounded-full bg-sky-400/12 text-sky-300">
              <CheckCircle size={34} />
            </div>
            <h3 className="text-2xl font-bold text-white">Preparation Time</h3>
            <div className="text-5xl font-extrabold text-sky-300">{formatTime(countdown)}</div>
            <div className="text-sm text-slate-400">{currentQuestion.question}</div>
            <div className="w-full bg-slate-800 rounded-full h-3 overflow-hidden">
              <div className="bg-sky-400 h-3 rounded-full transition-all" style={{ width: `${((300 - countdown) / 300) * 100}%` }} />
            </div>
            <button onClick={() => { clearInterval(timerRef.current); startRecordingAuto(); }} className="px-6 py-3 rounded-2xl bg-sky-500 text-white font-semibold transition hover:bg-sky-400">
              Skip Preparation & Start Recording
            </button>
          </div>
        )}

        {simStep === 'recording' && currentQuestion && (
          <div className="space-y-6 text-center">
            <div className="flex items-center justify-center">
              <div className="inline-flex h-24 w-24 items-center justify-center rounded-full border border-red-400/20 bg-red-500/10">
                <Circle className="text-red-500 animate-pulse" size={48} fill="currentColor" />
              </div>
            </div>
            <h3 className="text-2xl font-bold text-red-500">Recording...</h3>
            <div className="text-5xl font-extrabold text-white">{formatTime(recordingTime)}</div>
            <div className="text-sm text-slate-400">{currentQuestion.question}</div>
            <div className="w-full bg-slate-800 rounded-full h-3 overflow-hidden">
              <div className="bg-red-500 h-3 rounded-full transition-all" style={{ width: `${(recordingTime / 300) * 100}%` }} />
            </div>
            <button onClick={stopRecording} className="px-6 py-3 rounded-2xl bg-red-600 text-white font-semibold transition hover:bg-red-500">Stop Recording Early</button>
          </div>
        )}

        {simStep === 'playback' && (
          <div className="space-y-6 text-center">
            <div className="mx-auto inline-flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/12 text-emerald-300">
              <CheckCircle size={34} />
            </div>
            <h3 className="text-2xl font-bold text-white">Recording Complete!</h3>
            <div className="text-slate-300">Duration: {formatTime(recordingTime)}</div>
            <AudioPlayback audioUrl={recordedAudioURL} />
            <div className="flex flex-col gap-3 sm:flex-row">
              <button onClick={analyzeRecording} className="flex-1 py-3 rounded-2xl bg-sky-500 text-white font-semibold transition hover:bg-sky-400">Analyze My Speech</button>
              <button onClick={downloadRecording} className="px-6 py-3 rounded-2xl border border-white/10 bg-white/[0.04] text-white font-semibold transition hover:bg-white/[0.08]"><Download size={18} /></button>
            </div>
            <button onClick={resetSimulation} className="w-full py-3 rounded-2xl border border-white/10 bg-white/[0.04] text-white transition hover:bg-white/[0.08]">Start New Simulation</button>
          </div>
        )}

        {simStep === 'analyzing' && (
          <div className="text-center py-12">
            <div className="mx-auto mb-5 inline-flex h-20 w-20 items-center justify-center rounded-full border border-sky-400/25 bg-sky-400/10 text-sky-300">
              <Loader className="animate-spin" size={40} />
            </div>
            <div className="font-semibold text-white">Analyzing your speech...</div>
          </div>
        )}

        {simStep === 'results' && results && (
          <div className="space-y-6">
            <h3 className="text-2xl font-bold text-center text-white">Your Results</h3>
            <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
              <div className="text-center rounded-[28px] border border-sky-400/20 bg-sky-400/10 p-6">
                <div className="text-5xl font-extrabold text-white">{results.scores.total.toFixed(2)}</div>
                <div className="mt-2 text-sm text-slate-300">out of 2.0</div>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                {[
                  { label: 'Content', score: results.scores.content, max: 0.9 },
                  { label: 'Accuracy', score: results.scores.accuracy, max: 0.6 },
                  { label: 'Delivery', score: results.scores.delivery, max: 0.5 },
                ].map((item, idx) => (
                  <div key={idx} className="rounded-[24px] border border-white/10 bg-white/[0.04] p-4 text-center">
                    <div className="text-xs font-bold uppercase tracking-[0.22em] text-slate-400">{item.label}</div>
                    <div className={`mt-3 text-2xl font-black ${getScoreColor(item.score, item.max)}`}>{item.score.toFixed(2)}</div>
                    <div className="mt-1 text-xs text-slate-500">/ {item.max.toFixed(1)}</div>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h3 className="text-lg font-bold mb-2 text-white">Detailed Feedback</h3>
              <div className="space-y-3">
                <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-4"><div className="font-semibold text-white">Content</div><div className="mt-2 text-sm leading-7 text-slate-300">{results.feedback.content}</div></div>
                <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-4"><div className="font-semibold text-white">Accuracy</div><div className="mt-2 text-sm leading-7 text-slate-300">{results.feedback.accuracy}</div></div>
                <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-4"><div className="font-semibold text-white">Delivery</div><div className="mt-2 text-sm leading-7 text-slate-300">{results.feedback.delivery}</div></div>
              </div>
            </div>
            {results.sample_response && (
              <div className="rounded-[24px] border border-amber-400/20 bg-amber-400/8 p-4">
                <h4 className="font-bold mb-2 text-white">Sample 2.0 Response</h4>
                <div className="text-sm text-slate-200 whitespace-pre-line">{results.sample_response}</div>
              </div>
            )}
            <div className="flex flex-col gap-3 sm:flex-row">
              <button onClick={downloadSimulationReport} className="flex-1 py-3 rounded-2xl bg-sky-500 text-white font-semibold transition hover:bg-sky-400">
                <div className="flex items-center justify-center gap-2"><Download size={16} />Download Report</div>
              </button>
              <button onClick={downloadRecording} className="px-6 py-3 rounded-2xl border border-white/10 bg-white/[0.04] text-white font-semibold transition hover:bg-white/[0.08]"><Download size={18} /></button>
            </div>
            <button onClick={resetSimulation} className="w-full py-3 rounded-2xl border border-white/10 bg-white/[0.04] text-white transition hover:bg-white/[0.08]">Start New Simulation</button>
          </div>
        )}
      </div>
    </div>
  );
}

const AudioPlayback = memo(function AudioPlayback({ audioUrl }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef(null);

  useEffect(() => {
    setIsPlaying(false);
    setProgress(0);
    setCurrentTime(0);
    setDuration(0);
  }, [audioUrl]);

  const togglePlay = useCallback(async () => {
    if (!audioRef.current) return;
    try {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        await audioRef.current.play();
        setIsPlaying(true);
      }
    } catch {
      setIsPlaying(false);
    }
  }, [isPlaying]);

  const handleTimeUpdate = useCallback(() => {
    const audio = audioRef.current;
    if (audio && audio.duration) {
      setCurrentTime(audio.currentTime);
      setProgress((audio.currentTime / audio.duration) * 100);
    }
  }, []);

  const handleLoadedMetadata = useCallback(() => {
    const audio = audioRef.current;
    if (audio) setDuration(audio.duration || 0);
  }, []);

  const handleSeek = useCallback((event) => {
    const audio = audioRef.current;
    if (audio && audio.duration) {
      audio.currentTime = (Number(event.target.value) / 100) * audio.duration;
    }
  }, []);

  const formatTime = useCallback((time) => {
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  }, []);

  return (
    <div className="p-4 bg-gray-900 rounded-xl border border-gray-700">
      <audio
        ref={audioRef}
        src={audioUrl}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onPause={() => setIsPlaying(false)}
        onEnded={() => setIsPlaying(false)}
      />
      <div className="flex items-center gap-4 flex-wrap max-w-full overflow-hidden">
        <button onClick={togglePlay} className="flex items-center justify-center w-12 h-12 rounded-full bg-[#1e90ff] text-white hover:bg-[#1a7be6] transition">
          {isPlaying ? <Pause size={20} /> : <Play size={20} />}
        </button>
        <div className="flex-1">
          <input type="range" value={progress} onChange={handleSeek} className="w-full accent-[#1e90ff]" />
          <div className="flex justify-between text-xs text-gray-400 mt-1">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>
      </div>
    </div>
  );
});

export default SimulationMode;
