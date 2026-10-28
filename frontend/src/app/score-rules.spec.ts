import { calculateTotals, getLeaderIds } from './score-rules';

describe('score rules', () => {
  it('adds signed score changes to each player starting at 100', () => {
    const totals = calculateTotals(
      [{ scores: { a: 12, b: -4 } }, { scores: { a: -7 } }],
      ['a', 'b', 'c'],
    );

    expect(totals).toEqual({ a: 105, b: 96, c: 100 });
  });

  it('returns every player tied for the highest total', () => {
    expect(getLeaderIds({ a: 5, b: 5, c: -1 })).toEqual(['a', 'b']);
    expect(getLeaderIds({})).toEqual([]);
  });
});