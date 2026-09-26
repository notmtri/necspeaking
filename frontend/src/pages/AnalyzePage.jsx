import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AlertCircle, BookOpen, CheckCircle, ClipboardList, FileAudio, Loader, Mic, Pause, RotateCcw, Square, Upload, Volume2 } from 'lucide-react';
import { PageHeader } from '../components/AppChrome';
import ResultsPanel from '../components/ResultsPanel';
import QuestionPicker from '../components/QuestionPicker';
import { formatTime } from '../appShared';
import { useAnalysisJob } from '../useAnalysisJob';

const MAX_RECORDING_SECONDS = 300;
const MAX_AUDIO_BYTES = 50 * 1024 * 1024;

export default function AnalyzePage({ onDownloadReport, onAnalysisUserUpdate, isOffline, isLoggedIn = false }) {
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

  const workflow = [
    { label: 'Record', icon: Mic, active: step === 'input' || step === 'preview', complete: step === 'uploading' || step === 'results' },
    { label: 'Analyze', icon: Loader, active: step === 'uploading', complete: step === 'results' },
    { label: 'Review', icon: CheckCircle, active: step === 'results', complete: false },
  ];

  return (
    <div className="space-y-4 sm:space-y-6">
      <PageHeader
        id="analyze-page-title"
        title="Analyze"
        description="Record or upload a response, run analysis, and receive feedback."
      />

      <div className="mx-auto max-w-xl rounded-card border border-line bg-overlay p-1.5">
        <div className="grid grid-cols-3 gap-1.5">
          {workflow.map((item) => {
            const Icon = item.complete ? CheckCircle : item.icon;
            return (
              <div
                key={item.label}
                className={`flex min-h-[44px] items-center justify-center gap-2 rounded-control px-2 py-2 text-xs font-semibold transition sm:text-sm ${
                  item.complete
                    ? 'bg-emerald-400/10 text-emerald-100'
                    : item.active
                      ? 'bg-sky-400/10 text-sky-100'
                      : 'text-ink-subtle'
                }`}
              >
                <Icon size={16} className={item.active && item.label === 'Analyze' ? 'animate-spin' : ''} />
                <span>{item.label}</span>
              </div>
            );
          })}
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-3 rounded-card border border-rose-400/25 bg-rose-500/10 p-3 text-sm text-rose-100 sm:p-4" role="alert">
          <AlertCircle size={18} className="mt-0.5 shrink-0" />
          <span className="min-w-0 font-medium">{error}</span>
        </div>
      )}

      <div className="rounded-panel border border-line bg-surface-raised p-4 sm:p-5 lg:p-6">
        {step === 'input' && (
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.08fr)_minmax(320px,0.92fr)]">
            <div className="min-w-0 rounded-card border border-line bg-overlay p-4 sm:p-5">
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-control bg-sky-400/10 text-sky-200 sm:h-11 sm:w-11">
                  <ClipboardList size={20} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-base font-semibold text-white">Speaking prompt</div>
                  <div className="mt-1 text-sm leading-6 text-ink-muted">Pick a past NEC question, or type the exact question you were given.</div>
                </div>
                <button
                  type="button"
                  onClick={() => setPickerOpen((open) => !open)}
                  aria-expanded={pickerOpen}
                  className="inline-flex min-h-[40px] shrink-0 items-center justify-center gap-2 rounded-control border border-sky-400/20 bg-sky-400/10 px-4 py-2 text-sm font-semibold text-sky-100 transition hover:bg-sky-400/20"
                >
                  <BookOpen size={15} />
                  {pickerOpen ? 'Hide past questions' : 'Past NEC questions'}
                </button>
              </div>
              {pickerOpen && (
                <div className="mb-4">
                  <QuestionPicker
                    selectedId={pickedQuestion?.id ?? null}
                    onSelect={(question) => {
                      setTopic(question.promptText);
                      setPickedQuestion(question);
                      setPickerOpen(false);
                    }}
                  />
                </div>
              )}
              <label className="block">
                <span className="sr-only">Speaking prompt</span>
                <textarea
                  value={topic}
                  onChange={(event) => setTopic(event.target.value)}
                  placeholder="Enter the topic or question."
                  className="min-h-[178px] w-full resize-y rounded-control border border-line bg-surface-sunken px-4 py-3 text-white outline-none transition placeholder:text-ink-subtle focus:border-sky-400/40 focus:ring-2 focus:ring-sky-400/10 sm:min-h-[220px] sm:px-5 sm:py-4"
                  rows="6"
                />
              </label>
              {pickedQuestion && topic === pickedQuestion.promptText && (
                <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-sky-400/20 bg-sky-400/10 px-3 py-1 text-xs font-semibold text-sky-100">
                  <BookOpen size={13} />
                  {pickedQuestion.label}
                </div>
              )}
            </div>

            <div className="min-w-0 space-y-4">
              <div className="rounded-card border border-sky-400/25 bg-sky-400/10 p-4 sm:p-5">
                <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-control bg-sky-400/20 text-sky-200 sm:h-12 sm:w-12">
                  <FileAudio size={22} />
                </div>
                <div className="text-base font-semibold text-white">Upload audio</div>
                <div id="recording-file-help" className="mt-2 text-sm leading-6 text-ink-muted">MP3, WAV, M4A, WEBM, or OGG. Max 50 MB.</div>
                <button
                  type="button"
                  onClick={() => uploadInputRef.current?.click()}
                  aria-describedby="recording-file-help"
                  className="mt-4 inline-flex w-full items-center justify-center gap-3 rounded-control bg-sky-500 px-4 py-3 font-semibold text-white transition hover:bg-sky-400 active:translate-y-px"
                >
                  <Upload size={18} />
                  Upload audio
                </button>
                <input ref={uploadInputRef} type="file" accept="audio/*" onChange={handleFileUpload} className="hidden" />
              </div>

              <div className={`rounded-card border p-4 transition sm:p-5 ${isRecording ? 'border-rose-400/30 bg-rose-500/10' : 'border-line bg-overlay'}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="inline-flex h-10 w-10 items-center justify-center rounded-control bg-emerald-400/10 text-emerald-200 sm:h-11 sm:w-11">
                      <Mic size={20} />
                    </div>
                    <div className="mt-4 text-base font-semibold text-white">Record audio</div>
                    <div className="mt-2 text-sm leading-6 text-ink-muted">Use your microphone, then preview before analysis.</div>
                  </div>
                  <div className={`rounded-full border px-3 py-1 text-sm font-semibold ${isRecording ? 'border-rose-300/30 bg-rose-300/10 text-rose-100' : 'border-line bg-overlay text-ink-muted'}`}>
                    {formatTime(recordingSeconds)}
                  </div>
                </div>
                <div className="mt-5 h-2 overflow-hidden rounded-full bg-overlay-hover">
                  <div
                    className={`h-full rounded-full transition-all ${isRecording ? 'bg-rose-400' : 'bg-emerald-400'}`}
                    style={{ width: `${Math.min(100, (recordingSeconds / MAX_RECORDING_SECONDS) * 100)}%` }}
                  />
                </div>
                {isRecording ? (
                  <div className="mt-5 grid grid-cols-[1fr_auto] gap-2">
                    <button type="button" onClick={stopRecording} className="inline-flex items-center justify-center gap-2 rounded-control bg-rose-500 px-4 py-3 font-semibold text-white transition hover:bg-rose-400">
                      <Square size={16} fill="currentColor" />
                      Stop recording
                    </button>
                    <button type="button" onClick={cancelRecording} className="inline-flex h-12 w-12 items-center justify-center rounded-control border border-line bg-overlay text-slate-200 transition hover:bg-overlay-hover" aria-label="Cancel recording">
                      <RotateCcw size={16} />
                    </button>
                  </div>
                ) : (
                  <button type="button" onClick={startRecording} className="mt-5 inline-flex w-full items-center justify-center gap-3 rounded-control border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 font-semibold text-emerald-100 transition hover:bg-emerald-400/20 active:translate-y-px">
                    <Mic size={18} />
                    Start recording
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {step === 'preview' && (
          <div className="grid gap-5 lg:grid-cols-[minmax(280px,0.85fr)_minmax(0,1.15fr)]">
            <div className="rounded-card border border-line bg-overlay p-5 text-center sm:p-6">
              <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-card bg-sky-400/10 text-sky-200 sm:h-20 sm:w-20">
                <FileAudio size={36} />
              </div>
              <div className="text-sm font-semibold text-ink-muted">{audioSourceType === 'recording' ? 'Browser recording' : 'Uploaded file'}</div>
              <div className="mt-3 break-all text-base font-semibold text-white">{audioFile?.name}</div>
              <div className="mt-2 text-sm text-ink-muted">
                {audioSourceType === 'recording'
                  ? `Recorded in the browser. Duration: ${formatTime(recordingSeconds)}.`
                  : 'Preview the recording, then continue when it sounds correct.'}
              </div>
              <div className="mt-5 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => replaceInputRef.current?.click()}
                  className="inline-flex items-center justify-center gap-2 rounded-control border border-line bg-overlay px-4 py-2.5 text-sm font-semibold text-slate-200 transition hover:bg-overlay-hover"
                >
                  <Upload size={15} />
                  Replace file
                </button>
                <input ref={replaceInputRef} type="file" accept="audio/*" onChange={handleFileUpload} className="hidden" />
                <button type="button" onClick={startRecording} className="inline-flex items-center justify-center gap-2 rounded-control border border-emerald-400/20 bg-emerald-400/10 px-4 py-2.5 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-400/20">
                  <Mic size={15} />
                  Record again
                </button>
              </div>
            </div>
            <div className="rounded-card border border-line bg-surface-sunken p-5 sm:p-6">
              <div className="text-base font-semibold text-white">Ready for submission</div>
              <div className="mt-3 rounded-control border border-line bg-overlay p-4">
                <div className="text-sm font-semibold text-ink-muted">Prompt</div>
                <div className="mt-2 max-h-28 overflow-y-auto text-sm leading-6 text-ink-muted">{topic || 'No prompt entered yet.'}</div>
              </div>
              <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                <button type="button" onClick={togglePlayback} className="inline-flex items-center justify-center gap-2 rounded-control border border-line bg-overlay px-6 py-3 font-semibold text-white transition hover:bg-overlay-hover">
                  {isPlaying ? <><Pause size={16} /> Pause preview</> : <><Volume2 size={16} /> Play preview</>}
                </button>
                <button
                  type="button"
                  onClick={analyzeAudio}
                  disabled={isOffline}
                  className={`inline-flex items-center justify-center gap-2 rounded-control px-6 py-3 font-semibold text-white transition ${isOffline ? 'cursor-not-allowed bg-slate-700 opacity-50' : 'bg-sky-500 hover:bg-sky-400'}`}
                >
                  <CheckCircle size={16} /> {isOffline ? 'Offline, cannot analyze' : 'Analyze speech'}
                </button>
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                {['Content', 'Accuracy', 'Delivery'].map((label) => (
                  <div key={label} className="rounded-control border border-line bg-overlay px-4 py-3 text-center text-sm font-semibold text-slate-200">
                    {label}
                  </div>
                ))}
              </div>
            </div>
            <audio ref={audioRef} src={audioURL} onEnded={() => setIsPlaying(false)} />
          </div>
        )}

        {step === 'uploading' && (
          <div className="py-14 text-center" role="status" aria-live="polite">
            <div className="mx-auto mb-5 inline-flex h-20 w-20 items-center justify-center rounded-full border border-sky-400/25 bg-sky-400/10 text-sky-200">
              <Loader className="animate-spin" size={40} />
            </div>
            <div className="text-lg font-semibold text-white">Analyzing speech</div>
            <div className="mt-2 text-sm text-ink-muted">{progressMessage}</div>
            <div className="mx-auto mt-6 h-2 max-w-md overflow-hidden rounded-full bg-overlay">
              <div className="h-full w-1/2 animate-pulse rounded-full bg-sky-400" />
            </div>
            <p className="mx-auto mt-5 max-w-md text-sm leading-6 text-ink-subtle">
              This usually takes under a minute. You can switch tabs or leave this page;
              come back to Analyze and your result will be waiting.
            </p>
          </div>
        )}

        {step === 'results' && results && (
          <ResultsPanel
            results={results}
            onDownloadReport={() => onDownloadReport(results)}
            onReset={reset}
            resetLabel="New analysis"
            topic={topic}
            isLoggedIn={isLoggedIn}
            onPracticeAgain={practiceAgain}
          />
        )}
      </div>
    </div>
  );
}
