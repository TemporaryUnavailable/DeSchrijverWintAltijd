import { GameV2, Gift, GiftInput, Player } from '../models/game';
import { StatisticsService } from './statistics.service';

describe('StatisticsService', () => {
  const service = new StatisticsService();

  it('summarizes recorded contracts and tricks while excluding untyped history', () => {
    const statistics = service.summarize([
      makeGame('first', [
        makeGift({ contract: 'rik-afrik', rikkerIds: ['p1', 'p2'], tricksTakenByRikkers: 8 }),
        makeGift({ contract: 'rik-afrik', rikkerIds: ['p1', 'p2'], tricksTakenByRikkers: 12 }),
        makeGift({ contract: 'troel', rikkerIds: ['p1', 'p2'], tricksTakenByRikkers: 6 }),
        makeGift({ contract: 'abondance', soloistId: 'p1', success: true }),
        makeGift({ contract: 'miserie-two', miseriePlayerIds: ['p1', 'p2'], successes: [true, false] }),
        makeGift({ contract: 'manual' }),
        makeGift(null),
      ]),
      makeGame('second', [
        makeGift({ contract: 'troel', rikkerIds: ['p1', 'p2'], tricksTakenByRikkers: 10 }),
        makeGift({ contract: 'miserie-one', soloistId: 'p1', success: false }),
      ]),
    ]);

    expect(statistics).toMatchObject({
      gameCount: 2,
      giftCount: 9,
      averageGiftsPerGame: 4.5,
      typedGiftCount: 8,
    });
    expect(statistics.mostPlayed.map(({ contract }) => contract)).toEqual(['rik-afrik', 'troel']);
    expect(statistics.leastPlayed.map(({ contract }) => contract)).toEqual([
      'abondance', 'miserie-one', 'miserie-two',
    ]);
    expect(statistics.contractCounts.find(({ contract }) => contract === 'manual')).toMatchObject({ count: 1, share: 1 / 8 });
    expect(statistics.trickStatistics).toEqual([
      {
        contract: 'rik-afrik', label: 'Rik/Afrik', count: 2, average: 10,
        distribution: [{ tricks: 8, count: 1 }, { tricks: 12, count: 1 }],
      },
      {
        contract: 'troel', label: 'Troel', count: 2, average: 8,
        distribution: [{ tricks: 6, count: 1 }, { tricks: 10, count: 1 }],
      },
    ]);
    expect(statistics.outcomeStatistics).toEqual([
      { contract: 'rik-afrik', label: 'Rik/Afrik', sampleLabel: 'handjes', attempts: 2, successes: 2, successRate: 1 },
      { contract: 'troel', label: 'Troel', sampleLabel: 'handjes', attempts: 2, successes: 1, successRate: 0.5 },
      { contract: 'abondance', label: 'Abondance', sampleLabel: 'handjes', attempts: 1, successes: 1, successRate: 1 },
      { contract: 'miserie-two', label: 'Twee-speler-Miserie', sampleLabel: 'spelersresultaten', attempts: 2, successes: 1, successRate: 0.5 },
      { contract: 'miserie-one', label: 'Miserie', sampleLabel: 'handjes', attempts: 1, successes: 0, successRate: 0 },
    ]);
  });

  it('returns empty rankings and safe averages when there is no typed data', () => {
    const statistics = service.summarize([makeGame('legacy', [makeGift(null)])]);

    expect(statistics.giftCount).toBe(1);
    expect(statistics.typedGiftCount).toBe(0);
    expect(statistics.averageGiftsPerGame).toBe(1);
    expect(statistics.mostPlayed).toEqual([]);
    expect(statistics.leastPlayed).toEqual([]);
    expect(statistics.contractCounts.every(({ share }) => share === 0)).toBe(true);
    expect(statistics.trickStatistics.every(({ average, count }) => average === null && count === 0)).toBe(true);
    expect(statistics.outcomeStatistics).toEqual([]);
  });

  it('returns null for average gifts when there are no scorecards', () => {
    expect(service.summarize([]).averageGiftsPerGame).toBeNull();
  });

  it('ranks player combinations independent of seating order and their most played contract', () => {
    const games = [
      makeGame('first', [
        makeGift({ contract: 'rik-afrik', rikkerIds: ['p1', 'p2'], tricksTakenByRikkers: 8 }),
        makeGift({ contract: 'abondance', soloistId: 'p3', success: true }),
        makeGift({ contract: 'manual' }),
      ]),
      makeGame('second', [
        makeGift({ contract: 'rik-afrik', rikkerIds: ['p1', 'p2'], tricksTakenByRikkers: 9 }),
        makeGift({ contract: 'troel', rikkerIds: ['p3', 'p4'], tricksTakenByRikkers: 6 }),
      ]),
    ];
    games[1].players.reverse();
    const lessCommon = makeGame('third', []);
    lessCommon.players = ['p1', 'p2', 'p3', 'p5'].map((playerId) => ({ id: playerId, name: playerId }));
    games.push(lessCommon);

    const statistics = service.summarize(games);
    expect(statistics.playerCombinationStatistics).toEqual([
      {
        key: 'p1|p2|p3|p4',
        players: ['p1', 'p2', 'p3', 'p4'],
        gameCount: 2,
        mostPlayedContracts: [{ contract: 'rik-afrik', label: 'Rik/Afrik', count: 2 }],
      },
      {
        key: 'p1|p2|p3|p5',
        players: ['p1', 'p2', 'p3', 'p5'],
        gameCount: 1,
        mostPlayedContracts: [],
      },
    ]);
    expect(statistics.mostCommonCombinations.map(({ key }) => key)).toEqual(['p1|p2|p3|p4']);
    expect(statistics.leastCommonCombinations.map(({ key }) => key)).toEqual(['p1|p2|p3|p5']);
  });

  it('reports lineups without typed game types and safely handles no scorecards', () => {
    const statistics = service.summarize([makeGame('manual-only', [makeGift({ contract: 'manual' })])]);

    expect(statistics.playerCombinationStatistics[0].mostPlayedContracts).toEqual([]);
    expect(service.summarize([]).playerCombinationStatistics).toEqual([]);
  });
});

function makeGame(id: string, gifts: Gift[]): GameV2 {
  const players: Player[] = ['p1', 'p2', 'p3', 'p4'].map((playerId) => ({ id: playerId, name: playerId }));
  const createdAt = '2026-10-01T18:00:00.000Z';
  return {
    id,
    name: id,
    players,
    rulesSnapshot: null,
    gifts,
    legacy: true,
    createdAt,
    updatedAt: createdAt,
  };
}

function makeGift(input: GiftInput | null): Gift {
  return { id: crypto.randomUUID(), dealerId: 'p1', input, scoreChanges: {}, entryMode: input ? 'automatic' : 'legacy-manual' };
}