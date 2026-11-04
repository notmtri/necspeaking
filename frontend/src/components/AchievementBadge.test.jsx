import { describe, expect, it } from 'vitest';
import { BADGE_LOOKS, progressHint, progressShare, takeNewlyEarned } from './AchievementBadge';

const item = (overrides) => ({ key: 'practices', unit: 'practices', thresholds: [1, 10, 30], tier: 1, value: 7, nextTarget: 10, ...overrides });

describe('progressHint', () => {
  it('reads like the agreed hints', () => {
    expect(progressHint(item())).toBe('7 / 10 practices');
    expect(progressHint(item({ key: 'streak', unit: 'days', value: 2, nextTarget: 3, tier: 0 }))).toBe('Best streak 2 / 3 days');
    expect(progressHint(item({ key: 'best_score', unit: 'score', value: 1.71, nextTarget: 1.85, tier: 2 }))).toBe('Best 1.71 / 1.85');
    expect(progressHint(item({ key: 'balanced', unit: 'percent', value: 0.764, nextTarget: 0.8 }))).toBe('Weakest criterion 76% / 80%');
    expect(progressHint(item({ key: 'comeback', unit: 'gain', value: 0.14, nextTarget: 0.2 }))).toBe('Best rise +0.14 / +0.20');
    expect(progressHint(item({ key: 'mock_tests', unit: 'tests', value: 2, nextTarget: 5 }))).toBe('2 / 5 mock tests');
  });

  it('uses the singular for a target of one', () => {
    expect(progressHint(item({ key: 'full_answers', unit: 'answers', value: 0, nextTarget: 1, tier: 0 }))).toBe('0 / 1 answer');
  });

  it('explains the five-practice minimum for the average badge', () => {
    const average = item({ key: 'average', unit: 'score', value: 0, nextTarget: 1.4, tier: 0 });
    expect(progressHint(average, 4)).toBe('Needs 5 practices (4 so far)');
    expect(progressHint({ ...average, value: 1.31 }, 6)).toBe('Average 1.31 / 1.40 (from 5 practices)');
  });

  it('says so once gold is reached', () => {
    expect(progressHint(item({ tier: 3, nextTarget: null, value: 40 }))).toBe('Highest tier reached');
  });
});

describe('progressShare', () => {
  it('measures from the current tier to the next', () => {
    expect(progressShare(item({ value: 7, tier: 1, nextTarget: 10 }))).toBeCloseTo(6 / 9);
    expect(progressShare(item({ value: 0, tier: 0, nextTarget: 1 }))).toBe(0);
    expect(progressShare(item({ tier: 3, nextTarget: null }))).toBe(1);
  });
});

describe('BADGE_LOOKS', () => {
  it('covers all fifteen badges', () => {
    expect(Object.keys(BADGE_LOOKS)).toHaveLength(15);
  });
});

describe('takeNewlyEarned', () => {
  const list = (tiers) => Object.entries(tiers).map(([key, tier]) => ({ key, tier }));

  it('celebrates each new tier once per browser', () => {
    window.localStorage.clear();
    expect([...takeNewlyEarned(7, list({ practices: 1, streak: 0 }))]).toEqual(['practices']);
    // Same tiers again (a reload): nothing to celebrate.
    expect(takeNewlyEarned(7, list({ practices: 1, streak: 0 })).size).toBe(0);
    // Silver on practices and a first streak tier: both are new.
    expect([...takeNewlyEarned(7, list({ practices: 2, streak: 1 }))]).toEqual(['practices', 'streak']);
  });

  it('keeps each account separate', () => {
    window.localStorage.clear();
    takeNewlyEarned(1, list({ posts: 1 }));
    expect([...takeNewlyEarned(2, list({ posts: 1 }))]).toEqual(['posts']);
  });
});
