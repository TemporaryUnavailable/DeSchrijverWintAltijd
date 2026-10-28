import { TestBed } from '@angular/core/testing';
import { GiftInput, GameV2, Player } from '../models/game';
import { RulesSnapshot, SoloContract } from '../models/scoring-system';
import { ScoringService } from './scoring.service';
import { ScoringSystemService } from './scoring-system.service';

describe('ScoringService', () => {
  let service: ScoringService;
  let scoringSystems: ScoringSystemService;
  let snapshot: RulesSnapshot;
  let players: Player[];
  let game: GameV2;
  const dealerId = 'p5';

  beforeEach(() => {
    localStorage.removeItem('rikken-scoring-systems-v1');
    TestBed.configureTestingModule({});
    service = TestBed.inject(ScoringService);
    scoringSystems = TestBed.inject(ScoringSystemService);
    const source = scoringSystems.getSystems()[0];
    const custom = scoringSystems.createSystem('Testregels', source.values);
    snapshot = scoringSystems.createSnapshot(custom.id);
    players = ['p1', 'p2', 'p3', 'p4'].map((id) => ({ id, name: id }));
    game = makeGame(players, snapshot);
  });

  afterEach(() => localStorage.removeItem('rikken-scoring-systems-v1'));

  it('scores every Rik/Afrik trick count and conserves points', () => {
    const expected = [7, 6, 5, 4, 3, 2, -3, -4, -5, -6, -7, -8, -9, -10];
    for (let tricks = 0; tricks <= 13; tricks++) {
      const changes = service.calculate(game, players[0].id, {
        contract: 'rik-afrik',
        rikkerIds: [players[0].id, players[1].id],
        tricksTakenByRikkers: tricks,
      });
      const value = expected[13 - tricks];
      expect(changes).toEqual({ p1: value, p2: value, p3: -value, p4: -value });
      expect(Object.values(changes).reduce((sum, score) => sum + score, 0)).toBe(0);
    }
  });

  it('doubles each configured Rik/Afrik result for Troel', () => {
    for (let tricks = 0; tricks <= 13; tricks++) {
      const base = snapshot.values.rikAfrik[13 - tricks];
      const changes = service.calculate(game, players[0].id, {
        contract: 'troel',
        rikkerIds: [players[0].id, players[1].id],
        tricksTakenByRikkers: tricks,
      });
      expect(changes).toEqual({ p1: base * 2, p2: base * 2, p3: -base * 2, p4: -base * 2 });
    }
  });

  it('scores each solo contract on success and failure', () => {
    const cases: readonly { input: SoloContract; contract: Extract<GiftInput, { soloistId: string }>['contract'] }[] = [
      { input: 'abondance', contract: 'abondance' },
      { input: 'miserieOne', contract: 'miserie-one' },
      { input: 'miserieOpen', contract: 'miserie-open' },
      { input: 'thirteenTricks', contract: '13-slagen' },
      { input: 'soloSlim', contract: 'solo-slim' },
    ];
    for (const item of cases) {
      const amount = snapshot.values.soloContracts[item.input];
      for (const success of [true, false]) {
        const direction = success ? 1 : -1;
        const changes = service.calculate(game, players[0].id, {
          contract: item.contract,
          soloistId: players[0].id,
          success,
        });
        expect(changes).toEqual({ p1: amount * direction, p2: -amount / 3 * direction, p3: -amount / 3 * direction, p4: -amount / 3 * direction });
        expect(Object.values(changes).reduce((sum, score) => sum + score, 0)).toBe(0);
      }
    }
  });

  it('scores all two-player Miserie outcomes', () => {
    const amount = snapshot.values.twoPlayerMiserie;
    const input = (successes: [boolean, boolean]) => ({
      contract: 'miserie-two' as const,
      miseriePlayerIds: [players[0].id, players[1].id] as [string, string],
      successes,
    });
    expect(service.calculate(game, players[0].id, input([false, false]))).toEqual({ p1: -amount, p2: -amount, p3: amount, p4: amount });
    expect(service.calculate(game, players[0].id, input([true, false]))).toEqual({ p1: amount, p2: -amount, p3: 0, p4: 0 });
    expect(service.calculate(game, players[0].id, input([false, true]))).toEqual({ p1: -amount, p2: amount, p3: 0, p4: 0 });
    expect(service.calculate(game, players[0].id, input([true, true]))).toEqual({ p1: amount, p2: amount, p3: -amount, p4: -amount });
  });

  it('keeps unverified and unconfigured outcomes manual-only', () => {
    const unverified = {
      ...scoringSystems.createSnapshot(scoringSystems.getSystems()[0].id),
      verification: 'unverified' as const,
    };
    expect(() => service.calculate(makeGame(players, unverified), players[0].id, {
      contract: 'rik-afrik',
      rikkerIds: [players[0].id, players[1].id],
      tricksTakenByRikkers: 13,
    })).toThrow(/handmatig|bevestig/i);
    expect(() => service.calculate(game, players[0].id, { contract: 'manual' })).toThrow(/handmatig/i);
    expect(() => service.calculate(game, players[0].id, { contract: 'verzaking', mode: 'manual-only' })).toThrow(/handmatig/i);
  });

  it('excludes a five-player dealer from scoring and rejects invalid values', () => {
    const fivePlayers = [...players, { id: dealerId, name: 'Dealer' }];
    const fivePlayerGame = makeGame(fivePlayers, snapshot);
    const changes = service.calculate(fivePlayerGame, dealerId, {
      contract: 'rik-afrik',
      rikkerIds: ['p1', 'p2'],
      tricksTakenByRikkers: 13,
    });
    expect(changes).toEqual({ p1: 7, p2: 7, p3: -7, p4: -7, p5: 0 });

    const invalidSnapshot = {
      ...snapshot,
      values: { ...snapshot.values, soloContracts: { ...snapshot.values.soloContracts, abondance: 10 } },
    } as RulesSnapshot;
    expect(() => service.calculate(makeGame(players, invalidSnapshot), players[0].id, {
      contract: 'abondance',
      soloistId: players[0].id,
      success: true,
    })).toThrow(/punt|deelbaar|integer/i);
    expect(() => service.calculate(game, players[0].id, {
      contract: 'rik-afrik',
      rikkerIds: [players[0].id, players[1].id],
      tricksTakenByRikkers: 14,
    })).toThrow();
  });
});

function makeGame(players: Player[], rulesSnapshot: RulesSnapshot): GameV2 {
  const now = '2026-10-07T18:00:00.000Z';
  return {
    id: 'game',
    name: 'Test',
    players,
    rulesSnapshot,
    gifts: [],
    legacy: false,
    createdAt: now,
    updatedAt: now,
  };
}