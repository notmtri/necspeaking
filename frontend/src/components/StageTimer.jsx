import React from 'react';
import { TONES } from '../appShared';

/** The countdown beside each timed stage; colour matches the stage it times. */
export default function StageTimer({ tone, icon: Icon, label, value, share }) {
  const colours = TONES[tone];
  return (
    <aside className={`rounded-panel p-6 text-center ${colours.soft}`} aria-live="off">
      <span className={`mx-auto inline-flex h-12 w-12 items-center justify-center rounded-full bg-surface-raised ${colours.text}`}>
        <Icon size={22} />
      </span>
      <div className="mt-4 font-display text-5xl font-semibold tracking-[-0.04em] text-ink tabular">{value}</div>
      <div className={`mt-1 text-sm font-medium ${colours.text}`}>{label}</div>
      <div className="mt-5 h-2 overflow-hidden rounded-full bg-surface-raised/80">
        <div className={`h-full rounded-full transition-[width] duration-1000 ease-linear ${colours.fill}`} style={{ width: `${Math.min(100, Math.max(0, share * 100))}%` }} />
      </div>
    </aside>
  );
}

/**
 * A short sine beep marking a stage change: lower when recording starts,
 * higher when the result is ready. Best effort; autoplay rules can block it.
 */
export function playStageTone(kind = 'stage') {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return;

  try {
    const context = new AudioContextClass();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.frequency.value = kind === 'recording' ? 620 : kind === 'complete' ? 880 : 740;
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
}
