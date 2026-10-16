import { inject, Injectable } from '@angular/core';
import { Game, GameV2, Gift, GiftInput, Round } from '../models/game';
import { RulesSnapshot } from '../models/scoring-system';
import { ScoringService } from './scoring.service';

const MIN_PLAYERS = 4;
const MAX_PLAYERS = 5;
const MAX_STORED_PLAYERS = 7;

@Injectable({ providedIn: 'root' })
export class GameService {
  private readonly scoring = inject(ScoringService);

  arePlayerNamesValid(names: readonly string[]): boolean {
    const normalized = names.map((name) => name.toLocaleLowerCase('nl-NL'));
    return names.length >= MIN_PLAYERS
      && names.length <= MAX_PLAYERS
      && new Set(normalized).size === names.length;
  }

  createGame(name: string, playerNames: readonly string[]): Game {
    const now = new Date().toISOString();
    return {
      id: crypto.randomUUID(),
      name: name.trim() || 'Rikken',
      players: playerNames.map((playerName) => ({ id: crypto.randomUUID(), name: playerName })),
      rounds: [],
      createdAt: now,
      updatedAt: now,
    };
  }

  createScorecard(name: string, playerNames: readonly string[], rulesSnapshot: RulesSnapshot, startingScore: 0 | 100 = 100): GameV2 {
    const names = playerNames.map((playerName) => playerName.trim());
    if (!this.arePlayerNamesValid(names) || names.some((playerName) => !playerName)) {
      throw new Error('Vul vier of vijf verschillende spelersnamen in.');
    }
    if (!rulesSnapshot?.systemId || !rulesSnapshot.name || !rulesSnapshot.values) {
      throw new Error('Kies een geldig scoringssysteem.');
    }
    if (startingScore !== 0 && startingScore !== 100) throw new Error('Kies een geldige beginscore.');

    const now = new Date().toISOString();
    return {
      id: crypto.randomUUID(),
      name: name.trim() || 'Rikken',
      players: names.map((playerName) => ({ id: crypto.randomUUID(), name: playerName })),
      startingScore,
      rulesSnapshot: {
        ...rulesSnapshot,
        values: {
          rikAfrik: [...rulesSnapshot.values.rikAfrik],
          soloContracts: { ...rulesSnapshot.values.soloContracts },
          twoPlayerMiserie: rulesSnapshot.values.twoPlayerMiserie,
          verzaking: rulesSnapshot.values.verzaking ? { ...rulesSnapshot.values.verzaking } : null,
        },
      },
      gifts: [],
      legacy: false,
      createdAt: now,
      updatedAt: now,
    };
  }

  getTotals(game: GameV2): Record<string, number> {
    const startingScore = game.startingScore ?? 100;
    const totals: Record<string, number> = Object.fromEntries(game.players.map((player) => [player.id, startingScore]));
    for (const gift of game.gifts) {
      for (const [playerId, scoreChange] of Object.entries(gift.scoreChanges)) {
        totals[playerId] = (totals[playerId] ?? startingScore) + scoreChange;
      }
    }
    return totals;
  }

  getStartingScore(game: GameV2): 0 | 100 {
    return game.startingScore ?? 100;
  }

  getStandings(game: GameV2): { playerId: string; playerName: string; total: number; rank: number }[] {
    const totals = this.getTotals(game);
    const ordered = game.players
      .map((player, index) => ({ playerId: player.id, playerName: player.name, total: totals[player.id], index }))
      .sort((left, right) => right.total - left.total || left.index - right.index);
    let previousTotal: number | undefined;
    let previousRank = 0;
    return ordered.map(({ index, ...standing }, position) => {
      const rank = standing.total === previousTotal ? previousRank : position + 1;
      previousTotal = standing.total;
      previousRank = rank;
      return { ...standing, rank };
    });
  }

  getGiftLimit(game: GameV2): 12 | 15 | null {
    if (game.players.length === 4) return 12;
    if (game.players.length === 5) return 15;
    return null;
  }

  getNextGiftDealerId(game: GameV2): string | null {
    const limit = this.getGiftLimit(game);
    if (!limit || game.gifts.length >= limit) return null;
    return game.players[game.gifts.length % game.players.length]?.id ?? null;
  }

  recordGift(game: GameV2, input: GiftInput): GameV2 {
    const dealerId = this.getNextGiftDealerId(game);
    if (!dealerId) throw new Error('Deze scorekaart heeft het maximale aantal gifts bereikt.');
    const gift: Gift = {
      id: crypto.randomUUID(),
      dealerId,
      input,
      scoreChanges: this.scoring.calculate(game, dealerId, input),
      entryMode: 'automatic',
    };
    return this.withGifts(game, [...game.gifts, gift]);
  }

  recordManualGift(
    game: GameV2,
    scoreChanges: Record<string, number>,
    manualNote = '',
    confirmImbalance = false,
  ): GameV2 {
    const dealerId = this.getNextGiftDealerId(game);
    if (!dealerId) throw new Error('Deze scorekaart heeft het maximale aantal gifts bereikt.');
    const changes = Object.fromEntries(game.players.map((player) => [player.id, scoreChanges[player.id] ?? 0]));
    if (Object.values(changes).some((score) => !Number.isSafeInteger(score))) {
      throw new Error('Handmatige scorewijzigingen moeten gehele getallen zijn.');
    }
    if (game.players.length === 5) changes[dealerId] = 0;
    const activeTotal = Object.entries(changes)
      .filter(([playerId]) => game.players.length !== 5 || playerId !== dealerId)
      .reduce((total, [, score]) => total + score, 0);
    if (activeTotal !== 0 && !confirmImbalance) throw new Error('De scorewijzigingen zijn niet in balans.');
    const gift: Gift = {
      id: crypto.randomUUID(),
      dealerId,
      input: { contract: 'manual' },
      scoreChanges: changes,
      entryMode: 'manual',
      ...(manualNote.trim() ? { manualNote: manualNote.trim() } : {}),
    };
    return this.withGifts(game, [...game.gifts, gift]);
  }

  saveGift(game: GameV2, gift: Gift): GameV2 {
    if (game.legacy || game.players.length < MIN_PLAYERS || game.players.length > MAX_PLAYERS) {
      throw new Error('Deze scorekaart is alleen geschikt voor handmatige historische weergave.');
    }
    const existingIndex = game.gifts.findIndex((item) => item.id === gift.id);
    const index = existingIndex < 0 ? game.gifts.length : existingIndex;
    if (existingIndex < 0 && !this.getNextGiftDealerId(game)) {
      throw new Error('Deze scorekaart heeft het maximale aantal gifts bereikt.');
    }
    const dealerId = game.players[index % game.players.length]?.id;
    if (!dealerId) throw new Error('Dealer kan niet worden bepaald.');

    let savedGift: Gift;
    if (gift.entryMode === 'automatic' && gift.input && gift.input.contract !== 'manual' && gift.input.contract !== 'verzaking') {
      savedGift = { ...gift, dealerId, scoreChanges: this.scoring.calculate(game, dealerId, gift.input) };
    } else if (gift.entryMode === 'manual' && (!gift.input || gift.input.contract === 'manual' || gift.input.contract === 'verzaking')) {
      const scoreChanges = Object.fromEntries(game.players.map((player) => [player.id, gift.scoreChanges[player.id] ?? 0]));
      if (Object.values(scoreChanges).some((score) => !Number.isSafeInteger(score))) {
        throw new Error('Handmatige scorewijzigingen moeten gehele getallen zijn.');
      }
      if (game.players.length === 5) scoreChanges[dealerId] = 0;
      savedGift = { ...gift, dealerId, scoreChanges, input: gift.input ?? { contract: 'manual' } };
    } else {
      throw new Error('Deze gift kan niet worden opgeslagen.');
    }

    const gifts = existingIndex < 0
      ? [...game.gifts, savedGift]
      : game.gifts.map((item, itemIndex) => itemIndex === existingIndex ? savedGift : item);
    return this.withGifts(game, this.recalculateGifts(game, gifts));
  }

  updateGift(game: GameV2, giftId: string, input: GiftInput): GameV2 {
    const giftIndex = game.gifts.findIndex((gift) => gift.id === giftId);
    const gift = game.gifts[giftIndex];
    if (!gift) throw new Error('Gift niet gevonden.');
    if (gift.entryMode !== 'automatic') throw new Error('Handmatige gifts moeten handmatig worden gecorrigeerd.');
    const dealerId = game.players[giftIndex % game.players.length]?.id;
    if (!dealerId) throw new Error('Dealer kan niet worden bepaald.');
    const updated: Gift = {
      ...gift,
      dealerId,
      input,
      scoreChanges: this.scoring.calculate(game, dealerId, input),
    };
    return this.withGifts(game, this.recalculateGifts(game, game.gifts.map((item, index) => index === giftIndex ? updated : item)));
  }

  removeGift(game: GameV2, giftId: string, confirmed: boolean): GameV2 {
    if (!confirmed) throw new Error('Bevestig eerst het verwijderen van deze gift.');
    if (!game.gifts.some((gift) => gift.id === giftId)) throw new Error('Gift niet gevonden.');
    const remaining = game.gifts.filter((gift) => gift.id !== giftId);
    return this.withGifts(game, this.recalculateGifts(game, remaining));
  }

  undoLatestGift(game: GameV2): GameV2 {
    if (!game.gifts.length) return game;
    return this.removeGift(game, game.gifts[game.gifts.length - 1].id, true);
  }

  private recalculateGifts(game: GameV2, gifts: Gift[]): Gift[] {
    return gifts.map((gift, index) => {
      const dealerId = game.players[index % game.players.length]?.id ?? gift.dealerId;
      if (gift.entryMode !== 'automatic' || !gift.input) {
        const scoreChanges = { ...gift.scoreChanges };
        if (game.players.length === 5) scoreChanges[dealerId] = 0;
        return { ...gift, dealerId, scoreChanges };
      }
      return {
        ...gift,
        dealerId,
        scoreChanges: this.scoring.calculate(game, dealerId, gift.input),
      };
    });
  }

  private withGifts(game: GameV2, gifts: Gift[]): GameV2 {
    return { ...game, gifts, updatedAt: new Date().toISOString() };
  }

  nextDealerId(game: Game): string {
    const previousRound = game.rounds[game.rounds.length - 1];
    if (!previousRound) return game.players[0].id;
    const previousDealer = this.resolveDealerId(game, previousRound, game.rounds.length - 1);
    const previousIndex = game.players.findIndex((player) => player.id === previousDealer);
    return game.players[(previousIndex + 1) % game.players.length].id;
  }

  addRound(game: Game, dealerId: string, scoreChanges: Record<string, number>): Game {
    const scores = { ...scoreChanges };
    if (game.players.length === 5) scores[dealerId] = 0;
    return {
      ...game,
      rounds: [...game.rounds, { id: crypto.randomUUID(), dealerId, scores }],
    };
  }

  updateRoundScore(game: Game, roundId: string, playerId: string, score: number): Game {
    const roundIndex = game.rounds.findIndex((round) => round.id === roundId);
    const round = game.rounds[roundIndex];
    if (!round || (game.players.length === 5 && this.resolveDealerId(game, round, roundIndex) === playerId)) {
      return game;
    }
    return {
      ...game,
      rounds: game.rounds.map((item) => item.id === roundId
        ? { ...item, scores: { ...item.scores, [playerId]: score } }
        : item),
    };
  }

  removeRound(game: Game, roundId: string): Game {
    return { ...game, rounds: game.rounds.filter((round) => round.id !== roundId) };
  }

  removePlayer(game: Game, playerId: string): Game {
    return {
      ...game,
      players: game.players.filter((player) => player.id !== playerId),
      rounds: game.rounds.map((round) => {
        const scores = { ...round.scores };
        delete scores[playerId];
        return { ...round, scores };
      }),
    };
  }

  resolveDealerId(game: Game, round: Round, roundIndex: number): string {
    if (round.dealerId && game.players.some((player) => player.id === round.dealerId)) return round.dealerId;
    return game.players[roundIndex % game.players.length].id;
  }

  isValidGame(value: unknown): value is Game {
    if (!value || typeof value !== 'object') return false;
    const game = value as Partial<Game>;
    return typeof game.id === 'string'
      && typeof game.name === 'string'
      && Array.isArray(game.players)
      && game.players.length >= MIN_PLAYERS
      && game.players.length <= MAX_STORED_PLAYERS
      && game.players.every((player) => typeof player.id === 'string' && typeof player.name === 'string' && !!player.name.trim())
      && new Set(game.players.map((player) => player.id)).size === game.players.length
      && new Set(game.players.map((player) => player.name.trim().toLocaleLowerCase('nl-NL'))).size === game.players.length
      && Array.isArray(game.rounds)
      && game.rounds.every((round) => typeof round.id === 'string'
        && (round.dealerId === undefined || game.players?.some((player) => player.id === round.dealerId))
        && !!round.scores
        && typeof round.scores === 'object'
        && Object.values(round.scores).every(Number.isSafeInteger))
      && typeof game.createdAt === 'string'
      && Number.isFinite(Date.parse(game.createdAt))
      && typeof game.updatedAt === 'string'
      && Number.isFinite(Date.parse(game.updatedAt));
  }
}