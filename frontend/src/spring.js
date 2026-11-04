/*
 * A small spring for values the finger drives (the phone sheet). It uses
 * Apple's two designer parameters instead of mass/stiffness/damping:
 *
 *   response      seconds to reach the target, roughly (0.3-0.4 for UI)
 *   dampingRatio  1 = settles with no overshoot; 0.8 = one small overshoot,
 *                 for motion that follows a flick
 *
 * It starts from the value's current position and the given velocity, so a
 * gesture hands over without a seam, and calling it again mid-flight simply
 * re-targets. Motion's own animate() would do the same for ~20 KB more.
 */

const prefersReducedMotion = () => Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);

/**
 * Animate a MotionValue (anything with get/set) to `target`.
 * Returns a stop function. `velocity` is in units per second.
 */
export function springTo(value, target, { response = 0.4, dampingRatio = 1, velocity = 0, onComplete } = {}) {
  if (prefersReducedMotion() || typeof window.requestAnimationFrame !== 'function') {
    value.set(target);
    onComplete?.();
    return () => {};
  }

  // Unit mass: stiffness = (2π / response)², damping = 4π·ζ / response.
  const stiffness = ((2 * Math.PI) / response) ** 2;
  const damping = (4 * Math.PI * dampingRatio) / response;
  let position = value.get();
  let speed = velocity;
  let last = null;
  let frame = 0;

  const step = (now) => {
    // A dropped frame or a background tab must not fling the value.
    const elapsed = last === null ? 1 / 60 : Math.min(0.064, (now - last) / 1000);
    last = now;
    // Small fixed sub-steps keep stiff springs stable.
    const substeps = Math.max(1, Math.ceil(elapsed / 0.004));
    const h = elapsed / substeps;
    for (let i = 0; i < substeps; i += 1) {
      const acceleration = -stiffness * (position - target) - damping * speed;
      speed += acceleration * h;
      position += speed * h;
    }
    if (Math.abs(speed) < 1 && Math.abs(position - target) < 0.5) {
      value.set(target);
      onComplete?.();
      return;
    }
    value.set(position);
    frame = window.requestAnimationFrame(step);
  };

  frame = window.requestAnimationFrame(step);
  return () => window.cancelAnimationFrame(frame);
}
