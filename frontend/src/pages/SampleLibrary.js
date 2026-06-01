import React, { memo, useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { Download, Eye, FileAudio, Loader, Pause, Play, Search, X } from 'lucide-react';
import { apiFetch, isAbortError } from '../apiClient';

function SampleActionButton({ tone = 'ghost', onClick, children }) {
  const toneClasses = tone === 'primary'
    ? 'border-sky-400/20 bg-sky-500 text-white hover:bg-sky-400'
    : 'border-white/10 bg-white/[0.04] text-slate-200 hover:bg-white/[0.08]';

  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center justify-center gap-2 rounded-2xl border px-4 py-2.5 text-sm font-semibold transition ${toneClasses}`}
    >
      {children}
    </button>
  );
}

const PlaybackBar = memo(function PlaybackBar({ audioUrl, onClose, autoPlay = false }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const audioRef = useRef(null);

  useEffect(() => {
    const audio = audioRef.current;
    setIsPlaying(false);
    setProgress(0);
    setCurrentTime(0);
    setDuration(0);

    if (!audio || !audioUrl || !autoPlay) return;

    const playAudio = async () => {
      try {
        await audio.play();
        setIsPlaying(true);
      } catch {
        setIsPlaying(false);
      }
    };

    playAudio();
  }, [audioUrl, autoPlay]);

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

  const handleSeek = useCallback((e) => {
    const audio = audioRef.current;
    if (audio && audio.duration) {
      audio.currentTime = (Number(e.target.value) / 100) * audio.duration;
    }
  }, []);

  const formatTime = useCallback((time) => {
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  }, []);

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-between gap-3 border-t border-white/10 bg-[#06101d]/95 p-3 shadow-[0_-20px_60px_rgba(2,6,23,0.45)] backdrop-blur-xl sm:gap-4">
      <audio
        ref={audioRef}
        src={audioUrl}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onPause={() => setIsPlaying(false)}
        onEnded={() => setIsPlaying(false)}
      />
      <button onClick={togglePlay} className="flex h-10 w-10 items-center justify-center rounded-full bg-sky-500 text-white transition hover:bg-sky-400" aria-label={isPlaying ? 'Pause sample playback' : 'Play sample playback'}>
        {isPlaying ? <Pause size={20} /> : <Play size={20} />}
      </button>
      <div className="flex min-w-0 flex-1 flex-col items-center text-sm text-slate-200">
        <input type="range" value={progress} onChange={handleSeek} className="w-full" aria-label="Sample playback progress" />
        <div className="mt-1 flex w-full justify-between text-xs text-slate-500">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>
      <button onClick={onClose} className="shrink-0 rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-sm font-semibold text-slate-300 transition hover:bg-white/[0.08] hover:text-white">Close</button>
    </div>
  );
});

export default function SampleLibrary() {
  const [samples, setSamples] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSample, setSelectedSample] = useState(null);
  const [playingSample, setPlayingSample] = useState(null);
  const deferredSearchTerm = useDeferredValue(searchTerm);

  const fetchSamples = useCallback(async (signal) => {
    setLoading(true);
    try {
      const data = await apiFetch('/api/samples', { signal });
      setSamples(data.samples || []);
    } catch (error) {
      if (!isAbortError(error)) console.error(error);
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    fetchSamples(controller.signal);
    return () => controller.abort();
  }, [fetchSamples]);

  const filteredSamples = useMemo(() => {
    const term = deferredSearchTerm.toLowerCase();
    if (!term) return samples;
    return samples.filter(sample =>
      sample.topic.toLowerCase().includes(term) ||
      (sample.speaker || '').toLowerCase().includes(term) ||
      (sample.tags || []).some(tag => tag.toLowerCase().includes(term))
    );
  }, [samples, deferredSearchTerm]);

  const openPlayback = useCallback((sample) => {
    setPlayingSample(sample);
  }, []);

  const downloadAudio = useCallback((filename, audioUrl) => {
    const link = document.createElement('a');
    link.href = audioUrl;
    link.download = filename;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, []);

  useEffect(() => {
    if (!selectedSample) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setSelectedSample(null);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedSample]);

  if (loading) {
    return (
      <div className="rounded-[26px] border border-white/10 bg-slate-950/65 px-5 py-12 text-center shadow-[0_20px_80px_rgba(2,6,23,0.4)] sm:rounded-[32px]">
        <Loader className="mx-auto mb-3 animate-spin text-sky-300" size={36} />
        <div className="font-semibold text-white">Loading samples...</div>
      </div>
    );
  }

  return (
    <div className="min-w-0 space-y-4 sm:space-y-5">
      <section className="mx-auto max-w-3xl text-center" aria-labelledby="samples-page-title">
        <h1 id="samples-page-title" className="text-2xl font-black tracking-tight text-white sm:text-3xl">
          Samples
        </h1>
        <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-slate-400 sm:text-base">
          Listen to high-scoring sample speeches from ex-NEC competitors for reference.
        </p>
      </section>

      <section className="rounded-2xl border border-white/10 bg-slate-950/65 p-3 sm:p-4">
        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
          <label className="flex min-w-0 items-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3">
            <Search size={17} className="shrink-0 text-slate-500" />
            <input
              type="text"
              placeholder="Search by topic, speaker, or tag..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full min-w-0 bg-transparent text-sm text-white outline-none placeholder:text-slate-500"
            />
          </label>
          <div className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-slate-300">
            <span className="font-semibold text-white">{filteredSamples.length}</span> / {samples.length}
          </div>
        </div>
      </section>

      {filteredSamples.length === 0 ? (
        <div className="rounded-[26px] border border-dashed border-white/10 bg-white/[0.03] p-6 text-center text-sm text-slate-400 sm:rounded-[32px]">
          No samples found
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {filteredSamples.map(sample => (
            <article key={sample.id} className="min-w-0 rounded-[26px] border border-white/10 bg-slate-950/65 p-5 shadow-[0_18px_60px_rgba(2,6,23,0.28)]">
              <div className="mb-2 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-lg font-bold text-white">{sample.topic}</div>
                  <div className="mt-1 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{sample.speaker || 'Unknown speaker'}</div>
                </div>
                <div className="shrink-0 rounded-2xl border border-sky-400/20 bg-sky-400/10 px-3 py-2 text-2xl font-black text-sky-200">{sample.score}</div>
              </div>
              <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm leading-7 text-slate-300">{sample.question || '(no question provided)'}</div>
              {Array.isArray(sample.tags) && sample.tags.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {sample.tags.map((tag) => (
                    <span key={tag} className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-semibold text-slate-300">
                      {tag}
                    </span>
                  ))}
                </div>
              )}
              <div className="mt-5 flex flex-wrap gap-2">
                <SampleActionButton onClick={() => openPlayback(sample)}>
                  <Play size={15} />
                  Playback
                </SampleActionButton>
                <SampleActionButton onClick={() => downloadAudio(sample.filename, sample.audioUrl)}>
                  <Download size={15} />
                  Download
                </SampleActionButton>
                <SampleActionButton tone="primary" onClick={() => setSelectedSample(sample)}>
                  <Eye size={15} />
                  View
                </SampleActionButton>
              </div>
            </article>
          ))}
        </div>
      )}

      {playingSample && (
        <PlaybackBar
          audioUrl={playingSample.audioUrl}
          autoPlay
          onClose={() => setPlayingSample(null)}
        />
      )}

      {selectedSample && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-3 backdrop-blur-sm sm:p-4">
          <div
            className="max-h-[85vh] w-full max-w-3xl overflow-y-auto rounded-[26px] border border-white/10 bg-[#081120] p-5 shadow-[0_30px_120px_rgba(2,6,23,0.55)] sm:rounded-[32px] sm:p-6"
            role="dialog"
            aria-modal="true"
            aria-labelledby="sample-details-title"
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-sky-400/20 bg-sky-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-sky-200">
                  <FileAudio size={14} />
                  Sample detail
                </div>
                <h3 id="sample-details-title" className="text-xl font-bold text-white sm:text-2xl">{selectedSample.topic}</h3>
                <div className="mt-1 text-sm text-slate-400">{selectedSample.speaker} | {selectedSample.score}/2.0</div>
              </div>
              <button onClick={() => setSelectedSample(null)} className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-slate-200 transition hover:bg-white/10" aria-label="Close sample details">
                <X size={18} />
              </button>
            </div>
            {selectedSample.transcript && (
              <div className="mb-4">
                <h4 className="mb-2 font-bold text-white">Transcript</h4>
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm leading-7 text-slate-300">{selectedSample.transcript}</div>
              </div>
            )}
            {selectedSample.feedback && (
              <div>
                <h4 className="mb-2 font-bold text-white">Why This Speech Scored High</h4>
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm leading-7 text-slate-300">{selectedSample.feedback}</div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
