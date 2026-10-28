import { TestBed } from '@angular/core/testing';
import { GameService } from './game.service';
import { ScoringSystemService } from './scoring-system.service';
import { GiftInput } from '../models/game';

describe('GameService scorecard creation', () => {
  let gameService: GameService;
  let scoringSystems: ScoringSystemService;

  beforeEach(() => {
    localStorage.removeItem('rikken-scoring-systems-v1');
    TestBed.configureTestingModule({});
    gameService = TestBed.inject(GameService);
    scoringSystems = TestBed.inject(ScoringSystemService);
  });

  afterEach(() => localStorage.removeItem('rikken-scoring-systems-v1'));

  it('creates four-player scorecards with ordered seats, 100-point totals, and the selected snapshot', () => {
    const snapshot = scoringSystems.createSnapshot(scoringSystems.getSystems()[0].id);
    const game = gameService.createScorecard('Vrijdag', ['Noor', 'Jules', 'Sam', 'Mila'], snapshot);

    expect(game.players.map((player) => player.name)).toEqual(['Noor', 'Jules', 'Sam', 'Mila']);
    expect(new Set(game.players.map((player) => player.id)).size).toBe(4);
    expect(game.startingScore).toBe(100);
    expect(gameService.getTotals(game)).toEqual(Object.fromEntries(game.players.map((player) => [player.id, 100])));
    expect(gameService.getGiftLimit(game)).toBe(12);
    expect(gameService.getNextGiftDealerId(game)).toBe(game.players[0].id);
    expect(game.rulesSnapshot).toEqual(snapshot);
    expect(game.rulesSnapshot).not.toBe(snapshot);
  });

  it('creates scorecards with a zero-point starting score when selected', () => {
    const snapshot = scoringSystems.createSnapshot(scoringSystems.getSystems()[0].id);
    const game = gameService.createScorecard('Zonder startpunten', ['Noor', 'Jules', 'Sam', 'Mila'], snapshot, 0);

    expect(game.startingScore).toBe(0);
    expect(gameService.getTotals(game)).toEqual(Object.fromEntries(game.players.map((player) => [player.id, 0])));
  });

  it('creates five-player scorecards and rejects incomplete, duplicate, or unsupported lineups', () => {
    const snapshot = scoringSystems.createSnapshot(scoringSystems.getSystems()[0].id);
    const game = gameService.createScorecard('Zaterdag', ['Noor', 'Jules', 'Sam', 'Mila', 'Pim'], snapshot);

    expect(game.players.map((player) => player.name)).toEqual(['Noor', 'Jules', 'Sam', 'Mila', 'Pim']);
    expect(gameService.getGiftLimit(game)).toBe(15);
    expect(() => gameService.createScorecard('Leeg', ['Noor', 'Jules', 'Sam'], snapshot)).toThrow();
    expect(() => gameService.createScorecard('Dubbel', ['Noor', 'Sam', 'SAM', 'Mila'], snapshot)).toThrow();
    expect(() => gameService.createScorecard('Te veel', ['A', 'B', 'C', 'D', 'E', 'F'], snapshot)).toThrow();
  });

  it('records snapshot-scored gifts with stable IDs, rotating dealers, and gift limits', () => {
    const snapshot = customSnapshot(scoringSystems);
    const game = gameService.createScorecard('Vrijdag', ['Noor', 'Jules', 'Sam', 'Mila'], snapshot);
    const input: GiftInput = { contract: 'rik-afrik', rikkerIds: [game.players[0].id, game.players[1].id], tricksTakenByRikkers: 13 };
    const first = gameService.recordGift(game, input);
    const second = gameService.recordGift(first, input);

    expect(first.gifts[0].dealerId).toBe(game.players[0].id);
    expect(second.gifts[1].dealerId).toBe(game.players[1].id);
    let wrapped = game;
    for (let index = 0; index < game.players.length; index++) wrapped = gameService.recordGift(wrapped, input);
    expect(wrapped.gifts[3].dealerId).toBe(game.players[3].id);
    expect(gameService.getNextGiftDealerId(wrapped)).toBe(game.players[0].id);
    expect(first.gifts[0].entryMode).toBe('automatic');
    expect(first.gifts[0].scoreChanges).toEqual({
      [game.players[0].id]: 7,
      [game.players[1].id]: 7,
      [game.players[2].id]: -7,
      [game.players[3].id]: -7,
    });
    expect(game.gifts).toHaveLength(0);
    expect(first.gifts[0].id).toBeTruthy();

    let full = game;
    for (let index = 0; index < 12; index++) full = gameService.recordGift(full, input);
    expect(() => gameService.recordGift(full, input)).toThrow(/maximale|limiet|twaalf|12/i);
  });

  it('records a five-player dealer sit-out as zero for each gift', () => {
    const snapshot = customSnapshot(scoringSystems);
    const game = gameService.createScorecard('Zaterdag', ['Noor', 'Jules', 'Sam', 'Mila', 'Pim'], snapshot);
    const input: GiftInput = { contract: 'rik-afrik', rikkerIds: [game.players[1].id, game.players[2].id], tricksTakenByRikkers: 13 };
    const recorded = gameService.recordGift(game, input);

    expect(recorded.gifts[0].dealerId).toBe(game.players[0].id);
    expect(recorded.gifts[0].scoreChanges[game.players[0].id]).toBe(0);
  });

  it('edits, undoes, and deletes gifts without changing surviving IDs or dealer order', () => {
    const snapshot = customSnapshot(scoringSystems);
    const game = gameService.createScorecard('Vrijdag', ['Noor', 'Jules', 'Sam', 'Mila'], snapshot);
    const input: GiftInput = { contract: 'rik-afrik', rikkerIds: [game.players[0].id, game.players[1].id], tricksTakenByRikkers: 13 };
    const first = gameService.recordGift(game, input);
    const second = gameService.recordGift(first, input);
    const third = gameService.recordGift(second, input);
    const originalIds = third.gifts.map((gift) => gift.id);

    const edited = gameService.updateGift(third, originalIds[0], {
      contract: 'rik-afrik', rikkerIds: [game.players[0].id, game.players[1].id], tricksTakenByRikkers: 12,
    });
    expect(edited.gifts[0].id).toBe(originalIds[0]);
    expect(edited.gifts[0].scoreChanges[game.players[0].id]).toBe(6);

    const deletedMiddle = gameService.removeGift(edited, originalIds[1], true);
    expect(deletedMiddle.gifts.map((gift) => gift.id)).toEqual([originalIds[0], originalIds[2]]);
    expect(deletedMiddle.gifts[1].dealerId).toBe(game.players[1].id);

    const undone = gameService.undoLatestGift(deletedMiddle);
    expect(undone.gifts.map((gift) => gift.id)).toEqual([originalIds[0]]);
    expect(gameService.getTotals(undone)[game.players[0].id]).toBe(106);
    expect(gameService.getStandings(undone).map(({ playerId, total, rank }) => ({ playerId, total, rank }))).toEqual([
      { playerId: game.players[0].id, total: 106, rank: 1 },
      { playerId: game.players[1].id, total: 106, rank: 1 },
      { playerId: game.players[2].id, total: 94, rank: 3 },
      { playerId: game.players[3].id, total: 94, rank: 3 },
    ]);
    expect(() => gameService.removeGift(undone, originalIds[0], false)).toThrow(/bevestig/i);
  });

  it('saves score-entry gifts through the domain service and keeps manual IDs when edited', () => {
    const snapshot = customSnapshot(scoringSystems);
    const game = gameService.createScorecard('Vrijdag', ['Noor', 'Jules', 'Sam', 'Mila'], snapshot);
    const gift = {
      id: crypto.randomUUID(),
      dealerId: game.players[0].id,
      input: { contract: 'manual' as const },
      scoreChanges: Object.fromEntries(game.players.map((player, index) => [player.id, index === 0 ? 3 : index === 1 ? -3 : 0])),
      entryMode: 'manual' as const,
    };

    const saved = gameService.saveGift(game, gift);
    const edited = gameService.saveGift(saved, { ...saved.gifts[0], scoreChanges: { ...saved.gifts[0].scoreChanges, [game.players[0].id]: 6, [game.players[1].id]: -6 } });

    expect(saved.gifts[0].id).toBe(gift.id);
    expect(gameService.getTotals(edited)[game.players[0].id]).toBe(106);
    expect(edited.gifts[0].id).toBe(gift.id);
  });
});

function customSnapshot(scoringSystems: ScoringSystemService) {
  const source = scoringSystems.getSystems()[0];
  const custom = scoringSystems.createSystem('Spelregels', source.values);
  return scoringSystems.createSnapshot(custom.id);
}