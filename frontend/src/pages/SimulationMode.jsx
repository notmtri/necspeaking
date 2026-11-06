import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AlertCircle, BookOpen, Check, CheckCircle, Circle, ClipboardCheck, Clock3, Download, Loader, Maximize2, Mic, Minimize2, Pause, RefreshCcw, Shuffle, SkipForward, Volume2 } from 'lucide-react';
import { PageHeader } from '../components/AppChrome';
import AudioPlayer from '../components/AudioPlayer';
import { newestPapersFirst } from '../components/QuestionPicker';
import ResultsPanel from '../components/ResultsPanel';
import StageTimer, { playStageTone as beep } from '../components/StageTimer';
import { TONES, formatTime } from '../appShared';
import { apiFetch, isAbortError } from '../apiClient';
import { useAnalysisJob } from '../useAnalysisJob';

const READING_SECONDS = 60;
const PREPARATION_SECONDS = 300;
const RECORDING_SECONDS = 300;

// The real NEC speaking format, shown before the test so nothing surprises.
const TEST_FORMAT = [
  { label: 'Read the question', time: '60 sec', tone: 'sky', icon: BookOpen, body: 'The question appears; read it closely.' },
  { label: 'Prepare', time: '5 min', tone: 'amber', icon: Clock3, body: 'Plan your points. Notes are fine.' },
  { label: 'Speak', time: '5 min', tone: 'rose', icon: Mic, body: 'Recording starts by itself when time is up.' },
  { label: 'Review', time: 'Report', tone: 'violet', icon: ClipboardCheck, body: 'Scores, feedback and your recording.' },
];

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

export default function SimulationMode({ onAnalysisUserUpdate, onDownloadReport, notify, isOffline, isLoggedIn = false, onOpenAuth = null }) {
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
  const recordedBlobRef = useRef(null);
  recordedBlobRef.current = recordedBlob;

  const { submit: submitAnalysis } = useAnalysisJob({
    source: 'simulation',
    onResume: (context) => {
      if (context.question) setCurrentQuestion(context.question);
      setResults(null);
      setError(null);
      setProgressMessage('Picking up your analysis where you left off.');
      setSimStep('analyzing');
    },
    onProgress: setProgressMessage,
    onComplete: async (result) => {
      setResults(result);
      if (result.user) await onAnalysisUserUpdate?.(result.user);
      setSimStep('results');
    },
    onFailed: (requestError) => {
      setError(requestError?.message || 'Connection failed. Make sure the backend is running.');
      // After a resume the recording is no longer in memory.
      setSimStep(recordedBlobRef.current ? 'playback' : 'intro');
    },
  });
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
    if (audioCuesEnabled) beep(kind);
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
      setQuestionBank(newestPapersFirst(data.questions));
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

    await submitAnalysis(formData, { question: currentQuestion });
  }, [currentQuestion, isOffline, recordedBlob, submitAnalysis]);

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

  const STEPS = [
    { id: 'intro', label: 'Set up' },
    { id: 'reading', label: 'Read' },
    { id: 'preparation', label: 'Prepare' },
    { id: 'recording', label: 'Speak' },
    { id: 'results', label: 'Review' },
  ];
  const stageOrder = { intro: 0, reading: 1, preparation: 2, recording: 3, playback: 3, analyzing: 4, results: 4 };
  const stepIndex = stageOrder[simStep] ?? 0;
  const readyToStart = examRulesAccepted && micTested && !isOffline;
  const choosingQuestion = selectedQuestionId !== 'random';
  const questionCountLabel = `${questionBank.length} ${questionBank.length === 1 ? 'question' : 'questions'} available`;

  return (
    <div
      ref={shellRef}
      className={focusMode
        ? 'fixed inset-0 z-[80] overflow-y-auto overscroll-contain bg-surface-base px-[max(0.75rem,env(safe-area-inset-left))] pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-[max(0.75rem,env(safe-area-inset-top))] text-ink sm:px-5 sm:py-5'
        : 'min-w-0'}
    >
      <div className={focusMode ? 'mx-auto max-w-6xl space-y-6' : 'min-w-0 space-y-8'}>
        {focusMode && (
          <div className="sticky top-0 z-30 flex flex-col gap-3 rounded-card border border-line bg-surface-raised/95 p-3 backdrop-blur-md sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 flex-wrap items-center gap-2 text-sm">
              <span className="rounded-full bg-sky-50 px-3 py-1 font-medium text-sky-800 dark:bg-sky-400/10 dark:text-sky-200">
                {STAGE_LABELS[simStep] || 'Simulation'}
              </span>
              <span className="text-ink-muted">
                {currentQuestion?.topic || (selectedQuestionId === 'random' ? 'Random question' : 'Selected question')}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3 sm:justify-end">
              <span className="font-display text-2xl font-semibold tracking-[-0.03em] text-ink tabular">{focusTimerLabel}</span>
              <button
                type="button"
                onClick={exitFocusMode}
                className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-line bg-surface-raised text-ink transition-colors duration-200 hover:bg-overlay"
                aria-label="Exit full screen simulation"
              >
                <Minimize2 size={18} />
              </button>
            </div>
          </div>
        )}

        {!focusMode && (
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <PageHeader
              id="simulation-page-title"
              title="Simulation"
              description="Experience the real test interface and boost your confidence."
            />
            <ol className="flex flex-wrap items-center gap-x-2 gap-y-2 text-sm" aria-label="Progress">
              {STEPS.map((item, index) => (
                <li key={item.id} className="flex items-center gap-2" aria-current={index === stepIndex ? 'step' : undefined}>
                  <span
                    className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold tabular ${
                      index < stepIndex || simStep === 'results'
                        ? 'bg-emerald-500 text-white'
                        : index === stepIndex
                          ? 'bg-ink text-on-ink'
                          : 'bg-overlay text-ink-subtle'
                    }`}
                  >
                    {index < stepIndex || simStep === 'results' ? <Check size={13} /> : index + 1}
                  </span>
                  <span className={index === stepIndex ? 'font-medium text-ink' : 'text-ink-subtle'}>{item.label}</span>
                  {index < STEPS.length - 1 && <span className="mx-0.5 h-px w-4 bg-line" aria-hidden="true" />}
                </li>
              ))}
            </ol>
          </div>
        )}

        {stageCue && (
          <div className="flex items-center gap-3 rounded-card bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800 dark:bg-emerald-400/10 dark:text-emerald-200" role="status" aria-live="polite">
            <Volume2 size={17} />
            <span>{stageCue}</span>
          </div>
        )}

        {error && (
          <div className="flex items-start gap-3 rounded-card border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 dark:border-rose-400/25 dark:bg-rose-400/10 dark:text-rose-200" role="alert">
            <AlertCircle size={18} className="mt-0.5 shrink-0" />
            <span className="min-w-0 font-medium">{error}</span>
          </div>
        )}

        {simStep === 'intro' && (
          <>
            <section aria-labelledby="test-format">
              <h2 id="test-format" className="sr-only">How the test runs</h2>
              <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {TEST_FORMAT.map((stage, index) => {
                  const Icon = stage.icon;
                  const tone = TONES[stage.tone];
                  return (
                    <li key={stage.label} className={`relative rounded-panel p-5 ${tone.soft}`}>
                      <div className="flex items-center justify-between">
                        <span className={`inline-flex h-10 w-10 items-center justify-center rounded-full bg-surface-raised ${tone.text}`}>
                          <Icon size={19} />
                        </span>
                        <span className={`font-display text-sm font-semibold tabular ${tone.text}`}>{index + 1}</span>
                      </div>
                      <div className="mt-5 font-display text-2xl font-semibold tracking-[-0.03em] text-ink">{stage.time}</div>
                      <div className="mt-0.5 text-sm font-medium text-ink">{stage.label}</div>
                      <p className="mt-1 text-sm leading-6 text-ink-muted">{stage.body}</p>
                    </li>
                  );
                })}
              </ol>
            </section>

            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start">
              <section className="min-w-0 rounded-panel border border-line bg-surface-raised p-5 sm:p-7" aria-labelledby="question-choice">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h2 id="question-choice" className="text-xl font-semibold text-ink">Question</h2>
                  <span className="text-sm text-ink-subtle">{questionCountLabel}</span>
                </div>

                <div role="radiogroup" aria-label="Question choice" className="mt-5 grid grid-cols-2 gap-1 rounded-full bg-overlay p-1">
                  {[['random', 'Random question'], ['choose', 'Choose one']].map(([mode, label]) => {
                    const active = mode === 'random' ? !choosingQuestion : choosingQuestion;
                    return (
                      <button
                        key={mode}
                        type="button"
                        role="radio"
                        aria-checked={active}
                        onClick={() => {
                          if (mode === 'random') setSelectedQuestionId('random');
                          else if (!choosingQuestion && questionBank[0]) setSelectedQuestionId(String(questionBank[0].id));
                        }}
                        disabled={mode === 'choose' && questionBank.length === 0}
                        className={`rounded-full px-4 py-2 text-sm font-medium transition-colors duration-200 disabled:opacity-50 ${active ? 'bg-surface-raised text-ink shadow-sm' : 'text-ink-muted hover:text-ink'}`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>

                {!choosingQuestion ? (
                  <div className="mt-5 flex items-start gap-4 rounded-card bg-surface-sunken p-5">
                    <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-violet-50 text-violet-700 dark:bg-violet-400/10 dark:text-violet-300">
                      <Shuffle size={19} />
                    </span>
                    <div>
                      <div className="font-medium text-ink">A random past NEC question</div>
                      <p className="mt-1 text-sm leading-6 text-ink-muted">
                        Like the real test, you see it for the first time when the reading minute starts.
                      </p>
                    </div>
                  </div>
                ) : loadingQuestionBank ? (
                  <div className="mt-5 space-y-2" aria-hidden="true">
                    {[0, 1, 2].map((row) => <div key={row} className="h-20 animate-pulse rounded-card bg-overlay" />)}
                  </div>
                ) : (
                  <div className="mt-5 max-h-[420px] space-y-2 overflow-y-auto overscroll-contain pr-1">
                    {questionBank.map((question) => {
                      const selected = selectedQuestionId === String(question.id);
                      return (
                        <button
                          key={question.id}
                          type="button"
                          onClick={() => setSelectedQuestionId(String(question.id))}
                          aria-pressed={selected}
                          className={`w-full min-w-0 rounded-card border p-4 text-left transition-colors duration-200 ${
                            selected
                              ? 'border-sky-300 bg-sky-50 dark:border-sky-400/40 dark:bg-sky-400/10'
                              : 'border-line hover:bg-overlay'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="text-xs font-medium text-sky-700 dark:text-sky-300">{question.topic}</div>
                            {selected && <CheckCircle size={17} className="shrink-0 text-sky-600 dark:text-sky-300" />}
                          </div>
                          <div className="mt-1 text-sm leading-6 text-ink">{question.question}</div>
                        </button>
                      );
                    })}
                  </div>
                )}
                {questionBank.length === 0 && !loadingQuestionBank && (
                  <p className="mt-4 text-sm text-ink-muted">No questions yet. Add your first question in the admin panel.</p>
                )}
              </section>

              <section className="rounded-panel border border-line bg-surface-raised p-5 sm:p-7 lg:sticky lg:top-24" aria-labelledby="before-start">
                <h2 id="before-start" className="text-xl font-semibold text-ink">Before you start</h2>

                <ul className="mt-5 space-y-3">
                  <li className="flex items-center justify-between gap-3">
                    <span className="flex items-center gap-3 text-sm text-ink">
                      <span className={`inline-flex h-8 w-8 items-center justify-center rounded-full ${micTested ? 'bg-emerald-500 text-white' : 'bg-overlay text-ink-muted'}`}>
                        {micTested ? <Check size={15} /> : <Mic size={15} />}
                      </span>
                      Microphone
                    </span>
                    <button
                      type="button"
                      onClick={testMicrophone}
                      className="rounded-full border border-line bg-surface-raised px-3.5 py-1.5 text-sm font-medium text-ink transition-colors duration-200 hover:bg-overlay"
                    >
                      {micTested ? 'Microphone ready' : 'Test microphone'}
                    </button>
                  </li>
                  <li className="flex items-center justify-between gap-3">
                    <label htmlFor="sim-sound-cues" className="flex items-center gap-3 text-sm text-ink">
                      <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-overlay text-ink-muted">
                        <Volume2 size={15} />
                      </span>
                      Stage sound cues
                    </label>
                    <input
                      id="sim-sound-cues"
                      type="checkbox"
                      checked={audioCuesEnabled}
                      onChange={(event) => setAudioCuesEnabled(event.target.checked)}
                      className="h-5 w-5 accent-sky-500"
                    />
                  </li>
                  <li className="flex items-center justify-between gap-3">
                    <span className="flex items-center gap-3 text-sm text-ink">
                      <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-overlay text-ink-muted">
                        <Maximize2 size={15} />
                      </span>
                      Full screen
                    </span>
                    <button
                      type="button"
                      onClick={focusMode ? exitFocusMode : enterFocusMode}
                      className="rounded-full border border-line bg-surface-raised px-3.5 py-1.5 text-sm font-medium text-ink transition-colors duration-200 hover:bg-overlay"
                    >
                      {focusMode || browserFullscreenActive ? 'Exit full screen' : 'Full screen'}
                    </button>
                  </li>
                </ul>

                <label className="mt-5 flex items-start gap-3 rounded-card bg-surface-sunken p-4 text-sm leading-6 text-ink">
                  <input
                    type="checkbox"
                    checked={examRulesAccepted}
                    onChange={(event) => setExamRulesAccepted(event.target.checked)}
                    className="mt-1 h-4 w-4 shrink-0 accent-sky-500"
                  />
                  <span>I understand the timer continues after the simulation starts.</span>
                </label>

                <button
                  type="button"
                  onClick={startSimulation}
                  disabled={!readyToStart}
                  className="mt-5 inline-flex min-h-[52px] w-full items-center justify-center gap-2 rounded-full bg-ink font-medium text-on-ink transition-colors duration-200 hover:bg-ink/85 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {isOffline ? 'Offline, cannot start' : 'Start simulation'}
                </button>
                {!readyToStart && !isOffline && (
                  <p className="mt-2 text-center text-xs text-ink-subtle">
                    {!micTested ? 'Test your microphone first.' : 'Tick the box above to start.'}
                  </p>
                )}
              </section>
            </div>
          </>
        )}

        {simStep === 'reading' && currentQuestion && (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start">
            <section className="min-w-0 rounded-panel border border-line bg-surface-raised p-6 sm:p-8">
              <div className="text-sm font-medium text-sky-700 dark:text-sky-300">{currentQuestion.topic}</div>
              <p className="mt-3 font-display text-2xl font-medium leading-[1.4] tracking-[-0.01em] text-ink sm:text-[1.75rem]">{currentQuestion.question}</p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <button type="button" onClick={startPreparationTimer} className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-full bg-ink px-6 font-medium text-on-ink transition-colors duration-200 hover:bg-ink/85">
                  <SkipForward size={16} />
                  Finish reading
                </button>
                <button type="button" onClick={fetchAndSetQuestion} className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-full border border-line bg-surface-raised px-6 font-medium text-ink transition-colors duration-200 hover:bg-overlay">
                  <Shuffle size={16} />
                  Randomize again
                </button>
              </div>
            </section>
            <StageTimer tone="sky" icon={BookOpen} label="Reading time" value={formatTime(countdown)} share={(READING_SECONDS - countdown) / READING_SECONDS} />
          </div>
        )}

        {simStep === 'preparation' && currentQuestion && (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start">
            <section className="min-w-0 rounded-panel border border-line bg-surface-raised p-6 sm:p-8">
              <div className="text-sm font-medium text-ink-muted">Plan your answer to</div>
              <p className="mt-3 text-lg leading-8 text-ink">{currentQuestion.question}</p>
              <button type="button" onClick={startRecordingAuto} className="mt-8 inline-flex min-h-[48px] items-center justify-center gap-2 rounded-full bg-ink px-6 font-medium text-on-ink transition-colors duration-200 hover:bg-ink/85">
                <SkipForward size={16} />
                Start recording
              </button>
            </section>
            <StageTimer tone="amber" icon={Clock3} label="Preparation time" value={formatTime(countdown)} share={(PREPARATION_SECONDS - countdown) / PREPARATION_SECONDS} />
          </div>
        )}

        {simStep === 'recording' && currentQuestion && (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start">
            <section className="min-w-0 rounded-panel border border-line bg-surface-raised p-6 sm:p-8">
              <div className="flex items-center gap-2 text-sm font-medium text-rose-700 dark:text-rose-300">
                <Circle className="motion-safe:animate-pulse" size={10} fill="currentColor" />
                Recording
              </div>
              <p className="mt-3 text-lg leading-8 text-ink">{currentQuestion.question}</p>
              <button type="button" onClick={stopRecording} className="mt-8 inline-flex min-h-[48px] items-center justify-center gap-2 rounded-full bg-rose-500 px-6 font-medium text-white transition-colors duration-200 hover:bg-rose-600">
                <Pause size={16} />
                Stop recording
              </button>
            </section>
            <StageTimer tone="rose" icon={Mic} label="Speaking time" value={formatTime(recordingTime)} share={recordingTime / RECORDING_SECONDS} />
          </div>
        )}

        {simStep === 'playback' && (
          <section className="mx-auto max-w-3xl rounded-panel border border-line bg-surface-raised p-6 sm:p-8">
            <div className="flex items-center gap-4">
              <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-300">
                <CheckCircle size={24} />
              </span>
              <div>
                <h2 className="text-xl font-semibold text-ink">Recording complete</h2>
                <p className="text-sm text-ink-muted">Duration: {formatTime(recordingTime)}</p>
              </div>
            </div>
            <div className="mt-6">
              <AudioPlayer audioUrl={recordedAudioURL} />
            </div>
            <div className="mt-6 flex flex-col gap-3 border-t border-line pt-6 sm:flex-row">
              <button
                type="button"
                onClick={analyzeRecording}
                disabled={isOffline}
                className="inline-flex min-h-[48px] flex-1 items-center justify-center gap-2 rounded-full bg-ink px-6 font-medium text-on-ink transition-colors duration-200 hover:bg-ink/85 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <CheckCircle size={16} />
                {isOffline ? 'Offline, cannot analyze' : 'Analyze my speech'}
              </button>
              <button type="button" onClick={downloadRecording} className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-full border border-line bg-surface-raised px-6 font-medium text-ink transition-colors duration-200 hover:bg-overlay">
                <Download size={18} />
                Download recording
              </button>
            </div>
            <button type="button" onClick={resetSimulation} className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-full px-6 py-3 font-medium text-ink-muted transition-colors duration-200 hover:bg-overlay hover:text-ink">
              <RefreshCcw size={16} />
              Start new simulation
            </button>
          </section>
        )}

        {simStep === 'analyzing' && (
          <section className="mx-auto max-w-2xl rounded-panel border border-line bg-surface-raised px-6 py-14 text-center" role="status" aria-live="polite">
            <div className="mx-auto inline-flex h-20 w-20 items-center justify-center rounded-full bg-sky-50 text-sky-600 dark:bg-sky-400/10 dark:text-sky-300">
              <Loader className="animate-spin" size={36} />
            </div>
            <h2 className="mt-6 text-xl font-semibold text-ink">Analyzing your speech</h2>
            <p className="mt-2 text-sm text-ink-muted">{progressMessage}</p>
            <p className="mx-auto mt-6 max-w-md text-sm leading-6 text-ink-subtle">
              This usually takes under a minute. You can switch tabs or leave this page;
              come back to Simulation and your result will be waiting.
            </p>
          </section>
        )}

        {simStep === 'results' && results && (
          <ResultsPanel
            results={results}
            onDownloadReport={() => onDownloadReport(results)}
            onReset={resetSimulation}
            resetLabel="Start new simulation"
            topic={currentQuestion?.question || ''}
            isLoggedIn={isLoggedIn}
            onOpenAuth={onOpenAuth}
            extraActions={(
              <button type="button" onClick={downloadRecording} className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-line bg-surface-raised px-5 py-3 font-medium text-ink transition-colors duration-200 hover:bg-overlay">
                <Download size={16} />
                Download recording
              </button>
            )}
          />
        )}
      </div>
    </div>
  );
}
