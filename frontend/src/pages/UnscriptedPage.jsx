import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertCircle, CheckCircle, ChevronDown, Circle, Clock3, Dices, ExternalLink, Loader, Mic, Pause, RefreshCcw, RotateCcw, Search, SkipForward } from 'lucide-react';
import { PageHeader } from '../components/AppChrome';
import AudioPlayer from '../components/AudioPlayer';
import ResultsPanel from '../components/ResultsPanel';
import StageTimer, { playStageTone } from '../components/StageTimer';
import { FIELD_CLASSNAME } from '../components/ProfileBits';
import { PAGE_TITLES, formatTime } from '../appShared';
import { apiFetch, isAbortError } from '../apiClient';
import { useAnalysisJob } from '../useAnalysisJob';
import { checkMicrophone, useCountdown, useTimedRecording } from '../useTimedRecording';
import { UNSCRIPTED_THEMES } from '../unscriptedShared';

const RESEARCH_MINUTES = [5, 10, 15];

export const MODES = {
  research: {
    kind: 'topic',
    label: 'Deep research',
    noun: 'topic',
    talkSeconds: 300,
    summary: (minutes) => `Research it for ${minutes} min, anywhere you like, then explain it in a talk of up to 5 min.`,
    gradingTopic: (text) => `Deep research topic: ${text}`,
    sampleTitle: 'Sample full-marks talk',
    sampleNote: 'The same topic, explained at full marks.',
  },
  takes: {
    kind: 'take',
    label: 'Takes',
    noun: 'take',
    prepSeconds: 120,
    talkSeconds: 180,
    summary: () => 'Take 2 min to prepare, then argue for it for up to 3 min, even if you disagree with it. Arguing against it caps Content at 0.30.',
    gradingTopic: (text) => `Argue for this take: "${text}"`,
    sampleTitle: 'Sample full-marks argument',
    sampleNote: 'The same take, argued for at full marks.',
  },
};

const SAVED_MESSAGE = 'Saved under Recent practice on your profile. Unscripted scores count toward your streak, not your NEC average.';
const SETTINGS_KEY = 'necs.unscripted';
const RECENT_LIMIT = 6;
// Gaps between the names flicked past on a spin, slowing to a stop (about 450 ms).
const SPIN_TICKS_MS = [35, 45, 60, 80, 105, 130];

function readSettings() {
  try {
    const saved = JSON.parse(window.localStorage.getItem(SETTINGS_KEY)) || {};
    return {
      mode: MODES[saved.mode] ? saved.mode : 'research',
      theme: UNSCRIPTED_THEMES.includes(saved.theme) ? saved.theme : 'all',
      minutes: RESEARCH_MINUTES.includes(saved.minutes) ? saved.minutes : 10,
    };
  } catch {
    return { mode: 'research', theme: 'all', minutes: 10 };
  }
}

function writeSettings(settings) {
  try {
    window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // Remembering the last mode is a convenience only.
  }
}

/**
 * A random prompt from the pool, avoiding the ones seen most recently so a
 * spin rarely lands on a repeat. With a tiny pool it only avoids the current one.
 */
export function pickPrompt(pool, recentIds = []) {
  if (!pool.length) return null;
  const recent = new Set(recentIds);
  let candidates = pool.filter((prompt) => !recent.has(prompt.id));
  if (!candidates.length) {
    const current = recentIds[recentIds.length - 1];
    candidates = pool.filter((prompt) => prompt.id !== current);
  }
  if (!candidates.length) candidates = pool;
  return candidates[Math.floor(Math.random() * candidates.length)];
}

/**
 * A card-shuffle rattle for a spin: one short burst of filtered noise per name
 * flicked past (gapsMs apart, the same gaps as the animation, falling in pitch
 * as it slows), then a low soft thud when it lands. Made in the browser, so
 * nothing to download; best effort, as autoplay rules can block it.
 */
export function playShuffleSound(gapsMs = []) {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return;
  try {
    const context = new AudioContextClass();
    const noise = context.createBuffer(1, Math.floor(context.sampleRate * 0.1), context.sampleRate);
    const samples = noise.getChannelData(0);
    for (let i = 0; i < samples.length; i += 1) samples[i] = Math.random() * 2 - 1;

    const burst = (at, { gain, frequency, length }) => {
      const source = context.createBufferSource();
      source.buffer = noise;
      const filter = context.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = frequency;
      filter.Q.value = 1.4;
      const envelope = context.createGain();
      envelope.gain.setValueAtTime(0.0001, at);
      envelope.gain.exponentialRampToValueAtTime(gain, at + 0.004);
      envelope.gain.exponentialRampToValueAtTime(0.0001, at + length);
      source.connect(filter);
      filter.connect(envelope);
      envelope.connect(context.destination);
      source.start(at);
      source.stop(at + length + 0.02);
    };

    let at = context.currentTime + 0.01;
    gapsMs.forEach((gap, index) => {
      burst(at, { gain: 0.2, frequency: 3200 - index * 260, length: 0.03 });
      at += gap / 1000;
    });
    burst(at, { gain: 0.28, frequency: 700, length: 0.09 });
    window.setTimeout(() => context.close?.(), (at - context.currentTime) * 1000 + 400);
  } catch {
    // Sound is a nicety.
  }
}

const prefersReducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

function audioFilename(type = '') {
  // Safari records mp4 audio, which the server accepts as .m4a.
  return type.includes('mp4') ? 'talk.m4a' : 'talk.webm';
}

function SegmentedControl({ label, options, value, onChange, disabled = false, className = '' }) {
  return (
    <div role="radiogroup" aria-label={label} className={`inline-grid auto-cols-fr grid-flow-col gap-1 rounded-full bg-overlay p-1 ${className}`}>
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            disabled={disabled}
            onClick={() => onChange(option.value)}
            className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-50 ${
              active ? 'bg-surface-raised text-ink shadow-sm' : 'text-ink-muted hover:text-ink'
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

/** The spun topic or take. Topics are names, so they run larger than takes. */
function PromptText({ prompt, mode, size = 'large', tick = null }) {
  const isTake = mode === 'takes';
  const text = tick?.text ?? prompt?.text ?? '';
  const sizes = size === 'large'
    ? (isTake ? 'text-[1.75rem] leading-[1.25] sm:text-[2.25rem]' : 'text-[2.25rem] leading-[1.1] sm:text-[3.25rem]')
    : (isTake ? 'text-xl leading-[1.35] sm:text-2xl' : 'text-2xl leading-[1.2] sm:text-[2rem]');
  return (
    <p
      // A new key per name restarts the entrance, so each flick and the landing animate.
      key={tick ? `tick-${tick.step}` : `prompt-${prompt?.id}`}
      className={`${tick ? 'spin-tick' : 'spin-settle rm-fade'} text-balance break-words font-display font-semibold tracking-[-0.03em] text-ink ${sizes}`}
    >
      {isTake ? `“${text}”` : text}
    </p>
  );
}

export default function UnscriptedPage({ onAnalysisUserUpdate, onDownloadReport, notify, isOffline, isLoggedIn = false, onOpenAuth = null }) {
  const initial = useMemo(readSettings, []);
  const [mode, setMode] = useState(initial.mode);
  const [theme, setTheme] = useState(initial.theme);
  const [minutes, setMinutes] = useState(initial.minutes);
  const [prompts, setPrompts] = useState([]);
  const [loadState, setLoadState] = useState('loading'); // loading | ready | error
  const [prompt, setPrompt] = useState(null);
  const [tick, setTick] = useState(null); // a name flicked past mid-spin
  const [stage, setStage] = useState('setup'); // setup | prep | ready | recording | playback | analyzing | results
  const [notes, setNotes] = useState('');
  const [error, setError] = useState(null);
  const [starting, setStarting] = useState(false);
  const [results, setResults] = useState(null);
  const [progressMessage, setProgressMessage] = useState('Queued for processing.');
  const recentRef = useRef({ topic: [], take: [] });
  const spinTimerRef = useRef(null);
  const settings = MODES[mode];

  useEffect(() => writeSettings({ mode, theme, minutes }), [mode, theme, minutes]);

  const countdown = useCountdown();
  const recorder = useTimedRecording({
    maxSeconds: settings.talkSeconds,
    onStopped: () => setStage('playback'),
  });
  const recorderRef = useRef(recorder);
  recorderRef.current = recorder;

  // One resume slot per mode, so a Takes result never lands on a research topic.
  const jobCallbacks = {
    onProgress: setProgressMessage,
    onComplete: async (result) => {
      setResults(result);
      if (result.user) await onAnalysisUserUpdate?.(result.user);
      setStage('results');
      playStageTone('complete');
    },
    onFailed: (requestError) => {
      setError(requestError?.message || 'Connection failed. Make sure the backend is running.');
      setStage(recorderRef.current.audio ? 'playback' : 'setup');
    },
  };
  const onResume = (context) => {
    if (MODES[context.mode]) setMode(context.mode);
    if (context.prompt) setPrompt(context.prompt);
    setResults(null);
    setError(null);
    setProgressMessage('Picking up your analysis where you left off.');
    setStage('analyzing');
  };
  const researchJob = useAnalysisJob({ source: 'research', onResume, ...jobCallbacks });
  const takesJob = useAnalysisJob({ source: 'takes', onResume, ...jobCallbacks });

  const loadPrompts = useCallback(async (signal) => {
    setLoadState('loading');
    try {
      const data = await apiFetch('/api/unscripted/prompts', { signal });
      setPrompts(data.prompts || []);
      setLoadState('ready');
    } catch (fetchError) {
      if (isAbortError(fetchError)) return;
      setLoadState('error');
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    loadPrompts(controller.signal);
    return () => controller.abort();
  }, [loadPrompts]);

  const pool = useMemo(
    () => prompts.filter((item) => item.kind === settings.kind && (theme === 'all' || item.category === theme)),
    [prompts, settings.kind, theme],
  );

  const stopSpin = useCallback(() => {
    if (spinTimerRef.current) {
      clearTimeout(spinTimerRef.current);
      spinTimerRef.current = null;
    }
    setTick(null);
  }, []);

  useEffect(() => stopSpin, [stopSpin]);

  const land = useCallback((next) => {
    const recent = recentRef.current[next.kind];
    recentRef.current[next.kind] = [...recent.filter((id) => id !== next.id), next.id].slice(-RECENT_LIMIT);
    setPrompt(next);
  }, []);

  /** Flicks past a few names, slowing down, then lands on a fresh one. */
  const spin = useCallback(({ animate = true } = {}) => {
    stopSpin();
    const next = pickPrompt(pool, recentRef.current[settings.kind]);
    if (!next) {
      setPrompt(null);
      return;
    }
    if (!animate || pool.length < 3 || prefersReducedMotion()) {
      if (animate) playShuffleSound([]);
      land(next);
      return;
    }
    playShuffleSound(SPIN_TICKS_MS);
    let step = 0;
    const flick = () => {
      if (step >= SPIN_TICKS_MS.length) {
        spinTimerRef.current = null;
        setTick(null);
        land(next);
        return;
      }
      const passing = pool[Math.floor(Math.random() * pool.length)];
      setTick({ step, text: passing.text });
      spinTimerRef.current = setTimeout(flick, SPIN_TICKS_MS[step]);
      step += 1;
    };
    flick();
  }, [land, pool, settings.kind, stopSpin]);

  // Nothing is shown until the student spins. A new mode, or a theme the
  // current one is not in, hides it again rather than choosing for them.
  useEffect(() => {
    if (loadState !== 'ready' || stage !== 'setup' || !prompt) return;
    if (!pool.some((item) => item.id === prompt.id)) setPrompt(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadState, pool]);

  const spinning = tick !== null;

  const beginRecording = useCallback(async () => {
    countdown.stop();
    setError(null);
    const started = await recorder.start();
    if (!started) {
      setError('Could not start the microphone. Allow microphone access and try again.');
      setStage('ready');
      return;
    }
    setStage('recording');
    playStageTone('recording');
  }, [countdown, recorder]);

  const prepSeconds = mode === 'research' ? minutes * 60 : settings.prepSeconds;

  const startSession = useCallback(async () => {
    if (!prompt || spinning) return;
    if (isOffline) {
      notify?.('You are offline. Unscripted needs a connection to grade your talk.', 'error');
      return;
    }
    setStarting(true);
    // Checked now, not after 10 minutes of research.
    const microphone = await checkMicrophone();
    setStarting(false);
    if (microphone !== 'ok') {
      setError(microphone === 'unsupported'
        ? 'This browser cannot record audio. Open necs. in Chrome, Safari or Firefox to practise here.'
        : 'Allow microphone access to record your talk, then press Start again.');
      return;
    }
    setError(null);
    setNotes('');
    setStage('prep');
    playStageTone('stage');
    countdown.start(prepSeconds, () => {
      playStageTone('stage');
      // Away researching in another tab: wait for them rather than recording an empty room.
      if (document.visibilityState === 'visible') beginRecording();
      else setStage('ready');
    });
  }, [beginRecording, countdown, isOffline, notify, prepSeconds, prompt, spinning]);

  // While time is up in a background tab, the tab title says so.
  useEffect(() => {
    if (stage !== 'ready') return undefined;
    document.title = "Time's up, start talking | necs.";
    return () => {
      document.title = PAGE_TITLES.unscripted;
    };
  }, [stage]);

  const backToSetup = useCallback(() => {
    countdown.stop();
    recorder.discard();
    setStage('setup');
    setResults(null);
    setError(null);
    setProgressMessage('Queued for processing.');
  }, [countdown, recorder]);

  const spinAgain = useCallback(() => {
    backToSetup();
    spin();
  }, [backToSetup, spin]);

  const analyze = useCallback(async () => {
    const audio = recorder.audio;
    if (!audio || !prompt) return;
    if (isOffline) {
      setError('You are offline. Cannot perform analysis.');
      return;
    }
    setError(null);
    setStage('analyzing');
    setProgressMessage('Uploading audio and queueing analysis.');
    const formData = new FormData();
    formData.append('audio', audio.blob, audioFilename(audio.type));
    formData.append('topic', settings.gradingTopic(prompt.text));
    formData.append('source', mode);
    const job = mode === 'takes' ? takesJob : researchJob;
    await job.submit(formData, { mode, prompt });
  }, [isOffline, mode, prompt, recorder.audio, researchJob, settings, takesJob]);

  const changeMode = (next) => {
    if (next === mode) return;
    stopSpin();
    setMode(next);
    setError(null);
  };

  const searchUrl = prompt ? `https://www.google.com/search?q=${encodeURIComponent(prompt.text)}` : null;
  const prepShare = prepSeconds ? (prepSeconds - countdown.remaining) / prepSeconds : 0;
  const inSession = ['prep', 'ready', 'recording'].includes(stage);

  return (
    <div className="min-w-0 space-y-8">
      <PageHeader
        id="unscripted-page-title"
        title="Unscripted"
        description="Spin a niche topic to research and explain, or an unpopular take to argue for."
      />

      {error && (
        <div className="flex items-start gap-3 rounded-card border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 dark:border-rose-400/25 dark:bg-rose-400/10 dark:text-rose-200" role="alert">
          <AlertCircle size={18} className="mt-0.5 shrink-0" />
          <span className="min-w-0 font-medium">{error}</span>
        </div>
      )}

      {stage === 'setup' && (
        <>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <SegmentedControl
              label="Mode"
              value={mode}
              onChange={changeMode}
              options={Object.entries(MODES).map(([value, item]) => ({ value, label: item.label }))}
              className="w-full sm:w-auto"
            />
            <label className="flex items-center gap-3 text-sm text-ink-muted">
              <span className="shrink-0">Theme</span>
              {/* appearance-none: Safari otherwise draws its own grey control over the field style. */}
              <span className="relative min-w-0 flex-1 sm:w-56 sm:flex-none">
                <select
                  value={theme}
                  onChange={(event) => setTheme(event.target.value)}
                  className={`${FIELD_CLASSNAME} appearance-none py-2.5 pr-10 text-base sm:text-sm`}
                >
                  <option value="all">All themes</option>
                  {UNSCRIPTED_THEMES.map((name) => <option key={name} value={name}>{name}</option>)}
                </select>
                <ChevronDown size={16} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-ink-muted" aria-hidden="true" />
              </span>
            </label>
          </div>

          <section className="rounded-panel border border-line bg-surface-raised" aria-labelledby="unscripted-prompt-label">
            <div className="flex min-h-[11rem] flex-col justify-center px-5 py-6 sm:min-h-[18rem] sm:px-10 sm:py-10">
              <div id="unscripted-prompt-label" className="text-sm font-medium text-ink-muted">
                {spinning ? 'Spinning' : prompt ? `${settings.label} | ${prompt.category}` : settings.label}
              </div>
              {/* Polite: the landing is announced, the names flicked past are not. */}
              <div className="mt-4 overflow-hidden" aria-live="polite" aria-busy={spinning}>
                {loadState === 'loading' ? (
                  <div className="space-y-3" aria-hidden="true">
                    <div className="h-10 w-3/4 animate-pulse rounded-full bg-overlay sm:h-12" />
                    <div className="h-10 w-1/2 animate-pulse rounded-full bg-overlay sm:h-12" />
                  </div>
                ) : loadState === 'error' ? (
                  <div className="flex flex-col items-start gap-3">
                    <p className="text-base text-ink-muted">Could not load the topics and takes.</p>
                    <button type="button" onClick={() => loadPrompts()} className="inline-flex items-center gap-2 rounded-full border border-line px-4 py-2 text-sm font-medium text-ink transition-colors duration-200 hover:bg-overlay">
                      <RefreshCcw size={15} />
                      Try again
                    </button>
                  </div>
                ) : !pool.length ? (
                  <div className="flex flex-col items-start gap-3">
                    <p className="text-base text-ink-muted">No {settings.noun}s in this theme yet.</p>
                    <button type="button" onClick={() => setTheme('all')} className="rounded-full border border-line px-4 py-2 text-sm font-medium text-ink transition-colors duration-200 hover:bg-overlay">
                      Show all themes
                    </button>
                  </div>
                ) : prompt || spinning ? (
                  <PromptText prompt={prompt} mode={mode} tick={tick} />
                ) : (
                  <p className="text-balance font-display text-[1.75rem] font-semibold leading-[1.2] tracking-[-0.03em] text-ink-subtle sm:text-[2.25rem]">
                    Spin to reveal your {settings.noun}.
                  </p>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-4 border-t border-line px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-10">
              <button
                type="button"
                onClick={() => spin()}
                disabled={!pool.length || spinning}
                // The main action until there is something to start on.
                className={`group inline-flex min-h-[48px] items-center justify-center gap-2 rounded-full px-5 font-medium transition-[background-color,transform] duration-150 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50 ${
                  prompt ? 'border border-line bg-surface-raised text-ink hover:bg-overlay' : 'bg-ink text-on-ink hover:bg-ink/85'
                }`}
              >
                <Dices size={18} className={`transition-transform duration-300 ease-out ${spinning ? 'rotate-180' : ''}`} />
                Spin
              </button>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                {mode === 'research' && (
                  <div className="flex items-center justify-between gap-3 sm:justify-start">
                    <span className="text-sm text-ink-muted" aria-hidden="true">Research</span>
                    <SegmentedControl
                      label="Research time"
                      value={minutes}
                      onChange={setMinutes}
                      options={RESEARCH_MINUTES.map((value) => ({ value, label: `${value} min` }))}
                    />
                  </div>
                )}
                <button
                  type="button"
                  onClick={startSession}
                  disabled={!prompt || spinning || starting || isOffline}
                  className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-full bg-ink px-6 font-medium text-on-ink transition-[background-color,transform] duration-150 hover:bg-ink/85 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {starting ? <Loader size={16} className="animate-spin" /> : null}
                  {isOffline ? 'Offline' : mode === 'research' ? 'Start researching' : 'Start preparing'}
                </button>
              </div>
            </div>
          </section>

          <p className="max-w-[65ch] text-sm leading-6 text-ink-muted">{settings.summary(minutes)}</p>
        </>
      )}

      {inSession && prompt && (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start">
          <section className="min-w-0 rounded-panel border border-line bg-surface-raised p-6 sm:p-8">
            {stage === 'recording' ? (
              <div className="flex items-center gap-2 text-sm font-medium text-rose-700 dark:text-rose-300">
                <Circle className="motion-safe:animate-pulse" size={10} fill="currentColor" />
                Recording
              </div>
            ) : (
              <div className="text-sm font-medium text-ink-muted">
                {stage === 'ready' ? "Time's up" : mode === 'research' ? 'Research this topic' : 'Plan your argument for'}
              </div>
            )}
            <div className="mt-3">
              <PromptText prompt={prompt} mode={mode} size="small" />
            </div>

            {stage === 'prep' && mode === 'research' && searchUrl && (
              <a
                href={searchUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-5 inline-flex items-center gap-2 rounded-full border border-line px-4 py-2 text-sm font-medium text-ink transition-colors duration-200 hover:bg-overlay"
              >
                <Search size={15} />
                Look it up
                <ExternalLink size={13} className="text-ink-subtle" aria-hidden="true" />
              </a>
            )}

            {(stage !== 'recording' || notes) && (
              <label className="mt-6 block">
                <span className="mb-2 block text-sm font-medium text-ink-muted">Notes</span>
                <textarea
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  rows={stage === 'recording' ? 4 : 6}
                  placeholder={mode === 'research' ? 'What it is, an example, why it matters...' : 'It is true because... Critics say... but...'}
                  className={`${FIELD_CLASSNAME} resize-y text-base leading-7 sm:text-sm sm:leading-6`}
                />
                <span className="mt-1 block text-xs text-ink-subtle">Stay on screen while you talk. Not saved.</span>
              </label>
            )}

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              {stage === 'recording' ? (
                <button type="button" onClick={recorder.stop} className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-full bg-rose-500 px-6 font-medium text-white transition-[background-color,transform] duration-150 hover:bg-rose-600 active:scale-[0.97]">
                  <Pause size={16} />
                  Stop recording
                </button>
              ) : (
                <button type="button" onClick={beginRecording} className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-full bg-ink px-6 font-medium text-on-ink transition-[background-color,transform] duration-150 hover:bg-ink/85 active:scale-[0.97]">
                  {stage === 'ready' ? <Mic size={16} /> : <SkipForward size={16} />}
                  {stage === 'ready' ? 'Start talking' : "I'm ready, start talking"}
                </button>
              )}
              <button type="button" onClick={backToSetup} className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-full px-6 font-medium text-ink-muted transition-colors duration-200 hover:bg-overlay hover:text-ink">
                {stage === 'recording' ? 'Discard and go back' : 'Back'}
              </button>
            </div>
          </section>

          <div className="order-first lg:order-none lg:sticky lg:top-24">
            {stage === 'recording' ? (
              <StageTimer
                tone="rose"
                icon={Mic}
                label={`Speaking time, up to ${formatTime(settings.talkSeconds)}`}
                value={formatTime(recorder.elapsed)}
                share={recorder.elapsed / settings.talkSeconds}
              />
            ) : (
              <StageTimer
                tone={mode === 'research' ? 'sky' : 'amber'}
                icon={mode === 'research' ? Search : Clock3}
                label={stage === 'ready' ? "Time's up" : mode === 'research' ? 'Research time' : 'Preparation time'}
                value={formatTime(countdown.remaining)}
                share={stage === 'ready' ? 1 : prepShare}
              />
            )}
          </div>
        </div>
      )}

      {stage === 'playback' && (
        <section className="mx-auto max-w-3xl rounded-panel border border-line bg-surface-raised p-6 sm:p-8">
          <div className="flex items-center gap-4">
            <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-300">
              <CheckCircle size={24} />
            </span>
            <div className="min-w-0">
              <h2 className="text-xl font-semibold text-ink">Recording complete</h2>
              <p className="text-sm text-ink-muted">Duration: {formatTime(recorder.elapsed)}</p>
            </div>
          </div>
          <div className="mt-6">
            <AudioPlayer audioUrl={recorder.audio?.url} />
          </div>
          <div className="mt-6 flex flex-col gap-3 border-t border-line pt-6 sm:flex-row">
            <button
              type="button"
              onClick={analyze}
              disabled={isOffline || !recorder.audio}
              className="inline-flex min-h-[48px] flex-1 items-center justify-center gap-2 rounded-full bg-ink px-6 font-medium text-on-ink transition-[background-color,transform] duration-150 hover:bg-ink/85 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <CheckCircle size={16} />
              {isOffline ? 'Offline, cannot analyze' : 'Analyze my talk'}
            </button>
            <button type="button" onClick={beginRecording} className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-full border border-line bg-surface-raised px-6 font-medium text-ink transition-colors duration-200 hover:bg-overlay">
              <RotateCcw size={16} />
              Record again
            </button>
          </div>
          <button type="button" onClick={spinAgain} className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-full px-6 py-3 font-medium text-ink-muted transition-colors duration-200 hover:bg-overlay hover:text-ink">
            <Dices size={16} />
            Spin a new one
          </button>
        </section>
      )}

      {stage === 'analyzing' && (
        <section className="mx-auto max-w-2xl rounded-panel border border-line bg-surface-raised px-6 py-14 text-center" role="status" aria-live="polite">
          <div className="mx-auto inline-flex h-20 w-20 items-center justify-center rounded-full bg-sky-50 text-sky-600 dark:bg-sky-400/10 dark:text-sky-300">
            <Loader className="animate-spin" size={36} />
          </div>
          <h2 className="mt-6 text-xl font-semibold text-ink">Analyzing your talk</h2>
          <p className="mt-2 text-sm text-ink-muted">{progressMessage}</p>
          <p className="mx-auto mt-6 max-w-md text-sm leading-6 text-ink-subtle">
            This usually takes under a minute. You can leave this page; come back to Unscripted and your result will be waiting.
          </p>
        </section>
      )}

      {stage === 'results' && results && (
        <div className="space-y-6">
          {prompt && (
            <div className="min-w-0">
              <div className="text-sm font-medium text-ink-muted">{settings.label}</div>
              <div className="mt-1">
                <PromptText prompt={prompt} mode={mode} size="small" />
              </div>
            </div>
          )}
          <ResultsPanel
            results={results}
            onDownloadReport={() => onDownloadReport(results)}
            onReset={spinAgain}
            resetLabel="Spin a new one"
            onPracticeAgain={prompt ? backToSetup : null}
            practiceAgainLabel={`Try this ${settings.noun} again`}
            topic={prompt ? settings.gradingTopic(prompt.text) : ''}
            isLoggedIn={isLoggedIn}
            onOpenAuth={onOpenAuth}
            sampleTitle={settings.sampleTitle}
            sampleNote={settings.sampleNote}
            savedMessage={SAVED_MESSAGE}
          />
        </div>
      )}
    </div>
  );
}
