import React, { useCallback, useDeferredValue, useEffect, useMemo, useState } from 'react';
import { Download, Eye, Loader, Play, Search, X } from 'lucide-react';
import { PageHeader } from '../components/AppChrome';
import AudioPlayer from '../components/AudioPlayer';
import { useOverlayDismiss } from '../components/AppOverlays';
import { apiFetch, isAbortError } from '../apiClient';

function SampleActionButton({ tone = 'ghost', onClick, children }) {
  const toneClasses = tone === 'primary'
    ? 'border-ink bg-ink text-white hover:bg-ink/85'
    : 'border-line bg-surface-raised text-ink hover:bg-overlay';

  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center justify-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-colors duration-200 ${toneClasses}`}
    >
      {children}
    </button>
  );
}

// 1.7 and 1.71 side by side read as different precisions; always two places.
const formatSampleScore = (score) => {
  const value = Number(score);
  return Number.isFinite(value) ? value.toFixed(2) : score;
};

/** Tags other than the topic, speaker and score the card already shows. */
const extraTags = (sample) => (Array.isArray(sample.tags) ? sample.tags : []).filter((tag) => {
  const text = String(tag).trim().toLowerCase();
  return text
    && text !== String(sample.topic || '').trim().toLowerCase()
    && text !== String(sample.speaker || '').trim().toLowerCase()
    && !/^\d(\.\d+)?\s*\/\s*2(\.0)?$/.test(text);
});

function SampleDetailModal({ sample, onClose }) {
  useOverlayDismiss(true, onClose);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/40 p-3 backdrop-blur-sm sm:p-4">
      <div
        className="max-h-[85vh] w-full max-w-3xl overflow-y-auto rounded-panel border border-line bg-surface-raised p-5 sm:p-6"
        role="dialog"
        aria-modal="true"
        aria-labelledby="sample-details-title"
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 id="sample-details-title" className="text-lg font-semibold text-ink sm:text-xl">{sample.topic}</h2>
            <div className="mt-1 text-sm text-ink-muted">{sample.speaker} | {formatSampleScore(sample.score)}/2.0</div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-line bg-overlay text-ink transition hover:bg-overlay-hover"
            aria-label="Close sample details"
          >
            <X size={18} />
          </button>
        </div>
        {sample.transcript && (
          <section className="mb-4">
            <h3 className="mb-2 text-base font-semibold text-ink">Transcript</h3>
            <div className="rounded-card border border-line bg-overlay p-4 text-sm leading-6 text-ink-muted">{sample.transcript}</div>
          </section>
        )}
        {sample.feedback && (
          <section>
            <h3 className="mb-2 text-base font-semibold text-ink">Why this speech scored high</h3>
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
        <Loader className="mx-auto mb-3 animate-spin text-sky-600" size={36} />
        <div className="font-semibold text-ink">Loading samples...</div>
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
        <div className="rounded-card border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700" role="alert">
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
              className="w-full min-w-0 bg-transparent text-sm text-ink outline-none placeholder:text-ink-subtle"
            />
          </label>
          <div className="rounded-control border border-line bg-overlay px-4 py-3 text-sm text-ink-muted">
            <span className="font-semibold text-ink">{filteredSamples.length}</span> / {samples.length}
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
                  <h2 className="text-base font-semibold text-ink">{sample.topic}</h2>
                  <div className="mt-1 text-xs font-semibold tracking-normal text-ink-subtle">{sample.speaker || 'Unknown speaker'}</div>
                </div>
                <div className="shrink-0 text-right">
                  <div className="font-display text-2xl font-semibold leading-none tracking-[-0.03em] text-ink tabular">{formatSampleScore(sample.score)}</div>
                  <div className="mt-1 text-xs text-ink-subtle">out of 2.0</div>
                </div>
              </div>
              <p className="mt-4 rounded-card bg-surface-sunken p-4 text-sm leading-6 text-ink-muted">{sample.question || '(no question provided)'}</p>
              {extraTags(sample).length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {extraTags(sample).map((tag) => (
                    <span key={tag} className="rounded-full border border-line bg-overlay px-3 py-1 text-xs font-semibold text-ink-muted">
                      {tag}
                    </span>
                  ))}
                </div>
              )}
              <div className="mt-5 flex flex-wrap gap-2">
                <SampleActionButton tone="primary" onClick={() => setPlayingSample(sample)}>
                  <Play size={15} />
                  Listen
                </SampleActionButton>
                <SampleActionButton onClick={() => setSelectedSample(sample)}>
                  <Eye size={15} />
                  Read transcript
                </SampleActionButton>
                <SampleActionButton onClick={() => downloadAudio(sample.filename, sample.audioUrl)}>
                  <Download size={15} />
                  Download
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
