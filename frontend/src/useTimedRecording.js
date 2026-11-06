import { useCallback, useEffect, useRef, useState } from 'react';

// Ticks are 4 a second so the display never lags a whole second behind.
const TICK_MS = 250;

/**
 * A countdown measured against a deadline, not by counting ticks.
 *
 * Research time is spent in other tabs, and browsers slow or stop timers in
 * a hidden tab (an iPhone stops them altogether), so counting intervals would
 * drift. Each tick reads the clock instead, and onDone fires on the first
 * tick past the deadline, which is also the moment the student comes back.
 */
export function useCountdown() {
  const [remaining, setRemaining] = useState(0);
  const timerRef = useRef(null);
  const doneRef = useRef(null);

  const stop = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const start = useCallback((seconds, onDone) => {
    stop();
    const endsAt = Date.now() + seconds * 1000;
    doneRef.current = onDone;
    setRemaining(seconds);
    timerRef.current = setInterval(() => {
      const left = Math.max(0, Math.ceil((endsAt - Date.now()) / 1000));
      setRemaining(left);
      if (left === 0) {
        stop();
        doneRef.current?.();
      }
    }, TICK_MS);
  }, [stop]);

  useEffect(() => stop, [stop]);

  return { remaining, start, stop };
}

/**
 * Microphone recording that stops itself at maxSeconds.
 *
 * Returns the elapsed seconds while recording, then the blob and a playback
 * URL. onStopped runs once the audio is ready (after a manual stop or the
 * time limit). discard() throws a recording away without calling it.
 */
export function useTimedRecording({ maxSeconds, onStopped }) {
  const [elapsed, setElapsed] = useState(0);
  const [recording, setRecording] = useState(false);
  const [audio, setAudio] = useState(null); // { blob, url, type }
  const recorderRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const onStoppedRef = useRef(onStopped);
  onStoppedRef.current = onStopped;

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const releaseStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

  const stop = useCallback(() => {
    clearTimer();
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== 'inactive') recorder.stop();
    else releaseStream();
  }, [clearTimer, releaseStream]);

  const discard = useCallback(() => {
    clearTimer();
    const recorder = recorderRef.current;
    if (recorder) {
      recorder.ondataavailable = null;
      recorder.onstop = null;
      if (recorder.state !== 'inactive') recorder.stop();
    }
    recorderRef.current = null;
    releaseStream();
    chunksRef.current = [];
    setRecording(false);
    setElapsed(0);
    setAudio((current) => {
      if (current?.url) URL.revokeObjectURL(current.url);
      return null;
    });
  }, [clearTimer, releaseStream]);

  /** Resolves true once recording has begun, false if the microphone was refused. */
  const start = useCallback(async () => {
    discard();
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') return false;
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      return false;
    }
    // Safari records mp4 and cannot make webm; everything else gets webm.
    const type = MediaRecorder.isTypeSupported?.('audio/webm') ? 'audio/webm' : '';
    const recorder = type ? new MediaRecorder(stream, { mimeType: type }) : new MediaRecorder(stream);
    streamRef.current = stream;
    recorderRef.current = recorder;
    chunksRef.current = [];

    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunksRef.current.push(event.data);
    };
    recorder.onstop = () => {
      const blobType = recorder.mimeType || type || 'audio/webm';
      const blob = new Blob(chunksRef.current, { type: blobType });
      chunksRef.current = [];
      releaseStream();
      setRecording(false);
      const next = { blob, url: URL.createObjectURL(blob), type: blobType };
      setAudio(next);
      onStoppedRef.current?.(next);
    };

    const startedAt = Date.now();
    recorder.start();
    setElapsed(0);
    setRecording(true);
    timerRef.current = setInterval(() => {
      const seconds = Math.min(maxSeconds, Math.floor((Date.now() - startedAt) / 1000));
      setElapsed(seconds);
      if (seconds >= maxSeconds) stop();
    }, TICK_MS);
    return true;
  }, [discard, maxSeconds, releaseStream, stop]);

  // Leaving the page mid-recording releases the microphone.
  useEffect(() => () => {
    clearTimer();
    const recorder = recorderRef.current;
    if (recorder) {
      recorder.onstop = null;
      if (recorder.state !== 'inactive') recorder.stop();
    }
    streamRef.current?.getTracks().forEach((track) => track.stop());
  }, [clearTimer]);

  useEffect(() => () => {
    if (audio?.url) URL.revokeObjectURL(audio.url);
  }, [audio]);

  return { start, stop, discard, elapsed, recording, audio };
}

/**
 * Asks for the microphone once and lets it go.
 * Returns 'ok', 'denied', or 'unsupported' (the browser cannot record at all).
 */
export async function checkMicrophone() {
  if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') return 'unsupported';
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach((track) => track.stop());
    return 'ok';
  } catch {
    return 'denied';
  }
}
