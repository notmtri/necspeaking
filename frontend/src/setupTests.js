import React from 'react';
import { vi } from 'vitest';
import { MotionGlobalConfig } from 'motion/react';

// Pop-ups still mount and unmount through AnimatePresence, but every animation
// finishes at once, so tests never wait on a transition.
MotionGlobalConfig.skipAnimations = true;

// NumberFlow is a custom element jsdom cannot run; render the plain number.
vi.mock('@number-flow/react', () => ({
  default: ({ value, className }) => React.createElement('span', { className }, String(value)),
}));
