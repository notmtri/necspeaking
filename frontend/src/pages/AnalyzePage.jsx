import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AlertCircle, BookOpen, Check, CheckCircle, FileAudio, Loader, Mic, Pause, RotateCcw, Square, Upload, Volume2 } from 'lucide-react';
import { PageHeader } from '../components/AppChrome';
import ResultsPanel from '../components/ResultsPanel';
import QuestionPicker, { pickRandomQuestion } from '../components/QuestionPicker';
import { CRITERIA, TONES, formatTime } from '../appShared';
import { useAnalysisJob } from '../useAnalysisJob';

const MAX_RECORDING_SECONDS = 300;
const MAX_AUDIO_BYTES = 50 * 1024 * 1024;
const STEPS = ['Your answer', 'Analysis', 'Feedback'];

export default function AnalyzePage({ onDownloadReport, onAnalysisUserUpdate, isOffline, isLoggedIn = false, onOpenAuth = null, randomQuestionRequest = 0, onRandomQuestionHandled = null }) {
  const [step, setStep] = useState('input');
  const [topic, setTopic] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickedQuestion, setPickedQuestion] = useState(null);
  const [audioFile, setAudioFile] = useState(null);
  const [audioURL, setAudioURL] = useState(null);
  const [audioSourceType, setAudioSourceType] = useState('upload');
  const [isPlaying, setIsPlaying] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  const [progressMessage, setProgressMessage] = useState('Queued for processing.');
  const audioFileRef = useRef(null);
  audioFileRef.current = audioFile;
  const [starterQuestion, setStarterQuestion] = useState(false);
  const topicRef = useRef(topic);
  topicRef.current = topic;

  // "Start my first practice" on the profile: fill in a random past question
  // so a new student's first step is speaking, not choosing. Never replaces a
  // prompt that is already there (a resumed analysis, or one they typed).
  useEffect(() => {
    if (!randomQuestionRequest) return undefined;
    let cancelled = false;
    pickRandomQuestion()
      .then((question) => {
        if (cancelled || !question || topicRef.current) return;
        setTopic(question.promptText);
        setPickedQuestion(question);
        setStarterQuestion(true);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) onRandomQuestionHandled?.();
      });
    return () => {
      cancelled = true;
    };
  }, [randomQuestionRequest, onRandomQuestionHandled]);

  const { submit: submitAnalysis } = useAnalysisJob({
    source: 'analyze',
    onResume: (context) => {
      setTopic(context.topic || '');
      setResults(null);
      setError(null);
      setProgressMessage('Picking up your analysis where you left off.');
      setStep('uploading');
    },
    onProgress: setProgressMessage,
    onComplete: async (result) => {
      setResults(result);
      if (result.user) await onAnalysisUserUpdate?.(result.user);
      setStep('results');
    },
    onFailed: (requestError) => {
      setError(requestError?.message || 'Connection failed. Make sure the backend is running.');
      // After a resume there is no audio in memory to retry with.
      setStep(audioFileRef.current ? 'preview' : 'input');
    },
  });

  const audioRef = useRef(null);
  const uploadInputRef = useRef(null);
  const replaceInputRef = useRef(null);
  const recorderRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const streamRef = useRef(null);

  const releaseRecordingResources = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }, []);

  const cancelRecording = useCallback(() => {
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== 'inactive') {
      recorder.ondataavailable = null;
      recorder.onstop = null;
      recorder.stop();
    }
    recorderRef.current = null;
    chunksRef.current = [];
    releaseRecordingResources();
    setIsRecording(false);
    setRecordingSeconds(0);
  }, [releaseRecordingResources]);

  useEffect(() => () => {
    if (audioURL) URL.revokeObjectURL(audioURL);
  }, [audioURL]);

  useEffect(() => () => cancelRecording(), [cancelRecording]);

  const clearAudio = useCallback(() => {
    if (audioURL) URL.revokeObjectURL(audioURL);
    setAudioFile(null);
    setAudioURL(null);
    setAudioSourceType('upload');
    setIsPlaying(false);
  }, [audioURL]);

  const handleFileUpload = useCallback((event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (file.size > MAX_AUDIO_BYTES) {
      setError('Audio file is over 50 MB. Upload a shorter recording or compress the file before analysis.');
      event.target.value = '';
      return;
    }

    cancelRecording();
    if (audioURL) URL.revokeObjectURL(audioURL);
    setAudioFile(file);
    setAudioURL(URL.createObjectURL(file));
    setAudioSourceType('upload');
    setIsPlaying(false);
    setRecordingSeconds(0);
    setResults(null);
    setError(null);
    setStep('preview');
    event.target.value = '';
  }, [audioURL, cancelRecording]);

  const startRecording = useCallback(async () => {
    if (isRecording) return;
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setError('Recording is not supported in this browser. Upload an audio file instead.');
      return;
    }

    clearAudio();
    setError(null);
    setResults(null);
    setStep('input');

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const preferredType = MediaRecorder.isTypeSupported?.('audio/webm') ? 'audio/webm' : '';
      const recorder = preferredType ? new MediaRecorder(stream, { mimeType: preferredType }) : new MediaRecorder(stream);

      streamRef.current = stream;
      recorderRef.current = recorder;
      chunksRef.current = [];
      setAudioSourceType('recording');
      setRecordingSeconds(0);

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };

      recorder.onstop = () => {
        const type = preferredType || 'audio/webm';
        const audioBlob = new Blob(chunksRef.current, { type });
        chunksRef.current = [];
        releaseRecordingResources();
        setIsRecording(false);

        if (audioBlob.size === 0) {
          setAudioSourceType('upload');
          setError('No recording audio was captured. Try recording again or upload a file.');
          return;
        }

        const recordedFile = new File([audioBlob], `necs-recording-${Date.now()}.webm`, { type });
        setAudioFile(recordedFile);
        setAudioURL(URL.createObjectURL(recordedFile));
        setAudioSourceType('recording');
        setIsPlaying(false);
        setStep('preview');
      };

      recorder.start();
      setIsRecording(true);
      timerRef.current = setInterval(() => {
        setRecordingSeconds((current) => {
          const next = current + 1;
          if (next >= MAX_RECORDING_SECONDS) {
            if (timerRef.current) {
              clearInterval(timerRef.current);
              timerRef.current = null;
            }
            if (recorderRef.current && recorderRef.current.state !== 'inactive') {
              recorderRef.current.stop();
            }
            return MAX_RECORDING_SECONDS;
          }
          return next;
        });
      }, 1000);
    } catch {
      releaseRecordingResources();
      setIsRecording(false);
      setAudioSourceType('upload');
      setError('Microphone access was blocked. Allow microphone permission or upload an audio file instead.');
    }
  }, [clearAudio, isRecording, releaseRecordingResources]);

  const stopRecording = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      recorderRef.current.stop();
    } else {
      releaseRecordingResources();
      setIsRecording(false);
    }
  }, [releaseRecordingResources]);

  const togglePlayback = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) audio.pause();
    else audio.play();
    setIsPlaying((playing) => !playing);
  }, [isPlaying]);

  const analyzeAudio = useCallback(async () => {
    if (isOffline) {
      setError('You are offline. Cannot perform analysis.');
      return;
    }
    if (!topic.trim()) {
      setError('Enter a speaking prompt before analyzing.');
      return;
    }
    if (!audioFile) {
      setError('Upload or record an audio response before analyzing.');
      return;
    }

    setStep('uploading');
    setError(null);
    setProgressMessage('Uploading audio and queueing analysis.');

    const formData = new FormData();
    formData.append('audio', audioFile);
    formData.append('topic', topic);
    formData.append('source', 'analyze');

    await submitAnalysis(formData, { topic });
  }, [audioFile, isOffline, submitAnalysis, topic]);

  const reset = useCallback(() => {
    cancelRecording();
    setStep('input');
    setTopic('');
    setStarterQuestion(false);
    clearAudio();
    setResults(null);
    setError(null);
    setProgressMessage('Queued for processing.');
  }, [cancelRecording, clearAudio]);

  /** Same prompt, fresh recording -- the retry half of the practice loop. */
  const practiceAgain = useCallback(() => {
    cancelRecording();
    clearAudio();
    setResults(null);
    setError(null);
    setProgressMessage('Queued for processing.');
    setStep('input');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [cancelRecording, clearAudio]);

  const stepIndex = step === 'uploading' ? 1 : step === 'results' ? 2 : 0;
  const recordingShare = Math.min(100, (recordingSeconds / MAX_RECORDING_SECONDS) * 100);

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <PageHeader
          id="analyze-page-title"
          title="Analyze"
          description="Record or upload a response, run analysis, and receive feedback."
        />
        <ol className="flex flex-wrap items-center gap-x-2 gap-y-2 text-sm" aria-label="Progress">
          {STEPS.map((label, index) => (
            <li key={label} className="flex items-center gap-2" aria-current={index === stepIndex ? 'step' : undefined}>
              <span
                className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold tabular ${
                  index < stepIndex
                    ? 'bg-emerald-500 text-white'
                    : index === stepIndex
                      ? 'bg-ink text-on-ink'
                      : 'bg-overlay text-ink-subtle'
                }`}
              >
                {index < stepIndex ? <Check size={13} /> : index + 1}
              </span>
              <span className={index === stepIndex ? 'font-medium text-ink' : 'text-ink-subtle'}>{label}</span>
              {index < STEPS.length - 1 && <span className="mx-1 h-px w-6 bg-line" aria-hidden="true" />}
            </li>
          ))}
        </ol>
      </div>

      {error && (
        <div className="flex items-start gap-3 rounded-card border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 dark:border-rose-400/25 dark:bg-rose-400/10 dark:text-rose-200" role="alert">
          <AlertCircle size={18} className="mt-0.5 shrink-0" />
          <span className="min-w-0 font-medium">{error}</span>
        </div>
      )}

      {step === 'input' && (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:items-start">
          <section className="min-w-0 rounded-panel border border-line bg-surface-raised p-5 sm:p-7" aria-labelledby="question-heading">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 id="question-heading" className="text-xl font-semibold text-ink">Question</h2>
              <button
                type="button"
                onClick={() => setPickerOpen((open) => !open)}
                aria-expanded={pickerOpen}
                className="inline-flex min-h-[40px] items-center justify-center gap-2 rounded-full border border-line bg-surface-raised px-4 text-sm font-medium text-ink transition-colors duration-200 hover:bg-overlay"
              >
                <BookOpen size={15} className="text-sky-600 dark:text-sky-300" />
                {pickerOpen ? 'Hide past questions' : 'Past NEC questions'}
              </button>
            </div>
            <p className="mt-1.5 text-sm leading-6 text-ink-muted">Pick a past NEC question, or type the exact question you were given.</p>

            {starterQuestion && !pickerOpen && (
              <p className="mt-5 rounded-card bg-sky-50 px-4 py-3 text-sm leading-6 text-sky-900 dark:bg-sky-400/10 dark:text-sky-100">
                Here&apos;s a random past NEC question to start with. Take a minute to plan, then record your answer below, up to 5 minutes. Want a different one? Open Past NEC questions.
              </p>
            )}
            {pickerOpen && (
              <div className="mt-5">
                <QuestionPicker
                  selectedId={pickedQuestion?.id ?? null}
                  onSelect={(question) => {
                    setTopic(question.promptText);
                    setPickedQuestion(question);
                    setPickerOpen(false);
                    setStarterQuestion(false);
                  }}
                />
              </div>
            )}
            <label className="mt-5 block">
              <span className="sr-only">Speaking prompt</span>
              <textarea
                value={topic}
                onChange={(event) => setTopic(event.target.value)}
                placeholder="Type or paste the question here."
                className="min-h-[200px] w-full resize-y rounded-card border border-line bg-surface-raised px-4 py-3.5 text-base leading-7 text-ink outline-none transition-colors duration-200 placeholder:text-ink-subtle focus:border-sky-400 focus:ring-4 focus:ring-sky-100 dark:focus:ring-sky-400/20 sm:px-5"
                rows="6"
              />
            </label>
            {pickedQuestion && topic === pickedQuestion.promptText && (
              <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-sky-50 px-3 py-1 text-xs font-medium text-sky-800 dark:bg-sky-400/10 dark:text-sky-200">
                <BookOpen size={13} />
                {pickedQuestion.label}
              </div>
            )}
          </section>

          <section className="min-w-0 rounded-panel border border-line bg-surface-raised p-5 sm:p-7" aria-labelledby="answer-heading">
            <h2 id="answer-heading" className="text-xl font-semibold text-ink">Your answer</h2>
            <p className="mt-1.5 text-sm leading-6 text-ink-muted">Speak for up to 5 minutes, or upload a recording you made.</p>

            <div className={`mt-6 rounded-card px-5 py-7 text-center transition-colors duration-200 ${isRecording ? 'bg-rose-50 dark:bg-rose-400/10' : 'bg-surface-sunken'}`}>
              <button
                type="button"
                onClick={isRecording ? stopRecording : startRecording}
                aria-label={isRecording ? 'Stop recording' : 'Start recording'}
                className="mx-auto inline-flex h-20 w-20 items-center justify-center rounded-full bg-rose-500 text-white ring-8 ring-rose-100 transition-colors duration-200 hover:bg-rose-600 dark:ring-rose-400/15"
              >
                {isRecording ? <Square size={24} fill="currentColor" /> : <Mic size={30} />}
              </button>
              <div className="mt-5 font-display text-3xl font-semibold tracking-[-0.03em] text-ink tabular" aria-live="off">
                {formatTime(recordingSeconds)}
                <span className="text-base font-normal tracking-normal text-ink-subtle"> / 5:00</span>
              </div>
              <div className="mx-auto mt-3 h-1.5 max-w-xs overflow-hidden rounded-full bg-overlay-hover" aria-hidden="true">
                <div className="h-full rounded-full bg-rose-500 transition-[width] duration-1000 ease-linear" style={{ width: `${recordingShare}%` }} />
              </div>
              <p className="mt-3 text-sm text-ink-muted">{isRecording ? 'Recording. Press stop when you finish.' : 'Press the microphone to start.'}</p>
              {isRecording && (
                <button type="button" onClick={cancelRecording} className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-ink-muted underline-offset-4 hover:text-ink hover:underline">
                  <RotateCcw size={14} />
                  Discard and start over
                </button>
              )}
            </div>

            <div className="my-5 flex items-center gap-3 text-xs font-medium text-ink-subtle" aria-hidden="true">
              <span className="h-px flex-1 bg-line" />
              or
              <span className="h-px flex-1 bg-line" />
            </div>

            <button
              type="button"
              onClick={() => uploadInputRef.current?.click()}
              aria-describedby="recording-file-help"
              disabled={isRecording}
              className="flex w-full items-center gap-4 rounded-card border border-dashed border-line px-4 py-4 text-left transition-colors duration-200 hover:border-sky-300 hover:bg-sky-50/60 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:border-sky-400/40 dark:hover:bg-sky-400/5"
            >
              <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-control bg-sky-50 text-sky-700 dark:bg-sky-400/10 dark:text-sky-300">
                <Upload size={20} />
              </span>
              <span className="min-w-0">
                <span className="block font-medium text-ink">Upload audio</span>
                <span id="recording-file-help" className="block text-sm text-ink-muted">MP3, WAV, M4A, WEBM or OGG, up to 50 MB.</span>
              </span>
            </button>
            <input ref={uploadInputRef} type="file" accept="audio/*" onChange={handleFileUpload} className="hidden" />
          </section>
        </div>
      )}

      {step === 'preview' && (
        <section className="mx-auto max-w-3xl rounded-panel border border-line bg-surface-raised p-5 sm:p-8" aria-labelledby="preview-heading">
          <h2 id="preview-heading" className="text-xl font-semibold text-ink">Check your recording</h2>

          <div className="mt-6 flex flex-col gap-4 rounded-card bg-surface-sunken p-4 sm:flex-row sm:items-center">
            <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-control bg-sky-50 text-sky-700 dark:bg-sky-400/10 dark:text-sky-300">
              <FileAudio size={22} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="break-all font-medium text-ink">{audioFile?.name}</div>
              <div className="text-sm text-ink-muted">
                {audioSourceType === 'recording' ? `Recorded here, ${formatTime(recordingSeconds)} long.` : 'Uploaded file.'}
              </div>
            </div>
            <button type="button" onClick={togglePlayback} className="inline-flex items-center justify-center gap-2 rounded-full border border-line bg-surface-raised px-5 py-2.5 text-sm font-medium text-ink transition-colors duration-200 hover:bg-overlay">
              {isPlaying ? <><Pause size={16} /> Pause</> : <><Volume2 size={16} /> Play preview</>}
            </button>
          </div>

          <div className="mt-6">
            <div className="text-sm font-medium text-ink">Question</div>
            <p className="mt-1.5 max-h-32 overflow-y-auto text-sm leading-6 text-ink-muted">{topic || 'No question entered yet.'}</p>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-2 text-sm">
            <span className="mr-1 text-ink-muted">Scored on</span>
            {CRITERIA.map((criterion) => (
              <span key={criterion.key} className={`rounded-full px-3 py-1 font-medium ${TONES[criterion.tone].soft} ${TONES[criterion.tone].text}`}>
                {criterion.label} <span className="font-normal opacity-80">/ {criterion.max}</span>
              </span>
            ))}
          </div>

          <div className="mt-8 flex flex-col gap-3 border-t border-line pt-6 sm:flex-row sm:items-center">
            <button
              type="button"
              onClick={analyzeAudio}
              disabled={isOffline}
              className="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-full bg-ink px-7 font-medium text-on-ink transition-colors duration-200 hover:bg-ink/85 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <CheckCircle size={18} />
              {isOffline ? 'Offline, cannot analyze' : 'Analyze speech'}
            </button>
            <div className="flex gap-1 sm:ml-auto">
              <button type="button" onClick={() => replaceInputRef.current?.click()} className="inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium text-ink-muted transition-colors duration-200 hover:bg-overlay hover:text-ink">
                <Upload size={15} />
                Replace file
              </button>
              <button type="button" onClick={startRecording} className="inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium text-ink-muted transition-colors duration-200 hover:bg-overlay hover:text-ink">
                <Mic size={15} />
                Record again
              </button>
            </div>
            <input ref={replaceInputRef} type="file" accept="audio/*" onChange={handleFileUpload} className="hidden" />
          </div>
          <audio ref={audioRef} src={audioURL} onEnded={() => setIsPlaying(false)} />
        </section>
      )}

      {step === 'uploading' && (
        <section className="mx-auto max-w-2xl rounded-panel border border-line bg-surface-raised px-6 py-14 text-center" role="status" aria-live="polite">
          <div className="mx-auto inline-flex h-20 w-20 items-center justify-center rounded-full bg-sky-50 text-sky-600 dark:bg-sky-400/10 dark:text-sky-300">
            <Loader className="animate-spin" size={36} />
          </div>
          <h2 className="mt-6 text-xl font-semibold text-ink">Analyzing speech</h2>
          <p className="mt-2 text-sm text-ink-muted">{progressMessage}</p>
          <div className="mx-auto mt-6 flex max-w-xs justify-center gap-2" aria-hidden="true">
            {CRITERIA.map((criterion, index) => (
              <span
                key={criterion.key}
                className={`h-1.5 flex-1 rounded-full ${TONES[criterion.tone].fill} animate-pulse`}
                style={{ animationDelay: `${index * 200}ms` }}
              />
            ))}
          </div>
          <p className="mx-auto mt-6 max-w-md text-sm leading-6 text-ink-subtle">
            This usually takes under a minute. You can switch tabs or leave this page;
            come back to Analyze and your result will be waiting.
          </p>
        </section>
      )}

      {step === 'results' && results && (
        <ResultsPanel
          results={results}
          onDownloadReport={() => onDownloadReport(results)}
          onReset={reset}
          resetLabel="New analysis"
          topic={topic}
          isLoggedIn={isLoggedIn}
          onOpenAuth={onOpenAuth}
          onPracticeAgain={practiceAgain}
        />
      )}
    </div>
  );
}
