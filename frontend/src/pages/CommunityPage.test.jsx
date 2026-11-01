import { describe, expect, it } from 'vitest';
import { MIN_RANKED_PRACTICES, rankByAverage } from './CommunityPage';

const profile = (id, avgScore, practices) => ({ id, stats: { avgScore, practices } });

describe('rankByAverage', () => {
  it('leaves out students with too few practices to have a meaningful average', () => {
    const ranked = rankByAverage([
      profile('one-lucky-attempt', 1.9, 1),
      profile('two-attempts', 1.8, 2),
      profile('steady', 1.71, 5),
      profile('just-enough', 1.5, MIN_RANKED_PRACTICES),
    ]);
    expect(ranked.map((p) => p.id)).toEqual(['steady', 'just-enough']);
  });

  it('breaks ties in favour of the student who practised more', () => {
    const ranked = rankByAverage([profile('fewer', 1.6, 3), profile('more', 1.6, 9)]);
    expect(ranked.map((p) => p.id)).toEqual(['more', 'fewer']);
  });

  it('keeps the top five', () => {
    const many = Array.from({ length: 8 }, (_, i) => profile(`s${i}`, 1 + i / 10, 4));
    expect(rankByAverage(many)).toHaveLength(5);
  });
});
