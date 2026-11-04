import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, MotionConfig, motion, useMotionValue, usePresence, useReducedMotion, useTransform } from 'motion/react';
import { springTo } from '../spring';
import { useOverlayDismiss } from './useOverlayDismiss';

/*
 * motion is only ever imported by lazily loaded code (pages, and the pop-up
 * chunk App.jsx prefetches when idle), so it never weighs on first paint.
 *
 * Every pop-up on the site. On a phone it is a bottom sheet you can drag down
 * to close; anywhere wider it is a centred dialog.
 *
 *   <Sheet open={open} onClose={close} labelledBy="title-id" width="max-w-md" bodyClassName="p-5 sm:p-6">
 *
 * Data-driven pop-ups (a profile, a sample) are better mounted by the parent
 * inside <AnimatePresence>{item && <Thing key=... />}</AnimatePresence> with
 * `open` left true: React then keeps the last content on screen while the
 * pop-up leaves, and `propagate` below passes that exit down to the sheet.
 */

export const EASE_OUT = [0.23, 1, 0.32, 1];

/**
 * Enter/exit props for a fading element. Normally motion runs the whole thing.
 * Under reduced motion the entrance fade is plain CSS (.rm-fade in index.css)
 * and motion only fades it out: motion's own fade-in, in that mode, drops the
 * element to transparent for one frame at the end in Firefox.
 */
export function fadeProps(fadeOnly, { hidden, shown, enter, exit }) {
  if (fadeOnly) {
    return {
      initial: false,
      animate: { opacity: 1 },
      exit: { opacity: 0, transition: exit },
      className: 'rm-fade',
    };
  }
  return {
    initial: hidden,
    animate: { ...shown, transition: enter },
    exit: { ...hidden, transition: exit },
    className: '',
  };
}
const PHONE_QUERY = '(max-width: 639px)';

// Apple's momentum projection: where a flick would come to rest.
const DECELERATION = 0.998;
const project = (velocity) => ((velocity / 1000) * DECELERATION) / (1 - DECELERATION);

// Past a boundary the sheet follows less and less, like a real object slowing.
const rubberband = (overshoot, dimension, constant = 0.55) =>
  (overshoot * dimension * constant) / (dimension + constant * Math.abs(overshoot));

function useMediaQuery(query) {
  const [matches, setMatches] = useState(() => Boolean(typeof window !== 'undefined' && window.matchMedia?.(query).matches));
  useEffect(() => {
    const list = window.matchMedia?.(query);
    if (!list) return undefined;
    const update = () => setMatches(list.matches);
    update();
    list.addEventListener?.('change', update);
    return () => list.removeEventListener?.('change', update);
  }, [query]);
  return matches;
}

// The page behind stays put while a pop-up is open; the scrollbar's space is
// kept so the page doesn't shift sideways on desktop.
function useScrollLock(active) {
  useEffect(() => {
    if (!active) return undefined;
    const root = document.documentElement;
    const previous = { overflow: root.style.overflow, gutter: root.style.scrollbarGutter };
    root.style.scrollbarGutter = 'stable';
    root.style.overflow = 'hidden';
    return () => {
      root.style.overflow = previous.overflow;
      root.style.scrollbarGutter = previous.gutter;
    };
  }, [active]);
}

export default function Sheet({
  open = true,
  onClose,
  labelledBy,
  dismissible = true,
  width = 'max-w-lg',
  bodyClassName = '',
  zIndex = 70,
  onExitComplete,
  children,
}) {
  const isPhone = useMediaQuery(PHONE_QUERY);
  useOverlayDismiss(open, onClose, { disabled: !dismissible });
  useScrollLock(open);

  if (typeof document === 'undefined') return null;

  const shared = { onClose, labelledBy, dismissible, bodyClassName, zIndex, children };
  return createPortal(
    // Reduced motion: keep the fades, drop the movement.
    <MotionConfig reducedMotion="user">
      <AnimatePresence propagate onExitComplete={onExitComplete}>
        {open && (isPhone
          ? <PhoneSheet key="sheet" {...shared} />
          : <CentredDialog key="dialog" width={width} {...shared} />)}
      </AnimatePresence>
    </MotionConfig>,
    document.body,
  );
}

/** Desktop and tablet: scales up from 96% in the middle of the screen. */
function CentredDialog({ onClose, labelledBy, dismissible, width, bodyClassName, zIndex, children }) {
  const fadeOnly = useReducedMotion();
  const scrim = fadeProps(fadeOnly, {
    hidden: { opacity: 0 }, shown: { opacity: 1 },
    enter: { duration: 0.2, ease: EASE_OUT }, exit: { duration: 0.15, ease: EASE_OUT },
  });
  const panel = fadeProps(fadeOnly, {
    hidden: { opacity: 0, scale: 0.96 }, shown: { opacity: 1, scale: 1 },
    enter: { duration: 0.2, ease: EASE_OUT }, exit: { duration: 0.15, ease: EASE_OUT },
  });
  const closeFromBackdrop = (event) => {
    if (event.target === event.currentTarget && dismissible) onClose?.();
  };

  return (
    <div className="fixed inset-0 overflow-y-auto overscroll-contain" style={{ zIndex }}>
      <motion.div
        className={`fixed inset-0 bg-neutral-900/40 backdrop-blur-sm dark:bg-black/60 ${scrim.className}`}
        aria-hidden="true"
        initial={scrim.initial}
        animate={scrim.animate}
        exit={scrim.exit}
      />
      <div className="relative flex min-h-full items-center justify-center p-4 sm:p-6" onClick={closeFromBackdrop}>
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-labelledby={labelledBy}
          className={`relative w-full overflow-hidden rounded-panel border border-line bg-surface-raised ${width} ${bodyClassName} ${panel.className}`}
          initial={panel.initial}
          animate={panel.animate}
          exit={panel.exit}
        >
          {children}
        </motion.div>
      </div>
    </div>
  );
}

/**
 * Phones: rises from the bottom edge and leaves the same way. The grabber
 * tracks the finger 1:1; on release a flick is projected forward and the sheet
 * closes if it would come to rest past half its height, carrying the finger's
 * speed into the animation. Dragging up past the top rubber-bands.
 */
function PhoneSheet({ onClose, labelledBy, dismissible, bodyClassName, zIndex, children }) {
  const panelRef = useRef(null);
  const y = useMotionValue(0);
  const heightRef = useRef(0);
  const releaseVelocityRef = useRef(0);
  const dragRef = useRef(null);
  const stopSpringRef = useRef(() => {});
  const runSpring = (target, options) => {
    stopSpringRef.current();
    stopSpringRef.current = springTo(y, target, options);
  };
  const [isPresent, safeToRemove] = usePresence();
  const scrimFade = fadeProps(useReducedMotion(), {
    hidden: { opacity: 0 }, shown: { opacity: 1 }, enter: { duration: 0.2 }, exit: { duration: 0.2 },
  });
  // The scrim dims with the sheet: half-dragged away, half as dark.
  const scrimOpacity = useTransform(y, (value) => {
    const height = heightRef.current || 1;
    return Math.max(0, Math.min(1, 1 - value / height));
  });

  // Enter: start just below the screen edge, then settle without overshoot.
  useLayoutEffect(() => {
    const height = panelRef.current?.offsetHeight || window.innerHeight;
    heightRef.current = height;
    y.set(height);
    runSpring(0, { response: 0.4, dampingRatio: 1 });
    return () => stopSpringRef.current();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [y]);

  // Exit: back down the way it came, at the speed the finger let go.
  useEffect(() => {
    if (isPresent) return undefined;
    const height = heightRef.current || window.innerHeight;
    runSpring(height, {
      response: 0.3,
      dampingRatio: 1,
      velocity: Math.max(0, releaseVelocityRef.current),
      onComplete: () => safeToRemove?.(),
    });
    return () => stopSpringRef.current();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPresent, safeToRemove, y]);

  const onPointerDown = (event) => {
    if (event.button !== 0 && event.pointerType === 'mouse') return;
    // Throws if the pointer is already gone (an OS-cancelled touch); tracking still works.
    try { event.currentTarget.setPointerCapture(event.pointerId); } catch { /* not capturable */ }
    heightRef.current = panelRef.current?.offsetHeight || heightRef.current;
    stopSpringRef.current(); // grab it mid-flight: it stops where it is
    dragRef.current = {
      pointerId: event.pointerId,
      // Respect where it was grabbed: the sheet keeps its offset under the finger.
      startY: event.clientY - y.get(),
      samples: [{ y: event.clientY, t: event.timeStamp }],
    };
  };

  const onPointerMove = (event) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const offset = event.clientY - drag.startY;
    const height = heightRef.current || window.innerHeight;
    // Down follows 1:1 (or resists when it can't close); up resists.
    const next = offset > 0 && dismissible ? offset : rubberband(offset, height);
    y.set(next);
    drag.samples.push({ y: event.clientY, t: event.timeStamp });
    if (drag.samples.length > 6) drag.samples.shift();
  };

  const onPointerUp = (event) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    dragRef.current = null;
    const first = drag.samples[0];
    const last = drag.samples[drag.samples.length - 1];
    const elapsed = Math.max(1, last.t - first.t);
    // Only the last ~100 ms count; a pause before letting go means no flick.
    const recent = event.timeStamp - last.t < 100;
    const velocity = recent ? ((last.y - first.y) / elapsed) * 1000 : 0; // px/s
    const height = heightRef.current || window.innerHeight;
    const restingPoint = y.get() + project(velocity);

    if (dismissible && restingPoint > height / 2) {
      releaseVelocityRef.current = velocity;
      onClose?.();
      return;
    }
    // Back to rest. A thrown sheet may overshoot a touch; a placed one doesn't.
    runSpring(0, { response: 0.4, dampingRatio: Math.abs(velocity) > 300 ? 0.8 : 1, velocity });
  };

  return (
    <div className="fixed inset-0" style={{ zIndex }}>
      <motion.div
        className={`absolute inset-0 ${scrimFade.className}`}
        aria-hidden="true"
        initial={scrimFade.initial}
        animate={scrimFade.animate}
        exit={scrimFade.exit}
        onClick={() => dismissible && onClose?.()}
      >
        <motion.div className="absolute inset-0 bg-neutral-900/40 dark:bg-black/60" style={{ opacity: scrimOpacity }} />
      </motion.div>
      <motion.div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        className="absolute inset-x-0 bottom-0 flex max-h-[92dvh] flex-col overflow-hidden rounded-t-panel border-t border-line bg-surface-raised shadow-[0_-12px_40px_-16px_oklch(0.2_0.02_250/0.35)]"
        style={{ y }}
      >
        <div
          className="absolute inset-x-16 top-0 z-20 flex h-7 cursor-grab touch-none select-none justify-center pt-2 active:cursor-grabbing"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          aria-hidden="true"
        >
          {/* Mid grey with a hairline edge: visible on a white sheet, a dark
              one, and a photo cover alike. */}
          <span className="h-1.5 w-10 rounded-full bg-neutral-400/80 shadow-[0_0_0_1px_rgba(255,255,255,0.35)]" />
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          <div className={bodyClassName}>{children}</div>
          {/* Clear of the iPhone home indicator. */}
          <div className="h-[env(safe-area-inset-bottom,0px)]" aria-hidden="true" />
        </div>
      </motion.div>
    </div>
  );
}
