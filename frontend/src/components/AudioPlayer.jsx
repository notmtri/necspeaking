import React, { memo, useCallback, useEffect, useRef, useState } from 'react';
import { Pause, Play } from 'lucide-react';
import { formatTime } from '../appShared';

/**
 * Single audio player for the whole app.
 *
 * variant="inline"  card-sized player, used inside a page section.
 * variant="docked"  fixed bar pinned to the bottom of the viewport, with a
 *                   close control. Requires `onClose`.
 */
const AudioPlayer = memo(function AudioPlayer({ audioUrl, variant = 'inline', autoPlay = false, onClose }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef(null);

  useEffect(() => {
    const audio = audioRef.current;
    setIsPlaying(false);
    setProgress(0);
    setCurrentTime(0);
    setDuration(0);

    if (!audio || !audioUrl || !autoPlay) return;

    audio.play()
      .then(() => setIsPlaying(true))
      .catch(() => setIsPlaying(false));
  }, [audioUrl, autoPlay]);

  const togglePlay = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio) return;
    try {
      if (isPlaying) {
        audio.pause();
        setIsPlaying(false);
      } else {
        await audio.play();
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
    if (audio) setDuration(Number.isFinite(audio.duration) ? audio.duration : 0);
  }, []);

  const handleSeek = useCallback((event) => {
    const audio = audioRef.current;
    if (audio && audio.duration) {
      audio.currentTime = (Number(event.target.value) / 100) * audio.duration;
    }
  }, []);

  const isDocked = variant === 'docked';
  const containerClassName = isDocked
    ? 'fixed bottom-0 left-0 right-0 z-50 flex items-center gap-3 border-t border-line bg-surface-raised/95 p-3 backdrop-blur-xl sm:gap-4'
    : 'flex items-center gap-4 rounded-card border border-line bg-overlay p-4';

  return (
    <div className={containerClassName}>
      <audio
        ref={audioRef}
        src={audioUrl}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onPause={() => setIsPlaying(false)}
        onEnded={() => setIsPlaying(false)}
      />
      <button
        type="button"
        onClick={togglePlay}
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-sky-500 text-white transition hover:bg-sky-400"
        aria-label={isPlaying ? 'Pause playback' : 'Play recording'}
      >
        {isPlaying ? <Pause size={18} /> : <Play size={18} />}
      </button>
      <div className="min-w-0 flex-1">
        <input
          type="range"
          min="0"
          max="100"
          value={progress}
          onChange={handleSeek}
          className="w-full"
          aria-label="Playback progress"
        />
        <div className="mt-1 flex justify-between text-xs text-ink-subtle">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>
      {isDocked && (
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 rounded-full border border-line bg-overlay px-3 py-2 text-sm font-semibold text-ink-muted transition hover:bg-overlay-hover hover:text-ink"
        >
          Close
        </button>
      )}
    </div>
  );
});

export default AudioPlayer;
