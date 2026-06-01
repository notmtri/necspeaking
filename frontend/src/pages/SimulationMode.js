import React, { memo, useCallback, useEffect, useRef, useState } from 'react';
import { AlertCircle, BookOpen, CheckCircle, Circle, Clock3, Download, Headphones, Loader, Maximize2, Mic, Minimize2, Pause, RefreshCcw, Shuffle, SkipForward, Volume2 } from 'lucide-react';
import ResultsInsights from '../components/ResultsInsights';
import { API_BASE_URL, downloadDocumentFromBase64 } from '../appShared';
import { apiFetch, isAbortError, waitForAnalysisJob } from '../apiClient';

const getFocusStageLabel = (step) => ({
  intro: 'Setup',
  reading: 'Reading',
  preparation: 'Preparation',
  recording: 'Recording',
  playback: 'Playback',
  analyzing: 'Analyzing',
  results: 'Results',
}[step] || 'Simulation');

const STAGE_CUES = {
  reading: 'Reading time has started.',
  preparation: 'Preparation time has started.',
  recording: 'Recording has started.',
  playback: 'Recording complete. Review before analysis.',
  analyzing: 'Analysis is processing.',
  results: 'Results are ready.',
};

function SimulationMode({ onAnalysisUserUpdate, notify, isOffline }) {
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
  const [analysisProgressMessage, setAnalysisProgressMessage] = useState('Queued for processing.');
  const [focusMode, setFocusMode] = useState(false);
  const [browserFullscreenActive, setBrowserFullscreenActive] = useState(false);
  const [examRulesAccepted, setExamRulesAccepted] = useState(false);
  const [audioCuesEnabled, setAudioCuesEnabled] = useState(true);
  const [stageCue, setStageCue] = useState(null);

  const simulationShellRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (recordedAudioURL) URL.revokeObjectURL(recordedAudioURL);
    };
  }, [recordedAudioURL]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      const active = document.fullscreenElement === simulationShellRef.current;
      setBrowserFullscreenActive(active);
      if (!active) setFocusMode(false);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const enterFocusMode = useCallback(async () => {
    setFocusMode(true);
    const shell = simulationShellRef.current;
    if (!shell?.requestFullscreen) return;

    try {
      await shell.requestFullscreen();
      setBrowserFullscreenActive(true);
    } catch {
      setBrowserFullscreenActive(false);
    }
  }, []);

  const shouldConfirmFocusExit = useCallback(() => (
    focusMode && ['reading', 'preparation', 'recording'].includes(simStep)
  ), [focusMode, simStep]);

  const exitFocusMode = useCallback(async () => {
    if (shouldConfirmFocusExit() && !window.confirm('Exit full screen during the active simulation? Your timer will continue running.')) {
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
  }, [shouldConfirmFocusExit]);

  const playStageTone = useCallback((kind = 'stage') => {
    if (!audioCuesEnabled) return;
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;

    try {
      const context = new AudioContext();
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      const frequency = kind === 'recording' ? 620 : kind === 'complete' ? 880 : 740;
      oscillator.frequency.value = frequency;
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

  const fetchQuestionBank = useCallback(async (signal) => {
    setLoadingQuestionBank(true);
    try {
      const data = await apiFetch('/api/questions', { signal });
      setQuestionBank(data.questions || []);
    } catch (error) {
      if (isAbortError(error)) return;
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
      if (data.error) {
        setError('No questions available. Please add questions in admin panel.');
        return false;
      }
      setCurrentQuestion(data.question);
      setError(null);
      startReadingTimer();
      return true;
    } catch (error) {
      setError(error.message || 'Failed to load question. Check your connection.');
      return false;
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
  }, [examRulesAccepted, fetchAndSetQuestion, micTested, notify, questionBank, selectedQuestionId, startReadingTimer, isOffline]);

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
    if (isOffline) {
      setError('You are offline. Cannot perform analysis.');
      return;
    }
    if (!recordedBlob || !currentQuestion) return;
    setSimStep('analyzing');
    setAnalysisProgressMessage('Uploading audio and queueing analysis.');
    const formData = new FormData();
    formData.append('audio', recordedBlob, 'recording.webm');
    formData.append('topic', currentQuestion.question);
    formData.append('source', 'simulation');
    try {
      const data = await apiFetch('/api/analyze', { method: 'POST', body: formData });
      const job = await waitForAnalysisJob(data.job.id, {
        onTick: (jobState) => setAnalysisProgressMessage(jobState?.progressMessage || 'Processing analysis job.'),
      });
      if (!job.result) {
        throw new Error('Analysis job completed without a result payload.');
      }
      setResults(job.result);
      if (job.result.user) {
        await onAnalysisUserUpdate?.(job.result.user);
      }
      setSimStep('results');
    } catch (error) {
      setError(error.message || 'Connection failed. Make sure the backend is running.');
      setSimStep('playback');
    }
  }, [currentQuestion, onAnalysisUserUpdate, recordedBlob, isOffline]);

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
    setAnalysisProgressMessage('Queued for processing.');
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

  const focusTimerLabel = (() => {
    if (simStep === 'reading' || simStep === 'preparation') return formatTime(countdown);
    if (simStep === 'recording' || simStep === 'playback') return formatTime(recordingTime);
    if (simStep === 'analyzing') return 'Processing';
    if (simStep === 'results') return 'Complete';
    return micTested ? 'Ready' : 'Setup';
  })();
  const focusStageLabel = getFocusStageLabel(simStep);
  const focusQuestionLabel = currentQuestion?.topic || (selectedQuestionId === 'random' ? 'Question bank' : 'Selected question');
  const completedSimulationSteps = {
    intro: [],
    reading: ['intro'],
    preparation: ['intro', 'reading'],
    recording: ['intro', 'reading', 'preparation'],
    playback: ['intro', 'reading', 'preparation', 'recording'],
    analyzing: ['intro', 'reading', 'preparation', 'recording'],
    results: ['intro', 'reading', 'preparation', 'recording'],
  }[simStep] || [];
  const simulationWorkflow = [
    { id: 'intro', label: 'Setup', icon: Headphones, active: simStep === 'intro' },
    { id: 'reading', label: 'Read', icon: BookOpen, active: simStep === 'reading' },
    { id: 'preparation', label: 'Prep', icon: Clock3, active: simStep === 'preparation' },
    { id: 'recording', label: 'Record', icon: Mic, active: simStep === 'recording' || simStep === 'playback' },
    { id: 'results', label: 'Review', icon: CheckCircle, active: simStep === 'analyzing' || simStep === 'results' },
  ];

  return (
    <div
      ref={simulationShellRef}
      className={focusMode
        ? 'fixed inset-0 z-[80] overflow-y-auto bg-[linear-gradient(180deg,#050b13_0%,#08111f_52%,#050b13_100%)] px-3 py-3 text-slate-100 sm:px-5 sm:py-5'
        : 'min-w-0 space-y-6'}
    >
      <div className={focusMode ? 'mx-auto max-w-7xl space-y-4' : 'min-w-0 space-y-6'}>
      {focusMode && (
        <div className="sticky top-0 z-30 rounded-[22px] border border-white/10 bg-[#06101d]/95 p-3 shadow-[0_18px_60px_rgba(2,6,23,0.38)] backdrop-blur-xl">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <div className="rounded-full border border-sky-300/25 bg-sky-300/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-sky-100">
                Exam focus
              </div>
              <div className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-sm font-semibold text-white">
                {focusStageLabel}
              </div>
              <div className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-sm text-slate-300">
                {focusQuestionLabel}
              </div>
            </div>
            <div className="flex items-center justify-between gap-3 lg:justify-end">
              <div className="rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-2 text-2xl font-black text-white">
                {focusTimerLabel}
              </div>
              <button
                type="button"
                onClick={exitFocusMode}
                className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-slate-200 transition hover:bg-white/[0.08]"
                aria-label="Exit full screen simulation"
                title="Exit full screen"
              >
                <Minimize2 size={18} />
              </button>
            </div>
          </div>
        </div>
      )}

      {!focusMode && (
        <>
          <section className="mx-auto max-w-3xl text-center" aria-labelledby="simulation-page-title">
            <h1 id="simulation-page-title" className="text-2xl font-black tracking-tight text-white sm:text-3xl">
              Simulation
            </h1>
            <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-slate-400 sm:text-base">
              Experience the real test interface and boost your confidence.
            </p>
          </section>

          <div className="mx-auto max-w-2xl rounded-2xl border border-white/10 bg-white/[0.025] p-1.5" aria-label="Simulation workflow">
            <div className="grid grid-cols-5 gap-1.5">
              {simulationWorkflow.map((item) => {
                const complete = completedSimulationSteps.includes(item.id) || simStep === 'results';
                const Icon = simStep === 'analyzing' && item.id === 'results' ? Loader : complete ? CheckCircle : item.icon;
                return (
                  <div
                    key={item.id}
                    className={`flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl px-1.5 py-2 text-[11px] font-semibold transition sm:gap-2 sm:text-sm ${
                      complete
                        ? 'bg-emerald-400/10 text-emerald-100'
                        : item.active
                          ? 'bg-sky-400/10 text-sky-100'
                          : 'text-slate-500'
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
        <div className="rounded-2xl border border-emerald-400/25 bg-emerald-500/10 px-4 py-3 text-sm font-semibold text-emerald-100 shadow-[0_18px_50px_rgba(2,6,23,0.22)]">
          <div className="flex items-center gap-3">
            <Volume2 size={17} />
            <span>{stageCue}</span>
          </div>
        </div>
      )}

      {error && (
        <div className="mb-6 flex items-start gap-3 rounded-2xl border border-rose-400/25 bg-rose-500/10 p-4 text-rose-100">
          <AlertCircle size={18} className="mt-0.5" />
          <span className="min-w-0 font-medium">{error}</span>
        </div>
      )}

      <div className="rounded-[26px] border border-white/10 bg-slate-950/65 p-4 shadow-[0_20px_80px_rgba(2,6,23,0.35)] sm:rounded-[32px] sm:p-6 lg:p-8">
        {simStep === 'intro' && (
          <div className="grid items-stretch gap-5 lg:grid-cols-[minmax(300px,0.48fr)_minmax(0,1fr)]">
            <div className="min-w-0 rounded-[24px] border border-white/10 bg-white/[0.04] p-5">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Session setup</div>
                <h3 className="mt-2 text-2xl font-black text-white">Ready the test flow</h3>
              </div>

              <div className="mt-5 rounded-2xl border border-white/10 bg-slate-950/35 p-4">
                <div className="text-sm font-bold text-white">Timing rules</div>
                <div className="mt-3 grid gap-2">
                {[
                  ['Read', '60 sec'],
                  ['Prepare', '5 min'],
                  ['Record', '5 min'],
                  ['Export', 'Recording and report'],
                ].map((item) => (
                  <div key={item[0]} className="grid grid-cols-[88px_1fr] items-center gap-3 rounded-xl bg-white/[0.04] px-3 py-2 text-sm">
                    <span className="font-semibold text-slate-200">{item[0]}</span>
                    <span className="text-slate-400">{item[1]}</span>
                  </div>
                ))}
                </div>
              </div>

              <div className="mt-4 space-y-3 rounded-2xl border border-white/10 bg-slate-950/35 p-4">
                <label className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-slate-300">
                  <span className="inline-flex items-center gap-2"><Volume2 size={15} /> Stage sound cues</span>
                  <input
                    type="checkbox"
                    checked={audioCuesEnabled}
                    onChange={(event) => setAudioCuesEnabled(event.target.checked)}
                    className="h-4 w-4"
                  />
                </label>
                <label className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-3 text-left text-sm leading-6 text-slate-300">
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
                <button onClick={testMicrophone} className={`w-full rounded-2xl py-3 font-semibold transition ${micTested ? 'bg-emerald-500 text-white' : 'bg-white/[0.06] text-white hover:bg-white/[0.1]'}`}>
                  <div className="flex items-center justify-center gap-2">
                    <Mic size={18} />
                    {micTested ? 'Microphone ready' : 'Test microphone'}
                  </div>
                </button>
                <button
                  type="button"
                  onClick={focusMode ? exitFocusMode : enterFocusMode}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-semibold text-slate-100 transition hover:bg-white/[0.08]"
                >
                  {focusMode || browserFullscreenActive ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                  {focusMode || browserFullscreenActive ? 'Exit full screen' : 'Full screen'}
                </button>
              </div>

              <button
                onClick={startSimulation}
                disabled={!examRulesAccepted || !micTested || isOffline}
                className={`mt-3 w-full rounded-2xl py-3 font-semibold transition ${examRulesAccepted && micTested && !isOffline ? 'bg-sky-500 text-white hover:bg-sky-400' : 'bg-slate-700 text-slate-400 cursor-not-allowed'}`}
              >
                {isOffline ? 'Offline, cannot start' : 'Start simulation'}
              </button>
            </div>

            <div className="flex min-w-0 flex-col rounded-[24px] border border-white/10 bg-white/[0.04] p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Question bank</div>
                  <h3 className="mt-2 text-2xl font-black text-white">{questionBank.length} questions available</h3>
                </div>
              </div>
              <div className="mt-5 flex min-h-0 flex-1">
                {loadingQuestionBank ? (
                  <div className="flex min-h-[280px] flex-1 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04]">
                    <Loader className="animate-spin text-sky-300" size={28} />
                  </div>
                ) : (
                  <div className="max-h-[360px] min-h-[260px] flex-1 space-y-3 overflow-y-auto overscroll-contain pr-1">
                    <button
                      type="button"
                      onClick={() => setSelectedQuestionId('random')}
                      className={`w-full min-w-0 rounded-2xl border p-4 text-left transition ${
                        selectedQuestionId === 'random'
                          ? 'border-sky-400/35 bg-sky-400/10'
                          : 'border-white/10 bg-slate-950/45 hover:bg-white/[0.06]'
                      }`}
                    >
                      <div className="mb-2 flex items-start justify-between gap-3">
                        <div>
                          <div className="font-bold text-white">Random question</div>
                          <div className="text-xs text-slate-500">Question bank</div>
                        </div>
                        {selectedQuestionId === 'random' && <CheckCircle size={18} className="text-sky-200" />}
                      </div>
                      <div className="text-sm leading-6 text-slate-300">The system picks one random question when simulation starts.</div>
                    </button>

                    {questionBank.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.03] p-5 text-center text-sm text-slate-400">
                        No questions yet. Add your first question in admin panel.
                      </div>
                    ) : (
                      questionBank.map((question) => (
                        <button
                          key={question.id}
                          type="button"
                          onClick={() => setSelectedQuestionId(String(question.id))}
                          className={`w-full min-w-0 rounded-2xl border p-4 text-left transition ${
                            selectedQuestionId === String(question.id)
                              ? 'border-sky-400/35 bg-sky-400/10'
                              : 'border-white/10 bg-slate-950/45 hover:bg-white/[0.06]'
                          }`}
                        >
                          <div className="mb-2 flex items-start justify-between gap-3">
                            <div className="font-bold text-white">{question.topic}</div>
                            {selectedQuestionId === String(question.id) && <CheckCircle size={18} className="text-sky-200" />}
                          </div>
                          <div className="text-sm leading-6 text-slate-300">{question.question}</div>
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
            <div className="rounded-[24px] border border-sky-400/20 bg-sky-400/10 p-6 text-center">
              <div className="mx-auto mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-400/15 text-sky-200">
                <Clock3 size={26} />
              </div>
              <div className="text-5xl font-extrabold text-white">{formatTime(countdown)}</div>
              <div className="mt-2 text-sm text-slate-300">Reading time</div>
              <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/[0.08]">
                <div className="h-full rounded-full bg-sky-400 transition-all" style={{ width: `${((60 - countdown) / 60) * 100}%` }} />
              </div>
            </div>
            <div className="min-w-0 rounded-[24px] border border-white/10 bg-[#07111f] p-5 sm:p-6">
              <div className="mb-2 text-xs font-bold uppercase tracking-[0.22em] text-slate-400">Question {currentQuestion.id}</div>
              <div className="mb-4 text-sm font-semibold text-sky-300">{currentQuestion.topic}</div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 text-lg leading-8 text-white">{currentQuestion.question}</div>
              <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                <button onClick={skipReading} className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-sky-500 py-3 font-semibold text-white transition hover:bg-sky-400">
                  <SkipForward size={16} />
                  Finish Reading
                </button>
                <button onClick={randomizeQuestion} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 font-semibold text-white transition hover:bg-white/[0.08]">
                  <Shuffle size={16} />
                  Randomize Again
                </button>
              </div>
            </div>
          </div>
        )}

        {simStep === 'preparation' && currentQuestion && (
          <div className="space-y-6 text-center">
            <div className="mx-auto inline-flex h-20 w-20 items-center justify-center rounded-full bg-sky-400/12 text-sky-200">
              <Clock3 size={34} />
            </div>
            <h3 className="text-2xl font-bold text-white">Preparation Time</h3>
            <div className="text-5xl font-extrabold text-sky-300">{formatTime(countdown)}</div>
            <div className="mx-auto max-w-4xl rounded-2xl border border-white/10 bg-white/[0.04] p-5 text-sm leading-7 text-slate-300">{currentQuestion.question}</div>
            <div className="h-3 w-full overflow-hidden rounded-full bg-white/[0.08]">
              <div className="h-3 rounded-full bg-sky-400 transition-all" style={{ width: `${((300 - countdown) / 300) * 100}%` }} />
            </div>
            <button onClick={() => { clearInterval(timerRef.current); startRecordingAuto(); }} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-sky-500 px-6 py-3 font-semibold text-white transition hover:bg-sky-400">
              <SkipForward size={16} />
              Start Recording
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
            <div className="mx-auto max-w-4xl rounded-2xl border border-white/10 bg-white/[0.04] p-5 text-sm leading-7 text-slate-300">{currentQuestion.question}</div>
            <div className="h-3 w-full overflow-hidden rounded-full bg-white/[0.08]">
              <div className="h-3 rounded-full bg-red-500 transition-all" style={{ width: `${(recordingTime / 300) * 100}%` }} />
            </div>
            <button onClick={stopRecording} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-red-600 px-6 py-3 font-semibold text-white transition hover:bg-red-500">
              <Pause size={16} />
              Stop Recording
            </button>
          </div>
        )}

        {simStep === 'playback' && (
          <div className="space-y-6 text-center">
            <div className="mx-auto inline-flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/12 text-emerald-200">
              <CheckCircle size={34} />
            </div>
            <h3 className="text-2xl font-bold text-white">Recording Complete!</h3>
            <div className="mx-auto inline-flex rounded-full border border-white/10 bg-white/[0.05] px-4 py-2 text-sm font-semibold text-slate-300">
              Duration: {formatTime(recordingTime)}
            </div>
            <AudioPlayback audioUrl={recordedAudioURL} />
            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                onClick={analyzeRecording}
                disabled={isOffline}
                className={`inline-flex flex-1 items-center justify-center gap-2 rounded-2xl py-3 font-semibold transition ${isOffline ? 'bg-slate-700 text-slate-400 cursor-not-allowed opacity-60' : 'bg-sky-500 text-white hover:bg-sky-400'}`}
              >
                <CheckCircle size={16} />
                {isOffline ? 'Offline - Cannot Analyze' : 'Analyze My Speech'}
              </button>
              <button onClick={downloadRecording} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-6 py-3 font-semibold text-white transition hover:bg-white/[0.08]">
                <Download size={18} />
                Recording
              </button>
            </div>
            <button onClick={resetSimulation} className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] py-3 font-semibold text-white transition hover:bg-white/[0.08]">
              <RefreshCcw size={16} />
              Start New Simulation
            </button>
          </div>
        )}

        {simStep === 'analyzing' && (
          <div className="text-center py-12">
            <div className="mx-auto mb-5 inline-flex h-20 w-20 items-center justify-center rounded-full border border-sky-400/25 bg-sky-400/10 text-sky-300">
              <Loader className="animate-spin" size={40} />
            </div>
            <div className="font-semibold text-white">Analyzing your speech...</div>
            <div className="mt-2 text-sm text-slate-300">{analysisProgressMessage}</div>
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
            <ResultsInsights results={results} />
            {results.sample_response && (
              <div className="rounded-[24px] border border-amber-400/20 bg-amber-400/8 p-4">
                <h4 className="font-bold mb-2 text-white">Sample 2.0 Response</h4>
                <div className="text-sm text-slate-200 whitespace-pre-line">{results.sample_response}</div>
              </div>
            )}
            <div className="flex flex-col gap-3 sm:flex-row">
              <button onClick={downloadSimulationReport} className="flex-1 rounded-2xl bg-sky-500 py-3 font-semibold text-white transition hover:bg-sky-400">
                <div className="flex items-center justify-center gap-2"><Download size={16} />Download Report</div>
              </button>
              <button onClick={downloadRecording} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-6 py-3 font-semibold text-white transition hover:bg-white/[0.08]">
                <Download size={18} />
                Recording
              </button>
            </div>
            <button onClick={resetSimulation} className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] py-3 font-semibold text-white transition hover:bg-white/[0.08]">
              <RefreshCcw size={16} />
              Start New Simulation
            </button>
          </div>
        )}
      </div>
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
    <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-4">
      <audio
        ref={audioRef}
        src={audioUrl}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onPause={() => setIsPlaying(false)}
        onEnded={() => setIsPlaying(false)}
      />
      <div className="flex max-w-full flex-wrap items-center gap-4 overflow-hidden">
        <button onClick={togglePlay} className="flex h-12 w-12 items-center justify-center rounded-full bg-sky-500 text-white transition hover:bg-sky-400" aria-label={isPlaying ? 'Pause recording playback' : 'Play recording playback'}>
          {isPlaying ? <Pause size={20} /> : <Volume2 size={20} />}
        </button>
        <div className="min-w-[120px] flex-1 sm:min-w-[160px]">
          <input type="range" value={progress} onChange={handleSeek} className="w-full" aria-label="Recording playback progress" />
          <div className="mt-1 flex justify-between text-xs text-slate-500">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>
      </div>
    </div>
  );
});

export default SimulationMode;
