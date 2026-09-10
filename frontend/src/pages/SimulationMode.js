import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AlertCircle, BookOpen, CheckCircle, Circle, Clock3, Download, Headphones, Loader, Maximize2, Mic, Minimize2, Pause, RefreshCcw, Shuffle, SkipForward, Volume2 } from 'lucide-react';
import { PageHeader } from '../components/AppChrome';
import AudioPlayer from '../components/AudioPlayer';
import ResultsPanel from '../components/ResultsPanel';
import { formatTime } from '../appShared';
import { apiFetch, isAbortError, waitForAnalysisJob } from '../apiClient';

const READING_SECONDS = 60;
const PREPARATION_SECONDS = 300;
const RECORDING_SECONDS = 300;

const STAGE_LABELS = {
  intro: 'Setup',
  reading: 'Reading',
  preparation: 'Preparation',
  recording: 'Recording',
  playback: 'Playback',
  analyzing: 'Analyzing',
  results: 'Results',
};

const STAGE_CUES = {
  reading: 'Reading time has started.',
  preparation: 'Preparation time has started.',
  recording: 'Recording has started.',
  playback: 'Recording complete. Review before analysis.',
  analyzing: 'Analysis is processing.',
  results: 'Results are ready.',
};

export default function SimulationMode({ onAnalysisUserUpdate, onDownloadReport, notify, isOffline }) {
  const [simStep, setSimStep] = useState('intro');
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [questionBank, setQuestionBank] = useState([]);
  const [loadingQuestionBank, setLoadingQuestionBank] = useState(false);
  const [selectedQuestionId, setSelectedQuestionId] = useState('random');
  const [countdown, setCountdown] = useState(READING_SECONDS);
  const [recordingTime, setRecordingTime] = useState(0);
  const [recordedAudioURL, setRecordedAudioURL] = useState(null);
  const [recordedBlob, setRecordedBlob] = useState(null);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  const [micTested, setMicTested] = useState(false);
  const [progressMessage, setProgressMessage] = useState('Queued for processing.');
  const [focusMode, setFocusMode] = useState(false);
  const [browserFullscreenActive, setBrowserFullscreenActive] = useState(false);
  const [examRulesAccepted, setExamRulesAccepted] = useState(false);
  const [audioCuesEnabled, setAudioCuesEnabled] = useState(true);
  const [stageCue, setStageCue] = useState(null);

  const shellRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);
  const streamRef = useRef(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  /** Stops any in-flight recorder and releases the microphone. */
  const releaseRecorder = useCallback(({ discard = false } = {}) => {
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== 'inactive') {
      if (discard) {
        recorder.ondataavailable = null;
        recorder.onstop = null;
      }
      recorder.stop();
    }
    if (discard) mediaRecorderRef.current = null;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }, []);

  useEffect(() => () => {
    clearTimer();
    releaseRecorder({ discard: true });
  }, [clearTimer, releaseRecorder]);

  useEffect(() => () => {
    if (recordedAudioURL) URL.revokeObjectURL(recordedAudioURL);
  }, [recordedAudioURL]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      const active = document.fullscreenElement === shellRef.current;
      setBrowserFullscreenActive(active);
      if (!active) setFocusMode(false);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const enterFocusMode = useCallback(async () => {
    setFocusMode(true);
    const shell = shellRef.current;
    if (!shell?.requestFullscreen) return;

    try {
      await shell.requestFullscreen();
      setBrowserFullscreenActive(true);
    } catch {
      setBrowserFullscreenActive(false);
    }
  }, []);

  const exitFocusMode = useCallback(async () => {
    const midSession = focusMode && ['reading', 'preparation', 'recording'].includes(simStep);
    if (midSession && !window.confirm('Exit full screen during the active simulation? Your timer will continue running.')) {
      return;
    }
    setFocusMode(false);
    if (document.fullscreenElement && document.exitFullscreen) {
      try {
        await document.exitFullscreen();
      } catch {
        setBrowserFullscreenActive(false);
      }
    }
  }, [focusMode, simStep]);

  const playStageTone = useCallback((kind = 'stage') => {
    if (!audioCuesEnabled) return;
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;

    try {
      const context = new AudioContextClass();
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.frequency.value = kind === 'recording' ? 620 : kind === 'complete' ? 880 : 740;
      oscillator.type = 'sine';
      gain.gain.setValueAtTime(0.0001, context.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.08, context.currentTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.22);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start();
      oscillator.stop(context.currentTime + 0.24);
      window.setTimeout(() => context.close?.(), 350);
    } catch {
      // Audio cues are best-effort and depend on browser autoplay policies.
    }
  }, [audioCuesEnabled]);

  useEffect(() => {
    const message = STAGE_CUES[simStep];
    if (!message) return undefined;

    setStageCue(message);
    playStageTone(simStep === 'recording' ? 'recording' : simStep === 'results' ? 'complete' : 'stage');
    const timeout = window.setTimeout(() => setStageCue(null), 4200);
    return () => window.clearTimeout(timeout);
  }, [playStageTone, simStep]);

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

  const stopRecording = useCallback(() => {
    clearTimer();
    releaseRecorder();
    setSimStep('playback');
  }, [clearTimer, releaseRecorder]);

  const startRecordingAuto = useCallback(async () => {
    clearTimer();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      streamRef.current = stream;
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };
      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        audioChunksRef.current = [];
        setRecordedAudioURL(URL.createObjectURL(audioBlob));
        setRecordedBlob(audioBlob);
      };

      mediaRecorder.start();
      setSimStep('recording');
      setRecordingTime(0);

      timerRef.current = setInterval(() => {
        setRecordingTime((previous) => {
          const next = previous + 1;
          if (next >= RECORDING_SECONDS) {
            stopRecording();
            return RECORDING_SECONDS;
          }
          return next;
        });
      }, 1000);
    } catch {
      setError('Failed to start recording. Check microphone permissions.');
    }
  }, [clearTimer, stopRecording]);

  const startPreparationTimer = useCallback(() => {
    clearTimer();
    setSimStep('preparation');
    setCountdown(PREPARATION_SECONDS);
    timerRef.current = setInterval(() => {
      setCountdown((previous) => {
        if (previous <= 1) {
          clearTimer();
          startRecordingAuto();
          return 0;
        }
        return previous - 1;
      });
    }, 1000);
  }, [clearTimer, startRecordingAuto]);

  const startReadingTimer = useCallback(() => {
    clearTimer();
    setSimStep('reading');
    setCountdown(READING_SECONDS);
    timerRef.current = setInterval(() => {
      setCountdown((previous) => {
        if (previous <= 1) {
          clearTimer();
          startPreparationTimer();
          return 0;
        }
        return previous - 1;
      });
    }, 1000);
  }, [clearTimer, startPreparationTimer]);

  const fetchQuestionBank = useCallback(async (signal) => {
    setLoadingQuestionBank(true);
    try {
      const data = await apiFetch('/api/questions', { signal });
      setQuestionBank(data.questions || []);
    } catch (fetchError) {
      if (isAbortError(fetchError)) return;
      setQuestionBank([]);
    } finally {
      if (!signal?.aborted) setLoadingQuestionBank(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    fetchQuestionBank(controller.signal);
    return () => controller.abort();
  }, [fetchQuestionBank]);

  const fetchAndSetQuestion = useCallback(async () => {
    try {
      const data = await apiFetch('/api/questions/random');
      setCurrentQuestion(data.question);
      setError(null);
      startReadingTimer();
    } catch (fetchError) {
      setError(fetchError.status === 404
        ? 'No questions available. Add questions in the admin panel.'
        : fetchError.message || 'Failed to load question. Check your connection.');
    }
  }, [startReadingTimer]);

  const startSimulation = useCallback(async () => {
    if (isOffline) {
      notify?.('You are offline. Cannot start simulation.', 'error');
      return;
    }
    if (!examRulesAccepted) {
      notify?.('Confirm the exam rules before starting the simulation.', 'error');
      return;
    }
    if (!micTested) {
      notify?.('Test your microphone before starting the simulation.', 'error');
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
  }, [examRulesAccepted, fetchAndSetQuestion, isOffline, micTested, notify, questionBank, selectedQuestionId, startReadingTimer]);

  const analyzeRecording = useCallback(async () => {
    if (isOffline) {
      setError('You are offline. Cannot perform analysis.');
      return;
    }
    if (!recordedBlob || !currentQuestion) return;

    setSimStep('analyzing');
    setProgressMessage('Uploading audio and queueing analysis.');
    const formData = new FormData();
    formData.append('audio', recordedBlob, 'recording.webm');
    formData.append('topic', currentQuestion.question);
    formData.append('source', 'simulation');

    try {
      const data = await apiFetch('/api/analyze', { method: 'POST', body: formData });
      const job = await waitForAnalysisJob(data.job.id, {
        onTick: (jobState) => setProgressMessage(jobState?.progressMessage || 'Processing analysis job.'),
      });
      if (!job.result) throw new Error('Analysis job completed without a result payload.');

      setResults(job.result);
      if (job.result.user) await onAnalysisUserUpdate?.(job.result.user);
      setSimStep('results');
    } catch (requestError) {
      setError(requestError.message || 'Connection failed. Make sure the backend is running.');
      setSimStep('playback');
    }
  }, [currentQuestion, isOffline, onAnalysisUserUpdate, recordedBlob]);

  const resetSimulation = useCallback(() => {
    clearTimer();
    releaseRecorder({ discard: true });
    setSimStep('intro');
    setCurrentQuestion(null);
    setCountdown(READING_SECONDS);
    setRecordingTime(0);
    if (recordedAudioURL) URL.revokeObjectURL(recordedAudioURL);
    setRecordedAudioURL(null);
    setRecordedBlob(null);
    setResults(null);
    setError(null);
    setProgressMessage('Queued for processing.');
  }, [clearTimer, recordedAudioURL, releaseRecorder]);

  const downloadRecording = useCallback(() => {
    if (!recordedBlob) return;
    const url = URL.createObjectURL(recordedBlob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `simulation_${Date.now()}.webm`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    setTimeout(() => URL.revokeObjectURL(url), 100);
  }, [recordedBlob]);

  const focusTimerLabel = (() => {
    if (simStep === 'reading' || simStep === 'preparation') return formatTime(countdown);
    if (simStep === 'recording' || simStep === 'playback') return formatTime(recordingTime);
    if (simStep === 'analyzing') return 'Processing';
    if (simStep === 'results') return 'Complete';
    return micTested ? 'Ready' : 'Setup';
  })();

  const completedSteps = {
    intro: [],
    reading: ['intro'],
    preparation: ['intro', 'reading'],
    recording: ['intro', 'reading', 'preparation'],
    playback: ['intro', 'reading', 'preparation', 'recording'],
    analyzing: ['intro', 'reading', 'preparation', 'recording'],
    results: ['intro', 'reading', 'preparation', 'recording'],
  }[simStep] || [];

  const workflow = [
    { id: 'intro', label: 'Setup', icon: Headphones, active: simStep === 'intro' },
    { id: 'reading', label: 'Read', icon: BookOpen, active: simStep === 'reading' },
    { id: 'preparation', label: 'Prep', icon: Clock3, active: simStep === 'preparation' },
    { id: 'recording', label: 'Record', icon: Mic, active: simStep === 'recording' || simStep === 'playback' },
    { id: 'results', label: 'Review', icon: CheckCircle, active: simStep === 'analyzing' || simStep === 'results' },
  ];

  return (
    <div
      ref={shellRef}
      className={focusMode
        ? 'fixed inset-0 z-[80] overflow-y-auto bg-surface-base px-3 py-3 text-slate-100 sm:px-5 sm:py-5'
        : 'min-w-0'}
    >
      <div className={focusMode ? 'mx-auto max-w-7xl space-y-4' : 'min-w-0 space-y-6'}>
        {focusMode && (
          <div className="sticky top-0 z-30 rounded-card border border-line bg-surface-raised/95 p-3 backdrop-blur-xl">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <div className="rounded-full border border-sky-300/25 bg-sky-300/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-sky-100">
                  Exam focus
                </div>
                <div className="rounded-full border border-line bg-overlay px-3 py-1 text-sm font-semibold text-white">
                  {STAGE_LABELS[simStep] || 'Simulation'}
                </div>
                <div className="rounded-full border border-line bg-overlay px-3 py-1 text-sm text-ink-muted">
                  {currentQuestion?.topic || (selectedQuestionId === 'random' ? 'Question bank' : 'Selected question')}
                </div>
              </div>
              <div className="flex items-center justify-between gap-3 lg:justify-end">
                <div className="rounded-control border border-line bg-overlay-hover px-4 py-2 text-2xl font-semibold text-white">
                  {focusTimerLabel}
                </div>
                <button
                  type="button"
                  onClick={exitFocusMode}
                  className="inline-flex h-12 w-12 items-center justify-center rounded-control border border-line bg-overlay text-slate-200 transition hover:bg-overlay-hover"
                  aria-label="Exit full screen simulation"
                >
                  <Minimize2 size={18} />
                </button>
              </div>
            </div>
          </div>
        )}

        {!focusMode && (
          <>
            <PageHeader
              id="simulation-page-title"
              title="Simulation"
              description="Experience the real test interface and boost your confidence."
            />

            <div className="mx-auto max-w-2xl rounded-card border border-line bg-overlay p-1.5">
              <div className="grid grid-cols-5 gap-1.5">
                {workflow.map((item) => {
                  const complete = completedSteps.includes(item.id) || simStep === 'results';
                  const Icon = simStep === 'analyzing' && item.id === 'results' ? Loader : complete ? CheckCircle : item.icon;
                  return (
                    <div
                      key={item.id}
                      className={`flex min-h-[44px] items-center justify-center gap-1.5 rounded-control px-1.5 py-2 text-[11px] font-semibold transition sm:gap-2 sm:text-sm ${
                        complete
                          ? 'bg-emerald-400/10 text-emerald-100'
                          : item.active
                            ? 'bg-sky-400/10 text-sky-100'
                            : 'text-ink-subtle'
                      }`}
                    >
                      <Icon size={15} className={Icon === Loader ? 'animate-spin' : ''} />
                      <span>{item.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {stageCue && (
          <div className="rounded-card border border-emerald-400/25 bg-emerald-500/10 px-4 py-3 text-sm font-semibold text-emerald-100" role="status" aria-live="polite">
            <div className="flex items-center gap-3">
              <Volume2 size={17} />
              <span>{stageCue}</span>
            </div>
          </div>
        )}

        {error && (
          <div className="flex items-start gap-3 rounded-card border border-rose-400/25 bg-rose-500/10 p-4 text-rose-100" role="alert">
            <AlertCircle size={18} className="mt-0.5 shrink-0" />
            <span className="min-w-0 font-medium">{error}</span>
          </div>
        )}

        <div className="rounded-panel border border-line bg-surface-raised p-4 sm:p-6 lg:p-8">
          {simStep === 'intro' && (
            <div className="grid items-stretch gap-5 lg:grid-cols-[minmax(300px,0.48fr)_minmax(0,1fr)]">
              <div className="min-w-0 rounded-card border border-line bg-overlay p-5">
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-muted">Session setup</div>
                <h2 className="mt-2 text-lg font-semibold text-white sm:text-xl">Ready the test flow</h2>

                <div className="mt-5 rounded-card border border-line bg-surface-sunken/60 p-4">
                  <div className="text-base font-semibold text-white">Timing rules</div>
                  <div className="mt-3 grid gap-2">
                    {[
                      ['Read', '60 sec'],
                      ['Prepare', '5 min'],
                      ['Record', '5 min'],
                      ['Export', 'Recording and report'],
                    ].map(([label, value]) => (
                      <div key={label} className="grid grid-cols-[88px_1fr] items-center gap-3 rounded-control bg-overlay px-3 py-2 text-sm">
                        <span className="font-semibold text-slate-200">{label}</span>
                        <span className="text-ink-muted">{value}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-4 space-y-3 rounded-card border border-line bg-surface-sunken/60 p-4">
                  <label className="flex items-center justify-between gap-3 rounded-control border border-line bg-overlay px-3 py-2 text-sm text-ink-muted">
                    <span className="inline-flex items-center gap-2"><Volume2 size={15} /> Stage sound cues</span>
                    <input
                      type="checkbox"
                      checked={audioCuesEnabled}
                      onChange={(event) => setAudioCuesEnabled(event.target.checked)}
                      className="h-4 w-4"
                    />
                  </label>
                  <label className="flex items-start gap-3 rounded-control border border-line bg-overlay px-3 py-3 text-left text-sm leading-6 text-ink-muted">
                    <input
                      type="checkbox"
                      checked={examRulesAccepted}
                      onChange={(event) => setExamRulesAccepted(event.target.checked)}
                      className="mt-1 h-4 w-4 shrink-0"
                    />
                    <span>I understand the timer continues after the simulation starts.</span>
                  </label>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                  <button
                    type="button"
                    onClick={testMicrophone}
                    className={`inline-flex w-full items-center justify-center gap-2 rounded-control py-3 font-semibold transition ${micTested ? 'bg-emerald-500 text-white' : 'bg-overlay text-white hover:bg-overlay-hover'}`}
                  >
                    <Mic size={18} />
                    {micTested ? 'Microphone ready' : 'Test microphone'}
                  </button>
                  <button
                    type="button"
                    onClick={focusMode ? exitFocusMode : enterFocusMode}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-control border border-line bg-overlay px-4 py-3 text-sm font-semibold text-slate-100 transition hover:bg-overlay-hover"
                  >
                    {focusMode || browserFullscreenActive ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                    {focusMode || browserFullscreenActive ? 'Exit full screen' : 'Full screen'}
                  </button>
                </div>

                <button
                  type="button"
                  onClick={startSimulation}
                  disabled={!examRulesAccepted || !micTested || isOffline}
                  className={`mt-3 w-full rounded-control py-3 font-semibold transition ${examRulesAccepted && micTested && !isOffline ? 'bg-sky-500 text-white hover:bg-sky-400' : 'cursor-not-allowed bg-slate-700 text-ink-subtle'}`}
                >
                  {isOffline ? 'Offline, cannot start' : 'Start simulation'}
                </button>
              </div>

              <div className="flex min-w-0 flex-col rounded-card border border-line bg-overlay p-5">
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-muted">Question bank</div>
                <h2 className="mt-2 text-lg font-semibold text-white sm:text-xl">{questionBank.length} questions available</h2>

                <div className="mt-5 flex min-h-0 flex-1">
                  {loadingQuestionBank ? (
                    <div className="flex min-h-[280px] flex-1 items-center justify-center rounded-card border border-line bg-overlay">
                      <Loader className="animate-spin text-sky-300" size={28} />
                    </div>
                  ) : (
                    <div className="max-h-[360px] min-h-[260px] flex-1 space-y-3 overflow-y-auto overscroll-contain pr-1">
                      <button
                        type="button"
                        onClick={() => setSelectedQuestionId('random')}
                        className={`w-full min-w-0 rounded-card border p-4 text-left transition ${
                          selectedQuestionId === 'random'
                            ? 'border-sky-400/35 bg-sky-400/10'
                            : 'border-line bg-surface-sunken/60 hover:bg-overlay-hover'
                        }`}
                      >
                        <div className="mb-2 flex items-start justify-between gap-3">
                          <div>
                            <div className="text-base font-semibold text-white">Random question</div>
                            <div className="text-xs text-ink-subtle">Question bank</div>
                          </div>
                          {selectedQuestionId === 'random' && <CheckCircle size={18} className="text-sky-200" />}
                        </div>
                        <div className="text-sm leading-6 text-ink-muted">The system picks one random question when simulation starts.</div>
                      </button>

                      {questionBank.length === 0 ? (
                        <div className="rounded-card border border-dashed border-line bg-overlay p-5 text-center text-sm text-ink-muted">
                          No questions yet. Add your first question in the admin panel.
                        </div>
                      ) : (
                        questionBank.map((question) => (
                          <button
                            key={question.id}
                            type="button"
                            onClick={() => setSelectedQuestionId(String(question.id))}
                            className={`w-full min-w-0 rounded-card border p-4 text-left transition ${
                              selectedQuestionId === String(question.id)
                                ? 'border-sky-400/35 bg-sky-400/10'
                                : 'border-line bg-surface-sunken/60 hover:bg-overlay-hover'
                            }`}
                          >
                            <div className="mb-2 flex items-start justify-between gap-3">
                              <div className="text-base font-semibold text-white">{question.topic}</div>
                              {selectedQuestionId === String(question.id) && <CheckCircle size={18} className="text-sky-200" />}
                            </div>
                            <div className="text-sm leading-6 text-ink-muted">{question.question}</div>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {simStep === 'reading' && currentQuestion && (
            <div className="grid gap-5 lg:grid-cols-[280px_minmax(0,1fr)]">
              <div className="rounded-card border border-sky-400/20 bg-sky-400/10 p-6 text-center">
                <div className="mx-auto mb-4 inline-flex h-14 w-14 items-center justify-center rounded-card bg-sky-400/20 text-sky-200">
                  <Clock3 size={26} />
                </div>
                <div className="text-5xl font-semibold text-white">{formatTime(countdown)}</div>
                <div className="mt-2 text-sm text-ink-muted">Reading time</div>
                <div className="mt-5 h-2 overflow-hidden rounded-full bg-overlay-hover">
                  <div className="h-full rounded-full bg-sky-400 transition-all" style={{ width: `${((READING_SECONDS - countdown) / READING_SECONDS) * 100}%` }} />
                </div>
              </div>
              <div className="min-w-0 rounded-card border border-line bg-surface-sunken p-5 sm:p-6">
                <div className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-ink-muted">Question {currentQuestion.id}</div>
                <div className="mb-4 text-sm font-semibold text-sky-300">{currentQuestion.topic}</div>
                <div className="rounded-card border border-line bg-overlay p-5 text-lg leading-8 text-white">{currentQuestion.question}</div>
                <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                  <button type="button" onClick={startPreparationTimer} className="inline-flex flex-1 items-center justify-center gap-2 rounded-control bg-sky-500 py-3 font-semibold text-white transition hover:bg-sky-400">
                    <SkipForward size={16} />
                    Finish reading
                  </button>
                  <button type="button" onClick={fetchAndSetQuestion} className="inline-flex items-center justify-center gap-2 rounded-control border border-line bg-overlay px-4 py-3 font-semibold text-white transition hover:bg-overlay-hover">
                    <Shuffle size={16} />
                    Randomize again
                  </button>
                </div>
              </div>
            </div>
          )}

          {simStep === 'preparation' && currentQuestion && (
            <div className="space-y-6 text-center">
              <div className="mx-auto inline-flex h-20 w-20 items-center justify-center rounded-full bg-sky-400/10 text-sky-200">
                <Clock3 size={34} />
              </div>
              <h2 className="text-lg font-semibold text-white sm:text-xl">Preparation time</h2>
              <div className="text-5xl font-semibold text-sky-300">{formatTime(countdown)}</div>
              <div className="mx-auto max-w-4xl rounded-card border border-line bg-overlay p-5 text-sm leading-6 text-ink-muted">{currentQuestion.question}</div>
              <div className="h-3 w-full overflow-hidden rounded-full bg-overlay-hover">
                <div className="h-3 rounded-full bg-sky-400 transition-all" style={{ width: `${((PREPARATION_SECONDS - countdown) / PREPARATION_SECONDS) * 100}%` }} />
              </div>
              <button type="button" onClick={startRecordingAuto} className="inline-flex items-center justify-center gap-2 rounded-control bg-sky-500 px-6 py-3 font-semibold text-white transition hover:bg-sky-400">
                <SkipForward size={16} />
                Start recording
              </button>
            </div>
          )}

          {simStep === 'recording' && currentQuestion && (
            <div className="space-y-6 text-center">
              <div className="flex items-center justify-center">
                <div className="inline-flex h-24 w-24 items-center justify-center rounded-full border border-rose-400/20 bg-rose-500/10">
                  <Circle className="animate-pulse text-rose-500" size={48} fill="currentColor" />
                </div>
              </div>
              <h2 className="text-lg font-semibold text-rose-300 sm:text-xl">Recording</h2>
              <div className="text-5xl font-semibold text-white">{formatTime(recordingTime)}</div>
              <div className="mx-auto max-w-4xl rounded-card border border-line bg-overlay p-5 text-sm leading-6 text-ink-muted">{currentQuestion.question}</div>
              <div className="h-3 w-full overflow-hidden rounded-full bg-overlay-hover">
                <div className="h-3 rounded-full bg-rose-500 transition-all" style={{ width: `${(recordingTime / RECORDING_SECONDS) * 100}%` }} />
              </div>
              <button type="button" onClick={stopRecording} className="inline-flex items-center justify-center gap-2 rounded-control bg-rose-500 px-6 py-3 font-semibold text-white transition hover:bg-rose-400">
                <Pause size={16} />
                Stop recording
              </button>
            </div>
          )}

          {simStep === 'playback' && (
            <div className="space-y-6">
              <div className="text-center">
                <div className="mx-auto inline-flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-200">
                  <CheckCircle size={34} />
                </div>
                <h2 className="mt-4 text-lg font-semibold text-white sm:text-xl">Recording complete</h2>
                <div className="mt-3 inline-flex rounded-full border border-line bg-overlay px-4 py-2 text-sm font-semibold text-ink-muted">
                  Duration: {formatTime(recordingTime)}
                </div>
              </div>
              <AudioPlayer audioUrl={recordedAudioURL} />
              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={analyzeRecording}
                  disabled={isOffline}
                  className={`inline-flex flex-1 items-center justify-center gap-2 rounded-control py-3 font-semibold transition ${isOffline ? 'cursor-not-allowed bg-slate-700 text-ink-subtle opacity-60' : 'bg-sky-500 text-white hover:bg-sky-400'}`}
                >
                  <CheckCircle size={16} />
                  {isOffline ? 'Offline, cannot analyze' : 'Analyze my speech'}
                </button>
                <button type="button" onClick={downloadRecording} className="inline-flex items-center justify-center gap-2 rounded-control border border-line bg-overlay px-6 py-3 font-semibold text-white transition hover:bg-overlay-hover">
                  <Download size={18} />
                  Download recording
                </button>
              </div>
              <button type="button" onClick={resetSimulation} className="inline-flex w-full items-center justify-center gap-2 rounded-control border border-line bg-overlay py-3 font-semibold text-white transition hover:bg-overlay-hover">
                <RefreshCcw size={16} />
                Start new simulation
              </button>
            </div>
          )}

          {simStep === 'analyzing' && (
            <div className="py-12 text-center" role="status" aria-live="polite">
              <div className="mx-auto mb-5 inline-flex h-20 w-20 items-center justify-center rounded-full border border-sky-400/25 bg-sky-400/10 text-sky-300">
                <Loader className="animate-spin" size={40} />
              </div>
              <div className="text-lg font-semibold text-white">Analyzing your speech</div>
              <div className="mt-2 text-sm text-ink-muted">{progressMessage}</div>
            </div>
          )}

          {simStep === 'results' && results && (
            <ResultsPanel
              results={results}
              onDownloadReport={() => onDownloadReport(results)}
              onReset={resetSimulation}
              resetLabel="Start new simulation"
              extraActions={(
                <button type="button" onClick={downloadRecording} className="inline-flex items-center justify-center gap-2 rounded-control border border-line bg-overlay px-6 py-3 font-semibold text-white transition hover:bg-overlay-hover">
                  <Download size={18} />
                  Download recording
                </button>
              )}
            />
          )}
        </div>
      </div>
    </div>
  );
}
