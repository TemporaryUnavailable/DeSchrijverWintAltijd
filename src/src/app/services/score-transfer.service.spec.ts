import { TestBed } from '@angular/core/testing';
import { Game, GameV2, Gift } from '../models/game';
import { ScoreTransferService } from './score-transfer.service';
import { GameService } from './game.service';
import { GameRepository } from './game-repository.service';
import { ScoringSystemService } from './scoring-system.service';

describe('ScoreTransferService', () => {
  let transfer: ScoreTransferService;
  let gameService: GameService;
  let v2: TransferApi;

  beforeEach(() => {
    localStorage.removeItem('rikken-scoring-systems-v1');
    TestBed.configureTestingModule({});
    transfer = TestBed.inject(ScoreTransferService);
    gameService = TestBed.inject(GameService);
    v2 = transfer as unknown as TransferApi;
  });

  afterEach(() => localStorage.removeItem('rikken-scoring-systems-v1'));

  it('imports a v1 legacy scorecard without changing its score history', () => {
    const game = createLegacyGame();
    const imported = v2.parse(JSON.stringify({ version: 1, game })) as Game;

    expect(imported).toEqual(game);
  });

  it('shares migrated legacy history as v1 without changing IDs or signed scores', () => {
    const legacy = gameService.createGame('Historische kaart', ['Noor', 'Jules', 'Sam', 'Mila', 'Bo', 'Pim', 'Ava']);
    legacy.id = 'old-game';
    legacy.players.forEach((player, index) => player.id = `old-${index}`);
    legacy.rounds = [{ id: 'old-round', dealerId: 'old-0', scores: { 'old-0': -6, 'old-1': 6 } }];
    const migrated = TestBed.inject(GameRepository).convertLegacyGame(legacy);

    expect(v2.parse(v2.serialize(migrated))).toEqual(legacy);
  });

  it('serializes and validates v2 derived totals, gift count, limit, and next dealer', () => {
    const game = createV2Game();
    game.gifts.push(makeManualGift(game));
    const snapshot = JSON.parse(v2.serialize(game)) as { version: number; derived: unknown };

    expect(snapshot.version).toBe(2);
    expect(v2.parse(JSON.stringify(snapshot))).toEqual(game);
    const derived = snapshot.derived as Record<string, unknown>;
    const cases = [
      { ...derived, totals: { ...(derived['totals'] as object), [game.players[0].id]: 99 } },
      { ...derived, recordedGifts: 2 },
      { ...derived, giftLimit: 15 },
      { ...derived, nextDealerId: game.players[3].id },
    ];
    for (const invalidDerived of cases) {
      expect(() => v2.parse(JSON.stringify({ ...snapshot, derived: invalidDerived }))).toThrow();
    }
  });

  it('transfers the selected starting score and defaults older scorecards to 100', () => {
    const zeroStart = gameService.createScorecard(
      'Nulstart',
      ['Noor', 'Jules', 'Sam', 'Mila'],
      TestBed.inject(ScoringSystemService).createSnapshot(TestBed.inject(ScoringSystemService).getSystems()[0].id),
      0,
    );
    expect((v2.parse(v2.serialize(zeroStart)) as GameV2).startingScore).toBe(0);

    const oldGame = createV2Game();
    delete oldGame.startingScore;
    expect(v2.parse(v2.serialize(oldGame))).toEqual(oldGame);
    expect(() => v2.serialize({ ...oldGame, startingScore: 50 } as unknown as GameV2)).toThrow();
  });

  it('rejects unsupported versions and duplicate player IDs', () => {
    const game = createV2Game();
    const duplicatePlayers = { ...game, players: game.players.map((player, index) => index ? { ...player, id: game.players[0].id } : player) };

    expect(() => v2.parse('{"version":3,"game":{}}')).toThrow();
    expect(() => v2.parse(v2.serialize(duplicatePlayers))).toThrow();
    const duplicateGifts = { ...game, gifts: [makeManualGift(game), makeManualGift(game)] };
    duplicateGifts.gifts[1].id = duplicateGifts.gifts[0].id;
    expect(() => v2.serialize(duplicateGifts)).toThrow();
  });

  it('rejects malformed nested v2 objects as unsupported files', () => {
    const game = createV2Game();
    const malformed = { version: 2, game: { ...game, name: 17 }, derived: {} };

    expect(() => v2.parse(JSON.stringify(malformed))).toThrow('Deze back-up is ongeldig of wordt niet ondersteund.');
  });

  it('rejects incomplete rules and dealer or score-change state that disagrees with the game', () => {
    const game = createV2Game();
    game.gifts.push(makeManualGift(game));
    const valid = JSON.parse(v2.serialize(game)) as {
      game: {
        rulesSnapshot: { values: { soloContracts: Record<string, number> } };
        gifts: { dealerId: string; scoreChanges: Record<string, number> }[];
      };
    };
    const incompleteRules = JSON.parse(JSON.stringify(valid)) as typeof valid;
    delete incompleteRules.game.rulesSnapshot.values.soloContracts['abondance'];
    const wrongDealer = JSON.parse(JSON.stringify(valid)) as typeof valid;
    wrongDealer.game.gifts[0].dealerId = game.players[1].id;
    const incompleteChanges = JSON.parse(JSON.stringify(valid)) as typeof valid;
    delete incompleteChanges.game.gifts[0].scoreChanges[game.players[0].id];

    for (const invalid of [incompleteRules, wrongDealer, incompleteChanges]) {
      expect(() => v2.parse(JSON.stringify({ ...valid, ...invalid }))).toThrow();
    }
  });

  it('creates an import copy with regenerated game, player, and gift IDs', () => {
    const game = createV2Game();
    game.gifts.push(makeManualGift(game));

    const copy = v2.copyWithNewIds(game);

    expect(copy.id).not.toBe(game.id);
    expect(copy.players.map((player) => player.id)).not.toEqual(game.players.map((player) => player.id));
    expect(copy.gifts[0].id).not.toBe(game.gifts[0].id);
    expect(copy.gifts[0].dealerId).toBe(copy.players[0].id);
    expect(Object.keys(copy.gifts[0].scoreChanges)).toEqual(copy.players.map((player) => player.id));
  });

  it('remaps contract participant references when copying a scored game', () => {
    const systems = TestBed.inject(ScoringSystemService);
    const source = systems.getSystems()[0];
    const custom = systems.createSystem('Bevestigde regels', source.values);
    const game = gameService.createScorecard('Rik/Afrik', ['Noor', 'Jules', 'Sam', 'Mila'], systems.createSnapshot(custom.id));
    const input = { contract: 'rik-afrik' as const, rikkerIds: [game.players[0].id, game.players[1].id] as [string, string], tricksTakenByRikkers: 13 };
    game.gifts.push(gameService.recordGift(game, input).gifts[0]);

    const copy = v2.copyWithNewIds(game);

    expect(copy.gifts[0].input).toEqual({
      ...input,
      rikkerIds: [copy.players[0].id, copy.players[1].id],
    });
    expect(v2.parse(v2.serialize(copy))).toEqual(copy);
  });
});

interface TransferApi {
  serialize(game: Game | GameV2): string;
  parse(raw: string): Game | GameV2;
  copyWithNewIds(game: GameV2): GameV2;
}

function createLegacyGame(): Game {
  const now = '2026-10-07T18:00:00.000Z';
  return {
    id: 'old-game',
    name: 'Oude kaart',
    players: ['Noor', 'Jules', 'Sam', 'Mila', 'Bo', 'Pim', 'Ava'].map((name, index) => ({ id: `old-${index}`, name })),
    rounds: [{ id: 'old-round', scores: { 'old-0': 4, 'old-1': -4 } }],
    createdAt: now,
    updatedAt: now,
  };
}

function createV2Game(): GameV2 {
  const systems = TestBed.inject(ScoringSystemService);
  const game = gameServiceForFixture().createScorecard('Nieuwe kaart', ['Noor', 'Jules', 'Sam', 'Mila'], systems.createSnapshot(systems.getSystems()[0].id));
  return { ...game, players: game.players.map((player) => ({ ...player })) };
}

function gameServiceForFixture(): GameService {
  return TestBed.inject(GameService);
}

function makeManualGift(game: GameV2): Gift {
  return {
    id: crypto.randomUUID(),
    dealerId: game.players[0].id,
    input: { contract: 'manual' },
    scoreChanges: Object.fromEntries(game.players.map((player) => [player.id, 0])),
    entryMode: 'manual',
  };
}