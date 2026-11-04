import React from 'react';
import {
  AudioWaveform, ClipboardCheck, Compass, Flame, Heart, Lightbulb, LineChart, Megaphone,
  MessageCircle, Mic, Shapes, ShieldCheck, Timer, TrendingUp, Trophy,
} from 'lucide-react';

/*
 * How each badge looks: its icon and the colour of its disc. Keys match
 * backend/achievements.py. Classes are spelled out in full for Tailwind.
 */
export const BADGE_LOOKS = {
  practices: { icon: Mic, disc: 'bg-sky-100 text-sky-700 dark:bg-sky-400/20 dark:text-sky-200' },
  streak: { icon: Flame, disc: 'bg-orange-100 text-orange-700 dark:bg-orange-400/20 dark:text-orange-200' },
  best_score: { icon: Trophy, disc: 'bg-amber-100 text-amber-700 dark:bg-amber-400/20 dark:text-amber-200' },
  average: { icon: LineChart, disc: 'bg-violet-100 text-violet-700 dark:bg-violet-400/20 dark:text-violet-200' },
  balanced: { icon: Shapes, disc: 'bg-gradient-to-br from-sky-100 via-violet-100 to-amber-100 text-violet-700 dark:from-sky-400/20 dark:via-violet-400/20 dark:to-amber-400/20 dark:text-violet-200' },
  comeback: { icon: TrendingUp, disc: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-400/20 dark:text-emerald-200' },
  explorer: { icon: Compass, disc: 'bg-teal-100 text-teal-700 dark:bg-teal-400/20 dark:text-teal-200' },
  content: { icon: Lightbulb, disc: 'bg-sky-100 text-sky-700 dark:bg-sky-400/20 dark:text-sky-200' },
  accuracy: { icon: ShieldCheck, disc: 'bg-violet-100 text-violet-700 dark:bg-violet-400/20 dark:text-violet-200' },
  delivery: { icon: AudioWaveform, disc: 'bg-amber-100 text-amber-700 dark:bg-amber-400/20 dark:text-amber-200' },
  full_answers: { icon: Timer, disc: 'bg-rose-100 text-rose-700 dark:bg-rose-400/20 dark:text-rose-200' },
  mock_tests: { icon: ClipboardCheck, disc: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-400/20 dark:text-indigo-200' },
  clean_answers: { icon: MessageCircle, disc: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-400/20 dark:text-emerald-200' },
  posts: { icon: Megaphone, disc: 'bg-teal-100 text-teal-700 dark:bg-teal-400/20 dark:text-teal-200' },
  reactions: { icon: Heart, disc: 'bg-pink-100 text-pink-700 dark:bg-pink-400/20 dark:text-pink-200' },
};

// The leaderboard medal colours: bronze, silver, gold.
export const TIER_RIMS = {
  bronze: '#B87333',
  silver: '#A8B2BD',
  gold: '#E3B341',
};

export const TIER_LABELS = { bronze: 'Bronze', silver: 'Silver', gold: 'Gold' };

const UNIT_WORDS = {
  practices: ['practice', 'practices'],
  questions: ['question', 'questions'],
  answers: ['answer', 'answers'],
  tests: ['mock test', 'mock tests'],
  posts: ['post', 'posts'],
  reactions: ['reaction', 'reactions'],
};
const AVERAGE_MIN_PRACTICES = 5;

const formatValue = (unit, value) => {
  if (unit === 'score') return Number(value).toFixed(2);
  if (unit === 'gain') return `+${Number(value).toFixed(2)}`;
  if (unit === 'percent') return `${Math.round(Number(value) * 100)}%`;
  return String(Math.floor(Number(value)));
};

/**
 * "7 / 10 practices", or "Highest tier reached". `practiceCount` lets the
 * average badge say how far off its 5-practice minimum a student is.
 */
export function progressHint(achievement, practiceCount = null) {
  const { unit, value, nextTarget, key } = achievement;
  if (nextTarget == null) return 'Highest tier reached';
  if (key === 'average' && practiceCount != null && practiceCount < AVERAGE_MIN_PRACTICES) {
    return `Needs ${AVERAGE_MIN_PRACTICES} practices (${practiceCount} so far)`;
  }
  const pair = `${formatValue(unit, value)} / ${formatValue(unit, nextTarget)}`;
  if (key === 'streak') return `Best streak ${pair} days`;
  if (key === 'average') return `Average ${pair} (from 5 practices)`;
  if (key === 'balanced') return `Weakest criterion ${pair}`;
  if (key === 'comeback') return `Best rise ${pair}`;
  if (unit === 'score') return `Best ${pair}`;
  const [one, many] = UNIT_WORDS[unit] || ['', ''];
  return `${pair} ${Number(nextTarget) === 1 ? one : many}`.trim();
}

/** Share of the way from the current tier's threshold to the next one. */
export function progressShare(achievement) {
  const { thresholds = [], tier = 0, value = 0, nextTarget } = achievement;
  if (nextTarget == null) return 1;
  const floor = tier ? thresholds[tier - 1] : 0;
  return Math.max(0, Math.min(1, (value - floor) / (nextTarget - floor || 1)));
}

/**
 * A round medal. Earned: the badge colour with a bronze/silver/gold rim.
 * Locked: grey, with a ring that fills toward the next tier (when `progress`).
 */
export default function AchievementBadge({ achievement, size = 'lg', progress = false }) {
  const look = BADGE_LOOKS[achievement.key] || BADGE_LOOKS.practices;
  const Icon = look.icon;
  const earned = achievement.tier > 0;
  const rim = earned ? TIER_RIMS[achievement.tierName] : null;
  const dimension = size === 'lg' ? 'h-16 w-16' : 'h-9 w-9';
  const inner = size === 'lg' ? 'inset-[5px]' : 'inset-[3px]';
  const share = progress ? progressShare(achievement) : 0;

  // Earned: solid metal rim. Locked: a grey track with the progress arc in sky.
  const ring = earned
    ? `conic-gradient(${rim} 0turn, ${rim} 1turn)`
    : `conic-gradient(oklch(0.68 0.15 237) ${share}turn, oklch(var(--overlay-hover)) ${share}turn)`;

  return (
    <span className={`relative inline-flex shrink-0 rounded-full ${dimension}`} style={{ background: ring }} aria-hidden="true">
      <span className={`absolute ${inner} flex items-center justify-center rounded-full ${earned ? look.disc : 'bg-overlay text-ink-subtle'}`}>
        <Icon size={size === 'lg' ? 26 : 16} strokeWidth={1.9} />
      </span>
    </span>
  );
}
