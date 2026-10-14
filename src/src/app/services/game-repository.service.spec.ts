import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { Game, GameV2 } from '../models/game';
import { PersistedStateV2 } from '../models/persisted-state';
import { GameRepository } from './game-repository.service';
import { ScoringSystemService } from './scoring-system.service';

describe('GameRepository scoring-system persistence', () => {
  const archiveKey = 'rikken-scorecards-v1';
  const activeKey = 'rikken-scorekeeper-v1';
  const scoringSystemsKey = 'rikken-scoring-systems-v1';
  const playerNamesKey = 'rikken-player-names-v1';
  const stateKey = 'rikken-scorekeeper-v2';
  let repository: GameRepository;

  beforeEach(() => {
    localStorage.removeItem(archiveKey);
    localStorage.removeItem(activeKey);
    localStorage.removeItem(scoringSystemsKey);
    localStorage.removeItem(playerNamesKey);
    localStorage.removeItem(stateKey);
    TestBed.configureTestingModule({});
    repository = TestBed.inject(GameRepository);
  });

  afterEach(() => {
    localStorage.removeItem(archiveKey);
    localStorage.removeItem(activeKey);
    localStorage.removeItem(scoringSystemsKey);
    localStorage.removeItem(playerNamesKey);
    localStorage.removeItem(stateKey);
  });

  it('persists scoring systems without discarding legacy archive games', () => {
    const createdAt = '2026-10-07T18:00:00.000Z';
    const game: Game = {
      id: 'legacy-game',
      name: 'Oude scorekaart',
      players: ['Noor', 'Jules', 'Sam', 'Mila'].map((name, index) => ({ id: `player-${index}`, name })),
      rounds: [],
      createdAt,
      updatedAt: createdAt,
    };
    localStorage.setItem(archiveKey, JSON.stringify({ version: 1, games: [game] }));
    const systems = TestBed.inject(ScoringSystemService).getSystems();

    repository.saveScoringSystems(systems);

    const persisted = JSON.parse(localStorage.getItem(archiveKey) ?? '{}');
    expect(persisted.games).toEqual([game]);
    expect(repository.loadScoringSystems()).toEqual(systems);
  });

  it('retains scoring systems when a game save updates the archive', () => {
    const systems = TestBed.inject(ScoringSystemService).getSystems();
    repository.saveScoringSystems(systems);
    const createdAt = '2026-10-07T18:00:00.000Z';
    const game: Game = {
      id: 'current-game',
      name: 'Vrijdag',
      players: ['Noor', 'Jules', 'Sam', 'Mila'].map((name, index) => ({ id: `p-${index}`, name })),
      rounds: [],
      createdAt,
      updatedAt: createdAt,
    };

    repository.saveGame(game, []);

    expect(repository.loadScoringSystems()).toEqual(systems);
  });

  it('migrates active and archived v1 games, preferring the active ID and preserving seven-player history', () => {
    const systems = TestBed.inject(ScoringSystemService).getSystems();
    repository.saveScoringSystems(systems);
    localStorage.setItem(playerNamesKey, JSON.stringify(['Noor', 'Jules']));
    const archived = createLegacyGame('archived', ['Noor', 'Jules', 'Sam', 'Mila']);
    const archivedDuplicate = createLegacyGame('duplicate', ['A', 'B', 'C', 'D']);
    const activeDuplicate = createLegacyGame('duplicate', ['A', 'B', 'C', 'D'], 'Actieve versie');
    const sevenPlayer = createLegacyGame('seven', ['A', 'B', 'C', 'D', 'E', 'F', 'G']);
    sevenPlayer.rounds = [{ id: 'round-1', scores: { 'player-0': 3, 'player-1': -3 } }];
    localStorage.setItem(archiveKey, JSON.stringify({ version: 1, games: [archived, archivedDuplicate, sevenPlayer] }));
    localStorage.setItem(activeKey, JSON.stringify({ version: 1, game: activeDuplicate }));

    const result = callLoadState(repository);

    expect(result.ok).toBe(true);
    const state = result.state!;
    expect(state.version).toBe(2);
    expect(state.scoringSystems).toEqual(systems);
    expect(state.rememberedPlayerNames).toEqual(['Noor', 'Jules']);
    expect(state.activeGameId).toBe('duplicate');
    expect(state.games.find((game) => game.id === 'duplicate')?.name).toBe('Actieve versie');
    const migratedSeven = state.games.find((game) => game.id === 'seven') as GameV2;
    expect(migratedSeven).toMatchObject({ legacy: true, rulesSnapshot: null });
    expect(migratedSeven.gifts[0]).toMatchObject({
      id: 'round-1',
      scoreChanges: { 'player-0': 3, 'player-1': -3 },
      entryMode: 'legacy-manual',
    });
    expect(localStorage.getItem(archiveKey)).toBeNull();
    expect(localStorage.getItem(activeKey)).toBeNull();
    expect(localStorage.getItem(scoringSystemsKey)).toBeNull();
    expect(localStorage.getItem(playerNamesKey)).toBeNull();
  });

  it('retains v1 source keys when the migration cannot be durably written', () => {
    const game = createLegacyGame('preserved', ['A', 'B', 'C', 'D']);
    localStorage.setItem(archiveKey, JSON.stringify({ version: 1, games: [game] }));
    const originalSetItem = Storage.prototype.setItem;
    const writeSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (this: Storage, key: string, value: string) {
      if (key === stateKey) throw new DOMException('Quota exceeded', 'QuotaExceededError');
      return originalSetItem.call(this, key, value);
    });

    const result = callLoadState(repository);

    expect(result.ok).toBe(false);
    expect(result.error).toContain('opgeslagen');
    expect(localStorage.getItem(archiveKey)).not.toBeNull();
    expect(localStorage.getItem(stateKey)).toBeNull();
    writeSpy.mockRestore();
  });

  it('reports save failure when browser storage is unavailable or full', () => {
    const state = emptyState();
    const writeSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('Quota exceeded', 'QuotaExceededError');
    });

    const result = callSaveState(repository, state);

    expect(result.ok).toBe(false);
    expect(result.error).toContain('opgeslagen');
    writeSpy.mockRestore();
  });

  it('reports denied browser storage instead of pretending state was loaded', () => {
    const readSpy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('Storage access denied', 'SecurityError');
    });

    const result = callLoadState(repository);

    expect(result.ok).toBe(false);
    expect(result.error).toContain('niet beschikbaar');
    readSpy.mockRestore();
  });

  it('saves and reloads v2 game and gift IDs without duplication', () => {
    const legacy = createLegacyGame('stable-game', ['A', 'B', 'C', 'D']);
    legacy.rounds = [{ id: 'stable-gift', scores: { 'player-0': 5, 'player-1': -5 } }];
    const migrated = repository.convertLegacyGame(legacy);
    const state: PersistedStateV2 = { ...emptyState(), games: [migrated], activeGameId: migrated.id };

    expect(callSaveState(repository, state).ok).toBe(true);
    const loaded = callLoadState(repository);

    expect(loaded.ok).toBe(true);
    expect(loaded.state?.games[0].id).toBe('stable-game');
    expect(loaded.state?.games[0].gifts.map((gift) => gift.id)).toEqual(['stable-gift']);
    expect(loaded.state?.games[0].gifts[0].scoreChanges).toEqual({ 'player-0': 5, 'player-1': -5 });
  });
});

function createLegacyGame(id: string, names: string[], name = id): Game {
  const now = '2026-10-07T18:00:00.000Z';
  return {
    id,
    name,
    players: names.map((playerName, index) => ({ id: `player-${index}`, name: playerName })),
    rounds: [],
    createdAt: now,
    updatedAt: now,
  };
}

function emptyState(): PersistedStateV2 {
  return { version: 2, games: [], activeGameId: null, scoringSystems: [], rememberedPlayerNames: [] };
}

function callLoadState(repository: GameRepository): { ok: boolean; state?: PersistedStateV2; error?: string } {
  return (repository as unknown as { loadState: () => { ok: boolean; state?: PersistedStateV2; error?: string } }).loadState();
}

function callSaveState(repository: GameRepository, state: PersistedStateV2): { ok: boolean; state?: PersistedStateV2; error?: string } {
  return (repository as unknown as { saveState: (value: PersistedStateV2) => { ok: boolean; state?: PersistedStateV2; error?: string } }).saveState(state);
}