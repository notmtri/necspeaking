import React, { useCallback, useDeferredValue, useEffect, useMemo, useState } from 'react';
import { Download, Eye, FileAudio, Loader, Play, Search, X } from 'lucide-react';
import { PageHeader } from '../components/AppChrome';
import AudioPlayer from '../components/AudioPlayer';
import { useOverlayDismiss } from '../components/AppOverlays';
import { apiFetch, isAbortError } from '../apiClient';

function SampleActionButton({ tone = 'ghost', onClick, children }) {
  const toneClasses = tone === 'primary'
    ? 'border-sky-400/20 bg-sky-500 text-white hover:bg-sky-400'
    : 'border-line bg-overlay text-slate-200 hover:bg-overlay-hover';

  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center justify-center gap-2 rounded-control border px-4 py-2.5 text-sm font-semibold transition ${toneClasses}`}
    >
      {children}
    </button>
  );
}

function SampleDetailModal({ sample, onClose }) {
  useOverlayDismiss(true, onClose);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-3 backdrop-blur-sm sm:p-4">
      <div
        className="max-h-[85vh] w-full max-w-3xl overflow-y-auto rounded-panel border border-line bg-surface-raised p-5 sm:p-6"
        role="dialog"
        aria-modal="true"
        aria-labelledby="sample-details-title"
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-sky-400/20 bg-sky-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-sky-200">
              <FileAudio size={14} />
              Sample detail
            </div>
            <h2 id="sample-details-title" className="text-lg font-semibold text-white sm:text-xl">{sample.topic}</h2>
            <div className="mt-1 text-sm text-ink-muted">{sample.speaker} | {sample.score}/2.0</div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-line bg-overlay text-slate-200 transition hover:bg-overlay-hover"
            aria-label="Close sample details"
          >
            <X size={18} />
          </button>
        </div>
        {sample.transcript && (
          <section className="mb-4">
            <h3 className="mb-2 text-base font-semibold text-white">Transcript</h3>
            <div className="rounded-card border border-line bg-overlay p-4 text-sm leading-6 text-ink-muted">{sample.transcript}</div>
          </section>
        )}
        {sample.feedback && (
          <section>
            <h3 className="mb-2 text-base font-semibold text-white">Why this speech scored high</h3>
            <div className="rounded-card border border-line bg-overlay p-4 text-sm leading-6 text-ink-muted">{sample.feedback}</div>
          </section>
        )}
      </div>
    </div>
  );
}

export default function SampleLibrary() {
  const [samples, setSamples] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSample, setSelectedSample] = useState(null);
  const [playingSample, setPlayingSample] = useState(null);
  const deferredSearchTerm = useDeferredValue(searchTerm);

  const fetchSamples = useCallback(async (signal) => {
    setLoading(true);
    setError('');
    try {
      const data = await apiFetch('/api/samples', { signal });
      setSamples(data.samples || []);
    } catch (fetchError) {
      if (isAbortError(fetchError)) return;
      setError(fetchError.message || 'Could not load samples.');
      setSamples([]);
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
    const term = deferredSearchTerm.trim().toLowerCase();
    if (!term) return samples;
    return samples.filter((sample) => (
      (sample.topic || '').toLowerCase().includes(term)
      || (sample.speaker || '').toLowerCase().includes(term)
      || (sample.tags || []).some((tag) => String(tag).toLowerCase().includes(term))
    ));
  }, [samples, deferredSearchTerm]);

  const downloadAudio = useCallback((filename, audioUrl) => {
    if (!audioUrl) return;
    const link = document.createElement('a');
    link.href = audioUrl;
    link.download = filename || 'sample-audio';
    link.target = '_blank';
    link.rel = 'noopener';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, []);

  if (loading) {
    return (
      <div className="rounded-panel border border-line bg-surface-raised px-5 py-12 text-center">
        <Loader className="mx-auto mb-3 animate-spin text-sky-300" size={36} />
        <div className="font-semibold text-white">Loading samples...</div>
      </div>
    );
  }

  return (
    <div className="min-w-0 space-y-4 sm:space-y-5">
      <PageHeader
        id="samples-page-title"
        title="Samples"
        description="Listen to high-scoring sample speeches from ex-NEC competitors for reference."
      />

      {error && (
        <div className="rounded-card border border-rose-400/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-100" role="alert">
          {error}
        </div>
      )}

      <section className="rounded-card border border-line bg-surface-raised p-3 sm:p-4">
        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
          <label className="flex min-w-0 items-center gap-3 rounded-control border border-line bg-overlay px-4 py-3">
            <Search size={17} className="shrink-0 text-ink-subtle" />
            <span className="sr-only">Search samples</span>
            <input
              type="search"
              placeholder="Search by topic, speaker, or tag..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="w-full min-w-0 bg-transparent text-sm text-white outline-none placeholder:text-ink-subtle"
            />
          </label>
          <div className="rounded-control border border-line bg-overlay px-4 py-3 text-sm text-ink-muted">
            <span className="font-semibold text-white">{filteredSamples.length}</span> / {samples.length}
          </div>
        </div>
      </section>

      {filteredSamples.length === 0 ? (
        <div className="rounded-panel border border-dashed border-line bg-overlay p-6 text-center text-sm text-ink-muted">
          No samples found.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {filteredSamples.map((sample) => (
            <article key={sample.id} className="min-w-0 rounded-panel border border-line bg-surface-raised p-5">
              <div className="mb-2 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="text-base font-semibold text-white">{sample.topic}</h2>
                  <div className="mt-1 text-xs font-semibold uppercase tracking-[0.14em] text-ink-subtle">{sample.speaker || 'Unknown speaker'}</div>
                </div>
                <div className="shrink-0 rounded-card border border-sky-400/20 bg-sky-400/10 px-3 py-2 text-2xl font-semibold text-sky-200">{sample.score}</div>
              </div>
              <div className="mt-4 rounded-card border border-line bg-overlay p-4 text-sm leading-6 text-ink-muted">{sample.question || '(no question provided)'}</div>
              {Array.isArray(sample.tags) && sample.tags.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {sample.tags.map((tag) => (
                    <span key={tag} className="rounded-full border border-line bg-overlay px-3 py-1 text-xs font-semibold text-ink-muted">
                      {tag}
                    </span>
                  ))}
                </div>
              )}
              <div className="mt-5 flex flex-wrap gap-2">
                <SampleActionButton onClick={() => setPlayingSample(sample)}>
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
        <AudioPlayer
          audioUrl={playingSample.audioUrl}
          variant="docked"
          autoPlay
          onClose={() => setPlayingSample(null)}
        />
      )}

      {selectedSample && (
        <SampleDetailModal sample={selectedSample} onClose={() => setSelectedSample(null)} />
      )}
    </div>
  );
}
