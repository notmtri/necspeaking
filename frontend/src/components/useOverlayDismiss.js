import { useEffect, useLayoutEffect, useRef } from 'react';

/**
 * Closes on Escape and, when the overlay closes, puts focus back on whatever
 * had it before it opened, so keyboard users are not dropped at the top of
 * the page.
 *
 * Two details matter:
 * - What had focus is read during render, as the overlay opens. By the time an
 *   effect runs, an autoFocus field inside the overlay has already taken it.
 * - The listener reads onClose/disabled from refs, so the effect depends on
 *   `open` alone. Callers often pass a new inline onClose every render; when
 *   that re-ran the effect, its cleanup "restored" focus to the opening button
 *   mid-typing, throwing the cursor out of any field it hadn't auto-focused.
 */
export function useOverlayDismiss(open, onClose, { disabled = false } = {}) {
  const onCloseRef = useRef(onClose);
  const disabledRef = useRef(disabled);
  useLayoutEffect(() => {
    onCloseRef.current = onClose;
    disabledRef.current = disabled;
  });

  const returnFocusRef = useRef(null);
  const wasOpenRef = useRef(false);
  if (open && !wasOpenRef.current && typeof document !== 'undefined') {
    const active = document.activeElement;
    returnFocusRef.current = active && active !== document.body ? active : null;
  }
  wasOpenRef.current = open;

  const pendingRestoreRef = useRef(0);
  useEffect(() => {
    if (!open) return undefined;
    // React's development double-run unmounts and remounts at once: cancel the
    // restore that cleanup just scheduled, the overlay never really closed.
    window.clearTimeout(pendingRestoreRef.current);

    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && !disabledRef.current) onCloseRef.current?.();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      pendingRestoreRef.current = window.setTimeout(() => {
        const target = returnFocusRef.current;
        returnFocusRef.current = null;
        if (target && target.isConnected && typeof target.focus === 'function') target.focus({ preventScroll: true });
      }, 0);
    };
  }, [open]);
}
