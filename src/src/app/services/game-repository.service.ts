import { Injectable, inject } from '@angular/core';
import { Game, GameV2, Gift } from '../models/game';
import { PersistedStateV2 } from '../models/persisted-state';
import { ScoringSystem } from '../models/scoring-system';
import { GameService } from './game.service';

const STORAGE_KEY = 'rikken-scorekeeper-v1';
const ARCHIVE_KEY = 'rikken-scorecards-v1';
const SCORING_SYSTEMS_KEY = 'rikken-scoring-systems-v1';
const PLAYER_NAMES_KEY = 'rikken-player-names-v1';
const STATE_V2_KEY = 'rikken-scorekeeper-v2';

export type RepositoryResult<T> = { ok: true; state: T } | { ok: false; error: string };

@Injectable({ providedIn: 'root' })
export class GameRepository {
  private readonly gameService = inject(GameService);

  loadState(): RepositoryResult<PersistedStateV2> {
    let stored: string | null;
    try {
      stored = localStorage.getItem(STATE_V2_KEY);
    } catch {
      return { ok: false, error: 'Browseropslag is niet beschikbaar.' };
    }

    if (stored) {
      try {
        const state = JSON.parse(stored) as unknown;
        if (!this.isPersistedState(state)) return { ok: false, error: 'De opgeslagen scorekaarten zijn ongeldig.' };
        this.removeLegacyKeys();
        return { ok: true, state };
      } catch {
        return { ok: false, error: 'De opgeslagen scorekaarten kunnen niet worden gelezen.' };
      }
    }

    try {
      const state = this.migrateV1State();
      const hasLegacyState = [ARCHIVE_KEY, STORAGE_KEY, SCORING_SYSTEMS_KEY, PLAYER_NAMES_KEY]
        .some((key) => localStorage.getItem(key) !== null);
      if (!hasLegacyState) return { ok: true, state };

      localStorage.setItem(STATE_V2_KEY, JSON.stringify(state));
      this.removeLegacyKeys();
      return { ok: true, state };
    } catch {
      return { ok: false, error: 'Migratie kon niet veilig worden opgeslagen. Uw oude gegevens zijn behouden.' };
    }
  }

  saveState(state: PersistedStateV2): RepositoryResult<PersistedStateV2> {
    if (!this.isPersistedState(state)) return { ok: false, error: 'De scorekaartgegevens zijn ongeldig.' };
    try {
      localStorage.setItem(STATE_V2_KEY, JSON.stringify(state));
      return { ok: true, state };
    } catch {
      return { ok: false, error: 'Gegevens konden niet worden opgeslagen. Controleer de browseropslagruimte.' };
    }
  }

  convertLegacyGame(game: Game): GameV2 {
    return this.toLegacyV2(game);
  }

  loadRememberedPlayerNames(): string[] {
    try {
      const stateRaw = localStorage.getItem(STATE_V2_KEY);
      if (stateRaw) {
        const state = JSON.parse(stateRaw) as Partial<PersistedStateV2>;
        if (state.version === 2 && Array.isArray(state.rememberedPlayerNames)) {
          return state.rememberedPlayerNames.filter((name): name is string => typeof name === 'string');
        }
      }
      return this.readLegacyPlayerNames();
    } catch {
      return [];
    }
  }

  saveRememberedPlayerNames(names: readonly string[]): void {
    const stored = localStorage.getItem(STATE_V2_KEY);
    if (stored) {
      const state = JSON.parse(stored) as PersistedStateV2;
      if (this.isPersistedState(state)) {
        localStorage.setItem(STATE_V2_KEY, JSON.stringify({ ...state, rememberedPlayerNames: [...names] }));
        return;
      }
    }
    localStorage.setItem(PLAYER_NAMES_KEY, JSON.stringify(names));
  }

  loadScoringSystems(): ScoringSystem[] | null {
    try {
      const stateRaw = localStorage.getItem(STATE_V2_KEY);
      if (stateRaw) {
        const state = JSON.parse(stateRaw) as Partial<PersistedStateV2>;
        if (state.version === 2 && Array.isArray(state.scoringSystems) && state.scoringSystems.length > 0
          && state.scoringSystems.every((system) => this.isScoringSystem(system))) return state.scoringSystems;
      }
      const stored = localStorage.getItem(SCORING_SYSTEMS_KEY);
      if (!stored) return null;
      const systems = JSON.parse(stored) as unknown;
      if (!Array.isArray(systems) || systems.length === 0 || !systems.every((system) => this.isScoringSystem(system))) return null;
      return systems as ScoringSystem[];
    } catch {
      return null;
    }
  }

  saveScoringSystems(systems: readonly ScoringSystem[]): void {
    if (systems.length === 0) throw new Error('Minstens één scoringssysteem moet beschikbaar blijven.');
    const stored = localStorage.getItem(STATE_V2_KEY);
    if (stored) {
      const state = JSON.parse(stored) as PersistedStateV2;
      if (this.isPersistedState(state)) {
        const updated = { ...state, scoringSystems: [...systems] };
        localStorage.setItem(STATE_V2_KEY, JSON.stringify(updated));
        return;
      }
    }
    localStorage.setItem(SCORING_SYSTEMS_KEY, JSON.stringify(systems));
  }

  loadGames(): Game[] {
    try {
      const stored = localStorage.getItem(ARCHIVE_KEY);
      const payload = stored ? JSON.parse(stored) as { version?: number; games?: unknown } : null;
      const games = payload?.version === 1 && Array.isArray(payload.games)
        ? payload.games.filter((game): game is Game => this.gameService.isValidGame(game))
        : [];
      const activeGame = this.loadActiveGame();
      if (activeGame) {
        const index = games.findIndex((game) => game.id === activeGame.id);
        if (index < 0) games.push(activeGame);
        else games[index] = activeGame;
      }
      const ordered = this.sortGames(games);
      if (ordered.length) localStorage.setItem(ARCHIVE_KEY, JSON.stringify({ version: 1, games: ordered }));
      return ordered;
    } catch {
      return [];
    }
  }

  loadActiveGame(): Game | null {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return null;
      const payload = JSON.parse(stored) as { version?: number; game?: unknown };
      return payload.version === 1 && this.gameService.isValidGame(payload.game) ? payload.game : null;
    } catch {
      return null;
    }
  }

  saveGame(game: Game, archivedGames: readonly Game[]): { game: Game; games: Game[] } {
    const updated = { ...game, updatedAt: new Date().toISOString() };
    const games = this.sortGames([...archivedGames.filter((item) => item.id !== updated.id), updated]);
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, game: updated }));
    localStorage.setItem(ARCHIVE_KEY, JSON.stringify({ version: 1, games }));
    return { game: updated, games };
  }

  selectGame(game: Game): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, game }));
  }

  removeGame(gameId: string, archivedGames: readonly Game[]): Game[] {
    const games = archivedGames.filter((game) => game.id !== gameId);
    localStorage.setItem(ARCHIVE_KEY, JSON.stringify({ version: 1, games }));
    if (this.loadActiveGame()?.id === gameId) localStorage.removeItem(STORAGE_KEY);
    return games;
  }

  private sortGames(games: Game[]): Game[] {
    return games.sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt));
  }

  private migrateV1State(): PersistedStateV2 {
    const archiveRaw = localStorage.getItem(ARCHIVE_KEY);
    const archivePayload = archiveRaw ? JSON.parse(archiveRaw) as { version?: number; games?: unknown } : null;
    const archived = archivePayload?.version === 1 && Array.isArray(archivePayload.games)
      ? archivePayload.games.filter((game): game is Game => this.gameService.isValidGame(game))
      : [];
    const activeRaw = localStorage.getItem(STORAGE_KEY);
    const activePayload = activeRaw ? JSON.parse(activeRaw) as { version?: number; game?: unknown } : null;
    const active = activePayload?.version === 1 && this.gameService.isValidGame(activePayload.game)
      ? activePayload.game
      : null;
    const byId = new Map(archived.map((game) => [game.id, game]));
    if (active) byId.set(active.id, active);
    const games = [...byId.values()].map((game) => this.toLegacyV2(game));
    games.sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt));
    return {
      version: 2,
      games,
      activeGameId: active?.id ?? null,
      scoringSystems: this.loadScoringSystems() ?? [],
      rememberedPlayerNames: this.readLegacyPlayerNames(),
    };
  }

  private toLegacyV2(game: Game): GameV2 {
    const gifts: Gift[] = game.rounds.map((round, index) => ({
      id: round.id,
      dealerId: this.gameService.resolveDealerId(game, round, index),
      input: null,
      scoreChanges: { ...round.scores },
      entryMode: 'legacy-manual',
    }));
    return {
      id: game.id,
      name: game.name,
      players: game.players.map((player) => ({ ...player })),
      rulesSnapshot: null,
      gifts,
      legacy: true,
      createdAt: game.createdAt,
      updatedAt: game.updatedAt,
    };
  }

  private isPersistedState(value: unknown): value is PersistedStateV2 {
    if (!value || typeof value !== 'object') return false;
    const state = value as Partial<PersistedStateV2>;
    return state.version === 2
      && Array.isArray(state.games)
      && state.games.every((game) => this.isGameV2(game))
      && (state.activeGameId === null || state.games.some((game) => game.id === state.activeGameId))
      && Array.isArray(state.scoringSystems)
      && state.scoringSystems.every((system) => this.isScoringSystem(system))
      && Array.isArray(state.rememberedPlayerNames)
      && state.rememberedPlayerNames.every((name) => typeof name === 'string');
  }

  private isGameV2(value: unknown): value is GameV2 {
    if (!value || typeof value !== 'object') return false;
    const game = value as Partial<GameV2>;
    return typeof game.id === 'string'
      && typeof game.name === 'string'
      && Array.isArray(game.players)
      && game.players.length >= 4
      && game.players.length <= (game.legacy ? 7 : 5)
      && Array.isArray(game.gifts)
      && game.gifts.every((gift) => !!gift && typeof gift.id === 'string'
        && typeof gift.dealerId === 'string'
        && !!gift.scoreChanges && typeof gift.scoreChanges === 'object'
        && Object.values(gift.scoreChanges).every(Number.isSafeInteger)
        && ['automatic', 'manual', 'legacy-manual'].includes(gift.entryMode))
      && (game.legacy ? game.rulesSnapshot === null : !!game.rulesSnapshot)
      && typeof game.createdAt === 'string'
      && Number.isFinite(Date.parse(game.createdAt))
      && typeof game.updatedAt === 'string'
      && Number.isFinite(Date.parse(game.updatedAt));
  }

  private isScoringSystem(value: unknown): value is ScoringSystem {
    if (!value || typeof value !== 'object') return false;
    const system = value as Partial<ScoringSystem>;
    return typeof system.id === 'string' && !!system.id
      && typeof system.name === 'string' && !!system.name.trim()
      && Number.isSafeInteger(system.revision) && system.revision! >= 1
      && ['source-preset', 'custom'].includes(system.kind ?? '')
      && ['unverified', 'confirmed'].includes(system.verification ?? '')
      && !!system.values
      && Array.isArray(system.values.rikAfrik) && system.values.rikAfrik.length === 14
      && system.values.rikAfrik.every(Number.isSafeInteger)
      && Object.values(system.values.soloContracts).length === 5
      && Object.values(system.values.soloContracts).every((amount) => Number.isSafeInteger(amount) && amount > 0 && amount % 3 === 0)
      && Number.isSafeInteger(system.values.twoPlayerMiserie) && system.values.twoPlayerMiserie! > 0
      && (system.values.verzaking === null || system.values.verzaking?.mode === 'manual-only');
  }

  private readLegacyPlayerNames(): string[] {
    try {
      const stored = localStorage.getItem(PLAYER_NAMES_KEY);
      const names = stored ? JSON.parse(stored) as unknown : [];
      return Array.isArray(names) ? names.filter((name): name is string => typeof name === 'string') : [];
    } catch {
      return [];
    }
  }

  private removeLegacyKeys(): void {
    for (const key of [ARCHIVE_KEY, STORAGE_KEY, SCORING_SYSTEMS_KEY, PLAYER_NAMES_KEY]) {
      try {
        localStorage.removeItem(key);
      } catch {
        continue;
      }
    }
  }
}