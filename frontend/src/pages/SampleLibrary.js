import React, { memo, useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { Loader, Pause, Play, X } from 'lucide-react';
import { API_BASE_URL } from '../appShared';

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
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-[#000] border-t border-[#222] p-3 flex items-center justify-between gap-4">
      <audio
        ref={audioRef}
        src={audioUrl}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onPause={() => setIsPlaying(false)}
        onEnded={() => setIsPlaying(false)}
      />
      <button onClick={togglePlay} className="flex items-center justify-center w-10 h-10 rounded-full bg-[#1e90ff] text-white hover:bg-[#1a7be6] transition">
        {isPlaying ? <Pause size={20} /> : <Play size={20} />}
      </button>
      <div className="flex-1 flex flex-col items-center text-sm text-[#d1d1d1]">
        <input type="range" value={progress} onChange={handleSeek} className="w-full accent-[#1e90ff]" />
        <div className="flex justify-between w-full text-xs text-[#888] mt-1">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>
      <button onClick={onClose} className="text-[#888] hover:text-[#d1d1d1]">Close</button>
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

  const fetchSamples = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/samples`);
      const data = await res.json();
      setSamples(data.samples || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSamples();
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

  if (loading) {
    return (
      <div className="text-center py-12">
        <Loader className="animate-spin mx-auto mb-2" size={36} />
        <div>Loading samples...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-1">Sample Library</h2>
        <p className="text-sm text-gray-400">Learn from high-scoring speeches</p>
      </div>

      <div className="p-3 bg-gray-800 border border-gray-700 rounded">
        <input
          type="text"
          placeholder="Search by topic, speaker, or tag..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-3 py-2 rounded bg-gray-900 border border-gray-700"
        />
      </div>

      {filteredSamples.length === 0 ? (
        <div className="text-center p-6 bg-gray-800 border border-gray-700 rounded">No samples found</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredSamples.map(sample => (
            <div key={sample.id} className="p-4 bg-gray-800 border border-gray-700 rounded">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <div className="font-bold">{sample.topic}</div>
                  <div className="text-xs text-gray-400">{sample.speaker}</div>
                </div>
                <div className="text-2xl font-black text-[#1e90ff]">{sample.score}</div>
              </div>
              <div className="mb-2 text-sm text-[#d1d1d1] italic">{sample.question || '(no question provided)'}</div>
              <div className="flex gap-2">
                <button onClick={() => openPlayback(sample)} className="px-3 py-2 rounded bg-gray-700">Playback</button>
                <button onClick={() => downloadAudio(sample.filename, sample.audioUrl)} className="px-3 py-2 rounded bg-gray-700">Download</button>
                <button onClick={() => setSelectedSample(sample)} className="px-3 py-2 rounded bg-[#1e90ff] text-white">View</button>
              </div>
            </div>
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
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="rounded-xl max-w-3xl w-full max-h-[85vh] overflow-y-auto p-6 bg-gray-800 border border-gray-700">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-2xl font-bold mb-1">{selectedSample.topic}</h3>
                <div className="text-sm text-gray-400">{selectedSample.speaker} | {selectedSample.score}/2.0</div>
              </div>
              <button onClick={() => setSelectedSample(null)} className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-slate-200 transition hover:bg-white/10" aria-label="Close sample details">
                <X size={18} />
              </button>
            </div>
            {selectedSample.transcript && (
              <div className="mb-4">
                <h4 className="font-bold mb-2">Transcript</h4>
                <div className="p-3 rounded bg-gray-900 border border-gray-700 text-sm text-gray-300">{selectedSample.transcript}</div>
              </div>
            )}
            {selectedSample.feedback && (
              <div>
                <h4 className="font-bold mb-2">Why This Speech Scored High</h4>
                <div className="p-3 rounded bg-gray-900 border border-gray-700 text-sm text-gray-300">{selectedSample.feedback}</div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
