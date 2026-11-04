import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { springTo } from './spring';

// A MotionValue stand-in that records every frame.
const valueAt = (start) => {
  let current = start;
  const frames = [];
  return {
    get: () => current,
    set: (next) => { current = next; frames.push(next); },
    frames,
  };
};

// Drive requestAnimationFrame by hand at 60 fps.
let callbacks = [];
let now = 0;
const runFrames = (count) => {
  for (let i = 0; i < count && callbacks.length; i += 1) {
    now += 1000 / 60;
    const pending = callbacks;
    callbacks = [];
    pending.forEach((callback) => callback(now));
  }
};

describe('springTo', () => {
  beforeEach(() => {
    callbacks = [];
    now = 0;
    vi.stubGlobal('requestAnimationFrame', (callback) => callbacks.push(callback));
    vi.stubGlobal('cancelAnimationFrame', () => { callbacks = []; });
    window.requestAnimationFrame = globalThis.requestAnimationFrame;
    window.cancelAnimationFrame = globalThis.cancelAnimationFrame;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('settles on the target with no overshoot when critically damped', () => {
    const value = valueAt(400);
    const done = vi.fn();
    springTo(value, 0, { response: 0.4, dampingRatio: 1, onComplete: done });
    runFrames(120);
    expect(value.get()).toBe(0);
    expect(done).toHaveBeenCalledOnce();
    expect(Math.min(...value.frames)).toBeGreaterThanOrEqual(0);
  });

  it('overshoots a little when under-damped', () => {
    const value = valueAt(400);
    springTo(value, 0, { response: 0.4, dampingRatio: 0.8 });
    runFrames(120);
    expect(Math.min(...value.frames)).toBeLessThan(0);
    expect(value.get()).toBe(0);
  });

  it('carries a release velocity into the motion', () => {
    const still = valueAt(0);
    const thrown = valueAt(0);
    springTo(still, 100, { velocity: 0 });
    runFrames(1);
    const stillFirst = still.get();
    callbacks = [];
    springTo(thrown, 100, { velocity: 3000 });
    runFrames(1);
    expect(thrown.get()).toBeGreaterThan(stillFirst);
  });

  it('stops where it is when stopped', () => {
    const value = valueAt(300);
    const stop = springTo(value, 0);
    runFrames(3);
    const at = value.get();
    stop();
    runFrames(10);
    expect(value.get()).toBe(at);
  });

  it('jumps straight to the target when motion is reduced', () => {
    vi.stubGlobal('matchMedia', (query) => ({ matches: query.includes('reduce') }));
    window.matchMedia = globalThis.matchMedia;
    const value = valueAt(300);
    springTo(value, 0);
    expect(value.get()).toBe(0);
    delete window.matchMedia;
  });
});
